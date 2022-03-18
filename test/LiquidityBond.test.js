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
    PriceCalculatorFactory = await ethers.getContractFactory('TestPriceCalculator');
    ReleaseScheduleFactory = await ethers.getContractFactory('TestReleaseSchedule');
    ReleaseEscrowFactory = await ethers.getContractFactory('ReleaseEscrow');
    LiquidityBondFactory = await ethers.getContractFactory('TestLiquidityBond');

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

    let currentTime = await pairData.getCurrentTime();

    let tx = await tradegenToken.approve(ubeswapRouterAddress, parseEther("1000"));
    await tx.wait();

    let tx2 = await mockCELO.approve(ubeswapRouterAddress, parseEther("1000"));
    await tx2.wait();

    // Create TGEN-CELO pair and supply seed liquidity.
    let tx3 = await ubeswapRouter.addLiquidity(tradegenTokenAddress, mockCELOAddress, parseEther("1000"), parseEther("1000"), 0, 0, deployer.address, Number(currentTime) + 1000);
    await tx3.wait();

    let pair = await ubeswapFactory.getPair(tradegenTokenAddress, mockCELOAddress);

    liquidityBond = await LiquidityBondFactory.deploy(tradegenTokenAddress, mockCELOAddress, pair, priceCalculatorAddress, routerAddress, ubeswapRouterAddress, pairDataAddress);
    await liquidityBond.deployed();
    liquidityBondAddress = liquidityBond.address;
  });
  /*
  describe("#calculateBonusAmount", () => {
    it("none purchased for current period; buy 1/2 of available tokens; period 0", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime);
      await tx.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("500"));
      expect(bonus).to.equal(parseEther("75"));
    });

    it("none purchased for current period; buy 1/4 of available tokens; period 0", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime);
      await tx.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("250"));
      expect(bonus).to.equal(parseEther("43.75"));
    });

    it("none purchased for current period; buy all available tokens; period 0", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime);
      await tx.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("1300"));
      expect(bonus).to.equal(parseEther("100"));
    });

    it("1/2 purchased for current period; buy all available tokens; period 0", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("500"));
      await tx2.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("500"));
      expect(bonus).to.equal(parseEther("25"));
    });

    it("1/2 purchased for current period; buy more tokens than available; period 0", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("500"));
      await tx2.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("700"));
      expect(bonus).to.equal(parseEther("25"));
    });

    it("1/2 purchased for current period; buy 1/2 of available tokens; period 0", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("500"));
      await tx2.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("250"));
      expect(bonus).to.equal(parseEther("18.75"));
    });

    it("1/4 purchased for current period; buy 1/4 of available tokens; period 0", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("250"));
      await tx2.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("250"));
      expect(bonus).to.equal(parseEther("31.25"));
    });

    it("1/4 purchased for current period; buy 1/2 of available tokens; period 0", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("250"));
      await tx2.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("500"));
      expect(bonus).to.equal(parseEther("50"));
    });

    it("all purchased for current period; period 0", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("1200"));
      await tx2.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("500"));
      expect(bonus).to.equal(0);
    });

    it("none purchased previous period; none purchased current period; buy 1/2 of available tokens", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime - 86500);
      await tx.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("500"));
      expect(bonus).to.equal(parseEther("75"));
    });

    it("none purchased previous period; none purchased current period; buy all available tokens", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime - 86500);
      await tx.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("1200"));
      expect(bonus).to.equal(parseEther("100"));
    });

    it("none purchased previous period; 1/2 purchased current period; buy 1/2 of available tokens", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime - 86500);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(1, parseEther("500"));
      await tx2.wait();

      let tx3 = await liquidityBond.setTotalStakedAmount(parseEther("500"));
      await tx3.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("250"));
      expect(bonus).to.equal(parseEther("18.75"));
    });

    it("none purchased previous period; 1/2 purchased current period; buy all available tokens", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime - 86500);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(1, parseEther("500"));
      await tx2.wait();

      let tx3 = await liquidityBond.setTotalStakedAmount(parseEther("500"));
      await tx3.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("700"));
      expect(bonus).to.equal(parseEther("25"));
    });

    it("< min average purchased previous period; none purchased current period; buy 1/2 of available tokens", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime - 86500);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("500"));
      await tx2.wait();

      let tx3 = await liquidityBond.setTotalStakedAmount(parseEther("500"));
      await tx3.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("500"));
      expect(bonus).to.equal(parseEther("75"));
    });

    it("< min average purchased previous period; none purchased current period; buy all available tokens", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime - 86500);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("500"));
      await tx2.wait();

      let tx3 = await liquidityBond.setTotalStakedAmount(parseEther("500"));
      await tx3.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("1000"));
      expect(bonus).to.equal(parseEther("100"));
    });

    it("< min average purchased previous period; 1/2 purchased current period; buy 1/2 of available tokens", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime - 86500);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("500"));
      await tx2.wait();

      let tx3 = await liquidityBond.setStakedAmount(1, parseEther("500"));
      await tx3.wait();

      let tx4 = await liquidityBond.setTotalStakedAmount(parseEther("1000"));
      await tx4.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("250"));
      expect(bonus).to.equal(parseEther("18.75"));
    });

    it("< min average purchased previous period; 1/2 purchased current period; buy all available tokens", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime - 86500);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("500"));
      await tx2.wait();

      let tx3 = await liquidityBond.setStakedAmount(1, parseEther("500"));
      await tx3.wait();

      let tx4 = await liquidityBond.setTotalStakedAmount(parseEther("1000"));
      await tx4.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("1000"));
      expect(bonus).to.equal(parseEther("25"));
    });

    it("< min average purchased previous period; all purchased current period", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime - 86500);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("500"));
      await tx2.wait();

      let tx3 = await liquidityBond.setStakedAmount(1, parseEther("1200"));
      await tx3.wait();

      let tx4 = await liquidityBond.setTotalStakedAmount(parseEther("1700"));
      await tx4.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("1000"));
      expect(bonus).to.equal(0);
    });

    it("> min average purchased previous period; none purchased current period; buy 1/2 of available tokens", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime - 86500);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("2000"));
      await tx2.wait();

      let tx3 = await liquidityBond.setTotalStakedAmount(parseEther("2000"));
      await tx3.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("1100"));
      expect(bonus).to.equal(parseEther("165"));
    });

    it("> min average purchased previous period; none purchased current period; buy all available tokens", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime - 86500);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("2000"));
      await tx2.wait();

      let tx3 = await liquidityBond.setTotalStakedAmount(parseEther("2000"));
      await tx3.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("3000"));
      expect(bonus).to.equal(parseEther("220"));
    });

    it("> min average purchased previous period; 1/2 purchased current period; buy 1/2 available tokens", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime - 86500);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("2000"));
      await tx2.wait();

      let tx3 = await liquidityBond.setStakedAmount(1, parseEther("1100"));
      await tx3.wait();

      let tx4 = await liquidityBond.setTotalStakedAmount(parseEther("3100"));
      await tx4.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("550"));
      expect(bonus).to.equal(parseEther("41.25"));
    });

    it("> min average purchased previous period; 1/2 purchased current period; buy all available tokens", async () => {
      let currentTime = await pairData.getCurrentTime();

      let tx = await liquidityBond.setStartTime(currentTime - 86500);
      await tx.wait();

      let tx2 = await liquidityBond.setStakedAmount(0, parseEther("2000"));
      await tx2.wait();

      let tx3 = await liquidityBond.setStakedAmount(1, parseEther("1100"));
      await tx3.wait();

      let tx4 = await liquidityBond.setTotalStakedAmount(parseEther("3100"));
      await tx4.wait();

      let bonus = await liquidityBond.calculateBonusAmount(parseEther("2000"));
      expect(bonus).to.equal(parseEther("55"));
    });
  });
  
  describe("#addLiquidity", () => { 
    it("low slippage", async () => {
      let tx = await mockCELO.transfer(liquidityBondAddress, parseEther("10"));
      await tx.wait();

      let tx2 = await liquidityBond.addLiquidity(parseEther("10"));
      await tx2.wait();

      let balanceTGEN = await tradegenToken.balanceOf(pairDataAddress);
      expect(balanceTGEN).to.equal("9826636109541201"); // 0.98 TGEN

      let pair = await ubeswapFactory.getPair(tradegenTokenAddress, mockCELOAddress);

      let reserves = await pairData.getReserves(pair);
      expect(reserves[0]).to.equal("1009999999999999999999"); // 1009.99 TGEN
      expect(reserves[1]).to.equal("999990173363890458799"); // 999.9901 TGEN 
    });

    it("moderate slippage", async () => {
      let tx = await mockCELO.transfer(liquidityBondAddress, parseEther("200"));
      await tx.wait();

      let tx2 = await liquidityBond.addLiquidity(parseEther("200"));
      await tx2.wait();

      let balanceTGEN = await tradegenToken.balanceOf(pairDataAddress);
      expect(balanceTGEN).to.equal("7993915696016268900"); // 79.9391 TGEN

      let pair = await ubeswapFactory.getPair(tradegenTokenAddress, mockCELOAddress);

      let reserves = await pairData.getReserves(pair);
      expect(reserves[0]).to.equal("1199999999999999999999"); // 1199.99 TGEN
      expect(reserves[1]).to.equal("992006084303983731100"); // 992.006 TGEN 
    });

    it("high slippage", async () => {
      let tx = await mockCELO.transfer(liquidityBondAddress, parseEther("3000"));
      await tx.wait();

      let tx2 = await liquidityBond.addLiquidity(parseEther("3000"));
      await tx2.wait();

      let balanceTGEN = await tradegenToken.balanceOf(pairDataAddress);
      expect(balanceTGEN).to.equal("358845922660789420957"); // 358.8459 TGEN

      let pair = await ubeswapFactory.getPair(tradegenTokenAddress, mockCELOAddress);

      let reserves = await pairData.getReserves(pair);
      expect(reserves[0]).to.equal("3999999999999999999998"); // 3999.99 TGEN
      expect(reserves[1]).to.equal("641154077339210579043"); // 641.154 TGEN 
    });
  });

  describe("#purchase", () => { 
    it("release escrow not set", async () => {
      let tx = liquidityBond.purchase(parseEther("1"));
      await expect(tx).to.be.reverted;

      let totalSupply = await liquidityBond.totalSupply();
      expect(totalSupply).to.equal(0);
    });

    it("rewards have not started", async () => {
      let currentTime = await pairData.getCurrentTime();

      releaseSchedule = await ReleaseScheduleFactory.deploy(parseEther("1000"), currentTime);
      await releaseSchedule.deployed();
      releaseScheduleAddress = releaseSchedule.address;

      releaseEscrow = await ReleaseEscrowFactory.deploy(liquidityBondAddress, tradegenTokenAddress, releaseScheduleAddress);
      await releaseEscrow.deployed();
      releaseEscrowAddress = releaseEscrow.address;

      let tx = await liquidityBond.setReleaseEscrow(releaseEscrowAddress);
      await tx.wait();

      let tx2 = liquidityBond.purchase(parseEther("1"));
      await expect(tx2).to.be.reverted;

      let totalSupply = await liquidityBond.totalSupply();
      expect(totalSupply).to.equal(0);
    });

    it("no bonus, same price", async () => {
      let currentTime = await pairData.getCurrentTime();

      releaseSchedule = await ReleaseScheduleFactory.deploy(parseEther("1000"), currentTime);
      await releaseSchedule.deployed();
      releaseScheduleAddress = releaseSchedule.address;

      releaseEscrow = await ReleaseEscrowFactory.deploy(liquidityBondAddress, tradegenTokenAddress, releaseScheduleAddress);
      await releaseEscrow.deployed();
      releaseEscrowAddress = releaseEscrow.address;

      let tx = await liquidityBond.setReleaseEscrow(releaseEscrowAddress);
      await tx.wait();

      let tx2 = await liquidityBond.setTotalStakedAmount(parseEther("1000"));
      await tx2.wait();

      let tx3 = await liquidityBond.setStakedAmount(0, parseEther("1000"));
      await tx3.wait();

      let tx4 = await mockCELO.approve(liquidityBondAddress, parseEther("100"));
      await tx4.wait();

      let tx5 = await liquidityBond.purchase(parseEther("100"));
      let temp = await tx5.wait();
      let event = temp.events[30].args;
      expect(event.user).to.equal(deployer.address);
      expect(event.amountDeposited).to.equal(parseEther("100"));
      expect(event.numberOfBondTokensReceived).to.equal(parseEther("500"));
      expect(event.bonus).to.equal(0);

      let totalSupply = await liquidityBond.totalSupply();
      expect(totalSupply).to.equal(parseEther("500"));

      let balanceOf = await liquidityBond.balanceOf(deployer.address);
      expect(balanceOf).to.equal(parseEther("500"));

      let bondTokenPrice = await liquidityBond.bondTokenPrice();
      expect(bondTokenPrice).to.equal(parseEther("1"));
    });

    it("no bonus, different price", async () => {
      let currentTime = await pairData.getCurrentTime();

      releaseSchedule = await ReleaseScheduleFactory.deploy(parseEther("1000"), currentTime);
      await releaseSchedule.deployed();
      releaseScheduleAddress = releaseSchedule.address;

      releaseEscrow = await ReleaseEscrowFactory.deploy(liquidityBondAddress, tradegenTokenAddress, releaseScheduleAddress);
      await releaseEscrow.deployed();
      releaseEscrowAddress = releaseEscrow.address;

      let tx = await liquidityBond.setReleaseEscrow(releaseEscrowAddress);
      await tx.wait();

      let tx2 = await liquidityBond.setTotalStakedAmount(parseEther("1700"));
      await tx2.wait();

      let tx3 = await liquidityBond.setStakedAmount(0, parseEther("1700"));
      await tx3.wait();

      let tx4 = await mockCELO.approve(liquidityBondAddress, parseEther("500"));
      await tx4.wait();

      let tx5 = await liquidityBond.purchase(parseEther("500"));
      let temp = await tx5.wait();
      let event = temp.events[30].args;
      expect(event.user).to.equal(deployer.address);
      expect(event.amountDeposited).to.equal(parseEther("500"));
      expect(event.numberOfBondTokensReceived).to.equal(parseEther("2500"));
      expect(event.bonus).to.equal(0);

      let totalSupply = await liquidityBond.totalSupply();
      expect(totalSupply).to.equal(parseEther("2500"));

      let balanceOf = await liquidityBond.balanceOf(deployer.address);
      expect(balanceOf).to.equal(parseEther("2500"));

      let bondTokenPrice = await liquidityBond.bondTokenPrice();
      expect(bondTokenPrice).to.equal(parseEther("1.0201"));
    });

    it("bonus, same price", async () => {
      let currentTime = await pairData.getCurrentTime();

      releaseSchedule = await ReleaseScheduleFactory.deploy(parseEther("1000"), currentTime);
      await releaseSchedule.deployed();
      releaseScheduleAddress = releaseSchedule.address;

      releaseEscrow = await ReleaseEscrowFactory.deploy(liquidityBondAddress, tradegenTokenAddress, releaseScheduleAddress);
      await releaseEscrow.deployed();
      releaseEscrowAddress = releaseEscrow.address;

      let tx = await liquidityBond.setReleaseEscrow(releaseEscrowAddress);
      await tx.wait();

      let tx2 = await liquidityBond.setTotalStakedAmount(parseEther("0"));
      await tx2.wait();

      let tx3 = await liquidityBond.setStakedAmount(0, parseEther("0"));
      await tx3.wait();

      let tx4 = await mockCELO.approve(liquidityBondAddress, parseEther("100"));
      await tx4.wait();

      let tx5 = await liquidityBond.purchase(parseEther("100"));
      let temp = await tx5.wait();
      let event = temp.events[30].args;
      expect(event.user).to.equal(deployer.address);
      expect(event.amountDeposited).to.equal(parseEther("100"));
      expect(event.numberOfBondTokensReceived).to.equal(parseEther("595"));
      expect(event.bonus).to.equal(parseEther("19"));

      let totalSupply = await liquidityBond.totalSupply();
      expect(totalSupply).to.equal(parseEther("595"));

      let balanceOf = await liquidityBond.balanceOf(deployer.address);
      expect(balanceOf).to.equal(parseEther("595"));

      let bondTokenPrice = await liquidityBond.bondTokenPrice();
      expect(bondTokenPrice).to.equal(parseEther("1"));
    });

    it("bonus, different price", async () => {
      let currentTime = await pairData.getCurrentTime();

      releaseSchedule = await ReleaseScheduleFactory.deploy(parseEther("1000"), currentTime);
      await releaseSchedule.deployed();
      releaseScheduleAddress = releaseSchedule.address;

      releaseEscrow = await ReleaseEscrowFactory.deploy(liquidityBondAddress, tradegenTokenAddress, releaseScheduleAddress);
      await releaseEscrow.deployed();
      releaseEscrowAddress = releaseEscrow.address;

      let tx = await liquidityBond.setReleaseEscrow(releaseEscrowAddress);
      await tx.wait();

      let tx2 = await liquidityBond.setTotalStakedAmount(parseEther("900"));
      await tx2.wait();

      let tx3 = await liquidityBond.setStakedAmount(0, parseEther("900"));
      await tx3.wait();

      let tx4 = await mockCELO.approve(liquidityBondAddress, parseEther("1000"));
      await tx4.wait();

      let tx5 = await liquidityBond.purchase(parseEther("1000"));
      let temp = await tx5.wait();
      let event = temp.events[30].args;
      expect(event.user).to.equal(deployer.address);
      expect(event.amountDeposited).to.equal(parseEther("1000"));
      expect(event.numberOfBondTokensReceived).to.equal(parseEther("5005"));
      expect(event.bonus).to.equal(parseEther("1"));

      let totalSupply = await liquidityBond.totalSupply();
      expect(totalSupply).to.equal(parseEther("5005"));

      let balanceOf = await liquidityBond.balanceOf(deployer.address);
      expect(balanceOf).to.equal(parseEther("5005"));

      let bondTokenPrice = await liquidityBond.bondTokenPrice();
      expect(bondTokenPrice).to.equal("1051010050100000000");

      let stakedAmount = await liquidityBond.stakedAmounts(0);
      expect(stakedAmount).to.equal(parseEther("1900"));

      let totalStakedAmount = await liquidityBond.totalStakedAmount();
      expect(totalStakedAmount).to.equal(parseEther("1900"));
    });
  });*/

  describe("#getReward", () => {/*
    it("release escrow not set", async () => {
      let initialBalance = await tradegenToken.balanceOf(pairDataAddress);

      let tx = liquidityBond.getReward();
      await expect(tx).to.be.reverted;

      let newBalance = await tradegenToken.balanceOf(pairDataAddress);
      expect(newBalance).to.equal(initialBalance);

      let totalAvailableRewards = await liquidityBond.totalAvailableRewards();
      expect(totalAvailableRewards).to.equal(0);
    });

    it("rewards have not started", async () => {
      let currentTime = await pairData.getCurrentTime();
      let initialBalance = await tradegenToken.balanceOf(pairDataAddress);

      releaseSchedule = await ReleaseScheduleFactory.deploy(parseEther("1000"), currentTime);
      await releaseSchedule.deployed();
      releaseScheduleAddress = releaseSchedule.address;

      releaseEscrow = await ReleaseEscrowFactory.deploy(liquidityBondAddress, tradegenTokenAddress, releaseScheduleAddress);
      await releaseEscrow.deployed();
      releaseEscrowAddress = releaseEscrow.address;

      let tx = await liquidityBond.setReleaseEscrow(releaseEscrowAddress);
      await tx.wait();

      let tx2 = liquidityBond.getReward();
      await expect(tx2).to.be.reverted;

      let newBalance = await tradegenToken.balanceOf(pairDataAddress);
      expect(newBalance).to.equal(initialBalance);

      let totalAvailableRewards = await liquidityBond.totalAvailableRewards();
      expect(totalAvailableRewards).to.equal(0);
    });

    it("total supply is 0", async () => {
      let currentTime = await pairData.getCurrentTime();
      let initialBalance = await tradegenToken.balanceOf(pairDataAddress);

      releaseSchedule = await ReleaseScheduleFactory.deploy(CYCLE_DURATION * 4, currentTime - 1000);
      await releaseSchedule.deployed();
      releaseScheduleAddress = releaseSchedule.address;

      releaseEscrow = await ReleaseEscrowFactory.deploy(liquidityBondAddress, tradegenTokenAddress, releaseScheduleAddress);
      await releaseEscrow.deployed();
      releaseEscrowAddress = releaseEscrow.address;

      let tx = await tradegenToken.transfer(releaseEscrowAddress, CYCLE_DURATION * 4);
      await tx.wait();

      let tx2 = await liquidityBond.setReleaseEscrow(releaseEscrowAddress);
      await tx2.wait();

      let tx3 = await liquidityBond.getReward();
      await tx3.wait();

      let newBalance = await tradegenToken.balanceOf(pairDataAddress);
      let expectedNewBalance = BigInt(initialBalance) + BigInt(4020);
      expect(newBalance.toString()).to.equal(expectedNewBalance.toString());

      let totalAvailableRewards = await liquidityBond.totalAvailableRewards();
      expect(totalAvailableRewards).to.equal(0);
    });

    it("no other investors, reward available", async () => {
      let currentTime = await pairData.getCurrentTime();
      let initialBalanceStaking = await tradegenToken.balanceOf(pairDataAddress);

      releaseSchedule = await ReleaseScheduleFactory.deploy(parseEther("1000"), currentTime - 1000);
      await releaseSchedule.deployed();
      releaseScheduleAddress = releaseSchedule.address;

      releaseEscrow = await ReleaseEscrowFactory.deploy(liquidityBondAddress, tradegenTokenAddress, releaseScheduleAddress);
      await releaseEscrow.deployed();
      releaseEscrowAddress = releaseEscrow.address;

      let tx = await tradegenToken.transfer(releaseEscrowAddress, parseEther("1000"));
      await tx.wait();

      let tx2 = await liquidityBond.setReleaseEscrow(releaseEscrowAddress);
      await tx2.wait();

      let initialBalanceDeployer = await tradegenToken.balanceOf(deployer.address);

      let tx3 = await liquidityBond.testMint(otherUser.address, parseEther("1000"));
      await tx3.wait();

      let tx4 = await liquidityBond.getReward();
      await tx4.wait();

      let newBalanceStaking = await tradegenToken.balanceOf(pairDataAddress);
      expect(newBalanceStaking).to.equal(initialBalanceStaking);

      let newBalanceDeployer = await tradegenToken.balanceOf(deployer.address);
      expect(newBalanceDeployer).to.equal(initialBalanceDeployer);

      let totalAvailableRewards = await liquidityBond.totalAvailableRewards();
      expect(totalAvailableRewards).to.equal("63975376475375878");

      let rewardPerTokenStored = await liquidityBond.rewardPerTokenStored();
      expect(rewardPerTokenStored).to.equal("63975376475375");

      let rewardPerTokenPaid = await liquidityBond.userRewardPerTokenPaid(deployer.address);
      expect(rewardPerTokenPaid).to.equal("63975376475375");

      let rewardsDeployer = await liquidityBond.rewards(deployer.address);
      expect(rewardsDeployer).to.equal(0);

      let rewardsOther = await liquidityBond.rewards(otherUser.address);
      expect(rewardsOther).to.equal(0);

      let earnedDeployer = await liquidityBond.earned(deployer.address);
      expect(earnedDeployer).to.equal(0);

      let earnedOther = await liquidityBond.earned(otherUser.address);
      expect(earnedOther).to.equal("63975376475375000");
    });

    it("other investors, reward available", async () => {
      let currentTime = await pairData.getCurrentTime();
      let initialBalanceStaking = await tradegenToken.balanceOf(pairDataAddress);

      releaseSchedule = await ReleaseScheduleFactory.deploy(parseEther("1000"), currentTime - 1000);
      await releaseSchedule.deployed();
      releaseScheduleAddress = releaseSchedule.address;

      releaseEscrow = await ReleaseEscrowFactory.deploy(liquidityBondAddress, tradegenTokenAddress, releaseScheduleAddress);
      await releaseEscrow.deployed();
      releaseEscrowAddress = releaseEscrow.address;

      let tx = await tradegenToken.transfer(releaseEscrowAddress, parseEther("1000"));
      await tx.wait();

      let tx2 = await liquidityBond.setReleaseEscrow(releaseEscrowAddress);
      await tx2.wait();

      let initialBalanceDeployer = await tradegenToken.balanceOf(deployer.address);
      let initialBalanceOther = await tradegenToken.balanceOf(otherUser.address);

      let tx3 = await liquidityBond.testMint(otherUser.address, parseEther("1000"));
      await tx3.wait();

      let tx4 = await liquidityBond.testMint(deployer.address, parseEther("1000"));
      await tx4.wait();

      let earnedDeployerInitial = await liquidityBond.earned(deployer.address);
      expect(earnedDeployerInitial).to.equal(0);

      let tx5 = await liquidityBond.getReward();
      await tx5.wait();

      let earnedDeployerNew = await liquidityBond.earned(deployer.address);
      expect(earnedDeployerNew).to.equal(0);

      let newBalanceStaking = await tradegenToken.balanceOf(pairDataAddress);
      expect(newBalanceStaking).to.equal(initialBalanceStaking);

      let newBalanceDeployer = await tradegenToken.balanceOf(deployer.address);
      let expectedNewBalanceDeployer = BigInt(initialBalanceDeployer) + BigInt("32019485144484000");
      expect(newBalanceDeployer.toString()).to.equal(expectedNewBalanceDeployer.toString());

      let totalAvailableRewards = await liquidityBond.totalAvailableRewards();
      expect(totalAvailableRewards).to.equal("64038970288969691");

      let rewardPerTokenStored = await liquidityBond.rewardPerTokenStored();
      expect(rewardPerTokenStored).to.equal("32019485144484");

      let rewardPerTokenPaidDeployer = await liquidityBond.userRewardPerTokenPaid(deployer.address);
      expect(rewardPerTokenPaidDeployer).to.equal("32019485144484");

      let rewardsDeployer = await liquidityBond.rewards(deployer.address);
      expect(rewardsDeployer).to.equal(0);

      let rewardsOther = await liquidityBond.rewards(otherUser.address);
      expect(rewardsOther).to.equal(0);

      let earnedOtherInitial = await liquidityBond.earned(otherUser.address);
      expect(earnedOtherInitial).to.equal("32019485144484000");

      let tx6 = await liquidityBond.connect(otherUser).getReward();
      await tx6.wait();

      let earnedOtherNew = await liquidityBond.earned(otherUser.address);
      expect(earnedOtherNew).to.equal(0);

      let rewardPerTokenPaidOther = await liquidityBond.userRewardPerTokenPaid(otherUser.address);
      expect(rewardPerTokenPaidOther).to.equal("32051282051280");

      let newBalanceOther = await tradegenToken.balanceOf(otherUser.address);
      let expectedNewBalanceOther = BigInt(initialBalanceOther) + BigInt("32051282051280000");
      expect(newBalanceOther.toString()).to.equal(expectedNewBalanceOther.toString());
    });*/

    it("no other investors, reward available, purchase again without getting reward", async () => {
      let currentTime = await pairData.getCurrentTime();
      let initialBalanceStaking = await tradegenToken.balanceOf(pairDataAddress);

      releaseSchedule = await ReleaseScheduleFactory.deploy(parseEther("1000"), currentTime - 1000);
      await releaseSchedule.deployed();
      releaseScheduleAddress = releaseSchedule.address;

      releaseEscrow = await ReleaseEscrowFactory.deploy(liquidityBondAddress, tradegenTokenAddress, releaseScheduleAddress);
      await releaseEscrow.deployed();
      releaseEscrowAddress = releaseEscrow.address;

      let tx = await tradegenToken.transfer(releaseEscrowAddress, parseEther("1000"));
      await tx.wait();

      let tx2 = await liquidityBond.setReleaseEscrow(releaseEscrowAddress);
      await tx2.wait();

      let initialBalanceDeployer = await tradegenToken.balanceOf(deployer.address);

      let tx3 = await liquidityBond.testMint(deployer.address, parseEther("1000"));
      await tx3.wait();

      let tx4 = await mockCELO.approve(liquidityBondAddress, parseEther("1000"));
      await tx4.wait();

      let tx5 = await liquidityBond.purchase(parseEther("1000"));
      await tx5.wait();

      let newBalanceStaking = await tradegenToken.balanceOf(pairDataAddress);
      let expectedNewBalanceStaking = BigInt(initialBalanceStaking) + BigInt("110221332443554665776"); // Excess TGEN when adding liquidity
      expect(newBalanceStaking.toString()).to.equal(expectedNewBalanceStaking.toString());

      let newBalanceDeployer = await tradegenToken.balanceOf(deployer.address);
      let expectedNewBalanceDeployer = BigInt(initialBalanceDeployer) + BigInt("64038970288969000");
      expect(newBalanceDeployer.toString()).to.equal(expectedNewBalanceDeployer.toString());

      let totalAvailableRewards = await liquidityBond.totalAvailableRewards();
      expect(totalAvailableRewards).to.equal("64038970288969691");

      let rewardPerTokenStored = await liquidityBond.rewardPerTokenStored();
      expect(rewardPerTokenStored).to.equal("64038970288969");

      let rewardPerTokenPaid = await liquidityBond.userRewardPerTokenPaid(deployer.address);
      expect(rewardPerTokenPaid).to.equal("64038970288969");

      let rewardsDeployer = await liquidityBond.rewards(deployer.address);
      expect(rewardsDeployer).to.equal(0);

      let rewardsOther = await liquidityBond.rewards(otherUser.address);
      expect(rewardsOther).to.equal(0);

      let earnedDeployer = await liquidityBond.earned(deployer.address);
      expect(earnedDeployer).to.equal(0);
    });
  });
  /*
  describe("#beforeTokenTransfer", () => {
    it("recipient has no tokens", async () => {
      let currentTime = await pairData.getCurrentTime();
      let initialBalanceStaking = await tradegenToken.balanceOf(pairDataAddress);
      let initialBalanceOther = await tradegenToken.balanceOf(otherUser.address);

      releaseSchedule = await ReleaseScheduleFactory.deploy(parseEther("1000"), currentTime - 1000);
      await releaseSchedule.deployed();
      releaseScheduleAddress = releaseSchedule.address;

      releaseEscrow = await ReleaseEscrowFactory.deploy(liquidityBondAddress, tradegenTokenAddress, releaseScheduleAddress);
      await releaseEscrow.deployed();
      releaseEscrowAddress = releaseEscrow.address;

      let tx = await tradegenToken.transfer(releaseEscrowAddress, parseEther("1000"));
      await tx.wait();

      let tx2 = await liquidityBond.setReleaseEscrow(releaseEscrowAddress);
      await tx2.wait();

      let initialBalanceDeployer = await tradegenToken.balanceOf(deployer.address);

      let tx3 = await liquidityBond.testMint(deployer.address, parseEther("1000"));
      await tx3.wait();

      let tx4 = await liquidityBond.transfer(otherUser.address, parseEther("500"));
      await tx4.wait();

      let newBalanceStaking = await tradegenToken.balanceOf(pairDataAddress);
      expect(newBalanceStaking).to.equal(initialBalanceStaking);

      let newBalanceDeployer = await tradegenToken.balanceOf(deployer.address);
      let expectedNewBalanceDeployer = BigInt(initialBalanceDeployer) + BigInt("63975376475375000");
      expect(newBalanceDeployer.toString()).to.equal(expectedNewBalanceDeployer.toString());

      let newBalanceOther = await tradegenToken.balanceOf(otherUser.address);
      expect(newBalanceOther).to.equal(initialBalanceOther);

      let rewardPerTokenPaidDeployer = await liquidityBond.userRewardPerTokenPaid(deployer.address);
      expect(rewardPerTokenPaidDeployer).to.equal("63975376475375");

      let rewardPerTokenPaidOther = await liquidityBond.userRewardPerTokenPaid(otherUser.address);
      expect(rewardPerTokenPaidOther).to.equal("63975376475375");

      let rewardsDeployer = await liquidityBond.rewards(deployer.address);
      expect(rewardsDeployer).to.equal(0);

      let rewardsOther = await liquidityBond.rewards(otherUser.address);
      expect(rewardsOther).to.equal(0);

      let earnedDeployer = await liquidityBond.earned(deployer.address);
      expect(earnedDeployer).to.equal(0);

      let earnedOther = await liquidityBond.earned(otherUser.address);
      expect(earnedOther).to.equal(0);

      let bondTokenBalanceDeployer = await liquidityBond.balanceOf(deployer.address);
      expect(bondTokenBalanceDeployer).to.equal(parseEther("500"));

      let bondTokenBalanceOther = await liquidityBond.balanceOf(otherUser.address);
      expect(bondTokenBalanceOther).to.equal(parseEther("500"));
    });

    it("recipient has tokens", async () => {
      let currentTime = await pairData.getCurrentTime();
      let initialBalanceStaking = await tradegenToken.balanceOf(pairDataAddress);
      let initialBalanceOther = await tradegenToken.balanceOf(otherUser.address);

      releaseSchedule = await ReleaseScheduleFactory.deploy(parseEther("1000"), currentTime - 1000);
      await releaseSchedule.deployed();
      releaseScheduleAddress = releaseSchedule.address;

      releaseEscrow = await ReleaseEscrowFactory.deploy(liquidityBondAddress, tradegenTokenAddress, releaseScheduleAddress);
      await releaseEscrow.deployed();
      releaseEscrowAddress = releaseEscrow.address;

      let tx = await tradegenToken.transfer(releaseEscrowAddress, parseEther("1000"));
      await tx.wait();

      let tx2 = await liquidityBond.setReleaseEscrow(releaseEscrowAddress);
      await tx2.wait();

      let initialBalanceDeployer = await tradegenToken.balanceOf(deployer.address);

      let tx3 = await liquidityBond.testMint(deployer.address, parseEther("1000"));
      await tx3.wait();

      let tx4 = await liquidityBond.testMint(otherUser.address, parseEther("1000"));
      await tx4.wait();

      let tx5 = await liquidityBond.transfer(otherUser.address, parseEther("500"));
      await tx5.wait();

      let newBalanceStaking = await tradegenToken.balanceOf(pairDataAddress);
      expect(newBalanceStaking).to.equal(initialBalanceStaking);

      let newBalanceDeployer = await tradegenToken.balanceOf(deployer.address);
      let expectedNewBalanceDeployer = BigInt(initialBalanceDeployer) + BigInt("32019485144484000");
      expect(newBalanceDeployer.toString()).to.equal(expectedNewBalanceDeployer.toString());

      let newBalanceOther = await tradegenToken.balanceOf(otherUser.address);
      expect(newBalanceOther).to.equal(initialBalanceOther);

      let rewardPerTokenPaidDeployer = await liquidityBond.userRewardPerTokenPaid(deployer.address);
      expect(rewardPerTokenPaidDeployer).to.equal("32019485144484");

      let rewardPerTokenPaidOther = await liquidityBond.userRewardPerTokenPaid(otherUser.address);
      expect(rewardPerTokenPaidOther).to.equal("32019485144484");

      let rewardsDeployer = await liquidityBond.rewards(deployer.address);
      expect(rewardsDeployer).to.equal(0);

      let rewardsOther = await liquidityBond.rewards(otherUser.address);
      expect(rewardsOther).to.equal("32019485144484000");

      let earnedDeployer = await liquidityBond.earned(deployer.address);
      expect(earnedDeployer).to.equal(0);

      let earnedOther = await liquidityBond.earned(otherUser.address);
      expect(earnedOther).to.equal("32019485144484000");

      let bondTokenBalanceDeployer = await liquidityBond.balanceOf(deployer.address);
      expect(bondTokenBalanceDeployer).to.equal(parseEther("500"));

      let bondTokenBalanceOther = await liquidityBond.balanceOf(otherUser.address);
      expect(bondTokenBalanceOther).to.equal(parseEther("1500"));
    });
  });*/
});