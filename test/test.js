//引入类，暂时ES6标准中有import，但NodeJs还不支持
var Point = require('./Point.class');
//新建类对象
var point = new Point(2, 3);
//调用对象中的方法
console.log(point.toString());
//调用类中的静态函数
console.log(Point.sayHello('Ence'));
//调用类中的静态变量
console.log(Point.para);