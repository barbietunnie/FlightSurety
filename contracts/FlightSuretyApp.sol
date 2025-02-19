pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

// import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint256 private constant PARTICIPATION_FEE = 10 ether;

    address private contractOwner; // Account used to deploy contract
    address private flightSuretyDataContractAddress;
    FlightSuretyData flightSuretyData;

    struct Flight {
        // bool isRegistered;
        string flight;
        uint8 statusCode;
        uint256 timestamp;
        address airline;
    }
    mapping(bytes32 => Flight) private flights;
    bytes32[] private flightKeys;

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        // Modify to call data contract's status
        require(
            flightSuretyData.isOperational(),
            "Contract is currently not operational"
        );
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsAirline() {
        require(
            flightSuretyData.isAirline(msg.sender),
            "Caller is not an existing airline"
        );
        _;
    }

    // Define a modifier that checks if the paid amount is sufficient to cover the price
    modifier paidEnough(uint256 _price) {
        require(
            msg.value >= _price,
            "Your balance is not sufficient for payment"
        );
        _;
    }

    modifier onlyPaidAirlines() {
        require(
            flightSuretyData.getAirlineState(msg.sender) == 2,
            "Caller must have paid funding"
        );
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(
        address dataContract,
        address airline /*, string airlineName*/
    ) public {
        contractOwner = msg.sender;
        flightSuretyDataContractAddress = dataContract;
        flightSuretyData = FlightSuretyData(dataContract);
        flightSuretyData.registerAirline(airline);

        // Add some dummmy flights for testing
        addSampleFlights();
    }

    function addSampleFlights() internal {
        bytes32 flightKey1 = getFlightKey(contractOwner, "FLIGHT 719", now);
        flights[flightKey1] = Flight(
            "FLIGHT 719",
            STATUS_CODE_UNKNOWN,
            now,
            contractOwner
        );
        flightKeys.push(flightKey1);

        bytes32 flightKey2 = getFlightKey(
            contractOwner,
            "FLIGHT 891",
            now + 1 days
        );
        flights[flightKey2] = Flight(
            "FLIGHT 891",
            STATUS_CODE_LATE_TECHNICAL,
            now + 1 days,
            contractOwner
        );
        flightKeys.push(flightKey2);

        bytes32 flightKey3 = getFlightKey(
            contractOwner,
            "FLIGHT 301",
            now + 2 days
        );
        flights[flightKey3] = Flight(
            "FLIGHT 301",
            STATUS_CODE_LATE_WEATHER,
            now + 2 days,
            contractOwner
        );
        flightKeys.push(flightKey3);

        bytes32 flightKey4 = getFlightKey(
            contractOwner,
            "FLIGHT 221",
            now + 5 days
        );
        flights[flightKey4] = Flight(
            "FLIGHT 221",
            STATUS_CODE_UNKNOWN,
            now + 5 days,
            contractOwner
        );
        flightKeys.push(flightKey4);

        bytes32 flightKey5 = getFlightKey(
            contractOwner,
            "FLIGHT 109",
            now + 10 days
        );
        flights[flightKey5] = Flight(
            "FLIGHT 109",
            STATUS_CODE_UNKNOWN,
            now + 10 days,
            contractOwner
        );
        flightKeys.push(flightKey5);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public pure returns (bool) {
        return true; // Modify to call data contract's status
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerAirline(
        address airline /*, string name*/
    ) external requireIsOperational returns (bool success, uint256 votes) {
        return
            flightSuretyData.registerAirline(
                airline /*, name*/
            );
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight(string flight, uint8 status)
        external
        onlyPaidAirlines
    {
        bytes32 flightKey = getFlightKey(msg.sender, flight, now);

        flights[flightKey] = Flight(flight, status, now, msg.sender);
        flightKeys.push(flightKey);
    }

    function getFlight(uint256 index)
        external
        view
        returns (
            address airline,
            string flight,
            uint256 timestamp,
            uint8 statusCode
        )
    {
        airline = flights[flightKeys[index]].airline;
        flight = flights[flightKeys[index]].flight;
        timestamp = flights[flightKeys[index]].timestamp;
        statusCode = flights[flightKeys[index]].statusCode;
    }

    function getFlightsCount() external view returns (uint256 count) {
        return flightKeys.length;
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal pure {}

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string flight,
        uint256 timestamp
    ) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    // For testing/debugging
    function getOracleIndexes(address account)
        external
        view
        requireContractOwner
        returns (uint8[3])
    {
        return oracles[account].indexes;
    }

    function getMyIndexes() external view returns (uint8[3]) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns (uint8[3]) {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // requireIsOperational requireIsAirline paidEnough(PARTICIPATION_FEE)
    // function payAirlineDues() external payable {
    //     flightSuretyData.payAirlineDues(flightSuretyDataContractAddress, msg.sender);
    // }

    /**
     * @dev Pay the required dues to be able to fully participate in a contract
     *
     * requireIsAirline
     */
    function payAirlineDues()
        external
        payable
        requireIsOperational
        paidEnough(PARTICIPATION_FEE)
    {
        require(
            flightSuretyData.isAirline(msg.sender),
            "Caller is not an airline"
        );

        require(
            flightSuretyData.getAirlineState(msg.sender) == 1,
            "Airline must be in the registered state to be fundable"
        );

        address payableAddr = address(uint160(flightSuretyDataContractAddress));
        payableAddr.transfer(PARTICIPATION_FEE);

        // Set airline state to funded
        flightSuretyData.updateAirlineState(msg.sender, 2);
    }

    function approveAirline(address airline) external onlyPaidAirlines {
        flightSuretyData.approveAirline(airline, msg.sender);
    }

    //////////////////////////////////////////////////////////////////////////
    //        INSURANCE
    //////////////////////////////////////////////////////////////////////////
    uint256 public constant MAX_ALLOWED_INSURANCE = 1 ether;
    event InsurancePurchased(
        address passenger,
        address airline,
        bytes32 flightKey
    );

    function purchaseInsurance(
        address airline,
        string flight,
        uint256 amount,
        uint256 timestamp
    ) external payable {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        require(
            bytes(flights[flightKey].flight).length > 0,
            "Flight does not exist"
        );
        require(
            msg.value <= MAX_ALLOWED_INSURANCE,
            "Passengers can buy a maximum of 1 ether for flight insurance"
        );

        address payableAddr = address(uint160(flightSuretyDataContractAddress));
        payableAddr.transfer(amount);

        flightSuretyData.purchaseInsurance(flight, amount, msg.sender);

        emit InsurancePurchased(msg.sender, airline, flightKey);
    }

    function getInsurance(string flight)
        external
        view
        returns (
            string flightNo,
            uint256 price,
            uint256 payout,
            uint8 state
        )
    {
        return flightSuretyData.getInsurance(msg.sender, flight);
    }

    // endregion
}

contract FlightSuretyData {
    function isOperational() external returns (bool);

    function registerAirline(address airline)
        external
        returns (bool success, uint8 state);

    function isAirline(address airline) external returns (bool);

    function updateAirlineState(address airline, uint8 state) external;

    function getAirlineState(address airline) external returns (uint8);

    function approveAirline(address airline, address approver)
        external
        returns (uint8);

    function purchaseInsurance(
        string flight,
        uint256 amount,
        address passenger
    ) external payable;

    function getInsurance(address passengerAddr, string flight)
        external
        returns (
            string flightNo,
            uint256 price,
            uint256 payout,
            uint8 state
        );
}
