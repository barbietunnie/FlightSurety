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
        bool created;
        bool participant;
        AirlineState state;
    }
    mapping(address => Airline) internal airlines;

    uint256 internal numAirlines = 0;
    uint256 internal totalAirlinesFunded = 0;

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
    event AirlineFunded(address airline);

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
    modifier requireCallerIsAirline() {
        require(
            numAirlines == 0 || airlines[msg.sender].created,
            "Caller is not an existing airline"
        );
        _;
    }

    /**
     * Modifier that requires that that the provided address is an airline
     */
    modifier requireIsAirline(address airline) {
        require(
            airlines[airline].created,
            "Airline does not exist"
        );
        _;
    }

    modifier airlineDoesNotExist(address airline) {
        require(!airlines[airline].created, "Airline already exists");
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
    function registerAirline(address airline)
        external
        requireIsOperational
        requireCallerIsAirline
        airlineDoesNotExist(airline)
        returns (bool success, uint8 state)
    {
        if (numAirlines < NUMBER_OF_SINGLE_REGISTRATIONS_ALLOWED) {
            airlines[airline] = Airline({
                created: true,
                participant: false,
                state: AirlineState.REGISTERED
            });

            emit AirlineRegistered(airline);
        } else {
            // Add a new airline without any permissions
            airlines[airline] = Airline({
                created: true,
                participant: false,
                state: AirlineState.APPLIED
            });

            emit AirlineApplied(airline);
        }

        numAirlines = numAirlines.add(1);

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
        returns (bool)
    {
        return airlines[airline].created;
    }

    function getAirlineState(address airline)
        external
        requireIsOperational
        requireCallerIsAirline
        returns (uint8 state)
    {
        // return uint8(airlines[airline].state);

        if (airlines[airline].state == AirlineState.APPLIED) {
            state = 0;
        } else if (airlines[airline].state == AirlineState.REGISTERED) {
            state = 1;
        } else if (airlines[airline].state == AirlineState.FUNDED) {
            state = 2;
        }
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

    function getNumberOfAirlines()
        external
        requireIsOperational
        requireContractOwner
        returns (uint256)
    {
        return numAirlines;
    }
    
    function updateAirlineState(address airline, uint8 state)
        external
        requireIsOperational
        requireIsAirline(airline)
    {
        airlines[airline].state = AirlineState(state);

        if (state == 2) {
            totalAirlinesFunded = totalAirlinesFunded.add(1);
            emit AirlineFunded(airline);
        }
    }

    // /**
    //  * @dev Pay the required dues to be able to fully participate in a contract
    //  */
    // function payAirlineDues(address contractAddress, address airline)
    //     external
    //     payable
    //     requireIsOperational
    //     requireCallerIsAirline
    //     paidEnough(PARTICIPATION_FEE)
    // {
    //     require(isAirline(airline), "Caller is not an airline");

    //     // require(
    //     //     msg.value >= PARTICIPATION_FEE,
    //     //     "Your balamce is less than the amount required for funding"
    //     // );
    //     address payableAddr = address(uint160(contractAddress));
    //     payableAddr.transfer(PARTICIPATION_FEE);

    //     // Update the status of the airline
    //     airlines[msg.sender].state = AirlineState.FUNDED;

    //     emit AirlineFunded(msg.sender);
    // }
}
