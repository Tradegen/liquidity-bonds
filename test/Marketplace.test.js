const { expect } = require("chai");
const { parseEther } = require("@ethersproject/units");

describe("Marketplace", () => {
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

  let marketplace;
  let marketplaceAddress;
  let MarketplaceFactory;
  
  before(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    otherUser = signers[1];

    TestTokenFactory = await ethers.getContractFactory('TestTokenERC20');
    ExecutionPriceFactory = await ethers.getContractFactory('TestExecutionPrice');
    PairDataFactory = await ethers.getContractFactory('PairData');
    ExecutionPriceFactoryFactory = await ethers.getContractFactory('ExecutionPriceFactory');
    PriceManagerFactory = await ethers.getContractFactory('TestPriceManager');
    MarketplaceFactory = await ethers.getContractFactory('Marketplace');

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

    // Use deployer.address as factory.
    priceManager = await PriceManagerFactory.deploy(deployer.address);
    await priceManager.deployed();
    priceManagerAddress = priceManager.address;

    marketplace = await MarketplaceFactory.deploy(priceManagerAddress, tradegenTokenAddress, pairDataAddress);
    await marketplace.deployed();
    marketplaceAddress = marketplace.address;
  });

  describe("#setTransactionFee", () => {
    it("only owner", async () => {
        let tx = marketplace.connect(otherUser).setTransactionFee(100);
        await expect(tx).to.be.reverted;

        let fee = await marketplace.transactionFee();
        expect(fee).to.equal(200);
    });

    it("above max fee", async () => {
        let tx = marketplace.setTransactionFee(5000);
        await expect(tx).to.be.reverted;

        let fee = await marketplace.transactionFee();
        expect(fee).to.equal(200);
    });

    it("meets requirements", async () => {
        let tx = await marketplace.setTransactionFee(100);
        await tx.wait();

        let fee = await marketplace.transactionFee();
        expect(fee).to.equal(100);
    });
  });
});