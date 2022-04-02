# FlightSurety

FlightSurety is a DApp that caters to flight delay insurance for passengers, and manages collaboration between multiple airlines. Passengers can purchase insurance prior to flight, and if a flight is delayed due to the airline's fault, passengers are paid `1.5X` the amount they paid for insurance. *Oracles* provide flight status information.

It was created as a fulfillment for Udacity's Blockchain Nanodegree programme.

## Requirements

1. Separation of Concerns
    - FlightSuretyData contract for data persistence
    - FlightSuretyApp contract for app logic and oracles code
    - Dapp client for triggering contract calls
    - Server app for simulating oracles
2. Airlines
   - Register first airline when contract is deployed
   - Only existing airline may register a new airline until there are at least four airlines registered
   - Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines
   - Airline can be registered, but does not participate in contract until it submits funding of 10 ether
3. Passengers
    - Passengers may pay upto 1 ether for purchasing flight insurance
    - Flight numbers and timestamps are fixed for the purpose of the project and can be defined in the Dapp client
    - If flight is delayed due to airline fault, passenger receives credit of 1.5X the amount they paid
    - Funds are transferred from contract to the passenger wallet only when they initiate a withdrawal
4. Oracles
    - Oracles are implemented as a server app
    - Upon startup, 20+ oracles are registered and their assigned indexes are persisted in memory
    - Client dapp is used to trigger request to update flight status generating OracleRequest event that is captured by server
    - Server will loop through all registered oracles, identify those oracles for which the request applies, and respond by calling into app logic contract with the appropriate status code
5. General
    - Contracts must have operational status control
    - Functions must fail fast - use require() at the start of functions
    - Scaffolding code is provided but you are free to replace it with your own code

## Tools

- Truffle v5
- Solidity v0.4.24 (solc-js)
- Node v10.7.0
- Web3.js v1.0.0-beta.37

## Install

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

```
npm install
truffle compile
```

## Develop Client

To run truffle tests:

```
truffle test ./test/flightSurety.js
truffle test ./test/oracles.js
```

To use the dapp:

```
truffle migrate
npm run dapp
```

To view dapp: `http://localhost:8000`

## Develop Server

```
npm run server
truffle test ./test/oracles.js
```

## Deploy

To build dapp for prod:

```
npm run dapp:prod
```

Deploy the contents of the ./dapp folder


## Resources

* [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
* [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
* [Truffle Framework](http://truffleframework.com/)
* [Ganache Local Blockchain](http://truffleframework.com/ganache/)
* [Remix Solidity IDE](https://remix.ethereum.org/)
* [Solidity Language Reference](http://solidity.readthedocs.io/en/v0.4.24/)
* [Ethereum Blockchain Explorer](https://etherscan.io/)
* [Web3Js Reference](https://github.com/ethereum/wiki/wiki/JavaScript-API)