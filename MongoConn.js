const MongoClient = require('mongodb').MongoClient;




class MongoConn{
    constructor(Url,DB) {
        let ThisClass = this
        MongoClient.connect(Url, function(err, MClient) {
            ThisClass.MongoClient = MClient;
            ThisClass.MDB = ThisClass.MongoClient.db(DB)
            //console.log("DB Connected")
        });
    }
    async insert(Table, Data) {
        await this.MDB.collection(Table).insertOne(Data);
    }
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
    }
    async delete(Table, filter){
        await this.MDB.collection(Table).deleteMany(filter);
    }
    close(){
        this.MongoClient.close()
    }
}
module.exports = MongoConn;