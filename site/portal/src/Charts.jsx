/* global React */
// ============================================================
//  A-Stock · Reusable data-viz primitives
//  All charts are pure SVG, no external libs. Animated draw-on
//  for sparklines/areas, hover dot, no axis chrome unless asked.
//  Sized via the `width` and `height` props; default to 100% w.
// ============================================================
const { useMemo, useState } = React;

// ────────────────────────────────────────────
// utils
// ────────────────────────────────────────────
function _range(arr, key) {
  const vals = arr.map(d => typeof d === 'number' ? d : d[key]);
  return [Math.min(...vals), Math.max(...vals)];
}

function _path(points) {
  return 'M ' + points.map(p => p.join(' ')).join(' L ');
}

// ────────────────────────────────────────────
// Sparkline — single line, no axes
//   data: number[]
//   color: stroke color
//   fill: true | false — render area gradient below
//   live: true → adds a pulsing dot at the last point
// ────────────────────────────────────────────
function Sparkline({ data, color = 'var(--ink)', fill = false, live = false,
                     width = '100%', height = 36, padding = 2 }) {
  const W = 100, H = 100;
  const [lo, hi] = useMemo(() => _range(data), [data]);
  const range = hi - lo || 1;
  const step = (W - padding * 2) / (data.length - 1);
  const pts = data.map((v, i) => [
    padding + i * step,
    padding + (1 - (v - lo) / range) * (H - padding * 2),
  ]);
  const d = _path(pts);
  const area = d + ` L ${pts[pts.length-1][0]} ${H - padding} L ${padding} ${H - padding} Z`;
  const last = pts[pts.length-1];
  const gradId = `spark-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradId})`} />
        </>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth="1.4"
        strokeLinejoin="round" strokeLinecap="round"
        vectorEffect="non-scaling-stroke" />
      {live && (
        <g>
          <circle cx={last[0]} cy={last[1]} r="2.2" fill={color} />
          <circle cx={last[0]} cy={last[1]} r="2.2" fill={color} className="as-pulse-ring" />
        </g>
      )}
    </svg>
  );
}

// ────────────────────────────────────────────
// AreaChart — labeled axes optional, hoverable
// ────────────────────────────────────────────
function AreaChart({ data, color = 'var(--ink)', height = 160,
                     xLabels, yTicks = 3, padding = 8 }) {
  const W = 600, H = 200;
  const [lo, hi] = useMemo(() => _range(data), [data]);
  const range = hi - lo || 1;
  const innerW = W - padding * 2 - 30;
  const innerH = H - padding * 2 - 18;
  const step = innerW / (data.length - 1);
  const pts = data.map((v, i) => [
    padding + 30 + i * step,
    padding + (1 - (v - lo) / range) * innerH,
  ]);
  const d = _path(pts);
  const area = d + ` L ${pts[pts.length-1][0]} ${padding + innerH} L ${pts[0][0]} ${padding + innerH} Z`;
  const gradId = `ac-${Math.random().toString(36).slice(2, 8)}`;
  const ticks = Array.from({ length: yTicks }, (_, i) => lo + (range * i) / (yTicks - 1));

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* y grid */}
      {ticks.map((t, i) => {
        const y = padding + (1 - (t - lo) / range) * innerH;
        return (
          <g key={i}>
            <line x1={padding + 30} x2={W - padding} y1={y} y2={y}
              stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <text x={padding + 26} y={y + 4} textAnchor="end"
              fontSize="10" fill="var(--muted)"
              fontFamily="ui-monospace, monospace">
              {Math.round(t)}
            </text>
          </g>
        );
      })}
      <path d={area} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6"
        strokeLinejoin="round" strokeLinecap="round"
        vectorEffect="non-scaling-stroke" />
      {/* x labels */}
      {xLabels && xLabels.map((l, i) => {
        const idx = Math.round((i / (xLabels.length - 1)) * (data.length - 1));
        const x = padding + 30 + idx * step;
        return (
          <text key={i} x={x} y={H - 4} textAnchor="middle"
            fontSize="10" fill="var(--muted)" fontFamily="ui-monospace, monospace">{l}</text>
        );
      })}
    </svg>
  );
}

// ────────────────────────────────────────────
// BarChart — vertical bars, semantic colors
//   data: [{label, value, color?}]
// ────────────────────────────────────────────
function BarChart({ data, height = 140, color = 'var(--ink)' }) {
  const max = Math.max(...data.map(d => d.value)) || 1;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`,
      gap: 6, height, alignItems: 'end',
    }}>
      {data.map((d, i) => (
        <div key={i} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <div style={{
            width: '100%', maxWidth: 28,
            height: `${(d.value / max) * 90}%`,
            background: d.color || color, borderRadius: '3px 3px 0 0',
            transition: 'height 320ms var(--ease-out)',
          }} />
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'ui-monospace, monospace' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────
// HorizontalBar — single row with label and value
// ────────────────────────────────────────────
function HBar({ value, max = 100, color = 'var(--ink)', label, valueLabel, width = '100%' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width }}>
      {(label || valueLabel) && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--muted)', fontFamily: 'ui-monospace, monospace',
        }}>
          <span>{label}</span>
          <span style={{ color: 'var(--ink)' }}>{valueLabel}</span>
        </div>
      )}
      <div style={{
        height: 6, background: 'var(--bg-shade)', borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color, borderRadius: 3,
          transition: 'width 320ms var(--ease-out)',
        }} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Heatmap — grid of cells colored by intensity
//   data: [[label, value], ...]  OR  number[] + cols
//   Up = red intensity, Down = green
// ────────────────────────────────────────────
function Heatmap({ data, cols = 8, height = 160 }) {
  const max = Math.max(...data.map(d => Math.abs(typeof d === 'number' ? d : d.value)));
  const rows = Math.ceil(data.length / cols);
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 3, height,
    }}>
      {data.map((d, i) => {
        const v = typeof d === 'number' ? d : d.value;
        const label = typeof d === 'number' ? '' : d.label;
        const a = Math.min(1, Math.abs(v) / (max || 1));
        const bg = v >= 0
          ? `rgba(192, 57, 43, ${0.10 + a * 0.55})`
          : `rgba(46, 139, 87, ${0.10 + a * 0.55})`;
        const fg = a > 0.5 ? '#FFF' : 'var(--ink)';
        return (
          <div key={i} style={{
            background: bg, color: fg, borderRadius: 4,
            padding: 6, fontSize: 10, lineHeight: 1.2,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <span style={{ opacity: 0.85, fontWeight: 500 }}>{label}</span>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, textAlign: 'right' }}>
              {v > 0 ? '+' : ''}{v.toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────
// Treemap (proportional) — sector composition
//   data: [{label, value, color}]
// ────────────────────────────────────────────
function Treemap({ data, height = 180 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', width: '100%', height,
      gap: 3, alignContent: 'stretch',
    }}>
      {data.map((d, i) => {
        const share = (d.value / total) * 100;
        // Force a basic flexible flow — items grow by share
        return (
          <div key={i} style={{
            flexGrow: d.value, flexBasis: `${Math.max(20, share)}%`,
            background: d.color || 'var(--ink)', color: '#FFF',
            borderRadius: 6, padding: 10, position: 'relative',
            minHeight: 70, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.9 }}>{d.label}</span>
            <div>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 18, fontWeight: 600 }}>
                {d.display || d.value}
              </span>
              <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 6 }}>{share.toFixed(0)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────
// Candlestick — small intraday/30-day pattern
//   bars: [{o, h, l, c}]
// ────────────────────────────────────────────
function Candlestick({ bars, height = 120, width = '100%' }) {
  const W = bars.length * 8;
  const H = 100;
  const all = bars.flatMap(b => [b.h, b.l]);
  const lo = Math.min(...all), hi = Math.max(...all);
  const range = hi - lo || 1;
  const scale = v => 5 + (1 - (v - lo) / range) * (H - 10);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ display: 'block' }}>
      {bars.map((b, i) => {
        const x = i * 8 + 4;
        const up = b.c >= b.o;
        const color = up ? 'var(--up)' : 'var(--down)';
        const yH = scale(b.h), yL = scale(b.l);
        const yO = scale(b.o), yC = scale(b.c);
        const yTop = Math.min(yO, yC), bh = Math.max(1, Math.abs(yC - yO));
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={yH} y2={yL} stroke={color} strokeWidth="1"
              vectorEffect="non-scaling-stroke" />
            <rect x={x - 2.4} y={yTop} width="4.8" height={bh} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

// ────────────────────────────────────────────
// Gauge — semi-circle dial 0..100
// ────────────────────────────────────────────
function Gauge({ value, max = 100, label, sublabel, color = 'var(--ink)', size = 120 }) {
  const angle = Math.min(180, Math.max(0, (value / max) * 180));
  const r = size / 2 - 8;
  const cx = size / 2, cy = size / 2 + 4;
  const rad = (a) => ((180 - a) * Math.PI) / 180;
  const p = (a) => [cx + r * Math.cos(rad(a)), cy - r * Math.sin(rad(a))];
  const [sx, sy] = p(0), [ex, ey] = p(180), [vx, vy] = p(angle);
  const arc = (x, y, large) => `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${x} ${y}`;
  return (
    <div style={{ position: 'relative', width: size, height: size * 0.7 }}>
      <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`}>
        <path d={arc(ex, ey, 1)} fill="none" stroke="var(--bg-shade)" strokeWidth="6" strokeLinecap="round"/>
        <path d={arc(vx, vy, angle > 90 ? 1 : 0)} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 320ms var(--ease-out)' }}/>
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingTop: 12,
      }}>
        <span style={{ font: '600 22px/1 var(--mono)', color }}>{label || value}</span>
        {sublabel && <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{sublabel}</span>}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Ticker — horizontal scrolling marquee, pure CSS animation
//   items: [{name, value, pct}]
// ────────────────────────────────────────────
function MarqueeTicker({ items, speed = 50 }) {
  const dup = [...items, ...items];
  return (
    <div style={{
      overflow: 'hidden', position: 'relative',
      maskImage: 'linear-gradient(90deg, transparent, #000 24px, #000 calc(100% - 24px), transparent)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 24px, #000 calc(100% - 24px), transparent)',
    }}>
      <div style={{
        display: 'inline-flex', gap: 24, whiteSpace: 'nowrap',
        animation: `as-marquee ${speed}s linear infinite`,
      }}>
        {dup.map((it, i) => {
          const up = it.pct >= 0;
          return (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'baseline', gap: 6,
              fontVariantNumeric: 'tabular-nums', fontSize: 12,
            }}>
              <span style={{ color: 'var(--muted)' }}>{it.name}</span>
              <span style={{ font: 'var(--num)', color: 'var(--ink)' }}>
                {typeof it.value === 'number' ? it.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : it.value}
              </span>
              <span style={{
                font: 'var(--num)', fontSize: 11,
                color: up ? 'var(--up)' : 'var(--down)',
              }}>
                {up ? '↑' : '↓'} {Math.abs(it.pct).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
      <style>{`@keyframes as-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

// ────────────────────────────────────────────
// Distribution dots — 1-d swarm style
//   data: number[] in [-N, +N], distributed over a strip
// ────────────────────────────────────────────
function DotStrip({ data, height = 48, color = 'var(--ink)' }) {
  const [lo, hi] = _range(data);
  const range = Math.max(Math.abs(lo), Math.abs(hi)) || 1;
  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: '50%',
        height: 1, background: 'var(--hairline)',
      }}/>
      {data.map((v, i) => {
        const left = ((v + range) / (range * 2)) * 100;
        const c = v >= 0 ? 'var(--up)' : 'var(--down)';
        return (
          <span key={i} style={{
            position: 'absolute',
            left: `${left}%`, top: '50%',
            transform: `translate(-50%, -50%) translateY(${(i % 5 - 2) * 4}px)`,
            width: 6, height: 6, borderRadius: '50%',
            background: c, opacity: 0.7,
          }} />
        );
      })}
    </div>
  );
}

Object.assign(window, {
  Sparkline, AreaChart, BarChart, HBar, Heatmap, Treemap,
  Candlestick, Gauge, MarqueeTicker, DotStrip,
});

// ────────────────────────────────────────────
// RadarChart — multi-axis comparison (策略 / 因子)
//   axes: string[]
//   series: [{name, color, values: number[] in 0..1}]
// ────────────────────────────────────────────
function RadarChart({ axes, series, size = 260 }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 30;
  const n = axes.length;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i, v) => [cx + Math.cos(angle(i)) * r * v, cy + Math.sin(angle(i)) * r * v];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {/* grid rings */}
      {[0.25, 0.5, 0.75, 1].map((s, i) => (
        <polygon key={i}
          points={axes.map((_, j) => point(j, s).join(',')).join(' ')}
          fill="none" stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
      {/* axis lines */}
      {axes.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
          stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
      })}
      {/* series */}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => point(i, v));
        return (
          <g key={si}>
            <polygon points={pts.map(p => p.join(',')).join(' ')}
              fill={s.color} fillOpacity="0.14" stroke={s.color} strokeWidth="1.6"
              strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {pts.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r="2.4" fill={s.color} />
            ))}
          </g>
        );
      })}
      {/* labels */}
      {axes.map((a, i) => {
        const [x, y] = point(i, 1.18);
        return (
          <text key={i} x={x} y={y} textAnchor="middle"
            dominantBaseline="middle" fontSize="11"
            fill="var(--muted-2)" fontFamily="var(--sans)">{a}</text>
        );
      })}
    </svg>
  );
}

// ────────────────────────────────────────────
// CorrelationMatrix — N×N heatmap for factor / signal corr
//   labels: string[] (rows == cols)
//   data: number[][] in -1..+1
// ────────────────────────────────────────────
function CorrelationMatrix({ labels, data, cell = 28 }) {
  const n = labels.length;
  return (
    <div style={{ display: 'inline-block' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `60px repeat(${n}, ${cell}px)`,
        gridAutoRows: `${cell}px`,
        gap: 0,
      }}>
        {/* corner */}
        <div />
        {/* col labels */}
        {labels.map((l, i) => (
          <div key={`c${i}`} style={{
            fontSize: 10, color: 'var(--muted-2)',
            textAlign: 'center', alignSelf: 'end',
            transform: 'rotate(-45deg) translate(2px, -8px)',
            transformOrigin: 'bottom left',
            whiteSpace: 'nowrap', overflow: 'visible',
          }}>{l}</div>
        ))}
        {/* rows */}
        {data.map((row, ri) => [
          <div key={`r${ri}`} style={{
            fontSize: 10, color: 'var(--muted-2)', paddingRight: 8,
            textAlign: 'right', alignSelf: 'center',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{labels[ri]}</div>,
          ...row.map((v, ci) => {
            const a = Math.min(1, Math.abs(v));
            const bg = v >= 0
              ? `rgba(192, 57, 43, ${0.08 + a * 0.6})`
              : `rgba(46, 139, 87, ${0.08 + a * 0.6})`;
            const fg = a > 0.5 ? '#FFF' : 'var(--ink)';
            return (
              <div key={`${ri}-${ci}`} style={{
                background: bg, color: fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                font: '600 9px/1 var(--mono)', borderRadius: 2,
                outline: '1px solid var(--surface)',
              }}>{v.toFixed(2)}</div>
            );
          }),
        ])}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Sankey — simplified 3-column flow with rounded bands
//   left:  [{name, value}]
//   right: [{name, value}]
//   flows: [{from, to, value}]  -- names match left/right
// ────────────────────────────────────────────
function Sankey({ left, right, flows, height = 260, width = 540, colorL = 'var(--p-tlq)', colorR = 'var(--p-qwj)' }) {
  const lTotal = left.reduce((s, n) => s + n.value, 0);
  const rTotal = right.reduce((s, n) => s + n.value, 0);
  const yScale = height - 20;

  let lY = 10, lPos = {};
  left.forEach(n => { const h = (n.value / lTotal) * yScale; lPos[n.name] = { y: lY, h }; lY += h + 6; });
  let rY = 10, rPos = {};
  right.forEach(n => { const h = (n.value / rTotal) * yScale; rPos[n.name] = { y: rY, h }; rY += h + 6; });

  // for each flow, track ribbon offset within source/target band
  const lUsed = Object.fromEntries(left.map(n => [n.name, 0]));
  const rUsed = Object.fromEntries(right.map(n => [n.name, 0]));

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}>
      {/* flow ribbons */}
      {flows.map((f, i) => {
        const src = lPos[f.from], tgt = rPos[f.to];
        if (!src || !tgt) return null;
        const sh = (f.value / lTotal) * yScale;
        const th = (f.value / rTotal) * yScale;
        const y1 = src.y + lUsed[f.from];
        const y2 = src.y + lUsed[f.from] + sh;
        const y3 = tgt.y + rUsed[f.to];
        const y4 = tgt.y + rUsed[f.to] + th;
        lUsed[f.from] += sh;
        rUsed[f.to] += th;
        const xL = 100, xR = width - 100;
        const mid = (xL + xR) / 2;
        const path = `M ${xL} ${y1} C ${mid} ${y1} ${mid} ${y3} ${xR} ${y3}
                      L ${xR} ${y4} C ${mid} ${y4} ${mid} ${y2} ${xL} ${y2} Z`;
        return <path key={i} d={path} fill="var(--ink)" fillOpacity="0.12" />;
      })}
      {/* left nodes */}
      {left.map(n => (
        <g key={n.name}>
          <rect x={92} y={lPos[n.name].y} width={8} height={lPos[n.name].h}
            fill={colorL} rx="2" />
          <text x={86} y={lPos[n.name].y + lPos[n.name].h / 2 + 4} textAnchor="end"
            fontSize="11" fill="var(--ink)" fontFamily="var(--sans)">{n.name}</text>
          <text x={86} y={lPos[n.name].y + lPos[n.name].h / 2 + 18} textAnchor="end"
            fontSize="10" fill="var(--muted)" fontFamily="var(--mono)">{n.value}</text>
        </g>
      ))}
      {/* right nodes */}
      {right.map(n => (
        <g key={n.name}>
          <rect x={width - 100} y={rPos[n.name].y} width={8} height={rPos[n.name].h}
            fill={colorR} rx="2" />
          <text x={width - 86} y={rPos[n.name].y + rPos[n.name].h / 2 + 4}
            fontSize="11" fill="var(--ink)" fontFamily="var(--sans)">{n.name}</text>
          <text x={width - 86} y={rPos[n.name].y + rPos[n.name].h / 2 + 18}
            fontSize="10" fill="var(--muted)" fontFamily="var(--mono)">{n.value}</text>
        </g>
      ))}
    </svg>
  );
}

// ────────────────────────────────────────────
// ScatterPlot — IC vs IR, alpha vs MDD, etc.
//   data: [{x, y, label, color, size}]
// ────────────────────────────────────────────
function ScatterPlot({ data, xLabel, yLabel, height = 220, width = '100%' }) {
  const W = 500, H = 280, pad = 30;
  const xs = data.map(d => d.x), ys = data.map(d => d.y);
  const xMin = Math.min(...xs, 0), xMax = Math.max(...xs);
  const yMin = Math.min(...ys, 0), yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1, yRange = yMax - yMin || 1;
  const sx = (x) => pad + ((x - xMin) / xRange) * (W - pad * 2);
  const sy = (y) => H - pad - ((y - yMin) / yRange) * (H - pad * 2);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}>
      {/* grid */}
      {[0.25, 0.5, 0.75].map((f, i) => (
        <g key={i}>
          <line x1={pad} x2={W-pad} y1={pad + f*(H-pad*2)} y2={pad + f*(H-pad*2)}
            stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1={pad + f*(W-pad*2)} x2={pad + f*(W-pad*2)} y1={pad} y2={H-pad}
            stroke="var(--hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </g>
      ))}
      {/* zero lines if visible */}
      {xMin < 0 && xMax > 0 && (
        <line x1={sx(0)} x2={sx(0)} y1={pad} y2={H-pad} stroke="var(--muted)" strokeWidth="1" strokeDasharray="2 4" />
      )}
      {yMin < 0 && yMax > 0 && (
        <line x1={pad} x2={W-pad} y1={sy(0)} y2={sy(0)} stroke="var(--muted)" strokeWidth="1" strokeDasharray="2 4" />
      )}
      {/* dots */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={sx(d.x)} cy={sy(d.y)} r={d.size || 5}
            fill={d.color || 'var(--ink)'} fillOpacity="0.7"
            stroke={d.color || 'var(--ink)'} strokeWidth="1.5" />
          {d.label && (
            <text x={sx(d.x) + 8} y={sy(d.y) + 4}
              fontSize="10" fill="var(--ink)" fontFamily="var(--sans)">{d.label}</text>
          )}
        </g>
      ))}
      {/* axis labels */}
      {xLabel && (
        <text x={W/2} y={H-6} textAnchor="middle"
          fontSize="10" fill="var(--muted-2)" fontFamily="var(--sans)">{xLabel}</text>
      )}
      {yLabel && (
        <text x={10} y={H/2} textAnchor="middle" transform={`rotate(-90, 10, ${H/2})`}
          fontSize="10" fill="var(--muted-2)" fontFamily="var(--sans)">{yLabel}</text>
      )}
    </svg>
  );
}

// ────────────────────────────────────────────
// FactorMatrix — categorical × time heat strip
//   rows: ['MA','RSI','MACD',...] · cols: ['1月','2月',...]
//   data: rows×cols matrix in -1..+1 (color signal)
// ────────────────────────────────────────────
function FactorMatrix({ rows, cols, data, cellW = 32, cellH = 24 }) {
  return (
    <div style={{ display: 'inline-block' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `90px repeat(${cols.length}, ${cellW}px)`,
        gridAutoRows: `${cellH}px`,
        gap: 1,
      }}>
        <div />
        {cols.map((c, i) => (
          <div key={`c${i}`} style={{
            fontSize: 10, color: 'var(--muted-2)', textAlign: 'center',
            alignSelf: 'center',
          }}>{c}</div>
        ))}
        {rows.map((r, ri) => [
          <div key={`r${ri}`} style={{
            fontSize: 11, color: 'var(--ink)', paddingRight: 10,
            textAlign: 'right', alignSelf: 'center', fontWeight: 500,
          }}>{r}</div>,
          ...data[ri].map((v, ci) => {
            const a = Math.min(1, Math.abs(v));
            const bg = v >= 0
              ? `rgba(192, 57, 43, ${0.10 + a * 0.55})`
              : `rgba(46, 139, 87, ${0.10 + a * 0.55})`;
            const fg = a > 0.55 ? '#FFF' : 'var(--ink)';
            return (
              <div key={`${ri}-${ci}`} style={{
                background: bg, color: fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                font: '600 9px/1 var(--mono)', borderRadius: 2,
              }}>{v > 0 ? '+' : ''}{v.toFixed(2)}</div>
            );
          }),
        ])}
      </div>
    </div>
  );
}

Object.assign(window, {
  RadarChart, CorrelationMatrix, Sankey, ScatterPlot, FactorMatrix,
});
