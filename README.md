# PitchDetectionについて

webブラウザ上で、PC付属のマイクまたはPCに接続されたマイクに音声を入力し、その音声データにMPMアルゴリズムに基づいた処理を施すことで、入力音声の周波数(ピッチ)を検出するプログラムです。
Startボタンを押すことでピッチ検出を開始し、検出されたピッチ、またそのピッチに相当する音名をを画面上に表示します。Stopボタンで停止します。

## MPMアルゴリズム
<https://www.researchgate.net/profile/Geoff_Wyvill/publication/230554927_A_smarter_way_to_find_pitch/links/561a12f108aea80367211169/A-smarter-way-to-find-pitch.pdf>    
こちらの論文を参考にしました。

大まかには次の手順でピッチを求めます

1.フーリエ変換し、パワースペクトル関数を求める  
2.フーリエ逆変換、これが自己相関関数(ACF)   
3.ACFを正規化、これがnormalized square difference function(NSDF)    
4.いくつかあるNSDFのピークの中で、閾値(NSDFの最大値の8割)以上のものが最初に現れるインデックスが音声の周期。ただし、このNSDFはインデックスが0のとき1をとるから、このピークの探索はNSDFの最初の0クロス点(符号が変化する点)から行う。  
5.サンプリング周波数/求めた周期 でピッチ検出    