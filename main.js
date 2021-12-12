const MongoConn = require("./MongoConn");
const WebSockets = require("./WebSockets");
const HTTPServer = require("./HTTPServer");

let DBConn = new MongoConn("mongodb://localhost:27017/","IGCS")//Connect to the database
new WebSockets(DBConn,8989);//Listen WebSocket
new HTTPServer(DBConn,80);//Listen HTTP



