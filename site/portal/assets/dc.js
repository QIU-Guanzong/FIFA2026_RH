/* wcpredict — Dixon-Coles score-matrix engine (pure JS, no deps) */
(function () {
  function poisson(k, lambda) {
    let f = 1;
    for (let i = 2; i <= k; i++) f *= i;
    return Math.exp(-lambda) * Math.pow(lambda, k) / f;
  }
  // Dixon-Coles low-score correction τ
  function tau(x, y, lh, la, rho) {
    if (x === 0 && y === 0) return 1 - lh * la * rho;
    if (x === 0 && y === 1) return 1 + lh * rho;
    if (x === 1 && y === 0) return 1 + la * rho;
    if (x === 1 && y === 1) return 1 - rho;
    return 1;
  }
  // returns { m: matrix[H][A], max } for goals 0..N
  function computeDC(lh, la, rho, N = 6) {
    if (rho == null) rho = (window.WC_PARAMS && window.WC_PARAMS.rho != null) ? window.WC_PARAMS.rho : -0.06;
    const m = [];
    let total = 0;
    for (let x = 0; x <= N; x++) {
      m[x] = [];
      for (let y = 0; y <= N; y++) {
        const p = tau(x, y, lh, la, rho) * poisson(x, lh) * poisson(y, la);
        m[x][y] = p;
        total += p;
      }
    }
    let max = 0;
    for (let x = 0; x <= N; x++) for (let y = 0; y <= N; y++) { m[x][y] /= total; if (m[x][y] > max) max = m[x][y]; }
    return { m, max, N };
  }
  // derive markets from matrix
  function deriveMarkets(m, N) {
    let home = 0, draw = 0, away = 0, over = 0, under = 0, btts = 0;
    const scores = [];
    for (let x = 0; x <= N; x++) for (let y = 0; y <= N; y++) {
      const p = m[x][y];
      if (x > y) home += p; else if (x === y) draw += p; else away += p;
      if (x + y >= 3) over += p; else under += p;
      if (x >= 1 && y >= 1) btts += p;
      scores.push({ x, y, p });
    }
    scores.sort((a, b) => b.p - a.p);
    return { home, draw, away, over, under, btts, top: scores.slice(0, 6) };
  }
  window.computeDC = computeDC;
  window.deriveMarkets = deriveMarkets;
})();

// match fixtures: λ derived from Elo prior; market = devigged implied probs (Pinnacle-style)
window.WC_MATCHES = window.WC_MATCHES || [
  { id: 'esp-eng', stage: '半决赛', home: '西班牙', away: '英格兰', he: 'Spain', ae: 'England', lh: 1.58, la: 1.02,
    market: { home: 0.50, draw: 0.27, away: 0.23, over: 0.49, btts: 0.52 } },
  { id: 'arg-bra', stage: '1/4 决赛', home: '阿根廷', away: '巴西', he: 'Argentina', ae: 'Brazil', lh: 1.34, la: 1.18,
    market: { home: 0.42, draw: 0.28, away: 0.30, over: 0.51, btts: 0.55 } },
  { id: 'fra-esp', stage: '决赛', home: '法国', away: '西班牙', he: 'France', ae: 'Spain', lh: 1.22, la: 1.30,
    market: { home: 0.36, draw: 0.28, away: 0.36, over: 0.50, btts: 0.54 } },
  { id: 'bra-fra', stage: '1/4 决赛', home: '巴西', away: '法国', he: 'Brazil', ae: 'France', lh: 1.16, la: 1.28,
    market: { home: 0.35, draw: 0.29, away: 0.36, over: 0.52, btts: 0.56 } },
];
