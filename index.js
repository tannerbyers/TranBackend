const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();
const request = require("request");
//.defaults({ encoding: null });
const https = require("https");
const fs = require("fs");
const db = require("./db.js");
const MongoClient = require("mongodb").MongoClient;
const google = require("./Google.js");
const linear16 = require("linear16");
const resource = require("./ResourceRequest");
console.log("Server has started (not listening)");
const MongoDBurl =
  "mongodb+srv://joemama:gogogo@transcripturecluster-dan2o.mongodb.net/test?retryWrites=true&w=majority";

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(
  bodyParser.json({
    extended: true,
  })
);

// ALLOWS CORS
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});

const redirectURL =
  process.env.redirectURL || "https://client-transcipture.herokuapp.com/";

let accessToken;
let userAuthCode;
let userId;
let OauthPromise;
let arrayOfAudioPathAndTranscriptionPath;
let database, collectionUsers, collectionTranscriptions, collectionFolders;
const base64encodedClientIdAndSecret =
  "d3ZhVkQ2aXRUbWU0UDlZQm1QTVprZzoyczB5WEQ1Q1hqM1NtNDlHQ3hVT3hKVGVEUGRGSWR5Yw==";

// Put all API endpoints under '/api'
app.post("/api/auth", (newreq, response) => {
  console.log("Auth Code Received", newreq.body.code);
  userAuthCode = newreq.body.code;

  if (userAuthCode) {
    // Request an access token using the above user auth code
    let AccessTokenRequestUrl =
      "https://zoom.us/oauth/token?grant_type=authorization_code&code=" +
      newreq.body.code +
      "&redirect_uri=" +
      redirectURL;

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
          console.log("Error hit when requesting access token:", err);
          return err;
        }
        accessToken = JSON.parse(res.body).access_token;
        console.log("Access token received: ", accessToken);

        OauthPromise = new Promise(function (resolve, reject) {
          return resolve(accessToken);
        });

        OauthPromise.then((data) => {
          console.log("Oauth Access token : ", data);
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
            response.send("New Access token received");
          } else {
            response.send("New Accses token issue. Check backend logs");
          }
        });
      }
    );
  }
});

app.get("/api/token", async (req, res, next) => {
  collectionUsers.findOne({ userAuthCode: userAuthCode }, (error, result) => {
    if (error) {
      console.log("Error getting new token", error);
    }
    res.send("New Token Received", result);
  });
});

app.get("/api/me", async (req, response, next) => {
  let url = "https://api.zoom.us/v2/users/me";
  console.log("\n\n/api/me HIT");

  request(
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      uri: url,
      method: "GET",
    },
    async function (err, res, body) {
      let me = JSON.parse(res.body);
      let userDataPromise = new Promise(function (resolve, reject) {
        return resolve(me);
      });
      userDataPromise.then((data) => {
        console.log(data);
        userId = data.id;
        console.log(userId);

        response.send(data);
      });
    }
  );
});

app.get("/api/recordings", async (req, response, next) => {
  let url = `https://api.zoom.us/v2/users/me/recordings?from=2020-01-01?to=2020-04-07`;
  console.log("access token : ", accessToken);
  request(
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      uri: url,
      method: "GET",
    },
    async function (err, res, body) {
      // Uncomment to see what the Meetings API is sending back
      //console.log("Get Meetings Data Response", res.body);

      let meetingsList = JSON.parse(res.body).meetings;

      //console.log("Meetings List", meetingsList);
      arrayOfAudioPathAndTranscriptionPath = [];

      for (let i = 0; i < meetingsList.length; i++) {
        console.log("we're starting the transcription");

        let file = fs.createWriteStream(`./ZoomMedia/testfile${[i]}.m4a`);
        console.log("Began creating" + `./ZoomMedia/testfile${[i]}.m4a`);
        const M4AVideoUrls = meetingsList[i].recording_files.filter(
          (recording) => recording.file_type === "M4A"
        );
        const MP4VideoUrls = meetingsList[i].recording_files.filter(
          (recording) => recording.file_type === "MP4"
        );

        request(M4AVideoUrls[0].download_url).pipe(file);
        console.log("Beginning download for", M4AVideoUrls[0].download_url);

        file.on("error", function (err, stdout, stderr) {
          console.log("An error occurred: " + err.message, err, stderr);
        });

        file.on("finish", async () => {
          const bucket = "trans-audiofiles";
          const audioFile = `./ConvertedMedia/testfile${[i]}.wav`;
          console.log("Transcription Called");

          linear16(
            `./ZoomMedia/testfile${[i]}.m4a`,
            `./ConvertedMedia/testfile${[i]}.wav`
          ).then(() => {
            google
              .uploadToBucket(bucket, audioFile)
              .then(async () => {
                let transcript = google.transcribe(
                  `gs://${bucket}/${audioFile.split("/").pop()}`
                );
                return await transcript;
              })
              .then((result) => {
                console.log("RESULT OF TRANSCRIBE", result);
                fs.writeFile(
                  `./ConvertedMedia/testfile${[i]}.txt`,
                  result,
                  function (err) {
                    arrayOfAudioPathAndTranscriptionPath.push({
                      transcriptionFilePath: `./ConvertedMedia/testfile${[
                        i,
                      ]}.txt`,
                      videoFilePath: `./ZoomMedia/testfile${[i]}.m4a`,
                      playUrl: MP4VideoUrls[0].download_url,
                      ancestors: ["Home"],
                      recordingDate: meetingsList[i]["start_time"],
                      duration: meetingsList[i].duration,
                      name: `./ConvertedMedia/testfile${[i]}.txt`,
                    });
                    if (
                      arrayOfAudioPathAndTranscriptionPath.length ===
                      meetingsList.length
                    ) {
                      console.log("did this finish?");
                      uploadTransToDB(arrayOfAudioPathAndTranscriptionPath);
                      response.send(arrayOfAudioPathAndTranscriptionPath);
                    } else {
                      console.log(
                        "arrayOfAudioPathAndTranscriptionPath",
                        arrayOfAudioPathAndTranscriptionPath.length
                      );
                      console.log("meetingsList.length", meetingsList.length);
                    }
                    if (err) throw err;
                    console.log(
                      `./ConvertedMedia/testfile${[
                        i,
                      ]}.txt is created successfully.`
                    );
                  }
                );
              });
          });
          // For Loop ends
          console.log("For Loop has finished");
        });
      }
    }
  );
});

app.get("/api/db/transcripts", async (req, res, next) => {
  let fo = [];
  await collectionTranscriptions
    .find({})
    .toArray()
    .then(async (results) => {
      results.forEach((transcript) => {
        let content = fs.readFileSync(transcript.transcriptionFilePath, "utf8");
        transcript.content = content;
      });
      res.send(results);
    });
});

app.get("/api/db/folders", async (req, res, next) => {
  collectionFolders.findOne({}, (error, result) => {
    if (error) {
      console.log("Error getting new token", error);
    }
    res.send(result);
  });
});

app.post("/api/db/folders", async (req, res, next) => {
  console.log(req.body);
  let folders = req.body;
  collectionFolders.replaceOne({}, folders);
});

app.post("/api/db/transcripts", async (req, res, next) => {
  const match = req.body.transcriptionFilePath;
  const update = req.body.newAncestors;
  collectionTranscriptions
    .update(
      { transcriptionFilePath: match },
      {
        $set: { ancestors: update },
      }
    )
    .then((result) => {
      res.send(result);
    });
});

app.put("/api/db/transcripts", async (req, res, next) => {
  const updatedName = req.body.newName;
  collectionTranscriptions
    .update(
      { transcriptionFilePath: req.body.transcriptionFilePath },
      {
        $set: { name: updatedName },
      }
    )
    .then((result) => {
      res.send(result);
    });
});

app.delete("/api/db/folders", async (req, res, next) => {
  let folders = req.body;
  collectionFolders.replaceOne({}, folders);
});

const uploadTransToDB = (transArray, index) => {
  transArray.forEach((transcript) => {
    let filePathQuery = transcript.transcriptionFilePath;

    collectionTranscriptions.update(
      { transcriptionFilePath: filePathQuery },
      { $setOnInsert: transcript },
      { upsert: true },
      (error, result) => {
        if (error) {
          console.log(error);
        }
        //Do stuff here
      }
    );
  });
};

app.get("/api/video", async (req, res, next) => {
  console.log(__dirname + "/ZoomMedia/testfile0.m4a", "requested");
  res.download(__dirname + "/ZoomMedia/testfile0.m4a");
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  MongoClient.connect(
    MongoDBurl,
    { useNewUrlParser: true, useUnifiedTopology: true },
    (error, client) => {
      if (error) {
        throw error;
      }
      database = client.db("transcripture");
      collectionUsers = database.collection("users");
      collectionTranscriptions = database.collection("transcriptions");
      collectionFolders = database.collection("folders");
    }
  );
});

console.log(`Server listening on ${port}`);
