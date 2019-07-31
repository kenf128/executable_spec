require('it-each')();
const { chai, getPlaces, calculateFareRange } = require('./helper.js');
const API_URL = process.env.API_URL; // set API_URL based on environment variable

var newOrders = [];
var orderToComplete, orderToCancel;

before(() => {
	if (typeof(API_URL) == 'undefined' || !API_URL.match(/^http/i)) {
		console.error('Please specify API URL as follows: \nexport API_URL=http://localhost:51544/v1 # substitute URL for API under test\n');
		process.exit(1);
	}
	console.log(`Testing ${API_URL}\n`);
})

describe("Order Processing API", () => {
    describe("Place Order", () => {
		context('delivery in Hong Kong', () => {
			it('creates a new order', (done) => {
				chai.request(API_URL)
					.post('/orders')
					.set('content-type', 'application/json; charset=utf-8')
					.send({"stops": getPlaces('HK')})
					.end((err, res) => {
						res.should.have.status(201);
						newOrders.push(res.body);
						done();
					})
			})
		})
		context('delivery in Ho Chi Minh City', () => {
			it('creates a new order', (done) => {
				chai.request(API_URL)
					.post('/orders')
					.set('content-type', 'application/json; charset=utf-8')
					.send({"stops": getPlaces('HCMC')})
					.end((err, res) => {
						res.should.have.status(201);
						newOrders.push(res.body);
						done();
					})
			})
		})
		context('delivery in a non-serviced country', () => {
			it('does not create an order', (done) => {
				chai.request(API_URL)
					.post('/orders')
					.set('content-type', 'application/json; charset=utf-8')
					.send({"stops": getPlaces('USA')})
					.end((err, res) => {
						res.status.should.not.be.within(200, 299);
						done();
					})
			})
		})
		context('for each order created', () => {
			it.each(newOrders, 'assigns a numeric order id', (order) => {
				Number.isInteger(order.id).should.be.true;
			})
			it.each(newOrders, 'calculates distances', (order) => {
				order['totalDistanceInMeters'] = order.drivingDistancesInMeters.reduce((a, sum) => a + sum);
				order['totalDistanceInMeters'].should.be.gt(0);
			})
			it.each(newOrders, 'calculates fare', (order) => {
				var fareRecorded = Number(order.fare.amount)
				var [normalFare, nightFare] = calculateFareRange(order.totalDistanceInMeters)
				fareRecorded.should.be.within(normalFare - 1, nightFare + 1)
			})
		})
    })

    describe("Fetch Order Details", () => {
		context('for each order fetched', () => {
			it.each(newOrders, 'provides distances, fare, and status', (order, done) => {
				chai.request(API_URL)
					.get(`/orders/${order.id}`)
					.end((err, res) => {
						res.should.have.status(200);
						res.body.id.should.eq(order.id)
						// check count of stops and distances
						var numStops = res.body.stops.length;
						var numDistances = res.body.drivingDistancesInMeters.length;
						numStops.should.be.gte(2);
						numDistances.should.eq(numStops-1);
						numDistances.should.eq(order.drivingDistancesInMeters.length);
						// check fare amount 
						Math.abs(Number(res.body.fare.amount) - Number(order.fare.amount)).should.be.lt(1);
						res.body.status.should.match(/assigning/i);
						done();
					})
			})
		})
		context('if order not found', () => {
			it('returns a client error', (done) => {
				chai.request(API_URL)
					.get('/orders/0')
					.end((err, res) => {
						res.status.should.be.within(400, 499);
						done();
					})
			})
		  })
	})

	describe("Driver to Take the Order", () => {
		it('advances the order to Ongoing status', (done) => {
			orderToComplete = newOrders[0];
			chai.request(API_URL)
				.put(`/orders/${orderToComplete.id}/take`)
				.end((err, res) => {
					res.should.have.status(200);
					res.body['status'].should.match(/ongoing/i)
					done();
				})
		})
		context('if order not found', () => {
			it('returns a client error', (done) => {
				chai.request(API_URL)
					.put('/orders/0/take')
					.end((err, res) => {
						res.status.should.be.within(400, 499);
						done();
					})
			})
		})
	})

	describe("Driver to Complete the Order", () => {
		it('advances the order to Completed status', (done) => {
			chai.request(API_URL)
				.put(`/orders/${orderToComplete.id}/complete`)
				.end((err, res) => {
					res.should.have.status(200);
					res.body['status'].should.match(/completed/i)
					done();
				})
		})
		context('once completed', () => {
			it('the order cannot be cancelled', (done) => {
				chai.request(API_URL)
					.put(`/orders/${orderToComplete.id}/cancel`)
					.end((err, res) => {
						res.should.have.status(422);
						done();
					})
			})
			it('the order cannot be taken again', (done) => {
				chai.request(API_URL)
					.put(`/orders/${orderToComplete.id}/take`)
					.end((err, res) => {
						res.should.have.status(422);
						done();
					})
			})
		})
	})

	describe("Cancel Order", () => {
		it('advances the order to Cancelled status', (done) => {
			orderToCancel = newOrders[1];
			chai.request(API_URL)
				.put(`/orders/${orderToCancel.id}/cancel`)
				.end((err, res) => {
					res.should.have.status(200);
					res.body['status'].should.match(/cancelled/i)
					done();
				})
		})
		context('once cancelled', () => {
			it('the order cannot be completed', (done) => {
				chai.request(API_URL)
					.put(`/orders/${orderToCancel.id}/complete`)
					.end((err, res) => {
						res.should.have.status(422);
						done();
					})
			})
			it('the order cannot be taken', (done) => {
				chai.request(API_URL)
					.put(`/orders/${orderToCancel.id}/take`)
					.end((err, res) => {
						res.should.have.status(422);
						done();
					})
			})
		})
	})
})
