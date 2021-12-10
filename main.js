const WebSockets = require("./WebSockets");
const HTTPServer = require("./HTTPServer");
const MongoConn = require("./MongoConn");






let DBConn = new MongoConn("mongodb://localhost:27017/","IGCS")
let ws = new WebSockets();
let WebServer = new HTTPServer(DBConn,80);



