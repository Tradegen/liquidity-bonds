# Liquidity Bonds

## Purpose

Implement an alternative order book and liquidity mining program.

## Overview

Liquidity bonds are an alternative to existing liquidity mining programs. Under the liquidity bonds program, users can bond CELO (the native coin of the Celo blockchain) to mint 'bond tokens' that farm TGEN (the protocol's governance token) indefinitely. Half of the deposited CELO is automatically swapped for TGEN and is added as liquidity to the TGEN-CELO pair on Ubeswap (a decentralized exchange launched on Celo). Users can exit their liquidity position by selling their bond tokens through an order book.

Each order book is an NFT that executes orders for bond tokens at a pre-determined price. An order book NFT can be minted by paying a one-time fee to the protocol and specifying a unique execution price. The owner of the NFT collects a fee whenever users trade bond tokens on the owner's order book. The NFTs can be traded on the platform's marketplace, or an external marketplace that supports the ERC1155 standard.

## System Design



## Disclaimer

These smart contracts have not been audited yet.

This protocol is experimental.

## Repository Structure

```
.
├── abi  ## Generated ABIs that developers can use to interact with the system.
├── addresses  ## Address of each deployed contract, organized by network.
├── contracts  ## All source code.
│   ├── backup  ## Source code for backup mode.
│   ├── interfaces  ## Interfaces used for defining/calling contracts.
│   ├── openzeppelin-solidity  ## Helper contracts provided by OpenZeppelin.
│   ├── test  ## Mock contracts used for testing main contracts.
├── test ## Source code for testing code in //contracts.
```

## Backup Mode



## Documentation

To learn more about the Tradegen project, visit the docs at https://docs.tradegen.io.

## License

MIT
