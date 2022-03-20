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

    executionPriceFactory = await ExecutionPriceFactoryFactory.deploy(tradegenTokenAddress, pairDataAddress, pairDataAddress, mockCELOAddress);
    await executionPriceFactory.deployed();
    executionPriceFactoryAddress = executionPriceFactory.address;

    // Use deployer.address as factory.
    priceManager = await PriceManagerFactory.deploy(executionPriceFactoryAddress);
    await priceManager.deployed();
    priceManagerAddress = priceManager.address;

    marketplace = await MarketplaceFactory.deploy(priceManagerAddress, tradegenTokenAddress, pairDataAddress);
    await marketplace.deployed();
    marketplaceAddress = marketplace.address;

    let tx = await executionPriceFactory.setPriceManager(priceManagerAddress);
    await tx.wait();
  });
  /*
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

  describe("#createListing", () => {
    it("don't own NFT", async () => {
        let tx = await priceManager.setFactory(deployer.address);
        await tx.wait();

        let tx2 = await priceManager.register(1, otherUser.address, pairDataAddress, parseEther("1"));
        await tx2.wait();

        let tx3 = marketplace.createListing(1, parseEther("10"));
        await expect(tx3).to.be.reverted;

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(0);

        let listingIndex = await marketplace.listingIndexes(1);
        expect(listingIndex).to.equal(0);

        let balance = await priceManager.balanceOf(otherUser.address, 1);
        expect(balance).to.equal(1);
    });

    it("meets requirements; no existing listings", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(1);

        let listingIndex = await marketplace.listingIndexes(1);
        expect(listingIndex).to.equal(1);

        let balanceDeployer = await priceManager.balanceOf(deployer.address, 1);
        expect(balanceDeployer).to.equal(0);

        let balanceMarketplace = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(balanceMarketplace).to.equal(1);

        let userToID = await marketplace.userToID(deployer.address, 1);
        expect(userToID).to.equal(1);

        let listing = await marketplace.marketplaceListings(1);
        expect(listing.seller).to.equal(deployer.address);
        expect(listing.exists).to.be.true;
        expect(listing.ID).to.equal(1);
        expect(listing.price).to.equal(parseEther("10"));
    });

    it("already have listing for same NFT", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();

        let tx5 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx5.wait();

        let tx6 = marketplace.createListing(1, parseEther("10"));
        await expect(tx6).to.be.reverted;

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(1);

        let listingIndex = await marketplace.listingIndexes(1);
        expect(listingIndex).to.equal(1);

        let balanceDeployer = await priceManager.balanceOf(deployer.address, 1);
        expect(balanceDeployer).to.equal(0);

        let balanceMarketplace = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(balanceMarketplace).to.equal(1);

        let userToID = await marketplace.userToID(deployer.address, 1);
        expect(userToID).to.equal(1);

        let listing = await marketplace.marketplaceListings(1);
        expect(listing.seller).to.equal(deployer.address);
        expect(listing.exists).to.be.true;
        expect(listing.ID).to.equal(1);
        expect(listing.price).to.equal(parseEther("10"));
    });

    it("existing listing from same user", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();

        let tx5 = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx5.wait();

        let tx6 = await executionPriceFactory.purchase(2, 25, 150, parseEther("50"));
        await tx6.wait();

        let tx7 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx7.wait();

        let tx8 = await marketplace.createListing(2, parseEther("20"));
        await tx8.wait();

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(2);

        let listingIndex1 = await marketplace.listingIndexes(1);
        expect(listingIndex1).to.equal(1);

        let listingIndex2 = await marketplace.listingIndexes(2);
        expect(listingIndex2).to.equal(2);

        let balanceDeployer1 = await priceManager.balanceOf(deployer.address, 1);
        expect(balanceDeployer1).to.equal(0);

        let balanceDeployer2 = await priceManager.balanceOf(deployer.address, 2);
        expect(balanceDeployer2).to.equal(0);

        let balanceMarketplace1 = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(balanceMarketplace1).to.equal(1);

        let balanceMarketplace2 = await priceManager.balanceOf(marketplaceAddress, 2);
        expect(balanceMarketplace2).to.equal(1);

        let userToID1 = await marketplace.userToID(deployer.address, 1);
        expect(userToID1).to.equal(1);

        let userToID2 = await marketplace.userToID(deployer.address, 2);
        expect(userToID2).to.equal(2);

        let listing1 = await marketplace.marketplaceListings(1);
        expect(listing1.seller).to.equal(deployer.address);
        expect(listing1.exists).to.be.true;
        expect(listing1.ID).to.equal(1);
        expect(listing1.price).to.equal(parseEther("10"));

        let listing2 = await marketplace.marketplaceListings(2);
        expect(listing2.seller).to.equal(deployer.address);
        expect(listing2.exists).to.be.true;
        expect(listing2.ID).to.equal(2);
        expect(listing2.price).to.equal(parseEther("20"));
    });

    it("existing listing from different user", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();

        let tx5 = await mockCELO.transfer(otherUser.address, parseEther("100"));
        await tx5.wait();

        let tx6 = await mockCELO.connect(otherUser).approve(executionPriceFactoryAddress, parseEther("100"));
        await tx6.wait();

        let tx7 = await executionPriceFactory.connect(otherUser).purchase(2, 25, 150, parseEther("50"));
        await tx7.wait();

        let tx8 = await priceManager.connect(otherUser).setApprovalForAll(marketplaceAddress, true);
        await tx8.wait();

        let tx9 = await marketplace.connect(otherUser).createListing(2, parseEther("20"));
        await tx9.wait();

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(2);

        let listingIndex1 = await marketplace.listingIndexes(1);
        expect(listingIndex1).to.equal(1);

        let listingIndex2 = await marketplace.listingIndexes(2);
        expect(listingIndex2).to.equal(2);

        let balanceDeployer1 = await priceManager.balanceOf(deployer.address, 1);
        expect(balanceDeployer1).to.equal(0);

        let balanceOther2 = await priceManager.balanceOf(otherUser.address, 2);
        expect(balanceOther2).to.equal(0);

        let balanceMarketplace1 = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(balanceMarketplace1).to.equal(1);

        let balanceMarketplace2 = await priceManager.balanceOf(marketplaceAddress, 2);
        expect(balanceMarketplace2).to.equal(1);

        let userToID1 = await marketplace.userToID(deployer.address, 1);
        expect(userToID1).to.equal(1);

        let userToID2 = await marketplace.userToID(otherUser.address, 2);
        expect(userToID2).to.equal(2);

        let userToID3 = await marketplace.userToID(deployer.address, 2);
        expect(userToID3).to.equal(0);

        let listing1 = await marketplace.marketplaceListings(1);
        expect(listing1.seller).to.equal(deployer.address);
        expect(listing1.exists).to.be.true;
        expect(listing1.ID).to.equal(1);
        expect(listing1.price).to.equal(parseEther("10"));

        let listing2 = await marketplace.marketplaceListings(2);
        expect(listing2.seller).to.equal(otherUser.address);
        expect(listing2.exists).to.be.true;
        expect(listing2.ID).to.equal(2);
        expect(listing2.price).to.equal(parseEther("20"));
    });
  });

  describe("#updatePrice", () => {
    it("not seller", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();

        let tx5 = marketplace.connect(otherUser).updatePrice(1, parseEther("20"));
        await expect(tx5).to.be.reverted;

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(1);

        let listingIndex = await marketplace.listingIndexes(1);
        expect(listingIndex).to.equal(1);

        let balanceDeployer = await priceManager.balanceOf(deployer.address, 1);
        expect(balanceDeployer).to.equal(0);

        let balanceMarketplace = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(balanceMarketplace).to.equal(1);

        let userToID = await marketplace.userToID(deployer.address, 1);
        expect(userToID).to.equal(1);

        let listing = await marketplace.marketplaceListings(1);
        expect(listing.seller).to.equal(deployer.address);
        expect(listing.exists).to.be.true;
        expect(listing.ID).to.equal(1);
        expect(listing.price).to.equal(parseEther("10"));
    });

    it("index out of range", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();

        let tx5 = marketplace.updatePrice(10, parseEther("20"));
        await expect(tx5).to.be.reverted;

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(1);

        let listingIndex = await marketplace.listingIndexes(1);
        expect(listingIndex).to.equal(1);

        let balanceDeployer = await priceManager.balanceOf(deployer.address, 1);
        expect(balanceDeployer).to.equal(0);

        let balanceMarketplace = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(balanceMarketplace).to.equal(1);

        let userToID = await marketplace.userToID(deployer.address, 1);
        expect(userToID).to.equal(1);

        let listing = await marketplace.marketplaceListings(1);
        expect(listing.seller).to.equal(deployer.address);
        expect(listing.exists).to.be.true;
        expect(listing.ID).to.equal(1);
        expect(listing.price).to.equal(parseEther("10"));
    });

    it("meets requirements", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();

        let tx5 = await marketplace.updatePrice(1, parseEther("20"));
        await tx5.wait();

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(1);

        let listingIndex = await marketplace.listingIndexes(1);
        expect(listingIndex).to.equal(1);

        let balanceDeployer = await priceManager.balanceOf(deployer.address, 1);
        expect(balanceDeployer).to.equal(0);

        let balanceMarketplace = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(balanceMarketplace).to.equal(1);

        let userToID = await marketplace.userToID(deployer.address, 1);
        expect(userToID).to.equal(1);

        let listing = await marketplace.marketplaceListings(1);
        expect(listing.seller).to.equal(deployer.address);
        expect(listing.exists).to.be.true;
        expect(listing.ID).to.equal(1);
        expect(listing.price).to.equal(parseEther("20"));
    });
  });

  describe("#removeListing", () => {
    it("not seller", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();

        let tx5 = marketplace.connect(otherUser).removeListing(1);
        await expect(tx5).to.be.reverted;

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(1);

        let listingIndex = await marketplace.listingIndexes(1);
        expect(listingIndex).to.equal(1);

        let balanceDeployer = await priceManager.balanceOf(deployer.address, 1);
        expect(balanceDeployer).to.equal(0);

        let balanceMarketplace = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(balanceMarketplace).to.equal(1);

        let userToID = await marketplace.userToID(deployer.address, 1);
        expect(userToID).to.equal(1);

        let listing = await marketplace.marketplaceListings(1);
        expect(listing.seller).to.equal(deployer.address);
        expect(listing.exists).to.be.true;
        expect(listing.ID).to.equal(1);
        expect(listing.price).to.equal(parseEther("10"));
    });

    it("index out of range", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();

        let tx5 = marketplace.removeListing(10);
        await expect(tx5).to.be.reverted;

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(1);

        let listingIndex = await marketplace.listingIndexes(1);
        expect(listingIndex).to.equal(1);

        let balanceDeployer = await priceManager.balanceOf(deployer.address, 1);
        expect(balanceDeployer).to.equal(0);

        let balanceMarketplace = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(balanceMarketplace).to.equal(1);

        let userToID = await marketplace.userToID(deployer.address, 1);
        expect(userToID).to.equal(1);

        let listing = await marketplace.marketplaceListings(1);
        expect(listing.seller).to.equal(deployer.address);
        expect(listing.exists).to.be.true;
        expect(listing.ID).to.equal(1);
        expect(listing.price).to.equal(parseEther("10"));
    });

    it("meets requirements", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();

        let initialBalanceUser = await priceManager.balanceOf(deployer.address, 1);
        let initialBalanceMarketplace = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(initialBalanceUser).to.equal(0);
        expect(initialBalanceMarketplace).to.equal(1);

        let tx5 = await marketplace.removeListing(1);
        await tx5.wait();

        let newBalanceUser = await priceManager.balanceOf(deployer.address, 1);
        let newBalanceMarketplace = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(newBalanceUser).to.equal(1);
        expect(newBalanceMarketplace).to.equal(0);

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(1);

        let listingIndex = await marketplace.listingIndexes(1);
        expect(listingIndex).to.equal(1);

        let userToID = await marketplace.userToID(deployer.address, 1);
        expect(userToID).to.equal(0);

        let listing = await marketplace.marketplaceListings(1);
        expect(listing.seller).to.equal(deployer.address);
        expect(listing.exists).to.be.false;
        expect(listing.ID).to.equal(1);
        expect(listing.price).to.equal(parseEther("10"));
    });

    it("remove and create again", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();

        let initialBalanceUser = await priceManager.balanceOf(deployer.address, 1);
        let initialBalanceMarketplace = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(initialBalanceUser).to.equal(0);
        expect(initialBalanceMarketplace).to.equal(1);

        let tx5 = await marketplace.removeListing(1);
        await tx5.wait();

        let tx6 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx6.wait();

        let tx7 = await marketplace.createListing(1, parseEther("20"));
        await tx7.wait();

        let newBalanceUser = await priceManager.balanceOf(deployer.address, 1);
        let newBalanceMarketplace = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(newBalanceUser).to.equal(initialBalanceUser);
        expect(newBalanceMarketplace).to.equal(initialBalanceMarketplace);

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(2);

        let listingIndex = await marketplace.listingIndexes(1);
        expect(listingIndex).to.equal(2);

        let userToID = await marketplace.userToID(deployer.address, 1);
        expect(userToID).to.equal(2);

        let listing1 = await marketplace.marketplaceListings(1);
        expect(listing1.seller).to.equal(deployer.address);
        expect(listing1.exists).to.be.false;
        expect(listing1.ID).to.equal(1);
        expect(listing1.price).to.equal(parseEther("10"));

        let listing2 = await marketplace.marketplaceListings(2);
        expect(listing2.seller).to.equal(deployer.address);
        expect(listing2.exists).to.be.true;
        expect(listing2.ID).to.equal(1);
        expect(listing2.price).to.equal(parseEther("20"));
    });
  });*/

  describe("#purchase", () => {
    it("index out of range", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();

        let tx5 = await tradegenToken.transfer(otherUser.address, parseEther("10"));
        await tx5.wait();
        
        let tx6 = await tradegenToken.connect(otherUser).approve(marketplaceAddress, parseEther("10"));
        await tx6.wait();

        let initialBalanceTGEN = await tradegenToken.balanceOf(otherUser.address);

        let tx7 = marketplace.connect(otherUser).purchase(10);
        await expect(tx7).to.be.reverted;

        let newBalanceTGEN = await tradegenToken.balanceOf(otherUser.address);
        expect(newBalanceTGEN).to.equal(initialBalanceTGEN);

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(1);

        let listingIndex = await marketplace.listingIndexes(1);
        expect(listingIndex).to.equal(1);

        let balanceDeployer = await priceManager.balanceOf(deployer.address, 1);
        expect(balanceDeployer).to.equal(0);

        let balanceMarketplace = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(balanceMarketplace).to.equal(1);

        let userToID = await marketplace.userToID(deployer.address, 1);
        expect(userToID).to.equal(1);

        let listing = await marketplace.marketplaceListings(1);
        expect(listing.seller).to.equal(deployer.address);
        expect(listing.exists).to.be.true;
        expect(listing.ID).to.equal(1);
        expect(listing.price).to.equal(parseEther("10"));
    });

    it("listing doesn't exist", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();

        let tx5 = await marketplace.removeListing(1);
        await tx5.wait();

        let tx6 = await tradegenToken.transfer(otherUser.address, parseEther("10"));
        await tx6.wait();
        
        let tx7 = await tradegenToken.connect(otherUser).approve(marketplaceAddress, parseEther("10"));
        await tx7.wait();

        let initialBalanceTGEN = await tradegenToken.balanceOf(otherUser.address);

        let tx8 = marketplace.connect(otherUser).purchase(1);
        await expect(tx8).to.be.reverted;

        let newBalanceTGEN = await tradegenToken.balanceOf(otherUser.address);
        expect(newBalanceTGEN).to.equal(initialBalanceTGEN);

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(1);

        let listingIndex = await marketplace.listingIndexes(1);
        expect(listingIndex).to.equal(1);

        let balanceDeployer = await priceManager.balanceOf(deployer.address, 1);
        expect(balanceDeployer).to.equal(1);

        let balanceMarketplace = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(balanceMarketplace).to.equal(0);

        let userToID = await marketplace.userToID(deployer.address, 1);
        expect(userToID).to.equal(0);

        let listing = await marketplace.marketplaceListings(1);
        expect(listing.seller).to.equal(deployer.address);
        expect(listing.exists).to.be.false;
        expect(listing.ID).to.equal(1);
        expect(listing.price).to.equal(parseEther("10"));
    });

    it("can't purchase your own position", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();
        
        let tx5 = await tradegenToken.approve(marketplaceAddress, parseEther("10"));
        await tx5.wait();

        let initialBalanceTGEN = await tradegenToken.balanceOf(otherUser.address);

        let tx6 = marketplace.purchase(1);
        await expect(tx6).to.be.reverted;

        let newBalanceTGEN = await tradegenToken.balanceOf(otherUser.address);
        expect(newBalanceTGEN).to.equal(initialBalanceTGEN);

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(1);

        let listingIndex = await marketplace.listingIndexes(1);
        expect(listingIndex).to.equal(1);

        let balanceDeployer = await priceManager.balanceOf(deployer.address, 1);
        expect(balanceDeployer).to.equal(0);

        let balanceMarketplace = await priceManager.balanceOf(marketplaceAddress, 1);
        expect(balanceMarketplace).to.equal(1);

        let userToID = await marketplace.userToID(deployer.address, 1);
        expect(userToID).to.equal(1);

        let listing = await marketplace.marketplaceListings(1);
        expect(listing.seller).to.equal(deployer.address);
        expect(listing.exists).to.be.true;
        expect(listing.ID).to.equal(1);
        expect(listing.price).to.equal(parseEther("10"));
    });

    it("meets requirements", async () => {
        let tx = await mockCELO.approve(executionPriceFactoryAddress, parseEther("100"));
        await tx.wait();

        let tx2 = await executionPriceFactory.purchase(1, 20, 100, parseEther("50"));
        await tx2.wait();

        let tx3 = await priceManager.setApprovalForAll(marketplaceAddress, true);
        await tx3.wait();

        let tx4 = await marketplace.createListing(1, parseEther("10"));
        await tx4.wait();

        let tx5 = await tradegenToken.transfer(otherUser.address, parseEther("10"));
        await tx5.wait();
        
        let tx6 = await tradegenToken.connect(otherUser).approve(marketplaceAddress, parseEther("10"));
        await tx6.wait();

        let initialBalanceUserTGEN = await tradegenToken.balanceOf(otherUser.address);
        let initialBalanceSellerTGEN = await tradegenToken.balanceOf(deployer.address);
        let initialBalanceStakingTGEN = await tradegenToken.balanceOf(pairDataAddress);

        let tx8 = await marketplace.connect(otherUser).purchase(1);
        await tx8.wait();

        let newBalanceUserTGEN = await tradegenToken.balanceOf(otherUser.address);
        let newBalanceSellerTGEN = await tradegenToken.balanceOf(deployer.address);
        let newBalanceStakingTGEN = await tradegenToken.balanceOf(pairDataAddress);
        let newBalanceUserNFT = await priceManager.balanceOf(otherUser.address, 1);
        let newBalanceMarketplaceNFT = await priceManager.balanceOf(marketplaceAddress, 1);
        let expectedNewBalanceUserTGEN = BigInt(initialBalanceUserTGEN) - BigInt(10e18);
        let expectedNewBalanceSellerTGEN = BigInt(initialBalanceSellerTGEN) + BigInt(9.8e18);
        let expectedNewBalanceStakingTGEN = BigInt(initialBalanceStakingTGEN) + BigInt(0.2e18);
        expect(newBalanceUserTGEN.toString()).to.equal(expectedNewBalanceUserTGEN.toString());
        expect(newBalanceSellerTGEN.toString()).to.equal(expectedNewBalanceSellerTGEN.toString());
        expect(newBalanceStakingTGEN.toString()).to.equal(expectedNewBalanceStakingTGEN.toString());
        expect(newBalanceUserNFT).to.equal(1);
        expect(newBalanceMarketplaceNFT).to.equal(0);

        let numberOfMarketplaceListings = await marketplace.numberOfMarketplaceListings();
        expect(numberOfMarketplaceListings).to.equal(1);

        let listingIndex = await marketplace.listingIndexes(1);
        expect(listingIndex).to.equal(1);

        let userToID = await marketplace.userToID(deployer.address, 1);
        expect(userToID).to.equal(0);

        let listing = await marketplace.marketplaceListings(1);
        expect(listing.seller).to.equal(deployer.address);
        expect(listing.exists).to.be.false;
        expect(listing.ID).to.equal(1);
        expect(listing.price).to.equal(parseEther("10"));
    });
  });
});