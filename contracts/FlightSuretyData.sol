pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false

    uint8 private constant NUMBER_OF_SINGLE_REGISTRATIONS_ALLOWED = 4; // The maximum number of airlines that can be singly registered
    uint256 private constant PARTICIPATION_FEE = 10 ether;

    mapping(address => bool) private authorizedContracts;

    enum AirlineState {
        APPLIED,
        REGISTERED,
        FUNDED
    }
    struct Airline {
        // string name;
        bool created;
        AirlineState state;
    }
    mapping(address => Airline) private airlines;

    uint256 internal numAirlines = 0;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor() public {
        contractOwner = msg.sender;
    }

    event AirlineApplied(address airline);
    event AirlineRegistered(address airline);
    event AirlinePaid(address airline);

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
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
     * @dev Modifier that requires that requires an authorized caller to be the function caller
     */
    modifier isAuthorized(address caller) {
        require(
            authorizedContracts[caller] == true,
            "Caller is not authorized"
        );
        _;
    }

    /**
     * Modifier that requires that no airlines have yet been added or that the caller is an airline
     */
    modifier requireCallerToBeExistingAirline() {
        require(
            numAirlines == 0 || airlines[msg.sender].created,
            "Caller is not an existing airline"
        );
        _;
    }

    /**
     * Modifier that requires that the maximum number of single registrations 
     allowed has not been exceeded
     */
    modifier requireAllowableSingleRegistrations() {
        require(
            numAirlines < NUMBER_OF_SINGLE_REGISTRATIONS_ALLOWED,
            "Maximum number of singular registrations met"
        );
        _;
    }

    modifier airlineDoesNotExist(address airline) {
        require(!airlines[airline].created, "Airline already exists");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /**
     * @dev Sets the provided address as an authorized caller
     *
     * Only the contract owner can invoke this function
     */
    function authorizeCaller(address dataContract)
        external
        requireContractOwner
    {
        authorizedContracts[dataContract] = true;
    }

    /**
     * @dev Removes the provided address as an authorized caller
     *
     * Only the contract owner can invoke this function
     */
    function deauthorizeCaller(address dataContract)
        external
        requireContractOwner
    {
        delete authorizedContracts[dataContract];
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(address airline/*, string name*/)
        external
        requireIsOperational
        requireCallerToBeExistingAirline
        requireAllowableSingleRegistrations
        airlineDoesNotExist(airline)
        returns (bool success/*, string airlineName*/, uint8 state, uint256 votes)
    {
        // votes = 0;
        
        success = false;
        if (numAirlines == 0) {
            airlines[airline] = Airline({
                // name: name,
                created: true,
                state: AirlineState.REGISTERED
            });
            numAirlines = numAirlines.add(1);
            // numAirlines++;

            emit AirlineRegistered(airline);
        } else {
            // Add a new airline without any permissions
            airlines[airline] = Airline({
                // name: name,
                created: true,
                state: AirlineState.APPLIED
            });
            numAirlines = numAirlines.add(1);
            // numAirlines++;

            emit AirlineApplied(airline);
        }

        // airlineName = name;
        state = uint8(airlines[airline].state);
        success = true;
    }

    /**
     * @dev Checks if the provided address belongs to an airline
     */
    function isAirline(address airline)
        external
        requireIsOperational
        requireCallerToBeExistingAirline
        returns (bool)
    {
        return airlines[airline].created;
    }
    
    function getAirlineState(address airline) external requireIsOperational returns (uint8) {
        return 0; // TODO Switch with implementation
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy() external payable {}

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees() external pure {}

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay() external pure {}

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund() public payable {}

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {
        fund();
    }

    // require(msg.value >= PARTICIPATION_FEE);

    function getNumberOfAirlines() external requireIsOperational returns (uint256) {
        return numAirlines;
    }
}
