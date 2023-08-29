import DFT from './DFT.js';

const start = document.querySelector('#start');
const stop = document.querySelector('#stop');
// const canvas = document.querySelector('#canvas');
// const drawContext = canvas.getContext('2d');
// const cw = canvas.width;
// const ch = canvas.height;

const scale = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {

    const audioContext = new AudioContext();
    const sourceNode = audioContext.createMediaStreamSource(stream);
    const analyserNode = audioContext.createAnalyser();
    const gainNode = audioContext.createGain();
    const biquadFilterNode = audioContext.createBiquadFilter();
    sourceNode.connect(gainNode);
    gainNode.connect(biquadFilterNode);
    biquadFilterNode.connect(analyserNode);

    analyserNode.fftSize = 16384;
    gainNode.gain.value = 0.6;
    // biquadFilterNode.type = 'lowpass';
    // biquadFilterNode.frequency.value = 1500; // ギターなどのチューニングに用いる場合のフィルタ

    let freq = 1024;

    function pitchDetection() {
        const array = new Float32Array(analyserNode.fftSize / 2);
        analyserNode.getFloatTimeDomainData(array);

        // 窓関数を掛ける
        for(var i = 0; i < array.length; i++){
            if(10 * array[i] < -0.5 + 0.54 - 0.46 * Math.cos(2 * Math.PI * i / array.length)) array[i] = 0;
        }

        // フーリエ変換の処理を施すため、実数、虚数の順で並んだ配列を作る
        let data = [];
        for(var i = 0; i < array.length; i++){
            data.push(array[i]);
            data.push(0);
        }

        // フーリエ変換
        DFT.fft(data.length / 2, data);

        // 実数、虚数の順で並んでいる変換後の配列からパワースペクトル配列を作る
        let powerSpectle = [];
        // for(var i = 0; i < data.length; i += 2) powerSpectle.push( Math.sqrt(data[i] * data[i] + data[i+1] * data[i+1]) );
        for(var i = 0; i < data.length; i += 2) powerSpectle.push( (data[i] * data[i] + data[i+1] * data[i+1]) );


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
        
        // フーリエ逆変換、これが自己相関関数(ACF)
        DFT.fft(autocorrelation.length / 2, autocorrelation, true);

        // 逆変換後の配列は実数、虚数の順で並んでいるので、実数部分のみを取り出す
        let autocorrelationReal = [];
        for(var i = 0; i < autocorrelation.length; i += 2) autocorrelationReal.push(autocorrelation[i]);
        
        // 自己相関関数を正規化し、NSDFの配列を作る
        let NSDF = new Float32Array(autocorrelationReal.length);
        for(i = 0; i < autocorrelationReal.length; i++){
            if( autocorrelationReal[0] ){
                NSDF[i] = autocorrelationReal[i] / autocorrelationReal[0];
            }else NSDF[i] = 0;
        }

        // ピーク検出のため、最初の0クロス点を探す
        let negativeCross = 0;
        for(var i = 0; i < NSDF.length; i++){
            if(NSDF[i] <= 0){
                negativeCross = i;
                break;
            }
        }
        // 正規化した自己相関関数の最大値を探す
        let NSDFmax = 0;
        let tMax = 0;
        for(var i = negativeCross; i < NSDF.length / 2 ; i++){
            if(NSDF[i] > NSDFmax) tMax = i;
            NSDFmax = Math.max(NSDFmax, NSDF[i]);
        }

        // 隣り合う配列要素との差を取り、さらにその積を取る
        // 積が負の点が、ピーク点
        let d = [];
        let dd = [];
        for(var i = 1; i < NSDF.length; i++){
            d.push(NSDF[i] - NSDF[i - 1]);
        }
        for(var i = 0; i < NSDF.length - 1; i++){
            dd.push(d[i] * d[i + 1]);
        }

        // ピーク点の中で、正規化した自己相関関数の最大値の8割以上の大きさのものをピーク配列に格納
        // ピーク配列のうち、最初のものが入力信号の周期に相当
        let T = 0;
        let peak = [];
        for(var i = negativeCross; i < dd.length; i++){
            if(dd[i] <= 0 && NSDF[i] >= NSDFmax * 0.9){
                peak.push(i);
            }
        }
        T = peak[0];

        // Parabolic Interpolationで補間
        T = T + (NSDF[T-1] - NSDF[T+1]) / (2 * (NSDF[T-1] + NSDF[T+1] - 2 * NSDF[T]));

        // サンプリング周波数を周期で割って周波数すなわちピッチを算出
        // 倍音の検出を防ぐため、表示するピッチは検出したピッチのうち最小のものを採用(※1)
        if(T > 0 && !isNaN(T)){
            freq = Math.min(freq, 48000 / T);
            // console.log(freq);
            const freqArea = document.getElementById('freqArea');
            freqArea.innerHTML = Math.floor(freq * 1000) / 1000; // 小数点第3位までで切り捨てて表示

            // 計算したピッチから音名を算出
            let noteNum = 69 + 12 * Math.log2(freq / 440);
            let higher = 0;
            let lower = 0;
            if(noteNum - Math.floor(noteNum) < Math.ceil(noteNum) - noteNum){
                higher = Math.round( ( Math.ceil(noteNum) - noteNum ) * 10 );
            }
            else lower = Math.round( ( noteNum - Math.floor(noteNum) ) * 10 );
            let keyName = scale[Math.round(noteNum) % 12];
            const scaleArea = document.getElementById('scaleArea');
            const lowerArea = document.getElementById('lowerArea');
            const higherArea = document.getElementById('higherArea');
            lowerArea.innerHTML = null;
            higherArea.innerHTML = null;
            scaleArea.innerHTML = keyName;
            for(var i = 0; i < lower; i++) lowerArea.innerHTML += '|';
            for(var i = 0; i < higher; i++) higherArea.innerHTML += '|';
            // console.log(noteNum);
        }

        // 継続的にピッチ検出を行う
        // stopボタンが押されるまで処理を継続する
        if(stop.disabled == false){
            requestAnimationFrame(pitchDetection);
        }
    }

    start.onclick = function() {
        start.disabled = true;
        stop.disabled = false;
        pitchDetection();
    }
    stop.onclick = function() {
        start.disabled = false;
        stop.disabled = true;
        freqArea.innerHTML = null;
        scaleArea.innerHTML = 'Pitch';
        lowerArea.innerHTML = null;
        higherArea.innerHTML = null;
    }

    // (※1)のコードのため、定期的に周波数をリセットしないと継続的にピッチ検出機能を使えない
    setInterval(function() {
        freq = 1024;
    }, 2000);

}).catch(error => {
    console.log(error);
});