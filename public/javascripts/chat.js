//this code starts javascript equivalent of a class(looks like a constructor to me)
var Chat = function(socket) {
  this.socket = socket;
}

//send chat messages
Chat.prototype.sendMessage = function (room, text) {
  var message =  {
    room: room,
    text: text
  };
  this.socket.emit('message', message);
};

//change rooms
Chat.prototype.changeRoom = function(room) {
  this.socket.emit('join',{
    newRoom: room
  });
}

//processing chat commands
Chat.prototype.processCommand = function (command) {
  var words = command.split(" ");
  var command = words[0].substring(1, words[0].length).toLowerCase();
  var message = false;

  switch (command) {
    case 'join':
      words.shift();
      var room = words.join(' ');
      this.changeRoom(room);
      break;

    case 'nick':
      words.shift();
      var name = words.join(' ');
      //handle name change attempt
      this.socket.emit('nameAttempt', name);
      break;

    default:
      //return error message if the command isnt recognised
      message = 'Unrecognised command';
      break;
  }
  return message;
};
