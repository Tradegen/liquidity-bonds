// SPDX-License-Identifier: MIT
// solhint-disable not-rely-on-time

pragma solidity ^0.8.3;

import "./openzeppelin-solidity/contracts/SafeMath.sol";
import "./openzeppelin-solidity/contracts/ReentrancyGuard.sol";
import "./openzeppelin-solidity/contracts/Ownable.sol";
import "./openzeppelin-solidity/contracts/ERC20/SafeERC20.sol";

// Inheritance
import "./interfaces/ILiquidityBond.sol";

// Interfaces
import "./interfaces/IReleaseEscrow.sol";

contract LiquidityBond is ILiquidityBond, ReentrancyGuard, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    IERC20 public rewardsToken; // TGEN token
    IERC20 public collateralToken; // CELO token
    IReleaseEscrow public releaseEscrow;
    uint256 public totalAvailableRewards;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 public override totalSupply;
    mapping(address => uint256) public balance;

    /* ========== CONSTRUCTOR ========== */

    constructor(address _rewardsToken, address _collateralTokenAddress) {
        rewardsToken = IERC20(_rewardsToken);
        collateralToken = IERC20(_collateralTokenAddress);
    }

    /* ========== VIEWS ========== */

   /**
     * @dev Returns the number of tokens a user has purchased.
     * @param _account address of the user.
     * @return (uint256) number of tokens purchased.
     */
    function balanceOf(address _account) external view override returns (uint256) {
        require(_account != address(0), "LiquidityBond: invalid account address.");

        return balance[_account];
    }

    /**
     * @dev Calculates the amount of unclaimed rewards the user has available.
     * @param _account address of the user.
     * @return (uint256) amount of available unclaimed rewards.
     */
    function earned(address _account) public view override returns (uint256) {
        return balance[_account].mul(rewardPerTokenStored.sub(userRewardPerTokenPaid[_account])).add(rewards[_account]);
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

        totalSupply = totalSupply.add(_amount);
        balance[msg.sender] = balance[msg.sender].add(_amount);

        collateralToken.safeTransferFrom(msg.sender, address(this), _amount);

        emit Purchased(msg.sender, _amount, _amount);
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
     * @param reward number of tokens to add to the LiquidityBond contract.
     */
    function _addReward(uint256 reward) internal{
        if (totalSupply > 0) {
            rewardPerTokenStored = rewardPerTokenStored.add(reward.div(totalSupply));
        }

        totalAvailableRewards = totalAvailableRewards.add(reward);

        emit RewardAdded(reward);
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
    event Purchased(address indexed user, uint256 amountDeposited, uint256 weight);
    event RewardPaid(address indexed user, uint256 reward);
    event SetReleaseEscrow(address releaseEscrowAddress);
}