import hashlib
import websocket
import requests
import time
import json
import _thread


def MessageRecv(Message):
    print(Message)


class IGCSWSTest:

    def __init__(self, ServerAddr, MessageRecv):
        self.ServerAddr = ServerAddr
        self.MessageRecv = MessageRecv

    def SHA1(self, data):
        sha = hashlib.sha1(data.encode('utf-8'))
        return sha.hexdigest()

    def Login(self, Username, Password):
        Password = self.SHA1(Password)
        ReqResult = requests.get(
            "http://%s/login.ajax?Username=%s&Password=%s" % (self.ServerAddr, Username, Password))
        RecvValue = json.loads(ReqResult.text)
        if RecvValue['Success']:
            self.token = requests.utils.dict_from_cookiejar(ReqResult.cookies)['token']
        return RecvValue['Success']

    def SignUp(self, Username, Password, Nickname, Email):
        Password = self.SHA1(Password)
        ReqResult = requests.get(
            "http://%s/signup.ajax?Username=%s&Nickname=%s&Email=%s&Password=%s" % (
                self.ServerAddr, Username, Nickname, Email, Password))
        RecvValue = json.loads(ReqResult.text)
        if RecvValue['Success']:
            self.token = requests.utils.dict_from_cookiejar(ReqResult.cookies)['token']
        return RecvValue['Success']

    def GetBasicInfo(self):
        ReqResult = requests.get("http://%s/getbasicinfo.ajax" % self.ServerAddr, cookies={"token": self.token})
        RecvValue = json.loads(ReqResult.text)
        if RecvValue['Success']:
            self.Channels = RecvValue['Channels']
        return RecvValue['Success']

    def ConnectWS(self, ChannelID):
        self.WSClient = websocket.WebSocket()
        self.WSClient.connect("ws://%s:8989/ChannelID=%s" % (self.ServerAddr, ChannelID),
                              cookie="token=" + self.token)
        self.WSClient.send('{"Action":"join"}')
        ThreadNumber = _thread.start_new_thread(self.MessageRecver, (1,))

    def MessageRecver(self, p):
        while True:
            self.MessageRecv(self.WSClient.recv())

"""
User1 = IGCSWSTest("10.0.1.123", MessageRecv)
User1.SignUp("qc51114", "test123456", "TestAccount1", "247731705@qq.com")
Result = User1.Login("qc51114", "test123456")
print(Result)
User1.GetBasicInfo()
User1.ConnectWS(User1.Channels[0]['_id'])
time.sleep(100)
# Result = User1.SignUp("qc51114", "test123456", "TestAccount1", "247731705@qq.com")
"""

