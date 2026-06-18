/* Bloque O · "Mi evolución" — UI
 * Gráfica de líneas (curva que sube) + tarjetas inicio→hoy + hitos del viaje.
 * Pensado para que el alumno VEA su progreso real en el tiempo.
 */
const { useState: evUseState } = React;

const EVO_COMPS = [
  { key:'overall',   label:'General',     icon:'⭐', color:'#1F3A8A' },
  { key:'listening', label:'Auditiva',    icon:'🎧', color:'#2A6FDB' },
  { key:'reading',   label:'Lectora',     icon:'📖', color:'#1F8A5B' },
  { key:'grammar',   label:'Gramática',   icon:'📝', color:'#D97757' },
  { key:'speaking',  label:'Speaking',    icon:'🗣️', color:'#8E44AD' },
];

function EvoLineChart({ series, active }) {
  const W = 680, H = 240, padL = 34, padR = 16, padT = 16, padB = 28;
  const data = series[active] || [];
  const n = data.length;
  const xFor = (i) => padL + (n <= 1 ? 0 : (i/(n-1)) * (W - padL - padR));
  const yFor = (v) => padT + (1 - v/100) * (H - padT - padB);
  const comp = EVO_COMPS.find(c => c.key === active) || EVO_COMPS[0];

  if (n === 0) return <div className="empty-state" style={{padding:'30px'}}>Aún no hay datos suficientes para dibujar tu curva. ¡Practica unos días y verás tu progreso aquí!</div>;

  const linePath = data.map((p,i) => `${i===0?'M':'L'} ${xFor(i).toFixed(1)} ${yFor(p.pct).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${xFor(n-1).toFixed(1)} ${yFor(0).toFixed(1)} L ${xFor(0).toFixed(1)} ${yFor(0).toFixed(1)} Z`;
  const first = data[0].pct, last = data[n-1].pct, delta = last - first;

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6}}>
        <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:600, fontSize:15, color:comp.color}}>{comp.icon} {comp.label}</div>
        <div style={{fontSize:13, fontWeight:800, color: delta>=0?'#2E7D32':'#C62828'}}>
          {delta>=0?'▲ +':'▼ '}{delta}% desde que empezaste
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%', height:'auto', display:'block'}}>
        <defs>
          <linearGradient id={`evofill-${active}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={comp.color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={comp.color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0,25,50,75,100].map(g => (
          <g key={g}>
            <line x1={padL} y1={yFor(g)} x2={W-padR} y2={yFor(g)} stroke={g===75?'#C9D4F0':'#EEEBE2'} strokeWidth={g===75?1.5:1} strokeDasharray={g===75?'4 3':''} />
            <text x={padL-6} y={yFor(g)+3} textAnchor="end" fontSize="9" fill="#AAA" fontFamily="Nunito,sans-serif">{g}</text>
          </g>
        ))}
        <path d={areaPath} fill={`url(#evofill-${active})`} />
        <path d={linePath} fill="none" stroke={comp.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((p,i) => (
          <g key={i}>
            <circle cx={xFor(i)} cy={yFor(p.pct)} r={i===n-1?4.5:3} fill="#fff" stroke={comp.color} strokeWidth="2" />
            {(n<=8 || i===0 || i===n-1 || i%2===0) && <text x={xFor(i)} y={H-10} textAnchor="middle" fontSize="9" fill="#999" fontFamily="Nunito,sans-serif">{p.label}</text>}
          </g>
        ))}
        {/* etiqueta del último punto */}
        <text x={xFor(n-1)} y={yFor(last)-9} textAnchor="middle" fontSize="11" fontWeight="800" fill={comp.color} fontFamily="Nunito,sans-serif">{last}%</text>
      </svg>
      <div style={{textAlign:'center', fontSize:11, color:'#999', marginTop:2}}>La línea punteada azul es el 75% (meta para tu examen).</div>
    </div>
  );
}

function BeforeNowCard({ comp, bn }) {
  if (!bn) return null;
  const up = bn.delta >= 0;
  const color = up ? '#2E7D32' : '#C62828';
  // sparkline mini
  const W=70,H=24, n=bn.spark.length;
  const pts = bn.spark.map((v,i)=>`${(n<=1?0:(i/(n-1))*W).toFixed(1)},${(H-(v/100)*H).toFixed(1)}`).join(' ');
  return (
    <div style={{display:'flex', alignItems:'center', gap:12, padding:'12px 14px', border:'1.5px solid #ECE9E0', borderRadius:12, background:'#fff'}}>
      <div style={{fontSize:22}}>{comp.icon}</div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontWeight:800, fontSize:13, color:'var(--text)'}}>{comp.label}</div>
        <div style={{fontSize:12.5, color:'var(--text-soft)', marginTop:2}}>
          Empezaste en <b>{bn.first}%</b> → hoy <b style={{color}}>{bn.now}%</b>
        </div>
      </div>
      <svg width={W} height={H} style={{flexShrink:0}}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>
      <div style={{fontFamily:"'Fredoka',sans-serif", fontWeight:700, fontSize:17, color, minWidth:54, textAlign:'right'}}>{up?'+':''}{bn.delta}<span style={{fontSize:11}}> pts</span></div>
    </div>
  );
}

function MyEvolution({ student }) {
  const EVO = window.JUCUM_EVO;
  const { series } = EVO.weeklySeries(student);
  const bn = EVO.beforeNow(student);
  const miles = EVO.milestones(student);
  const avail = EVO_COMPS.filter(c => (series[c.key]||[]).length > 0);
  const [active, setActive] = evUseState('overall');
  const activeKey = (series[active]||[]).length ? active : (avail[0]?.key || 'overall');

  return (
    <div style={{display:'flex', flexDirection:'column', gap:16}}>
      <div className="scard">
        <div className="sec-head">
          <div className="sec-title">📈 Mi evolución</div>
          <span className="sec-meta">Tu progreso real, semana a semana</span>
        </div>
        <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:10}}>
          {avail.map(c => (
            <button key={c.key} onClick={()=>setActive(c.key)} className={`preset ${activeKey===c.key?'on':''}`}>{c.icon} {c.label}</button>
          ))}
        </div>
        <EvoLineChart series={series} active={activeKey} />
      </div>

      <div className="scard">
        <div className="sec-head"><div className="sec-title">📊 De dónde partí → dónde estoy</div></div>
        <div style={{display:'grid', gap:10}}>
          {EVO_COMPS.filter(c=>c.key!=='overall' && bn[c.key]).map(c => <BeforeNowCard key={c.key} comp={c} bn={bn[c.key]} />)}
          {EVO_COMPS.filter(c=>c.key!=='overall').every(c=>!bn[c.key]) && <div className="empty-state">Tus comparativas aparecerán cuando tengas más práctica registrada.</div>}
        </div>
      </div>

      <div className="scard">
        <div className="sec-head"><div className="sec-title">🏁 Hitos de tu viaje</div></div>
        {miles.length === 0 ? <div className="empty-state">Tus logros irán apareciendo aquí. ¡El primero está cerca!</div> : (
          <div style={{position:'relative', paddingLeft:24}}>
            <div style={{position:'absolute', left:7, top:6, bottom:6, width:2, background:'#E6E3DA'}}></div>
            {miles.map((m,i) => (
              <div key={i} style={{position:'relative', marginBottom:14}}>
                <div style={{position:'absolute', left:-24, top:0, width:16, height:16, borderRadius:'50%', background:'#fff', border:'2px solid #1F3A8A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9}}></div>
                <div style={{display:'flex', alignItems:'baseline', gap:8}}>
                  <span style={{fontSize:16}}>{m.icon}</span>
                  <div>
                    <div style={{fontWeight:800, fontSize:13.5, color:'var(--text)'}}>{m.title}</div>
                    <div style={{fontSize:12, color:'var(--text-soft)'}}>{m.body} · <span style={{fontWeight:700}}>{m.date.toLocaleDateString('es-PE',{day:'numeric',month:'long'})}</span></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MyEvolution, EvoLineChart, BeforeNowCard });
