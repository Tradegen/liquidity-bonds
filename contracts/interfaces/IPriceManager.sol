// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

interface IPriceManager {
    // Views

    /**
     * @dev Calculates the price of an ExecutionPrice NFT, given its index.
     * @param _index index of the ExecutionPrice NFT.
     */
    function calculatePrice(uint256 _index) external view returns (uint256);

    /**
     * @dev Checks whether the given ExecutionPrice is registered in PriceManager.
     * @param _contractAddress address of the ExecutionPrice contract.
     * @return (bool) whether the address is registered.
     */
    function executionPriceExists(address _contractAddress) external view returns (bool);

    // Mutative

   /**
     * @dev Purchases the ExecutionPrice NFT at the given index.
     * @param _index index of the ExecutionPrice NFT.
     * @param _maximumNumberOfInvestors the maximum number of open orders the queue can have.
     * @param _tradingFee fee that is paid to the contract owner whenever an order is filled; denominated by 10000.
     * @param _minimumOrderSize minimum number of bond tokens per order.
     */
    function purchase(uint256 _index, uint256 _maximumNumberOfInvestors, uint256 _tradingFee, uint256 _minimumOrderSize) external;
}