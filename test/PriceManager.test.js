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
  let pairDataAddress2;
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

    // Use mock CELO as bond token.
    // Use pairDataAddress as mock marketplace.
    // Use pairDataAddress as xTGEN.
    priceManager = await PriceManagerFactory.deploy(tradegenTokenAddress, pairDataAddress, pairDataAddress, mockCELOAddress);
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

  describe("#calculatePrice", () => {
    it("index > 1000", async () => {
        let price = await priceManager.calculatePrice(2000);
        let expectedPrice = BigInt(parseEther("20959.1556")) * BigInt(2);
        expect(price.toString()).to.equal(expectedPrice.toString());
    });
  });
});