# 📍 Fragment Project - Complete Contract Address Registry

**Last Updated**: November 23, 2025  
**Status**: ✅ All Systems Operational

---

## 🌐 Network Information

### SagaEVM (Source Network)
- **Network Name**: SagaEVM
- **Chain ID**: `5464` (hex: `0x1558`)
- **RPC URL**: https://5464.rpc.thirdweb.com
- **Block Explorer**: https://sagaevm.sagaexplorer.io
- **Native Token**: GAS
- **Type**: Mainnet EVM Chain

### Fragment Chainlet (Destination Network)
- **Network Name**: Fragment
- **Chain ID**: `2763843736868000`
- **Domain ID**: `27638` (for Hyperlane)
- **RPC URL**: https://fragment-2763843736868000-1.jsonrpc.sagarpc.io
- **Native Token**: MENT
- **Genesis Account**: `0x9f93EebD463d4B7c991986a082d974E77b5a02Dc`
- **Genesis Balance**: 100,000 MENT
- **Type**: SAGA Chainlet (Testnet)

---

## 💰 Token Contracts

### SAGA Dollar (D) - Original Token
**Network**: SagaEVM  
**Contract Address**: `0xB76144F87DF95816e8c55C240F874C554B4553C3`  
**Token Name**: SAGA Dollar  
**Symbol**: D  
**Decimals**: 18  
**Type**: ERC-20  
**Explorer**: https://sagaevm.sagaexplorer.io/token/0xB76144F87DF95816e8c55C240F874C554B4553C3  
**Status**: ✅ Active (Real Token)

### Wrapped SAGA Dollar (wSAGA) - Bridge Token
**Network**: Fragment Chainlet  
**Contract Address**: `0xE71d2ea77309Ee3CaC224B8A5537fEcD7f217C9E`  
**Token Name**: Wrapped SAGA Dollar  
**Symbol**: wSAGA  
**Decimals**: 18  
**Type**: ERC-20 (Mintable/Burnable)  
**Backing**: 1:1 with SAGA Dollar on SagaEVM  
**Total Supply**: 5.0 wSAGA (as of deployment)  
**Owner**: `0x9f93EebD463d4B7c991986a082d974E77b5a02Dc`  
**Bridge Operator**: `0x9f93EebD463d4B7c991986a082d974E77b5a02Dc`  
**Deployment Date**: 2025-11-23T03:00:12.393Z  
**Status**: ✅ Operational

### MockSAGADollar (Test Token)
**Network**: Fragment Chainlet  
**Contract Address**: `0x728d0f06Bf6D63B4bC9ca7C879D042DDAC66e8A3`  
**Token Name**: Mock SAGA Dollar  
**Symbol**: SAGAD  
**Decimals**: 18  
**Type**: ERC-20 (Mintable - Test Only)  
**Purpose**: Testing FragmentJobRouter  
**Deployment Date**: 2025-11-23T00:45:00.224Z  
**Status**: ✅ Active (Development/Testing)

---

## 🌉 Bridge Infrastructure

### SagaDollarBridge Contract
**Network**: Fragment Chainlet  
**Contract Address**: `0xE71d2ea77309Ee3CaC224B8A5537fEcD7f217C9E`  
**Purpose**: Bridge SAGA Dollar between SagaEVM and Fragment  
**Managed Token**: wSAGA  
**Bridge Operator**: `0x9f93EebD463d4B7c991986a082d974E77b5a02Dc`  
**Owner**: `0x9f93EebD463d4B7c991986a082d974E77b5a02Dc`  
**Security**: ReentrancyGuard, Ownable  
**Deployment Date**: 2025-11-23T03:00:12.393Z  
**Status**: ✅ Operational

**Key Functions**:
- `registerDeposit(address recipient, uint256 amount, bytes32 sagaEvmTxHash)` - Mint wSAGA
- `requestWithdrawal(uint256 amount)` - Burn wSAGA and request unlock
- `setBridgeOperator(address newOperator)` - Update operator

**Events**:
- `DepositRegistered(address indexed user, uint256 amount, bytes32 indexed sagaEvmTxHash)`
- `WithdrawalRequested(address indexed user, uint256 amount)`
- `BridgeOperatorUpdated(address indexed oldOperator, address indexed newOperator)`

---

## 🏗️ Hyperlane Cross-Chain Infrastructure

**Network**: Fragment Chainlet  
**Deployment Date**: November 23, 2025  
**Total Contracts**: 14

### Core Contracts

#### Mailbox (Primary Message Router)
**Address**: `0x5033fAEC6050387E95Bb78a8c6Bf891bA396B26c`  
**Purpose**: Central message routing for cross-chain communication  
**Domain ID**: 27638  
**Status**: ✅ Operational

#### ValidatorAnnounce
**Address**: `0x28cF73986a1581331DA7644BcF5A0c394DEd40c4`  
**Purpose**: Validator registration and announcement  
**Status**: ✅ Operational

#### ProxyAdmin
**Address**: `0x672796778AE1413cD2faCA1A08bB0e586245c212`  
**Purpose**: Proxy contract administration and upgrades  
**Status**: ✅ Operational

### Security Modules (ISM Factories)

#### MerkleRootMultisigIsmFactory
**Address**: `0xAd9887253eAe61f024f3fd012416cB8F9188bA5f`  
**Purpose**: Deploy merkle root multisig ISMs  
**Status**: ✅ Operational

#### MessageIdMultisigIsmFactory
**Address**: `0xe2807Cd3d78ba0eD3EB77Eb179F15040C305277B`  
**Purpose**: Deploy message ID multisig ISMs  
**Status**: ✅ Operational

#### AggregationIsmFactory
**Address**: `0x04027e8E12f0277f52E7f89576B0c222CC287a64`  
**Purpose**: Deploy aggregation ISMs (combine multiple ISMs)  
**Status**: ✅ Operational

#### AggregationHookFactory
**Address**: `0x9e13cF980f364edCbE70D9551f337344CFcdd2B4`  
**Purpose**: Deploy aggregation hooks  
**Status**: ✅ Operational

#### DomainRoutingIsmFactory
**Address**: `0x413618d5546e3390323c30107944f852a6018FcA`  
**Purpose**: Deploy domain routing ISMs  
**Status**: ✅ Operational

#### MerkleRootWeightedMultisigIsmFactory
**Address**: `0x96BB28F5e3fb1790E247fb4C510Ed905c08F3583`  
**Purpose**: Deploy weighted multisig ISMs (merkle root)  
**Status**: ✅ Operational

#### MessageIdWeightedMultisigIsmFactory
**Address**: `0x2915eE2EE98F06BdC9d45170560A2f19e30aac59`  
**Purpose**: Deploy weighted multisig ISMs (message ID)  
**Status**: ✅ Operational

### Hooks

#### MerkleTreeHook
**Address**: `0x4dD64BDdfC4570ce03E0cf87b19ab5A6a68e41f7`  
**Purpose**: Default message verification hook using merkle trees  
**Status**: ✅ Operational

### Interchain Accounts

#### InterchainAccountRouter
**Address**: `0xc574357Ae00Ceb951222F35f48de7F8558d4EC57`  
**Purpose**: Route interchain account operations  
**Status**: ✅ Operational

#### InterchainAccountIsm
**Address**: `0xcF41c0aC3dfFdc4BDD3738403EB3C64761D74839`  
**Purpose**: ISM for interchain account verification  
**Status**: ✅ Operational

### Testing Contracts

#### TestRecipient
**Address**: `0xbB1a3032CDA82B4334f6f9bF4B50040c5c3D0620`  
**Purpose**: Test contract for message receipt verification  
**Status**: ✅ Operational

---

## 🚀 Fragment Application Contracts

**Network**: Fragment Chainlet  
**Deployment Date**: 2025-11-23T00:45:00.224Z

### FragmentJobRouter (Core Application Logic)
**Contract Address**: `0xEA48756e27ae679eDE5479dCCB2B29289d320c36`  
**Purpose**: Main job routing and worker coordination contract  
**Payment Token**: MockSAGADollar (can be upgraded to wSAGA)  
**Owner**: `0x9f93EebD463d4B7c991986a082d974E77b5a02Dc`  
**Status**: ✅ Operational

**Key Features**:
- Worker registration and management
- Job submission with Filecoin CIDs
- Task auto-assignment to available workers
- Payment escrow and distribution
- Task completion verification

**Key Functions**:
- `registerWorker()` - Register as a worker
- `submitJob(string memory datasetCid, uint256 numTasks, uint256 paymentPerTask, string memory taskType)` - Submit a new job
- `submitTaskResult(uint256 jobId, uint256 taskId, string memory resultCid)` - Submit task results
- `getJob(uint256 jobId)` - Get job details
- `getWorker(address workerAddress)` - Get worker details

**Events**:
- `WorkerRegistered(address indexed worker, uint256 timestamp)`
- `JobSubmitted(uint256 indexed jobId, address indexed requester, string datasetCid, uint256 numTasks)`
- `TaskAssigned(uint256 indexed jobId, uint256 indexed taskId, address indexed worker)`
- `TaskCompleted(uint256 indexed jobId, uint256 indexed taskId, address indexed worker, string resultCid)`
- `JobCompleted(uint256 indexed jobId, uint256 timestamp)`

---

## 👤 Key Addresses

### Primary Deployer/Owner
**Address**: `0x9f93EebD463d4B7c991986a082d974E77b5a02Dc`  
**Role**: 
- Contract Deployer
- Bridge Operator
- FragmentJobRouter Owner
- Hyperlane Validator
- Genesis Account for Fragment Chainlet

**Capabilities**:
- Deploy and manage all contracts
- Mint wSAGA upon verified deposits
- Fulfill withdrawal requests
- Manage bridge operations
- Sign Hyperlane messages (ISM validator)

---

## 📊 Bridge Transaction History

### Completed Deposits

#### Transaction #1
- **Direction**: SagaEVM → Fragment
- **Amount**: 5.0 SAGA Dollar → 5.0 wSAGA
- **User**: `0x9f93EebD463d4B7c991986a082d974E77b5a02Dc`
- **SagaEVM Tx**: `0x79b000b4cfa1eb44477a686668164e8ea1790a6ed6a75327edb94589cca7df23`
- **Fragment Tx**: `0xcdc8d1d95d275018c0d89e570eb577804543e0a5a1beefc2b1ed7277e26030e8`
- **Timestamp**: 2025-11-23T03:00:40.357Z
- **Status**: ✅ Completed

---

## 🔧 Integration Guide

### Using wSAGA in Your Application

```javascript
// Fragment Chainlet
const wSAGA_ADDRESS = "0xE71d2ea77309Ee3CaC224B8A5537fEcD7f217C9E";
const BRIDGE_ADDRESS = "0xE71d2ea77309Ee3CaC224B8A5537fEcD7f217C9E"; // Same contract
const JOB_ROUTER_ADDRESS = "0xEA48756e27ae679eDE5479dCCB2B29289d320c36";

// SagaEVM
const SAGA_DOLLAR_ADDRESS = "0xB76144F87DF95816e8c55C240F874C554B4553C3";
```

### Network Configuration (MetaMask/Web3)

#### SagaEVM
```javascript
{
  chainId: "0x1558", // 5464 in hex
  chainName: "SagaEVM",
  nativeCurrency: {
    name: "GAS",
    symbol: "GAS",
    decimals: 18
  },
  rpcUrls: ["https://5464.rpc.thirdweb.com"],
  blockExplorerUrls: ["https://sagaevm.sagaexplorer.io"]
}
```

#### Fragment Chainlet
```javascript
{
  chainId: "0x9CFE3E59DD4E0", // 2763843736868000 in hex
  chainName: "Fragment",
  nativeCurrency: {
    name: "MENT",
    symbol: "MENT",
    decimals: 18
  },
  rpcUrls: ["https://fragment-2763843736868000-1.jsonrpc.sagarpc.io"],
  blockExplorerUrls: [] // Not available yet
}
```

---

## 📝 Contract Verification

All contracts are deployed and operational. To verify on block explorers:

### Fragment Chainlet Contracts
- wSAGA Bridge: https://[fragment-explorer]/address/0xE71d2ea77309Ee3CaC224B8A5537fEcD7f217C9E
- Hyperlane Mailbox: https://[fragment-explorer]/address/0x5033fAEC6050387E95Bb78a8c6Bf891bA396B26c
- FragmentJobRouter: https://[fragment-explorer]/address/0xEA48756e27ae679eDE5479dCCB2B29289d320c36

### SagaEVM Contracts
- SAGA Dollar (D): https://sagaevm.sagaexplorer.io/token/0xB76144F87DF95816e8c55C240F874C554B4553C3

---

## 🔐 Security Configuration

### ISM Configuration (Hyperlane)
- **Type**: Merkle Root Multisig ISM
- **Threshold**: 1 of 1
- **Validator**: `0x9f93EebD463d4B7c991986a082d974E77b5a02Dc`

### Bridge Security
- **Operator Model**: Single trusted operator (hackathon mode)
- **Replay Protection**: `processedDeposits` mapping tracks SagaEVM transaction hashes
- **Access Control**: OpenZeppelin `Ownable` and `ReentrancyGuard`
- **Upgrade Path**: Can transition to Hyperlane Warp Route for trustless operation

---

## 📦 Artifact Files

All deployment information is saved in JSON artifacts:

```
Fragment-Backend/Hyperlane/artifacts/
├── bridge-deployment.json          # wSAGA bridge contract
├── bridge-records.json             # Bridge transaction history
└── core-deployment-2025-11-23.json # Hyperlane core contracts (if exists)

Fragment-Backend/SAGA/
└── deployment.json                 # FragmentJobRouter and MockSAGADollar
```

---

## 🚀 Quick Reference

### For Workers
- **Job Contract**: `0xEA48756e27ae679eDE5479dCCB2B29289d320c36`
- **Payment Token**: wSAGA (`0xE71d2ea77309Ee3CaC224B8A5537fEcD7f217C9E`)
- **Register**: Call `registerWorker()` on FragmentJobRouter
- **Get Paid**: Receive wSAGA for completed tasks

### For Job Requesters
- **Job Contract**: `0xEA48756e27ae679eDE5479dCCB2B29289d320c36`
- **Payment Token**: wSAGA (`0xE71d2ea77309Ee3CaC224B8A5537fEcD7f217C9E`)
- **Bridge SAGA**: Use bridge deposit script
- **Submit Jobs**: Call `submitJob()` with Filecoin CID

### For Bridge Users
- **Deposit**: `npm run bridge:deposit <amount>` in Hyperlane directory
- **Status**: `npm run bridge:status` in Hyperlane directory
- **wSAGA Address**: `0xE71d2ea77309Ee3CaC224B8A5537fEcD7f217C9E`

---

## 📞 Support & Documentation

**Main Documentation**:
- `/Fragment-Backend/Hyperlane/BRIDGING_JOURNEY.md` - Complete technical journey
- `/Fragment-Backend/Hyperlane/archive/README.md` - Archive explanation
- `/Fragment-Backend/SAGA/README.md` - SAGA contracts documentation (if exists)

**Quick Scripts**:
- Bridge deposit: `cd Hyperlane && npm run bridge:deposit`
- Bridge status: `cd Hyperlane && npm run bridge:status`
- Deploy bridge: `cd Hyperlane && npm run deploy:bridge`
- Register worker: `cd SAGA && npm run register-worker`
- Submit job: `cd SAGA && npm run submit-job`

---

## ✅ System Status

**All Systems Operational** ✅

```
┌─────────────────────────────────────────────────┐
│  FRAGMENT - System Status                       │
├─────────────────────────────────────────────────┤
│  ✅ Filecoin Storage (Synapse SDK)              │
│  ✅ SAGA Chainlet Contracts                     │
│  ✅ Hyperlane Core (14 contracts)               │
│  ✅ wSAGA Bridge                                 │
│  ✅ Cross-Chain Infrastructure                  │
└─────────────────────────────────────────────────┘
```

**Last Updated**: 2025-11-23  
**Total Contracts**: 16  
**Networks**: 2  
**Status**: Production-Ready for Hackathon Demo

---

*This document contains all contract addresses and configurations for the Fragment distributed AI compute marketplace.*

