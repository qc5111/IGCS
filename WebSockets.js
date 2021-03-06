const ws = require('nodejs-websocket');//npm install nodejs-websocket

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
    }//Start listening the ws server
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
    }//Parse standard http cookies to json
    async GetUsernameFromToken(token){
        let ThisToken = await this.DBConn.select("token",{token:token})
        if(ThisToken.length===0){
            return ""
        }else{
            return ThisToken[0].Username
        }

    }//Obtain the Username through a valid token, and return an empty string if it fails
    async GroupSend(ChannelID,SendData){
        this.Clients[ChannelID].forEach(function (Client){//Traverse sending
            Client.send(SendData);
        })
    }//Broadcast on designated channel
    UpdateUserList(ChannelID){
        let UserList = []
        this.Clients[ChannelID].forEach(function (Client){//Traverse to get the list
            UserList.push(Client.headers.nickname)
        })
        let GroupSendMessage = JSON.stringify({Action:"UpdateUserList", UserList:UserList})
        this.GroupSend(ChannelID, GroupSendMessage)
    }//Get the current channel user list
    async RecordMessage(ChannelID,Message){
        Message.ChannelID = ChannelID
        this.DBConn.insert("MessageHistory",Message)
    }//Log the message in the database
    async GetHistoryMessages(ChannelID,limit){
        let HistoryMessages=await this.DBConn.select("MessageHistory",{ChannelID:ChannelID, MessageType:{$ne:"system"}},{MessageTime:"-1"},limit)
        HistoryMessages.reverse()
        return HistoryMessages
    }//Get the current channel history information (including pictures)
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
            this.UpdateUserList(ChannelID)//Update current channel user list
            let HistoryMessages = await this.GetHistoryMessages(ChannelID,20)//Get 20 history records
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
    }//Process the message sent by the client and handle it
    async ClientClose(socket){
        let ChannelID = socket.path.split("=")[1]
        for(let i=0;i<this.Clients[ChannelID].length;i++){
            if(socket===this.Clients[ChannelID][i]){
                this.Clients[ChannelID].splice(i,1)
                this.UpdateUserList(ChannelID)//Update current channel user list
                break
            }
        }
        let SendJson = {Action:"Message", MessageType:"system",MessageText:socket.headers.nickname+" leave the meeting"}
        SendJson.MessageTime = (new Date()).valueOf()
        await this.RecordMessage(ChannelID, SendJson)
        this.GroupSend(ChannelID, JSON.stringify(SendJson))
    }//Execute after the user closes the ws connection
}

module.exports = WebSockets;