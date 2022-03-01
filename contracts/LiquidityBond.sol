// SPDX-License-Identifier: MIT
// solhint-disable not-rely-on-time

pragma solidity ^0.8.3;

import "./openzeppelin-solidity/contracts/SafeMath.sol";
import "./openzeppelin-solidity/contracts/ReentrancyGuard.sol";
import "./openzeppelin-solidity/contracts/Ownable.sol";
import "./openzeppelin-solidity/contracts/ERC20/SafeERC20.sol";
import "./openzeppelin-solidity/contracts/ERC20/ERC20.sol";

// Inheritance
import "./interfaces/ILiquidityBond.sol";

// Interfaces
import "./interfaces/IReleaseEscrow.sol";
import "./interfaces/IPriceAggregator.sol";
import "./interfaces/IRouter.sol";

contract LiquidityBond is ILiquidityBond, ReentrancyGuard, Ownable, ERC20 {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    uint256 public constant MAX_PURCHASE_AMOUNT = 1000;

    IERC20 public rewardsToken; // TGEN token
    IERC20 public collateralToken; // CELO token
    IReleaseEscrow public releaseEscrow;
    IPriceAggregator public priceAggregator;
    IRouter public router;
    
    uint256 public totalAvailableRewards;
    uint256 public rewardPerTokenStored;
    uint256 public bondTokenPrice; // Price of 1 bond token in USD

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    /* ========== CONSTRUCTOR ========== */

    constructor(address _rewardsToken, address _collateralTokenAddress, address _priceAggregatorAddress, address _routerAddress) ERC20("LiquidityBond", "LB") {
        rewardsToken = IERC20(_rewardsToken);
        collateralToken = IERC20(_collateralTokenAddress);
        priceAggregator = IPriceAggregator(_priceAggregatorAddress);
        router = IRouter(_routerAddress);
    }

    /* ========== VIEWS ========== */

    /**
     * @dev Calculates the amount of unclaimed rewards the user has available.
     * @param _account address of the user.
     * @return (uint256) amount of available unclaimed rewards.
     */
    function earned(address _account) public view override returns (uint256) {
        return balanceOf(_account).mul(rewardPerTokenStored.sub(userRewardPerTokenPaid[_account])).add(rewards[_account]);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @dev Purchases liquidity bonds.
     * @notice Swaps 1/2 of collateral for TGEN and adds liquidity.
     * @notice Collateral lost to slippage/fees is returned to the user.
     * @param _amount amount of collateral to deposit.
     */
    function purchase(uint256 _amount) external override nonReentrant releaseEscrowIsSet updateReward(msg.sender) {
        require(_amount > 0, "LiquidityBond: Amount must be positive.");
        require(_amount <= MAX_PURCHASE_AMOUNT, "LiquidityBond: Amount must be less than max purchase amount.");

        uint256 dollarValue = priceAggregator.getUSDPrice(address(collateralToken));
        uint256 numberOfBondTokens = dollarValue.div(bondTokenPrice);
        uint256 initialFlooredSupply = totalSupply().div(10 ** 21);

        _mint(msg.sender, numberOfBondTokens);

        // Increase price by 1% for every 1000 tokens minted.
        if (totalSupply().div(10 ** 21) > initialFlooredSupply) {
            bondTokenPrice = bondTokenPrice.mul(101).div(100);
        }

        collateralToken.safeTransferFrom(msg.sender, address(this), _amount);

        _addLiquidity(_amount);

        emit Purchased(msg.sender, _amount, numberOfBondTokens);
    }

    /**
     * @dev Claims available rewards for the user.
     */
    function getReward() public override nonReentrant releaseEscrowIsSet {
        uint256 availableRewards = releaseEscrow.withdraw();
        _addReward(availableRewards);
        _getReward();
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    /**
     * @dev Claims available rewards for the user.
     */
    function _getReward() internal updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];

        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.transfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /**
     * @dev Updates the available rewards for the LiquidityBond contract, based on the release schedule.
     * @param _reward number of tokens to add to the LiquidityBond contract.
     */
    function _addReward(uint256 _reward) internal {
        if (totalSupply() > 0) {
            rewardPerTokenStored = rewardPerTokenStored.add(_reward.div(totalSupply()));
        }

        totalAvailableRewards = totalAvailableRewards.add(_reward);

        emit RewardAdded(_reward);
    }

    /**
     * @dev Supplies liquidity for TGEN-CELO pair.
     * @param _amountOfCollateral number of asset tokens to supply.
     */
    function _addLiquidity(uint256 _amountOfCollateral) internal {
        collateralToken.approve(address(router), _amountOfCollateral.div(2));
        uint256 numberOfTGEN = router.swapAssetForTGEN(address(collateralToken), _amountOfCollateral.div(2));

        collateralToken.approve(address(router), _amountOfCollateral.div(2));
        rewardsToken.approve(address(router), numberOfTGEN);
        router.addLiquidity(address(collateralToken), _amountOfCollateral.div(2), numberOfTGEN);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /**
     * @dev Sets the address of the ReleaseEscrow contract.
     * @notice This function can only be called once, and must be called before users can interact with LiquidityBond contract.
     */
    function setReleaseEscrow(address _releaseEscrow) external onlyOwner releaseEscrowIsNotSet {
        require(_releaseEscrow != address(0), "LiquidityBond: invalid address.");

        releaseEscrow = IReleaseEscrow(_releaseEscrow);

        emit SetReleaseEscrow(_releaseEscrow);
    }

    /* ========== MODIFIERS ========== */

    modifier updateReward(address account) {
        rewards[account] = earned(account);
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
        _;
    }

    modifier releaseEscrowIsSet() {
        require(address(releaseEscrow) != address(0), "LiquidityBond: ReleaseEscrow contract must be set before calling this function.");
        _;
    }

    modifier releaseEscrowIsNotSet() {
        require(address(releaseEscrow) == address(0), "LiquidityBond: ReleaseEscrow contract already set.");
        _;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward);
    event Purchased(address indexed user, uint256 amountDeposited, uint256 numberOfBondTokensReceived);
    event RewardPaid(address indexed user, uint256 reward);
    event SetReleaseEscrow(address releaseEscrowAddress);
}