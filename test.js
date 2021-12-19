const MongoConn = require("./MongoConn");
const WebSockets = require("./WebSockets");
const HTTPServer = require("./HTTPServer");
let DBConn
try{
    DBConn = new MongoConn("mongodb://localhost:27017/","IGCS")//Connect to the database
}catch {
    console.log("DB Connect Fail")
}
try{
    new WebSockets(DBConn,8989);//Listen WebSocket
}catch {
    console.log("WebSockets start Fail")
}
try{
    new HTTPServer(DBConn,80);//Listen HTTP
}catch {
    console.log("HTTP Sever start Fail")
}
console.log("PASS")
process.exit(0)


