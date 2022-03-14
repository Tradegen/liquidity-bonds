// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// Interfaces
import "./Ubeswap/interfaces/IUniswapV2Pair.sol";

contract PairData {
    constructor() {}

    function getTotalSupply(address _pair) external view returns (uint256) {
        return IUniswapV2Pair(_pair).totalSupply();
    }

    function getBalanceOf(address _pair, address _user) external view returns (uint256) {
        return IUniswapV2Pair(_pair).balanceOf(_user);
    }
}