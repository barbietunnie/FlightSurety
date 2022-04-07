import "babel-polyfill";
import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";
import express from "express";
import BigNumber from "bignumber.js";

class Server {
  constructor(network, callback) {
    this.config = Config[network];
    this.web3 = new Web3(
      new Web3.providers.WebsocketProvider(
        this.config.url.replace("http", "ws")
      )
    );
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      this.config.appAddress
    );
    this.initialize(callback);
    this.owner = null;
  }

  initialize(callback) {
    // TODO Ensure this is up to NUM_ORACLES accounts
    this.web3.eth.getAccounts((error, accts) => {
      if (!accts) {
        console.error("Error: Unable to load accounts");
        return;
      }
      console.log("Number of accounts available: ", accts.length);
      this.accounts = accts;
      this.owner = accts[0];
      this.web3.eth.defaultAccount = this.web3.eth.accounts[0];

      this.setupOracles(callback);
    });
  }

  async setupOracles(callback) {
    const NUM_ORACLES = 20;
    const gasFee = 3000000;
    const oracles = [];

    const fee = await this.flightSuretyApp.methods
      .REGISTRATION_FEE()
      .call({ from: this.accounts[0] });

    // Ensure the number of available accounts match the number of oracles to be created to prevent errors
    if (this.accounts.length < NUM_ORACLES) {
      console.error(
        "The number of accounts(" +
          this.accounts.length +
          ") available is less than number of oracles(" +
          NUM_ORACLES +
          ")." +
          "Make more accounts available or reduce the number of oracles (NUM_ORACLES) to be created, and then restart the app."
      );
      return;
    }

    // Create N number of oracles at startup
    for (let i = 1; i < NUM_ORACLES; i++) {
      const account = this.accounts[i];
      // Get the account balance
      // const balance = await this.web3.eth.getBalance(account);

      await this.flightSuretyApp.methods
        .registerOracle()
        .send({ from: account, value: fee, gas: gasFee });

      let indexes = await this.flightSuretyApp.methods
        .getMyIndexes()
        .call({ from: account });
      oracles.push({
        address: account,
        indexes: indexes,
      });
    }

    // console.log("Oracles: ", oracles);

    const self = this;
    this.flightSuretyApp.events.OracleRequest(
      {
        fromBlock: 0,
      },
      function (error, event) {
        if (error) console.log(error);
        // console.log('New oracle request received: ', event);

        const { index, airline, flight, timestamp } = event.returnValues;
        // console.log("Index: ", index);

        // Broadcast the request to associated oracles
        const matchedOracles = [];
        oracles.forEach((oracle) => {
          const indexCount = oracle.indexes.length;

          for (let i = 0; i < indexCount; i++) {
            if (BigNumber(oracle.indexes[i]).isEqualTo(index)) {
              matchedOracles.push(oracle);
            }
          }
        });

        // console.log('matchedOracles: ', matchedOracles)
        matchedOracles.forEach(async (oracle) => {
          try {
            const status = self.getRandomStatusCode();
            const response = await self.flightSuretyApp.methods
              .submitOracleResponse(index, airline, flight, timestamp, status)
              .send({ from: oracle.address, gas: 3000000 });

            // console.log("Response from contract: ", response.events);
            console.error("Oracle response accepted: status = ", status);
          } catch (err) {
            console.error("Oracle response rejected");
          }
        });
      }
    );

    callback();
  }

  getRandomStatusCode() {
    // status code of Unknown (0), On Time (10) or Late Airline (20), Late Weather (30), Late Technical (40), or Late Other (50)
    const status_codes = [0, 10, 20, 30, 40, 50];
    return status_codes[Math.floor(Math.random() * status_codes.length)];
  }
}

const server = new Server("localhost", () => {
  console.log("Oracles have been successfully set up");
});

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

export default app;
