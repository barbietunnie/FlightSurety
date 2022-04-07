import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";

(async () => {
  let result = null;

  let contract = new Contract("localhost", () => {
    // Read transaction
    contract.isOperational((error, result) => {
      console.log(error, result);
      display("Operational Status", "Check if contract is operational", [
        { label: "Operational Status", error: error, value: result },
      ]);
    });

    // Load the flights
    contract.loadFlights((error, flights) => {
      const selectField = DOM.elid("flights");
      flights.forEach((flight, index) => {
        selectField.appendChild(createSelectOption(flight, index));
      });
    });

    // User-submitted transactions
    DOM.elid("submit-oracle").addEventListener("click", () => {
      let flight = DOM.elid("flight-number").value;
      // Write transaction
      contract.fetchFlightStatus(flight, (error, result) => {
        display("Oracles", "Trigger oracles", [
          {
            label: "Fetch Flight Status",
            error: error,
            value: result.flight + " " + result.timestamp,
          },
        ]);
      });
    });

    DOM.elid("buy-insurance").addEventListener("click", () => {
      let flight = DOM.elid("flights").value;
      let fee = DOM.elid("amount").value;

      if (flight == "") {
          alert('You need to select a flight from the dropdown');
          return;
      }

      if (isNaN(fee) || Number(fee) > 1) {
        alert('The insurance fee must be a number not more than 1 ether');
        return;
      }

      contract.purchaseInsurance(Number(flight), fee.toString(), (error, result) => {
        display("Flight Insurance", "Purchase flight Insurance", [
          {
            label: "Purchase flight insurance",
            error: error,
            value:
              result.flight +
              " " +
              result.timestamp +
              " " +
              result.state +
              " price: " +
              result.price +
              "payout (in ETH): " +
              result.payout +
              " ETH",
          },
        ]);
      });
    });
  });
})();

function createSelectOption(flight, index) {
  const option = document.createElement("option");
  option.value = index; // TODO: A more robust key can be used subsequently
  option.textContent = `${flight.flight} on ${prettyDate(flight.timestamp)}`;
  return option;
}

function prettyDate(timestamp) {
  return new Date(timestamp * 1000).toDateString();
}

function display(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper");
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: "row" }));
    row.appendChild(DOM.div({ className: "col-sm-4 field" }, result.label));
    row.appendChild(
      DOM.div(
        { className: "col-sm-8 field-value" },
        result.error ? String(result.error) : String(result.value)
      )
    );
    section.appendChild(row);
  });
  displayDiv.append(section);
}
