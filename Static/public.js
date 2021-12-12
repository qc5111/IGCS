function AutoDisappearNotification(Content,NoticeClass){//'alert-danger'
    $('.alert').html(Content).addClass(NoticeClass).show().delay(2000).fadeOut();
}
function WaitAndJump(URL,WaitTime){
    setTimeout(function(){
        window.location.href=URL
    }, WaitTime);
}
function CleanToken(){
    let PastDate=new Date();
    PastDate.setTime(-86400);
    document.cookie="token=''; expires="+PastDate.toGMTString();
    window.location.href="login.html"
}
function Logout(){
    $.ajax({
        url: "logout.ajax",
        type: "get",
        dataType: "json",
        success: function (Response,Status){
            CleanToken()
        }
    });
}