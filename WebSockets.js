const ws = require('nodejs-websocket');

//var clients = new Array();
class WebSockets {

    constructor() {
        this.Clients = [];
        let ThisClass = this;
        ws.createServer(function(socket){
            socket.on('text', function(str) {
                // 在控制台输出前端传来的消息　　
                console.log(str);
                //console.log('开启连接', socket);
                ThisClass.Clients.push(socket);
                //console.log(ThisClass.Clients)
                console.log("socket.path:",socket.path);//此后应换位sessions
                //console.log("clients:",clients);
                //向所有人发送消息
                ThisClass.Clients.forEach(function (Client){
                    Client.sendText('New Client Connect!');
                })

                //向前端回复消息
                //socket.sendText('服务器端收到客户端端发来的消息了！' + count++);


            });
            socket.on("close", function (code, reason) {
                for(let i=0;i<ThisClass.Clients.length;i++){
                    if(socket===ThisClass.Clients[i]){
                        ThisClass.Clients.splice(i,1)
                    }
                }
            });
            socket.on('error', function(code) {

            });

        }).listen(8080);
    }

}

module.exports = WebSockets;