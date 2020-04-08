const express = require("express")
const path = require("path")
const bodyParser = require("body-parser")
const app = express()
const request = require("request")
const https = require('https');
const fs = require('fs');

console.log(process.env)

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.use(
  bodyParser.json({
    extended: true,
  })
)

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*")

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  )

  // Request headers you wish to allow
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type")

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true)

  // Pass to next layer of middleware
  next()
})

const clientID = "wvaVD6itTme4P9YBmPMZkg"
const clientSecret = "2s0yXD5CXj3Sm49GCxUOxJTeDPdFIdyc"
const redirectURL =
  process.env.redirectURL || "https://client-transcipture.herokuapp.com/"
let accessToken
let userId
let OauthPromise

// Put all API endpoints under '/api'
// app.get('/*', (req, res) => {
//   // Return them as json
//   res.json({ Test: 'test' })
// })

app.post("/api/auth", (newreq, response) => {
  // Return them as json
  console.log("Code Received", newreq.body.code)

  if (newreq.body.code) {
    // Step 3:
    // Request an access token using the auth code
    let url =
      "https://zoom.us/oauth/token?grant_type=authorization_code&code=" +
      newreq.body.code +
      "&redirect_uri=" +
      redirectURL
    console.log("REQUEST URL", url)

    request(
      {
        headers: {
          Authorization:
            "Basic d3ZhVkQ2aXRUbWU0UDlZQm1QTVprZzoyczB5WEQ1Q1hqM1NtNDlHQ3hVT3hKVGVEUGRGSWR5Yw==",
        },
        uri: url,
        method: "POST",
      },
      async function (err, res, body) {
        //it works!
        //console.log(res)
        accessToken = JSON.parse(res.body).access_token
        OauthPromise = new Promise(function (resolve, reject) {
          return resolve(accessToken)
        })
        OauthPromise.then((data) => {
          response.send(data)
        })
      }
    )
  }
})

app.get("/api/me", async (req, response, next) => {
  let url = "https://api.zoom.us/v2/users/me"
  request(
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      uri: url,
      method: "GET",
    },
    async function (err, res, body) {
      //console.log(res)
      let me = JSON.parse(res.body)
      let userDataPromise = new Promise(function (resolve, reject) {
        return resolve(me)
      })
      userDataPromise.then((data) => {
        console.log(data)
        userId = data.id
        console.log(userId)
        response.send(data)
      })
    }
  )
})

app.get("/api/recordings", async (req, response, next) => {
  let url = `https://api.zoom.us/v2/users/me/recordings?from=2020-01-01?to=2020-04-07`

  request(
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      uri: url,
      method: "GET",
    },
    async function (err, res, body) {
      console.log("Get Meetings Data Response", res)
      let firstFile = JSON.parse(res.body).meetings[0].recording_files[0].download_url
      response.send(firstFile)
    }
  )
})

const port = process.env.PORT || 5000
app.listen(port)

console.log(`Server listening on ${port}`)
