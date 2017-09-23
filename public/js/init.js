if(window.WebSocket){
    console.log('This browser supports WebSocket');
}else{
    console.log('This browser does not supports WebSocket');
}
var socket=io.connect();
$(document).ready(function(){
    var chatApp=new Chat(socket);
    socket.on('nameResult',function(result){//显示更名尝试的结果
        var message;
        if(result.success){
            message='You are known as '+result.name+'.';
        }else{
            message=result.message;
        }
        console.log("nameResult:---"+message);
        $('#messages').append(divSystemContentElement(message));
       // $('#nickName').text(result.name);
    });

    socket.on('joinResult',function(result){//显示房间变更结果
        console.log('joinResult:---'+result);
        $('#room').text(result.room);
        $('#messages').append(divSystemContentElement('Room changed.'));
    });

    socket.on('message',function(message){//显示接收到的信息
        console.log('message:---'+message);
        var newElement=$('<div></div>').text(message.text);
        $('#messages').append(newElement);
        //$('#messages').scrollTop($('#messages').prop('scrollHeight'));
    });

    socket.on('rooms',function(rooms){//显示可用房间列表
        console.log('rooms:---'+rooms);
       // rooms=JSON.parse(rooms);
        $('#room-list').empty();
        for(var room in rooms){
           // $('#room-list').append(divEscapedContentElement(room+':'+rooms[room]));
            room = room.substring(1,room.length);
            if(room != ""){
                $("#room-list").append(divEscapedContentElement(room));
            }
        }
        $('#room-list div').click(function(){
            //chatApp.processCommand('/join '+$(this).text().split(':')[0]);
            chatApp.processCommand('/join '+$(this).text()); 
            $('#send-message').focus();
        });
    });

    setInterval(function(){
        socket.emit('rooms'); //定时请求可用房间列表
    },1000);

    $('#send-message').focus();
    $('#send-button').click(function(){  //提交表单可以发送聊天信息
        processUserInput(chatApp,socket);
       // $('#send-message').focus();
       return false;
    });
});