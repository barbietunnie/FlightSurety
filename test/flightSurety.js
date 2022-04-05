var Test = require("../config/testConfig.js");
var BigNumber = require("bignumber.js");

contract("Flight Surety Tests", async (accounts) => {
  var config;
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

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSurety.setTestingMode(true);
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

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

  it("(airline) any airline can register the first 4 airlines", async () => {
    await config.flightSuretyData.setOperatingStatus(true);

    for (let i = 3; i < 6; i++) {
      await config.flightSuretyData.registerAirline(accounts[i], {
        from: config.firstAirline,
      });

      let result = await config.flightSuretyData.isAirline.call(accounts[i], {
        from: config.firstAirline,
      });

      assert.equal(
        result,
        true,
        `Airline ${i - 3} was not successfully registered`
      );
    }

    // An attempt to singly register the 5th airline should fail
    let revert = false;
    try {
      const airline5 = accounts[6]; // should not be allowed to be singly registered
      await config.flightSuretyData.registerAirline(airline5, {
        from: config.firstAirline,
      });
    } catch(e) {
      revert = true;
    }

    assert.equal(
      revert,
      true,
      `Airline 5 was successfully registered`
    );
  });

  // it('(airline) Cannot singly register an airline after the first 4 airlines', async () => {
  //     const firstAirline = await config.firstAirline;
  //     await config.flightSuretyData.setOperatingStatus(true);

  //     let revert = false;
  //     try {
  //         // Register the next 3 airlines (1 was automatically registered during deployment)
  //         for (i = 4; i < 7; i++) {
  //             await config.flightSuretyData.registerAirline.call(accounts[i], `AIR${i-3}`);
  //         }
  //     } catch(e) {
  //         revert = true;
  //     }

  //     assert.equal(revert, true, "Cannot singly register new airlines");
  // });

  // it('(airline) A new airline can apply to join', async () => {
  //     await config.flightSuretyData.setOperatingStatus(true);

  //     try {
  //         const result = await config.flightSuretyData.registerAirline.call(accounts[3], 'New airline');
  //         console.log(result);
  //         assert.equal(result[0], false, "Cannot register airline");
  //     } catch(e) {}
  // });

  // it('(airline) An already existing airline cannot apply to join', async () => {
  //     await config.flightSuretyData.setOperatingStatus(true);

  //     let revert = false;
  //     let result;
  //     try {
  //         // First invocation
  //         result = await config.flightSuretyData.registerAirline.call(accounts[3], 'New airline');

  //         // console.log('Testing')
  //         // console.log('Result 1: ', result)

  //         // // Another attempt to create the same airline
  //         result = await config.flightSuretyData.registerAirline.call(accounts[3], 'New airline');

  //         // console.log('Result 2: ', result)

  //         const count = await config.flightSuretyData.getNumberOfAirlines.call();
  //         console.log('Count: ', count.toNumber())
  //     } catch(e) {
  //         revert = true;
  //     }

  //     assert.equal(revert, true, "Existing airline overwrite is possible");
  // });

  // it('(airline) a new airline cannot apply if contract is not operational', async () => {
  //     await config.flightSuretyData.setOperatingStatus(true);
  // });

  // it('(airline) Can apply to join', async () => {
  //     await config.flightSuretyData.setOperatingStatus(true);
  // });

  // it('(airline) cannot pay for airline fund if contract is not operational', async () => {
  //     await config.flightSuretyData.setOperatingStatus(false);

  //     let revert = false;
  //     try {
  //         await config.flightSuretyData.payAirlineDues({from: config.firstAirline});
  //     } catch(e) {
  //         revert = true;
  //     }

  //     assert.equal(revert, true, "Cannot fund airline if contract is not operational");

  //     // reset operating status
  //     await config.flightSuretyData.setOperatingStatus(true);
  // });

  // it('(airline) can pay airline fund if contract is operational', async () => {
  // });

  // it('(airline) can pay airline fund', async () => {
  //     await config.flightSuretyData.setOperatingStatus(false);
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
