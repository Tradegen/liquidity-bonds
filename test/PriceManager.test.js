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
    // Use pairDataAddress2 as mock marketplace.
    priceManager = await PriceManagerFactory.deploy(tradegenTokenAddress, pairDataAddress, pairDataAddress2, mockCELOAddress);
    await priceManager.deployed();
    priceManagerAddress = priceManager.address;
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
  });*/
});