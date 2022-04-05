var Test = require("../config/testConfig.js");
var BigNumber = require("bignumber.js");

contract("Flight Surety Tests", async (accounts) => {
  var config;

  const fundingCost = web3.utils.toWei("10", "ether");
  const excessAmount = web3.utils.toWei("11", "ether"); // participation fee + gas charges
  const insufficientAmount = web3.utils.toWei("5.5", "ether"); // participation fee + gas charges

  before("setup contract", async () => {
    config = await Test.Config(accounts);
    // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, {
        from: config.testAddresses[2],
      });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(
      accessDenied,
      false,
      "Access not restricted to Contract Owner"
    );
  });

  // it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
  //   await config.flightSuretyData.setOperatingStatus(false);

  //   let reverted = false;
  //   try {
  //     await config.flightSurety.setTestingMode(true);
  //   } catch (e) {
  //     reverted = true;
  //   }
  //   assert.equal(reverted, true, "Access not blocked for requireIsOperational");

  //   // Set it back for other tests to work
  //   await config.flightSuretyData.setOperatingStatus(true);
  // });

  it("(airline) registers first airline when contract is deployed", async () => {
    let firstAirlineDeployed;
    await config.flightSuretyData.setOperatingStatus(true);

    firstAirlineDeployed = await config.flightSuretyData.isAirline.call(
      config.firstAirline,
      { from: config.firstAirline }
    );

    assert.equal(
      firstAirlineDeployed,
      true,
      "The first airline was not automatically registered during deployment"
    );
  });

  it("(airline) An already existing airline cannot apply to join", async () => {
    await config.flightSuretyData.setOperatingStatus(true);

    let revert = false;
    try {
      // firstAirline has been previously created during deployment
      await config.flightSuretyData.registerAirline(config.firstAirline, {
        from: config.firstAirline,
      });
    } catch (e) {
      revert = true;
    }

    assert.equal(revert, true, "Existing airline overwrite is possible");
  });

  it("(airline) a new airline cannot apply if contract is not operational", async () => {
    await config.flightSuretyData.setOperatingStatus(false);

    let revert = false;
    try {
      await config.flightSuretyData.registerAirline(accounts[2], {
        from: config.firstAirline,
      });
    } catch (e) {
      revert = true;
    }

    assert.equal(
      revert,
      true,
      "New airline was registered although the contract is not operational"
    );

    await config.flightSuretyData.setOperatingStatus(true);
  });

  it("(airline) A new airline can be registered by an existing airline", async () => {
    await config.flightSuretyData.setOperatingStatus(true);

    try {
      await config.flightSuretyData.registerAirline(accounts[2], {
        from: config.firstAirline,
      });
      let result = await config.flightSuretyData.isAirline.call(accounts[2]);
      assert.equal(result, true, "Cannot register new airline");

      result = await config.flightSuretyData.getAirlineState.call(accounts[3], {
        from: config.firstAirline,
      });

      assert.equal(result, true, `Airline 4 was successfully registered`);
    } catch (e) {}
  });

  it("(airline) A new airline cannot be registered by a non-existing airline", async () => {
    await config.flightSuretyData.setOperatingStatus(true);

    let revert = false;
    try {
      await config.flightSuretyData.registerAirline(accounts[4]);
    } catch (e) {
      revert = true;
    }

    assert.equal(
      revert,
      true,
      "A new airline can be registered by non-existing airline"
    );
  });

  it("(airline) any airline can register the first 4 airlines", async () => {
    await config.flightSuretyData.setOperatingStatus(true);

    // Print the number of existing airlines
    let count = await config.flightSuretyData.getNumberOfAirlines.call();
    // console.log(`Number of existing airlines: ${count}`);

    // 2 airlines have already been previously registered, as evident above
    for (let i = 4; i < 6; i++) {
      await config.flightSuretyData.registerAirline(accounts[i], {
        from: config.firstAirline,
      });

      let result = await config.flightSuretyData.isAirline.call(accounts[i], {
        from: config.firstAirline,
      });

      assert.equal(
        result,
        true,
        `Airline ${i - 1} was not successfully registered`
      );

      // ensure the state is registered
      result = await config.flightSuretyData.getAirlineState.call(accounts[i], {
        from: config.firstAirline,
      });

      assert.equal(result, 1, `Airline ${i - 1} is not in REGISTERED state`);
    }

    // Airlines 5 upwards should be placed in APPLIED mode which will be subsequently vetted by consensus
    const airline5 = accounts[6]; // should not be allowed to be singly registered
    await config.flightSuretyData.registerAirline(airline5, {
      from: config.firstAirline,
    });
    let result = await config.flightSuretyData.isAirline.call(airline5, {
      from: config.firstAirline,
    });
    assert.equal(
      result,
      true,
      `Airline 5 was not added to the list of airlines to be vetted`
    );

    // Ensure the state is not registered but applied
    result = await config.flightSuretyData.getAirlineState.call(airline5, {
      from: config.firstAirline,
    });

    assert.equal(result, 0, `Airline 5 is not in APPLIED state`);
  });

  it("(airline) cannot pay for airline fund if contract is not operational", async () => {
    await config.flightSuretyData.setOperatingStatus(false);

    let revert = false;
    try {
      await config.flightSuretyApp.payAirlineDues({
        from: config.firstAirline,
      });
    } catch (e) {
      revert = true;
    }

    assert.equal(
      revert,
      true,
      "Cannot fund airline if contract is not operational"
    );

    // reset operating status
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it("(airline) can pay airline fund with sufficient funds if contract is operational", async () => {
    const balanceBeforeTransaction = await web3.eth.getBalance(
      config.firstAirline
    );
    const stateBeforePayment =
      await config.flightSuretyData.getAirlineState.call(config.firstAirline, {
        from: config.firstAirline,
      });

    await config.flightSuretyApp.payAirlineDues({
      from: config.firstAirline,
      value: excessAmount,
    });

    const balanceAfterTransaction = await web3.eth.getBalance(
      config.firstAirline
    );

    const stateAfterPayment =
      await config.flightSuretyData.getAirlineState.call(config.firstAirline, {
        from: config.firstAirline,
      });

    const difference = balanceBeforeTransaction - balanceAfterTransaction;

    assert.equal(
      difference >= fundingCost,
      true,
      "The airline fund was not deducted"
    );
    assert.equal(
      stateBeforePayment,
      1,
      "The airline is not in REGISTERED state"
    );
    assert.equal(stateAfterPayment, 2, "The airline is not in FUNDED state");
  });

  it("(airline) cannot pay airline fund with insufficient funds even if contract is operational", async () => {
    const airlineWithInsufficientFunds = accounts[4];

    let revert = false;
    try {
      await config.flightSuretyApp.payAirlineDues({
        from: airlineWithInsufficientFunds,
        value: insufficientAmount,
      });
    } catch (e) {
      revert = true;
    }

    assert.equal(
      revert,
      true,
      "An airline with insufficient funds was able to pay for funding"
    );
  });

  // it("(airline) only registered airlines can be funded", async () => {
  //   const airline = accounts[7];
  //   await config.flightSuretyData.registerAirline(airline, {
  //     from: config.firstAirline,
  //   });

  //   let result = config.flightSuretyData.isAirline.call(airline, {
  //     from: config.firstAirline,
  //   });
  //   console.log("Is airline: ", result);
  // });

  // it('(multiparty) 50% consensus required for registration of 5th and above airlines', async () => {

  // });

  //   it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
  //     // ARRANGE
  //     let newAirline = accounts[2];

  //     // ACT
  //     try {
  //         await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
  //     } catch(e) {

  //     }
  //     let result = await config.flightSuretyData.isAirline.call(newAirline);

  //     // ASSERT
  //     assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
  //   });
});
