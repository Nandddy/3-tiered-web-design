
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
        secret: "yeah i dont know",
        name: "dogSessionID",
        resave: false,
        saveUninitialized: true
    })
);



app.get("/", function (req, res) {

    if (req.session.loggedIn) {
        res.redirect("/profile");
    } else {

        let doc = fs.readFileSync("./app/html/index.html", "utf8");
        res.send(doc);

    }

});


app.get("/profile", function (req, res) {

    // check for a session first
    if (req.session.loggedIn) {

        let profile = fs.readFileSync("./app/html/profile.html", "utf8");
        let profileDOM = new JSDOM(profile);

        //serialize will convert profileDOM, which is a data structure, into a workable HTML format.
        //console.log(profileDOM.serialize());

        const tablee = profileDOM.window.document.createElement("table");
        const dataTable = profileDOM.window.document.createElement("table");
        getData(req, function (result, tableResult) {
            //console.log(result);
            if (result != undefined && tableResult != undefined) {
                for (let i = 0; i < result.length; i++) {

                    // Header and Footer content filling
                    profileDOM.window.document.getElementById("name-here").innerHTML = result[i].name;
                    profileDOM.window.document.getElementById("sub-here").innerHTML = "Subscription days left: " + result[i].sub_days_remaining;
                    profileDOM.window.document.getElementById("email-here").innerHTML = result[i].email;
                    profileDOM.window.document.getElementById("color-here").innerHTML = "Colour used: " + result[i].color;
                    profileDOM.window.document.getElementById("footercontent").style.backgroundColor = result[i].color;
                    let count = result[i].extra;
                    let str = "<div>";
                    for (let i = 0; i < count; i++) {
                        str += `<span class="dogico">&nbsp;</span>`;
                    }
                    str += "</div>";
                    profileDOM.window.document.getElementById("dogicon-here").innerHTML = str;

                    // User info table
                    tablee.innerHTML = makeUserTable(result);
                }
                profileDOM.window.document.getElementById("user-table").appendChild(tablee);
                
                //Creating the cards
                for (let i = 0; i < tableResult.length; i++) {
                    let card = profileDOM.window.document.createElement("span");
                    card.className = "card";

                    let image = profileDOM.window.document.createElement("img");
                    image.className = "dog-pic";

                    //I only have 3 dog pictures, so fill the rest with dummy image
                    if (i < 3) {
                        let imageLocation = "/img/dog" + (i + 1) + ".jpg";
                        image.src = imageLocation;
                    } else {
                        image.src = "https://dummyimage.com/400x300/000/fff";
                    }

                    image.alt = "image";
                    card.appendChild(image);

                    let cap = profileDOM.window.document.createElement("caption");
                    cap.className = "doglabel";
                    cap.innerHTML = tableResult[i].breed;

                    let infotable = profileDOM.window.document.createElement("table");
                    let tablehead = profileDOM.window.document.createElement("thead");
                    let row = profileDOM.window.document.createElement("tr");
                    let rowdata1 = profileDOM.window.document.createElement("td");
                    let rowdata2 = profileDOM.window.document.createElement("td");
                    let rowdata3 = profileDOM.window.document.createElement("td");
                    
                    rowdata1.innerHTML = "Weight";
                    row.appendChild(rowdata1);
                    rowdata2.innerHTML = "Height";
                    row.appendChild(rowdata2);
                    rowdata3.innerHTML = "Lifespan";
                    row.appendChild(rowdata3);

                    infotable.appendChild(cap);
                    tablehead.appendChild(row);
                    infotable.appendChild(tablehead);

                    let row2 = profileDOM.window.document.createElement("tr");
                    let rowdata1_1 = profileDOM.window.document.createElement("td");
                    let rowdata1_2 = profileDOM.window.document.createElement("td");
                    let rowdata1_3 = profileDOM.window.document.createElement("td");
                    
                    rowdata1_1.innerHTML = tableResult[i].weight;
                    row2.appendChild(rowdata1_1);
                    rowdata1_2.innerHTML = tableResult[i].height;
                    row2.appendChild(rowdata1_2);
                    rowdata1_3.innerHTML = tableResult[i].lifespan;
                    row2.appendChild(rowdata1_3);

                    infotable.appendChild(row2);
                    card.appendChild(infotable);

                    let extrainfo = profileDOM.window.document.createElement("div");
                    extrainfo.className = "dog-extra";
                    extrainfo.innerHTML = tableResult[i].extra_info;
                    card.appendChild(extrainfo);

                    profileDOM.window.document.getElementById("data-table").appendChild(card);
                }
                //this part neeeds to be here or else getData results will get overwritten
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


    //console.log("What was sent", req.body.email, req.body.password);


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
        database: "dog"
    });
    connection.connect();
    connection.query(
        //'SELECT * FROM user',
        "SELECT * FROM user WHERE email = ? AND password = ?", [email, pwd],
        function (error, results, fields) {
            // results is an array of records, in JSON format
            // fields contains extra meta data about results
            //console.log("Results from DB", results, "and the # of records returned", results.length);

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
    const createDBAndTables = `CREATE DATABASE IF NOT EXISTS dog;
        use dog;
        CREATE TABLE IF NOT EXISTS user (
        ID int NOT NULL AUTO_INCREMENT,
        name varchar(30),
        email varchar(30),
        password varchar(30),
        extra int,
        color varchar(30),
        sub_days_remaining int,
        PRIMARY KEY (ID));
        CREATE TABLE IF NOT EXISTS data (
            ID int NOT NULL AUTO_INCREMENT,
            breed varchar(30),
            height varchar(30),
            weight varchar(30),
            lifespan varchar(30),
            extra_info varchar(50),
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

    const [rows2, fields2] = await connection.query("SELECT * FROM data");

    if (rows2.length == 0) {
        let dataRecords = "insert into data (breed, height, weight, lifespan, extra_info) values ?";
        let dataValues = [
            ["Afador", "20-29 inches", "50-75 pounds", "10-12 years", "Smart and athletic"],
            ["Shiba Inu", "13-17 inches", "17-23 pounds", "12-16 years", "Is that meme dog"],
            ["German Shepherd", "22-26 inches", "75-95 pounds", "10-14 years", "Employed in police"],
            ["Cavador", "18-24 inches", "22-55 pounds", "10-14 years", "Playful"],
            ["Chihuahua", "6-9 inches", "3-6 pounds", "10-18 years", "Is the smallest dog breed"],
            ["Maltese", "8-10 inches", "4-7 pounds", "12-15 years", "Doesn't shed much"],
            ["Mastiff", "27-32 inches", "130-220 pounds", "6-10 years", "Used to be war dogs"],
            ["Daniff", "27-33 inches", "115-190 pounds", "8-12 years", "A \"gentle giant\""],
            ["Syberian Husky", "20-23 inches", "33-60 pounds", "12-15 years", "May jump fences and escape"],
            ["Labrador Retriever", "21-24 inches", "55-80 pounds", "10-12 years", "Historically a fisherman's helper"],
        ];
        await connection.query(dataRecords, [dataValues]);
    }


    console.log("Listening on port " + port + "!");
}

//get the user data and all of the contents of the other table
function getData(req, callback) {
    var mysql = require('mysql2');
    var userData;
    var tableData;

    var connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "dog",
        multipleStatements: true
    });

    connection.connect(function (err) {
        if (err) throw err;
        connection.query("SELECT * FROM user WHERE email = ?", [req.session.email],
            function (err, result, fields) {
                if (err) throw err;
                //console.log(result);
                userData = result;
                connection.query("SELECT * FROM data", function (err, result, fields) {
                    if (err) throw err;
                    //console.log(result);
                    tableData = result;
                    return callback(userData, tableData);
                });
            });


    });

}

//this function will only get an array of size 1
function makeUserTable(data) {
    let str = "<caption id=\"tablecaption\"> User Information </caption>";
    str += "<thead id=\"user-header-rows\"><tr><td>" + "&nbsp;ID&nbsp;" + "</td>";
    str += "<td>" + " Name " + "</td>";
    str += "<td>" + " Email " + "</td>";
    str += "<td>" + " Password " + "</td>";
    str += "<td>" + " Dog icons " + "</td>";
    str += "<td>" + " Footer Color" + "</td>";
    str += "<td>" + " Subscription days left " + "</td> </tr> </thead>";

    str += "<tr id=\"user-data-rows\"><td>" + data[0].ID + "</td>";
    str += "<td>" + data[0].name + "</td>";
    str += "<td>" + data[0].email + "</td>";
    str += "<td>" + data[0].password + "</td>";
    str += "<td>" + data[0].extra + "</td>";
    str += "<td>" + data[0].color + "</td>";
    str += "<td>" + data[0].sub_days_remaining + "</td></tr>";
    //console.log(str);
    return str;
}

// RUN SERVER
let port = 8000;
app.listen(port, init);
