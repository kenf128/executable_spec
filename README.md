# Sample Executable Specifications

```Testing http://localhost:51544/v1

  Order Processing API
    Place Order
      delivery in Hong Kong
        ✓ creates a new order (1006ms)
      delivery in Ho Chi Minh City
        ✓ creates a new order (112ms)
      delivery in a non-serviced country
        ✓ does not create an order (110ms)
      for each order created
        ✓ assigns a numeric order id - 2/2
        ✓ calculates distances - 2/2
        ✓ calculates fare - 2/2
    Fetch Order Details
      for each order fetched
        ✓ provides distances, fare, and status - 2/2
      if order not found
        ✓ returns a client error
    Driver to Take the Order
      ✓ advances the order to Ongoing status
      if order not found
        ✓ returns a client error
    Driver to Complete the Order
      ✓ advances the order to Completed status
      once completed
        ✓ the order cannot be cancelled
        ✓ the order cannot be taken again
    Cancel Order
      ✓ advances the order to Cancelled status
      once cancelled
        ✓ the order cannot be completed
        ✓ the order cannot be taken


  16 passing (1s)
```
