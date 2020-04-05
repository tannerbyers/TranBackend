const express = require('express');
const path = require('path');

const app = express();

// Put all API endpoints under '/api'
app.get('/*', (req, res) => {
  // Return them as json
  res.json({"Test": "test"});
});

const port = process.env.PORT || 5000;
app.listen(port);

console.log(`Server listening on ${port}`);