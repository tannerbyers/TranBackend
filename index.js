const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const request = require('request')

console.log(process.env);


app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(bodyParser.json({
  extended: true
}));

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'https://client-transcipture.herokuapp.com');
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

const clientID = "wvaVD6itTme4P9YBmPMZkg"
const clientSecret = "2s0yXD5CXj3Sm49GCxUOxJTeDPdFIdyc"
const redirectURL = (process.env.redirectURL || "https://client-transcipture.herokuapp.com/")

// Put all API endpoints under '/api'
app.get('/*', (req, res) => {
  // Return them as json
  res.json({ "Test": "test" });
});

app.post('/api/auth', (newreq, response) => {
  // Return them as json
  console.log("Code Received", newreq.body.code)

  if (newreq.body.code) {
    // Step 3: 
    // Request an access token using the auth code
    let url = 'https://zoom.us/oauth/token?grant_type=authorization_code&code=' + newreq.body.code + '&redirect_uri=' + redirectURL;
    console.log("REQUEST URL", url)

    request({
      headers: {
        "Authorization": "Basic d3ZhVkQ2aXRUbWU0UDlZQm1QTVprZzoyczB5WEQ1Q1hqM1NtNDlHQ3hVT3hKVGVEUGRGSWR5Yw=="
      },
      uri: url,
      method: 'POST'
    }, function (err, res, body) {
      //it works!
      console.log(res)
      
    });
  }
})

const port = process.env.PORT || 5000;
app.listen(port);

console.log(`Server listening on ${port}`);