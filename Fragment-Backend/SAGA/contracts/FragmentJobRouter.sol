// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FragmentJobRouter
 * @notice Routes Filecoin dataset fragments to available workers for processing
 * @dev Workers get paid 0.1 SAGA Dollar per task upon result submission
 */
contract FragmentJobRouter is ReentrancyGuard {
    IERC20 public sagaDollar;
    
    uint256 public constant PAYMENT_PER_TASK = 0.01 ether; // 0.01 SAGA Dollar
    uint256 public jobCounter;
    uint256 public taskCounter;
    
    enum TaskStatus { Pending, Assigned, Completed, Failed }
    enum WorkerStatus { Inactive, Active, Busy }
    
    struct Job {
        uint256 jobId;
        address requester;
        uint256 datasetId; // Filecoin dataset ID
        uint256[] taskIds;
        uint256 totalTasks;
        uint256 completedTasks;
        uint256 totalPayment;
        string taskType; // e.g., "content_moderation"
        uint256 createdAt;
        bool isCancelled;
    }
    
    struct Task {
        uint256 taskId;
        uint256 jobId;
        string pieceCid; // Filecoin piece CID
        address assignedWorker;
        TaskStatus status;
        string resultCid; // Result uploaded to Filecoin
        uint256 assignedAt;
        uint256 completedAt;
    }
    
    struct Worker {
        address workerAddress;
        WorkerStatus status;
        uint256 tasksCompleted;
        uint256 totalEarnings;
        uint256 registeredAt;
        uint256 lastActiveAt;
    }
    
    // Storage
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Task) public tasks;
    mapping(address => Worker) public workers;
    address[] public activeWorkers;
    uint256[] public pendingTasks;
    
    // Events
    event JobSubmitted(uint256 indexed jobId, address indexed requester, uint256 datasetId, uint256 totalTasks);
    event WorkerRegistered(address indexed worker);
    event WorkerStatusChanged(address indexed worker, WorkerStatus newStatus);
    event TaskAssigned(uint256 indexed taskId, uint256 indexed jobId, address indexed worker, string pieceCid);
    event TaskCompleted(uint256 indexed taskId, uint256 indexed jobId, address indexed worker, string resultCid);
    event PaymentReleased(uint256 indexed taskId, address indexed worker, uint256 amount);
    event JobCancelled(uint256 indexed jobId, address indexed requester);
    
    constructor(address _sagaDollar) {
        sagaDollar = IERC20(_sagaDollar);
    }
    
    /**
     * @notice Submit a new job with tasks from a Filecoin dataset
     * @param datasetId Filecoin dataset ID
     * @param pieceCids Array of piece CIDs from the dataset
     * @param taskType Type of processing (e.g., "content_moderation")
     */
    function submitJob(
        uint256 datasetId,
        string[] memory pieceCids,
        string memory taskType
    ) external nonReentrant returns (uint256) {
        require(pieceCids.length > 0, "No tasks provided");
        
        uint256 totalPayment = pieceCids.length * PAYMENT_PER_TASK;
        
        // Transfer payment to contract for escrow
        require(
            sagaDollar.transferFrom(msg.sender, address(this), totalPayment),
            "Payment transfer failed"
        );
        
        jobCounter++;
        uint256 jobId = jobCounter;
        
        Job storage job = jobs[jobId];
        job.jobId = jobId;
        job.requester = msg.sender;
        job.datasetId = datasetId;
        job.totalTasks = pieceCids.length;
        job.completedTasks = 0;
        job.totalPayment = totalPayment;
        job.taskType = taskType;
        job.createdAt = block.timestamp;
        job.isCancelled = false;
        
        // Create tasks for each piece
        for (uint256 i = 0; i < pieceCids.length; i++) {
            taskCounter++;
            uint256 taskId = taskCounter;
            
            Task storage task = tasks[taskId];
            task.taskId = taskId;
            task.jobId = jobId;
            task.pieceCid = pieceCids[i];
            task.status = TaskStatus.Pending;
            
            job.taskIds.push(taskId);
            pendingTasks.push(taskId);
        }
        
        emit JobSubmitted(jobId, msg.sender, datasetId, pieceCids.length);
        
        // Auto-assign tasks to available workers
        _autoAssignTasks();
        
        return jobId;
    }
    
    /**
     * @notice Register as a worker
     */
    function registerWorker() external {
        require(workers[msg.sender].workerAddress == address(0), "Already registered");
        
        workers[msg.sender] = Worker({
            workerAddress: msg.sender,
            status: WorkerStatus.Active,
            tasksCompleted: 0,
            totalEarnings: 0,
            registeredAt: block.timestamp,
            lastActiveAt: block.timestamp
        });
        
        activeWorkers.push(msg.sender);
        
        emit WorkerRegistered(msg.sender);
        emit WorkerStatusChanged(msg.sender, WorkerStatus.Active);
        
        // Try to assign pending tasks
        _autoAssignTasks();
    }
    
    /**
     * @notice Update worker status (Active/Inactive)
     */
    function updateWorkerStatus(WorkerStatus newStatus) external {
        require(workers[msg.sender].workerAddress != address(0), "Not registered");
        require(newStatus != WorkerStatus.Busy, "Cannot manually set to Busy");
        
        workers[msg.sender].status = newStatus;
        workers[msg.sender].lastActiveAt = block.timestamp;
        
        emit WorkerStatusChanged(msg.sender, newStatus);
        
        if (newStatus == WorkerStatus.Active) {
            _autoAssignTasks();
        }
    }
    
    /**
     * @notice Submit task result (worker uploads to Filecoin first, then submits CID)
     * @param taskId Task ID
     * @param resultCid Filecoin CID of the result
     */
    function submitResult(uint256 taskId, string memory resultCid) external nonReentrant {
        Task storage task = tasks[taskId];
        require(task.assignedWorker == msg.sender, "Not assigned to you");
        require(task.status == TaskStatus.Assigned, "Task not assigned");
        require(bytes(resultCid).length > 0, "Invalid result CID");
        
        // Update task
        task.status = TaskStatus.Completed;
        task.resultCid = resultCid;
        task.completedAt = block.timestamp;
        
        // Update job
        Job storage job = jobs[task.jobId];
        job.completedTasks++;
        
        // Update worker
        Worker storage worker = workers[msg.sender];
        worker.tasksCompleted++;
        worker.totalEarnings += PAYMENT_PER_TASK;
        worker.status = WorkerStatus.Active; // Back to active
        worker.lastActiveAt = block.timestamp;
        
        // Release payment
        require(
            sagaDollar.transfer(msg.sender, PAYMENT_PER_TASK),
            "Payment failed"
        );
        
        emit TaskCompleted(taskId, task.jobId, msg.sender, resultCid);
        emit PaymentReleased(taskId, msg.sender, PAYMENT_PER_TASK);
        
        // Try to assign more tasks to this worker
        _autoAssignTasks();
    }
    
    /**
     * @notice Auto-assign pending tasks to available workers
     */
    function _autoAssignTasks() internal {
        if (pendingTasks.length == 0) return;
        
        // Find available workers
        address[] memory available = getAvailableWorkers();
        if (available.length == 0) return;
        
        uint256 workerIndex = 0;
        uint256 i = 0;
        
        while (i < pendingTasks.length && workerIndex < available.length) {
            uint256 taskId = pendingTasks[i];
            Task storage task = tasks[taskId];
            
            if (task.status == TaskStatus.Pending) {
                address worker = available[workerIndex];
                
                // Assign task
                task.assignedWorker = worker;
                task.status = TaskStatus.Assigned;
                task.assignedAt = block.timestamp;
                
                workers[worker].status = WorkerStatus.Busy;
                
                emit TaskAssigned(taskId, task.jobId, worker, task.pieceCid);
                
                // Remove from pending
                pendingTasks[i] = pendingTasks[pendingTasks.length - 1];
                pendingTasks.pop();
                
                workerIndex++;
            } else {
                i++;
            }
        }
    }
    
    /**
     * @notice Get available workers (Active status)
     */
    function getAvailableWorkers() public view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < activeWorkers.length; i++) {
            if (workers[activeWorkers[i]].status == WorkerStatus.Active) {
                count++;
            }
        }
        
        address[] memory available = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < activeWorkers.length; i++) {
            if (workers[activeWorkers[i]].status == WorkerStatus.Active) {
                available[index] = activeWorkers[i];
                index++;
            }
        }
        
        return available;
    }
    
    /**
     * @notice Get job details
     */
    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }
    
    /**
     * @notice Get task details
     */
    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }
    
    /**
     * @notice Get worker details
     */
    function getWorker(address workerAddress) external view returns (Worker memory) {
        return workers[workerAddress];
    }
    
    /**
     * @notice Get all tasks for a job
     */
    function getJobTasks(uint256 jobId) external view returns (uint256[] memory) {
        return jobs[jobId].taskIds;
    }
    
    /**
     * @notice Get pending tasks count
     */
    function getPendingTasksCount() external view returns (uint256) {
        return pendingTasks.length;
    }
    
    /**
     * @notice Cancel a job (only if no tasks completed)
     */
    function cancelJob(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.requester == msg.sender, "Not job owner");
        require(job.completedTasks == 0, "Tasks already completed");
        require(!job.isCancelled, "Already cancelled");
        
        job.isCancelled = true;
        
        // Refund remaining payment
        uint256 refund = (job.totalTasks - job.completedTasks) * PAYMENT_PER_TASK;
        if (refund > 0) {
            require(sagaDollar.transfer(msg.sender, refund), "Refund failed");
        }
        
        // Mark all pending/assigned tasks as failed
        for (uint256 i = 0; i < job.taskIds.length; i++) {
            Task storage task = tasks[job.taskIds[i]];
            if (task.status != TaskStatus.Completed) {
                task.status = TaskStatus.Failed;
                if (task.assignedWorker != address(0)) {
                    workers[task.assignedWorker].status = WorkerStatus.Active;
                }
            }
        }
        
        emit JobCancelled(jobId, msg.sender);
    }
}

