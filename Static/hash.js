//Refrence: https://www.jianshu.com/p/91c2fc568fc9
function add(x, y) {
    return((x & 0x7FFFFFFF) + (y & 0x7FFFFFFF)) ^ (x & 0x80000000) ^ (y & 0x80000000);
}

function SHA1hex(num) {
    let sHEXChars = "0123456789abcdef";
    let str = "";
    for(let j = 7; j >= 0; j--)
        str += sHEXChars.charAt((num >> (j * 4)) & 0x0F);
    return str;
}

function AlignSHA1(sIn) {
    let nblk = ((sIn.length + 8) >> 6) + 1
    let blks = new Array(nblk * 16);
    let i;
    for(let i = 0; i < nblk * 16; i++) blks[i] = 0;
    for(i = 0; i < sIn.length; i++)
        blks[i >> 2] |= sIn.charCodeAt(i) << (24 - (i & 3) * 8);
    blks[i >> 2] |= 0x80 << (24 - (i & 3) * 8);
    blks[nblk * 16 - 1] = sIn.length * 8;
    return blks;
}

function rol(num, cnt) {
    return(num << cnt) | (num >>> (32 - cnt));
}

function ft(t, b, c, d) {
    if(t < 20) return(b & c) | ((~b) & d);
    if(t < 40) return b ^ c ^ d;
    if(t < 60) return(b & c) | (b & d) | (c & d);
    return b ^ c ^ d;
}

function kt(t) {
    return(t < 20) ? 1518500249 : (t < 40) ? 1859775393 :
        (t < 60) ? -1894007588 : -899497514;
}

function SHA1(sIn) {
    let x = AlignSHA1(sIn);
    let w = new Array(80);
    let a = 1732584193;
    let b = -271733879;
    let c = -1732584194;
    let d = 271733878;
    let e = -1009589776;
    for(let i = 0; i < x.length; i += 16) {
        let olda = a;
        let oldb = b;
        let oldc = c;
        let oldd = d;
        let olde = e;
        for(let j = 0; j < 80; j++) {
            if(j < 16) w[j] = x[i + j];
            else w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
            t = add(add(rol(a, 5), ft(j, b, c, d)), add(add(e, w[j]), kt(j)));
            e = d;
            d = c;
            c = rol(b, 30);
            b = a;
            a = t;
        }
        a = add(a, olda);
        b = add(b, oldb);
        c = add(c, oldc);
        d = add(d, oldd);
        e = add(e, olde);
    }
    SHA1Value = SHA1hex(a) + SHA1hex(b) + SHA1hex(c) + SHA1hex(d) + SHA1hex(e);
    return SHA1Value;
} 