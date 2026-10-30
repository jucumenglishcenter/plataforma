/* 👥 GROUP-WS-V1 (16-oct-2026) · Página del grupo en UNA pantalla (aprobada en
 * “Propuesta - Vista del grupo v2 (lista + ficha).html”).
 *  · Encabezado bajo: nivel · horario · ▶ en clase · 4 números (filtran la lista) · ⚙️ · ⋯ (Reporte PDF,
 *    Ver como alumno, Finalizar grupo, ⏸ avance cerrado, vista anterior).
 *  · Fila de botones → VENTANAS: 📦 Módulos (GroupModulesQuick) · 🧠 Práctica de hoy · 🎯 Qué reforzar ·
 *    ❌ Lo que más falla (Neuro: NeuroGroupCard only="gf"; otros niveles: actividades con nota más baja) ·
 *    🏆 Campeones (TeacherChampions).
 *  · Lista (Necesitan atención / Van bien, con el motivo) + ficha rápida con pestañas Resumen · Práctica ·
 *    Módulos · Historial. ↑ ↓ pasan de alumno. ⏸, 🗑 y 👥 Cambiar de grupo (GwMoveModal: users.group_id + level,
 *    misma cuenta; primero la nube, si falla no cambia nada) viven en la ficha rápida (no en la fila).
 * Solo LEE datos (mismas fuentes que la tabla anterior). Lo anterior sigue como GroupDetailClassic
 * (⋯ → “Vista anterior”, se recuerda en localStorage jucum_group_view_v1). Prefijo gw* (scope global). */
const GW_CSS = `
.gw-bd{position:absolute;top:-7px;right:-7px;min-width:21px;height:21px;border-radius:11px;background:#E65100;color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;padding:0 6px;box-shadow:0 0 0 2px #F5F3EC}
.rk-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.rk-kp div{background:#fff;border:1px solid #E6E1D3;border-radius:12px;padding:9px 12px;display:flex;flex-direction:column;gap:1px}
.rk-kp b{font-family:'Fredoka',sans-serif;font-weight:600;font-size:22px;color:#0D1B5A;line-height:1.1}
.rk-kp span{font-size:11.5px;font-weight:800;color:#6B6252}
.rk-pend{background:#FFF6DD;border:1.5px solid #F0C66B;border-radius:14px;padding:11px 13px;display:flex;flex-direction:column;gap:8px}
.rk-pend h4{margin:0;font-family:'Fredoka',sans-serif;font-weight:600;font-size:15px;color:#7A4A00}
.rk-pp{display:flex;flex-wrap:wrap;gap:6px}
.rk-pp button{background:#fff;border:1px solid #F0D58A;border-radius:12px;padding:4px 10px;font-size:12px;font-weight:800;color:#5A3A00;white-space:nowrap}
.rk-pend small{font-size:11.5px;font-weight:700;color:#7A5A20}
.rk-calm{background:#E9F7EC;border:1.5px solid #B7E1C1;border-radius:14px;padding:10px 13px;font-size:13px;font-weight:800;color:#1D4D25}
.rk-seg{display:flex;background:#EAE6DB;border-radius:10px;padding:3px;gap:2px;align-self:flex-start}
.rk-seg button{border:0;background:none;padding:6px 12px;border-radius:8px;font-weight:800;font-size:12px;color:#6B6252;white-space:nowrap}
.rk-seg button.on{background:#fff;color:#1F3A8A;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.rk-ls{background:#fff;border:1px solid #E6E1D3;border-radius:14px;padding:4px 12px}
.rk-r,.rk-hd{display:grid;grid-template-columns:minmax(140px,1.2fr) 52px minmax(0,1.7fr) 74px;gap:10px;align-items:center}
.rk-r{padding:8px 0;border-bottom:1px solid #F2EEE5;font-size:13px;border-left:0;border-right:0;border-top:0;background:none;width:100%;text-align:left;color:inherit}
.rk-r:last-child{border-bottom:0}.rk-r:hover{background:#FBFAF6}
.rk-r .nm{display:flex;flex-direction:column;min-width:0}.rk-r .nm b{font-weight:800;color:#1E2433;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rk-r .nm small{font-size:11px;font-weight:700;color:#8a7f6a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rk-r .fx{font-family:'Fredoka',sans-serif;font-weight:600;font-size:16px;color:#C25400;white-space:nowrap}.rk-r .fx.z{color:#A9A08E}
.rk-r .tm{font-size:12px;font-weight:900;text-align:right;white-space:nowrap}
.rk-st{display:flex;gap:3px}
.rk-st i{flex:1;min-width:0;height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:10.5px;background:#F1F3F8}
.rk-st i.on{background:#FFB74D}.rk-st i.shield{background:#90CAF9}.rk-st i.free{background:#E8F5E9}.rk-st i.broke{background:#EF9A9A}.rk-st i.pending{background:#FFF3C4;outline:1.5px dashed #F0B44A}
.rk-hd{font-size:10.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#8a7f6a;padding:8px 0 4px;border-bottom:1px solid #EEE9DD}.rk-hd span:last-child{text-align:right}
.rk-lg{display:flex;gap:10px;flex-wrap:wrap;font-size:11.5px;font-weight:800;color:#6B6252}.rk-lg span{display:flex;align-items:center;gap:4px}.rk-lg i{width:12px;height:12px;border-radius:3px;display:inline-block}
@media(max-width:620px){.rk-r,.rk-hd{grid-template-columns:minmax(0,1fr) 48px 70px}.rk-st,.rk-hd .sx{display:none}}
.gw,.gw *,.gw-ov,.gw-ov *{box-sizing:border-box}
.gw{display:flex;flex-direction:column;gap:12px;font-family:'Nunito',sans-serif;color:#2A2A2A}
.gw button{font-family:inherit;cursor:pointer}
.gw-hd{background:#fff;border:1px solid #E6E1D3;border-top:5px solid var(--gw-lv,#F9A825);border-radius:16px;padding:12px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.gw-hl{flex:1;min-width:240px;display:flex;flex-direction:column;gap:3px}
.gw-cr{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;font-weight:800;color:#5A6B86}
.gw-lvp{white-space:nowrap;border-radius:7px;padding:1px 8px;font-size:11px;font-weight:900;letter-spacing:.04em;background:var(--gw-lvbg,#FFF4D6);color:var(--gw-lvd,#8A4B00);border:1px solid var(--gw-lv,#F9A825)}
.gw-cls{white-space:nowrap;display:inline-flex;align-items:center;gap:5px;background:#1F3A8A;color:#fff;border-radius:20px;padding:2px 10px 2px 3px;font-size:11.5px;font-weight:800;max-width:100%}
.gw-cls i{font-style:normal;background:#fff;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;flex:none}
.gw-t{font-family:'Fredoka',sans-serif;font-weight:600;font-size:20px;line-height:1.2;color:#2A2A2A;margin:0}
.gw-st{display:flex;gap:2px 14px;flex-wrap:wrap;font-size:12.5px;font-weight:700;color:#6B6252}
.gw-st>*{white-space:nowrap}.gw-st button{border:0;background:none;padding:0;font:inherit;color:inherit}
.gw-st button:hover{color:#1F3A8A;text-decoration:underline}
.gw-st b{color:#0D1B5A;font-weight:900}
.gw-hr{display:flex;gap:8px;align-items:center}
.gw-bt{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1.5px solid #E0DACB;background:#fff;border-radius:10px;padding:7px 12px;font-weight:800;font-size:12.5px;color:#33415C;white-space:nowrap}
.gw-bt:hover{border-color:#B9B09A;background:#FBFAF6}
.gw-bt.sm{padding:5px 10px;font-size:12px}
.gw-bt.ic{width:32px;padding:6px 0;font-size:15px;line-height:1}
.gw-bt.pr{background:#1F3A8A;border-color:#1F3A8A;color:#fff}.gw-bt.pr:hover{background:#16306f}
.gw-bt.warn{background:#FFF3E0;border-color:#FFCC80;color:#8A4B00}
.gw-lk{border:0;background:none;font-weight:800;font-size:12.5px;color:#6B6252;padding:5px 8px;border-radius:8px;white-space:nowrap}
.gw-lk:hover{background:#F0EDE5}.gw-lk.dang{color:#B71C1C}
.gw-more{position:relative}
.gw-menu{position:absolute;right:0;top:calc(100% + 6px);background:#fff;border:1px solid #E6E1D3;border-radius:12px;box-shadow:0 10px 24px rgba(0,0,0,.15);padding:6px;display:flex;flex-direction:column;min-width:230px;z-index:40}
.gw-menu button{border:0;background:none;text-align:left;padding:8px 10px;border-radius:8px;font-weight:800;font-size:13px;color:#33415C}
.gw-menu button:hover{background:#F4F1EA}
.gw-menu hr{border:0;border-top:1px solid #EEE9DD;margin:4px 2px}
.gw-tb{display:flex;gap:8px;flex-wrap:wrap}
.gw-tw{display:flex;align-items:center;gap:9px;border:1.5px solid #E6E1D3;background:#fff;border-radius:12px;padding:6px 12px 6px 7px;text-align:left;min-width:0;position:relative}
.gw-tw{flex:none;max-width:100%}
.gw-wb>.scard>.sec-head .sec-title{display:none}
.gw-wb>.scard span,.gw-wb>.scard button{white-space:nowrap}
.gw-tw:hover{border-color:#1F3A8A;box-shadow:0 2px 8px rgba(31,58,138,.12)}
.gw-ti{width:30px;height:30px;border-radius:9px;background:#F4F1EA;display:flex;align-items:center;justify-content:center;font-size:15px;flex:none}
.gw-tw b{display:block;font-size:12.5px;font-weight:900;color:#1E2433;white-space:nowrap}
.gw-tw>span:last-child{min-width:max-content}.gw-tw small{display:block;font-size:11.5px;font-weight:700;color:#6B6252;white-space:nowrap}
.gw-sp{display:grid;grid-template-columns:330px minmax(0,1fr);gap:12px;height:clamp(520px,calc(100vh - 300px),860px)}
.gw-cl,.gw-cp{background:#fff;border:1px solid #E6E1D3;border-radius:16px;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.gw-clh{padding:10px 10px 8px;display:flex;flex-direction:column;gap:8px;border-bottom:1px solid #EEE9DD}
.gw-row{display:flex;gap:6px}
.gw-in{flex:1;min-width:0;border:1.5px solid #E0DACB;border-radius:10px;padding:7px 11px;font:inherit;font-size:13px;font-weight:700;background:#fff;color:#2A2A2A;outline:none}
.gw-in:focus{border-color:#1F3A8A}
.gw-sel{border:1.5px solid #E0DACB;border-radius:10px;padding:6px 8px;font:inherit;font-size:12px;font-weight:800;background:#fff;color:#33415C;max-width:132px}
.gw-seg{display:flex;background:#F1EEE7;border-radius:10px;padding:3px;gap:2px}
.gw-seg button{flex:1;border:0;background:none;padding:5px 4px;border-radius:8px;font-weight:800;font-size:11.5px;color:#6B6252;white-space:nowrap;display:flex;flex-direction:column;align-items:center;line-height:1.2}
.gw-seg button i{font-style:normal;font-size:13px;font-weight:900;color:#33415C}
.gw-seg button.on{background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.12);color:#1F3A8A}.gw-seg button.on i{color:#1F3A8A}
.gw-ls{flex:1;min-height:0;overflow:auto;position:relative;padding:0 6px 8px}
.gw-gh{position:sticky;top:0;z-index:2;background:#fff;font-size:10.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;padding:9px 6px 5px;display:flex;align-items:center;gap:6px}
.gw-gh.r{color:#C62828}.gw-gh.g{color:#2E7D32}
.gw-it{display:grid;grid-template-columns:9px minmax(0,1fr) auto;gap:10px;align-items:center;text-align:left;border:0;background:none;border-radius:10px;padding:7px 9px;width:100%;color:inherit}
.gw-it:hover{background:#F6F4EE}
.gw-it.on{background:#1F3A8A}.gw-it.on .gw-nm b{color:#fff}.gw-it.on .gw-nm small{color:#DDE4F7!important}.gw-it.on .gw-pc{color:#fff}.gw-it.on .gw-pc small{color:#C9D4F0}
.gw-dot{width:9px;height:9px;border-radius:50%;flex:none;display:inline-block}
.gw-dot.g{background:#2EA84B}.gw-dot.a{background:#F5A623}.gw-dot.r{background:#E53935}
.gw-nm{display:flex;flex-direction:column;min-width:0}
.gw-nm b{font-size:13px;font-weight:800;color:#1E2433;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gw-nm small{font-size:11.5px;font-weight:700;color:#8a7f6a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gw-nm small.r{color:#C62828}.gw-nm small.a{color:#A15C00}
.gw-pc{font-size:12.5px;font-weight:900;color:#33415C;text-align:right;display:flex;flex-direction:column;line-height:1.2}
.gw-pc small{font-size:10px;font-weight:800;color:#2E7D32}
.gw-ft{font-size:11px;font-weight:700;color:#8a7f6a;text-align:center;padding:6px;border-top:1px solid #EEE9DD;display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.gw-ft button{border:0;background:none;font:inherit;font-weight:800;color:#4A5468;text-decoration:underline;padding:0}
.gw-av{width:44px;height:44px;border-radius:50%;color:#fff;font-family:'Fredoka',sans-serif;font-weight:600;font-size:16px;display:inline-flex;align-items:center;justify-content:center;flex:none}
.gw-ph{padding:14px 16px 10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.gw-ph .gw-nm{flex:1;min-width:170px}
.gw-ph .gw-nm b{font-family:'Fredoka',sans-serif;font-weight:600;font-size:19px;white-space:normal}
.gw-pill{display:inline-flex;align-items:center;gap:6px;border-radius:20px;padding:3px 10px;font-size:12px;font-weight:900;white-space:nowrap}
.gw-pill.g{background:#E6F5E9;color:#1B5E20}.gw-pill.a{background:#FFF4E0;color:#8A4B00}.gw-pill.r{background:#FDECEA;color:#B71C1C}
.gw-nav{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#8a7f6a}
.gw-tabs{display:flex;gap:2px;padding:0 12px;border-bottom:2px solid #EEE9DD;overflow-x:auto;overflow-y:hidden}
.gw-tab{border:0;background:none;padding:9px 12px;font-weight:800;font-size:13px;color:#6B6252;border-bottom:3px solid transparent;margin-bottom:-2px;white-space:nowrap;display:inline-flex;gap:6px;align-items:center}
.gw-tab:hover{color:#1E2433}.gw-tab.on{color:#1F3A8A;border-bottom-color:#1F3A8A}
.gw-tab i{font-style:normal;font-size:10.5px;font-weight:900;background:#FDECEA;color:#B71C1C;border-radius:10px;padding:0 6px}
.gw-pb{flex:1;min-height:0;overflow:auto;padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.gw-pf{border-top:1px solid #EEE9DD;padding:10px 16px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;background:#FBFAF6}
.gw-sg{display:flex;align-items:center;gap:10px;border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.5;flex-wrap:wrap}
.gw-sg>div{flex:1;min-width:200px;text-wrap:pretty}
.gw-sg.r{background:#FFF5F4;color:#6B1F1A;border:1px solid #F5C2BE}.gw-sg.a{background:#FFF9EC;color:#5A3E00;border:1px solid #F6D79A}.gw-sg.g{background:#F4FBF5;color:#1B4D20;border:1px solid #BFE3C6}
.gw-tl{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.gw-tl>div{background:#FAF8F2;border:1px solid #EEE9DD;border-radius:12px;padding:9px 11px;display:flex;flex-direction:column;gap:2px}
.gw-tl span{font-size:10.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#8a7f6a}
.gw-tl b{font-family:'Fredoka',sans-serif;font-weight:600;font-size:21px;color:#1E2433;line-height:1.1}
.gw-tl small{font-size:11.5px;font-weight:700;color:#8a7f6a}
.gw-sub{font-size:10.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#8a7f6a;line-height:1.5}
.gw-sub em{margin-left:8px;font-style:normal;text-transform:none;letter-spacing:0;font-size:12px;font-weight:700;color:#6B6252}
.gw-d14{display:grid;grid-template-columns:repeat(14,minmax(0,1fr));gap:4px;max-width:520px}
.gw-d14 div{display:flex;flex-direction:column;align-items:center;gap:3px}
.gw-d14 i{width:100%;aspect-ratio:1;border-radius:6px;background:#EFECE4}
.gw-d14 i.m1{background:#C9EBD0}.gw-d14 i.m2{background:#86D296}.gw-d14 i.m3{background:#2EA84B}
.gw-d14 span{font-size:10px;font-weight:800;color:#9C9282}
.gw-d14 .t i{box-shadow:0 0 0 2px #1F3A8A}.gw-d14 .t span{color:#1F3A8A}
.gw-lg{display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;font-weight:800;color:#6B6252;align-items:center}.gw-lg>span{display:inline-flex;align-items:center;gap:5px}
.gw-lg b{width:12px;height:12px;border-radius:4px;display:inline-block}
.gw-lr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid #F2EEE5;font-size:13px;font-weight:800;color:#33415C}
.gw-lr:last-child{border-bottom:0}
.gw-lr small{display:block;font-size:11.5px;font-weight:700;color:#8a7f6a}
.gw-sc{font-size:11.5px;font-weight:900;border-radius:20px;padding:2px 9px;white-space:nowrap}
.gw-sc.hi{background:#E6F5E9;color:#1B5E20}.gw-sc.md{background:#FFF4E0;color:#8A4B00}.gw-sc.lo{background:#FDECEA;color:#B71C1C}.gw-sc.nn{background:#F1EEE7;color:#6B6252}
.gw-mr{display:grid;grid-template-columns:26px minmax(0,1fr) minmax(70px,150px) 46px;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid #F2EEE5;font-size:13px;font-weight:800;color:#33415C}
.gw-mr:last-child{border-bottom:0}.gw-mr small{display:block;font-size:11px;font-weight:700;color:#8a7f6a}.gw-mr.off{color:#A9A08E}.gw-mr>b{text-align:right;font-size:12.5px}
.gw-bar{height:8px;border-radius:5px;background:#EEEAE0;overflow:hidden;display:block}.gw-bar u{display:block;height:100%;border-radius:5px}
.gw-note{font-size:12.5px;font-weight:700;color:#6B6252;background:#FAF8F2;border:1px dashed #E0DACB;border-radius:10px;padding:9px 12px;line-height:1.45}
.gw-hl2{font-size:13.5px;line-height:1.55;color:#1E2433;background:#F3F6FD;border:1px solid #DCE3F0;border-radius:12px;padding:10px 12px;text-wrap:pretty}
.gw-ov{position:fixed;inset:0;background:rgba(20,24,40,.42);display:flex;align-items:center;justify-content:center;z-index:1200;padding:24px}
.gw-win{background:#F5F3EC;border-radius:18px;width:min(760px,100%);max-height:100%;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.3);overflow:hidden}
.gw-wh{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid #E6E1D3;background:#fff}
.gw-wh .t{flex:1;min-width:0;display:flex;flex-direction:column}
.gw-wh h3{font-family:'Fredoka',sans-serif;font-weight:600;font-size:18px;color:#1E2433;margin:0}
.gw-wh small{font-size:12px;font-weight:700;color:#8a7f6a}
.gw-wx{width:32px;height:32px;border-radius:50%;border:0;background:#F3F1EC;font-size:15px;color:#555;flex:none}
.gw-wb{flex:1;min-height:0;overflow:auto;overflow-x:hidden;padding:14px 18px 18px;display:flex;flex-direction:column;gap:10px}
.gw-wb>.scard,.gw-wb>.nt{margin:0!important}
.gw-card{background:#fff;border:1px solid #E6E1D3;border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.gw-dn{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:800}
.gw-dn button{width:28px;height:28px;border-radius:50%;border:1.5px solid #E0DACB;background:#fff;font-weight:900;color:#33415C}
.gw-dn button:disabled{opacity:.4;cursor:default}
.gw-hw{display:grid;grid-template-columns:minmax(0,200px) minmax(0,1fr) 110px;gap:12px;align-items:center;border:0;border-bottom:1px solid #F2EEE5;background:none;text-align:left;padding:8px;width:100%;border-radius:10px;color:inherit}
.gw-hw:last-child{border-bottom:0}.gw-hw:hover{background:#F3F6FD}
.gw-cks{display:flex;flex-wrap:wrap;gap:4px}
.gw-ck{display:inline-flex;align-items:center;font-size:11.5px;font-weight:800;border-radius:14px;padding:2px 8px;white-space:nowrap}
.gw-ck.d{background:#E6F5E9;color:#1B5E20}.gw-ck.lo{background:#FDECEA;color:#B71C1C}.gw-ck.n{background:#F1EEE7;color:#6B6252}
.gw-mt{white-space:nowrap;display:flex;flex-direction:column;gap:4px;font-size:11.5px;font-weight:900;color:#33415C;text-align:right}.gw-mt .gw-bar{height:6px}
.gw-chips{display:flex;flex-wrap:wrap;gap:5px}
.gw-chips button{white-space:nowrap;font-size:11.5px;font-weight:800;background:#fff;border:1px solid #E6E1D3;border-radius:14px;padding:2px 9px;color:#4A4336}
.gw-chips button.r{border-color:#F5C2BE;color:#B71C1C;background:#FFF8F7}.gw-chips button:hover{border-color:#1F3A8A}
.gw-cmp{display:grid;grid-template-columns:170px minmax(0,1fr) 44px minmax(0,170px);gap:10px;align-items:center;font-size:13px;font-weight:800;color:#33415C;padding:7px 8px;border-radius:10px}
.gw-cmp.w{background:#FFF5F4;color:#B71C1C}.gw-cmp small{font-size:11.5px;font-weight:700;color:#8a7f6a}
.gw-empty{padding:20px;text-align:center;color:#999;font-weight:700}
@media(max-width:860px){.gw-sp{grid-template-columns:minmax(0,1fr);height:auto}.gw-cl{height:380px}.gw-cp{min-height:540px}}
@media(max-width:600px){.gw-hw{grid-template-columns:minmax(0,1fr) 84px}.gw-hw .gw-cks{grid-column:1/-1}.gw-cmp{grid-template-columns:minmax(0,1fr) 44px}.gw-cmp .gw-bar,.gw-cmp small{grid-column:1/-1}.gw-ov{padding:10px}}
`;
(function injectGwCSS() { if (typeof document === 'undefined' || document.getElementById('gw-css')) return; const st = document.createElement('style'); st.id = 'gw-css'; st.textContent = GW_CSS; document.head.appendChild(st); })();

const GW_K = { r: 0, a: 1, g: 2 };
const GW_DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const GW_NOGRADE = ['story', 'summary', 'quizlet', 'dialog'];
const gwDay = (t) => new Date((t == null ? Date.now() : t) - 5 * 3600e3).toISOString().slice(0, 10);   // día PERÚ
const gwEntryDay = (e) => { const t = e && Date.parse(e.date || ''); return t ? gwDay(t) : ''; };
const gwIni = (n) => String(n || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('');
const gwShort = (n) => String(n || '').split(' ').slice(0, 2).join(' ');
const gwFm = (m) => { m = Math.round(m || 0); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'; };
const gwCol = (v) => v >= 85 ? '#2EA84B' : v >= 70 ? '#F2A33A' : '#E06B5B';
const gwScC = (v, thr) => v >= Math.max(85, thr) ? 'hi' : v >= thr ? 'md' : 'lo';
const gwDLbl = (iso) => { const t = gwDay(), y = gwDay(Date.now() - 86400e3); if (iso === t) return 'hoy'; if (iso === y) return 'ayer'; return new Date(iso + 'T12:00:00Z').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); };
const gwSeen = (s) => s.lastSeenDays == null ? '' : s.lastSeenDays === 0 ? 'entró hoy' : s.lastSeenDays === 1 ? 'entró ayer' : 'entró hace ' + s.lastSeenDays + ' días';

function gwIndex(level) {
  const D = window.JUCUM_DATA, idx = {};
  (D.MODULE_CATALOG[level] || []).forEach(m => (m.activities || []).forEach(a => { idx[m.id + ':' + a.id] = { a, mod: m }; }));
  return idx;
}
function gwPassed(D, e, a, s) { if (!e) return false; if (a && GW_NOGRADE.includes(a.type)) return true; return D.entryPassed ? D.entryPassed(e, s.level, s.group) : true; }

function gwModel(s, sugg) {
  const D = window.JUCUM_DATA;
  const m = D.getStudentMastery(s), r = D.getStudentReadiness(s);
  const days = (D.dailyData && D.dailyData(s)) || [];
  const la = s.lastActiveDays;
  const upToDate = m.total > 0 && m.done >= m.total;
  let k, t;
  if (la == null) { k = 'r'; t = m.done > 0 ? 'Sin práctica reciente' : 'Aún no ha practicado'; }
  else if (la === 0) { k = 'g'; t = 'Practicó hoy'; }
  else if (upToDate) { k = 'g'; t = 'Al día · practicó hace ' + la + ' d'; }
  else if (la >= 7) { k = 'r'; t = la + ' días sin practicar'; }
  else if (la >= 3) { k = 'a'; t = la + ' días sin practicar'; }
  else if (m.done >= 3 && m.quality > 0 && m.quality < 60) { k = 'a'; t = 'Practica, pero acierta poco (' + Math.round(m.quality) + '%)'; }
  else { k = 'g'; t = la === 1 ? 'Practicó ayer' : 'Practicó hace ' + la + ' días'; }
  const paused = !!(window.JUCUM_PAY && window.JUCUM_PAY.gateStatus && window.JUCUM_PAY.gateStatus(s).k === 'cl');
  return { s, m, r, days, k, t, upToDate, paused, sugg: !!sugg };
}

function GwWin({ ico, title, sub, onClose, children }) {
  React.useEffect(() => { const f = (e) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', f); return () => document.removeEventListener('keydown', f); }, []);
  return (
    <div className="gw-ov" onClick={onClose}>
      <div className="gw-win" role="dialog" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="gw-wh"><span className="gw-ti">{ico}</span><div className="t"><h3>{title}</h3>{sub ? <small>{sub}</small> : null}</div><button type="button" className="gw-wx" onClick={onClose} aria-label="Cerrar">✕</button></div>
        <div className="gw-wb">{children}</div>
      </div>
    </div>
  );
}

/* ── 🔥 Rachas del grupo (ventana) · RACHA-AMABLE-V1 (27-oct-2026, “Propuesta - Rachas en el grupo.html”) ──
 * ÚNICO lugar del profesor donde se ven las rachas: 4 números · ⏳ en juego hoy · lista con 14 días. */
const RK_ICO = { on: '🔥', shield: '🛡', free: '😴', broke: '✗', pending: '⏳', off: '' };
function gwStreakRisk(s) { const i = s && s.streakInfo; return !!(i && i.streak > 0 && !i.todayCounts && !i.isSunday); }
function GwStreaks({ group, models, onPick }) {
  const [sort, setSort] = React.useState('racha');
  const L = models.map(x => x.s).filter(s => s.streakInfo);
  if (!L.length) return <div className="gw-note">Las rachas aparecen cuando se terminan de bajar los días de práctica de la nube (unos segundos).</div>;
  const goal = L[0].streakInfo.goal;
  const nm2 = (n) => String(n || '').split(' ').slice(0, 2).join(' ');
  const conR = L.filter(s => s.streakInfo.streak > 0).length, done = L.filter(s => s.streakInfo.todayCounts).length;
  const risk = L.filter(gwStreakRisk).sort((a, b) => b.streakInfo.streak - a.streakInfo.streak);
  const best = L.reduce((m, s) => (!m || s.streakInfo.best > m.streakInfo.best) ? s : m, null);
  const sunday = L[0].streakInfo.isSunday;
  const cmp = sort === 'racha' ? (a, b) => b.streakInfo.streak - a.streakInfo.streak || b.streakInfo.best - a.streakInfo.best
    : sort === 'hoy' ? (a, b) => (a.streakInfo.todayCounts - b.streakInfo.todayCounts) || (a.streakInfo.todayMin - b.streakInfo.todayMin)
    : (a, b) => String(a.fullName).localeCompare(String(b.fullName));
  return (<>
    <div className="rk-kp"><div><b>{conR}</b><span>de {L.length} con racha</span></div><div><b>{done}</b><span>ya cumplieron hoy</span></div><div><b>{risk.length}</b><span>con racha en juego hoy</span></div><div><b>{best ? best.streakInfo.best : 0}</b><span>mejor racha{best && best.streakInfo.best ? ' · ' + nm2(best.fullName) : ''}</span></div></div>
    {risk.length ? <div className="rk-pend"><h4>⏳ En juego hoy · aún no llegan a {goal} min</h4>
      <div className="rk-pp">{risk.map(s => <button type="button" key={s.id} onClick={() => onPick(s.id)}>{nm2(s.fullName)} · 🔥{s.streakInfo.streak} · {Math.round(s.streakInfo.todayMin)}/{goal} min{s.streakInfo.shieldLeft ? ' · 🛡' : ''}</button>)}</div>
      <small>🛡 = si hoy no llega, el escudo de la semana le cubre el día. Sin 🛡, hoy se le corta. A las 19:00 les llega el aviso.</small></div>
      : <div className="rk-calm">{sunday ? '😴 Hoy es domingo libre: nadie pierde su racha.' : '✅ Nadie con racha en juego en este momento.'}</div>}
    <div className="rk-seg">{[['racha', 'Por racha'], ['hoy', 'Pendientes hoy'], ['az', 'A–Z']].map(o => <button type="button" key={o[0]} className={sort === o[0] ? 'on' : ''} onClick={() => setSort(o[0])}>{o[1]}</button>)}</div>
    <div className="rk-ls"><div className="rk-hd"><span>Alumno</span><span>Racha</span><span className="sx">Últimos 14 días</span><span>Hoy</span></div>
      {L.slice().sort(cmp).map(s => { const i = s.streakInfo, last = i.days.slice(-14); while (last.length < 14) last.unshift({ st: 'off' });
        return (<button type="button" className="rk-r" key={s.id} onClick={() => onPick(s.id)}>
          <span className="nm"><b>{s.fullName}</b><small>récord {i.best} · 🛡 {i.shieldLeft ? 'disponible' : 'usado'}</small></span>
          <span className={'fx' + (i.streak ? '' : ' z')}>🔥 {i.streak}</span>
          <span className="rk-st">{last.map((d, k) => <i key={k} className={d.st} title={(d.d || '') + ' · ' + Math.round(d.m || 0) + ' min'}>{RK_ICO[d.st] || ''}</i>)}</span>
          <span className="tm" style={{ color: i.todayCounts ? '#2E7D32' : '#B25E00' }}>{Math.round(i.todayMin)} / {i.goal} min</span>
        </button>); })}</div>
    <div className="rk-lg"><span><i style={{ background: '#FFB74D' }}></i>🔥 cumplió</span><span><i style={{ background: '#90CAF9' }}></i>🛡 escudo</span><span><i style={{ background: '#E8F5E9' }}></i>😴 domingo libre</span><span><i style={{ background: '#EF9A9A' }}></i>✗ se cortó</span><span><i style={{ background: '#FFF3C4', outline: '1.5px dashed #F0B44A' }}></i>⏳ hoy</span></div>
  </>);
}

/* ── 🧠 Práctica de hoy (ventana) ── */
function GwToday({ group, models, onPick }) {
  const D = window.JUCUM_DATA, TT = window.JUCUM_TT;
  const [d, setD] = React.useState(13);
  const [neuro, setNeuro] = React.useState(false);
  const target = (D.getGroupSettings(group.id) || {}).dailyTargetMin || 15;
  const thr = D.passThreshold ? D.passThreshold(group.level, group.id) : 75;
  const iso = (models[0] && models[0].days[d] && models[0].days[d].date) || gwDay();
  const isToday = iso === gwDay();
  const rowsOf = (x) => { const dd = x.days[d]; if (!dd) return []; const det = dd.details || {}; return [].concat(det.reading || [], det.listening || [], det.grammar || [], det.story || []); };
  const P = models.filter(x => x.days[d] && x.days[d].total > 0);
  const O = models.filter(x => !(x.days[d] && x.days[d].total > 0));
  const scs = []; P.forEach(x => rowsOf(x).forEach(r => { if (typeof r.score === 'number') scs.push(r.score); }));
  const avg = scs.length ? Math.round(scs.reduce((a, b) => a + b, 0) / scs.length) : null;
  const hasLow = (x) => rowsOf(x).some(r => typeof r.score === 'number' && r.score < thr);
  const PS = [...P].sort((a, b) => (hasLow(b) - hasLow(a)) || (b.days[d].total - a.days[d].total));
  const late = O.filter(x => x.s.lastActiveDays == null || x.s.lastActiveDays >= 3).sort((a, b) => (b.s.lastActiveDays == null ? 999 : b.s.lastActiveDays) - (a.s.lastActiveDays == null ? 999 : a.s.lastActiveDays));
  const recent = O.filter(x => !late.includes(x));
  let untouched = [];
  if (isToday && TT && TT.getTodayPracticeForStudent) {
    const idx = gwIndex(group.level), seen = {}, cols = [];
    models.forEach(x => { const tp = TT.getTodayPracticeForStudent(x.s, iso); ((tp && tp.items) || []).forEach(it => { const k = it.moduleId + ':' + it.activityId; if (seen[k] || !idx[k]) return; seen[k] = 1; cols.push({ k, a: idx[k].a }); }); });
    untouched = cols.filter(c => !models.some(x => { const e = (D.getStudentProgress(x.s.id).completed || {})[c.k]; return e && gwEntryDay(e) === iso; })).map(c => c.a.name);
  }
  const showNeuro = window.NeuroGroupCard && window.JUCUM_MIX && window.JUCUM_MIX.enabledFor({ level: group.level });
  if (neuro && showNeuro) { const NG = window.NeuroGroupCard; return (<><div><button type="button" className="gw-bt sm" onClick={() => setNeuro(false)}>← Volver al resumen del día</button></div><NG group={group} students={models.map(x => x.s)} onOpen={onPick} only="ga" /></>); }
  return (<>
    <span className="gw-dn"><button type="button" onClick={() => setD(v => Math.max(0, v - 1))} disabled={d <= 0} aria-label="Día anterior">‹</button><span style={{ minWidth: 110, textAlign: 'center' }}>{isToday ? 'Hoy' : gwDLbl(iso)}</span><button type="button" onClick={() => setD(v => Math.min(13, v + 1))} disabled={d >= 13} aria-label="Día siguiente">›</button></span>
    <div className="gw-tl">
      <div><span>Practicaron</span><b>{P.length} de {models.length}</b><small>{gwFm(P.reduce((a, x) => a + x.days[d].total, 0))} entre todos</small></div>
      <div><span>Nota promedio</span><b>{avg != null ? avg + '%' : '—'}</b><small>{scs.length ? 'de ' + scs.length + ' prácticas con nota' : 'sin prácticas con nota'}</small></div>
      <div><span>Con nota baja</span><b>{P.filter(hasLow).length}</b><small>debajo de {thr}%</small></div>
      <div><span>Llegaron a la meta</span><b>{P.filter(x => x.days[d].total >= target).length}</b><small>{target} min diarios</small></div>
    </div>
    <div className="gw-card">
      <div className="gw-sub">Quiénes practicaron <em>primero los que sacaron nota baja · toca para ver su ficha</em></div>
      {!PS.length ? <div className="gw-note">Nadie practicó {isToday ? 'todavía hoy' : 'ese día'}.</div> : PS.map(x => {
        const mins = x.days[d].total, low = hasLow(x);
        return (
          <button type="button" key={x.s.id} className="gw-hw" onClick={() => onPick(x.s.id)}>
            <span className="gw-nm"><b>{x.s.fullName}</b><small style={low ? { color: '#B71C1C' } : null}>{low ? 'nota baja en algo' : 'aprobó lo que hizo'}</small></span>
            <span className="gw-cks">{rowsOf(x).map((r, i) => <span key={i} className={'gw-ck ' + (typeof r.score === 'number' ? (r.score < thr ? 'lo' : 'd') : 'n')}>{r.item}{typeof r.score === 'number' ? ' · ' + Math.round(r.score) + '%' : ' ✓'}</span>)}</span>
            <span className="gw-mt"><span>{mins + ' min' + (mins >= target ? ' · meta ✓' : '')}</span><span className="gw-bar"><u style={{ width: Math.min(100, mins / target * 100) + '%', background: mins >= target ? '#2EA84B' : '#F4C04E' }}></u></span></span>
          </button>);
      })}
    </div>
    <div className="gw-card">
      <div className="gw-sub">No practicaron {isToday ? 'hoy' : 'ese día'} · {O.length}</div>
      {isToday ? (<>
        {late.length > 0 && <><b style={{ fontSize: 12.5, color: '#B71C1C' }}>Llevan 3 días o más sin practicar · {late.length}</b><div className="gw-chips">{late.map(x => <button type="button" key={x.s.id} className="r" onClick={() => onPick(x.s.id)}>{gwShort(x.s.fullName)} · {x.s.lastActiveDays == null ? 'nunca' : x.s.lastActiveDays + ' d'}</button>)}</div></>}
        {recent.length > 0 && <><b style={{ fontSize: 12.5, color: '#2E7D32' }}>Practicaron ayer o anteayer · {recent.length}</b><span style={{ fontSize: 11.5, fontWeight: 700, color: '#8a7f6a' }}>Normal: todavía pueden practicar hoy.</span><div className="gw-chips">{recent.map(x => <button type="button" key={x.s.id} onClick={() => onPick(x.s.id)}>{gwShort(x.s.fullName)}</button>)}</div></>}
      </>) : <div className="gw-chips">{O.map(x => <button type="button" key={x.s.id} onClick={() => onPick(x.s.id)}>{gwShort(x.s.fullName)}</button>)}</div>}
    </div>
    {untouched.length > 0 && <div className="gw-note"><b>De la práctica asignada hoy, nadie empezó todavía:</b> {untouched.join(' · ')}. Recuérdalas en la próxima clase.</div>}
    {showNeuro && <div><button type="button" className="gw-lk" onClick={() => setNeuro(true)}>🧠 Ver la tabla detallada de Neuro (por material) →</button></div>}
  </>);
}

/* ── 🎯 Qué reforzar en clase (ventana) ── */
function GwReinforce({ group, models, onPick }) {
  const D = window.JUCUM_DATA;
  const thr = D.passThreshold ? D.passThreshold(group.level, group.id) : 75;
  const comps = (D.COMPETENCIES || []).map(c => {
    const vals = models.map(x => x.r.competencies && x.r.competencies[c.key]).filter(v => typeof v === 'number');
    return { c, n: vals.length, v: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null, low: vals.filter(v => v < 60).length };
  }).filter(x => x.v != null);
  if (!comps.length || !models.length) return <div className="gw-note">Aún no hay suficientes prácticas con nota para recomendar qué reforzar.</div>;
  const w = comps.reduce((a, b) => b.v < a.v ? b : a);
  const others = comps.filter(x => x !== w), nx = others.length ? others.reduce((a, b) => b.v < a.v ? b : a) : null;
  const who = [...models].filter(x => typeof (x.r.competencies || {})[w.c.key] === 'number').sort((a, b) => a.r.competencies[w.c.key] - b.r.competencies[w.c.key]).slice(0, 5);
  const gs = D.getGroupSettings(group.id) || {}, open = gs.activeModuleIds || [], cls = open.length ? open[open.length - 1] : null;
  const acts = [];
  (D.MODULE_CATALOG[group.level] || []).filter(m => open.includes(m.id)).forEach(m => (m.activities || []).forEach(a => {
    if (!(w.c.types || []).includes(a.type)) return;
    const k = m.id + ':' + a.id; let tried = 0, sum = 0, below = [], done = 0;
    models.forEach(x => { const e = (D.getStudentProgress(x.s.id).completed || {})[k]; if (!e) return; done++; const p = D.scorePct ? D.scorePct(e.score) : e.score; if (typeof p === 'number') { tried++; sum += p; if (p < thr) below.push(x.s); } });
    acts.push({ m, a, k, done, tried, avg: tried ? Math.round(sum / tried) : null, below, cur: m.id === cls });
  }));
  const weakActs = acts.filter(x => x.tried >= 2).sort((a, b) => a.avg - b.avg).slice(0, 4);
  const toAssign = acts.filter(x => x.done / models.length < 0.6).sort((a, b) => (b.cur - a.cur) || (a.done - b.done)).slice(0, 4);
  return (<>
    <div className="gw-hl2">El grupo está más flojo en <b>{w.c.icon} {w.c.label}</b>: <b>{w.v}%</b> de promedio{nx && nx.v - w.v >= 3 ? <>, <b>{nx.v - w.v} puntos menos</b> que {nx.c.label.toLowerCase()} ({nx.v}%)</> : null}. <b>{w.low} de {w.n}</b> alumnos están por debajo de 60%.</div>
    <div className="gw-card">
      <div className="gw-sub">Por qué lo digo <em>promedio del grupo por competencia · cuánto del nivel hizo × qué tan bien</em></div>
      {comps.map(x => <div key={x.c.key} className={'gw-cmp' + (x === w ? ' w' : '')}><span>{x.c.icon} {x.c.label}</span><span className="gw-bar"><u style={{ width: x.v + '%', background: x === w ? '#E53935' : gwCol(x.v) }}></u></span><b style={{ textAlign: 'right' }}>{x.v}%</b><small>{x.low} de {x.n} bajo 60%</small></div>)}
    </div>
    <div className="gw-card">
      <div className="gw-sub">A quién ayudar primero <em>los {who.length} más bajos en {w.c.label.toLowerCase()} · toca para ver su ficha</em></div>
      {who.map(x => <button type="button" key={x.s.id} className="gw-hw" onClick={() => onPick(x.s.id)}><span className="gw-nm"><b>{x.s.fullName}</b><small>dominio general {x.m.pct}% · {x.t.toLowerCase()}</small></span><span className="gw-bar"><u style={{ width: x.r.competencies[w.c.key] + '%', background: '#E06B5B' }}></u></span><span className="gw-mt" style={{ color: '#B71C1C' }}><span>{x.r.competencies[w.c.key] + '%'}</span></span></button>)}
    </div>
    {w.c.byTeacher ? <div className="gw-note">{w.c.label} se evalúa en clase (📋 Evaluar la clase) y con tareas: no hay materiales de la plataforma para dejar.</div> : (<>
      {weakActs.length > 0 && <div className="gw-card"><div className="gw-sub">Dónde les va peor <em>materiales de {w.c.label.toLowerCase()} con nota más baja (módulos abiertos)</em></div>{weakActs.map(x => <div key={x.k} className="gw-lr"><span>{x.a.name}<small>{x.m.name}{x.cur ? ' · en clase' : ' · repaso'} · {x.below.length ? x.below.length + ' bajo ' + thr + '%: ' + x.below.slice(0, 4).map(s => s.fullName.split(' ')[0]).join(', ') + (x.below.length > 4 ? ' y ' + (x.below.length - 4) + ' más' : '') : 'todos aprobaron'}</small></span><span className={'gw-sc ' + gwScC(x.avg, thr)}>prom. {x.avg}%</span></div>)}</div>}
      {toAssign.length > 0 && <div className="gw-card"><div className="gw-sub">Qué dejar de práctica <em>de esa competencia · la mayoría aún no lo hizo</em></div>{toAssign.map(x => <div key={x.k} className="gw-lr"><span>{x.a.name}<small>{x.m.name}{x.cur ? ' · en clase' : ' · repaso'}</small></span><span className="gw-sc md">{x.done} de {models.length} lo hicieron</span></div>)}</div>}
    </>)}
    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#8a7f6a' }}>Se calcula con las notas de los alumnos activos del grupo (sin avance cerrado).</div>
  </>);
}

/* ── ❌ Lo que más falla · niveles SIN Neuro: materiales con nota más baja ── */
function GwFails({ group, models, onPick }) {
  const D = window.JUCUM_DATA;
  const thr = D.passThreshold ? D.passThreshold(group.level, group.id) : 75;
  const gs = D.getGroupSettings(group.id) || {}, open = gs.activeModuleIds || [];
  const list = [];
  (D.MODULE_CATALOG[group.level] || []).filter(m => open.includes(m.id)).forEach(m => (m.activities || []).forEach(a => {
    if (GW_NOGRADE.includes(a.type)) return;
    const k = m.id + ':' + a.id; let n = 0, sum = 0; const below = [];
    models.forEach(x => { const e = (D.getStudentProgress(x.s.id).completed || {})[k]; const p = e && (D.scorePct ? D.scorePct(e.score) : e.score); if (typeof p !== 'number') return; n++; sum += p; if (p < thr) below.push(x.s); });
    if (n >= 2 && below.length) list.push({ k, m, a, n, avg: Math.round(sum / n), below });
  }));
  list.sort((a, b) => (b.below.length / b.n) - (a.below.length / a.n) || a.avg - b.avg);
  if (!list.length) return <div className="gw-note">En los módulos abiertos ningún material tiene alumnos debajo de {thr}%. 🎉</div>;
  return (<div className="gw-card"><div className="gw-sub">Materiales donde más alumnos quedan debajo de {thr}% <em>módulos abiertos · toca un nombre para ver su ficha</em></div>{list.slice(0, 8).map(x => (
    <div key={x.k} className="gw-lr" style={{ alignItems: 'start' }}><span>{x.a.name}<small>{x.m.name} · prom. {x.avg}%</small><span className="gw-chips" style={{ marginTop: 5 }}>{x.below.map(s => <button type="button" key={s.id} className="r" onClick={() => onPick(s.id)}>{gwShort(s.fullName)}</button>)}</span></span><span className="gw-sc lo">{x.below.length} de {x.n}</span></div>))}</div>);
}

/* ── 👥 Cambiar de grupo (misma cuenta: avance, XP y racha intactos) ── */
function GwMoveModal({ student, onClose, onDone }) {
  const D = window.JUCUM_DATA;
  const fin = (g) => !!(window.JUCUM_GRAD && window.JUCUM_GRAD.isFinished && window.JUCUM_GRAD.isFinished(g));
  const opts = D.GROUPS.filter(g => g.id !== student.group && !fin(g));
  const [to, setTo] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const dest = D.GROUPS.find(g => g.id === to);
  const lvChange = dest && dest.level !== student.level;
  const save = async () => {
    if (!dest) { setErr('Elige el grupo nuevo.'); return; }
    setBusy(true); setErr('');
    if (window.JUCUM_SB) {
      try { await window.JUCUM_SB.update('users', student.id, { group_id: dest.id, level: dest.level }); }
      catch (e) { setBusy(false); setErr('No se pudo guardar en la nube (' + ((e && e.message) || 'sin conexión') + '). No se cambió nada: inténtalo de nuevo.'); return; }
    }
    const i = D.STUDENTS.findIndex(x => x.id === student.id);
    if (i >= 0) { D.STUDENTS[i] = { ...D.STUDENTS[i], group: dest.id, level: dest.level }; D.saveStudents(D.STUDENTS); }
    setBusy(false); onDone(dest);
  };
  const GP = window.GroupPicker;
  return (
    <GwWin ico="👥" title="Cambiar de grupo" sub={student.fullName} onClose={onClose}>
      <div className="gw-card">
        <div style={{ fontSize: 13, lineHeight: 1.5, color: '#33415C' }}>Se mueve con <b>la misma cuenta</b>: conserva su avance, notas, XP y racha. Sale de este grupo y aparece en el nuevo.</div>
        <div className="gw-sub">Grupo nuevo</div>
        {GP ? <GP groups={opts} value={to} onChange={(e) => setTo(e.target.value)} placeholder="Elige el grupo…" />
          : <select className="gw-sel" style={{ maxWidth: '100%', width: '100%' }} value={to} onChange={e => setTo(e.target.value)}><option value="">Elige el grupo…</option>{opts.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>}
        {lvChange && <div className="gw-sg a"><span className="gw-dot a"></span><div>Ese grupo es de otro nivel: el alumno pasará a <b>{(D.LEVELS[dest.level] || {}).code || dest.level}</b>.</div></div>}
        {err && <div className="gw-sg r"><span className="gw-dot r"></span><div>{err}</div></div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}><button type="button" className="gw-bt" onClick={onClose}>Cancelar</button><button type="button" className="gw-bt pr" disabled={busy || !dest} style={busy || !dest ? { opacity: .55 } : null} onClick={save}>{busy ? 'Guardando…' : 'Mover al grupo'}</button></div>
      </div>
    </GwWin>
  );
}

/* ── ficha rápida ── */
function gwSuggest(x, cls) {
  const s = x.s;
  if (x.k === 'r' && x.sugg) return <>Lleva <b>{s.lastActiveDays} días sin practicar</b> y aprobó un módulo anterior, pero no siguió con el actual. Si ya no continúa, puedes cerrar su avance: no pierde nada y se puede reabrir.</>;
  if (x.k === 'r' && s.lastActiveDays == null && !x.m.done) return <>Todavía <b>no ha practicado nunca</b> en la plataforma. Revisa que sepa entrar con su usuario <b>@{s.username}</b>.</>;
  if (x.k === 'r') return <>Lleva <b>{s.lastActiveDays} días sin practicar</b>{x.m.total > x.m.done ? <> y le faltan {x.m.total - x.m.done} actividades{cls ? ' de ' + cls.name : ''}</> : null}. Vale la pena escribirle hoy.</>;
  if (x.k === 'a' && s.lastActiveDays >= 3) return <>Lleva <b>{s.lastActiveDays} días sin practicar</b>. Aún va a tiempo: recuérdaselo en la próxima clase.</>;
  if (x.k === 'a') return <><b>{x.t}.</b> Revisa con él o ella sus notas bajas (pestaña Práctica).</>;
  if (x.r.apt) return <>Va bien y está <b>listo para el examen</b>.</>;
  return <>Va bien. Le falta subir su preparación para el examen ({x.r.overall}%, pide 75%{x.r.blocker === 'coverage' ? ' y hacer más actividades del módulo' : ''}).</>;
}
function GwPanel({ x, pos, total, onMove, group, level, onOpen, onClose, onDelete, onMoveGroup, tab, setTab }) {
  const D = window.JUCUM_DATA, TT = window.JUCUM_TT;
  if (!x) return <div className="gw-cp"><div className="gw-empty">Elige un alumno de la lista</div></div>;
  const s = x.s, gs = D.getGroupSettings(group.id) || {}, target = gs.dailyTargetMin || 15, thr = D.passThreshold ? D.passThreshold(s.level, s.group) : 75;
  const open = gs.activeModuleIds || [], clsId = open.length ? open[open.length - 1] : null;
  const mods = D.MODULE_CATALOG[s.level] || [], cls = mods.find(m => m.id === clsId);
  const completed = (D.getStudentProgress(s.id) || {}).completed || {};
  const improve = (D.getActivitiesToImprove ? D.getActivitiesToImprove(s) : []).slice(0, 4);
  const today = gwDay(), active14 = x.days.filter(d => d.total > 0).length;
  let body = null;
  if (tab === 'res') body = (<>
    <div className={'gw-sg ' + x.k}><span className={'gw-dot ' + x.k}></span><div>{gwSuggest(x, cls)}</div>{x.sugg && onClose && <button type="button" className="gw-bt sm warn" onClick={onClose}>⏸ Cerrar avance</button>}</div>
    <div className="gw-tl">
      <div title="Dominio = lo hecho × aciertos × constancia"><span>Dominio</span><b style={{ color: x.m.pct >= 85 ? '#2E7D32' : x.m.pct >= 70 ? '#A15C00' : '#C62828' }}>{x.m.pct > 0 ? x.m.pct + '%' : '—'}</b><small>{x.m.done} de {x.m.total} actividades · {Math.round(x.m.quality || 0)}% aciertos</small></div>
      <div><span>Examen</span><b>{x.r.apt ? 'Listo' : x.r.overall + '%'}</b><small>{x.r.apt ? 'apto para rendirlo' : 'aún no apto · pide 75%'}</small></div>
      <div><span>Racha</span><b>{s.streak ? s.streak + (s.streak === 1 ? ' día' : ' días') : '—'}</b><small>{s.streak ? 'días seguidos' : 'sin racha activa'}</small></div>
      <div><span>Tiempo total</span><b>{gwFm(s.totalMinutes)}</b><small>{(s.achievements || []).length} logros</small></div>
    </div>
    <div className="gw-sub">Últimos 14 días <em>practicó {active14} de 14 días · meta {target} min</em></div>
    <div className="gw-d14">{x.days.map(d => { const dw = new Date(d.date + 'T12:00:00Z').getUTCDay(); return <div key={d.date} className={d.date === today ? 't' : ''} title={gwDLbl(d.date) + ': ' + (d.total ? d.total + ' min' : 'no practicó')}><i className={d.total >= target ? 'm3' : d.total >= target / 2 ? 'm2' : d.total > 0 ? 'm1' : ''}></i><span>{GW_DOW[dw]}</span></div>; })}</div>
    <div className="gw-lg"><span><b style={{ background: '#EFECE4' }}></b>no practicó</span><span><b style={{ background: '#C9EBD0' }}></b>menos de {Math.round(target / 2)} min</span><span><b style={{ background: '#86D296' }}></b>casi la meta</span><span><b style={{ background: '#2EA84B' }}></b>{target} min o más</span></div>
  </>);
  if (tab === 'pra') {
    const idx = gwIndex(s.level), tp = TT && TT.getTodayPracticeForStudent ? TT.getTodayPracticeForStudent(s, today) : { items: [] };
    const items = ((tp && tp.items) || []).map(it => { const k = it.moduleId + ':' + it.activityId, inf = idx[k], e = completed[k]; const hoy = e && gwEntryDay(e) === today; const p = e && (D.scorePct ? D.scorePct(e.score) : e.score); return { k, name: inf ? inf.a.name : (it.label || it.activityId), mod: inf ? inf.mod.name : '', hoy, p, ok: hoy && gwPassed(D, e, inf && inf.a, s) }; });
    const dn = items.filter(i => i.hoy).length;
    body = (<>
      <div className="gw-sub">Práctica asignada · hoy <em>{items.length ? dn + ' de ' + items.length + ' hechas' : 'sin práctica asignada hoy'}{tp && tp.isGeneric && items.length ? ' · recomendación automática' : ''}</em></div>
      {items.length > 0 && <div>{items.map(i => <div key={i.k} className="gw-lr"><span>{i.name}<small>{i.mod}</small></span>{i.hoy ? (typeof i.p === 'number' ? <span className={'gw-sc ' + (i.ok ? 'hi' : 'lo')}>{i.ok ? '✓ ' : '↻ '}{i.p}%</span> : <span className="gw-sc hi">✓ hecha</span>) : <span className="gw-sc nn">pendiente</span>}</div>)}</div>}
      <div className="gw-sub">Por mejorar <em>notas debajo de {thr}%</em></div>
      {improve.length ? <div>{improve.map(i => <div key={i.moduleId + i.activityId} className="gw-lr"><span>{i.name}<small>{i.moduleName}</small></span><span className="gw-sc lo">{i.pct}%</span></div>)}</div> : <div className="gw-note">Nada pendiente por mejorar.</div>}
    </>);
  }
  if (tab === 'mod') body = (<>
    <div className="gw-sub">Avance por módulo <em>actividades hechas y aprobadas</em></div>
    <div>{mods.map(m => { const st = m.id === clsId ? 'cls' : open.includes(m.id) ? 'rev' : 'off'; const acts = m.activities || []; const done = acts.filter(a => gwPassed(D, completed[m.id + ':' + a.id], a, s)).length; const p = acts.length ? Math.round(done / acts.length * 100) : 0; return (
      <div key={m.id} className={'gw-mr' + (st === 'off' && !done ? ' off' : '')}><span style={{ fontSize: 17, textAlign: 'center' }}>{m.emoji}</span><span>{m.name}<small>{st === 'cls' ? '▶ en clase' : st === 'rev' ? 'abierto para repasar' : 'cerrado para el grupo'} · {done} de {acts.length}</small></span><span className="gw-bar">{done ? <u style={{ width: p + '%', background: gwCol(p) }}></u> : null}</span><b>{done ? p + '%' : '—'}</b></div>); })}</div>
  </>);
  if (tab === 'his') {
    const log = (D.getStudentLog ? D.getStudentLog(s.id) : []).slice(0, 10);
    body = (<>
      <div className="gw-sub">Últimas prácticas</div>
      {log.length ? <div>{log.map((e, i) => <div key={i} className="gw-lr"><span>{e.detail}<small>{e.module}{e.date ? ' · ' + gwDLbl(e.date.slice(0, 10)) + ' ' + e.date.slice(11, 16) : ''}</small></span>{typeof e.score === 'number' ? <span className={'gw-sc ' + gwScC(e.score, thr)}>{e.score}%</span> : <span className="gw-sc nn">hecha</span>}</div>)}</div> : <div className="gw-note">Todavía no hay prácticas registradas.</div>}{/* día-ok: getStudentLog ya da hora Perú */}
    </>);
  }
  return (
    <div className="gw-cp">
      <div className="gw-ph">
        <span className="gw-av" style={{ background: `linear-gradient(135deg,${level.color}80,${level.dark})` }}>{gwIni(s.fullName)}</span>
        <span className="gw-nm"><b>{s.starred ? '⭐ ' : ''}{s.fullName}</b><small>@{s.username}{gwSeen(s) ? ' · ' + gwSeen(s) : ''}{x.paused ? ' · 🔒 en pausa por pago' : ''}</small></span>
        <span className={'gw-pill ' + x.k}><span className={'gw-dot ' + x.k}></span>{x.k === 'g' ? 'Va bien' : x.k === 'a' ? 'Por vigilar' : 'Necesita un empujón'}</span>
        <span className="gw-nav">{pos >= 0 ? (pos + 1) + ' de ' + total : ''}<button type="button" className="gw-bt ic" onClick={() => onMove(-1)} aria-label="Anterior">‹</button><button type="button" className="gw-bt ic" onClick={() => onMove(1)} aria-label="Siguiente">›</button></span>
      </div>
      <div className="gw-tabs" role="tablist">{[['res', 'Resumen'], ['pra', 'Práctica', improve.length], ['mod', 'Módulos'], ['his', 'Historial']].map(t => <button type="button" role="tab" aria-selected={tab === t[0]} key={t[0]} className={'gw-tab' + (tab === t[0] ? ' on' : '')} onClick={() => setTab(t[0])}>{t[1]}{t[2] ? <i>{t[2]}</i> : null}</button>)}</div>
      <div className="gw-pb">{body}</div>
      <div className="gw-pf"><button type="button" className="gw-bt pr" onClick={onOpen}>Abrir ficha completa</button><span style={{ flex: 1 }}></span>{onMoveGroup && <button type="button" className="gw-lk" onClick={onMoveGroup}>👥 Cambiar de grupo</button>}{onClose && !x.sugg && <button type="button" className="gw-lk" onClick={onClose}>⏸ Cerrar avance</button>}{onDelete && <button type="button" className="gw-lk dang" onClick={onDelete}>Eliminar alumno…</button>}</div>
    </div>
  );
}

/* ═════ página del grupo ═════ */
function GroupWorkspace({ groupId, onBack, onSelectStudent, onClassic }) {
  const D = window.JUCUM_DATA;
  const group = D.GROUPS.find(g => g.id === groupId);
  const level = D.LEVELS[group.level];
  const [tick, setTick] = React.useState(0);
  const refresh = () => setTick(t => t + 1);
  const allMembers = D.STUDENTS.filter(s => s.group === groupId);
  const members = allMembers.filter(s => !s.closedAt);
  const closedMembers = allMembers.filter(s => s.closedAt);
  const [win, setWin] = React.useState(null);
  const [menu, setMenu] = React.useState(false);
  const [showReport, setShowReport] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showFinish, setShowFinish] = React.useState(false);
  const [closing, setClosing] = React.useState(null);
  const [deleting, setDeleting] = React.useState(null);
  const [moving, setMoving] = React.useState(null);
  const [flash, setFlash] = React.useState('');
  const [f, setF] = React.useState('all');
  const [sort, setSort] = React.useState('urg');
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(null);
  const [ptab, setPtab] = React.useState('res');
  const listRef = React.useRef(null);
  const grdFinished = !!(window.JUCUM_GRAD && window.JUCUM_GRAD.isFinished(group));
  React.useEffect(() => { document.body.setAttribute('data-level', group.level); return () => document.body.removeAttribute('data-level'); }, [group.level]);
  React.useEffect(() => { if (!menu) return; const h = () => setMenu(false); setTimeout(() => document.addEventListener('click', h), 0); return () => document.removeEventListener('click', h); }, [menu]);

  const idsKey = members.map(s => s.id).join(',');
  const models = React.useMemo(() => {
    const sg = new Set((window.closeSuggestions ? window.closeSuggestions(members, group) : []).map(s => s.id));
    return members.map(s => gwModel(s, sg.has(s.id)));
  }, [idsKey, tick]);   // eslint-disable-line
  const N = models.length;
  const cnt = { r: 0, a: 0, g: 0 }; models.forEach(x => cnt[x.k]++);
  const hoy = models.filter(x => x.s.lastActiveDays === 0).length, apt = models.filter(x => x.r.apt).length;
  const avg = N ? Math.round(models.reduce((a, x) => a + x.m.pct, 0) / N) : 0;

  const SO = { urg: (a, b) => GW_K[a.k] - GW_K[b.k] || (a.k === 'g' ? b.m.pct - a.m.pct : ((b.s.lastActiveDays == null ? 999 : b.s.lastActiveDays) - (a.s.lastActiveDays == null ? 999 : a.s.lastActiveDays) || a.m.pct - b.m.pct)),
    dom: (a, b) => b.m.pct - a.m.pct, ex: (a, b) => b.r.overall - a.r.overall, menos: (a, b) => (a.s.totalMinutes || 0) - (b.s.totalMinutes || 0), racha: (a, b) => (b.s.streak || 0) - (a.s.streak || 0), az: (a, b) => a.s.fullName.localeCompare(b.s.fullName, 'es') };
  const needle = q.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const list = models.filter(x => (f === 'all' || (f === 'att' && x.k !== 'g') || (f === 'hoy' && x.s.lastActiveDays === 0) || (f === 'apt' && x.r.apt))
    && (!needle || (x.s.fullName + ' ' + x.s.username).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(needle))).sort(SO[sort] || SO.urg);
  const cur = list.find(x => x.s.id === sel) || list[0] || null;
  const pos = cur ? list.indexOf(cur) : -1;
  const move = (d) => { if (!list.length) return; const p = Math.max(0, Math.min(list.length - 1, (pos < 0 ? 0 : pos + d))); setSel(list[p].s.id); };
  React.useEffect(() => {
    const h = (e) => { if (win || showSettings || closing || deleting || showFinish || /INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || '')) return; if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); move(e.key === 'ArrowDown' ? 1 : -1); } };
    document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h);
  });
  React.useEffect(() => { const c = listRef.current, on = c && c.querySelector('.gw-it.on'); if (!on) return; const t = on.offsetTop, hh = 34; if (t - hh < c.scrollTop) c.scrollTop = t - hh; else if (t + on.offsetHeight > c.scrollTop + c.clientHeight) c.scrollTop = t + on.offsetHeight - c.clientHeight + 6; }, [cur && cur.s.id]);

  if (showReport && window.GroupReport) { const GR = window.GroupReport; return <GR groupId={groupId} onBack={() => setShowReport(false)} />; }

  const gs = D.getGroupSettings(groupId) || {}, open = gs.activeModuleIds || [], clsId = open.length ? open[open.length - 1] : null;
  const clsMod = clsId && (D.MODULE_CATALOG[group.level] || []).find(m => m.id === clsId);
  const neuroOn = !!(window.NeuroGroupCard && window.JUCUM_MIX && window.JUCUM_MIX.enabledFor({ level: group.level }));
  let champ = null; try { const c = D.getWeekChampions ? D.getWeekChampions(groupId) : null; champ = c && (c.champions || []).find(x => x.rank === 1); } catch (e) {}
  const lowW = (() => { const cs = (D.COMPETENCIES || []).map(c => { const v = models.map(x => (x.r.competencies || {})[c.key]).filter(n => typeof n === 'number'); return v.length ? { c, v: Math.round(v.reduce((a, b) => a + b, 0) / v.length) } : null; }).filter(Boolean); return cs.length ? cs.reduce((a, b) => b.v < a.v ? b : a) : null; })();
  const TB = [
    ['mods', '📦', 'Módulos', clsMod ? clsMod.emoji + ' ' + clsMod.name + (open.length > 1 ? ' · +' + (open.length - 1) + ' repaso' : '') : 'ninguno abierto'],
    ['hoy', '🧠', 'Práctica de hoy', hoy + ' de ' + N + ' practicaron'],
    ['ref', '🎯', 'Qué reforzar', lowW ? lowW.c.label.replace('Comprensión ', '') + ' · ' + lowW.v + '%' : 'aún sin datos'],
    ['err', '❌', 'Lo que más falla', neuroOn ? 'preguntas · 1.er intento' : 'materiales con nota baja'],
    ['champ', '🏆', 'Campeones', champ ? champ.student.fullName.split(' ')[0] + ' · ' + (champ.xp || 0).toLocaleString() + ' XP' : 'de la semana'],
    (() => { const ms = models.map(x => x.s), ok = ms.filter(s => s.streakInfo), n = ok.filter(s => s.streakInfo.streak > 0).length, rk = ok.filter(gwStreakRisk).length, h = Number(new Date(Date.now() - 5 * 3600e3).toISOString().slice(11, 13));
      return ['rachas', '🔥', 'Rachas', ok.length ? (n ? n + ' de ' + ms.length + ' con racha' : 'nadie con racha aún') : 'cargando…', rk && h >= 18 ? rk : 0]; })(),   // RACHA-AMABLE-V1
  ];
  const pick = (id) => { setWin(null); setF('all'); setQ(''); setSel(id); };
  const lv = level.color || '#F9A825';
  const GMQ = window.GroupModulesQuick, TCH = window.TeacherChampions, NG = window.NeuroGroupCard, GSM = window.GroupSettingsModal;
  const WINS = {
    mods: { t: 'Módulos del grupo', s: 'los cambios se guardan al tocar', b: GMQ ? <GMQ groupId={groupId} onChanged={refresh} /> : null },
    hoy: { t: 'Práctica de hoy', s: 'quién practicó, cómo le fue y a quién buscar', b: <GwToday group={group} models={models} onPick={pick} /> },
    ref: { t: 'Qué reforzar en clase', s: 'por qué, a quién y con qué' + (clsMod ? ' · ' + clsMod.name : ''), b: <GwReinforce group={group} models={models} onPick={pick} /> },
    err: { t: 'Lo que más falla el grupo', s: neuroOn ? 'últimos 14 días · solo cuenta el primer intento' : 'módulos abiertos', b: neuroOn ? <NG group={group} students={members} onOpen={pick} only="gf" /> : <GwFails group={group} models={models} onPick={pick} /> },
    rachas: { t: 'Rachas del grupo', s: 'el día cuenta con ' + ((models[0] && models[0].s.streakInfo && models[0].s.streakInfo.goal) || 15) + ' min · domingo libre · 1 🛡 por semana', b: <GwStreaks group={group} models={models} onPick={pick} /> },
    champ: { t: 'Campeones de la semana', s: 'XP de este grupo · hasta el lunes', b: TCH ? <TCH groupId={groupId} levelColor={level.dark} /> : null },
    prac: { t: 'Prácticas del grupo', s: 'en curso y recién terminadas · se lee de la nube', b: window.SegGroupPractice ? <SegGroupPractice groupId={groupId} /> : null },   // SEG-GRUPO-V1
    closed: { t: 'Con avance cerrado', s: closedMembers.length + ' alumno' + (closedMembers.length === 1 ? '' : 's') + ' · se pueden reabrir', b: window.ClosedStudentsList ? React.createElement(window.ClosedStudentsList, { list: closedMembers, onChanged: refresh, onOpen: onSelectStudent }) : null },
  };
  const W = win && WINS[win];
  const rowEl = (x) => (
    <button type="button" key={x.s.id} className={'gw-it' + (cur && cur.s.id === x.s.id ? ' on' : '')} onClick={() => setSel(x.s.id)}>
      <span className={'gw-dot ' + x.k}></span>
      <span className="gw-nm"><b>{x.s.starred ? '⭐ ' : ''}{x.s.fullName}{x.paused ? ' 🔒' : ''}</b><small className={x.k}>{x.t}{x.k === 'g' && x.s.streak >= 3 ? ' · racha ' + x.s.streak : ''}</small></span>
      <span className="gw-pc">{x.m.pct > 0 ? x.m.pct + '%' : '—'}{x.r.apt ? <small>apto</small> : null}</span>
    </button>);
  const att = list.filter(x => x.k !== 'g'), ok = list.filter(x => x.k === 'g');

  return (
    <div className="gw" data-screen-label="Grupo" style={{ '--gw-lv': lv, '--gw-lvbg': lv + '22', '--gw-lvd': level.dark }}>
      <div><button className="back-btn" onClick={onBack}>← Volver a grupos</button></div>
      {grdFinished && window.FinishedGroupBanner && React.createElement(window.FinishedGroupBanner, { group, onChanged: refresh })}
      <div className="gw-hd">
        <div className="gw-hl">
          <div className="gw-cr"><span className="gw-lvp">{level.code}</span>{group.schedule ? <span>{group.schedule}</span> : null}{group.startDate ? <span>· inició el {group.startDate}</span> : null}{clsMod ? <span className="gw-cls"><i>{clsMod.emoji}</i>En clase · {clsMod.name}</span> : null}</div>
          <h1 className="gw-t">{group.name}</h1>
          <div className="gw-st"><button type="button" onClick={() => setF('all')}><b>{N}</b> alumnos</button><span>dominio <b>{avg}%</b></span><button type="button" onClick={() => setF('apt')}><b>{apt}</b> apto{apt === 1 ? '' : 's'} para examen</button><button type="button" onClick={() => setF('hoy')}><b>{hoy}</b> practicaron hoy</button>{cnt.r + cnt.a > 0 ? <button type="button" onClick={() => setF('att')} style={{ color: '#C62828' }}><b style={{ color: '#C62828' }}>{cnt.r + cnt.a}</b> necesitan atención</button> : null}</div>
        </div>
        <div className="gw-hr">
          <button type="button" className="gw-bt" onClick={() => setShowSettings(true)}>⚙️ Configurar</button>
          <div className="gw-more"><button type="button" className="gw-bt ic" onClick={() => setMenu(v => !v)} aria-label="Más opciones" title="Más opciones">⋯</button>
            {menu && <div className="gw-menu" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => { setMenu(false); setShowReport(true); }}>📄 Reporte PDF</button>
              <button type="button" onClick={() => { setMenu(false); if (window.JUCUM_STUDENT_PREVIEW) window.JUCUM_STUDENT_PREVIEW.open(groupId); }}>👁 Ver como alumno</button>
              {closedMembers.length > 0 && <button type="button" onClick={() => { setMenu(false); setWin('closed'); }}>⏸ Con avance cerrado ({closedMembers.length})</button>}
              {!grdFinished && window.FinishGroupModal && <><hr /><button type="button" style={{ color: '#8A5A00' }} onClick={() => { setMenu(false); setShowFinish(true); }}>🎓 Finalizar grupo…</button></>}
            </div>}
          </div>
        </div>
      </div>
      <div className="gw-tb">{TB.map(b => <React.Fragment key={b[0]}><button type="button" className="gw-tw" onClick={() => setWin(b[0])}><span className="gw-ti">{b[1]}</span><span><b>{b[2]}</b><small>{b[3]}</small></span>{b[4] ? <span className="gw-bd" title={b[4] + ' con racha en juego hoy'}>{b[4]}</span> : null}</button>{b[0] === 'hoy' && window.SegGroupPracBtn ? <SegGroupPracBtn groupId={groupId} onOpen={() => setWin('prac')} /> : null}</React.Fragment>)}</div>
      <div className="gw-sp">
        <div className="gw-cl">
          <div className="gw-clh">
            <div className="gw-row"><input className="gw-in" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar alumno…" aria-label="Buscar alumno" />
              <select className="gw-sel" value={sort} onChange={e => setSort(e.target.value)} aria-label="Ordenar"><option value="urg">Atención primero</option><option value="dom">Dominio ↓</option><option value="ex">Examen ↓</option><option value="menos">Practica menos</option><option value="racha">Racha ↓</option><option value="az">A → Z</option></select></div>
            <div className="gw-seg">{[['all', 'Todos', N], ['att', 'Atención', cnt.r + cnt.a], ['hoy', 'Hoy', hoy], ['apt', 'Aptos', apt]].map(o => <button type="button" key={o[0]} className={f === o[0] ? 'on' : ''} onClick={() => setF(o[0])}><i>{o[2]}</i>{o[1]}</button>)}</div>
          </div>
          <div className="gw-ls" ref={listRef}>
            {!list.length ? <div className="gw-empty">{N ? 'Sin resultados' : 'Este grupo no tiene alumnos activos'}</div>
              : sort !== 'urg' ? list.map(rowEl) : (<>
                {att.length > 0 && <><div className="gw-gh r"><span className="gw-dot r"></span>Necesitan atención · {att.length}</div>{att.map(rowEl)}</>}
                {ok.length > 0 && <><div className="gw-gh g"><span className="gw-dot g"></span>Van bien · {ok.length}</div>{ok.map(rowEl)}</>}
              </>)}
          </div>
          <div className="gw-ft"><span>↑ ↓ para pasar de alumno</span>{closedMembers.length > 0 && <button type="button" onClick={() => setWin('closed')}>⏸ {closedMembers.length} con avance cerrado</button>}</div>
        </div>
        <GwPanel x={cur} tab={ptab} setTab={setPtab} pos={pos} total={list.length} onMove={move} group={group} level={level}
          onOpen={() => cur && onSelectStudent(cur.s.id)}
          onClose={window.CloseProgressModal && cur ? () => setClosing(cur.s) : null}
          onDelete={window.TeacherPasswordGate && cur ? () => setDeleting(cur.s) : null}
          onMoveGroup={cur ? () => setMoving(cur.s) : null} />
      </div>

      {W && <GwWin ico={(TB.find(b => b[0] === win) || [0, '⏸'])[1]} title={W.t} sub={W.s} onClose={() => setWin(null)}>{W.b}</GwWin>}
      {showFinish && window.FinishGroupModal && React.createElement(window.FinishGroupModal, { groupId, onClose: () => setShowFinish(false), onDone: () => { setShowFinish(false); refresh(); } })}
      {closing && window.CloseProgressModal && React.createElement(window.CloseProgressModal, { student: closing, onClose: () => setClosing(null), onDone: () => { setClosing(null); refresh(); } })}
      {deleting && window.TeacherPasswordGate && React.createElement(window.TeacherPasswordGate, {
        danger: true, title: '🗑️ Eliminar alumno', confirmLabel: '🗑️ Eliminar definitivamente',
        message: `Vas a eliminar a ${deleting.fullName} (@${deleting.username}). Esto borra PARA SIEMPRE su cuenta y acceso, todo su progreso, XP y racha, sus tareas y notas, y su historial de práctica. Esta acción NO se puede deshacer. Ingresa tu contraseña de teacher para confirmar.`,
        onConfirm: () => { const i = D.STUDENTS.findIndex(x => x.id === deleting.id); if (i >= 0) { D.STUDENTS.splice(i, 1); D.saveStudents(D.STUDENTS); } if (window.JUCUM_SB) window.JUCUM_SB.remove('users', deleting.id).catch(() => {}); setDeleting(null); setSel(null); refresh(); },
        onClose: () => setDeleting(null) })}
      {moving && <GwMoveModal student={moving} onClose={() => setMoving(null)} onDone={(dest) => { const n = moving.fullName; setMoving(null); setSel(null); refresh(); setFlash('✓ ' + n + ' ahora está en ' + dest.name); setTimeout(() => setFlash(''), 4000); }} />}
      {flash && <div role="status" style={{ position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', background: '#1E2433', color: '#fff', borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 800, zIndex: 1300, maxWidth: '90vw', textAlign: 'center' }}>{flash}</div>}
      {showSettings && GSM && <GSM groupId={groupId} level={level} onClose={() => { setShowSettings(false); refresh(); }} />}
    </div>
  );
}

Object.assign(window, { GroupWorkspace });
