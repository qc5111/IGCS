import requests
import _thread
import threading
import time
import datetime


class HttpGetTest():
    CompleteAccount = 0
    ResultLock = threading.Lock()

    def StartTest(self, URL, headers, Thread, SingleTestAmount):
        self.URL = URL
        self.headers = headers
        self.SingleTestAmount = SingleTestAmount
        self.Result = [[0, 0]] * Thread
        Durations = [0] * Thread
        Errors = 0
        self.CompleteAccount = 0
        for i in range(Thread):
            ThreadNumber = _thread.start_new_thread(self.TestThread, (i,))
        while self.CompleteAccount < Thread:
            time.sleep(0.5)
        for i in range(Thread):
            Durations[i] = self.Result[i][0]
            Errors += self.Result[i][1]
        AverageTimeOfRequest = (sum(Durations) / Thread) / (Thread * SingleTestAmount)
        ReturnText = "Test of URL:'%s', Total Request Amount:%d\nAverage time per request(seconds):%f\nTotal Thread:%d, Total Errors:%d\nFastest Thread(seconds):%f,Slowest Thread(seconds):%f\nScore:%f" % (
        URL, Thread * SingleTestAmount, AverageTimeOfRequest, Thread, Errors, min(Durations), max(Durations),
        1 / AverageTimeOfRequest)
        return ReturnText

    def TestThread(self, TreadNumber):
        Errors = 0
        TimeStart = datetime.datetime.now()
        TestRequest = requests.session()
        TestRequest.keep_alive = False
        for i in range(self.SingleTestAmount):
            Result = TestRequest.get(url=self.URL, headers=self.headers)
            # print(Result.text)
            if Result.status_code != 200:
                Errors += 1
        TimeEnd = datetime.datetime.now()
        Duration = (TimeEnd - TimeStart).total_seconds()
        self.ResultLock.acquire()
        self.Result[TreadNumber] = [Duration, Errors]
        self.CompleteAccount += 1
        self.ResultLock.release()
