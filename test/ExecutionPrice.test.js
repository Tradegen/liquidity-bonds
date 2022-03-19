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
  });

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    otherUser = signers[1];

    let pair = await ubeswapFactory.getPair(tradegenTokenAddress, mockCELOAddress);

    liquidityBond = await LiquidityBondFactory.deploy(tradegenTokenAddress, mockCELOAddress, pair, priceCalculatorAddress, routerAddress, ubeswapRouterAddress, pairDataAddress);
    await liquidityBond.deployed();
    liquidityBondAddress = liquidityBond.address;

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
  });

  describe("#append", () => {
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
    });

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

  describe("#executeOrder", () => {
    beforeEach(async () => {
        let currentTime = await pairData.getCurrentTime();
        
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

        let tx3 = await executionPrice.setOwner(deployer.address);
        await tx3.wait();

        let tx4 = await executionPrice.setPrice(parseEther("1"));
        await tx4.wait();
    });
    
    it("empty queue", async () => {
        let tx = await executionPrice.executeOrder(parseEther("1"));
        await tx.wait();

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(0);

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(0);

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);
    });

    it("more tokens in queue than order size; buy queue", async () => {
        let tx = await liquidityBond.testMint(deployer.address, parseEther("1000"));
        await tx.wait();

        let tx2 = await liquidityBond.transfer(executionPriceAddress, parseEther("1000"));
        await tx2.wait();

        let tx3 = await executionPrice.append(otherUser.address, parseEther("8"));
        await tx3.wait();

        let initialBalanceUser = await liquidityBond.balanceOf(otherUser.address);
        let initialBalanceOwner = await liquidityBond.balanceOf(deployer.address);
        let initialBalanceStaking = await tradegenToken.balanceOf(pairDataAddress);

        let tx4 = await executionPrice.executeOrder(parseEther("1"));
        await tx4.wait();

        let newBalanceUser = await liquidityBond.balanceOf(otherUser.address);
        let newBalanceOwner = await liquidityBond.balanceOf(deployer.address);
        let newBalanceStaking = await tradegenToken.balanceOf(pairDataAddress);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) + BigInt(0.995e18);
        let expectedNewBalanceOwner = BigInt(initialBalanceOwner) + BigInt(0.005e18);
        let expectedNewBalanceStaking = BigInt(initialBalanceStaking) + BigInt("127187627187000");
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceOwner.toString()).to.equal(expectedNewBalanceOwner.toString());
        expect(newBalanceStaking.toString()).to.equal(expectedNewBalanceStaking.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(parseEther("1"));

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("7"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let order = await executionPrice.orderBook(1);
        expect(order.user).to.equal(otherUser.address);
        expect(order.quantity).to.equal(parseEther("8"));
        expect(order.amountFilled).to.equal(parseEther("1"));
    });
    
    it("more tokens in queue than order size; execute order multiple times; buy queue", async () => {
        let tx = await liquidityBond.testMint(deployer.address, parseEther("1000"));
        await tx.wait();

        let tx2 = await liquidityBond.transfer(executionPriceAddress, parseEther("1000"));
        await tx2.wait();

        let tx3 = await executionPrice.append(otherUser.address, parseEther("8"));
        await tx3.wait();

        let initialBalanceUser = await liquidityBond.balanceOf(otherUser.address);
        let initialBalanceOwner = await liquidityBond.balanceOf(deployer.address);

        let tx4 = await executionPrice.executeOrder(parseEther("1"));
        await tx4.wait();

        let tx5 = await executionPrice.executeOrder(parseEther("2"));
        await tx5.wait();

        let tx6 = await executionPrice.executeOrder(parseEther("3"));
        await tx6.wait();

        let newBalanceUser = await liquidityBond.balanceOf(otherUser.address);
        let newBalanceOwner = await liquidityBond.balanceOf(deployer.address);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) + BigInt(5.97e18);
        let expectedNewBalanceOwner = BigInt(initialBalanceOwner) + BigInt(0.03e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceOwner.toString()).to.equal(expectedNewBalanceOwner.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(parseEther("3"));

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("2"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let order = await executionPrice.orderBook(1);
        expect(order.user).to.equal(otherUser.address);
        expect(order.quantity).to.equal(parseEther("8"));
        expect(order.amountFilled).to.equal(parseEther("6"));
    });

    it("more tokens in queue than order size; filled mid way; buy queue", async () => {
        let tx = await liquidityBond.testMint(deployer.address, parseEther("1000"));
        await tx.wait();

        let tx2 = await liquidityBond.transfer(executionPriceAddress, parseEther("1000"));
        await tx2.wait();

        let tx3 = await executionPrice.append(otherUser.address, parseEther("8"));
        await tx3.wait();

        let tx4 = await executionPrice.append(otherUser.address, parseEther("8"));
        await tx4.wait();

        let tx5 = await executionPrice.append(otherUser.address, parseEther("8"));
        await tx5.wait();

        let initialBalanceUser = await liquidityBond.balanceOf(otherUser.address);
        let initialBalanceOwner = await liquidityBond.balanceOf(deployer.address);

        let tx6 = await executionPrice.executeOrder(parseEther("10"));
        await tx6.wait();

        let newBalanceUser = await liquidityBond.balanceOf(otherUser.address);
        let newBalanceOwner = await liquidityBond.balanceOf(deployer.address);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) + BigInt(9.95e18);
        let expectedNewBalanceOwner = BigInt(initialBalanceOwner) + BigInt(0.05e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceOwner.toString()).to.equal(expectedNewBalanceOwner.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(parseEther("10"));

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("14"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(2);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(otherUser.address);
        expect(order1.quantity).to.equal(parseEther("8"));
        expect(order1.amountFilled).to.equal(parseEther("8"));

        let order2 = await executionPrice.orderBook(2);
        expect(order2.user).to.equal(otherUser.address);
        expect(order2.quantity).to.equal(parseEther("8"));
        expect(order2.amountFilled).to.equal(parseEther("2"));

        let order3 = await executionPrice.orderBook(3);
        expect(order3.user).to.equal(otherUser.address);
        expect(order3.quantity).to.equal(parseEther("8"));
        expect(order3.amountFilled).to.equal(0);
    });
    
    it("less tokens in queue than order size; buy queue", async () => {
        let tx = await liquidityBond.testMint(deployer.address, parseEther("1000"));
        await tx.wait();

        let tx2 = await liquidityBond.transfer(executionPriceAddress, parseEther("1000"));
        await tx2.wait();

        let tx3 = await executionPrice.append(otherUser.address, parseEther("10"));
        await tx3.wait();

        let initialBalanceUser = await liquidityBond.balanceOf(otherUser.address);
        let initialBalanceOwner = await liquidityBond.balanceOf(deployer.address);

        let tx4 = await executionPrice.executeOrder(parseEther("20"));
        await tx4.wait();

        let newBalanceUser = await liquidityBond.balanceOf(otherUser.address);
        let newBalanceOwner = await liquidityBond.balanceOf(deployer.address);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) + BigInt(9.95e18);
        let expectedNewBalanceOwner = BigInt(initialBalanceOwner) + BigInt(0.05e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceOwner.toString()).to.equal(expectedNewBalanceOwner.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(parseEther("10"));

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(0);

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(2);

        let order = await executionPrice.orderBook(1);
        expect(order.user).to.equal(otherUser.address);
        expect(order.quantity).to.equal(parseEther("10"));
        expect(order.amountFilled).to.equal(parseEther("10"));
    });

    it("less tokens in queue than order size; 10 orders; buy queue", async () => {
        let tx = await liquidityBond.testMint(deployer.address, parseEther("1000"));
        await tx.wait();

        let tx2 = await liquidityBond.transfer(executionPriceAddress, parseEther("1000"));
        await tx2.wait();

        for (let i = 0; i < 10; i++) {
            let tx3 = await executionPrice.append(otherUser.address, parseEther("1"));
            await tx3.wait();
        }

        let initialBalanceUser = await liquidityBond.balanceOf(otherUser.address);
        let initialBalanceOwner = await liquidityBond.balanceOf(deployer.address);

        let tx4 = await executionPrice.executeOrder(parseEther("20"));
        await tx4.wait();

        let newBalanceUser = await liquidityBond.balanceOf(otherUser.address);
        let newBalanceOwner = await liquidityBond.balanceOf(deployer.address);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) + BigInt(9.95e18);
        let expectedNewBalanceOwner = BigInt(initialBalanceOwner) + BigInt(0.05e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceOwner.toString()).to.equal(expectedNewBalanceOwner.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(parseEther("10"));

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(0);

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(11);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(11);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(otherUser.address);
        expect(order1.quantity).to.equal(parseEther("1"));
        expect(order1.amountFilled).to.equal(parseEther("1"));

        let order10 = await executionPrice.orderBook(10);
        expect(order10.user).to.equal(otherUser.address);
        expect(order10.quantity).to.equal(parseEther("1"));
        expect(order10.amountFilled).to.equal(parseEther("1"));
    });

    it("less tokens in queue than order size; 50 orders; buy queue", async () => {
        let tx = await liquidityBond.testMint(deployer.address, parseEther("1000"));
        await tx.wait();

        let tx2 = await liquidityBond.transfer(executionPriceAddress, parseEther("1000"));
        await tx2.wait();

        for (let i = 0; i < 50; i++) {
            let tx3 = await executionPrice.append(otherUser.address, parseEther("1"));
            await tx3.wait();
        }

        let initialBalanceUser = await liquidityBond.balanceOf(otherUser.address);
        let initialBalanceOwner = await liquidityBond.balanceOf(deployer.address);

        let tx4 = await executionPrice.executeOrder(parseEther("100"));
        await tx4.wait();

        let newBalanceUser = await liquidityBond.balanceOf(otherUser.address);
        let newBalanceOwner = await liquidityBond.balanceOf(deployer.address);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) + BigInt(49.75e18);
        let expectedNewBalanceOwner = BigInt(initialBalanceOwner) + BigInt(0.25e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceOwner.toString()).to.equal(expectedNewBalanceOwner.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(parseEther("50"));

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(0);

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(51);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(51);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(otherUser.address);
        expect(order1.quantity).to.equal(parseEther("1"));
        expect(order1.amountFilled).to.equal(parseEther("1"));

        let order50 = await executionPrice.orderBook(50);
        expect(order50.user).to.equal(otherUser.address);
        expect(order50.quantity).to.equal(parseEther("1"));
        expect(order50.amountFilled).to.equal(parseEther("1"));
    });
    
    it("more tokens in queue than order size; sell queue", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await tradegenToken.transfer(executionPriceAddress, parseEther("1000"));
        await tx2.wait();

        let tx3 = await executionPrice.append(otherUser.address, parseEther("8"));
        await tx3.wait();

        let initialBalanceUser = await tradegenToken.balanceOf(otherUser.address);
        let initialBalanceOwner = await tradegenToken.balanceOf(deployer.address);

        let tx4 = await executionPrice.executeOrder(parseEther("1"));
        await tx4.wait();

        let newBalanceUser = await tradegenToken.balanceOf(otherUser.address);
        let newBalanceOwner = await tradegenToken.balanceOf(deployer.address);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) + BigInt(0.995e18);
        let expectedNewBalanceOwner = BigInt(initialBalanceOwner) + BigInt(0.005e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceOwner.toString()).to.equal(expectedNewBalanceOwner.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(parseEther("1"));

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("7"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let order = await executionPrice.orderBook(1);
        expect(order.user).to.equal(otherUser.address);
        expect(order.quantity).to.equal(parseEther("8"));
        expect(order.amountFilled).to.equal(parseEther("1"));
    });
    
    it("more tokens in queue than order size; sell queue", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await tradegenToken.transfer(executionPriceAddress, parseEther("1000"));
        await tx2.wait();

        let tx3 = await executionPrice.append(otherUser.address, parseEther("8"));
        await tx3.wait();

        let tx4 = await executionPrice.append(otherUser.address, parseEther("8"));
        await tx4.wait();

        let tx5 = await executionPrice.append(otherUser.address, parseEther("8"));
        await tx5.wait();

        let initialBalanceUser = await tradegenToken.balanceOf(otherUser.address);
        let initialBalanceOwner = await tradegenToken.balanceOf(deployer.address);

        let tx6 = await executionPrice.executeOrder(parseEther("10"));
        await tx6.wait();

        let newBalanceUser = await tradegenToken.balanceOf(otherUser.address);
        let newBalanceOwner = await tradegenToken.balanceOf(deployer.address);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) + BigInt(9.95e18);
        let expectedNewBalanceOwner = BigInt(initialBalanceOwner) + BigInt(0.05e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceOwner.toString()).to.equal(expectedNewBalanceOwner.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(parseEther("10"));

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("14"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(2);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(otherUser.address);
        expect(order1.quantity).to.equal(parseEther("8"));
        expect(order1.amountFilled).to.equal(parseEther("8"));

        let order2 = await executionPrice.orderBook(2);
        expect(order2.user).to.equal(otherUser.address);
        expect(order2.quantity).to.equal(parseEther("8"));
        expect(order2.amountFilled).to.equal(parseEther("2"));

        let order3 = await executionPrice.orderBook(3);
        expect(order3.user).to.equal(otherUser.address);
        expect(order3.quantity).to.equal(parseEther("8"));
        expect(order3.amountFilled).to.equal(0);
    });

    it("less tokens in queue than order size; sell queue", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await tradegenToken.transfer(executionPriceAddress, parseEther("1000"));
        await tx2.wait();

        let tx3 = await executionPrice.append(otherUser.address, parseEther("10"));
        await tx3.wait();

        let initialBalanceUser = await tradegenToken.balanceOf(otherUser.address);
        let initialBalanceOwner = await tradegenToken.balanceOf(deployer.address);

        let tx5 = await executionPrice.executeOrder(parseEther("20"));
        await tx5.wait();

        let newBalanceUser = await tradegenToken.balanceOf(otherUser.address);
        let newBalanceOwner = await tradegenToken.balanceOf(deployer.address);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) + BigInt(9.95e18);
        let expectedNewBalanceOwner = BigInt(initialBalanceOwner) + BigInt(0.05e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceOwner.toString()).to.equal(expectedNewBalanceOwner.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(parseEther("10"));

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(0);

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(2);

        let order = await executionPrice.orderBook(1);
        expect(order.user).to.equal(otherUser.address);
        expect(order.quantity).to.equal(parseEther("10"));
        expect(order.amountFilled).to.equal(parseEther("10"));
    });
  });

  describe("#buy", () => {
    beforeEach(async () => {
        let currentTime = await pairData.getCurrentTime();
        
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

        let tx3 = await executionPrice.setOwner(releaseScheduleAddress);
        await tx3.wait();

        let tx4 = await executionPrice.setPrice(parseEther("1"));
        await tx4.wait();

        let tx5 = await executionPrice.setIsInitialized(true);
        await tx5.wait();
    });
    
    it("less than minimum order size", async () => {
        let tx = await tradegenToken.approve(executionPriceAddress, parseEther("0.001"));
        await tx.wait();

        let initialBalanceUser = await tradegenToken.balanceOf(deployer.address);

        let tx2 = executionPrice.buy(parseEther("0.001"));
        await expect(tx2).to.be.reverted;

        let newBalanceUser = await tradegenToken.balanceOf(deployer.address);

        expect(newBalanceUser).to.equal(initialBalanceUser);

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(0);

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(0);

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);
    });

    it("queue is full; buy queue", async () => {
        let tx = await tradegenToken.approve(executionPriceAddress, parseEther("1"));
        await tx.wait();

        let initialBalanceUser = await tradegenToken.balanceOf(deployer.address);

        let tx2 = await executionPrice.setEndIndex(22);
        await tx2.wait();

        let tx3 = executionPrice.buy(parseEther("1"));
        await expect(tx3).to.be.reverted;

        let newBalanceUser = await tradegenToken.balanceOf(deployer.address);

        expect(newBalanceUser).to.equal(initialBalanceUser);

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(0);

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(0);

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);
    });

    it("queue is empty; buy queue", async () => {
        let tx = await tradegenToken.approve(executionPriceAddress, parseEther("1"));
        await tx.wait();

        let initialBalanceUser = await tradegenToken.balanceOf(deployer.address);
        let initialBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);

        let tx2 = await executionPrice.buy(parseEther("1"))
        await tx2.wait();

        let newBalanceUser = await tradegenToken.balanceOf(deployer.address);
        let newBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) - BigInt(1e18);
        let expectedNewBalanceContract = BigInt(initialBalanceContract) + BigInt(1e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(0);

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("1"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndex = await executionPrice.orderIndex(deployer.address);
        expect(orderIndex).to.equal(1);

        let order = await executionPrice.orderBook(1);
        expect(order.user).to.equal(deployer.address);
        expect(order.quantity).to.equal(parseEther("1"));
        expect(order.amountFilled).to.equal(0);
    });

    it("queue is empty, buy again; buy queue", async () => {
        let tx = await tradegenToken.approve(executionPriceAddress, parseEther("2"));
        await tx.wait();

        let initialBalanceUser = await tradegenToken.balanceOf(deployer.address);
        let initialBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);

        let tx2 = await executionPrice.buy(parseEther("1"))
        await tx2.wait();

        let tx3 = await executionPrice.buy(parseEther("1"))
        await tx3.wait();

        let newBalanceUser = await tradegenToken.balanceOf(deployer.address);
        let newBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) - BigInt(2e18);
        let expectedNewBalanceContract = BigInt(initialBalanceContract) + BigInt(2e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(0);

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("2"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndex = await executionPrice.orderIndex(deployer.address);
        expect(orderIndex).to.equal(1);

        let order = await executionPrice.orderBook(1);
        expect(order.user).to.equal(deployer.address);
        expect(order.quantity).to.equal(parseEther("2"));
        expect(order.amountFilled).to.equal(0);
    });

    it("queue is empty, buy again with multiple users; buy queue", async () => {
        let tx = await tradegenToken.transfer(otherUser.address, parseEther("5"));
        await tx.wait();

        let tx2 = await tradegenToken.approve(executionPriceAddress, parseEther("2"));
        await tx2.wait();

        let initialBalanceUser = await tradegenToken.balanceOf(deployer.address);
        let initialBalanceOther = await tradegenToken.balanceOf(otherUser.address);
        let initialBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);

        let tx3 = await executionPrice.buy(parseEther("1"))
        await tx3.wait();

        let tx4 = await tradegenToken.connect(otherUser).approve(executionPriceAddress, parseEther("2"));
        await tx4.wait();

        let tx5 = await executionPrice.connect(otherUser).buy(parseEther("1"))
        await tx5.wait();

        let tx6 = await executionPrice.buy(parseEther("1"))
        await tx6.wait();

        let tx7 = await executionPrice.connect(otherUser).buy(parseEther("1"))
        await tx7.wait();

        let newBalanceUser = await tradegenToken.balanceOf(deployer.address);
        let newBalanceOther = await tradegenToken.balanceOf(otherUser.address);
        let newBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) - BigInt(2e18);
        let expectedNewBalanceOther = BigInt(initialBalanceOther) - BigInt(2e18);
        let expectedNewBalanceContract = BigInt(initialBalanceContract) + BigInt(4e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceOther.toString()).to.equal(expectedNewBalanceOther.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(0);

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("4"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(3);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(1);

        let orderIndexOther = await executionPrice.orderIndex(otherUser.address);
        expect(orderIndexOther).to.equal(2);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(deployer.address);
        expect(order1.quantity).to.equal(parseEther("2"));
        expect(order1.amountFilled).to.equal(0);

        let order2 = await executionPrice.orderBook(2);
        expect(order2.user).to.equal(otherUser.address);
        expect(order2.quantity).to.equal(parseEther("2"));
        expect(order2.amountFilled).to.equal(0);
    });

    it("queue is empty; sell queue", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await tradegenToken.approve(executionPriceAddress, parseEther("1"));
        await tx2.wait();

        let initialBalanceUser = await tradegenToken.balanceOf(deployer.address);
        let initialBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);

        let tx3 = await executionPrice.buy(parseEther("1"))
        await tx3.wait();

        let newBalanceUser = await tradegenToken.balanceOf(deployer.address);
        let newBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) - BigInt(1e18);
        let expectedNewBalanceContract = BigInt(initialBalanceContract) + BigInt(1e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.true;

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(0);

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("1"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndex = await executionPrice.orderIndex(deployer.address);
        expect(orderIndex).to.equal(1);

        let order = await executionPrice.orderBook(1);
        expect(order.user).to.equal(deployer.address);
        expect(order.quantity).to.equal(parseEther("1"));
        expect(order.amountFilled).to.equal(0);
    });

    it("order filled; sell queue", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await executionPrice.append(otherUser.address, parseEther("10"));
        await tx2.wait();

        let tx3 = await liquidityBond.testMint(otherUser.address, parseEther("10"));
        await tx3.wait();

        let tx4 = await liquidityBond.connect(otherUser).transfer(executionPriceAddress, parseEther("10"));
        await tx4.wait();

        let tx5 = await tradegenToken.approve(executionPriceAddress, parseEther("2"));
        await tx5.wait();

        let initialBalanceUserTGEN = await tradegenToken.balanceOf(deployer.address);
        let initialBalanceUserBondToken = await liquidityBond.balanceOf(deployer.address);
        let initialBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);

        let tx6 = await executionPrice.buy(parseEther("2"))
        await tx6.wait();

        let newBalanceUserTGEN = await tradegenToken.balanceOf(deployer.address);
        let newBalanceUserBondToken = await liquidityBond.balanceOf(deployer.address);
        let newBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);
        let expectedNewBalanceUserTGEN = BigInt(initialBalanceUserTGEN) - BigInt(2e18);
        let expectedNewBalanceUserBondToken = BigInt(initialBalanceUserBondToken) + BigInt(2e18);
        let expectedNewBalanceContract = BigInt(initialBalanceContract) - BigInt(2e18); // 2 tokens transferred to buyer
        expect(newBalanceUserTGEN.toString()).to.equal(expectedNewBalanceUserTGEN.toString());
        expect(newBalanceUserBondToken.toString()).to.equal(expectedNewBalanceUserBondToken.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.false;

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("8"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(0);

        let orderIndexOther = await executionPrice.orderIndex(otherUser.address);
        expect(orderIndexOther).to.equal(1);

        let order = await executionPrice.orderBook(1);
        expect(order.user).to.equal(otherUser.address);
        expect(order.quantity).to.equal(parseEther("10"));
        expect(order.amountFilled).to.equal(parseEther("2"));
    });

    it("order not filled; sell queue", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        // Simulate a previous 'sell' order by transferring bond token to queue and appending order.
        let tx2 = await executionPrice.append(otherUser.address, parseEther("10"));
        await tx2.wait();

        let tx3 = await liquidityBond.testMint(otherUser.address, parseEther("10"));
        await tx3.wait();

        let tx4 = await liquidityBond.connect(otherUser).transfer(executionPriceAddress, parseEther("10"));
        await tx4.wait();

        let tx5 = await tradegenToken.approve(executionPriceAddress, parseEther("12"));
        await tx5.wait();

        let initialBalanceUserTGEN = await tradegenToken.balanceOf(deployer.address);
        let initialBalanceUserBondToken = await liquidityBond.balanceOf(deployer.address);
        let initialBalanceOtherTGEN = await tradegenToken.balanceOf(otherUser.address);
        let initialBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);
        let initialBalanceOwnerTGEN = await tradegenToken.balanceOf(releaseScheduleAddress);

        let tx6 = await executionPrice.buy(parseEther("12"))
        await tx6.wait();

        let newBalanceUserTGEN = await tradegenToken.balanceOf(deployer.address);
        let newBalanceUserBondToken = await liquidityBond.balanceOf(deployer.address);
        let newBalanceOtherTGEN = await tradegenToken.balanceOf(otherUser.address);
        let newBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);
        let newBalanceOwnerTGEN = await tradegenToken.balanceOf(releaseScheduleAddress);
        let expectedNewBalanceUserTGEN = BigInt(initialBalanceUserTGEN) - BigInt(12e18);
        let expectedNewBalanceUserBondToken = BigInt(initialBalanceUserBondToken) + BigInt(10e18);
        let expectedNewBalanceOtherTGEN = BigInt(initialBalanceOtherTGEN) + BigInt(9.95e18); // 10 TGEN - fees
        let expectedNewBalanceContract = BigInt(initialBalanceContract) - BigInt(10e18); // 10 tokens transferred to buyer
        let expectedNewBalanceOwnerTGEN = BigInt(initialBalanceOwnerTGEN) + BigInt(0.05e18); // 0.05 TGEN from fees
        expect(newBalanceUserTGEN.toString()).to.equal(expectedNewBalanceUserTGEN.toString());
        expect(newBalanceUserBondToken.toString()).to.equal(expectedNewBalanceUserBondToken.toString());
        expect(newBalanceOtherTGEN.toString()).to.equal(expectedNewBalanceOtherTGEN.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());
        expect(newBalanceOwnerTGEN.toString()).to.equal(expectedNewBalanceOwnerTGEN.toString());

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.true;

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("2"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(2);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(3);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(2);

        let orderIndexOther = await executionPrice.orderIndex(otherUser.address);
        expect(orderIndexOther).to.equal(1);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(otherUser.address);
        expect(order1.quantity).to.equal(parseEther("10"));
        expect(order1.amountFilled).to.equal(parseEther("10"));

        let order2 = await executionPrice.orderBook(2);
        expect(order2.user).to.equal(deployer.address);
        expect(order2.quantity).to.equal(parseEther("2"));
        expect(order2.amountFilled).to.equal(0);
    });
  });

  describe("#sell", () => {
    beforeEach(async () => {
        let currentTime = await pairData.getCurrentTime();
        
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

        let tx3 = await executionPrice.setOwner(releaseScheduleAddress);
        await tx3.wait();

        let tx4 = await executionPrice.setPrice(parseEther("1"));
        await tx4.wait();

        let tx5 = await executionPrice.setIsInitialized(true);
        await tx5.wait();
    });
    
    it("less than minimum order size", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await liquidityBond.testMint(deployer.address, parseEther("10"));
        await tx2.wait();

        let tx3 = await liquidityBond.approve(executionPriceAddress, parseEther("1"));
        await tx3.wait();

        let initialBalanceUser = await liquidityBond.balanceOf(deployer.address);

        let tx4 = executionPrice.sell(parseEther("0.001"));
        await expect(tx4).to.be.reverted;

        let newBalanceUser = await liquidityBond.balanceOf(deployer.address);

        expect(newBalanceUser).to.equal(initialBalanceUser);

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(0);

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(0);

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);
    });

    it("queue is full; sell queue", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await liquidityBond.testMint(deployer.address, parseEther("10"));
        await tx2.wait();

        let tx3 = await liquidityBond.approve(executionPriceAddress, parseEther("1"));
        await tx3.wait();

        let initialBalanceUser = await liquidityBond.balanceOf(deployer.address);

        let tx4 = await executionPrice.setEndIndex(22);
        await tx4.wait();

        let tx5 = executionPrice.sell(parseEther("1"));
        await expect(tx5).to.be.reverted;

        let newBalanceUser = await liquidityBond.balanceOf(deployer.address);

        expect(newBalanceUser).to.equal(initialBalanceUser);

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(0);

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(0);

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);
    });

    it("queue is empty; sell queue", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await liquidityBond.testMint(deployer.address, parseEther("10"));
        await tx2.wait();

        let tx3 = await liquidityBond.approve(executionPriceAddress, parseEther("1"));
        await tx3.wait();

        let initialBalanceUser = await liquidityBond.balanceOf(deployer.address);
        let initialBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);

        let tx4 = await executionPrice.sell(parseEther("1"));
        await tx4.wait();

        let newBalanceUser = await liquidityBond.balanceOf(deployer.address);
        let newBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) - BigInt(1e18);
        let expectedNewBalanceContract = BigInt(initialBalanceContract) + BigInt(1e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(0);

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("1"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndex = await executionPrice.orderIndex(deployer.address);
        expect(orderIndex).to.equal(1);

        let order = await executionPrice.orderBook(1);
        expect(order.user).to.equal(deployer.address);
        expect(order.quantity).to.equal(parseEther("1"));
        expect(order.amountFilled).to.equal(0);
    });

    it("queue is empty, buy again; sell queue", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await liquidityBond.testMint(deployer.address, parseEther("10"));
        await tx2.wait();

        let tx3 = await liquidityBond.approve(executionPriceAddress, parseEther("2"));
        await tx3.wait();

        let initialBalanceUser = await liquidityBond.balanceOf(deployer.address);
        let initialBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);

        let tx4 = await executionPrice.sell(parseEther("1"))
        await tx4.wait();

        let tx5 = await executionPrice.sell(parseEther("1"))
        await tx5.wait();

        let newBalanceUser = await liquidityBond.balanceOf(deployer.address);
        let newBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) - BigInt(2e18);
        let expectedNewBalanceContract = BigInt(initialBalanceContract) + BigInt(2e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(0);

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("2"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndex = await executionPrice.orderIndex(deployer.address);
        expect(orderIndex).to.equal(1);

        let order = await executionPrice.orderBook(1);
        expect(order.user).to.equal(deployer.address);
        expect(order.quantity).to.equal(parseEther("2"));
        expect(order.amountFilled).to.equal(0);
    });

    it("queue is empty, buy again with multiple users; sell queue", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await liquidityBond.testMint(deployer.address, parseEther("10"));
        await tx2.wait();

        let tx3 = await liquidityBond.transfer(otherUser.address, parseEther("5"));
        await tx3.wait();

        let tx4 = await liquidityBond.approve(executionPriceAddress, parseEther("2"));
        await tx4.wait();

        let initialBalanceUser = await liquidityBond.balanceOf(deployer.address);
        let initialBalanceOther = await liquidityBond.balanceOf(otherUser.address);
        let initialBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);

        let tx5 = await executionPrice.sell(parseEther("1"))
        await tx5.wait();

        let tx6 = await liquidityBond.connect(otherUser).approve(executionPriceAddress, parseEther("2"));
        await tx6.wait();

        let tx7 = await executionPrice.connect(otherUser).sell(parseEther("1"))
        await tx7.wait();

        let tx8 = await executionPrice.sell(parseEther("1"))
        await tx8.wait();

        let tx9 = await executionPrice.connect(otherUser).sell(parseEther("1"))
        await tx9.wait();

        let newBalanceUser = await liquidityBond.balanceOf(deployer.address);
        let newBalanceOther = await liquidityBond.balanceOf(otherUser.address);
        let newBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) - BigInt(2e18);
        let expectedNewBalanceOther = BigInt(initialBalanceOther) - BigInt(2e18);
        let expectedNewBalanceContract = BigInt(initialBalanceContract) + BigInt(4e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceOther.toString()).to.equal(expectedNewBalanceOther.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(0);

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("4"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(3);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(1);

        let orderIndexOther = await executionPrice.orderIndex(otherUser.address);
        expect(orderIndexOther).to.equal(2);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(deployer.address);
        expect(order1.quantity).to.equal(parseEther("2"));
        expect(order1.amountFilled).to.equal(0);

        let order2 = await executionPrice.orderBook(2);
        expect(order2.user).to.equal(otherUser.address);
        expect(order2.quantity).to.equal(parseEther("2"));
        expect(order2.amountFilled).to.equal(0);
    });

    it("queue is empty; buy queue", async () => {
        let tx = await liquidityBond.testMint(deployer.address, parseEther("10"));
        await tx.wait();

        let tx2 = await liquidityBond.approve(executionPriceAddress, parseEther("1"));
        await tx2.wait();

        let initialBalanceUser = await liquidityBond.balanceOf(deployer.address);
        let initialBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);

        let tx3 = await executionPrice.sell(parseEther("1"))
        await tx3.wait();

        let newBalanceUser = await liquidityBond.balanceOf(deployer.address);
        let newBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) - BigInt(1e18);
        let expectedNewBalanceContract = BigInt(initialBalanceContract) + BigInt(1e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.false;

        let totalFilledAmount = await executionPrice.totalFilledAmount();
        expect(totalFilledAmount).to.equal(0);

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("1"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndex = await executionPrice.orderIndex(deployer.address);
        expect(orderIndex).to.equal(1);

        let order = await executionPrice.orderBook(1);
        expect(order.user).to.equal(deployer.address);
        expect(order.quantity).to.equal(parseEther("1"));
        expect(order.amountFilled).to.equal(0);
    });

    it("order filled; buy queue", async () => {
        let tx = await liquidityBond.testMint(deployer.address, parseEther("10"));
        await tx.wait();

        let tx2 = await executionPrice.append(otherUser.address, parseEther("10"));
        await tx2.wait();

        let tx3 = await tradegenToken.transfer(executionPriceAddress, parseEther("10"));
        await tx3.wait();

        let tx4 = await liquidityBond.approve(executionPriceAddress, parseEther("2"));
        await tx4.wait();

        let initialBalanceUserBondToken = await liquidityBond.balanceOf(deployer.address);
        let initialBalanceUserTGEN = await tradegenToken.balanceOf(deployer.address);
        let initialBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);

        let tx5 = await executionPrice.sell(parseEther("2"))
        await tx5.wait();

        let newBalanceUserTGEN = await tradegenToken.balanceOf(deployer.address);
        let newBalanceUserBondToken = await liquidityBond.balanceOf(deployer.address);
        let newBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);
        let expectedNewBalanceUserTGEN = BigInt(initialBalanceUserTGEN) + BigInt(2e18);
        let expectedNewBalanceUserBondToken = BigInt(initialBalanceUserBondToken) - BigInt(2e18);
        let expectedNewBalanceContract = BigInt(initialBalanceContract) - BigInt(2e18); // 2 tokens transferred to buyer
        expect(newBalanceUserTGEN.toString()).to.equal(expectedNewBalanceUserTGEN.toString());
        expect(newBalanceUserBondToken.toString()).to.equal(expectedNewBalanceUserBondToken.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.true;

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("8"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(0);

        let orderIndexOther = await executionPrice.orderIndex(otherUser.address);
        expect(orderIndexOther).to.equal(1);

        let order = await executionPrice.orderBook(1);
        expect(order.user).to.equal(otherUser.address);
        expect(order.quantity).to.equal(parseEther("10"));
        expect(order.amountFilled).to.equal(parseEther("2"));
    });

    it("order not filled; buy queue", async () => {
        let tx = await liquidityBond.testMint(deployer.address, parseEther("12"));
        await tx.wait();

        // Simulate a previous 'buy' order by transferring TGEN to queue and appending order.
        let tx2 = await executionPrice.append(otherUser.address, parseEther("10"));
        await tx2.wait();

        let tx3 = await tradegenToken.transfer(executionPriceAddress, parseEther("10"));
        await tx3.wait();

        let tx4 = await liquidityBond.approve(executionPriceAddress, parseEther("12"));
        await tx4.wait();

        let initialBalanceUserTGEN = await tradegenToken.balanceOf(deployer.address);
        let initialBalanceUserBondToken = await liquidityBond.balanceOf(deployer.address);
        let initialBalanceOtherBondToken = await liquidityBond.balanceOf(otherUser.address);
        let initialBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);
        let initialBalanceOwnerBondToken = await liquidityBond.balanceOf(releaseScheduleAddress);

        let tx5 = await executionPrice.sell(parseEther("12"))
        await tx5.wait();

        let newBalanceUserTGEN = await tradegenToken.balanceOf(deployer.address);
        let newBalanceUserBondToken = await liquidityBond.balanceOf(deployer.address);
        let newBalanceOtherBondToken = await liquidityBond.balanceOf(otherUser.address);
        let newBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);
        let newBalanceOwnerBondToken = await liquidityBond.balanceOf(releaseScheduleAddress);
        let expectedNewBalanceUserTGEN = BigInt(initialBalanceUserTGEN) + BigInt(10e18);
        let expectedNewBalanceUserBondToken = BigInt(initialBalanceUserBondToken) - BigInt(12e18);
        let expectedNewBalanceOtherBondToken = BigInt(initialBalanceOtherBondToken) + BigInt(9.95e18); // 10 bond token - fees
        let expectedNewBalanceContract = BigInt(initialBalanceContract) - BigInt(10e18); // 10 tokens transferred to seller
        let expectedNewBalanceOwnerBondToken = BigInt(initialBalanceOwnerBondToken) + BigInt(0.05e18); // 0.05 bond token from fees
        expect(newBalanceUserTGEN.toString()).to.equal(expectedNewBalanceUserTGEN.toString());
        expect(newBalanceUserBondToken.toString()).to.equal(expectedNewBalanceUserBondToken.toString());
        expect(newBalanceOtherBondToken.toString()).to.equal(expectedNewBalanceOtherBondToken.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());
        expect(newBalanceOwnerBondToken.toString()).to.equal(expectedNewBalanceOwnerBondToken.toString());

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.false;

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("2"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(2);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(3);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(2);

        let orderIndexOther = await executionPrice.orderIndex(otherUser.address);
        expect(orderIndexOther).to.equal(1);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(otherUser.address);
        expect(order1.quantity).to.equal(parseEther("10"));
        expect(order1.amountFilled).to.equal(parseEther("10"));

        let order2 = await executionPrice.orderBook(2);
        expect(order2.user).to.equal(deployer.address);
        expect(order2.quantity).to.equal(parseEther("2"));
        expect(order2.amountFilled).to.equal(0);
    });
  });*/

  describe("#updateOrder", () => {
    beforeEach(async () => {
        let currentTime = await pairData.getCurrentTime();
        
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

        let tx3 = await executionPrice.setOwner(releaseScheduleAddress);
        await tx3.wait();

        let tx4 = await executionPrice.setPrice(parseEther("1"));
        await tx4.wait();

        let tx5 = await executionPrice.setIsInitialized(true);
        await tx5.wait();
    });
    /*
    it("less than minimum order size", async () => {
        let tx = await tradegenToken.approve(executionPriceAddress, parseEther("0.001"));
        await tx.wait();

        let initialBalanceUser = await tradegenToken.balanceOf(deployer.address);

        let tx2 = executionPrice.updateOrder(parseEther("0.001"), true);
        await expect(tx2).to.be.reverted;

        let newBalanceUser = await tradegenToken.balanceOf(deployer.address);

        expect(newBalanceUser).to.equal(initialBalanceUser);

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(0);

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);
    });

    it("previous order filled; buy", async () => {
        let tx = await tradegenToken.approve(executionPriceAddress, parseEther("1"));
        await tx.wait();

        let initialBalanceUser = await tradegenToken.balanceOf(deployer.address);

        let tx2 = await executionPrice.updateOrder(parseEther("1"), true);
        await tx2.wait();

        let newBalanceUser = await tradegenToken.balanceOf(deployer.address);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) - BigInt(1e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("1"));

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.true;

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(1);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(deployer.address);
        expect(order1.quantity).to.equal(parseEther("1"));
        expect(order1.amountFilled).to.equal(0);
    });

    it("previous order filled; sell", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await liquidityBond.testMint(deployer.address, parseEther("10"));
        await tx2.wait();

        let tx3 = await liquidityBond.approve(executionPriceAddress, parseEther("2"));
        await tx3.wait();

        let initialBalanceUser = await liquidityBond.balanceOf(deployer.address);

        let tx4 = await executionPrice.updateOrder(parseEther("2"), false);
        await tx4.wait();

        let newBalanceUser = await liquidityBond.balanceOf(deployer.address);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) - BigInt(2e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.false;

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("2"));

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(1);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(deployer.address);
        expect(order1.quantity).to.equal(parseEther("2"));
        expect(order1.amountFilled).to.equal(0);
    });

    it("buy queue and lower amount than filled; buy", async () => {
        let tx = await tradegenToken.approve(executionPriceAddress, parseEther("2"));
        await tx.wait();

        let tx2 = await executionPrice.append(deployer.address, parseEther("2"));
        await tx2.wait();

        let tx3 = await executionPrice.setOrder(1, deployer.address, parseEther("2"), parseEther("1.5"));
        await tx3.wait();

        let tx4 = await executionPrice.setNumberOfTokensAvailable(parseEther("0.5"));
        await tx4.wait();

        let initialBalanceUser = await tradegenToken.balanceOf(deployer.address);

        let tx5 = await executionPrice.updateOrder(parseEther("1"), true);
        await tx5.wait();

        let newBalanceUser = await tradegenToken.balanceOf(deployer.address);
        let expectedNewBalanceUser = BigInt(initialBalanceUser);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(0);

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.true;

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(1);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(deployer.address);
        expect(order1.quantity).to.equal(parseEther("1.5"));
        expect(order1.amountFilled).to.equal(parseEther("1.5"));
    });

    it("buy queue and lower amount than quantity; buy", async () => {
        let tx = await tradegenToken.approve(executionPriceAddress, parseEther("2"));
        await tx.wait();

        let tx2 = await tradegenToken.transfer(executionPriceAddress, parseEther("2"));
        await tx2.wait();

        let tx3 = await executionPrice.append(deployer.address, parseEther("2"));
        await tx3.wait();

        let initialBalanceUser = await tradegenToken.balanceOf(deployer.address);
        let initialBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);

        let tx4 = await executionPrice.updateOrder(parseEther("1"), true);
        await tx4.wait();

        let newBalanceUser = await tradegenToken.balanceOf(deployer.address);
        let newBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) + BigInt(1e18);
        let expectedNewBalanceContract = BigInt(initialBalanceContract) - BigInt(1e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("1"));

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.true;

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(1);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(deployer.address);
        expect(order1.quantity).to.equal(parseEther("1"));
        expect(order1.amountFilled).to.equal(0);
    });

    it("buy queue and higher amount than quantity; buy", async () => {
        let tx = await tradegenToken.approve(executionPriceAddress, parseEther("2"));
        await tx.wait();

        let tx2 = await tradegenToken.transfer(executionPriceAddress, parseEther("2"));
        await tx2.wait();

        let tx3 = await executionPrice.append(deployer.address, parseEther("2"));
        await tx3.wait();

        let initialBalanceUser = await tradegenToken.balanceOf(deployer.address);
        let initialBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);

        let tx4 = await executionPrice.updateOrder(parseEther("4"), true);
        await tx4.wait();

        let newBalanceUser = await tradegenToken.balanceOf(deployer.address);
        let newBalanceContract = await tradegenToken.balanceOf(executionPriceAddress);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) - BigInt(2e18);
        let expectedNewBalanceContract = BigInt(initialBalanceContract) + BigInt(2e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("4"));

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.true;

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(1);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(deployer.address);
        expect(order1.quantity).to.equal(parseEther("4"));
        expect(order1.amountFilled).to.equal(0);
    });

    it("sell queue and lower amount than filled; sell", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await liquidityBond.testMint(deployer.address, parseEther("10"));
        await tx2.wait();

        let tx3 = await liquidityBond.approve(executionPriceAddress, parseEther("2"));
        await tx3.wait();

        let tx4 = await executionPrice.append(deployer.address, parseEther("2"));
        await tx4.wait();

        let tx5 = await executionPrice.setOrder(1, deployer.address, parseEther("2"), parseEther("1.5"));
        await tx5.wait();

        let tx6 = await executionPrice.setNumberOfTokensAvailable(parseEther("0.5"));
        await tx6.wait();

        let initialBalanceUser = await liquidityBond.balanceOf(deployer.address);

        let tx7 = await executionPrice.updateOrder(parseEther("1"), false);
        await tx7.wait();

        let newBalanceUser = await liquidityBond.balanceOf(deployer.address);
        let expectedNewBalanceUser = BigInt(initialBalanceUser);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(0);

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.false;

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(1);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(deployer.address);
        expect(order1.quantity).to.equal(parseEther("1.5"));
        expect(order1.amountFilled).to.equal(parseEther("1.5"));
    });

    it("sell queue and lower amount than quantity; sell", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await liquidityBond.testMint(deployer.address, parseEther("10"));
        await tx2.wait();

        let tx3 = await liquidityBond.approve(executionPriceAddress, parseEther("2"));
        await tx3.wait();

        let tx4 = await liquidityBond.transfer(executionPriceAddress, parseEther("2"));
        await tx4.wait();

        let tx5 = await executionPrice.append(deployer.address, parseEther("2"));
        await tx5.wait();

        let initialBalanceUser = await liquidityBond.balanceOf(deployer.address);
        let initialBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);

        let tx6 = await executionPrice.updateOrder(parseEther("1"), false);
        await tx6.wait();

        let newBalanceUser = await liquidityBond.balanceOf(deployer.address);
        let newBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) + BigInt(1e18);
        let expectedNewBalanceContract = BigInt(initialBalanceContract) - BigInt(1e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("1"));

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.false;

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(1);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(deployer.address);
        expect(order1.quantity).to.equal(parseEther("1"));
        expect(order1.amountFilled).to.equal(0);
    });

    it("sell queue and higher amount than quantity; sell", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await liquidityBond.testMint(deployer.address, parseEther("10"));
        await tx2.wait();

        let tx3 = await liquidityBond.approve(executionPriceAddress, parseEther("2"));
        await tx3.wait();

        let tx4 = await liquidityBond.transfer(executionPriceAddress, parseEther("2"));
        await tx4.wait();

        let tx5 = await executionPrice.append(deployer.address, parseEther("2"));
        await tx5.wait();

        let initialBalanceUser = await liquidityBond.balanceOf(deployer.address);
        let initialBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);

        let tx6 = await executionPrice.updateOrder(parseEther("4"), false);
        await tx6.wait();

        let newBalanceUser = await liquidityBond.balanceOf(deployer.address);
        let newBalanceContract = await liquidityBond.balanceOf(executionPriceAddress);
        let expectedNewBalanceUser = BigInt(initialBalanceUser) - BigInt(2e18);
        let expectedNewBalanceContract = BigInt(initialBalanceContract) + BigInt(2e18);
        expect(newBalanceUser.toString()).to.equal(expectedNewBalanceUser.toString());
        expect(newBalanceContract.toString()).to.equal(expectedNewBalanceContract.toString());

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("4"));

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.false;

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(1);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(2);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(1);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(deployer.address);
        expect(order1.quantity).to.equal(parseEther("4"));
        expect(order1.amountFilled).to.equal(0);
    });

    it("sell queue and buy; no existing buy orders", async () => {
        let tx = await executionPrice.setIsBuyQueue(false);
        await tx.wait();

        let tx2 = await liquidityBond.testMint(deployer.address, parseEther("10"));
        await tx2.wait();

        let tx3 = await liquidityBond.approve(executionPriceAddress, parseEther("2"));
        await tx3.wait();

        let tx4 = await liquidityBond.transfer(executionPriceAddress, parseEther("2"));
        await tx4.wait();

        let tx5 = await tradegenToken.approve(executionPriceAddress, parseEther("1"));
        await tx5.wait();

        let tx6 = await executionPrice.append(deployer.address, parseEther("2"));
        await tx6.wait();

        let initialBalanceUserBondToken = await liquidityBond.balanceOf(deployer.address);
        let initialBalanceContractBondToken = await liquidityBond.balanceOf(executionPriceAddress);
        let initialBalanceUserTGEN = await tradegenToken.balanceOf(deployer.address);

        let tx7 = await executionPrice.updateOrder(parseEther("1"), true);
        await tx7.wait();

        let newBalanceUserBondToken = await liquidityBond.balanceOf(deployer.address);
        let newBalanceContractBondToken = await liquidityBond.balanceOf(executionPriceAddress);
        let newBalanceUserTGEN = await tradegenToken.balanceOf(deployer.address);
        let expectedNewBalanceUserBondToken = BigInt(initialBalanceUserBondToken) + BigInt(2e18);
        let expectedNewBalanceContractBondToken = BigInt(initialBalanceContractBondToken) - BigInt(2e18);
        let expectedNewBalanceUserTGEN = BigInt(initialBalanceUserTGEN) - BigInt(1e18);
        expect(newBalanceUserBondToken.toString()).to.equal(expectedNewBalanceUserBondToken.toString());
        expect(newBalanceContractBondToken.toString()).to.equal(expectedNewBalanceContractBondToken.toString());
        expect(newBalanceUserTGEN.toString()).to.equal(expectedNewBalanceUserTGEN.toString());

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("1"));

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.true;

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(2);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(3);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(2);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(deployer.address);
        expect(order1.quantity).to.equal(0);
        expect(order1.amountFilled).to.equal(0);

        let order2 = await executionPrice.orderBook(2);
        expect(order2.user).to.equal(deployer.address);
        expect(order2.quantity).to.equal(parseEther("1"));
        expect(order2.amountFilled).to.equal(0);
    });*/

    it("buy queue and sell; no existing sell orders", async () => {
        let tx = await liquidityBond.testMint(deployer.address, parseEther("10"));
        await tx.wait();

        let tx2 = await liquidityBond.approve(executionPriceAddress, parseEther("2"));
        await tx2.wait();

        let tx3 = await tradegenToken.transfer(executionPriceAddress, parseEther("2"));
        await tx3.wait();

        let tx4 = await liquidityBond.approve(executionPriceAddress, parseEther("1"));
        await tx4.wait();

        let tx5 = await executionPrice.append(deployer.address, parseEther("2"));
        await tx5.wait();

        let initialBalanceUserBondToken = await liquidityBond.balanceOf(deployer.address);
        let initialBalanceContractTGEN = await tradegenToken.balanceOf(executionPriceAddress);
        let initialBalanceUserTGEN = await tradegenToken.balanceOf(deployer.address);

        let tx6 = await executionPrice.updateOrder(parseEther("1"), false);
        await tx6.wait();

        let newBalanceUserBondToken = await liquidityBond.balanceOf(deployer.address);
        let newBalanceContractTGEN = await tradegenToken.balanceOf(executionPriceAddress);
        let newBalanceUserTGEN = await tradegenToken.balanceOf(deployer.address);
        let expectedNewBalanceUserBondToken = BigInt(initialBalanceUserBondToken) - BigInt(1e18);
        let expectedNewBalanceContractTGEN = BigInt(initialBalanceContractTGEN) - BigInt(2e18);
        let expectedNewBalanceUserTGEN = BigInt(initialBalanceUserTGEN) + BigInt(2e18);
        expect(newBalanceUserBondToken.toString()).to.equal(expectedNewBalanceUserBondToken.toString());
        expect(newBalanceContractTGEN.toString()).to.equal(expectedNewBalanceContractTGEN.toString());
        expect(newBalanceUserTGEN.toString()).to.equal(expectedNewBalanceUserTGEN.toString());

        let numberOfTokensAvailable = await executionPrice.numberOfTokensAvailable();
        expect(numberOfTokensAvailable).to.equal(parseEther("1"));

        let isBuyQueue = await executionPrice.isBuyQueue();
        expect(isBuyQueue).to.be.false;

        let startIndex = await executionPrice.startIndex();
        expect(startIndex).to.equal(2);

        let endIndex = await executionPrice.endIndex();
        expect(endIndex).to.equal(3);

        let orderIndexUser = await executionPrice.orderIndex(deployer.address);
        expect(orderIndexUser).to.equal(2);

        let order1 = await executionPrice.orderBook(1);
        expect(order1.user).to.equal(deployer.address);
        expect(order1.quantity).to.equal(0);
        expect(order1.amountFilled).to.equal(0);

        let order2 = await executionPrice.orderBook(2);
        expect(order2.user).to.equal(deployer.address);
        expect(order2.quantity).to.equal(parseEther("1"));
        expect(order2.amountFilled).to.equal(0);
    });
  });
});