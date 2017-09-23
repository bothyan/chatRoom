//内置的http模块提供了HTTP服务器和客户端功能
var http  =  require("http");
//内置的fs模块提供了与文件系统相关的功能
var fs    =  require("fs");
//内置的path模块提供与文件系统路径相关的功能
var path  =  require("path");
//附加的mime模块有根据文件扩展名得出MIME类型的能力
var mime  =  require("mime");
//cache是用来缓存文件内容的对象
var cache =  {};
//请求的文件不存在，发送404错误

var chatServer = require('./lib/chat_server');

function send404(response){
	response.writeHead(404,{'Content-Type':'text/plain'});
	response.write('Error 404:resourse not found');
	response.end();
}
//提供文件数据服务，先写正确的http头，再发送文件的内容
function sendFile(response,filePath,fileContents){
	response.writeHead(
		200,
		{"content-type":mime.lookup(path.basename(filePath))}
	);
	response.end(fileContents);
}
//读取文件，先确定文件是否缓存
function serveStatic(response,cache,absPath){
	if(cache[absPath]){  //检查文件是否在内存中
		sendFile(response,absPath,cache[absPath]);//从内存中返回文件
	}else{
		fs.exists(absPath,function(exists){ //检查文件是否存在
			if(exists){
				fs.readFile(absPath,function(err,data){ //从硬盘中读取
					if(err){
						send404(response);
					}else{
						cache[absPath] = data;  //从硬盘中读取返回
						sendFile(response,absPath,data);
					}
				});
			}else{
				send404(response); //发送404错误
			}
		})
	}
}
//创建服务器,入口
var server = http.createServer(function(request,response){ //创建HTTP服务器，用匿名函数定义对每个请求的处理行为
	var filePath = false;
	if(request.url == "/"){
		filePath = 'public/index.html'; //确认返回默认的html文件
	}else{
		filePath = 'public'+request.url;//将URL路径转为文件的相对路径
	}
	var absPath = './'+filePath;
	serveStatic(response,cache,absPath);//返回静态文件
});
//启动服务器
server.listen(3000,function(){
	console.log("server listening on port 3000");
});

chatServer.listen(server);//websocket服务也绑定到该端口上