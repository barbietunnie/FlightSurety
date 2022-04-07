var Test = require("../config/testConfig.js");
var BigNumber = require("bignumber.js");

contract("Flight Surety Tests", async (accounts) => {
  var config;

  const fundingCost = web3.utils.toWei("10", "ether");
  const excessAmount = web3.utils.toWei("11", "ether"); // participation fee + gas charges
  const insufficientAmount = web3.utils.toWei("5.5", "ether"); // participation fee + gas charges

  const flights = [
    "AXiB",
    "PK9y",
    "L1DG",
    "TNA4"
  ];
  const insuranceAmounts = [
    web3.utils.toWei("0.1", "ether"),
    web3.utils.toWei("0.03", "ether"),
    web3.utils.toWei("0.95", "ether"),
    web3.utils.toWei("1", "ether"),
    web3.utils.toWei("1.2", "ether"),
    web3.utils.toWei("2", "ether"),
  ];

  before("setup contract", async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(
      config.flightSuretyApp.address
    );
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
      config.firstAirline
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

    await config.flightSuretyData.registerAirline(accounts[2], {
      from: config.firstAirline,
    });
    let result = await config.flightSuretyData.isAirline.call(accounts[2]);
    assert.equal(result, true, "Cannot register the 2nd airline");

    result = await config.flightSuretyData.getAirlineState.call(accounts[2]);
    assert.equal(result, 1, `The 2nd airline is not in REGISTERED state`);
  });

  it("(airline) A new airline cannot be registered by a non-existing airline", async () => {
    await config.flightSuretyData.setOperatingStatus(true);

    let revert = false;
    try {
      await config.flightSuretyData.registerAirline(accounts[3]);
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
    // so register 2 more that do not require consensus
    for (let i = 3; i < 5; i++) {
      await config.flightSuretyData.registerAirline(accounts[i], {
        from: config.firstAirline,
      });

      let result = await config.flightSuretyData.isAirline.call(accounts[i]);

      assert.equal(
        result,
        true,
        `Airline ${i - 1} was not successfully registered`
      );

      // ensure the state is registered
      result = await config.flightSuretyData.getAirlineState.call(accounts[i]);

      assert.equal(result, 1, `Airline ${i - 1} is not in REGISTERED state`);
    }

    // Airlines 5 upwards should be placed in APPLIED mode which will be subsequently vetted by consensus
    const airline5 = accounts[5]; // should not be allowed to be singly registered
    await config.flightSuretyData.registerAirline(airline5, {
      from: config.firstAirline,
    });
    let result = await config.flightSuretyData.isAirline.call(airline5);
    assert.equal(
      result,
      true,
      `The 5th airline was not added to the list of airlines to be vetted`
    );

    // Ensure the state is not registered but applied
    result = await config.flightSuretyData.getAirlineState.call(airline5);

    assert.equal(result, 0, `The 5th airline is not in APPLIED state`);
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
      await config.flightSuretyData.getAirlineState.call(config.firstAirline);

    await config.flightSuretyApp.payAirlineDues({
      from: config.firstAirline,
      value: excessAmount,
    });

    const balanceAfterTransaction = await web3.eth.getBalance(
      config.firstAirline
    );

    const stateAfterPayment =
      await config.flightSuretyData.getAirlineState.call(config.firstAirline);

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
    let revert = false;
    try {
      await config.flightSuretyApp.payAirlineDues({
        from: accounts[2],
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

  it("(airline) only registered airlines can be funded", async () => {
    const airline = accounts[5];

    let result = await config.flightSuretyData.isAirline.call(airline);

    assert.equal(result, true, "The 5th airline does not exist");

    const stateBeforePayment =
      await config.flightSuretyData.getAirlineState.call(airline);

    assert.equal(
      stateBeforePayment,
      0,
      "The 5th airline is not in APPLIED state"
    );

    // attempt to pay for an airline in APPLIED state (this shouldn't be possible)
    let revert = false;
    try {
      await config.flightSuretyApp.payAirlineDues({
        from: accounts[5],
        value: excessAmount,
      });
    } catch (e) {
      revert = true;
    }

    assert.equal(revert, true, "Only registered airlines can pay for funding");
  });

  it("(multiparty) only paid airlines can approve registered airlines", async () => {
    // Confirm that the approver has not paid for funding (i.e. is not registered)
    let result = await config.flightSuretyData.getAirlineState.call(
      accounts[6]
    );
    assert.equal(result, 0, "Airline is already registered");

    let revert = false;
    try {
      await config.flightSuretyApp.approveAirline(accounts[6], {
        from: accounts[5],
      });
    } catch (e) {
      revert = true;
    }

    assert.equal(
      revert,
      true,
      "Non-registered airlines should not be able to approve airlines"
    );
  });

  it("(multiparty) 50% consensus required for registration of 5th and above airlines", async () => {
    let result = await config.flightSuretyData.getAirlineState.call(
      accounts[5]
    );
    assert.equal(result, 0, "The 5th airline is already registered");

    result = await config.flightSuretyData.getAirlineApprovalsCount.call(
      accounts[5]
    );
    assert.equal(
      result,
      0,
      "The 5th airline surprisingly already has approvals"
    );

    // Get 1 approval for airline 5
    await config.flightSuretyApp.approveAirline(accounts[5], {
      from: config.firstAirline,
    });

    let approvalsCount =
      await config.flightSuretyData.getAirlineApprovalsCount.call(accounts[5]);
    assert.equal(
      approvalsCount,
      1,
      "The 5th airline approval count is not equal to 1"
    );

    // the 5th airline state should now be resgistered
    result = await config.flightSuretyData.getAirlineState.call(accounts[5]);
    assert.equal(
      result,
      1,
      "The 5th airline was not registered after consensus"
    );

    // Ensure more airlines are registered by paying their dues
    // With this, we should have 4 airlines registered
    for (let i = 2; i <= 4; i++) {
      await config.flightSuretyApp.payAirlineDues({
        from: accounts[i],
        value: excessAmount,
      });
    }

    // Register a 6th airline
    await config.flightSuretyData.registerAirline(accounts[6], {
      from: config.firstAirline,
    });
    result = await config.flightSuretyData.isAirline.call(accounts[6]);
    assert.equal(
      result,
      true,
      `The 6th airline was not added to the list of airlines to be vetted`
    );

    // Get 1/4 approval
    await config.flightSuretyApp.approveAirline(accounts[6], {
      from: accounts[3],
    });
    approvalsCount =
      await config.flightSuretyData.getAirlineApprovalsCount.call(accounts[6]);
    assert.equal(
      approvalsCount,
      1,
      "The 6th airline approval count is not equal to 1"
    );

    // assert that the airline that had less approvals hasn't been registered yet
    result = await config.flightSuretyData.getAirlineState.call(accounts[6]);
    assert.equal(
      result,
      0,
      "The 6th airline has transitioned away from the APPLIED state"
    );

    // Add a 2nd approval (minimum required)
    await config.flightSuretyApp.approveAirline(accounts[6], {
      from: accounts[4],
    });
    approvalsCount =
      await config.flightSuretyData.getAirlineApprovalsCount.call(accounts[6]);
    assert.equal(
      approvalsCount,
      2,
      "The 6th airline approval count is not equal to 2"
    );
    // console.log('6th airline approvals count: ', approvalsCount);

    // assert that the state has transitioned from APPLIED to REGISTERED
    result = await config.flightSuretyData.getAirlineState.call(accounts[6]);
    assert.equal(
      result,
      1,
      "The 6th airline has not transitioned to the REGISTERED state"
    );

    // TODO: ensure AirlineRegistered event is received
  });

  // // it('(multiparty) it prevents duplicate approval from the same airline', async () => {

  // // });

  // =============================================================================
  //                        Passenger tests
  // =============================================================================
  it("(passenger) can purchase flight insurance", async () => {
    // Create a fight
    await config.flightSuretyApp.registerFlight(flights[0], 0, { from: config.firstAirline });

    const flight = await config.flightSuretyApp.getFlight.call(0);

    await config.flightSuretyApp.purchaseInsurance(flight.airline, flight.flight, insuranceAmounts[0], flight.timestamp, { from: accounts[7] });
    let result = await config.flightSuretyData.getInsurance.call(accounts[7], flights[0]);

    assert.equal(result.flightNo, flights[0], "The insurance was not purchased");
  });

  it('(passenger) cannot purchase for the same flight insurance multiple times', async () => {
    const flight = await config.flightSuretyApp.getFlight.call(0);
    let revert = false;
    try {
      await config.flightSuretyApp.purchaseInsurance(flight.airline, flight.flight, insuranceAmounts[0], flight.timestamp, { from: accounts[7] });
    } catch(e) {
      revert = true;
    }

    assert.equal(revert, true, "Duplicate flight insurances can be purchased");
  });

  it('(passenger) cannot pay more than 1 ether for insurance', async () => {
    // Create another flight
    await config.flightSuretyApp.registerFlight(flights[1], 0, { from: config.firstAirline });
    
    const flight = await config.flightSuretyApp.getFlight.call(1);
    let revert = false;
    try {
      const excess = insuranceAmounts[insufficientAmount.length - 1];
      await config.flightSuretyApp.purchaseInsurance(flight.airline, flight.flight, insuranceAmounts[4], flight.timestamp, { from: accounts[7], value: excess });
    } catch(e) {
      revert = true;
    }

    assert.equal(revert, true, "Insurance cost can exceed 1 ether");
  });

  // it('', async () => {

  // });

  // it('', async () => {

  // });

  // it('', async () => {

  // });

  // - Passengers may pay up to 1 ether for purchasing flight insurance
  // - Flight numbers and timestamps are fixed for the purpose of the project and can be defined in the Dapp client
  // - If flight is delayed due to airline fault, passenger receives credit of 1.5X the amount they paid
  // - Funds are transferred from contract to the passenger wallet only when they initiate a withdrawal
});
