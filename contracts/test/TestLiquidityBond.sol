// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import "../LiquidityBond.sol";

contract TestLiquidityBond is LiquidityBond {
    uint256 collateralUsed;

    constructor(address _rewardsToken, address _collateralTokenAddress, address _priceAggregatorAddress, address _routerAddress, address _factoryAddress)
        LiquidityBond(_rewardsToken, _collateralTokenAddress, _priceAggregatorAddress, _routerAddress, _factoryAddress)
    {
    }

    function calculateBonusAmount(uint256 _amountOfCollateral) external view returns (uint256) {
        return _calculateBonusAmount(_amountOfCollateral);
    }

    function addLiquidity(uint256 _amountOfCollateral) external {
        collateralUsed = _addLiquidity(_amountOfCollateral);
    }
}