
const { table } = require("console");
const express = require("express");
const session = require("express-session");
const app = express();
const fs = require("fs");
const { JSDOM } = require('jsdom');

// static path mappings
app.use("/js", express.static("public/js"));
app.use("/css", express.static("public/css"));
app.use("/img", express.static("public/imgs"));
app.use("/fonts", express.static("public/fonts"));
app.use("/html", express.static("public/html"));
app.use("/media", express.static("public/media"));


app.use(session(
    {
        secret: "extra text that no one will guess",
        name: "wazaSessionID",
        resave: false,
        saveUninitialized: true
    })
);



app.get("/", function (req, res) {

    if (req.session.loggedIn) {
        res.redirect("/profile");
    } else {

        let doc = fs.readFileSync("./app/html/index.html", "utf8");

        res.set("Server", "Wazubi Engine");
        res.set("X-Powered-By", "Wazubi");
        res.send(doc);

    }

});


app.get("/profile", function (req, res) {

    // check for a session first!
    if (req.session.loggedIn) {

        let profile = fs.readFileSync("./app/html/profile.html", "utf8");
        let profileDOM = new JSDOM(profile);

        // great time to get the user's data and put it into the page!
        profileDOM.window.document.getElementsByTagName("title")[0].innerHTML
            = req.session.name + "'s Profile";
        profileDOM.window.document.getElementById("profile_name").innerHTML
            = "Welcome back " + req.session.name;







        res.set("Server", "Wazubi Engine");
        res.set("X-Powered-By", "Wazubi");
        //serialize will convert profileDOM, which is a data structure, into a workable HTML format.
        //console.log(profileDOM.serialize());

        const tablee = profileDOM.window.document.createElement("table");
        getData(function (result) {
            console.log(result);
            if (result != undefined) {
                for (let i = 0; i < result.length; i++) {
                    let str = "<tr><td>" + result[i].name + "</td></tr>";
                    tablee.innerHTML += str;
                    //console.log(str);
                }
                profileDOM.window.document.getElementById("left_column").appendChild(tablee);
                res.send(profileDOM.serialize());
                
            } else {
            }

        })
        //console.log(tablee);
        
        

    } else {
        // not logged in - no session and no access, redirect to home!
        res.redirect("/");
    }

});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Notice that this is a "POST"
app.post("/login", function (req, res) {
    res.setHeader("Content-Type", "application/json");


    console.log("What was sent", req.body.email, req.body.password);


    let results = authenticate(req.body.email, req.body.password,
        function (userRecord) {
            //console.log(rows);
            if (userRecord == null) {
                // server couldn't find that, so use AJAX response and inform
                // the user. when we get success, we will do a complete page
                // change. Ask why we would do this in lecture/lab :)
                res.send({ status: "fail", msg: "User account not found." });
            } else {
                // authenticate the user, create a session
                req.session.loggedIn = true;
                req.session.email = userRecord.email;
                req.session.name = userRecord.name;
                req.session.save(function (err) {
                    // session saved, for analytics, we could record this in a DB
                });
                // all we are doing as a server is telling the client that they
                // are logged in, it is up to them to switch to the profile page
                res.send({ status: "success", msg: "Logged in." });
            }
        });

});

app.get("/logout", function (req, res) {

    if (req.session) {
        req.session.destroy(function (error) {
            if (error) {
                res.status(400).send("Unable to log out")
            } else {
                // session deleted, redirect to home
                res.redirect("/");
            }
        });
    }
});

function authenticate(email, pwd, callback) {

    const mysql = require("mysql2");
    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "doglogin"
    });
    connection.connect();
    connection.query(
        //'SELECT * FROM user',
        "SELECT * FROM user WHERE email = ? AND password = ?", [email, pwd],
        function (error, results, fields) {
            // results is an array of records, in JSON format
            // fields contains extra meta data about results
            console.log("Results from DB", results, "and the # of records returned", results.length);

            if (error) {
                // in production, you'd really want to send an email to admin but for now, just console
                console.log(error);
            }



            if (results.length > 0) {
                // email and password found
                return callback(results[0]);
            } else {
                // user not found
                return callback(null);
            }



        }
    );

}

/*
 * Function that connects to the DBMS and checks if the DB exists, if not
 * creates it, then populates it with a couple of records. This would be
 * removed before deploying the app but is great for
 * development/testing purposes.
 */
async function init() {

    // we'll go over promises in COMP 2537, for now know that it allows us
    // to execute some code in a synchronous manner
    const mysql = require("mysql2/promise");
    const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        multipleStatements: true
    });
    const createDBAndTables = `CREATE DATABASE IF NOT EXISTS doglogin;
        use doglogin;
        CREATE TABLE IF NOT EXISTS user (
        ID int NOT NULL AUTO_INCREMENT,
        name varchar(30),
        email varchar(30),
        password varchar(30),
        extra int,
        color varchar(30),
        sub_days_remaining int,
        PRIMARY KEY (ID));`;
    await connection.query(createDBAndTables);

    // await allows for us to wait for this line to execute ... synchronously
    // also ... destructuring. There's that term again!
    const [rows, fields] = await connection.query("SELECT * FROM user");
    // no records? Let's add a couple - for testing purposes
    if (rows.length == 0) {
        // no records, so let's add a couple
        let userRecords = "insert into user (name, email, password, extra, color, sub_days_remaining) values ?";
        let recordValues = [
            ["Andy", "andy@email.ca", "agoodpassword", 3, "#FF3030", 7],
            ["Dandy", "dandy@email.ca", "abetterpassword", 7, "#FFDDEE", 21],
            ["Candy", "candy@email.ca", "thebestpassword", 11, "#DDDD00", 34000]
        ];
        await connection.query(userRecords, [recordValues]);
    }


    console.log("Listening on port " + port + "!");
}

async function getData(callback) {
    var mysql = require('mysql2');

    var con = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "doglogin"
    });
    
    con.connect(function(err) {
      if (err) throw err;
      con.query("SELECT * FROM user", function (err, result, fields) {
        if (err) throw err;
        //console.log(result);
        return callback(result);
      });
    });
      
}

// RUN SERVER
let port = 8000;
app.listen(port, init);
