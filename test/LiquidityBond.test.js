const { expect } = require("chai");
const { parseEther } = require("@ethersproject/units");

describe("LiquidityBond", () => {
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
    PriceCalculatorFactory = await ethers.getContractFactory('PriceCalculator');
    ReleaseScheduleFactory = await ethers.getContractFactory('ReleaseSchedule');
    ReleaseEscrowFactory = await ethers.getContractFactory('ReleaseEscrow');
    LiquidityBondFactory = await ethers.getContractFactory('LiquidityBond');

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
  });

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    otherUser = signers[1];

    ubeswapFactory = await UbeswapFactoryFactory.deploy(deployer.address);
    await ubeswapFactory.deployed();
    ubeswapFactoryAddress = ubeswapFactory.address;

    ubeswapRouter = await UbeswapRouterFactory.deploy(ubeswapFactoryAddress);
    await ubeswapRouter.deployed();
    ubeswapRouterAddress = ubeswapRouter.address;

    router = await RouterFactory.deploy(pathManagerAddress, ubeswapRouterAddress, tradegenTokenAddress);
    await router.deployed();
    routerAddress = router.address;

    liquidityBond = await LiquidityBondFactory.deploy(tradegenTokenAddress, mockCELOAddress, priceCalculatorAddress, routerAddress, ubeswapFactoryAddress, pairDataAddress);
    await liquidityBond.deployed();
    liquidityBondAddress = liquidityBond.address;

    let currentTime = await pairData.getCurrentTime();

    let tx = await tradegenToken.approve(ubeswapRouterAddress, parseEther("1000"));
    await tx.wait();

    let tx2 = await mockCELO.approve(ubeswapRouterAddress, parseEther("1000"));
    await tx2.wait();

    // Create TGEN-CELO pair and supply seed liquidity.
    let tx3 = await ubeswapRouter.addLiquidity(tradegenTokenAddress, mockCELOAddress, parseEther("1000"), parseEther("1000"), 0, 0, deployer.address, Number(currentTime) + 1000);
    await tx3.wait();
  });
  
  describe("#calculateBonusAmount", () => {
    it("none purchased for current period; buy half available", async () => {
        let tx = await tradegenToken.approve(routerAddress, parseEther("1000"));
        await tx.wait();

        let tx2 = await mockCELO.approve(routerAddress, parseEther("10"));
        await tx2.wait();

        let tx3 = await router.addLiquidity(mockCELOAddress, parseEther("10"), parseEther("1000"));
        let temp = await tx3.wait();
        let event = temp.events[13].args;
        expect(event.asset).to.equal(mockCELOAddress);
        expect(event.amountAsset).to.equal(parseEther("10"));
        expect(event.amountTGEN).to.equal(parseEther("1000"));
        expect(event.numberOfLPTokens).to.equal(parseEther("10"));

        let pair = await ubeswapFactory.getPair(tradegenTokenAddress, mockCELOAddress);

        let totalSupply = await pairData.getTotalSupply(pair);
        expect(totalSupply).to.equal(parseEther("1010"));

        let reserves = await pairData.getReserves(pair);
        expect(reserves[0]).to.equal(parseEther("1010"));
        expect(reserves[1]).to.equal(parseEther("1010"));
    });
  });
});