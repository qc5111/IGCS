const ws = require('nodejs-websocket');

//var clients = new Array();
class WebSockets {

    constructor(DBConn,Port) {
        this.DBConn = DBConn
        this.Clients = {};
        let ThisClass = this;
        ws.createServer(function(socket){
            socket.on('text',function (data){ ThisClass.DataRecv(socket, data)})
            socket.on("close", function (code, reason) {ThisClass.ClientClose(socket)});
            socket.on('error', function(code) {});
        }).listen(Port);
    }
    DecodeCookies(Cookies){

        let CookiesDict = {}
        if(Cookies === undefined){
            return CookiesDict
        }
        let CookieArray = Cookies.split("; ")
        CookieArray.forEach(function (Cookie){
            let CookieArray2 = Cookie.split("=");
            CookiesDict[CookieArray2[0]] = CookieArray2[1]
        })
        return CookiesDict
    }
    async GetUsernameFromToken(token){
        let ThisToken = await this.DBConn.select("token",{token:token})
        if(ThisToken.length===0){
            return ""
        }else{
            return ThisToken[0].Username
        }

    }
    GroupSend(ChannelID,SendData){
        this.Clients[ChannelID].forEach(function (Client){//遍历发送
            Client.send(SendData);
        })
    }
    UpdateUserList(ChannelID){
        let UserList = []
        this.Clients[ChannelID].forEach(function (Client){//遍历获取列表
            UserList.push(Client.headers.nickname)
        })
        let GroupSendMessage = JSON.stringify({Action:"UpdateUserList", UserList:UserList})
        this.GroupSend(ChannelID, GroupSendMessage)
    }
    async RecordMessage(ChannelID,Message){
        Message.ChannelID = ChannelID
        this.DBConn.insert("MessageHistory",Message)
    }
    async GetHistoryMessages(ChannelID,limit){
        let HistoryMessages=await this.DBConn.select("MessageHistory",{ChannelID:ChannelID, MessageType:{$ne:"system"}},{MessageTime:"-1"},limit)
        HistoryMessages.reverse()
        return HistoryMessages
    }
    async DataRecv(socket, Data){
        let RecvJson = JSON.parse(Data)
        let SendJson = {}
        let ChannelID = socket.path.split("=")[1]
        let Cookies = this.DecodeCookies(socket.headers.cookie)
        let Username = await this.GetUsernameFromToken(Cookies["token"])
        let User = await this.DBConn.select("Users",{Username:Username})
        socket.headers.nickname = User[0].Nickname
        if(RecvJson.Action === "join"){
            if(this.Clients[ChannelID]===undefined) {
                this.Clients[ChannelID] = [];
            }
            this.Clients[ChannelID].push(socket);
            this.UpdateUserList(ChannelID)//更新当前频道用户列表
            let HistoryMessages = await this.GetHistoryMessages(ChannelID,20)//获取20条历史记录
            HistoryMessages.forEach(function (HistoryMessage){
                socket.send(JSON.stringify(HistoryMessage))
            })

            SendJson = {Action:"Message", MessageType:"system",MessageText:User[0].Nickname+" join the meeting"}
        }else if(RecvJson.Action === "Message"){
            if(RecvJson.MessageType === "normal"){
                SendJson = RecvJson
                SendJson.Sender = User[0].Nickname
            }else if(RecvJson.MessageType === "image"){
                SendJson = RecvJson
                SendJson.Sender = User[0].Nickname
            }else{
                return
            }

        }
        SendJson.MessageTime = (new Date()).valueOf()
        await this.RecordMessage(ChannelID, SendJson)
        this.GroupSend(ChannelID, JSON.stringify(SendJson))
    }
    async ClientClose(socket){
        let ChannelID = socket.path.split("=")[1]
        for(let i=0;i<this.Clients[ChannelID].length;i++){
            if(socket===this.Clients[ChannelID][i]){
                this.Clients[ChannelID].splice(i,1)
                this.UpdateUserList(ChannelID)//更新当前频道用户列表
                break
            }
        }
        let SendJson = {Action:"Message", MessageType:"system",MessageText:socket.headers.nickname+" leave the meeting"}
        SendJson.MessageTime = (new Date()).valueOf()
        await this.RecordMessage(ChannelID, SendJson)
        this.GroupSend(ChannelID, JSON.stringify(SendJson))
    }

}

module.exports = WebSockets;