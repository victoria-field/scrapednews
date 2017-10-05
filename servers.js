/* Showing Mongoose's "Populated" Method
 * =============================================== */

// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
// Requiring our Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
var Saved = require("./models/Saved.js");
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");

var path = require("path");
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

var port = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({ extended: false }));

// Make public a static dir
app.use(express.static("public"));

var port = process.env.PORT || 3000;

// Database configuration with mongoose
var databaseUri = "mongodb://localhost/mongoScrapernews";

if(process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI);
} else {
  mongoose.connect(databaseUri);
}

var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
    console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
    console.log("Mongoose connection successful.");
});

// Routes
// ======

app.post("/saved:id", function(req, res) {
    // Create a new saved and pass the req.body to the entry
    var newSaved = new Saved(req.body);

    // And save the new note the db
    newSaved.save(function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error // Otherwise
            );
        } else {
            // Use the article id to find and update it's note
            Article.findOneAndUpdate({
                    "_id": req.params.id
                }, {"saved": true })
                // Execute the above query
                .exec(function(err, doc) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                    } else {
                        // Or send the document to the browser
                        console.log("saved the article");
                        res.send(doc);
                    }
                });
        }
    });

});


// A GET request to scrape the echojs website
app.get("/scrape", function(req, res) {
    // First, we grab the body of the html with request
    request("http://www.echojs.com/", function(error, response, html) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);
        // Now, we grab every h2 within an article tag, and do the following:
        $("article h2").each(function(i, element) {

            // Save an empty result object
            var result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this).children("a").text();
            result.link = $(this).children("a").attr("href");
            result.saved = false;

            // Using our Article model, create a new entry
            // This effectively passes the result object to the entry (and the title and link)
            var entry = new Article(result);

            // Now, save that entry to the db
            entry.save(function(err, doc) {
                // Log any errors
                if (err) {
                    console.log(err // Or log the doc
                    );
                } else {

                    console.log(doc);

                }
            });

        });

        res.send("test");
    });
});



// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
    // Grab every doc in the Articles array
    Article.find({}, function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error // Or send the doc to the browser as a json object
            );
        } else {
            res.json(doc);
        }
    });
});

//Grab all saved articles
app.get("/saved", function(req, res) {
    // Grab every doc in the Articles array
    Article.find({"saved": true}, function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error // Or send the doc to the browser as a json object
            );
        } else {
            res.json(doc);
        }
    });
});

// Grab an article by it's ObjectId
app.get("/savedArticles/:id", function(req, res) {
    console.log("Req.params.id: "+req.params.id);
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    Article.findOne({ "_id": req.params.id })
        // ..and populate all of the notes associated with it
        .populate("note")
        // now, execute our query
        .exec(function(error, doc) {
            // Log any errors
            if (error) {
                console.log(error // Otherwise, send the doc to the browser as a json object
                );
            } else {
                res.json(doc);
            }
        });
});

// Create a new note or replace an existing note
app.post("/savedArticles/:id", function(req, res) {
    // Create a new note and pass the req.body to the entry
    var newNote = new Note(req.body);

    // And save the new note the db
    newNote.save(function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error // Otherwise
            );
        } else {
            // Use the article id to find and update it's note
            Article.findOneAndUpdate({
                    "_id": req.params.id
                }, { "note": doc._id })
                // Execute the above query
                .exec(function(err, doc) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                    } else {
                        // Or send the document to the browser
                        res.send(doc);
                    }
                });
        }
    });
});

app.get("/savedArticles", function(req,res){
    res.sendFile(path.join(__dirname, "./public/savedArticles.html"));
});

// Listen on port 3000
app.listen(port, function() {
    console.log("App running on port 3000 !");
});
