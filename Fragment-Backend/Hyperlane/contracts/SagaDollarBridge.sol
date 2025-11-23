// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SagaDollarBridge
 * @notice Wrapped SAGA Dollar on Fragment Chainlet
 * @dev Simplified bridge for hackathon - production would use full Hyperlane Warp Route
 * 
 * For hackathon: Owner (trusted bridge operator) can mint/burn based on SagaEVM locks
 * For production: Replace with Hyperlane Warp Route when SagaEVM deployment is available
 */
contract SagaDollarBridge is ERC20, Ownable, ReentrancyGuard {
    
    // Events
    event DepositRegistered(
        address indexed user,
        uint256 amount,
        bytes32 indexed sagaEvmTxHash,
        uint256 timestamp
    );
    
    event WithdrawalRequested(
        address indexed user,
        uint256 amount,
        uint256 indexed requestId,
        uint256 timestamp
    );
    
    event WithdrawalFulfilled(
        address indexed user,
        uint256 amount,
        uint256 indexed requestId,
        bytes32 sagaEvmTxHash,
        uint256 timestamp
    );

    event BridgeOperatorUpdated(address indexed oldOperator, address indexed newOperator);

    // State
    mapping(bytes32 => bool) public processedDeposits;
    mapping(uint256 => WithdrawalRequest) public withdrawalRequests;
    uint256 public withdrawalRequestCount;
    address public bridgeOperator;
    
    struct WithdrawalRequest {
        address user;
        uint256 amount;
        uint256 timestamp;
        bool fulfilled;
        bytes32 sagaEvmTxHash;
    }

    constructor() ERC20("Wrapped SAGA Dollar", "wSAGA") Ownable(msg.sender) {
        bridgeOperator = msg.sender;
    }

    /**
     * @notice Register a deposit from SagaEVM
     * @dev Called by bridge operator after verifying lock on SagaEVM
     * @param user The user who deposited on SagaEVM
     * @param amount Amount of SAGA Dollar deposited
     * @param sagaEvmTxHash Transaction hash on SagaEVM proving the deposit
     */
    function registerDeposit(
        address user,
        uint256 amount,
        bytes32 sagaEvmTxHash
    ) external onlyBridgeOperator nonReentrant {
        require(user != address(0), "Invalid user");
        require(amount > 0, "Invalid amount");
        require(!processedDeposits[sagaEvmTxHash], "Already processed");
        
        processedDeposits[sagaEvmTxHash] = true;
        _mint(user, amount);
        
        emit DepositRegistered(user, amount, sagaEvmTxHash, block.timestamp);
    }

    /**
     * @notice Request withdrawal to SagaEVM
     * @dev Burns wSAGA on Fragment, bridge operator will unlock SAGA Dollar on SagaEVM
     * @param amount Amount to withdraw
     */
    function requestWithdrawal(uint256 amount) external nonReentrant returns (uint256) {
        require(amount > 0, "Invalid amount");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        _burn(msg.sender, amount);
        
        uint256 requestId = withdrawalRequestCount++;
        withdrawalRequests[requestId] = WithdrawalRequest({
            user: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            fulfilled: false,
            sagaEvmTxHash: bytes32(0)
        });
        
        emit WithdrawalRequested(msg.sender, amount, requestId, block.timestamp);
        
        return requestId;
    }

    /**
     * @notice Mark withdrawal as fulfilled after sending on SagaEVM
     * @dev Called by bridge operator after sending SAGA Dollar on SagaEVM
     * @param requestId The withdrawal request ID
     * @param sagaEvmTxHash Transaction hash on SagaEVM proving the unlock
     */
    function fulfillWithdrawal(
        uint256 requestId,
        bytes32 sagaEvmTxHash
    ) external onlyBridgeOperator {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        require(request.user != address(0), "Invalid request");
        require(!request.fulfilled, "Already fulfilled");
        
        request.fulfilled = true;
        request.sagaEvmTxHash = sagaEvmTxHash;
        
        emit WithdrawalFulfilled(
            request.user,
            request.amount,
            requestId,
            sagaEvmTxHash,
            block.timestamp
        );
    }

    /**
     * @notice Update bridge operator
     * @param newOperator New bridge operator address
     */
    function setBridgeOperator(address newOperator) external onlyOwner {
        require(newOperator != address(0), "Invalid operator");
        address oldOperator = bridgeOperator;
        bridgeOperator = newOperator;
        emit BridgeOperatorUpdated(oldOperator, newOperator);
    }

    /**
     * @notice Get withdrawal request details
     * @param requestId The withdrawal request ID
     */
    function getWithdrawalRequest(uint256 requestId)
        external
        view
        returns (
            address user,
            uint256 amount,
            uint256 timestamp,
            bool fulfilled,
            bytes32 sagaEvmTxHash
        )
    {
        WithdrawalRequest memory request = withdrawalRequests[requestId];
        return (
            request.user,
            request.amount,
            request.timestamp,
            request.fulfilled,
            request.sagaEvmTxHash
        );
    }

    modifier onlyBridgeOperator() {
        require(msg.sender == bridgeOperator, "Not bridge operator");
        _;
    }
}

