function divEscapedContentElement(message) {
  return $('<div></div>').text(message);
}

function divSystemContentElement(message) {
  return $('<div></div>').html('<i>'+message+'</i>');
}

//process raw user inputs
function processUserInput(chatApp, socket) {
  var message = $('#sending-message').val();
  var systemMessage;

  //if input begins with / treat it as a command
  if (message.charAt(0)=='/') {
    systemMessage = chatApp.processCommand(message);
    if(systemMessage) {
      $('#messages').append(divSystemContentElement(systemMessage));
    }
  } else {
    //broadcast command input to other users
    chatApp.sendMessage($('#room').text(), message);
    $('#messages').append(divEscapedContentElement(message));
    $('#messages').scrollTop($('#messages').prop('scrollHeight'));
  }
  $('sending-message').val('');
}

//client application initialization logic
var socket = io.connect();
$('#document').ready(function() {
  var chatApp = new Chat(socket);
  //display result for name attempt
  socket.on('nameResult', function(result) {
    var message;
    if(result.success) {
      message = 'You are now known as '+ result.name +'.';
    } else {
      message = result.message;
    }
    $('#messages').append(divSystemContentElement(message));
  });

  //display result of a room change
  socket.on('joinResult', function(result) {
    $('#room').text(result.room);
    $('#messages').append(divSystemContentElement('Room Changed'));
  });

  //display received messages
  socket.on('message', function(message) {
    var newElement = $('<div></div>').text(message.text);
    $('#messages').append(newElement);
  });

  // display room list of rooms available
  socket.on('rooms', function(rooms) {
    $('#room-list').empty();

    for (var room in  rooms) {
      room = room.substring(1, room.length);
      if (room != '') {
        $('room-list').append(divEscapedContentElement(room));
      }
    }

    //allow click of  a room to change that room
    $('#room-list div').click(function () {
      chatApp.processCommand('/join '+ $(this).text());
      $('#sending-message').focus();
    });
  });

  //request list of available rooms intemitently
  setInterval(function() {
    socket.emit('rooms');
  },1000);

  $('#sending-message').focus();

  //allow submitting the form to send a chat message
  $('#send-form').submit(function() {
    processUserInput(chatApp, socket);
    return false;
  });
});
