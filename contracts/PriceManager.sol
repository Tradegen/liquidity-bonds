// SPDX-License-Identifier: MIT
// solhint-disable not-rely-on-time

pragma solidity ^0.8.3;

import "./openzeppelin-solidity/contracts/SafeMath.sol";
import "./openzeppelin-solidity/contracts/ERC20/SafeERC20.sol";
import "./openzeppelin-solidity/contracts/ERC1155/ERC1155.sol";

// Internal references
import "./ExecutionPrice.sol";

// Inheritance
import "./interfaces/IPriceManager.sol";

contract PriceManager is IPriceManager, ERC1155 {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct ExecutionPriceInfo {
        address owner;
        address contractAddress;
        uint256 price;
        uint256 index;
    }

    /* ========== CONSTANTS ========== */

    uint256 public MAX_INDEX = 10000;

    /* ========== STATE VARIABLES ========== */

    uint256 public numberOfMints;
    mapping(uint256 => ExecutionPriceInfo) public executionPrices;
    mapping(address => ExecutionPriceInfo) public reverseLookup;

    /* ========== CONSTRUCTOR ========== */

    constructor() ERC1155() {
    }

    /* ========== VIEWS ========== */

    /**
     * @dev Calculates the price of an ExecutionPrice NFT, given its index.
     * @param _index index of the ExecutionPrice NFT.
     */
    function calculatePrice(uint256 _index) public view override returns (uint256) {
        if (executionPrices[_index].price > 0) {
            return executionPrices[_index].price;
        }

        uint256 result = 1e18;
        uint256 index = _index;
        uint256 i;

        for (i = 0; i < index % 10; i++) {
            result = result.mul(101).div(100);
        }

        index = index.div(10);

        for (i = 0; i < index % 10; i++) {
            result = result.mul(11046).div(10000);
        }

        index = index.div(10);

        for (i = 0; i < index % 10; i++) {
            result = result.mul(27048).div(10000);
        }

        index = index.div(10);

        for (i = 0; i < index % 10; i++) {
            result = result.mul(209591556).div(10000);
        }

        return result;
    }

    function executionPriceExists(address _contractAddress) public view override returns (bool) {
        return reverseLookup[_contractAddress].owner != address(0);
    }


    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @dev Purchases the ExecutionPrice NFT at the given index.
     * @param _index index of the ExecutionPrice NFT.
     */
    function purchase(uint256 _index) external override {
        require(_index >= 0, "PriceManager: index must be positive.");
        require(_index < MAX_INDEX, "PriceManager: index is too high.");

        uint256 price = calculatePrice(_index);


    }

    /* ========== MODIFIERS ========== */

    modifier notMinted(uint256 _index) {
        require(executionPrices[_index].owner  == address(0), "PriceManager: already minted.");
        _;
    }

    /* ========== EVENTS ========== */

    event Purchase(address indexed buyer, uint256 index);
}