const http = require('http');
const fs = require('fs');
const url = require("url");
const Hash = require("./Hash");


class HTTPServer {
    constructor(DBConn,Port){
        this.TokenEfftime = 86400
        this.DBConn = DBConn
        //读取支持的类型
        let Fr = fs.readFileSync('mime.json');
        this.MIME = JSON.parse(Fr);

        let ThisClass = this
        http.createServer(async function (request, response) {

            let Resp=ThisClass.GetLocalReq(request.url)
            console.log(request.url, Resp.statusCode)
            if(Resp.Static){//静态类型，直接返回给客户端
                response.writeHead(Resp.statusCode, {'Content-Type': Resp.MIME.type});
                if(Resp.MIME.binary){
                    response.write(Resp.Context,"binary");
                }else{
                    response.write(Resp.Context);
                }


            }else{

                Resp = await ThisClass.GetAjaxReq(request);
                if(Resp.NewCookie !==undefined){
                    response.writeHead(200, {'Content-Type': "application/x-javascript", "Set-Cookie": Resp.NewCookie});
                }
                else{
                    response.writeHead(200, {'Content-Type': "application/x-javascript"});
                }

                console.log(JSON.stringify(Resp.Context))
                response.write(JSON.stringify(Resp.Context));
            }
            response.end()
            //await DBConn.InsertData("TestTable",{ name: "Test", url: "www.baidu.com" })
            //let Result =  findCollectionHasCondition(DBConn.MDB.collection("TestTable",{}))

            //let DBResult = await DBConn.GetData("TestTable", {name:'Test'})
            //console.log("DBResult1",DBResult[0].url)

        }).listen(Port);

    }
    GetCookiesExpires(now,ValidSeconds){
        now.setTime(now.getTime() + ValidSeconds*1000)
        return now.toUTCString()
    }
    GetLocalReq(URL){
        let statusCode
        let ErrorText
        let HTMLData
        URL = URL.slice(1)
        if(URL ===""){
            URL = "index.html"
        }
        let ExtName = URL.slice(URL.indexOf(".")+1)
        let Pos = ExtName.indexOf("?")

        if (Pos!==-1){//带GET参数，需要去除
            ExtName = ExtName.slice(0,Pos)
        }
        let MIME = this.MIME[ExtName]
        console.log(ExtName)
        if(MIME===undefined){//不支持的媒体类型 415返回值
            statusCode = 415
            ErrorText = "415 Unsupported Media Type"
        }else{
            //动态文件
            if(MIME.type==="application/nodejs"){
                return {Static:false}
            }
            //尝试读取静态文件
            try{
                if(this.MIME[ExtName].binary){
                    HTMLData = fs.readFileSync('Static/'+URL, 'binary');
                }else{
                    HTMLData = fs.readFileSync('Static/'+URL, 'utf-8');
                }
                statusCode = 200

            }catch (err){//发生错误就代表文件不可读或不存在
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
    }
    GenToken(Username,Nowtime){
        let ValidTimestamp = Math.round(Nowtime.valueOf() / 1000) + this.TokenEfftime;
        //生成token
        let token = Hash.sha1(Username+ValidTimestamp+Math.round(Math.random()*100000000))
        //写入token
        this.DBConn.insert("token",{Username: Username, token: token, valid: ValidTimestamp})
        return token;

    }
    async GetUsernameFromToken(token){
        let ThisToken = await this.DBConn.select("token",{token:token})
        if(ThisToken.length===0){
            return ""
        }else{
            return ThisToken[0].Username
        }

    }
    DelToken(token){
        this.DBConn.delete("token",{token:token})
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
    async GetAjaxReq(request) {
        let URL = request.url
        let Pos = URL.indexOf("?")

        if (Pos !== -1) {//带GET参数，需要去除
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

        } else {
            return {Context:{Success:false, ErrorText:"404 not found"}}
        }


    }
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
        return {Context:{Success:true}, NewCookie: "token="+token+";expires="+this.GetCookiesExpires(now,this.TokenEfftime)}



    }
    async AjaxSignup(request){
        let params = url.parse(request.url, true).query;
        let IsRegistered= await this.DBConn.select("Users",{Username:params.Username})
        if(IsRegistered.length!==0){//注册过
            return {Context:{Success:false, ErrorText:"Username already exists! Please try other"}}
        }
        let Password = Hash.sha1(params.Password+params.Username)
        this.DBConn.insert("Users",{Username:params.Username,Nickname:params.Nickname,Email:params.Email,Password:Password})
        let now=new Date()
        let token = this.GenToken(params.Username,now)
        return {Context:{Success:true}, NewCookie: "token="+token+";expires="+this.GetCookiesExpires(now,this.TokenEfftime)}
    }
    async AjaxLogout(request){
        let Cookies = this.DecodeCookies(request.headers.cookie)
        if(Cookies.token!==undefined){
            this.DelToken(Cookies.token)
        }
        return {Context:{Success:true}}

    }
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
        //读取频道列表
        let Channels = await this.DBConn.select("Channels")
        return {Context:{Success:true,Nickname:User[0].Nickname,Channels:Channels}}
    }
}
module.exports = HTTPServer;