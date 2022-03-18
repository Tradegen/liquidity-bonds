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
    ExecutionPriceFactory = await ethers.getContractFactory('TestExecutionPrice');

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
  /*
  describe("#updateTradingFee", () => {
    it("not owner", async () => {
        let tx = executionPrice.connect(otherUser).updateTradingFee(100)
        await expect(tx).to.be.reverted;

        let fee = await executionPrice.tradingFee();
        expect(fee).to.equal(50);
    });

    it("not initialized", async () => {
        let tx = await executionPrice.setOwner(deployer.address)
        await tx.wait();

        let tx2 = executionPrice.updateTradingFee(100)
        await expect(tx2).to.be.reverted;

        let fee = await executionPrice.tradingFee();
        expect(fee).to.equal(50);
    });

    it("> max trading fee", async () => {
        let tx = await executionPrice.setIsInitialized(true);
        await tx.wait();

        let tx2 = await executionPrice.setOwner(deployer.address)
        await tx2.wait();

        let tx3 = executionPrice.updateTradingFee(2000)
        await expect(tx3).to.be.reverted;

        let fee = await executionPrice.tradingFee();
        expect(fee).to.equal(50);
    });

    it("meets requirements", async () => {
        let tx = await executionPrice.setIsInitialized(true);
        await tx.wait();

        let tx2 = await executionPrice.setOwner(deployer.address)
        await tx2.wait();

        let tx3 = await executionPrice.updateTradingFee(100)
        await tx3.wait();

        let fee = await executionPrice.tradingFee();
        expect(fee).to.equal(100);
    });
  });

  describe("#updateMinimumOrderSize", () => {
    it("not owner", async () => {
        let tx = await executionPrice.setPrice(parseEther("1"));
        await tx.wait();

        let tx2 = executionPrice.connect(otherUser).updateMinimumOrderSize(parseEther("2"));
        await expect(tx2).to.be.reverted;

        let size = await executionPrice.minimumOrderSize();
        expect(size).to.equal(parseEther("0.01"));
    });

    it("not initialized", async () => {
        let tx = await executionPrice.setPrice(parseEther("1"));
        await tx.wait();

        let tx2 = executionPrice.updateMinimumOrderSize(parseEther("2"));
        await expect(tx2).to.be.reverted;

        let size = await executionPrice.minimumOrderSize();
        expect(size).to.equal(parseEther("0.01"));
    });

    it("< min order value", async () => {
        let tx = await executionPrice.setIsInitialized(true);
        await tx.wait();

        let tx2 = await executionPrice.setOwner(deployer.address)
        await tx2.wait();

        let tx3 = await executionPrice.setPrice(parseEther("1"));
        await tx3.wait();

        let tx4 = executionPrice.updateMinimumOrderSize(parseEther("0.05"));
        await expect(tx4).to.be.reverted;

        let size = await executionPrice.minimumOrderSize();
        expect(size).to.equal(parseEther("0.01"));
    });

    it("> max order value", async () => {
        let tx = await executionPrice.setIsInitialized(true);
        await tx.wait();

        let tx2 = await executionPrice.setOwner(deployer.address)
        await tx2.wait();

        let tx3 = await executionPrice.setPrice(parseEther("1"));
        await tx3.wait();

        let tx4 = executionPrice.updateMinimumOrderSize(parseEther("1500"));
        await expect(tx4).to.be.reverted;

        let size = await executionPrice.minimumOrderSize();
        expect(size).to.equal(parseEther("0.01"));
    });

    it("meets requirements", async () => {
        let tx = await executionPrice.setIsInitialized(true);
        await tx.wait();

        let tx2 = await executionPrice.setOwner(deployer.address)
        await tx2.wait();

        let tx3 = await executionPrice.setPrice(parseEther("1"));
        await tx3.wait();

        let tx4 = await executionPrice.updateMinimumOrderSize(parseEther("10"));
        await tx4.wait();

        let size = await executionPrice.minimumOrderSize();
        expect(size).to.equal(parseEther("10"));
    });
  });

  describe("#updateContractOwner", () => {
    beforeEach(async () => {
        let tx = await executionPrice.setOwner(deployer.address)
        await tx.wait();
    });

    it("not PriceManager", async () => {
        let tx = executionPrice.connect(otherUser).updateContractOwner(pairDataAddress);
        await expect(tx).to.be.reverted;

        let owner = await executionPrice.owner();
        expect(owner).to.equal(deployer.address);
    });

    it("not initialized", async () => {
        let tx = executionPrice.updateContractOwner(pairDataAddress);
        await expect(tx).to.be.reverted;

        let owner = await executionPrice.owner();
        expect(owner).to.equal(deployer.address);
    });

    it("owner is the same", async () => {
        let tx = await executionPrice.setIsInitialized(true);
        await tx.wait();

        let tx2 = executionPrice.updateContractOwner(deployer.address);
        await expect(tx2).to.be.reverted;

        let owner = await executionPrice.owner();
        expect(owner).to.equal(deployer.address);
    });

    it("meets requirements", async () => {
        let tx = await executionPrice.setIsInitialized(true);
        await tx.wait();

        let tx2 = await executionPrice.updateContractOwner(pairDataAddress);
        await tx2.wait();

        let owner = await executionPrice.owner();
        expect(owner).to.equal(pairDataAddress);
    });
  });*/

  describe("#append", () => {/*
    it("no existing orders", async () => {
        let tx = await executionPrice.append(deployer.address, parseEther("1"));
        await tx.wait();

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("1"));

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndex = await executionPrice.orderIndex(deployer.address);
        expect(orderIndex).to.equal(1);

        let order1 = await executionPrice.orderBook(0);
        expect(order1.quantity).to.equal(0);
        expect(order1.amountFilled).to.equal(0);

        let order2 = await executionPrice.orderBook(1);
        expect(order2.user).to.equal(deployer.address);
        expect(order2.quantity).to.equal(parseEther("1"));
        expect(order2.amountFilled).to.equal(0);
    });

    it("multiple orders from same user", async () => {
        let tx = await executionPrice.append(deployer.address, parseEther("1"));
        await tx.wait();

        let tx2 = await executionPrice.append(deployer.address, parseEther("2"));
        await tx2.wait();

        let tx3 = await executionPrice.append(deployer.address, parseEther("3"));
        await tx3.wait();

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("6"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(4);

        let orderIndex = await executionPrice.orderIndex(deployer.address);
        expect(orderIndex).to.equal(3);

        let order1 = await executionPrice.orderBook(0);
        expect(order1.quantity).to.equal(0);
        expect(order1.amountFilled).to.equal(0);

        let order2 = await executionPrice.orderBook(1);
        expect(order2.user).to.equal(deployer.address);
        expect(order2.quantity).to.equal(parseEther("1"));
        expect(order2.amountFilled).to.equal(0);

        let order3 = await executionPrice.orderBook(2);
        expect(order3.user).to.equal(deployer.address);
        expect(order3.quantity).to.equal(parseEther("2"));
        expect(order3.amountFilled).to.equal(0);

        let order4 = await executionPrice.orderBook(3);
        expect(order4.user).to.equal(deployer.address);
        expect(order4.quantity).to.equal(parseEther("3"));
        expect(order4.amountFilled).to.equal(0);
    });*/

    it("multiple orders from different users", async () => {
        let tx = await executionPrice.append(deployer.address, parseEther("1"));
        await tx.wait();

        let tx2 = await executionPrice.append(deployer.address, parseEther("2"));
        await tx2.wait();

        let tx3 = await executionPrice.append(otherUser.address, parseEther("3"));
        await tx3.wait();

        let tx4 = await executionPrice.append(deployer.address, parseEther("4"));
        await tx4.wait();

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("10"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(5);

        let orderIndexDeployer = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexDeployer).to.equal(4);

        let orderIndexOther = await executionPrice.orderIndex(otherUser.address);
        expect(orderIndexOther).to.equal(3);

        let order1 = await executionPrice.orderBook(0);
        expect(order1.quantity).to.equal(0);
        expect(order1.amountFilled).to.equal(0);

        let order2 = await executionPrice.orderBook(1);
        expect(order2.user).to.equal(deployer.address);
        expect(order2.quantity).to.equal(parseEther("1"));
        expect(order2.amountFilled).to.equal(0);

        let order3 = await executionPrice.orderBook(2);
        expect(order3.user).to.equal(deployer.address);
        expect(order3.quantity).to.equal(parseEther("2"));
        expect(order3.amountFilled).to.equal(0);

        let order4 = await executionPrice.orderBook(3);
        expect(order4.user).to.equal(otherUser.address);
        expect(order4.quantity).to.equal(parseEther("3"));
        expect(order4.amountFilled).to.equal(0);

        let order5 = await executionPrice.orderBook(4);
        expect(order5.user).to.equal(deployer.address);
        expect(order5.quantity).to.equal(parseEther("4"));
        expect(order5.amountFilled).to.equal(0);
    });
  });
});