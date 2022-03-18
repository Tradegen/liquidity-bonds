// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import "../ExecutionPrice.sol";

contract TestExecutionPrice is ExecutionPrice {
    constructor(address _TGEN, address _bondToken, address _marketplace, address _xTGEN)
        ExecutionPrice(_TGEN, _bondToken, _marketplace, _xTGEN)
    {
    }

    function setStartIndex(uint256 _index) external {
        startIndex = _index;
    }

    function setEndIndex(uint256 _index) external {
        endIndex = _index;
    }

    function setIsBuyQueue(bool _isBuyQueue) external {
        isBuyQueue = _isBuyQueue;
    }

    function setNumberOfTokensAvailable(uint256 _amount) external {
        numberOfTokensAvailable = _amount;
    }

    function setOrderIndex(address _user, uint256 _index) external {
        orderIndex[_user] = _index;
    }

    function setOrder(uint256 _index, address _user, uint256 _quantity, uint256 _amountFilled) external {
        orderBook[_index] = Order({
            user: _user,
            quantity: _quantity,
            amountFilled: _amountFilled
        });
    }

    function setIsInitialized(bool _isInitialized) external {
        initialized = _isInitialized;
    }

    function setOwner(address _owner) external {
        owner = _owner;
    }

    function setPrice(uint256 _price) external {
        price = _price;
    }
}