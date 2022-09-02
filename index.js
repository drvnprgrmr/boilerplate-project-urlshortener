require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require("body-parser")
const {v4: uuidv4} = require("uuid")
const dns = require("dns")


// Setup the database
const mongoose = require("mongoose")
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true}, (err, data) => {
    if (err) return console.error(err)
})

// Create collection
const urlSchema = new mongoose.Schema({
    original_url: String,
    short_url: String
})
const UrlShort = mongoose.model("urls", urlSchema)

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}))

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post("/api/shorturl", (req, res) => {
    const original_url = req.body.url
    const url = new URL(original_url)
    const hostname = url.hostname
    dns.lookup(hostname, async (err, data) => {
        if (err) {
            res.json({error: 'invalid url'})
        } else {
            const short_url = uuidv4().slice(1, 9)

            // Check the db if the url exists
            const result = await UrlShort.find({
                original_url: original_url
            }).select({
                _id: 0,
                __v: 0
            }).exec()

            if (result.length === 0) {
                const u = new UrlShort({
                    original_url: original_url,
                    short_url: short_url
                })
                await u.save()
    
                res.json({
                    original_url: original_url,
                    short_url: short_url
                })
            } else {
                // If url was already created dont recreate it
                res.json({
                    error: "That url is already recorded",
                    result: result[0]
                })
            }
    
            
        
        }
        
    })
    
})

app.get("/api/shorturl/:url", async (req, res) => {
    const url = req.params.url
    const dbUrl = await UrlShort.findOne({
        short_url: url
    })

    if (dbUrl) {
        const original_url = dbUrl.original_url
        
        res.redirect(original_url)
    } else res.json({"error": "Sorry that shortcut wasn't created"})
})


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
