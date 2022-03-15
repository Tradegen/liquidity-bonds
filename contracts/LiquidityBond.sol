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
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Factory.sol";

contract LiquidityBond is ILiquidityBond, ReentrancyGuard, Ownable, ERC20 {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    uint256 public constant MAX_PURCHASE_AMOUNT = 1000;
    uint256 public constant MIN_AVERAGE_FOR_PERIOD = 1e21; // 1000 CELO
    uint256 public constant PERIOD_DURATION = 1 days;

    IERC20 public immutable rewardsToken; // TGEN token
    IERC20 public immutable collateralToken; // CELO token
    IReleaseEscrow public releaseEscrow;
    IPriceAggregator public immutable priceAggregator;
    IRouter public immutable router;
    IUniswapV2Factory public immutable ubeswapFactory;
    address public immutable xTGEN;
    
    uint256 public totalAvailableRewards;
    uint256 public rewardPerTokenStored;
    uint256 public bondTokenPrice; // Price of 1 bond token in USD
    uint256 public startTime;

    mapping(uint256 => uint256) public stakedAmounts; // Period index => amount of CELO staked
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    /* ========== CONSTRUCTOR ========== */

    constructor(address _rewardsToken, address _collateralTokenAddress, address _priceAggregatorAddress, address _routerAddress, address _factoryAddress, address _xTGEN) ERC20("LiquidityBond", "LB") {
        rewardsToken = IERC20(_rewardsToken);
        collateralToken = IERC20(_collateralTokenAddress);
        priceAggregator = IPriceAggregator(_priceAggregatorAddress);
        router = IRouter(_routerAddress);
        ubeswapFactory = IUniswapV2Factory(_factoryAddress);
        xTGEN = _xTGEN;
    }

    /* ========== VIEWS ========== */

    /**
     * @dev Returns whether the rewards have started.
     */
    function hasStarted() public view override returns (bool) {
        return block.timestamp >= startTime;
    }

    /**
     * @dev Returns the period index of the given timestamp.
     */
    function getPeriodIndex(uint256 _timestamp) public view override returns (uint256) {
        return (_timestamp.sub(startTime)).div(PERIOD_DURATION);
    }

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
     * @notice Sends unused collateral back to user.
     * @param _amount amount of collateral to deposit.
     */
    function purchase(uint256 _amount) external override nonReentrant releaseEscrowIsSet rewardsHaveStarted updateReward(msg.sender) {
        require(_amount > 0, "LiquidityBond: Amount must be positive.");
        require(_amount <= MAX_PURCHASE_AMOUNT, "LiquidityBond: Amount must be less than max purchase amount.");

        // Use the deposited collateral to add liquidity for TGEN-CELO.
        collateralToken.safeTransferFrom(msg.sender, address(this), _amount);
        uint256 usedCELO = _addLiquidity(_amount);
        collateralToken.safeTransfer(msg.sender, _amount.sub(usedCELO));

        uint256 amountOfBonusCollateral = _calculateBonusAmount(usedCELO);
        uint256 dollarValue = priceAggregator.getUSDPrice(address(collateralToken)).mul(usedCELO.add(amountOfBonusCollateral)).div(10 ** 18);
        uint256 numberOfBondTokens = dollarValue.mul(10 ** 18).div(bondTokenPrice);
        uint256 initialFlooredSupply = totalSupply().div(10 ** 21);

        // Add original collateral amount to staked amount for current period; don't include bonus amount.
        stakedAmounts[getPeriodIndex(block.timestamp)] = stakedAmounts[getPeriodIndex(block.timestamp)].add(usedCELO);

        // Increase total supply and transfer bond tokens to buyer.
        _mint(msg.sender, numberOfBondTokens);

        // Increase price by 1% for every 1000 tokens minted.
        uint256 delta = (totalSupply().div(10 ** 21)).sub(initialFlooredSupply);
        bondTokenPrice = bondTokenPrice.mul(101 ** delta).div(100 ** delta);

        emit Purchased(msg.sender, usedCELO, numberOfBondTokens, amountOfBonusCollateral);
    }

    /**
     * @dev Claims available rewards for the user.
     */
    function getReward() public override nonReentrant releaseEscrowIsSet rewardsHaveStarted {
        uint256 availableRewards = releaseEscrow.withdraw();
        if (totalSupply() == 0) {
            rewardsToken.safeTransfer(xTGEN, availableRewards);
        }
        else {
            _addReward(availableRewards);
            _getReward();
        }
    }

    /**
     * @dev Hook that is called before any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * will be to transferred to `to`.
     * - when `from` is zero, `amount` tokens will be minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override updateReward(from) updateReward(to) { }

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
     * @return (uint256) number of asset tokens used; takes slippage and exchange fees into account.
     */
    function _addLiquidity(uint256 _amountOfCollateral) internal returns (uint256) {
        collateralToken.approve(address(router), _amountOfCollateral.div(2));
        uint256 numberOfTGEN = router.swapAssetForTGEN(address(collateralToken), _amountOfCollateral.div(2));

        address pair = ubeswapFactory.getPair(address(rewardsToken), address(collateralToken));
        address token0 = IUniswapV2Pair(pair).token0();
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();

        uint256 neededCELO;
        if (token0 == address(rewardsToken)) {
            neededCELO = numberOfTGEN.mul(uint256(reserve1)).div(uint256(reserve0));
        }
        else {
            neededCELO = numberOfTGEN.mul(uint256(reserve0)).div(uint256(reserve1));
        }

        collateralToken.approve(address(router), neededCELO);
        rewardsToken.approve(address(router), numberOfTGEN);
        router.addLiquidity(address(collateralToken), neededCELO, numberOfTGEN);

        return neededCELO.mul(2);
    }

    /**
     * @dev Calculates the number of bonus tokens to consider as collateral when minting bond tokens.
     * @notice The bonus multiplier for each period starts at +20% and falls linearly to +0% until max(1000, 1.1 * (totalSupply - amountStaked[n]) / (n-1))
     *          have been staked for the current period.
     * @notice The final bonus amount is [multiplier/2 * availableTokens/maxTokens * availableCollateral].
     * @param _amountOfCollateral number of asset tokens to supply.
     */
    function _calculateBonusAmount(uint256 _amountOfCollateral) internal view returns (uint256) {
        uint256 currentPeriodIndex = getPeriodIndex(block.timestamp);
        uint256 maxTokens = (currentPeriodIndex == 0) ? MIN_AVERAGE_FOR_PERIOD :
                            ((totalSupply().sub(stakedAmounts[currentPeriodIndex])).mul(11).div(currentPeriodIndex).div(10) > MIN_AVERAGE_FOR_PERIOD) ?
                            totalSupply().sub(stakedAmounts[currentPeriodIndex]).mul(11).div(currentPeriodIndex).div(10) : MIN_AVERAGE_FOR_PERIOD;
        uint256 availableTokens = (stakedAmounts[currentPeriodIndex] >= maxTokens) ? 0 : maxTokens.sub(stakedAmounts[currentPeriodIndex]);
        uint256 availableCollateral = (availableTokens > _amountOfCollateral) ? availableTokens.sub(_amountOfCollateral) : 0;

        return availableTokens.mul(3).mul(availableCollateral).div(5).div(maxTokens);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /**
     * @dev Sets the address of the ReleaseEscrow contract.
     * @notice This function can only be called once, and must be called before users can interact with LiquidityBond contract.
     */
    function setReleaseEscrow(address _releaseEscrow) external onlyOwner releaseEscrowIsNotSet {
        require(_releaseEscrow != address(0), "LiquidityBond: invalid address.");

        releaseEscrow = IReleaseEscrow(_releaseEscrow);
        startTime = releaseEscrow.startTime();

        emit SetReleaseEscrow(_releaseEscrow, startTime);
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

    modifier rewardsHaveStarted() {
        require(hasStarted(), "LiquidityBond: Rewards have not started.");
        _;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward);
    event Purchased(address indexed user, uint256 amountDeposited, uint256 numberOfBondTokensReceived, uint256 bonus);
    event RewardPaid(address indexed user, uint256 reward);
    event SetReleaseEscrow(address releaseEscrowAddress, uint256 startTime);
}