# Liquidity Bonds

## Purpose

Implement an alternative order book and liquidity mining program.

## Overview

Liquidity bonds are an alternative to existing liquidity mining programs. Under the liquidity bonds program, users can bond CELO (the native coin of the Celo blockchain) to mint 'bond tokens' that farm TGEN (the protocol's governance token) indefinitely. Half of the deposited CELO is automatically swapped for TGEN and is added as liquidity to the TGEN-CELO pair on Ubeswap (a decentralized exchange launched on Celo). Users can exit their liquidity position by selling their bond tokens through an order book.

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
