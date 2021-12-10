const crypto = require('crypto');


function md5(data){
    return crypto.createHash('md5').update(data).digest('hex')
}
function sha1(data){
    return crypto.createHash('sha1').update(data).digest('hex')
}
module.exports = {md5, sha1}