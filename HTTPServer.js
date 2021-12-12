const http = require('http');
const fs = require('fs');
const url = require("url");
const Hash = require("./Hash");
const ObjectId = require("mongodb").ObjectId;

class HTTPServer {
    constructor(DBConn,Port){
        this.TokenEfftime = 86400
        this.DBConn = DBConn
        let Fr = fs.readFileSync('mime.json');//Read supported types(MIME)
        this.MIME = JSON.parse(Fr);
        let ThisClass = this;
        http.createServer(function (request, response){
            ThisClass.HttpRequestProcessing(request, response)
        }).listen(Port,"0.0.0.0");
        setTimeout(function (){
            ThisClass.AutoDeletetoken(ThisClass)
        },3000)
    }//Start listening http
    async HttpRequestProcessing(request, response){
        {
            let Resp=this.GetLocalReq(request.url)
            if(Resp.Static){//Static type, directly returned to the client
                response.writeHead(Resp.statusCode, {'Content-Type': Resp.MIME.type});
                if(Resp.MIME.binary){
                    response.write(Resp.Context,"binary");
                }else{
                    response.write(Resp.Context);
                }
            }else{
                Resp = await this.GetAjaxReq(request);
                Resp.statusCode = 200
                if(Resp.NewCookie !==undefined){
                    response.writeHead(Resp.statusCode, {'Content-Type': "application/x-javascript", "Set-Cookie": Resp.NewCookie});
                }
                else{
                    response.writeHead(Resp.statusCode, {'Content-Type': "application/x-javascript"});
                }
                response.write(JSON.stringify(Resp.Context));
            }
            response.end()
            let Timestamp = new Date().valueOf()
            this.DBConn.insert("RequestsLog", {Source:request.connection.remoteAddress,URL:request.url,StatusCode:Resp.statusCode,Timestamp:Timestamp})

        }
    }//Process all HTTP requests
    GetLocalReq(URL){
        let statusCode
        let ErrorText
        let HTMLData
        let ExtName
        URL = URL.slice(1)
        if(URL ===""){
            URL = "index.html"
        }
        ExtName = URL
        let Pos = ExtName.indexOf("?")
        if (Pos!==-1){//With GET parameters, need to be removed
            ExtName = ExtName.slice(0,Pos)
        }
        ExtName = ExtName.slice(ExtName.lastIndexOf(".")+1)

        let MIME = this.MIME[ExtName]
        if(MIME===undefined){//Unsupported media type 415 return value
            statusCode = 415
            ErrorText = "415 Unsupported Media Type"
        }else{
            //Dynamic file
            if(MIME.type==="application/nodejs"){
                return {Static:false}
            }
            //Try to read static files
            try{
                if(this.MIME[ExtName].binary){
                    HTMLData = fs.readFileSync('Static/'+URL, 'binary');
                }else{
                    HTMLData = fs.readFileSync('Static/'+URL, 'utf-8');
                }
                statusCode = 200

            }catch (err){//An error means that the file is unreadable or does not exist
                statusCode = 404
                ErrorText = "404 Not Found"
            }
        }

        if(statusCode!==200) {
            HTMLData = fs.readFileSync('Static/Error.html', 'utf-8');
            HTMLData = HTMLData.replace(/{{ErrorText}}/g,ErrorText)
            MIME = this.MIME.html
        }
        return {Static:true, statusCode:statusCode, MIME:MIME, Context:HTMLData}
    }//Process http static request according to mime, if it is found to be dynamic, it will return {Static:false}
    GetCookiesExpires(now){
        now.setTime(now.getTime() + this.TokenEfftime*1000)
        return now.toUTCString()
    }//Get the cookie expiration time in browser format according to the current time
    GenToken(Username,Nowtime){
        let ValidTimestamp = Math.round(Nowtime.valueOf() / 1000) + this.TokenEfftime;
        //Generate token
        let token = Hash.sha1(Username+ValidTimestamp+Math.round(Math.random()*100000000))
        //Write token to database
        this.DBConn.insert("token",{Username: Username, token: token, valid: ValidTimestamp})
        return token;
    }//Generate token based on user name and current time(Will write database)
    async GetUsernameFromToken(token){
        let ThisToken = await this.DBConn.select("token",{token:token})
        if(ThisToken.length===0){
            return ""
        }else{
            return ThisToken[0].Username
        }
    }//Obtain the Username through a valid token, and return an empty string if it fails
    DelToken(token){
        this.DBConn.delete("token",{token:token})
    }//Delete the token when the user logs out
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
    async GetReqBasicInfo(request) {
        let params = url.parse(request.url, true).query;
        let Cookies = this.DecodeCookies(request.headers.cookie)
        if (Cookies.token === undefined) {
            return ""
        }
        let Username = await this.GetUsernameFromToken(Cookies.token)
        if (Username === "") {
            return ""
        }
        return {Username:Username, params:params}
    }//Get basic information of the request, including username and get request parameters
    async GetAjaxReq(request) {
        let URL = request.url
        let Pos = URL.indexOf("?")
        if (Pos !== -1) {//With GET parameters, need to be removed
            URL = URL.slice(1, Pos)
        } else {
            URL = URL.slice(1)
        }
        if (URL === "login.ajax") {
            return await this.AjaxLogin(request)

        } else if (URL === "signup.ajax"){
            return await this.AjaxSignup(request)

        } else if (URL === "logout.ajax"){
            return await this.AjaxLogout(request)

        } else if (URL === "getbasicinfo.ajax"){
            return await this.AjaxGetBasicInfo(request)

        } else if (URL === "createchannel.ajax"){
            return await this.AjaxCreateChannel(request)

        } else if (URL === "deletechannel.ajax"){
            return await this.AjaxDeleteChannel(request)

        } else {
            return {Context:{Success:false, ErrorText:"404 not found"}}
        }
    }//Dynamic path addressing program
    async AjaxLogin(request) {
        let params = url.parse(request.url, true).query;
        let DBResult = await this.DBConn.select("Users", {Username: params.Username})
        if(DBResult.length === 0){
            return {Context:{Success:false, ErrorText:"Username does not exist, please check it!"}}
        }

        let Password = Hash.sha1(params.Password+params.Username)
        if (Password !== DBResult[0].Password){
            return {Context:{Success:false, ErrorText:"Password is not correct!"}}
        }
        let now=new Date()
        let token = this.GenToken(params.Username,now)
        return {Context:{Success:true}, NewCookie: "token="+token+";expires="+this.GetCookiesExpires(now)}
    }//Log in dynamic program processor
    async AjaxSignup(request){
        let params = url.parse(request.url, true).query;
        let IsRegistered= await this.DBConn.select("Users",{Username:params.Username})
        if(IsRegistered.length!==0){//Username already used
            return {Context:{Success:false, ErrorText:"Username already exists! Please try other"}}
        }
        let Password = Hash.sha1(params.Password+params.Username)
        this.DBConn.insert("Users",{Username:params.Username,Nickname:params.Nickname,Email:params.Email,Password:Password})
        let now=new Date()
        let token = this.GenToken(params.Username,now)
        return {Context:{Success:true}, NewCookie: "token="+token+";expires="+this.GetCookiesExpires(now)}
    }//Register dynamic program processor
    async AjaxLogout(request){
        let Cookies = this.DecodeCookies(request.headers.cookie)
        if(Cookies.token!==undefined){
            this.DelToken(Cookies.token)
        }
        return {Context:{Success:true}}
    }//Log out dynamic program processor
    async AjaxGetBasicInfo(request){
        let Cookies = this.DecodeCookies(request.headers.cookie)
        if(Cookies.token===undefined){
            return {Context:{Success:false}}
        }
        let Username = await this.GetUsernameFromToken(Cookies.token)
        if(Username === ""){
            return {Context:{Success:false}}
        }
        let User = await this.DBConn.select("Users",{Username:Username})
        if(User.length!==1){
            return {Context:{Success:false}}
        }
        //Read channel list
        let Channels = await this.DBConn.select("Channels")
        return {Context:{Success:true,Nickname:User[0].Nickname,Channels:Channels}}
    }//Return user basic information, including user name and channel list
    async AjaxCreateChannel(request){
        let ReqInfo= await this.GetReqBasicInfo(request)
        if(ReqInfo===""){
            return {Context:{Success:false}}
        }
        let Nowtime = new Date()
        await this.DBConn.insert("Channels",{Name:ReqInfo.params.ChannelName,"Created By":ReqInfo.Username,"Created Date":Nowtime.valueOf()})
        return {Context:{Success:true}}

    }//Channel creation interface
    async AjaxDeleteChannel(request){
        let ReqInfo= await this.GetReqBasicInfo(request)
        if(ReqInfo===""){
            return {Context:{Success:false}}
        }
        await this.DBConn.delete("Channels",{_id:ObjectId(ReqInfo.params.ChannelID)})
        return {Context:{Success:true}}

    }//Channel delete interface
    AutoDeletetoken(ThisClass){
        let now = new Date()
        let LowestValid = Math.round(now.valueOf()/1000) + 600 //增加了10分钟缓冲
        ThisClass.DBConn.delete("token",{valid:{$lte:LowestValid}})
        setTimeout(function (){
            ThisClass.AutoDeletetoken(ThisClass)
        },600000)//10 minutes
    }//Check and delete expired tokens every 10 minutes
}

module.exports = HTTPServer;