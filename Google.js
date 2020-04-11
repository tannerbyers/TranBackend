const { Storage } = require("@google-cloud/storage");
const speech = require("@google-cloud/speech");
const storage = new Storage();
const client = new speech.SpeechClient();

async function uploadToBucket(bucketName, filename) {
  // Uploads a local file to the bucket
  await storage.bucket(bucketName).upload(filename, {
    // Support for HTTP requests made with `Accept-Encoding: gzip`
    //gzip: true,
    // By setting the option `destination`, you can change the name of the
    // object you are uploading to a bucket.
    metadata: {
      // Enable long-lived HTTP caching headers
      // Use only if the contents of the file will never change
      // (If the contents will change, use cacheControl: 'no-cache')
      //cacheControl: "public, max-age=31536000",
      cacheControl: "no-cache",
    },
  });

  console.log(`${filename} uploaded to ${bucketName}.`);
}

async function getBuckets() {
  const [buckets] = await storage.getBuckets();
  console.log("Buckets:");
  buckets.forEach((bucket) => {
    console.log(bucket.name);
  });
}

async function getFiles(_bucketName) {
  const [files] = await storage.bucket(_bucketName).getFiles();

  console.log("Files:");
  files.forEach((file) => {
    console.log(file.name);
  });
}

async function isThere(_bucketName, _filename) {
  const exists = await storage.bucket(_bucketName).file(_filename).exists();
  console.log(_bucketName);
  console.log(_filename);
  console.log("Is file in bucket?", exists);
}

async function transcribe(gcsUri) {
  const config = {
    encoding: "LINEAR16",
    sampleRateHertz: 16000,
    languageCode: "en-US",
    // enableSpeakerDiarization: true,
    // diarizationSpeakerCount: 3,
  };

  const audio = {
    uri: gcsUri,
  };

  const request = {
    config: config,
    audio: audio,
  };

  // Detects speech in the audio file. This creates a recognition job that you
  // can wait for now, or get its result later.
  const [operation] = await client.longRunningRecognize(request);
  // Get a Promise representation of the final result of the job
  const [response] = await operation.promise();
  const transcription = response.results
    .map((result) => result.alternatives[0].transcript)
    .join("\n");
  console.log(`Transcription: ${transcription}`);
}

module.exports = {
  uploadToBucket,
  transcribe,
  isThere,
  getBuckets,
  getFiles,
};
