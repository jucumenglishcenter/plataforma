/* Bloque N · Encuesta de satisfacción — UI (modal bloqueante, corta) */
const { useState: svUseState } = React;

function SurveyModal({ student, onDone }) {
  const [satisfaction, setSat] = svUseState(0);
  const [recommend, setRec] = svUseState('');
  const [cont, setCont] = svUseState('');
  const [suggestion, setSug] = svUseState('');
  const [err, setErr] = svUseState('');

  const submit = () => {
    if (!satisfaction) { setErr('Cuéntanos qué tan conforme estás (1 a 5).'); return; }
    if (!recommend) { setErr('¿Nos recomendarías? Elige una opción.'); return; }
    if (!cont) { setErr('¿Piensas seguir estudiando con nosotros?'); return; }
    window.JUCUM_SURVEY.submitSurvey(student, { satisfaction, recommend, continue_plan: cont, suggestion: suggestion.trim() });
    onDone();
  };

  const Face = ({ n, emoji, label }) => (
    <button type="button" onClick={()=>setSat(n)} style={{flex:1, padding:'10px 4px', border:'2px solid '+(satisfaction===n?'#1F3A8A':'#E5E1D6'), background:satisfaction===n?'#EEF2FB':'#fff', borderRadius:12, cursor:'pointer'}}>
      <div style={{fontSize:26}}>{emoji}</div>
      <div style={{fontSize:10.5, fontWeight:700, color:satisfaction===n?'#1F3A8A':'#888', marginTop:2}}>{label}</div>
    </button>
  );
  const Pick = ({ val, set, cur, children }) => (
    <button type="button" onClick={()=>set(val)} className={`preset ${cur===val?'on':''}`}>{children}</button>
  );

  return (
    <div className="modal-backdrop" style={{zIndex:9999, background:'rgba(13,27,90,0.55)'}}>
      <div className="modal settings-modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">💬 Tu opinión cuenta (1 min)</div>
        </div>
        <div className="modal-body">
          <div className="settings-hint" style={{marginBottom:14}}>
            Queremos mejorar para ti. Responde estas preguntitas rápidas — <b>al terminar ganas +60 XP</b> para tu Top. 🎉
          </div>
          {err && <div className="err" style={{marginBottom:12}}>⚠ {err}</div>}

          <div className="settings-block">
            <div className="settings-label">¿Qué tan conforme estás con el programa?</div>
            <div style={{display:'flex', gap:6, marginTop:6}}>
              <Face n={1} emoji="😞" label="Nada" />
              <Face n={2} emoji="😕" label="Poco" />
              <Face n={3} emoji="😐" label="Normal" />
              <Face n={4} emoji="🙂" label="Bien" />
              <Face n={5} emoji="🤩" label="Excelente" />
            </div>
          </div>

          <div className="settings-block">
            <div className="settings-label">¿Nos recomendarías a un amigo o familiar?</div>
            <div className="preset-row">
              <Pick val="si" set={setRec} cur={recommend}>👍 Sí</Pick>
              <Pick val="tal_vez" set={setRec} cur={recommend}>🤔 Tal vez</Pick>
              <Pick val="no" set={setRec} cur={recommend}>👎 No</Pick>
            </div>
          </div>

          <div className="settings-block">
            <div className="settings-label">¿Piensas seguir estudiando con nosotros?</div>
            <div className="preset-row">
              <Pick val="si" set={setCont} cur={cont}>💚 Sí, claro</Pick>
              <Pick val="no_se" set={setCont} cur={cont}>😐 No estoy seguro</Pick>
              <Pick val="no" set={setCont} cur={cont}>💔 Estoy pensando dejarlo</Pick>
            </div>
          </div>

          <div className="settings-block">
            <div className="settings-label">¿Algo que mejorar o una idea? (opcional)</div>
            <textarea className="eval-textarea" rows={2} value={suggestion} onChange={e=>setSug(e.target.value)} placeholder="Cuéntanos con confianza…" />
          </div>

          <div className="modal-actions" style={{justifyContent:'center'}}>
            <button className="btn-save" onClick={submit} style={{minWidth:220}}>Enviar y ganar +60 XP 🎉</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SurveyModal });
