const express = require("express")
const path = require("path")
const bodyParser = require("body-parser")
const app = express()
const request = require("request")
//.defaults({ encoding: null });
const https = require("https")
const fs = require("fs")
const db = require("./db.js")
const MongoClient = require("mongodb").MongoClient
const google = require("./Google.js")
const linear16 = require("linear16")

console.log("Server has started (not listening)")
const MongoDBurl =
  "mongodb+srv://joemama:gogogo@transcripturecluster-dan2o.mongodb.net/test?retryWrites=true&w=majority"

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

// ALLOWS CORS
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

const redirectURL =
  process.env.redirectURL || "https://client-transcipture.herokuapp.com/"

let accessToken
let userAuthCode
let userId
let OauthPromise
let arrayOfAudioPathAndTranscriptionPath
let database, collectionUsers, collectionTranscriptions, collectionFolders
const base64encodedClientIdAndSecret =
  "d3ZhVkQ2aXRUbWU0UDlZQm1QTVprZzoyczB5WEQ1Q1hqM1NtNDlHQ3hVT3hKVGVEUGRGSWR5Yw=="

// Put all API endpoints under '/api'

app.post("/api/auth", (newreq, response) => {
  console.log("Auth Code Received", newreq.body.code)
  userAuthCode = newreq.body.code

  if (userAuthCode) {
    // Request an access token using the above user auth code
    let AccessTokenRequestUrl =
      "https://zoom.us/oauth/token?grant_type=authorization_code&code=" +
      newreq.body.code +
      "&redirect_uri=" +
      redirectURL

    request(
      {
        headers: {
          Authorization: `Basic ${base64encodedClientIdAndSecret}`,
        },
        uri: AccessTokenRequestUrl,
        method: "POST",
      },
      async function (err, res, body) {
        if (err) {
          console.log("Error hit when requesting access token:", err)
          return err
        }
        accessToken = JSON.parse(res.body).access_token
        console.log("Access token received: ", accessToken)

        OauthPromise = new Promise(function (resolve, reject) {
          return resolve(accessToken)
        })

        OauthPromise.then((data) => {
          console.log("Oauth Access token : ", data)
          // collectionUsers.insertOne(
          //   {
          //     name: "test user",
          //     userAuthCode: userAuthCode,
          //     accessToken: data,
          //   },
          //   (error, result) => {
          //     if (error) {
          //       console.log("Error adding user", error)
          //     }
          //     console.log("result of adding user:", result.ops[0])
          //   }
          // )
          if (accessToken) {
            response.send("New Access token received")
          } else {
            response.send("New Accses token issue. Check backend logs")
          }
        })
      }
    )
  }
})

app.get("/api/token", async (req, res, next) => {
  collectionUsers.findOne({ userAuthCode: userAuthCode }, (error, result) => {
    if (error) {
      console.log("Error getting new token", error)
    }
    res.send("New Token Received", result)
  })
})

// This is not currently being used. Not sure if it works properly
app.get("/api/me", async (req, response, next) => {
  let url = "https://api.zoom.us/v2/users/me"
  console.log("me token : ", accessToken)

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
  console.log("access token : ", accessToken)
  request(
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      uri: url,
      method: "GET",
    },
    async function (err, res, body) {
      console.log("Get Meetings Data Response", res.body.ops)
      let firstFile = JSON.parse(res.body).meetings[0].recording_files[1]
        .download_url

      let videoUrls = JSON.parse(res.body).meetings

      console.log(videoUrls.length)
      arrayOfAudioPathAndTranscriptionPath = []

      for (let i = 0; i < videoUrls.length; i++) {
        console.log("we're starting the transcription")

        let file = fs.createWriteStream(`./ZoomMedia/testfile${[i]}.m4a`)

        request(videoUrls[i].recording_files[1].download_url).pipe(file)

        file.on("finish", async () => {
          console.log("does this ever finish?")
          const outPath = linear16(
            `./ZoomMedia/testfile${[i]}.m4a`,
            `./ConvertedMedia/testfile${[i]}.wav`
          )
          const bucket = "trans-audiofiles"
          const audioFile = `./ConvertedMedia/testfile${[i]}.wav`
          console.log("Transcription Called")
          google
            .uploadToBucket(bucket, audioFile)
            .then(async () => {
              let transcript = google.transcribe(
                `gs://${bucket}/${audioFile.split("/").pop()}`
              )
              return await transcript
            })
            .then((result) => {
              fs.writeFile(
                `./ConvertedMedia/testfile${[i]}.txt`,
                result,
                function (err) {
                  arrayOfAudioPathAndTranscriptionPath.push({
                    transcriptionFilePath: `./ConvertedMedia/testfile${[
                      i,
                    ]}.txt`,
                    videoFilePath: `./ZoomMedia/testfile${[i]}.m4a`,
                    content: result,
                    ancestors: ["Home"],
                  })
                  if (
                    arrayOfAudioPathAndTranscriptionPath.length ===
                    videoUrls.length
                  ) {
                    console.log("did this finish?")
                    uploadTransToDB(arrayOfAudioPathAndTranscriptionPath)
                    response.send(arrayOfAudioPathAndTranscriptionPath)
                  } else {
                    console.log(
                      "arrayOfAudioPathAndTranscriptionPath",
                      arrayOfAudioPathAndTranscriptionPath.length
                    )
                    console.log("videoUrls.length", videoUrls.length)
                  }
                  if (err) throw err
                  console.log(
                    `./ConvertedMedia/testfile${[
                      i,
                    ]}.txt is created successfully.`
                  )
                }
              )
            })
        })
        // For Loop ends
        console.log("ITS OVER BABY")
      }
    }
  )
})

app.get("/api/db/transcripts", async (req, res, next) => {
  collectionTranscriptions
    .find({})
    .toArray()
    .then((results) => res.send(results))
})

app.get("/api/db/folders", async (req, res, next) => {
  collectionFolders.findOne({}, (error, result) => {
    if (error) {
      console.log("Error getting new token", error)
    }
    res.send(result)
  })
})

app.post("/api/db/folders", async (req, res, next) => {
  console.log(req.body)
  let folders = req.body
  collectionFolders.replaceOne({}, folders)
})

app.post("/api/db/transcripts", async (req, res, next) => {
  const match = req.body.transcriptionFilePath
  const update = req.body.newAncestors
  collectionFolders
    .updateOne(
      { transcriptionFilePath: req.body.transcriptionFilePath },
      { ancestors: req.body.newAncestors }
    )
    .then((result) => {
      console.log(result)
    })
})

const uploadTransToDB = (transArray, index) => {
  transArray.forEach((transcript) => {
    collectionTranscriptions.update(
      transcript,
      transcript,
      { upsert: true },
      (error, result) => {
        if (error) {
          console.log(error)
        }
        //Do stuff here
      }
    )
  })
}

const port = process.env.PORT || 5000
app.listen(port, () => {
  MongoClient.connect(
    MongoDBurl,
    { useNewUrlParser: true, useUnifiedTopology: true },
    (error, client) => {
      if (error) {
        throw error
      }
      database = client.db("transcripture")
      collectionUsers = database.collection("users")
      collectionTranscriptions = database.collection("transcriptions")
      collectionFolders = database.collection("folders")
    }
  )
})

console.log(`Server listening on ${port}`)
