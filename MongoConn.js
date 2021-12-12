const MongoClient = require('mongodb').MongoClient;//npm install mongodb

class MongoConn{
    constructor(Url,DB) {
        let ThisClass = this
        MongoClient.connect(Url, function(err, MClient) {
            ThisClass.MongoClient = MClient;
            ThisClass.MDB = ThisClass.MongoClient.db(DB)
        });
    }//Establish a database connection (the return of this function does not mean that the connection is complete)
    async insert(Table, Data) {
        await this.MDB.collection(Table).insertOne(Data);
    }//The database inserts data, if await, the execution is complete after returning
    async select(Table, filter, sort={},limit=0) {
        let DBResult
        if(sort==={} && limit===0){
            DBResult = await this.MDB.collection(Table).find(filter)
        }else if(sort!=={} && limit===0){
            DBResult = await this.MDB.collection(Table).find(filter).sort(sort)
        }else if(sort==={} && limit!==0){
            DBResult = await this.MDB.collection(Table).find(filter).limit(limit)
        }else{
            DBResult = await this.MDB.collection(Table).find(filter).sort(sort).limit(limit)
        }

        let ReturnData = []
        await DBResult.forEach(function (Data){
            ReturnData.push(Data)
        })
        return ReturnData
    }//Data query instruction, if await, data results will be returned
    async delete(Table, filter){
        await this.MDB.collection(Table).deleteMany(filter);
    }//Database delete instruction, if await,returns then data delete
    close() {
        this.MongoClient.close()
    }//Close database connection
}

module.exports = MongoConn;