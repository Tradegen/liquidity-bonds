# Liquidity Bonds

## Purpose

## Overview

Liquidity bonds are an alternative to existing liquidity mining programs. Under the liquidity bonds program, users can bond CELO to mint 'bond tokens' that farm TGEN indefinitely. Half of the deposited CELO is automatically swapped for TGEN and is added as liquidity to the TGEN-CELO pair on Ubeswap. Users can exit their liquidity position by selling their bond tokens on the platform's marketplace. 

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
