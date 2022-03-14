const { expect } = require("chai");
const { parseEther } = require("@ethersproject/units");
/*
describe("UbeswapPathManager", () => {
  let deployer;
  let otherUser;

  let testToken1;
  let testTokenAddress1;
  let testToken2;
  let testTokenAddress2;
  let TestTokenFactory;
  
  let pathManager;
  let pathManagerAddress;
  let PathManagerFactory;
  
  before(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    otherUser = signers[1];

    TestTokenFactory = await ethers.getContractFactory('TestTokenERC20');
    PathManagerFactory = await ethers.getContractFactory('UbeswapPathManager');

    testToken1 = await TestTokenFactory.deploy("Test token", "TEST");
    await testToken1.deployed();
    testTokenAddress1 = testToken1.address;

    testToken2 = await TestTokenFactory.deploy("Test token", "TEST");
    await testToken2.deployed();
    testTokenAddress2 = testToken2.address;
  });

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    otherUser = signers[1];

    pathManager = await PathManagerFactory.deploy();
    await pathManager.deployed();
    pathManagerAddress = pathManager.address;
  });
  
  describe("#setPath", () => {
    it("only owner", async () => {
        let tx = pathManager.connect(otherUser).setPath(testTokenAddress1, testTokenAddress2, [testTokenAddress1, testTokenAddress2]);
        await expect(tx).to.be.reverted;

        let path = pathManager.getPath(testTokenAddress1, testTokenAddress2);
        await expect(path).to.be.reverted;
    });

    it("length less than 2", async () => {
        let tx = pathManager.setPath(testTokenAddress1, testTokenAddress2, [testTokenAddress1]);
        await expect(tx).to.be.reverted;

        let path = pathManager.getPath(testTokenAddress1, testTokenAddress2);
        await expect(path).to.be.reverted;
    });

    it("first asset not 'from asset'", async () => {
        let tx = pathManager.setPath(testTokenAddress2, testTokenAddress1, [testTokenAddress1, testTokenAddress1]);
        await expect(tx).to.be.reverted;

        let path = pathManager.getPath(testTokenAddress1, testTokenAddress2);
        await expect(path).to.be.reverted;
    });

    it("last asset not 'from asset'", async () => {
        let tx = pathManager.setPath(testTokenAddress2, testTokenAddress1, [testTokenAddress2, testTokenAddress2, testTokenAddress2]);
        await expect(tx).to.be.reverted;

        let path = pathManager.getPath(testTokenAddress1, testTokenAddress2);
        await expect(path).to.be.reverted;
    });

    it("meets requirements", async () => {
        let tx = await pathManager.setPath(testTokenAddress1, testTokenAddress2, [testTokenAddress1, testTokenAddress2]);
        await tx.wait();

        let path = await pathManager.getPath(testTokenAddress1, testTokenAddress2);
        expect(path.length).to.equal(2);
        expect(path[0]).to.equal(testTokenAddress1);
        expect(path[1]).to.equal(testTokenAddress2);
    });
  });
});*/