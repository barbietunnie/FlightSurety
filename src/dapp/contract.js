import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";
import BigNumber from "bignumber.js";

export default class Contract {
  constructor(network, callback) {
    let config = Config[network];
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    );
    this.initialize(callback);
    this.owner = null;
    this.airlines = [];
    this.passengers = [];
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      console.log("Number of accounts found: ", accts.length);
      console.log("Accounts: ", accts.length);

      this.owner = accts[0];

      let counter = 1;

      while (this.airlines.length < 5) {
        this.airlines.push(accts[counter++]);
      }

      while (this.passengers.length < 5) {
        this.passengers.push(accts[counter++]);
      }

      callback();
    });
  }

  isOperational(callback) {
    let self = this;
    self.flightSuretyApp.methods
      .isOperational()
      .call({ from: self.owner }, callback);
  }

  fetchFlightStatus(flight, callback) {
    let self = this;
    let payload = {
      airline: self.airlines[0],
      flight: flight,
      timestamp: Math.floor(Date.now() / 1000),
    };
    self.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: self.owner }, (error, result) => {
        callback(error, payload);
      });
  }

  async loadFlights(callback) {
    let self = this;
    await self.flightSuretyApp.methods
      .getFlightsCount()
      .call({ from: self.owner }, async (err, count) => {
        const flights = [];
        for (var i = 0; i < count; i++) {
          const res = await self.flightSuretyApp.methods
            .getFlight(i)
            .call({ from: self.owner });
          flights.push(res);
        }
        callback(err, flights);
      });
  }

  async purchaseInsurance(flight, amount, callback) {
    let self = this;
    const flightInfo = await self.flightSuretyApp.methods
      .getFlight(flight)
      .call();

    const amountInWei = this.web3.utils.toWei(amount, "ether");
    console.log('Amount in wei: ', amountInWei)
    
    await self.flightSuretyApp.methods
      .purchaseInsurance(
        flightInfo.airline,
        flightInfo.flight,
        amountInWei,
        flightInfo.timestamp
      )
      .send(
        { from: self.owner, value: amountInWei, gas: 3000000 },
        async (error, result) => {
          const insurance = await self.flightSuretyApp.methods
            .getInsurance(flightInfo.flight)
            .call({ from: self.owner });

          insurance.price = self.web3.utils.fromWei(
            insurance.price.toString(),
            "ether"
          );
          insurance.payout = self.web3.utils.fromWei(
            insurance.payout.toString(),
            "ether"
          );
          insurance.airline = flightInfo.airline;
          insurance.timestamp = flightInfo.timestamp;

          callback(error, insurance);
        }
      );
  }
}
