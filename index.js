const cors = require('cors');
const express = require('express');
const Stripe = require('stripe');
const { uuid } = require('uuid');
const axios = require('axios');

require('dotenv').config();

const stripe = Stripe(process.env.STRIPE_SECURITY_LIVE_KEY);
const app = express();
const port = process.env.PORT || 4000;


app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested, Content-Type, Accept Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header(
      "Access-Control-Allow-Methods",
      "POST, PUT, PATCH, GET, DELETE"
    );
    return res.status(200).json({});
  }
  next();
})

// Strips payment getway
let endpointSecret = 'we_1LGRXxSG87iO1ygUIOCFSumQ';
app.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
  const sig = request.headers['stripe-signature'];

  let data;
  let eventType;

  if (endpointSecret) {

    let event;

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      console.log(err)
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
    data = event.data.object;
    eventType = event.type;
  }
  else {
    data = request.body.data.object;
    eventType = request.body.type;
  }


  // Handle the event
  if (eventType === 'checkout.session.completed') {
    stripe.customers.retrieve(data.customer).then(async (customer) => {
      console.log('customer', customer)
      console.log('data', data)
      const res = await axios.post('https://myonwardticket.com/admin/api/savepaymentdetails', {
        "booking_id": customer.metadata.bookingId,
        "price": customer.metadata.price / 100,
        "payment_id": data.payment_intent,
        "response_type": data.status === 'complete' ? 'success' : 'failed',
        "payment_type": data.payment_method_types,
        "hotel_or_flight": customer.metadata.name,
        "currency": customer.metadata.currency,
      })
    }).catch(error => {
      console.log(error);
    });
  }
  response.send().end();
});

app.post('/checkout-success', async (req, res) => {
  const session_id = req.body.session_id;
  const session = await stripe.checkout.sessions.retrieve(session_id);
  const customer = await stripe.customers.retrieve(session.customer);
  let response;
  try {
    response = await axios.post('https://mydummyticket.gravitonestest.tech/admin/api/savepaymentdetails', {
      "booking_id": customer.metadata.bookingId,
      "currency": customer.metadata.currency,
      "price": customer.metadata.currency === 'inr' ? customer.metadata.price : customer.metadata.price / 100,
      "payment_id": session.payment_intent,
      "response_type": session.status === 'complete' ? 'success' : 'failed',
      "payment_type": session.payment_method_types,
      "hotel_or_flight": customer.metadata.name
    })
  } catch (error) {
    console.log(error)
  }
  res.json({ customer, session: JSON.stringify(session) });
});

app.post('/create-checkout-session', async (req, res) => {
  let customer;
  let session;
  try {
    customer = await stripe.customers.create({
      metadata: {
        name: req.body.name || 'Flight',
        price: Math.floor(req.body.price),
        bookingId: req.body.bookingId,
        currency: 'usd'
      }
    })
  } catch (error) {
    console.log(error)
  }
  try {
    console.log({ customer })
    session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price_data: {
            currency: customer.metadata.currency,
            product_data: {
              name: customer.metadata.name || 'Flight',
            },
            unit_amount: customer.metadata.price,
          },
          quantity: req.body.quantity || 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/checkout-cancel`,
    });
  } catch (error) {
    console.log(error)
  }
  return res.status(200).json({ url: session.url });
});

// SearchFlight

app.get('/searchFlights', async (req, res) => {
  const JourneyType = req.body.JourneyType;
  const Origin = req.body.Origin;
  const Destination = req.body.Destination;
  const PreferredDepartureTime = req.body.PreferredDepartureTime;
  const PreferredArrivalTime = req.body.PreferredArrivalTime;

  var data = JSON.stringify({
    "EndUserIp": "157.41.253.164",
    "ClientId": "180105",
    "UserName": "VikramCo",
    "Password": "VikRam#105",
    "AdultCount": "1",
    "ChildCount": "1",
    "InfantCount": "0",
    "JourneyType": "1",
    "Segments": [
      {
        "Origin": "DEL",
        "Destination": "BOM",
        "FlightCabinClass": "1",
        "PreferredDepartureTime": "2020-06-26T00:00:00",
        "PreferredArrivalTime": "2020-06-26T00:00:00"
      }
    ]
  });
  var config = {
    method: 'post',
    url: 'https://flight.srdvtest.com/v5/rest/Search',
    headers: {
      'API-Token': 'VikRam#CoN@5',
      'Content-Type': 'application/json'
    },
    data: data
  };
  axios(config)
    .then(function (response) {
      res.status(200).json(response.data);
      console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });
  // console.log(response);
});


// SearchHotels
app.get('/searchHotels', async (req, res) => {
  const JourneyType = req.body.JourneyType;
  const Origin = req.body.Origin;
  const Destination = req.body.Destination;
  const PreferredDepartureTime = req.body.PreferredDepartureTime;
  const PreferredArrivalTime = req.body.PreferredArrivalTime;

  var data = JSON.stringify(
    {
      "EndUserIp": "1.1.1.1",
      "ClientId": "180105",
      "UserName": "VikramCo",
      "Password": "VikRam#105",
      "BookingMode": "5",
      "CheckInDate": "30/04/2020",
      "NoOfNights": 1,
      "CountryCode": "IN",
      "CityId": "130443",
      "ResultCount": null,
      "PreferredCurrency": "INR",
      "GuestNationality": "IN",
      "NoOfRooms": "1",
      "RoomGuests": [
        {
          "NoOfAdults": "1",
          "NoOfChild": "0",
          "ChildAge": []
        }
      ],
      "PreferredHotel": "",
      "MaxRating": "5",
      "MinRating": "0",
      "ReviewScore": null,
      "IsNearBySearchAllowed": false
    }
  );
  var config = {
    method: 'post',
    url: 'https://hotel.srdvtest.com/v5/rest/Search',
    headers: {
      'API-Token': 'VikRam#CoN@5',
      'Content-Type': 'application/json'
    },
    data: data
  };
  axios(config)
    .then(function (response) {
      res.status(200).json(response.data);
      console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });
});
app.listen(port, () => {
  console.log(`App is listening on port ${port}`)
})
