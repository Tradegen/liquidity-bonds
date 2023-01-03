# Liquidity Bonds

## Purpose

Implement an alternative order book and liquidity mining program.

## Overview

Liquidity bonds are an alternative to existing liquidity mining programs. Under the liquidity bonds program, users can deposit CELO (the native coin of the Celo blockchain) to mint 'bond tokens' that farm TGEN (the protocol's governance token) indefinitely. Users can exit their liquidity position by selling their bond tokens through an order book.

Each order book is an NFT that executes orders for bond tokens at a pre-determined price. An order book NFT can be minted by paying a one-time fee to the protocol and specifying a unique execution price. The owner of the NFT collects a fee whenever users trade bond tokens on the owner's order book. The NFTs can be traded on the platform's marketplace, or an external marketplace that supports the ERC1155 standard.

## Disclaimer

These smart contracts have not been audited yet.

This protocol is experimental.

## System Design

The system consists of liquidity bond tokens, order books, and a liquidity mining program.

Liquidity bond tokens are fungible tokens that follow the ERC20 standard. They can be traded via the platform's order books or on a Celo-based decentralized exchange. To receive liquidity bond tokens, users can either mint them by depositing collateral or purchase existing tokens. When a user mints tokens, half of the deposited collateral is automatically swapped for CELO and is added as liquidity to the TGEN-CELO pair on Ubeswap (a decentralized exchange launched on Celo).

An order book is implemented as a queue that consists of either only 'buy' orders or only 'sell' orders. When the order book is a 'buy' queue, new 'buy' orders are appended to the queue (up to the queue size specified by the ExecutionPrice owner) and 'sell' orders fill starting from the beginning of the queue. If a 'sell' order is unfilled after all 'buy' orders have been filled, the queue becomes a 'sell' queue with the unfilled amount as the quantity of the first order. The opposite is true when the order book is a 'sell' queue. The index of each order is strictly increasing to efficiently keep track of the start/end of the queue.



### Smart Contracts

* ExecutionPrice - An order book that executes orders for liquidity bond tokens at a pre-determined price.
* ExecutionPriceFactory - Creates ExecutionPrice contracts. Only the PriceManager contract can interact with this contract.
* HalveningReleaseSchedule - Stores the release schedule for a reward token.
* LiquidityBond - An ERC20 token that represents a user's stake in a liquidity pool.
* Marketplace - Used for buying/selling ExecutionPrice NFTs.
* PriceManager - Handles price calculations and token logic for ExecutionPrice NFTs.
* ReleaseEscrow - Stores reward tokens to be released according to the HalveningReleaseSchedule.
* Router - Handles swapping to/from TGEN and adding/removing liquidity.
* UbeswapPathManager - Stores the optimal path for swapping to/from an asset.

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

This protocol includes a backup mode, which pauses the minting of new bond tokens and switches to a standard liquidity mining program. Since this protocol is experimental, a backup mode is included to make sure users can recover their investment if the protocol doesn't work as intended. If backup mode is enabled, users will be able to burn their bond tokens to receive the underlying LP (liquidity provider) tokens. These LP tokens can be burned to recover the underlying assets (TGEN and CELO) or deposited into a farming contract to collect rewards while staying invested in the underlying assets. Backup mode will only be enabled if the majority of users vote in favor of it.

## Documentation

To learn more about the Tradegen project, visit the docs at https://docs.tradegen.io.

## License

MIT
