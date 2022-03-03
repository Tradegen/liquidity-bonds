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
    uint256 public MINT_COST = 1e20; // 100 bond tokens

    /* ========== STATE VARIABLES ========== */

    address public immutable TGEN;
    address public immutable xTGEN;
    address public immutable marketplace;
    address public immutable bondToken;

    uint256 public numberOfMints;
    mapping(uint256 => ExecutionPriceInfo) public executionPrices;
    mapping(address => uint256) public reverseLookup;

    /* ========== CONSTRUCTOR ========== */

    constructor(address _TGEN, address _xTGEN, address _marketplace, address _bondToken) ERC1155() {
        require(_TGEN != address(0), "PriceManager: invalid address for TGEN.");
        require(_xTGEN != address(0), "PriceManager: invalid address for xTGEN.");
        require(_marketplace != address(0), "PriceManager: invalid address for marketplace.");
        require(_bondToken != address(0), "PriceManager: invalid address for bond token.");

        TGEN = _TGEN;
        xTGEN = _xTGEN;
        marketplace = _marketplace;
        bondToken = _bondToken;
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

        // Check 1's digit.
        // Each iteration is 1.01^1.
        for (i = 0; i < index % 10; i++) {
            result = result.mul(101).div(100);
        }

        index = index.div(10);

        // Check 10's digit.
        // Each iteration is 1.01^10 => ~1.1046x increase.
        for (i = 0; i < index % 10; i++) {
            result = result.mul(11046).div(10000);
        }

        index = index.div(10);

        // Check 100's digit.
        // Each iteration is 1.01^100 => ~2.7048x increase.
        for (i = 0; i < index % 10; i++) {
            result = result.mul(27048).div(10000);
        }

        index = index.div(10);

        // Check 1000's digit.
        // Each iteration is 1.01^1000 => ~20959.1556x increase.
        for (i = 0; i < index % 10; i++) {
            result = result.mul(209591556).div(10000);
        }

        return result;
    }

    /**
     * @dev Checks whether the given ExecutionPrice is registered in PriceManager.
     * @param _contractAddress address of the ExecutionPrice contract.
     * @return (bool) whether the address is registered.
     */
    function executionPriceExists(address _contractAddress) public view override returns (bool) {
        return executionPrices[reverseLookup[_contractAddress]].owner != address(0);
    }


    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @dev Purchases the ExecutionPrice NFT at the given index.
     * @param _index index of the ExecutionPrice NFT.
     * @param _maximumNumberOfInvestors the maximum number of open orders the queue can have.
     * @param _tradingFee fee that is paid to the contract owner whenever an order is filled; denominated by 10000.
     * @param _minimumOrderSize minimum number of bond tokens per order.
     */
    function purchase(uint256 _index, uint256 _maximumNumberOfInvestors, uint256 _tradingFee, uint256 _minimumOrderSize) external override notMinted(_index) {
        require(_index >= 0, "PriceManager: index must be positive.");
        require(_index < MAX_INDEX, "PriceManager: index is too high.");

        uint256 price = calculatePrice(_index);

        IERC20(bondToken).safeTransferFrom(msg.sender, address(this), MINT_COST);

        //Create ExecutionPrice contract and mint an NFT.
        address executionPriceAddress = address(new ExecutionPrice(TGEN, bondToken, marketplace, xTGEN));
        _mint(msg.sender, _index, 1, "");

        numberOfMints = numberOfMints.add(1);
        reverseLookup[executionPriceAddress] = _index;
        executionPrices[_index] = ExecutionPriceInfo({
            owner: msg.sender,
            contractAddress: executionPriceAddress,
            price: price,
            index: _index
        });

        // Update state variables before initializing contract so the transaction is not reverted when checking whether the ExecutionPrice is registered.
        ExecutionPrice(executionPriceAddress).initialize(price, _maximumNumberOfInvestors, _tradingFee, _minimumOrderSize, msg.sender);

        emit Purchased(msg.sender, _index);
    }

    /* ========== MODIFIERS ========== */

    modifier notMinted(uint256 _index) {
        require(executionPrices[_index].owner  == address(0), "PriceManager: already minted.");
        _;
    }

    /* ========== EVENTS ========== */

    event Purchased(address indexed buyer, uint256 index);
}