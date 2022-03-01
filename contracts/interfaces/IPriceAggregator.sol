// SPDX-License-Identifier: MIT

pragma solidity >=0.7.6;

interface IPriceAggregator {
    function getUSDPrice(address asset) external view returns (uint);
}