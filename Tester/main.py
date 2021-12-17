import datetime
import HttpTest
import WebSocketTest
import time
import threading

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

# HTTP test snippet
Test1 = HttpTest.HttpGetTest()
BenchmarksOfNginx = Test1.StartTest("http://10.0.1.172/createchannel.ajax?ChannelName=TestChannel",{"Cookie": "token=1e4edb13b0c8470c66746fcfc23a5b41ed2b5f66"},100,100)
print(BenchmarksOfNginx)
#TestResult = Test1.StartTest("http://127.0.0.1/login.html",200,200)

