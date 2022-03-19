const { expect } = require("chai");
const { parseEther } = require("@ethersproject/units");

describe("PriceManager", () => {
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
    PriceManagerFactory = await ethers.getContractFactory('PriceManager');

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

    // Use deployer.address as factory
    priceManager = await PriceManagerFactory.deploy(deployer.address);
    await priceManager.deployed();
    priceManagerAddress = priceManager.address;
  });
  /*
  describe("#safeTransferFrom", () => {
    it("not owner", async () => {
        executionPrice = await ExecutionPriceFactory.deploy(tradegenTokenAddress, pairDataAddress, pairDataAddress, pairDataAddress);
        await executionPrice.deployed();
        executionPriceAddress = executionPrice.address;

        let tx = await executionPrice.setIsInitialized(true);
        await tx.wait();

        let tx2 = await executionPrice.setOwner(otherUser.address);
        await tx2.wait();

        let tx3 = priceManager.safeTransferFrom()
        await expect(tx3).to.be.reverted;
    });
  });*/
  /*
  describe("#calculatePrice", () => {
    it("index > 1000", async () => {
        let price = await priceManager.calculatePrice(2001);
        let expectedPrice = BigInt(parseEther("20959.1556")) * BigInt(209591556) / BigInt(10000);
        expect(price.toString()).to.equal(expectedPrice.toString());

        price = await priceManager.calculatePrice(2201);
        expectedPrice = BigInt(parseEther("20959.1556")) * BigInt(209591556) / BigInt(10000);
        expectedPrice = BigInt(expectedPrice) * BigInt(27048) / BigInt(10000);
        expectedPrice = BigInt(expectedPrice) * BigInt(27048) / BigInt(10000);
        expect(price.toString()).to.equal(expectedPrice.toString());
    });

    it("index > 100", async () => {
        let price = await priceManager.calculatePrice(201);
        let expectedPrice = BigInt(parseEther("2.7048")) * BigInt(27048) / BigInt(10000);
        expect(price.toString()).to.equal(expectedPrice.toString());

        price = await priceManager.calculatePrice(231);
        expectedPrice = BigInt(parseEther("2.7048")) * BigInt(27048) / BigInt(10000);
        expectedPrice = BigInt(expectedPrice) * BigInt(11046) / BigInt(10000);
        expectedPrice = BigInt(expectedPrice) * BigInt(11046) / BigInt(10000);
        expectedPrice = BigInt(expectedPrice) * BigInt(11046) / BigInt(10000);
        expect(price.toString()).to.equal(expectedPrice.toString());
    });

    it("index > 10", async () => {
        let price = await priceManager.calculatePrice(21);
        let expectedPrice = BigInt(parseEther("1.1046")) * BigInt(11046) / BigInt(10000);
        expect(price.toString()).to.equal(expectedPrice.toString());

        price = await priceManager.calculatePrice(24);
        expectedPrice = BigInt(parseEther("1.1046")) * BigInt(11046) / BigInt(10000);
        expectedPrice = BigInt(expectedPrice) * BigInt(101) / BigInt(100);
        expectedPrice = BigInt(expectedPrice) * BigInt(101) / BigInt(100);
        expectedPrice = BigInt(expectedPrice) * BigInt(101) / BigInt(100);
        expect(price.toString()).to.equal(expectedPrice.toString());
    });

    it("index > 1", async () => {
        let price = await priceManager.calculatePrice(5);
        let expectedPrice = BigInt(parseEther("1.01")) * BigInt(101) / BigInt(100);
        expectedPrice = BigInt(expectedPrice) * BigInt(101) / BigInt(100);
        expectedPrice = BigInt(expectedPrice) * BigInt(101) / BigInt(100);
        expect(price.toString()).to.equal(expectedPrice.toString());
    });

    it("index = 999", async () => {
        let price = await priceManager.calculatePrice(1000);
        let expectedPrice = BigInt(parseEther("1")); 
        for (let i = 0; i < 9; i++) {
            expectedPrice = BigInt(expectedPrice) * BigInt(27048) / BigInt(10000);
        }
        for (let i = 0; i < 9; i++) {
            expectedPrice = BigInt(expectedPrice) * BigInt(11046) / BigInt(10000);
        }
        for (let i = 0; i < 9; i++) {
            expectedPrice = BigInt(expectedPrice) * BigInt(101) / BigInt(100);
        }

        expectedPrice = BigInt(expectedPrice) / BigInt(1e15);
        let adjustedPrice = BigInt(price) / BigInt(1e15);

        expect(adjustedPrice.toString()).to.equal(expectedPrice.toString());
    });
  });*/

  describe("#register", () => {
    it("only factory", async () => {
        let tx = priceManager.connect(otherUser).register(1, otherUser.address, pairDataAddress, parseEther("1"));
        await expect(tx).to.be.reverted;

        let numberOfMints = await priceManager.numberOfMints();
        expect(numberOfMints).to.equal(0);

        let index = await priceManager.reverseLookup(pairDataAddress)
        expect(index).to.equal(0);

        let executionPriceInfo = await priceManager.executionPrices(1);
        expect(executionPriceInfo.owner).to.equal("0x0000000000000000000000000000000000000000");
        expect(executionPriceInfo.contractAddress).to.equal("0x0000000000000000000000000000000000000000");
        expect(executionPriceInfo.index).to.equal(0);
        expect(executionPriceInfo.price).to.equal(0);
    });

    it("meets requirements", async () => {
        let tx = await priceManager.register(1, otherUser.address, pairDataAddress, parseEther("1"));
        await tx.wait();

        let numberOfMints = await priceManager.numberOfMints();
        expect(numberOfMints).to.equal(1);

        let index = await priceManager.reverseLookup(pairDataAddress)
        expect(index).to.equal(1);

        let balance = await priceManager.balanceOf(otherUser.address, 1);
        expect(balance).to.equal(1);

        let executionPriceInfo = await priceManager.executionPrices(1);
        expect(executionPriceInfo.owner).to.equal(otherUser.address);
        expect(executionPriceInfo.contractAddress).to.equal(pairDataAddress);
        expect(executionPriceInfo.index).to.equal(1);
        expect(executionPriceInfo.price).to.equal(parseEther("1"));
    });

    it("already minted", async () => {
        let tx = await priceManager.register(1, otherUser.address, pairDataAddress, parseEther("1"));
        await tx.wait();

        let tx2 = priceManager.register(1, otherUser.address, pairDataAddress, parseEther("1"));
        await expect(tx2).to.be.reverted;

        let numberOfMints = await priceManager.numberOfMints();
        expect(numberOfMints).to.equal(1);

        let index = await priceManager.reverseLookup(pairDataAddress)
        expect(index).to.equal(1);

        let balance = await priceManager.balanceOf(otherUser.address, 1);
        expect(balance).to.equal(1);

        let executionPriceInfo = await priceManager.executionPrices(1);
        expect(executionPriceInfo.owner).to.equal(otherUser.address);
        expect(executionPriceInfo.contractAddress).to.equal(pairDataAddress);
        expect(executionPriceInfo.index).to.equal(1);
        expect(executionPriceInfo.price).to.equal(parseEther("1"));
    });
  });
});