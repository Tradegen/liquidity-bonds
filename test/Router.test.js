const { expect } = require("chai");
const { parseEther } = require("@ethersproject/units");
/*
describe("Router", () => {
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
  });
  
  describe("#addLiquidity", () => {
    it("unbalanced amounts", async () => {
        let tx = await tradegenToken.approve(routerAddress, parseEther("1000"));
        await tx.wait();

        let tx2 = await mockCELO.approve(routerAddress, parseEther("10"));
        await tx2.wait();

        let tx3 = await router.addLiquidity(mockCELOAddress, parseEther("10"), parseEther("1000"));
        let temp = await tx3.wait();
        let event = temp.events[13].args;
        expect(event.asset).to.equal(mockCELOAddress);
        expect(event.amountAsset).to.equal(parseEther("10"));
        expect(event.amountTGEN).to.equal(parseEther("1000"));
        expect(event.numberOfLPTokens).to.equal(parseEther("10"));

        let pair = await ubeswapFactory.getPair(tradegenTokenAddress, mockCELOAddress);

        let totalSupply = await pairData.getTotalSupply(pair);
        expect(totalSupply).to.equal(parseEther("1010"));

        let reserves = await pairData.getReserves(pair);
        expect(reserves[0]).to.equal(parseEther("1010"));
        expect(reserves[1]).to.equal(parseEther("1010"));
    });

    it("balanced amounts", async () => {
        let tx = await tradegenToken.approve(routerAddress, parseEther("1000"));
        await tx.wait();

        let tx2 = await mockCELO.approve(routerAddress, parseEther("1000"));
        await tx2.wait();

        let tx3 = await router.addLiquidity(mockCELOAddress, parseEther("1000"), parseEther("1000"));
        let temp = await tx3.wait();
        let event = temp.events[13].args;
        expect(event.asset).to.equal(mockCELOAddress);
        expect(event.amountAsset).to.equal(parseEther("1000"));
        expect(event.amountTGEN).to.equal(parseEther("1000"));
        expect(event.numberOfLPTokens).to.equal(parseEther("1000"));

        let pair = await ubeswapFactory.getPair(tradegenTokenAddress, mockCELOAddress);

        let totalSupply = await pairData.getTotalSupply(pair);
        expect(totalSupply).to.equal(parseEther("2000"));

        let reserves = await pairData.getReserves(pair);
        expect(reserves[0]).to.equal(parseEther("2000"));
        expect(reserves[1]).to.equal(parseEther("2000"));
    });
  });

  describe("#swapAssetForTGEN", () => {
    it("low slippage", async () => {
        let initialAssetBalance = await mockCELO.balanceOf(deployer.address);
        let initialTGENBalance = await tradegenToken.balanceOf(deployer.address);

        let tx = await pathManager.setPath(mockCELOAddress, tradegenTokenAddress, [mockCELOAddress, tradegenTokenAddress]);
        await tx.wait();

        let tx2 = await mockCELO.approve(routerAddress, parseEther("10"));
        await tx2.wait();

        let tx3 = await router.swapAssetForTGEN(mockCELOAddress, parseEther("10"));
        let temp = await tx3.wait();
        let event = temp.events[8].args;
        let expectedTGENReceived = BigInt(parseEther("9.8715")) / BigInt(1e14);
        let adjustedTGENReceived = BigInt(event.amountOfTGENReceived) / BigInt(1e14);
        expect(event.asset).to.equal(mockCELOAddress);
        expect(event.amountOfTokensSwapped).to.equal(parseEther("10"));
        expect(adjustedTGENReceived.toString()).to.equal(expectedTGENReceived.toString());

        let newAssetBalance = await mockCELO.balanceOf(deployer.address);
        let newTGENBalance = await tradegenToken.balanceOf(deployer.address);
        let expectedNewAssetBalance = BigInt(initialAssetBalance) - BigInt(event.amountOfTokensSwapped);
        let expectedNewTGENBalance = BigInt(initialTGENBalance) + BigInt(event.amountOfTGENReceived);
        expect(newAssetBalance.toString()).to.equal(expectedNewAssetBalance.toString());
        expect(newTGENBalance.toString()).to.equal(expectedNewTGENBalance.toString());

        let pair = await ubeswapFactory.getPair(tradegenTokenAddress, mockCELOAddress);

        let totalSupply = await pairData.getTotalSupply(pair);
        expect(totalSupply).to.equal(parseEther("1000"));

        let reserves = await pairData.getReserves(pair);
        expect(reserves[0]).to.equal(parseEther("1010"));
        expect(reserves[1]).to.equal("990128419656029387012");
    });

    it("high slippage", async () => {
        let initialAssetBalance = await mockCELO.balanceOf(deployer.address);
        let initialTGENBalance = await tradegenToken.balanceOf(deployer.address);

        let tx = await pathManager.setPath(mockCELOAddress, tradegenTokenAddress, [mockCELOAddress, tradegenTokenAddress]);
        await tx.wait();

        let tx2 = await mockCELO.approve(routerAddress, parseEther("300"));
        await tx2.wait();

        let tx3 = await router.swapAssetForTGEN(mockCELOAddress, parseEther("300"));
        let temp = await tx3.wait();
        let event = temp.events[8].args;
        let expectedTGENReceived = BigInt(parseEther("230.2363")) / BigInt(1e14);
        let adjustedTGENReceived = BigInt(event.amountOfTGENReceived) / BigInt(1e14);
        expect(event.asset).to.equal(mockCELOAddress);
        expect(event.amountOfTokensSwapped).to.equal(parseEther("300"));
        expect(adjustedTGENReceived.toString()).to.equal(expectedTGENReceived.toString());

        let newAssetBalance = await mockCELO.balanceOf(deployer.address);
        let newTGENBalance = await tradegenToken.balanceOf(deployer.address);
        let expectedNewAssetBalance = BigInt(initialAssetBalance) - BigInt(event.amountOfTokensSwapped);
        let expectedNewTGENBalance = BigInt(initialTGENBalance) + BigInt(event.amountOfTGENReceived);
        expect(newAssetBalance.toString()).to.equal(expectedNewAssetBalance.toString());
        expect(newTGENBalance.toString()).to.equal(expectedNewTGENBalance.toString());

        let pair = await ubeswapFactory.getPair(tradegenTokenAddress, mockCELOAddress);

        let totalSupply = await pairData.getTotalSupply(pair);
        expect(totalSupply).to.equal(parseEther("1000"));

        let reserves = await pairData.getReserves(pair);
        expect(reserves[0]).to.equal(parseEther("1300"));
        expect(reserves[1]).to.equal("769763682549457316604");
    });
  });

  describe("#swapTGENForAsset", () => {
    it("low slippage", async () => {
        let initialAssetBalance = await mockCELO.balanceOf(deployer.address);
        let initialTGENBalance = await tradegenToken.balanceOf(deployer.address);

        let tx = await pathManager.setPath(tradegenTokenAddress, mockCELOAddress, [tradegenTokenAddress, mockCELOAddress]);
        await tx.wait();

        let tx2 = await tradegenToken.approve(routerAddress, parseEther("10"));
        await tx2.wait();

        let tx3 = await router.swapTGENForAsset(mockCELOAddress, parseEther("10"));
        let temp = await tx3.wait();
        let event = temp.events[8].args;
        let expectedTokensReceived = BigInt(parseEther("9.8715")) / BigInt(1e14);
        let adjustedTokensReceived = BigInt(event.amountOfTokensReceived) / BigInt(1e14);
        expect(event.asset).to.equal(mockCELOAddress);
        expect(event.amountOfTGENSwapped).to.equal(parseEther("10"));
        expect(adjustedTokensReceived.toString()).to.equal(expectedTokensReceived.toString());

        let newAssetBalance = await mockCELO.balanceOf(deployer.address);
        let newTGENBalance = await tradegenToken.balanceOf(deployer.address);
        let expectedNewAssetBalance = BigInt(initialAssetBalance) + BigInt(event.amountOfTokensReceived);
        let expectedNewTGENBalance = BigInt(initialTGENBalance) - BigInt(event.amountOfTGENSwapped);
        expect(newAssetBalance.toString()).to.equal(expectedNewAssetBalance.toString());
        expect(newTGENBalance.toString()).to.equal(expectedNewTGENBalance.toString());

        let pair = await ubeswapFactory.getPair(tradegenTokenAddress, mockCELOAddress);

        let totalSupply = await pairData.getTotalSupply(pair);
        expect(totalSupply).to.equal(parseEther("1000"));

        let reserves = await pairData.getReserves(pair);
        expect(reserves[1]).to.equal(parseEther("1010"));
        expect(reserves[0]).to.equal("990128419656029387012");
    });
    
    it("high slippage", async () => {
        let initialAssetBalance = await mockCELO.balanceOf(deployer.address);
        let initialTGENBalance = await tradegenToken.balanceOf(deployer.address);

        let tx = await pathManager.setPath(tradegenTokenAddress, mockCELOAddress, [tradegenTokenAddress, mockCELOAddress]);
        await tx.wait();

        let tx2 = await tradegenToken.approve(routerAddress, parseEther("300"));
        await tx2.wait();

        let tx3 = await router.swapTGENForAsset(mockCELOAddress, parseEther("300"));
        let temp = await tx3.wait();
        let event = temp.events[8].args;
        let expectedTokensReceived = BigInt(parseEther("230.2363")) / BigInt(1e14);
        let adjustedTokensReceived = BigInt(event.amountOfTokensReceived) / BigInt(1e14);
        expect(event.asset).to.equal(mockCELOAddress);
        expect(event.amountOfTGENSwapped).to.equal(parseEther("300"));
        expect(adjustedTokensReceived.toString()).to.equal(expectedTokensReceived.toString());

        let newAssetBalance = await mockCELO.balanceOf(deployer.address);
        let newTGENBalance = await tradegenToken.balanceOf(deployer.address);
        let expectedNewAssetBalance = BigInt(initialAssetBalance) + BigInt(event.amountOfTokensReceived);
        let expectedNewTGENBalance = BigInt(initialTGENBalance) - BigInt(event.amountOfTGENSwapped);
        expect(newAssetBalance.toString()).to.equal(expectedNewAssetBalance.toString());
        expect(newTGENBalance.toString()).to.equal(expectedNewTGENBalance.toString());

        let pair = await ubeswapFactory.getPair(tradegenTokenAddress, mockCELOAddress);

        let totalSupply = await pairData.getTotalSupply(pair);
        expect(totalSupply).to.equal(parseEther("1000"));

        let reserves = await pairData.getReserves(pair);
        expect(reserves[1]).to.equal(parseEther("1300"));
        expect(reserves[0]).to.equal("769763682549457316604");
    });
  });
});*/