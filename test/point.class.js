// 定义类
class Point {
    //构造函数
    constructor(x, y) {
        this.x = x;//类中变量
        this.y = y;
    }
    //类中函数
    toString() {
        return '(' + this.x + ', ' + this.y + ')';
    }
    //静态函数
    static sayHello(name){
        //修改静态变量
        this.para = name;
        return 'Hello, ' + name;
    }
}
//静态变量
Point.para = 'Allen';
module.exports = Point;