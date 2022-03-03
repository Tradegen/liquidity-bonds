// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

interface IPriceManager {
    // Views

    /**
     * @dev Calculates the price of an ExecutionPrice NFT, given its index.
     * @param _index index of the ExecutionPrice NFT.
     */
    function calculatePrice(uint256 _index) external view returns (uint256);

    function executionPriceExists(address _contractAddress) external view returns (bool);

    // Mutative

    /**
     * @dev Purchases the ExecutionPrice NFT at the given index.
     * @param _index index of the ExecutionPrice NFT.
     */
    function purchase(uint256 _index) external;
}