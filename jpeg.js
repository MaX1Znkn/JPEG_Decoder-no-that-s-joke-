function encodeImageFileAsURL(input) { // открытие изображения
    var file = input.files[0];
    var reader = new FileReader();
    reader.onloadend = function() {
        var raw = atob(reader.result.slice(23)); // удаление из строки лишних символов
        base64toHEX(raw);
    }
    reader.readAsDataURL(file);
}

function base64toHEX(hex) { // переход из base64 в hex
    var HEX = '';
    for ( i = 0; i < hex.length; i++ ) {
        var _hex = hex.charCodeAt(i).toString(16)
        HEX += ( _hex.length==2 ? _hex : '0'+_hex );
    }
    HEX = HEX.toUpperCase();
    console.log(HEX);

    findFFC4(HEX);
    }

function findFFC4(HEX) { // поиск FFC4
    var count = 0;
    let mapDC0 = new Map();
    let mapAC0 = new Map();
    var numofMatrix;


    for (var i = 0; i < HEX.length; i++) { // Поиск таблиц Хаффмана
        if (count > 1) break;
        if( (HEX[i] == 'F') && (HEX[i+1] == 'F') && (HEX[i+2] == 'C') && (HEX[i+3] == '4') ) {
            var number = parseInt( ( '0x' + HEX[i+4] + HEX[i+5] + HEX[i+6] + HEX[i+7] ), 16 ) * 2; // количество символов в массиве FFC4
        
            if (count == 0) {
                var DC0;
                DC0 = HEX.slice( i+10, i+number+4 );
                console.log(DC0);
                Huffman(DC0, mapDC0);
            }
            if (count == 1) {
                var AC0;
                AC0 = HEX.slice( i+10, i+number+4 );
                console.log(AC0);
                Huffman(AC0, mapAC0);
            }
            count++;
        }
    }

    for (var i = 0; i < HEX.length; i++) { // Поиск размеров изображения
        if( (HEX[i] == 'F') && (HEX[i+1] == 'F') && (HEX[i+2] == 'C') && (HEX[i+3] == '0') ) {
            var height = parseInt( ( '0x' + HEX[i+10] + HEX[i+11] + HEX[i+12] + HEX[i+13] ), 16 );
            while ( height % 8 != 0 ) {
                height++;
            }
            var width = parseInt( ( '0x' + HEX[i+14] + HEX[i+15] + HEX[i+16] + HEX[i+17] ), 16 );
            while ( width % 8 != 0 ) {
                width++;
            }
            numofMatrix = (height*width)/64;
            break;
        }
    }

    out: for (var i = 0; i < HEX.length; i++) { // Start of Scan
        if( (HEX[i] == 'F') && (HEX[i+1] == 'F') && (HEX[i+2] == 'D') && (HEX[i+3] == 'A') ) {
            var number = parseInt( ( '0x' + HEX[i+6] + HEX[i+7] ), 16 ) * 2; //кол-во символов в заголовке
            var headSOS = HEX.slice( i+10, i+number+4 ); // заголовок
            var SOS = HEX.slice( i+number+4, -4 ) // SOS часть
            var BinSOS = '';
            for (let k = 0; k < SOS.length; k++) { // Цикл перевода из HEX в BIN
                if ( (SOS[k] == 'F') && (SOS[k+1] == 'F') && (SOS[k+2] == '0') && (SOS[k+3] == '0') && k % 2 == 0 ) {
                    var x = (parseInt('0x' + SOS[k], 16)).toString(2);
                    var y = (parseInt('0x' + SOS[k+1], 16)).toString(2);
                    BinSOS = BinSOS + x + y;
                    k = k + 3;
                    continue;
                }
                var x = (parseInt('0x' + SOS[k], 16)).toString(2);
                while ( x.length < 4 )
                {
                    x = '0' + x;
                }
                BinSOS = BinSOS + x;
            }
            console.log(BinSOS);


            I = Object();
            I.index = 0;
            I.countofMatrix = 0; // Счётчик матриц

            D = Object();
            D.prevdc = 0; // Предыдущий DC-коэффициент

            SumofMatrix = Object();
            SumofMatrix.sum = [];

            while ( I.countofMatrix < numofMatrix ) {
                SOS1( mapDC0, mapAC0, BinSOS, I, D, numofMatrix, SumofMatrix);
            }
            download(SumofMatrix);
            break out;
        }
    }
}


function SOS1( DC, AC, BinSOS, I, D, numofMatrix, SumofMatrix ) {
    var matrix = [];
    outouter: while ( I.countofMatrix < numofMatrix && matrix.length < 64) {

        var NumofSym = 1; // кол-во символов для поиска числа для таблицы хаффмана
        // поиск DC-коэффициента
        if (matrix.length == 0) {
            outer: for (var d = 0; d < DC.size; d++) {
                var dc = BinSOS.substr(I.index, NumofSym);
                matrix[0] = 0;
                    if ( DC.has(dc) ) {
                        if ( DC.get(dc) == '00' ) {
                            matrix[0] = 0;
                            I.index = I.index + NumofSym;
                            NumofSym = 1;
                            break outer;
                        }
                        var NewNum = parseInt(DC.get(dc), 16); // Кол-во бит для DC-коэффициента
                        if ( BinSOS[I.index+NumofSym] == '1') {
                            matrix[0] = parseInt( BinSOS.substr(I.index+NumofSym, NewNum), 2 );
                        }
                        else {
                            matrix[0] = parseInt( BinSOS.substr(I.index+NumofSym, NewNum), 2 ) - 2**NewNum + 1;
                        }
                        I.index = I.index + NumofSym + NewNum;
                        NumofSym = 1;
                        break outer;
                    }
                
                NumofSym++;
                if ( I.index + NumofSym > BinSOS.length ) {
                    I.index = I.index + NumofSym;
                    return;
                }
            }
            NumofSym = 1;
            matrix[0] = matrix[0] + D.prevdc;
            D.prevdc = matrix[0];
        }
        // поиск AC-коэффициента
        outer1: for (var a = 0; a < AC.size; a++) {
            
            var ac = BinSOS.substr(I.index, NumofSym);
                if ( AC.has(ac) ) {
                    if ( AC.get(ac) == '00' ) {
                        I.index = I.index + NumofSym;
                        while ( matrix.length < 64 ) {
                            matrix.push(0);
                            NumofSym = 1;
                        }
                        
                        break outouter;
                    }
                    var zeros = AC.get(ac);
                    zeros = parseInt(zeros[0], 16);
                    for (var k = 0; k < zeros; k++) {
                        matrix.push(0);
                    }
                    var NewNum = AC.get(ac);
                    NewNum = parseInt( NewNum[1], 16 );
                    if ( NewNum != 0 ) {
                        if ( BinSOS[I.index+NumofSym] == '1') {
                            matrix.push( parseInt( BinSOS.substr(I.index+NumofSym, NewNum), 2 ) );
                        }
                        else {
                            matrix.push( parseInt( BinSOS.substr(I.index+NumofSym, NewNum), 2 ) - 2**NewNum + 1);
                        }
                    }
                    else {
                        matrix.push(0);
                    }
                    I.index = I.index + NewNum + NumofSym;
                    NumofSym = 1;
                    break outer1;
                }

            NumofSym++;
            if ( I.index + NumofSym > BinSOS.length ) {
                while ( matrix.length < 64) {
                    matrix.push(0);
                }
                I.index = I.index + NumofSym;
                return;
            }
        }
    }

    if ( isFinite(matrix[0]) ) {

        I.countofMatrix++;

        var template = [0, 1, 5, 6, 14, 15, 27, 28,
                        2, 4, 7, 13, 16, 26, 29, 42,
                        3, 8, 12, 17, 25, 30, 41, 43,
                        9, 11, 18, 24, 31, 40, 44, 53,
                        10, 19, 23, 32, 39, 45, 52, 54,
                        20, 22, 33, 38, 46, 51, 55, 60,
                        21, 34, 37, 47, 50, 56, 59, 61,
                        35, 36, 48, 49, 57, 58, 62, 63]

        var newMatrix = [];

        for ( t = 0; t < template.length; t++ ) {
        newMatrix[t] = matrix[template[t]];
        }

        SumofMatrix.sum = SumofMatrix.sum.concat(newMatrix);

    }

}

function download (blob) {
    var data = new Int16Array(SumofMatrix.sum);
        var blob = new Blob( [data], {type: 'application/octet-stream'});
    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'out.bin';
    link.click();
}

function Huffman(arr, map) { // декодер

    otherstr = arr.slice ( 32 );
    otherarr = [];
    for (var i = 0, j = 0; i < otherstr.length; i++, j+=2) {
        otherarr[i] = otherstr[j] + otherstr[j+1];
    }

    arr = arr.slice ( 0, 32 )
    var huff = [];
    var i = 0, sym = 1, x = 0; // i - эл. исходного массива, x - эл. нового массива, sym - кол-во символов в числе
    for (; i < arr.length; i+=2 , sym++, x++) { // проход по исходному массиву и по новому массиву
        if ( arr[i] == '0' && arr[i + 1] == '0' ) continue;
        var num = parseInt( ( '0x' + arr[i] + arr[i+1] ), 16 ); // num - кол-во чисел одинаковой длины
        for (var freq = 0; freq < num; freq++, x++) { // проход по частотам
            huff[x] = '0';
            if ( sym > 1) {
                for ( var f = 0; f < sym-1; f++) {
                    huff[x] = huff[x] + '0';
                }
            }
        }
    }

    var huff1 = [];
    for (var i = 0; i < huff.length; i++) {
        if ( isFinite(huff[i]) ) huff1.push(huff[i]); //создаём массив без пустых (empty) мест
    }

    for ( var i = 0; i < huff1.length - 1; i++ ) {
        var len = huff1[i+1].length;
        for ( var j = 0; j <= i; j++ ) {
            while ( startsWith(huff1[j], huff1[i+1]) ) {
                huff1[i+1] = parseInt( huff1[i+1], 2 ) + 1;
                huff1[i+1] = huff1[i+1].toString(2);
                var len2 = huff1[i+1].length;
                var diff = len - len2;
                var l = '';
                while ( l.length != diff ) l = l + '0';
                huff1[i+1] = l + huff1[i+1];
            }
        }
    }
    makeHuffmanArray(huff1, otherarr, map);
}

function startsWith(huff1, huff2) {
    var len = huff1.length;
    var newString = huff2.slice(0, len);
    if ( huff1 == newString ) return true;
    return false;
}

function makeHuffmanArray(huff1, otherarr, map) {
    for (let i = 0; i < huff1.length; i++) {
        map.set(huff1[i], otherarr[i]);
    }
    console.log(map);
    var tret = 0;
}