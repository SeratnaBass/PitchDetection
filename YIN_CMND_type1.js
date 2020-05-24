// 高速フーリエ変換
class DFT {

    static swap(v, a, b) {
        let ar = v[a + 0];
        let ai = v[a + 1];
        v[a + 0] = v[b + 0];
        v[a + 1] = v[b + 1];
        v[b + 0] = ar;
        v[b + 1] = ai;
    }

    static swapElements(n, v) {
        let n2 = n + 2;
        let nh = n >>> 1;

        for (let i = 0, j = 0; i < n; i += 4) {
            DFT.swap(v, i + n, j + 2);
            if (i < j) {
                DFT.swap(v, i + n2, j + n2);
                DFT.swap(v, i, j);
            }

            for (let k = nh; (j ^= k) < k; k >>= 1) {
            }
        }
    }

    static scaleElements(n, v, s, off = 0) {
        for (let i = 0; i < n; ++i) {
            v[off + i] /= s;
        }
    }

    static fft(n, v, inv = false) {
        let rad = (inv ? 2.0 : -2.0) * Math.PI / n;
        let nd = n << 1;

        for (let m = nd, mh; 2 <= (mh = m >>> 1); m = mh) {
            for (let i = 0; i < mh; i += 2) {
                let rd = rad * (i >> 1);
                let cs = Math.cos(rd), sn = Math.sin(rd);

                for (let j = i; j < nd; j += m) {
                    let k = j + mh;
                    let ar = v[j + 0], ai = v[j + 1];
                    let br = v[k + 0], bi = v[k + 1];

                    v[j + 0] = ar + br;
                    v[j + 1] = ai + bi;

                    let xr = ar - br;
                    let xi = ai - bi;
                    v[k + 0] = xr * cs - xi * sn;
                    v[k + 1] = xr * sn + xi * cs;
                }
            }
            rad *= 2;
        }

        DFT.swapElements(n, v);

        if (inv) {
            DFT.scaleElements(nd, v, n);
        }
    }
}

const start = document.querySelector('#start');
const stop = document.querySelector('#stop');


navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {

    const audioCtx = new AudioContext();
    const sourceNode = audioCtx.createMediaStreamSource(stream);
    const analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 4096;
    sourceNode.connect(analyserNode);

    let freq = 1024;

    function pitchDetection() {
        const array = new Float32Array(analyserNode.fftSize / 2);
        analyserNode.getFloatTimeDomainData(array);

        // 窓関数を掛ける
        for(var i = 0; i < array.length; i++){
            if(10 * array[i] < -0.5 + 0.54 - 0.46 * Math.cos(2 * Math.PI * i / array.length)) array[i] = 0;
        }

        // フーリエ変換の処理を施すため、実数、虚数の順で交互に並んだ配列を作る
        let data = [];
        for(var i = 0; i < array.length; i++){
            data.push(array[i]);
            data.push(0);
        }

        // フーリエ変換
        DFT.fft(data.length / 2, data);

        // 実数、虚数の順で交互に並んでいる変換後の配列からパワースペクトル配列を作る
        let powerSpectle = [];
        for(var i = 0; i < data.length; i += 2) powerSpectle.push( Math.sqrt(data[i] * data[i] + data[i+1] * data[i+1]) );

        // 弱い周波数成分を除去することでノイズ抑制
        for(var i = 0; i < powerSpectle.length; i++){
            if(powerSpectle[i] <= 4) powerSpectle[i] = 0;
        }

        // フーリエ逆変換の処理のため実数、虚数の順で並んだ配列を作る
        let autocorrelation = [];
        for(var i = 0; i < powerSpectle.length; i++){
            autocorrelation.push(powerSpectle[i]);
            autocorrelation.push(0);
        }

        // フーリエ逆変換、これが自己相関関数(ACF)となる
        DFT.fft(autocorrelation.length / 2, autocorrelation, true);

        // 逆変換後の配列は実数、虚数の順で並んでいるので、実数部分のみを取り出す
        let autocorrelationReal = [];
        for(var i = 0; i < autocorrelation.length; i += 2) autocorrelationReal.push(autocorrelation[i]);

        // ACFからDFを計算
        // CMND計算のためDFの累積和(Cumulative Sum)を計算
        let DF = [];
        let DFC = [];
        DFC[0] = 0;
        for(var i = 0; i < autocorrelationReal.length; i++){
            DF[i] = autocorrelationReal[0] - autocorrelationReal[i];
            DFC[i + 1] = DFC[i] + DF[i];
        }

        // CMND計算
        let CMND = [];
        CMND[0] = 1;
        for(var i = 0; i < DF.length; i++){
            CMND[i] = DF[i] * i / DFC[i];
        }

        // 閾値以下の局所最小点のインデックスを探索
        const threshold = 0.3;
        
        // 隣り合う配列要素との差を取り、さらにその積を取る
        // 積が負の点が、ピーク点
        let d = [];
        let dd = [];
        for(var i = 1; i < CMND.length; i++){
            d.push(CMND[i] - CMND[i - 1]);
        }
        for(var i = 0; i < CMND.length - 1; i++){
            dd.push(d[i] * d[i + 1]);
        }

        // ピーク点の中でthreshold以下のものをpeak配列に格納
        let T = 0;
        let peak = [];
        for(var i = 0; i < dd.length; i++){
            if(dd[i] <= 0 && CMND[i] <= threshold){
                peak.push(i);
            }
        }
        if(peak[0] != null) T = peak[0];

        // サンプリング周波数をTで割って周期すなわちピッチを算出
        if(T != 0){
            freq = 44100 / T;
            freq = Math.floor(freq * 1000) / 1000; //　小数点以下3桁までで切り捨て
            const freqArea = document.getElementById('freqArea');
            freqArea.innerHTML = "Pitch is ... ";
            freqArea.innerHTML += freq;
            freqArea.innerHTML += "[Hz]";
            console.log(freq);
        }

        requestAnimationFrame(pitchDetection);
    }

    pitchDetection();

    setInterval( function() {
            freq = 1024;
    }, 2000);

}).catch(error => {
    console.log(error);
});