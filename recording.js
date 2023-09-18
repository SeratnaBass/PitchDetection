import {pitchCalc} from './pitchCalc.js';

const start = document.querySelector('#start');
const stop = document.querySelector('#stop');

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

    let freq = 1024;

    start.onclick = function() {
        start.disabled = true;
        stop.disabled = false;
        pitchCalc();
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