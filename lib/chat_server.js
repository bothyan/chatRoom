var socketio = require("socket.io");
var io;
//用户编号
var guestNumber = 1;
//socket id对应的nickname
var nickNames = {};
//所有已使用的nickname
var namesUsed = [];
//聊天室--人数
var allRooms = {};
//sockid--聊天室
var currentRoom = {};

exports.listen = function(server){

	io = socketio.listen(server);//启动socket.io服务器，允许它搭载在已有的HTTP服务器上
	io.set("log level",1);
	//io.serveClient("log level",1);
	io.sockets.on("connection",function(socket){//定义每个用户连接的处理逻辑
		guestNumber = assignGuestName(socket,guestNumber,nickNames,namesUsed);//在用户连接上来时赋予一个访客名
		joinRoom(socket,"bothyan"); //在用户连接上来时把它放入聊天室Lobby中
		handleMessageBroadcasting(socket,nickNames);//处理用户的消息，更名，以及聊天室的创建和变更
		handleNameChangeAttempts(socket,nickNames,namesUsed);
		handleRoomJoining(socket);
		socket.on("rooms",function(){//用户发出请求时，向其提供已经被占用的聊天室的列表
			//socket.emit("rooms",JSON.stringify(allRooms));
			socket.emit("rooms",io.sockets.manager.rooms);
		});
		handleClientDisconnection(socket,nickNames,namesUsed);//定义用户断开连接的清楚逻辑
	})
};

//新socket连人，自动分配一个昵称
function assignGuestName(socket,guestNumber,nickNames,namesUsed){
	var name = "Guest"+guestNumber;//生成新的昵称
	nickNames[socket.id] = name;//把用户昵称跟客户端ID关联上
	socket.emit("nameResult",{//让用户知道他们的昵称
		success:true,
		name:name
	});
	//namesUsed[name] = 1;
	namesUsed.push(name);//存放已经被占用的昵称
	return guestNumber+1;//用来增加生成昵称的计数器
}

//加入某个聊天室
function joinRoom(socket,room){
	socket.join(room);//让用户进入房间
	/*var num = allRooms[room];
	if(num===undefined){
		allRooms[room] = 1;
	}else{
		allRooms[room] = num+1;
	}*/
	currentRoom[socket.id] = room;//记录用户的房间
	socket.emit("joinResult",{room:room});//让用户知道他们进入的新的房间
	socket.broadcast.to(room).emit("message",{//让房间里的其他用户知道有新用户进入的房间
		text:nickNames[socket.id]+" has join "+room+"."
	});
	//var usersInRoom = io.sockets.adapter.rooms[room];
	var usersInRoom = io.sockets.clients(room);//确定有哪些用户在这个房间里
	/*if(usersInRoom.length>1){
		var usersInRoomSummary = "Users currently in "+room+" : ";
		for(var index in usersInRoom.sockets){
			if(index!=socket.id){
				usersInRoomSummary+=nickNames[index]+",";
			}
		}
		socket.emit("message",{text:usersInRoomSummary});
	}*/
	if(usersInRoom.length>1){//如果不止一个用户在这个房间里，汇总下都是谁
		var usersInRoomSummary = "Users currently in "+room+" : ";
		for(var index in usersInRoom){
			var userSocketId = usersInRoom[index].id;
			if(userSocketId != socket.id){
				if(index>0){
					usersInRoomSummary += ", ";
				}
				usersInRoomSummary += nickNames[userSocketId];
			}
		}
		usersInRoomSummary += ".";
		socket.emit('message',{text:usersInRoomSummary});//将房间里其他用户的汇总发送给这个用户
	}

}
//修改昵称
function handleNameChangeAttempts(socket,nickNames,namesUsed){
	socket.on("nameAttempt",function(name){//添加nameAttempt事件监听器
		if(name.indexOf("Guest") == 0){//昵称开头不能以Guest开头
			socket.emit("nameResult",{
				success:false,
				message:"Names cannot begin with 'Guest' ."
			});
		}else{
			//if(namesUsed[name] == undefined){
			if(namesUsed.indexOf(name) == -1){	//如果昵称还没注册就注册上
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				//delete namesUsed[previousName];
				delete namesUsed[previousNameIndex];//删掉之前用得昵称，让其他用户可以使用
				/*namesUsed[name] = 1;
				nickNames[socket.id] = name;*/
				socket.emit("nameResult",{
					success:true,
					name:name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit("message",{
					text:previousName+" is now known as "+name+"."
				})
			}else{
				socket.emit("nameResult",{  //如果昵称已经被占用，则给客户端发信息
					success:false,
					message:"That name is already in use"
				})
			}
		}
	});
}
//将某个用户的消息广播到同聊天室下的其他用户
function handleMessageBroadcasting(socket){
	socket.on("message",function(message){
		console.log("message:----"+JSON.stringify(message));
		socket.broadcast.to(message.room).emit("message",{
			text:nickNames[socket.id]+ ": "+message.text
		});
	});
}
//加入/创建某个聊天室
function handleRoomJoining(socket){
	socket.on("join",function(room){
		var temp = currentRoom[socket.id];
		//delete currentRoom[socket.id];
		socket.leave(temp);
		//var num=--allRooms[temp];
		//if(num == 0){
		//	delete allRooms[temp];
		//}
		joinRoom(socket,room.newRoom);
	});
}
//socket 断线处理
function handleClientDisconnection(socket){
	socket.on("disconnect",function(){
		console.log("xxx disconnect");
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		/*allRooms[currentRoom[socket.id]]--;
		delete namesUsed[nickNames[socket.id]];
		delete nickNames[socket.id];
		delete currentRoom[socket.id];*/
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}