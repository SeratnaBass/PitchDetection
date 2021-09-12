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
