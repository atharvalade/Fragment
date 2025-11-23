// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockSAGADollar
 * @notice Mock ERC20 token for testing (will use real SAGA Dollar in production)
 */
contract MockSAGADollar is ERC20 {
    constructor() ERC20("SAGA Dollar", "USDSAGA") {
        // Mint 1 million tokens to deployer for testing
        _mint(msg.sender, 1000000 * 10**decimals());
    }
    
    /**
     * @notice Mint tokens (for testing only)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

