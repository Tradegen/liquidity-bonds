const { expect } = require("chai");
const { parseEther } = require("@ethersproject/units");

describe("ExecutionPriceFactory", () => {
  let deployer;
  let otherUser;

  let tradegenToken;
  let tradegenTokenAddress;
  let mockCELO;
  let mockCELOAddress;
  let TestTokenFactory;

  let executionPrice;
  let executionPriceAddress;
  let ExecutionPriceFactory;

  let pairData;
  let pairDataAddress;
  let PairDataFactory;

  let executionPriceFactory;
  let executionPriceFactoryAddress;
  let ExecutionPriceFactoryFactory;

  let priceManager;
  let priceManagerAddress;
  let PriceManagerFactory;
  
  before(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    otherUser = signers[1];

    TestTokenFactory = await ethers.getContractFactory('TestTokenERC20');
    ExecutionPriceFactory = await ethers.getContractFactory('TestExecutionPrice');
    PairDataFactory = await ethers.getContractFactory('PairData');
    ExecutionPriceFactoryFactory = await ethers.getContractFactory('ExecutionPriceFactory');
    PriceManagerFactory = await ethers.getContractFactory('TestPriceManager');

    pairData = await PairDataFactory.deploy();
    await pairData.deployed();
    pairDataAddress = pairData.address;

    tradegenToken = await TestTokenFactory.deploy("Test TGEN", "TGEN");
    await tradegenToken.deployed();
    tradegenTokenAddress = tradegenToken.address;

    mockCELO = await TestTokenFactory.deploy("Test CELO", "CELO");
    await mockCELO.deployed();
    mockCELOAddress = mockCELO.address;
  });

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    otherUser = signers[1];

    executionPriceFactory = await ExecutionPriceFactoryFactory.deploy(tradegenTokenAddress, pairDataAddress, pairDataAddress, mockCELOAddress);
    await executionPriceFactory.deployed();
    executionPriceFactoryAddress = executionPriceFactory.address;

    priceManager = await PriceManagerFactory.deploy(executionPriceFactoryAddress);
    await priceManager.deployed();
    priceManagerAddress = priceManager.address;

    let tx = await executionPriceFactory.setPriceManager(priceManagerAddress);
    await tx.wait();
  });
  /*
  describe("#purchase", () => {
    it("index out of range", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = executionPriceFactory.purchase(100000, 20, 100, parseEther("100"));
        await expect(tx2).to.be.reverted;

        let numberOfMints = await priceManager.numberOfMints();
        expect(numberOfMints).to.equal(0);

        let index = await priceManager.reverseLookup(pairDataAddress)
        expect(index).to.equal(0);

        let balance = await priceManager.balanceOf(deployer.address, 1);
        expect(balance).to.equal(0);

        let executionPriceInfo = await priceManager.executionPrices(1);
        expect(executionPriceInfo.owner).to.equal("0x0000000000000000000000000000000000000000");
        expect(executionPriceInfo.contractAddress).to.equal("0x0000000000000000000000000000000000000000");
        expect(executionPriceInfo.index).to.equal(0);
        expect(executionPriceInfo.price).to.equal(0);
    });

    it("meets requirements; no existing NFTs purchased", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(11, 20, 100, parseEther("50"));
        await tx2.wait();

        let numberOfMints = await priceManager.numberOfMints();
        expect(numberOfMints).to.equal(1);

        let balance = await priceManager.balanceOf(deployer.address, 11);
        expect(balance).to.equal(1);

        let executionPriceInfo = await priceManager.executionPrices(11);
        expect(executionPriceInfo.owner).to.equal(deployer.address);
        expect(executionPriceInfo.index).to.equal(11);
        expect(executionPriceInfo.price).to.equal(parseEther("1.1046"));

        let deployedAddress = executionPriceInfo.contractAddress;
        executionPrice = ExecutionPriceFactory.attach(deployedAddress);

        let price = await executionPrice.price();
        expect(price).to.equal(parseEther("1.1046"));

        let maximumNumberOfInvestors = await executionPrice.maximumNumberOfInvestors();
        expect(maximumNumberOfInvestors).to.equal(20);

        let owner = await executionPrice.owner();
        expect(owner).to.equal(deployer.address);

        let tradingFee = await executionPrice.tradingFee();
        expect(tradingFee).to.equal(100);

        let minimumOrderSize = await executionPrice.minimumOrderSize();
        expect(minimumOrderSize).to.equal(parseEther("50"));
    });

    it("already minted", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(11, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = executionPriceFactory.purchase(11, 20, 100, parseEther("50"));
        await expect(tx3).to.be.reverted;

        let numberOfMints = await priceManager.numberOfMints();
        expect(numberOfMints).to.equal(1);

        let balance = await priceManager.balanceOf(deployer.address, 11);
        expect(balance).to.equal(1);

        let executionPriceInfo = await priceManager.executionPrices(11);
        expect(executionPriceInfo.owner).to.equal(deployer.address);
        expect(executionPriceInfo.index).to.equal(11);
        expect(executionPriceInfo.price).to.equal(parseEther("1.1046"));
    });

    it("meets requirements; purchase multiple NFTs", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(11, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx3.wait();

        let tx4 = await executionPriceFactory.purchase(1, 25, 120, parseEther("10"));
        await tx4.wait();

        let numberOfMints = await priceManager.numberOfMints();
        expect(numberOfMints).to.equal(2);

        let balance11 = await priceManager.balanceOf(deployer.address, 11);
        expect(balance11).to.equal(1);

        let balance1 = await priceManager.balanceOf(deployer.address, 1);
        expect(balance1).to.equal(1);

        let executionPriceInfo11 = await priceManager.executionPrices(11);
        expect(executionPriceInfo11.owner).to.equal(deployer.address);
        expect(executionPriceInfo11.index).to.equal(11);
        expect(executionPriceInfo11.price).to.equal(parseEther("1.1046"));

        let executionPriceInfo1 = await priceManager.executionPrices(1);
        expect(executionPriceInfo1.owner).to.equal(deployer.address);
        expect(executionPriceInfo1.index).to.equal(1);
        expect(executionPriceInfo1.price).to.equal(parseEther("1"));

        let deployedAddress1 = executionPriceInfo11.contractAddress;
        executionPrice = ExecutionPriceFactory.attach(deployedAddress1);

        let price = await executionPrice.price();
        expect(price).to.equal(parseEther("1.1046"));

        let maximumNumberOfInvestors = await executionPrice.maximumNumberOfInvestors();
        expect(maximumNumberOfInvestors).to.equal(20);

        let owner = await executionPrice.owner();
        expect(owner).to.equal(deployer.address);

        let tradingFee = await executionPrice.tradingFee();
        expect(tradingFee).to.equal(100);

        let minimumOrderSize = await executionPrice.minimumOrderSize();
        expect(minimumOrderSize).to.equal(parseEther("50"));

        let deployedAddress2 = executionPriceInfo1.contractAddress;
        executionPrice = ExecutionPriceFactory.attach(deployedAddress2);

        price = await executionPrice.price();
        expect(price).to.equal(parseEther("1"));

        maximumNumberOfInvestors = await executionPrice.maximumNumberOfInvestors();
        expect(maximumNumberOfInvestors).to.equal(25);

        owner = await executionPrice.owner();
        expect(owner).to.equal(deployer.address);

        tradingFee = await executionPrice.tradingFee();
        expect(tradingFee).to.equal(120);

        minimumOrderSize = await executionPrice.minimumOrderSize();
        expect(minimumOrderSize).to.equal(parseEther("10"));
    });
  });*/
});