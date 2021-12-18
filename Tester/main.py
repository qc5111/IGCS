import datetime
import HttpTest
import WebSocketTest
import time
import threading



# HTTP test snippet
LinkArr = [
    "http://10.0.1.172/login.html",
    "http://10.0.1.172/UOP.png",
    "http://10.0.1.172/public.js",
    "http://10.0.1.172/signup.ajax?Username=qc5111&Nickname=York&Email=247731705%40qq.com&Password=3bc21fd44ce4590137481f2755c0c8dbedffb56b",
    "http://10.0.1.172/login.ajax?Username=qc5111&Password=3bc21fd44ce4590137481f2755c0c8dbedffb56b",
    "http://10.0.1.172/getbasicinfo.ajax",
    "http://10.0.1.172/createchannel.ajax?ChannelName=Test%20Channel"
]
HttpTest1 = HttpTest.HttpGetTest()
BenchmarksOfNginx = HttpTest1.StartTest("http://10.0.1.172:81/login.html",{"Cookie": "token=59bd84465b4f6da0d9b2762c1de9123d4dee6ec7"},100,100)
print("Nginx Benchmarks:")
print(BenchmarksOfNginx)
print("Node.js Tests:")
for i in LinkArr:
    Benchmarks = HttpTest1.StartTest(i,{"Cookie": "token=59bd84465b4f6da0d9b2762c1de9123d4dee6ec7"},100,100)
    print(Benchmarks)

exit()







TestAmount = 1000
WSArray = [0] * TestAmount
LastMessage = ""
MessageAmount = 0
MessageAmountLock = threading.Lock()
TimeStart = 0


def MessageGetCalc(Message):
    global MessageAmount, LastMessage, TestAmount, TimeStart
    if Message != LastMessage:
        MessageAmountLock.acquire()
        MessageAmount = 1
        TimeStart = datetime.datetime.now()
        MessageAmountLock.release()
        LastMessage = Message
    else:
        MessageAmountLock.acquire()
        MessageAmount += 1
        MessageAmountLock.release()
        if MessageAmount == TestAmount:
            TimeEnd = datetime.datetime.now()
            Duration = (TimeEnd - TimeStart).total_seconds()
            print("Receive Finish!\nReciveMessage:%s\nTotalAmount:%d,Duration:%f" % (Message, TestAmount, Duration))


"""# Register 2000 valid accounts
for i in range(TestAmount):
    WSArray[i] = WebSocketTest.IGCSWSTest("10.0.1.172", WebSocketTest.MessageRecv)
    Result = WSArray[i].SignUp("TestAccount"+str(i+1), "test123456", "TestAccount"+str(i+1), "247731705@qq.com")
"""
# Log in to 1000 valid accounts and connect to ws
for i in range(TestAmount):
    WSArray[i] = WebSocketTest.IGCSWSTest("10.0.1.172", MessageGetCalc)
    Result = WSArray[i].Login("TestAccount" + str(i + 1), "test123456")
    WSArray[i].GetBasicInfo()
    WSArray[i].ConnectWS(WSArray[i].Channels[0]['_id'])
while True:
    time.sleep(1000)



