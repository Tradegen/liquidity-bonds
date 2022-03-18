const { expect } = require("chai");
const { parseEther } = require("@ethersproject/units");

describe("ExecutionPrice", () => {
  let deployer;
  let otherUser;

  let tradegenToken;
  let tradegenTokenAddress;
  let mockCELO;
  let mockCELOAddress;
  let TestTokenFactory;

  let ubeswapFactory;
  let ubeswapFactoryAddress;
  let UbeswapFactoryFactory;

  let ubeswapRouter;
  let ubeswapRouterAddress;
  let UbeswapRouterFactory;

  let pairData;
  let pairDataAddress;
  let PairDataFactory;
  
  let pathManager;
  let pathManagerAddress;
  let PathManagerFactory;

  let router;
  let routerAddress;
  let RouterFactory;

  let priceCalculator;
  let priceCalculatorAddress;
  let PriceCalculatorFactory;

  let releaseSchedule;
  let releaseScheduleAddress;
  let ReleaseScheduleFactory;

  let releaseEscrow;
  let releaseEscrowAddress;
  let ReleaseEscrowFactory;

  let liquidityBond;
  let liquidityBondAddress;
  let LiquidityBondFactory;

  let executionPrice;
  let executionPriceAddress;
  let ExecutionPriceFactory;

  const ONE_WEEK = 86400 * 7;
  const CYCLE_DURATION = ONE_WEEK * 26;
  
  before(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    otherUser = signers[1];

    TestTokenFactory = await ethers.getContractFactory('TestTokenERC20');
    UbeswapFactoryFactory = await ethers.getContractFactory('UniswapV2Factory');
    UbeswapRouterFactory = await ethers.getContractFactory('UniswapV2Router02');
    PairDataFactory = await ethers.getContractFactory('PairData');
    PathManagerFactory = await ethers.getContractFactory('UbeswapPathManager');
    RouterFactory = await ethers.getContractFactory('Router');
    PriceCalculatorFactory = await ethers.getContractFactory('TestPriceCalculator');
    ReleaseScheduleFactory = await ethers.getContractFactory('TestReleaseSchedule');
    ReleaseEscrowFactory = await ethers.getContractFactory('ReleaseEscrow');
    LiquidityBondFactory = await ethers.getContractFactory('TestLiquidityBond');
    ExecutionPriceFactory = await ethers.getContractFactory('ExecutionPrice');

    tradegenToken = await TestTokenFactory.deploy("Test TGEN", "TGEN");
    await tradegenToken.deployed();
    tradegenTokenAddress = tradegenToken.address;

    mockCELO = await TestTokenFactory.deploy("Test CELO", "CELO");
    await mockCELO.deployed();
    mockCELOAddress = mockCELO.address;

    pairData = await PairDataFactory.deploy();
    await pairData.deployed();
    pairDataAddress = pairData.address;

    pathManager = await PathManagerFactory.deploy();
    await pathManager.deployed();
    pathManagerAddress = pathManager.address;

    priceCalculator = await PriceCalculatorFactory.deploy();
    await priceCalculator.deployed();
    priceCalculatorAddress = priceCalculator.address;

    let tx = await pathManager.setPath(mockCELOAddress, tradegenTokenAddress, [mockCELOAddress, tradegenTokenAddress]);
    await tx.wait();

    let tx2 = await pathManager.setPath(tradegenTokenAddress, mockCELOAddress, [tradegenTokenAddress, mockCELOAddress]);
    await tx2.wait();

    ubeswapFactory = await UbeswapFactoryFactory.deploy(deployer.address);
    await ubeswapFactory.deployed();
    ubeswapFactoryAddress = ubeswapFactory.address;

    ubeswapRouter = await UbeswapRouterFactory.deploy(ubeswapFactoryAddress);
    await ubeswapRouter.deployed();
    ubeswapRouterAddress = ubeswapRouter.address;

    router = await RouterFactory.deploy(pathManagerAddress, ubeswapRouterAddress, tradegenTokenAddress);
    await router.deployed();
    routerAddress = router.address;

    let currentTime = await pairData.getCurrentTime();

    let tx3 = await tradegenToken.approve(ubeswapRouterAddress, parseEther("1000"));
    await tx3.wait();

    let tx4 = await mockCELO.approve(ubeswapRouterAddress, parseEther("1000"));
    await tx4.wait();

    // Create TGEN-CELO pair and supply seed liquidity.
    let tx5 = await ubeswapRouter.addLiquidity(tradegenTokenAddress, mockCELOAddress, parseEther("1000"), parseEther("1000"), 0, 0, deployer.address, Number(currentTime) + 1000);
    await tx5.wait();

    let pair = await ubeswapFactory.getPair(tradegenTokenAddress, mockCELOAddress);

    liquidityBond = await LiquidityBondFactory.deploy(tradegenTokenAddress, mockCELOAddress, pair, priceCalculatorAddress, routerAddress, ubeswapRouterAddress, pairDataAddress);
    await liquidityBond.deployed();
    liquidityBondAddress = liquidityBond.address;
  });

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    otherUser = signers[1];

    executionPrice = await ExecutionPriceFactory.deploy(tradegenTokenAddress, liquidityBondAddress, otherUser.address, pairDataAddress);
    await executionPrice.deployed();
    executionPriceAddress = executionPrice.address;
  });
  
  describe("#updateTradingFee", () => {
    it("not owner", async () => {
        let tx = executionPrice.connect(otherUser).updateTradingFee(100)
        await expect(tx).to.be.reverted;

        let fee = await executionPrice.tradingFee();
        expect(fee).to.equal(50);
    });
  });
});