var socketio = require("socket.io");
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
    //start socketio server allowing it to piggyback on the existing server
    io = socketio.listen(server);
    io.set('log level', 1);

    // define how each user connection will be handled
    io.sockets.on('connection', function(socket){

    //assign users a guest name when they connect
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);

    //place user in lobby room when they connect
    joinRoom(socket, 'Lobby');

    //Handle user messages, name change attempt and room creation/changes
    handleMessageBroadcasting(socket, nickNames);
    handleNameChangeAttempts(socket, nickNames, namesUsed);
    handleRoomJoining(socket);

    //Provide user with list of occupied rooms on request
    socket.on('rooms', function(){
      socket.emit('rooms', io.socket.manager.rooms);
    });

    //define cleanup logic when user disconnects
    handleClientDisconnection(socket, nickNames, namesUsed);
  });
}

//Assigning guest name
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
  //generate new guest name
  var name = 'Guest' + guestNumber;
  //associate guest name with client connection id
  nickNames[socket.id] = name;
  //let user know their guest name
  socket.emit('nameResult', function(){
    success : true,
    name : name
  });
  // note that guest name is used
  namesUsed.push(name);
  //increment counter used to generate guest name
  return guestNumber + 1;
}

//Joining room
function joinRoom(socket, room) {
  //make user join room
  socket.join(room);
  //note that user is now in this room
  currentRoom[socket.id] = room;
  //let user know they are now in new room
  socket.emit('joinResult', {room : room});
  //let other users in room know that user has joined room
  socket.broadcase.to(room).emit('message', {
    text : nickNames[socket.id]+ ' has joined ' + room +'.';
  });
  //determine which other users are in same room as user
  var usersInRoom = io.sockets.clients(room);
  //if other users exist, summarise who they are
  if(usersInRoom.length > 1) {
    var usersInRoomSummary = 'Users currently in '+ room +': ';
    for (var index in usersInRoom) {
      var userSocketId = usersInRoom[index].id;
      if (userSocketId !== socket.id) {
        usersInRoomSummary + = ', ';
      }
      usersInRoomSummary  += nickNames[userSocketId];
    }
    usersInRoomSummary += '.';
    //send summary of other rooms to ther user
    socket.emit('message', {text :usersInRoomSummary});
  }
}

//handling name change request
function handleNameChangeAttempts(socket, nickNames, namesUsed) {
  //add listener of nameAttempt attempt
  socket.on("nameAttempt", function(name){
    //Dont allow nicknames to begin with guest
    if(name.indexOf('Guest')==0) {
      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin with "Guest"'
      });
    } else {
      //If name isnt already registered, register it
      if(namesUsed.idexOf(name)==-1) {
        var previousName = nickNames[socket.id];
        var previousNameIndex = namesUsed.indexOf(previousName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        //Remove previous name to make available to other clients
        delete namesUsed[previousNameIndex];
        socket.emit('nameResult', {
          success: true,
          name: name
        });
        socket.broadcast.to(currentRoom[socket.id]).emit('message',{
          text : previousName +' is now known as '+ name +'.'
        });
      } else {
        //send error to client if name already registered
        socket.emit('nameResult', {
          success: true,
          message: 'The name you selected is already in use'
        });
      }
    }
  });
}

//sending chat messages
function handleMessageBroadcasting(socket) {
  socket.on('message', function(message){
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ': '+ message.text
    });
  });
}

//creating rooms
function handleRoomJoining(socket) {
  socket.on('join', function(room){
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

//Handling user disconnecting
function handleClientDisconnection(socket) {
  socket.on('disconnect', function(){
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  });
}
