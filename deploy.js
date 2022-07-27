const { ethers } = require("hardhat");

const UBESWAP_PATH_MANAGER_ADDRESS_TESTNET = "0x521B823eb64Fa18fF4A3D381ABC7465a51bE4dED";
const UBESWAP_PATH_MANAGER_ADDRESS_MAINNET = "";

const TGEN_ADDRESS_TESTNET = "0xa9e37D0DC17C8B8Ed457Ab7cCC40b5785d4d11C0";
const TGEN_ADDRESS_MAINNET = "";

const UNISWAP_V2_FACTORY_TESTNET = "0x62d5b84be28a183abb507e125b384122d2c25fae";
const UBESWAP_ROUTER_TESTNET = "0xe3d8bd6aed4f159bc8000a9cd47cffdb95f96121";

async function deployRouter() {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    
    let RouterFactory = await ethers.getContractFactory('Router');
    
    let router = await RouterFactory.deploy(UBESWAP_PATH_MANAGER_ADDRESS_TESTNET, UBESWAP_ROUTER_TESTNET, UNISWAP_V2_FACTORY_TESTNET, TGEN_ADDRESS_TESTNET);
    await router.deployed();
    let routerAddress = router.address;
    console.log("Router: " + routerAddress);
}

deployRouter()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
