const MongoClient = require("mongodb").MongoClient
const uri =
  "mongodb+srv://joemama:gogogo@transcripturecluster-dan2o.mongodb.net/test?retryWrites=true&w=majority"
const client = new MongoClient(
  uri,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    err && console.log(err)
  }
)

/* Transcription Document Template
{
      userAuthCode: "mama",
      transcriptionFilePath: "./transcriptions/02.txt",
      ancestors: ["root", "meetings"],
    }
*/

const sync = async (user) => {
  try {
    // Connect to the MongoDB cluster
    await client.connect()

    // Make the appropriate DB calls
    await createUser(client, user)
  } catch (e) {
    console.error(e)
  } finally {
    await client.close()
  }
}

const listDatabases = async (client) => {
  databasesList = await client.db().admin().listDatabases()

  console.log("Databases: ")
  databasesList.databases.forEach((db) => console.log(` - ${db.name}`))
}

const transcriptionSearch = async (client, authCode) => {
  result = await client
    .db("transcripture")
    .collection("transcriptions")
    .findOne({ userAuthCode: authCode })

  if (result) {
    console.log(`Found a transcription with this authCode ${authCode}`)
    console.log(result)
  } else {
    console.log("No transcriptions with authCode provided")
  }
}

const userSearch = async (client, authCode) => {
  result = await client
    .db("transcripture")
    .collection("users")
    .findOne({ userAuthCode: authCode })

  if (result) {
    console.log(`Found a user with this authCode ${authCode}`)
    console.log(result)
  } else {
    console.log("No users with authCode provided")
  }
}

const createUser = async (client, user) => {
  result = await client.db("transcripture").collection("users").insertOne(user)
  console.log(
    `New listing created with the following authCode: ${result.userAuthCode}`
  )
}

const createTranscription = async (client, transcription) => {
  result = await client
    .db("transcripture")
    .collection("transcriptions")
    .insertOne(transcription)
  console.log(
    `New listing created with the following authCode: ${result.authCode}`
  )
}

const updateAncestors = async (client, authCode, ancestors) => {}

module.exports = {
  sync,
}
