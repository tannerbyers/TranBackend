const express = require('express');
const path = require('path');
const request = require('request')

const app = express();

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'https://ancient-waters-27303.herokuapp.com');

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

const clientID="wvaVD6itTme4P9YBmPMZkg"
const clientSecret="2s0yXD5CXj3Sm49GCxUOxJTeDPdFIdyc"
const redirectURL= (process.env.redirectURL || "https://transcripture.herokuapp.com/")
console.log(process.env.redirectURL)

/* GET users listing. */
app.get('/auth', function(req, res, next) {

    // Step 1: 
    // Check if the code parameter is in the url 
    // if an authorization code is available, the user has most likely been redirected from Zoom OAuth
    // if not, the user needs to be redirected to Zoom OAuth to authorize

    if (req.query.code) {

      // Step 3: 
      // Request an access token using the auth code

      let url = 'https://zoom.us/oauth/token?grant_type=authorization_code&code=' + req.query.code + '&redirect_uri=' + redirectURL;
      console.log("REQUEST URL", url)
      request.post(url, (error, response, body) => {

          // Parse response to JSON
          body = JSON.parse(body);

          // Logs your access and refresh tokens in the browser
          console.log(`access_token: ${body.access_token}`);
          console.log(`refresh_token: ${body.refresh_token}`);

          console.log("Error:", error)
          console.log("Res:", response)

          if (body.access_token) {

              // Step 4:
              // We can now use the access token to authenticate API calls

              // Send a request to get your user information using the /me context
              // The `/me` context restricts an API call to the user the token belongs to
              // This helps make calls to user-specific endpoints instead of storing the userID

              request.get('https://api.zoom.us/v2/users/me', (error, response, body) => {
                  if (error) {
                      console.log('API Response Error: ', error)
                  } else {
                      body = JSON.parse(body);
                      // Display response in console
                      console.log('API call ', body);
                      // Display response in browser
                      var JSONResponse = '<pre><code>' + JSON.stringify(body, null, 2) + '</code></pre>'
                      res.send(`
                          <style>
                              @import url('https://fonts.googleapis.com/css?family=Open+Sans:400,600&display=swap');@import url('https://necolas.github.io/normalize.css/8.0.1/normalize.css');html {color: #232333;font-family: 'Open Sans', Helvetica, Arial, sans-serif;-webkit-font-smoothing: antialiased;-moz-osx-font-smoothing: grayscale;}h2 {font-weight: 700;font-size: 24px;}h4 {font-weight: 600;font-size: 14px;}.container {margin: 24px auto;padding: 16px;max-width: 720px;}.info {display: flex;align-items: center;}.info>div>span, .info>div>p {font-weight: 400;font-size: 13px;color: #747487;line-height: 16px;}.info>div>span::before {content: "👋";}.info>div>h2 {padding: 8px 0 6px;margin: 0;}.info>div>p {padding: 0;margin: 0;}.info>img {background: #747487;height: 96px;width: 96px;border-radius: 31.68px;overflow: hidden;margin: 0 20px 0 0;}.response {margin: 32px 0;display: flex;flex-wrap: wrap;align-items: center;justify-content: space-between;}.response>a {text-decoration: none;color: #2D8CFF;font-size: 14px;}.response>pre {overflow-x: scroll;background: #f6f7f9;padding: 1.2em 1.4em;border-radius: 10.56px;width: 100%;box-sizing: border-box;}
                          </style>
                          <div class="container">
                              <div class="info">
                                  <img src="${body.pic_url}" alt="User photo" />
                                  <div>
                                      <span>Hello World!</span>
                                      <h2>${body.first_name} ${body.last_name}</h2>
                                      <p>${body.role_name}, ${body.company}</p>
                                  </div>
                              </div>
                              <div class="response">
                                  <h4>JSON Response:</h4>
                                  <a href="https://marketplace.zoom.us/docs/api-reference/zoom-api/users/user" target="_blank">
                                      API Reference
                                  </a>
                                  ${JSONResponse}
                              </div>
                          </div>
                      `);
                  }
              }).auth(null, null, true, body.access_token);

          } else {
              // Handle errors, something's gone wrong!
          }

      }).auth(clientID, clientSecret);

      return;

  }

  // Step 2: 
  // If no authorization code is available, redirect to Zoom OAuth to authorize
  res.redirect('https://zoom.us/oauth/authorize?response_type=code&client_id=' + clientID + '&redirect_uri=' + redirectURL)
})

// Put all API endpoints under '/api'
app.get('/*', (req, res) => {
  // Return them as json
  res.json({"Test": "test"});
});

const port = process.env.PORT || 5000;
app.listen(port);

console.log(`Server listening on ${port}`);