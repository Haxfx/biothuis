var express = require('express');
var router = express.Router();
var assert = require('assert');

var userid = "56f99306f4cc8d19c5188d48"; // Sebastiaan
// var userid = "56f99546bb2e7e3a2c2bf4a9"; // Floriaan


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { product: 'Bio thuis', title: 'Menu', user: 'Sebastiaan' });
});

/* GET New user. */
router.get('/newuser', function(req, res) {
    var house_id = req.param('house');
    res.render('newuser', { product: 'Bio thuis', title: 'Nieuw', previousPage: 'Terug', houseid : house_id, previousPageUrl: 'users?house='+house_id });
});

/* GET New house. */
router.get('/newhouse', function(req, res) {
    res.render('newhouse', { product: 'Bio thuis', title: 'Nieuw Huis', previousPage: 'Overzicht', previousPageUrl: 'overview' });
});

/* GET Settings. */
router.get('/settings', function(req, res) {
    var db = req.db;
    var usercollection = db.get('usercollection');
    usercollection.findOne({ _id: userid },{},function(e,user){
        res.render('settings', { product: 'Bio thuis', "user": user, 'userid': userid, title: 'Instellingen', previousPage: 'BioThuis', previousPageUrl: '' });
    });
});

/* GET Userlist page. */
router.get('/userlist', function(req, res) {
    var db = req.db;
    var collection = db.get('usercollection');
    collection.find({},{},function(e,docs){
        res.render('userlist', {
            "userlist" : docs, title: 'Gebruikers', previousPage: 'BioThuis'
        });
    });
});

/* GET Overview page. */
router.get('/overview', function(req, res) {
    var db = req.db;
    var collection = db.get('homecollection');
    var accesscollection = db.get('accesscollection');

    collection.find({},{},function(e,docs){
        accesscollection.find({ a_u_id: userid },function(e,access){
            res.render('overview', { product: 'Bio thuis', "accesslist" : access, userid: userid,
                "homelist" : docs, title: 'Overzicht', previousPage: 'BioThuis', previousPageUrl: ''
            });
        });
    });
});

/* GET House page. */
router.get('/address', function(req, res) {
    var house_id = req.param('id');
    var db = req.db;
    var collection = db.get('homecollection');
    var accesscollection = db.get('accesscollection');
    var rolecollection = db.get('rolecollection');

    collection.findOne({ _id: house_id },function(e,docs){
        accesscollection.findOne({ a_h_id: house_id, a_u_id: userid },function(e,access){
            rolecollection.findOne({ r_id: access.a_r_id },function(e,role){
                res.render('address', { product: 'Bio thuis', "access" : access, "role" : role, userid: userid,
                    "home" : docs, previousPage: 'Overzicht', previousPageUrl: 'overview', houseid : house_id
                });
            });
        });
    });
});

/* GET Log page. */
router.get('/log', function(req, res) {
    var db = req.db;
    var logcollection = db.get('logcollection');
    var homecollection = db.get('homecollection');
    var usercollection = db.get('usercollection');

    logcollection.find({ l_u_id: userid }, {sort: 'l_timestamp'},function(e,logs){
        usercollection.findOne({ _id: userid },function(e,user){
            homecollection.find({},{},function(e,homes){
                res.render('log', { product: 'Bio thuis', "homes" : homes, "user" : user, title: 'Meldingen',
                    "logs" : logs, previousPage: 'BioThuis', previousPageUrl: ''
                });
            });
        });
    }); 
});

/* GET House Users page. */
router.get('/users', function(req, res) {
    var house_id = req.param('house');
    var db = req.db;
    var collection = db.get('homecollection');
    var accesscollection = db.get('accesscollection');
    var rolecollection = db.get('rolecollection');
    var usercollection = db.get('usercollection');

    collection.findOne({ _id: house_id },function(e,docs){
        accesscollection.find({ a_h_id: house_id },function(e,access){
            usercollection.find({},{},function(e,users){
                res.render('users', { product: 'Bio thuis', "accesslist" : access, "userlist" : users,
                    "home" : docs, previousPage: 'Terug', previousPageUrl: 'address?id='+house_id, houseid : house_id
                });
            });
        });
    }); 
});


/* POST to Add User Service */
router.post('/adduser', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var token = req.body.token;
    var hash = req.body.accesshash;
    var role = req.body.role;
    var time = req.body.accesstime;
    var house_id = req.param('house');

    if (role == "1") {
        role = 1;
    } else if( role == "2") {
        role = 2;
    }

    // Set our collection
    var usercollection = db.get('usercollection');
    var accesscollection = db.get('accesscollection');
    var logcollection = db.get('logcollection');

    usercollection.findAndModify(
        {'u_fname': firstname, 'u_lname': lastname}, // query
        {$setOnInsert: {'u_token': token, 'u_hash': hash}}, // replacement, replaces only the field "hi"
        { upsert: true}, // options
        function(err, instertedUser) {
            if (err) {
                // If it failed, return error
                res.send("There was a problem adding the user to the database.");
            }
            else {
                // Submit access to the DB
                accesscollection.insert({
                    "a_r_id" : role,
                    "a_u_id" : instertedUser._id.toString(),
                    "a_h_id" : house_id,
                    "a_time" : time,
                    "a_notification" : true
                }, function (err, instertedAccess) {
                    if (err) {
                        // If it failed, return error
                        res.send("There was a problem adding the access to the database.");
                    }
                    else {
                        var moment = require('moment');
                        var nu = moment().format('DD/MM/YYYY HH:mm')
                        // Submit access to the DB
                        logcollection.insert({
                            "l_subject" : 'toegang',
                            "l_u_id" : instertedUser._id.toString(),
                            "l_h_id" : house_id,
                            "l_timestamp" : nu
                        }, function (err, instertedLog) {
                            if (err) {
                                // If it failed, return error
                                res.send("There was a problem adding the access to the database.");
                            }
                            else {
                                // And forward to success page
                                res.redirect("/users?house="+house_id);
                            }
                        });
                    }
                });
            }
    });
});

/* POST Update Notifications */
router.post('/changenoti', function(req, res) {
    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var house_id = req.param('house');
    var user_id = req.param('user');
    var notifications = req.body.checkbox;

    if (notifications == "on"){
        notifications = true;
    } else {
        notifications = false;
    }

    // Set our collection
    var accesscollection = db.get('accesscollection');

   // Submit access to the DB
    accesscollection.findAndModify(
        {'a_h_id': house_id, 'a_u_id': user_id}, // query
        {$set: {'a_notification': notifications}}, // replacement, replaces only the field "hi"
        {}, // options
        function(err, object) {
            if (err){
                console.warn(err.message);  // returns error if no matching object found
            }else{
                console.dir(object);
                res.redirect("/address?id="+house_id);
            }
    });
});

/* POST Update User Notifications */
router.post('/changenotif', function(req, res) {
    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var user_id = req.param('user');
    var notifications = req.body.checkbox;

    if (notifications == "on"){
        notifications = true;
    } else {
        notifications = false;
    }

    // Set our collection
    var usercollection = db.get('usercollection');

   // Submit access to the DB
    usercollection.findAndModify(
        {'_id': user_id}, // query
        {$set: {'u_noti': notifications}}, // replacement, replaces only the field "hi"
        {}, // options
        function(err, object) {
            if (err){
                console.warn(err.message);  // returns error if no matching object found
            }else{
                console.dir(object);
                res.redirect("settings");
            }
    });
});

/* POST Update User SMS */
router.post('/changesms', function(req, res) {
    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var user_id = req.param('user');
    var sms = req.body.checkbox;

    if (sms == "on"){
        sms = true;
    } else {
        sms = false;
    }

    // Set our collection
    var usercollection = db.get('usercollection');

   // Submit access to the DB
    usercollection.findAndModify(
        {'_id': user_id}, // query
        {$set: {'u_sms': sms}}, // replacement, replaces only the field "hi"
        {}, // options
        function(err, object) {
            if (err){
                console.warn(err.message);  // returns error if no matching object found
            }else{
                console.dir(object);
                // And forward to success page
                res.redirect("settings");
            }
    });
});

/* POST to Add Home Service */
router.post('/addhouse', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var homeAddress = req.body.address;
    var homeNumber = req.body.number;
    var homeCity = req.body.city;
    var homeType = req.body.hometype;

    // Set our collection
    var collection = db.get('homecollection');
     var accesscollection = db.get('accesscollection');

    // Submit to the DB
    collection.insert({
        "h_address" : homeAddress,
        "h_number" : homeNumber,
        "h_city" : homeCity,
        "h_type" : homeType
    }, function (err, instertedHome) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // Submit to the DB
            accesscollection.insert({
                "a_r_id" : 1,
                "a_u_id" : userid,
                "a_h_id" : instertedHome._id.toString(),
                "a_time" : 'Onbeperkt',
                "a_notification" : true
            }, function (err, instertedAccess) {
                if (err) {
                    // If it failed, return error
                    res.send("There was a problem adding the information to the database.");
                }
                else {
                    // And forward to success page
                    res.redirect("overview");
                }
            });
        }
    });
});

module.exports = router;

//db.usercollection.insert({ "u_token" : "654148544854246", "u_hash" : "a987ewerfa654d789d12", "u_fname" : "Sebastiaan", "u_lname": "Mekes", "u_sms": true, "u_noti": true})

//db.accesscollection.insert({ "a_r_id" : "1", "a_u_id" : "56f7e71126dc5ca1aef1936a", "a_h_id" : "56f7ed0d26dc5ca1aef1936d", "a_time": "onbeperkt", "a_notification": true})
//db.accesscollection.insert({ "a_r_id" : "1", "a_u_id" : "56f80d7c26dc5ca1aef1936e", "a_h_id" : "56f7ed0d26dc5ca1aef1936d", "a_time": "onbeperkt", "a_notification": true})
//db.accesscollection.insert({ "a_r_id" : "1", "a_u_id" : "test", "a_h_id" : "test", "a_time": "onbeperkt", "a_notification": false})
//db.accesscollection.insert({ "a_r_id" : "2", "a_u_id" : "56f7e71126dc5ca1aef1936a", "a_h_id" : "56f7ee46da2485c0112c364d", "a_time": "08:00 - 18:00", "a_notification": false})
//db.accesscollection.insert({ "a_r_id" : "2", "a_u_id" : "56f7e71126dc5ca1aef1936a", "a_h_id" : "56f7f4f8da2485c0112c364e", "a_time": "19:00 - 22:00", "a_notification": true})
//db.rolecollection.insert({ "r_id": 1, "r_name" : "eigenaar", "r_access" : "onbeperkt"})
//db.rolecollection.insert({ "r_id": 2, "r_name" : "bezoeker", "r_access" : "beperkt"})dziękuję

//db.homecollection.insert({ "h_address": "Testadres", "h_number" : "1337", "h_city" : "Testland", "h_type" : "45f3456f44654"})

//db.logcollection.insert({ "l_subject" : "verlaten", "l_u_id" : "56f99306f4cc8d19c5188d48", "l_h_id" : "56f9995f6c70cf900dd65cf5", "l_timestamp": "29/02/2016 11:56"})
//db.logcollection.insert({ "l_subject" : "betreden", "l_u_id" : "56f99306f4cc8d19c5188d48", "l_h_id" : "56f9995f6c70cf900dd65cf5", "l_timestamp": "29/03/2016 01:56"})

//db.accesscollection.insert({ "a_r_id" : "1", "a_u_id" : "56f7e71126dc5ca1aef1936a", "a_h_id" : "56f7ed0d26dc5ca1aef1936d", "a_time": "onbeperkt", "a_notification": true})