require('dotenv').config();
const express = require('express');
const cors = require('cors');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var shortId = require('short-id');
var validUrl = require('valid-url');
var bodyParser = require('body-parser');
var dns = require('dns');
const app = express();

app.use(bodyParser.urlencoded({
  extended: false
}))

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

const uri = process.env.MONGO_URI;
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})

const connection = mongoose.connection;
connection.once('open', () => {
  console.log('Successfully connected');
})

const Schema = mongoose.Schema;

const urlSchema = new Schema({
  original_url: String,
  short_url: String
});

const URL = mongoose.model('URL', urlSchema);

app.post('/api/shorturl', async function(req, res) {
  const url = req.body.url;
  const urlCode = shortId.generate();
  const hostname = url
    .replace(/http[s]?\:\/\//, '')
    .replace(/\/(.+)?/, '');

  dns.lookup(hostname, async function(err, addresses) {
    if (err) {
      console.log('lookup() error');
    }
    if (!addresses) {
      res.json({
        error: 'invalid URL'
      });
    } else {
      try {
        let findOne = await URL.findOne({
          original_url: url
        })
        if (findOne) {
          res.json({
            original_url: findOne.original_url,
            short_url: findOne.short_url
          })
        } else {
          findOne = new URL({
            original_url: url,
            short_url: urlCode
          })
          await findOne.save()
          res.json({
            original_url: findOne.original_url,
            short_url: findOne.short_url
          })
        }
      } catch (err) {
        console.error(err);
        res.status(500).json('Server error..')
      }
    }
  })
})

app.get('/api/shorturl/:short_url?', async function(req, res) {
  try {
    const urlParams = await URL.findOne({
      short_url: req.params.short_url
    })
    if (urlParams) {
      let newUrl = urlParams.original_url
      newUrl = newUrl.includes('https') ? newUrl : 'https://'+newUrl
      return res.redirect(newUrl)
    } else {
      return res.status(404).json('No URL found')
    }
  } catch (err) {
    console.error(err);
    res.status(500).json('Server error')
  }
})


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
