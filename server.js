// number-guessing game

// setting express, socket io, server and ports and favicon
var express = require('express');
var app = express();
var favicon = require('serve-favicon');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3010;
var path = require('path');


// setting favicon
app.use(favicon(__dirname + '/favicon.ico'));

app.use(express.static('public'));
// setting server to listen port 3010
server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// set the root to server client.html file
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/client.html');
});

// this function creates a random number
// specified with parameters
function randomNumber(lowNum, highNum) {
    randNum = lowNum + (highNum - lowNum) * Math.random();
    return Math.round(randNum);
}

// function that returns points
// by guesscounter value
function pointMultiplier(guesscounter) {
    var points;
    if(guesscounter == 1) {
        return points = 1000;
    } else if(guesscounter == 2) {
        return points = 750;
    } else if(guesscounter == 3) {
        return points = 500;
    } else if(guesscounter == 4) {
        return points = 400;
    } else if(guesscounter == 5) {
        return points = 300;
    } else if(guesscounter == 6) {
        return points = 200;
    } else if(guesscounter >= 7) {
        return points = 100;
    }
}

// raises guesscounter property by 1 in
// users array
function raiseGuessCounter(user) {
    for (var i = 0; i < users.length; i++) {
        if (users[i].id === user) {
            users[i].guesscounter += 1;
        }
    }
}

// this variable calls the randomNumber function
// with parameters of 1 and 100
// so the rightnumber is something between 1 and 100
var rightNum = randomNumber(1,100);

// users array where all the players are stored
var users = [];

var chatMessages = [];

// userCount variable which tells how many users are connected
var userCount = 0;

// setting the connection
io.sockets.on('connection', function (socket) {
    // setting the user and nicknames variables
    var user;
    var nicknames;
    var socketId = socket.id;
    // socket to get the nickname from the client
    socket.on('nickname_to_server', function(data){
        var nicknames = data['message'];

        var alertnick = "Nickname is already taken! Input another nickname";

        for(x=0; x < users.length; x++) {
            if(users[x].name === nicknames) {
                socket.emit('alertnick', alertnick);
                socket.emit('nickfalse', "false");
                return false;
            }
        }
        socket.emit('nickfalse', "true");
        // adding user with id and nickname
        user = addUser(socketId, nicknames);
        // raising usercount
        userCount++;
        // emiting welcome message to the user connected
        socket.emit("welcome", user);
    // emiting usercount to all players online
    io.sockets.emit("user_count", userCount);
    });

    socket.on('chatmessage_to_server', function(data){
        var chatmessage = data['message'];
        var nickname;
        console.log("chatmessage", chatmessage);
        for(x=0; x < users.length; x++) {
            if(users[x].id === socket.id) {
              console.log("socket.id", socket.id);
              console.log("users[x].id", users[x].id);
              nickname = users[x].name;
              break;
            }
        }
        var message = nickname + ' ' + chatmessage;
        console.log("message", message);
        io.sockets.emit("chatmessages", message);
    });

    // socket on disconnecting
    socket.on('disconnect', function () {
        // remove user using removeUser function
        removeUser(user);
        // emit usercount to all players when disconnecting
        io.sockets.emit("user_count", userCount);
    });

    //When client sends its message to server event
    socket.on('message_to_server', function (data) {
        var guessNum = data['message'];

        // check if the number that user submitted
        // matches the right number
        if (rightNum == guessNum) {

            // raises guesscounter variable by id
            // calling raiseGuessCounter function
            raiseGuessCounter(socketId);

            // store the socket id that won to socketWon variable
            socketWon = socket.id;

            // find the winner name from users and set it in
            // userwon variable
            for(var i=0; i < users.length; i++) {
                if(users[i].id === socketWon){
                    var userwon = users[i].name;
                    var guesscounter = users[i].guesscounter;
                }
            }

            var points = pointMultiplier(guesscounter);

            // take the right number that player guessed to
            // a variable
            guessNum = "The right number was " + "'" + rightNum + "'" +
                    " and the winner was player named " + "'" + userwon + "'" + "!";

            // emit the number and winner to the players
            io.sockets.emit("number", guessNum);

            // alert message containing the right number
            // and the player that won
            var alertMsg = [userwon,rightNum,guesscounter,points];
            // emit the alert to all players
            socket.broadcast.emit('alert', alertMsg);
            socket.emit('alertwinner', alertMsg);
            // find the player that won and raise its won counter
            // by one
            for(var i=0; i < users.length; i++) {
                if(users[i].id === socketWon){
                    users[i].won += 1;
                    users[i].points += points;
                    users[i].guesscounter = 0;
                    }
                // update the users
              updateUsers();
            }
            // set the new number for a new game
            rightNum = randomNumber(1,100);
           // else if players guess is too big
        } else if (rightNum < guessNum) {
            raiseGuessCounter(socketId);
            guessNum = "Your guess " + "'" + guessNum + "'" + " is too big!";
            socket.emit("number", guessNum);
            // else if players guess is too small
        } else if (rightNum > guessNum) {
            raiseGuessCounter(socketId);
            guessNum = "Your guess " + "'" + guessNum + "'" + " is too small!";
            socket.emit("number", guessNum);
        }
    });

});

// function that adds players to users array
var addUser = function (data, name) {
    var user = {
        id: data,
        name: name,
        won: 0,
        points: 0,
        guesscounter: 0
    };
    users.push(user);
    updateUsers();
    return user;
};

// function that removes user and checks
// if user submitted his nickname
var removeUser = function (user) {
    for (var i = 0; i < users.length; i++) {
        if (!user) {
            return true;
        }else if(user.name === users[i].name) {
            userCount--;
            users.splice(i, 1);
            updateUsers();
            return;
    }
}
};

// function that updates players and shows them
var updateUsers = function () {
    var str = [];
    for (var i = 0; i < users.length; i++) {
        var user = users[i];
        str = str + user.name + "  /  " + user.won + "  /  " + user.points + "<br>";

    }

    io.sockets.emit("users", {users: str});
};
