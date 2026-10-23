/* NeuroHoy · NEURO-HOY-V1 (14-oct-2026) — Parte 2 · Pre-A1 · "Conexiones de Neuro" (opción B aprobada)
 * Mi práctica en 2 pestañas: 🎯 Hoy (Tu día con llama + racha · Tu cerebro hoy con lo del profe
 * alrededor de Neuro · caja de errores · ⭐ Repasos de la semana opcionales x2 XP) y 🧭 Explorar
 * (la ruta y actividades de siempre, que llegan como `explore`). La lógica vive en mixed.js
 * (window.JUCUM_MIX); el reproductor es MixedPlayer/MixedSummary (MixedSession).
 * XP-EXPLICA-V1 (23-oct-2026): el chip ⚡ abre a Neuro en “⚡ ¿Cómo subo mi XP?” (NeuroCoach,
 * StudentDashboard). La usuaria decidió NO cambiar el XP, solo explicarlo honestamente. */
const NH_CSS = `.nh .nz{width:calc(100px*var(--z));height:calc(112px*var(--z));position:relative;flex-shrink:0}.nh .nz-sc{position:absolute;left:0;top:0;width:100px;height:112px;transform:scale(var(--z));transform-origin:0 0}.nh .nz-an{position:absolute;left:2px;top:6px;width:96px;height:96px}.nh .nz.idle .nz-an{animation:nhNzBob 2.6s ease-in-out infinite}.nh .nz.cheer .nz-an{animation:nhNzJump .55s cubic-bezier(.3,1.5,.5,1) infinite alternate}.nh .nz.run .nz-an{animation:nhNzRun .36s ease-in-out infinite}.nh .nz-sh{position:absolute;left:22px;bottom:4px;width:56px;height:9px;border-radius:50%;background:rgba(90,30,70,.16);animation:nhNzSh 2.6s ease-in-out infinite}.nh .nz.cheer .nz-sh{animation:nhNzSh .55s infinite alternate}.nh .nz.run .nz-sh{animation:nhNzSh .36s infinite}.nh .nz-br{position:absolute;left:0;top:0;width:96px;height:78px;border-radius:48% 48% 44% 44%/54% 54% 46% 46%;background:radial-gradient(circle at 38% 28%,#FFC6DE,#FF72AA 58%,#F0549A);box-shadow:inset 0 -7px 10px rgba(0,0,0,.12),inset 6px 4px 0 -2px rgba(255,255,255,.25),0 6px 14px rgba(255,95,160,.35);z-index:2}.nh .nz-br::before{content:'';position:absolute;top:7px;bottom:10px;left:50%;width:2.5px;transform:translateX(-50%);background:rgba(150,20,80,.12);border-radius:2px}.nh .nz-fd{position:absolute;border:2.5px solid;border-color:rgba(150,20,80,.15) transparent transparent transparent;border-radius:50%}.nh .nz-fd.a{left:13px;top:9px;width:26px;height:18px;transform:rotate(-16deg)}.nh .nz-fd.b{right:13px;top:9px;width:26px;height:18px;transform:rotate(16deg)}.nh .nz-ey{position:absolute;top:29px;width:18px;height:19px;background:#fff;border-radius:50%;box-shadow:inset 0 1px 2px rgba(0,0,0,.18);animation:nhNzBlink 4.4s infinite;overflow:hidden}.nh .nz-ey.l{left:22px}.nh .nz-ey.r{right:22px;animation-delay:.04s}.nh .nz-ey i{position:absolute;top:5px;left:5px;width:8.5px;height:8.5px;border-radius:50%;background:#2A2A2A;animation:nhNzLook 7s ease-in-out infinite}.nh .nz-ey i::after{content:'';position:absolute;top:1.5px;left:1.5px;width:3px;height:3px;border-radius:50%;background:#fff}.nh .nz.cheer .nz-ey{background:transparent;box-shadow:none;border:3.5px solid #5A2140;border-bottom:0;border-radius:18px 18px 0 0;height:11px;top:33px;animation:none}.nh .nz.cheer .nz-ey i{display:none}.nh .nz-mo{position:absolute;left:50%;transform:translateX(-50%)}.nh .nz-mo.smile{bottom:16px;width:22px;height:11px;border:3px solid #7A1733;border-top:0;border-radius:0 0 18px 18px}.nh .nz-mo.grin{bottom:13px;width:26px;height:14px;background:#7A1733;border-radius:0 0 16px 16px;overflow:hidden}.nh .nz-mo.grin::after{content:'';position:absolute;left:6px;bottom:-3px;width:14px;height:8px;border-radius:50%;background:#FF7FA8}.nh .nz-ck{position:absolute;top:47px;width:12px;height:7px;background:rgba(255,110,150,.65);border-radius:50%}.nh .nz-ck.l{left:11px}.nh .nz-ck.r{right:11px}.nh .nz-arm{position:absolute;top:42px;width:16px;height:27px;border-radius:50%;background:#F35E9F;z-index:1;transform-origin:50% 3px}.nh .nz-arm.l{left:-6px;transform:rotate(32deg)}.nh .nz-arm.r{right:-6px;transform:rotate(-32deg)}.nh .nz-arm.r.wave{animation:nhNzWave 2.2s ease-in-out infinite}.nh .nz.cheer .nz-arm.l{animation:nhNzUpL .55s infinite alternate}.nh .nz.cheer .nz-arm.r{animation:nhNzUpR .55s infinite alternate}.nh .nz.run .nz-arm.l{animation:nhNzSwL .36s infinite alternate}.nh .nz.run .nz-arm.r{animation:nhNzSwR .36s infinite alternate}.nh .nz-ft{position:absolute;top:73px;left:25px;display:flex;gap:14px;z-index:1}.nh .nz-ft span{width:18px;height:12px;background:#DE468A;border-radius:0 0 10px 10px}.nh .nz.run .nz-ft span{animation:nhNzFt .36s infinite alternate}.nh .nz.run .nz-ft span+span{animation-direction:alternate-reverse}.nh .nz-sp{position:absolute;color:#FFC83D;font-size:16px;animation:nhNzTw 1.4s ease-in-out infinite;z-index:3}.nh .say{position:relative;background:#fff;border:2px solid #FFC9DE;border-radius:14px;padding:9px 11px;font-size:12.5px;font-weight:800;color:#8E2C5E;line-height:1.4;animation:nhSayIn .4s ease-out both}.nh .say::before{content:'';position:absolute;left:-9px;top:18px;border:8px solid transparent;border-right-color:#FFC9DE;border-left:0}.nh .say::after{content:'';position:absolute;left:-6px;top:20px;border:6px solid transparent;border-right-color:#fff;border-left:0}.nh .ph{display:flex;align-items:center;gap:10px}.nh .ttl{font-family:'Fredoka',sans-serif;font-weight:600;font-size:21px;color:#1E2433}.nh .hchips{display:flex;gap:6px;margin-top:3px}.nh .hchip{font-size:11.5px;font-weight:900;border-radius:12px;padding:3px 9px;white-space:nowrap;display:inline-flex;align-items:center;gap:5px}.nh .hchip.fire{background:#FFF0DC;color:#C25400}.nh .hchip.xp{background:#FFF7CC;color:#8A6400}.nh .nzb{width:50px;height:50px;border-radius:50%;border:2px solid #FFC9DE;background:#FFF0F6;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:0;position:relative}.nh .nzb .q{position:absolute;right:-3px;top:-3px;width:18px;height:18px;border-radius:50%;background:#FF5FA0;color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #fff}.nh .tabs{display:grid;grid-template-columns:1fr 1fr;background:#E4EAF4;border-radius:13px;padding:4px;gap:4px}.nh .tabs button{border:0;border-radius:10px;background:none;font:inherit;font-weight:800;font-size:13.5px;color:#4A5A75;padding:10px 6px;cursor:pointer;min-height:44px;display:flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}.nh .tabs button.on{background:#fff;color:#1E2433;box-shadow:0 1px 3px rgba(0,0,0,.12)}.nh .tabs .n{background:var(--lp);color:#fff;font-size:10.5px;border-radius:9px;padding:1px 6px}.nh .day{background:#fff;border:1px solid #F6D9E7;border-radius:20px;padding:13px;display:flex;flex-direction:column;gap:12px;box-shadow:0 2px 8px rgba(255,95,160,.1)}.nh .dtop{display:flex;align-items:center;gap:10px}.nh .dlab{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:900;color:#5B6B86}.nh .dlab b{font-family:'Fredoka',sans-serif;font-weight:600;font-size:15px;color:#1E2433}.nh .flw{display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;width:96px}.nh .flm{position:relative;width:96px;height:112px;display:flex;align-items:flex-end;justify-content:center}.nh .flm .fa{position:relative;width:80px;height:100px;transform-origin:50% 100%;transition:transform 1s cubic-bezier(.3,1.4,.4,1);display:flex;align-items:flex-end;justify-content:center}.nh .fl{position:absolute;bottom:6px;left:50%;border-radius:50% 0 50% 50%;transform-origin:50% 50%}.nh .fl.o{width:62px;height:62px;margin-left:-31px;background:linear-gradient(225deg,#FFB13B,#FF5A1F 70%);animation:nhFlk 1.3s ease-in-out infinite;box-shadow:0 0 26px rgba(255,110,30,.55)}.nh .fl.m{width:42px;height:42px;margin-left:-21px;bottom:8px;background:linear-gradient(225deg,#FFE07A,#FF9A1F);animation:nhFlk 1s ease-in-out infinite reverse}.nh .fl.i{width:22px;height:22px;margin-left:-11px;bottom:10px;background:#FFF6C8;animation:nhFlk .8s ease-in-out infinite}.nh .flm.off .fl.o{background:linear-gradient(225deg,#D9D3CA,#B9B1A6);box-shadow:none}.nh .flm.off .fl.m{background:linear-gradient(225deg,#ECE7DF,#CFC7BB)}.nh .flm.off .fl.i{background:#F5F2EC}.nh .flm.max::before{content:'';position:absolute;left:50%;bottom:10px;width:110px;height:110px;margin-left:-55px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,60,.45),transparent 65%);animation:nhNzTw 1.6s ease-in-out infinite}.nh .ember{position:absolute;bottom:40px;width:5px;height:5px;border-radius:50%;background:#FFB13B;animation:nhEmb 1.8s ease-out infinite}.nh .flw .bv{font-family:'Fredoka',sans-serif;font-weight:600;font-size:15px;color:#C25400;white-space:nowrap}.nh .flw .bv small{font-family:'Nunito';font-size:11px;font-weight:800;color:#D9894A}.nh .wk{display:flex;flex-direction:column;gap:7px;background:#FFF8EF;border:1px solid #FBE3C4;border-radius:14px;padding:9px 10px}.nh .wkh{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:900;color:#A64B00}.nh .wkh .plus{background:#FF8A1F;color:#fff;border-radius:9px;padding:1px 7px;font-size:11px;animation:nhPop .5s cubic-bezier(.2,1.6,.4,1) both}.nh .wkh em{font-style:normal;margin-left:auto;font-weight:800;color:#C77A2E;font-size:11px}.nh .wkd{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.nh .wkd div{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;font-weight:900;color:#B08A62}.nh .wkd .c{width:32px;height:32px;border-radius:50%;background:#FFE7C7;display:flex;align-items:center;justify-content:center}.nh .wkd .hoy .c{background:#fff;border:2.5px dashed #FFB46B}.nh .wkd .hoy.lit .c{background:#FFD9A8;border:2.5px solid #FF8A1F;animation:nhPop .6s cubic-bezier(.2,1.6,.4,1) both}.nh .wkd .hoy{color:#A64B00}.nh .mf{width:14px;height:14px;border-radius:50% 0 50% 50%;transform:rotate(-45deg) translate(1px,-1px);background:linear-gradient(225deg,#FFC24B,#FF5A1F 75%);position:relative}.nh .mf::after{content:'';position:absolute;left:4px;top:4px;width:6px;height:6px;border-radius:50% 0 50% 50%;background:#FFE9A0}.nh .mf.off{background:#E6DED2}.nh .mf.off::after{background:#F3EEE6}.nh .pbar{height:10px;border-radius:6px;background:#EAE7DF;overflow:hidden}.nh .pbar i{display:block;height:100%;border-radius:6px;transition:width .9s cubic-bezier(.2,.8,.2,1)}.nh .guide{display:flex;align-items:center;gap:9px;border:1px solid #E1D8F2;background:#F7F3FD;border-radius:11px;padding:8px 10px;font-size:12px;font-weight:800;color:#4A2E86;min-height:44px;cursor:pointer}.nh .guide span:nth-child(2){flex:1;min-width:0;white-space:nowrap}.nh .guide span:last-child{white-space:nowrap;background:#6C4FB0;color:#fff;border-radius:12px;padding:3px 10px;font-size:11px}.nh .zbtn{border:0;border-radius:12px;background:var(--lg);color:#fff;font-family:'Fredoka',sans-serif;font-weight:600;font-size:15px;padding:12px 14px;cursor:pointer;min-height:46px;box-shadow:0 4px 0 #0D47A1;width:100%}.nh .say.up::before{left:26px;top:-9px;border:8px solid transparent;border-bottom-color:#FFC9DE;border-top:0}.nh .say.up::after{left:28px;top:-6px;border:6px solid transparent;border-bottom-color:#fff;border-top:0}.nh .brain{border-radius:20px;background:radial-gradient(circle at 50% 52%,#283C80,#121C45 75%);padding:12px;color:#fff;display:flex;flex-direction:column;gap:10px;box-shadow:0 6px 18px rgba(18,28,69,.35)}.nh .brain .bh{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.nh .brain .bh b{font-family:'Fredoka',sans-serif;font-weight:600;font-size:16px}.nh .brain .bh span{font-size:12px;font-weight:800;color:#9FE9FF;white-space:nowrap}.nh .brain .guide{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22);color:#fff}.nh .hub{position:relative;width:300px;height:340px;margin:0 auto}.nh .hl{position:absolute;width:104px;text-align:center;font-size:10.5px;font-weight:800;line-height:1.25;color:#E3EBFF;z-index:2;display:flex;flex-direction:column;align-items:center;gap:2px}.nh .hl.u{color:#8E9CC8}.nh .halo{position:absolute;left:150px;top:170px;width:160px;height:160px;margin:-80px 0 0 -80px;border-radius:50%;background:radial-gradient(circle,rgba(255,110,180,.6),rgba(255,110,180,0) 65%);animation:nhHlo 2s ease-in-out infinite;z-index:1;transition:opacity 1s}.nh .halo.gold{background:radial-gradient(circle,rgba(255,215,90,.75),rgba(255,215,90,0) 65%)}.nh .hcen{position:absolute;left:150px;top:170px;transform:translate(-50%,-56%);z-index:3}.nh .hcen.rdy{cursor:pointer}.nh .bfoot{font-size:11.5px;font-weight:700;color:#B8C6F0;text-align:center}.nh .zbtn.gold{background:linear-gradient(180deg,#FFD54F,#E0A000);box-shadow:0 4px 0 #A87400;color:#4A3500}.nh .fn{position:absolute;width:64px;height:64px;border-radius:50%;padding:4px;z-index:2;border:0;font-family:inherit;transition:box-shadow .8s}.nh .fn .in{position:relative;width:100%;height:100%;border-radius:50%;background:#1C2858;overflow:hidden;display:flex;align-items:center;justify-content:center}.nh .lq{position:absolute;width:140px;height:140px;left:50%;margin-left:-70px;border-radius:42%;animation:nhSpin 6s linear infinite;transition:top 1.1s cubic-bezier(.3,.9,.3,1);z-index:1}.nh .lq.b{animation-duration:9s;opacity:.55;z-index:0}.nh .fn .e{position:relative;z-index:2;font-size:22px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}.nh .fn .ck{position:absolute;right:-2px;bottom:-2px;width:21px;height:21px;border-radius:50%;background:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid;z-index:3}.nh .fn.st{cursor:pointer}.nh .fn.bump{animation:nhBump .7s cubic-bezier(.2,1.6,.4,1)}.nh .axm{position:absolute;height:3px;transform-origin:0 50%;border-radius:2px;z-index:1;transition:box-shadow .8s}.nh .hlp{font-family:'Fredoka',sans-serif;font-weight:600;font-size:13px}.nh .startb{display:flex;flex-direction:column;align-items:stretch;gap:5px}.nh .startb .zbtn{font-size:17px;min-height:54px}.nh .startb small{text-align:center;font-size:11.5px;font-weight:700;color:#B8C6F0}.nh .rbox{display:flex;align-items:center;gap:11px;background:#fff;border-radius:14px;padding:11px 12px;color:#1E2433}.nh .rbox .bi{width:44px;height:44px;border-radius:13px;background:#EEE7F9;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;position:relative}.nh .rbox .bi b{position:absolute;right:-5px;top:-5px;min-width:20px;height:20px;border-radius:10px;background:#8A6CD0;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;padding:0 5px;border:2px solid #fff}.nh .rbox .rn{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;font-weight:800;font-size:13px;line-height:1.3}.nh .rbox .rn small{font-size:11.5px;font-weight:700;color:#7A7468}.nh .rbox.rdy{box-shadow:0 0 0 2.5px #8A6CD0}.nh .rbtn{border:0;border-radius:11px;background:linear-gradient(180deg,#9C7BE0,#5B3FA0);color:#fff;font-family:'Fredoka',sans-serif;font-weight:600;font-size:13px;padding:8px 12px;cursor:pointer;white-space:nowrap;box-shadow:0 3px 0 #3E2A75}.nh .lock{font-size:11px;font-weight:900;color:#5B3FA0;background:#EEE7F9;border-radius:10px;padding:4px 9px;white-space:nowrap}.nh .zbtn.soft{background:#fff;color:#1F3A8A;box-shadow:0 3px 0 #C9D6F0;border:2px solid #C9D6F0}.nh .fn .num{position:absolute;left:-4px;top:-4px;width:19px;height:19px;border-radius:50%;background:#fff;color:#1E2433;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;z-index:3;box-shadow:0 1px 3px rgba(0,0,0,.3)}.nh .hl.sm{width:60px}.nh .lgd{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;font-size:11px;font-weight:800;color:#DCE6FF}.nh .lgd div{display:flex;align-items:center;gap:6px;min-width:0}.nh .lgd i{width:17px;height:17px;border-radius:50%;flex-shrink:0;font-style:normal;font-size:9.5px;font-weight:900;color:#fff;display:flex;align-items:center;justify-content:center}.nh .lgd span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nh .lgd b{color:#9FF0FF;font-weight:900}.nh .oblig{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#9FF0FF}.nh .oblig .tg2{background:#fff;color:#0D47A1;border-radius:7px;padding:2px 7px;letter-spacing:.04em}.nh .bonus{background:linear-gradient(160deg,#FFFBEA,#FFF3D1);border:2px dashed #E9C45A;border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:10px;color:#4A3500;position:relative}.nh .bonus.full{border-style:solid;border-color:#E0B23A;box-shadow:0 0 0 4px rgba(255,213,79,.35)}.nh .bh2{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.nh .bh2 b{font-family:'Fredoka',sans-serif;font-weight:600;font-size:16px;color:#5A3E00}.nh .bh2 .c1{font-size:10px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;background:#fff;border:1.5px solid #E9C45A;color:#8A6400;border-radius:8px;padding:2px 7px}.nh .bh2 .c2{font-size:11px;font-weight:900;background:#FFB300;color:#fff;border-radius:9px;padding:2px 8px;margin-left:auto}.nh .bud{display:flex;flex-direction:column;gap:4px;font-size:11.5px;font-weight:800;color:#7A5A00}.nh .bud .bt{display:flex;justify-content:space-between;gap:8px}.nh .bud .pbar{height:9px;background:#F3E3B0}.nh .bcs{display:flex;justify-content:space-around;gap:6px;flex-wrap:wrap}.nh .bcw{display:flex;flex-direction:column;align-items:center;gap:4px;width:68px;text-align:center;font-size:10.5px;font-weight:800;line-height:1.2;color:#5A3E00}.nh .bcw .fn{position:relative;width:46px;height:46px;padding:3px}.nh .bcw .fn .in{background:#FFF8E1}.nh .bcw .fn .e{font-size:17px}.nh .bcw small{font-size:10.5px;font-weight:900;color:#B07A00}.nh .zbtn.gold2{background:linear-gradient(180deg,#FFCA28,#F59E00);box-shadow:0 4px 0 #B87400;color:#3D2A00}.nh .bdone{display:flex;align-items:center;gap:10px;background:#fff;border:1.5px solid #E0B23A;border-radius:13px;padding:9px 11px;font-size:12.5px;font-weight:800;color:#5A3E00;line-height:1.35}.nh .bdone .ic{font-size:22px}.nh .bnote{font-size:11px;font-weight:700;color:#8A6E2E;text-align:center}.nh .halo.bon{background:radial-gradient(circle,rgba(255,200,60,.7),rgba(255,110,180,.25) 45%,rgba(255,110,180,0) 66%)}.nh .wkr{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center}.nh .wkr div{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;font-weight:900;color:#8A6E2E}.nh .wkr .wb{width:16px;height:26px;border-radius:6px;background:#F3E3B0;overflow:hidden;display:flex;align-items:flex-end}.nh .wkr .wb i{display:block;width:100%;background:linear-gradient(180deg,#FFCA28,#F59E00);border-radius:6px 6px 0 0;transition:height .6s}.nh .wkr .hoy{color:#5A3E00}.nh .wkr .hoy .wb{box-shadow:0 0 0 2px #F59E00}.nh .wkr .fut{opacity:.45}.nh .nwk{display:flex;align-items:center;gap:9px;background:#fff;border:1.5px solid #E0B23A;border-radius:12px;padding:8px 10px;font-size:12.5px;font-weight:800;color:#5A3E00;animation:nhPop .5s cubic-bezier(.2,1.6,.4,1) both}@keyframes nhNzBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes nhNzJump{0%{transform:translateY(0) scale(1.05,.95)}100%{transform:translateY(-15px) scale(.97,1.03)}}@keyframes nhNzRun{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-6px) rotate(4deg)}}@keyframes nhNzSh{50%{transform:scaleX(.78);opacity:.6}}@keyframes nhNzBlink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.08)}}@keyframes nhNzLook{0%,30%{transform:translate(0,0)}38%,52%{transform:translate(3px,1px)}60%,78%{transform:translate(-3px,1px)}86%,100%{transform:translate(0,0)}}@keyframes nhNzWave{0%,55%,100%{transform:rotate(-32deg)}12%,36%{transform:rotate(-150deg)}24%,46%{transform:rotate(-118deg)}}@keyframes nhNzUpL{0%{transform:rotate(130deg)}100%{transform:rotate(165deg)}}@keyframes nhNzUpR{0%{transform:rotate(-130deg)}100%{transform:rotate(-165deg)}}@keyframes nhNzSwL{0%{transform:rotate(10deg)}100%{transform:rotate(60deg)}}@keyframes nhNzSwR{0%{transform:rotate(-60deg)}100%{transform:rotate(-10deg)}}@keyframes nhNzFt{0%{transform:translateY(0)}100%{transform:translateY(-5px)}}@keyframes nhNzTw{0%,100%{opacity:.3;transform:scale(.7) rotate(0)}50%{opacity:1;transform:scale(1.2) rotate(20deg)}}@keyframes nhSayIn{0%{opacity:0;transform:translateX(-6px)}100%{opacity:1;transform:none}}@keyframes nhFlk{0%,100%{transform:rotate(-45deg) scale(1)}33%{transform:rotate(-41deg) scale(1.04,.95)}66%{transform:rotate(-49deg) scale(.96,1.05)}}@keyframes nhEmb{0%{transform:translate(0,0);opacity:1}100%{transform:translate(var(--dx),-70px);opacity:0}}@keyframes nhPop{0%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes nhHlo{0%,100%{transform:scale(.92)}50%{transform:scale(1.08)}}@keyframes nhBump{0%{transform:scale(1)}40%{transform:scale(1.22)}100%{transform:scale(1)}}
.nh{display:flex;flex-direction:column;gap:14px;container-type:inline-size}
.nh .nh-g{display:grid;gap:14px;align-items:start;grid-template-areas:"d" "b" "r"}
@container (min-width:720px){.nh .nh-g{grid-template-columns:minmax(0,1.12fr) minmax(0,1fr);grid-template-areas:"b d" "b r"}}
.nh .nh-col{display:flex;flex-direction:column;gap:14px;min-width:0}
.nh .zbtn{box-shadow:0 4px 0 rgba(0,0,0,.28)}.nh .zbtn:disabled{opacity:.7;cursor:default}
.nh .zbtn.gold2{box-shadow:0 4px 0 #B87400}
.nh .fn{cursor:pointer}.nh .fn.lk{opacity:.55}.nh .fn.nc{cursor:default}
.nh .hl .nm{max-width:104px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nh .bh2 b{font-size:15px}
.nh .brain .guide{width:100%;text-align:left;font:inherit;font-weight:800;font-size:12px}
.nh .nh-empty{font-size:13px;font-weight:700;color:#C9D6FF;text-align:center;line-height:1.5;padding:8px 4px}
.nh .pbar{height:9px;border-radius:6px;background:#EDE6D6;overflow:hidden}.nh .pbar i{display:block;height:100%;border-radius:6px;transition:width .6s}
@media(max-width:350px){.nh .hub{transform:scale(.9);transform-origin:50% 0;margin-bottom:-34px}}
.nh button.hchip{border:0;font-family:inherit;cursor:pointer;position:relative}.nh button.hchip::after{content:'';position:absolute;inset:-12px -3px}.nh button.hchip:focus-visible{outline:2px solid #8A6400;outline-offset:2px}.nh .hchip .xq{width:15px;height:15px;border-radius:50%;background:#8A6400;color:#FFF7CC;font-size:10px;font-weight:900;line-height:1;display:inline-flex;align-items:center;justify-content:center}
@keyframes nhSpin{to{transform:rotate(360deg)}}
`;
(function injectNhCSS() { if (typeof document === 'undefined' || document.getElementById('nh-css')) return; const st = document.createElement('style'); st.id = 'nh-css'; st.textContent = NH_CSS; document.head.appendChild(st); })();

const NH_COLORS = ['#FFB300', '#4FC3F7', '#F06292', '#81C784', '#BA68C8', '#FF8A65', '#4DB6AC', '#9575CD', '#AED581', '#7986CB'];
const NH_TYPE_ICO = { story: '📗', dialog: '📗', reading: '📖', listening: '🎧', grammar: '📝', summary: '📚', quizlet: '🃏' };
const NH_DAYN = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D'];
const NH_MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const nhPeruDay = (t) => new Date((t == null ? Date.now() : t) - 5 * 3600e3).toISOString().slice(0, 10);
const nhTime = (t) => new Date(t).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
function nhDur(ms) { const m = Math.max(1, Math.ceil(ms / 60000)), h = Math.floor(m / 60); return (h ? h + ' h ' : '') + (m % 60 ? (m % 60) + ' min' : ''); }
function nhIco(type, url) {
  const u = String(url || '');
  if (/identify\.html/i.test(u)) return '🔎';
  if (/transform\.html/i.test(u)) return '🔄';
  if (/fill\.html/i.test(u)) return '📝';
  return NH_TYPE_ICO[type] || '📄';
}
function nhShort(type, label, url) {
  if (type === 'story' || type === 'dialog') return 'Story';
  if (type === 'reading') return 'Lectura';
  if (type === 'listening') return 'Listening';
  if (type === 'quizlet') return 'Quizlet';
  if (type === 'summary') return 'Resumen';
  const t = String(label || '').match(/\bT\d+\b/), u = String(url || '');
  const k = /identify\.html/i.test(u) ? 'Identify' : /transform\.html/i.test(u) ? 'Transform' : /fill\.html/i.test(u) ? 'Fill in' : '';
  if (t && k) return t[0] + ' · ' + k;
  return String(label || '').split('·')[0].trim().slice(0, 18) || 'Práctica';
}
function nhLayout(N) {
  const sz = N <= 6 ? 60 : N <= 8 ? 52 : 46, R = N <= 6 ? 108 : N <= 8 ? 116 : 122, cy = 168, start = N % 2 ? -90 : -90 + 180 / N, pos = [];
  for (let i = 0; i < N; i++) { const a = (start + i * 360 / N) * Math.PI / 180; pos.push([150 + R * Math.cos(a), cy + R * Math.sin(a)]); }
  return { sz, cy, pos };
}

function NeuroFace({ z, anim, mood, wave, sparks }) {
  return (
    <div className={'nz ' + (anim || 'idle')} style={{ '--z': z }}>
      <div className="nz-sc"><span className="nz-sh"></span>
        <div className="nz-an">
          <span className="nz-arm l"></span><span className={'nz-arm r' + (wave ? ' wave' : '')}></span>
          <div className="nz-br"><span className="nz-fd a"></span><span className="nz-fd b"></span><span className="nz-ey l"><i></i></span><span className="nz-ey r"><i></i></span><span className={'nz-mo ' + (mood || 'smile')}></span><span className="nz-ck l"></span><span className="nz-ck r"></span></div>
          <div className="nz-ft"><span></span><span></span></div>
          {sparks && <><span className="nz-sp" style={{ left: -10, top: -4 }}>✦</span><span className="nz-sp" style={{ right: -12, top: 10, animationDelay: '.5s' }}>✦</span><span className="nz-sp" style={{ left: 40, top: -18, animationDelay: '.9s' }}>✦</span></>}
        </div>
      </div>
    </div>
  );
}

function NhFlame({ mins, goal, lit }) {
  const f = Math.min(1, mins / Math.max(1, goal)), sc = lit ? .55 + .45 * f : .5, n = lit ? (f >= 1 ? 7 : 3) : 0;
  return (
    <div className="flw">
      <div className={'flm' + (lit ? '' : ' off') + (f >= 1 ? ' max' : '')}>
        <div className="fa" style={{ transform: `scale(${sc})` }}><span className="fl o"></span><span className="fl m"></span><span className="fl i"></span></div>
        {Array.from({ length: n }).map((_, i) => <span key={i} className="ember" style={{ left: 38 + i * 4, '--dx': ((i % 2 ? 1 : -1) * (8 + i * 3)) + 'px', animationDelay: (i * .3) + 's' }}></span>)}
      </div>
      <span className="bv">{Math.min(mins, goal)}<small> / {goal} min</small></span>
    </div>
  );
}

function NhNode({ n, x, y, sz, num, onClick }) {
  const p = Math.max(0, Math.min(100, n.pct || 0)), E = (sz - 8) * (1 - p / 100) - 4;
  return (
    <button type="button" className={'fn' + (n.locked ? ' lk' : '') + (onClick ? '' : ' nc')} title={n.full || n.short} onClick={onClick || undefined}
      style={{ ...(x != null ? { left: x - sz / 2, top: y - sz / 2 } : {}), width: sz, height: sz, background: `conic-gradient(${n.color} ${p}%, rgba(160,180,240,.22) ${p}%)`, boxShadow: `0 0 ${Math.round(p / 100 * 20)}px ${n.color}` }}>
      <span className="in">
        <span className="lq b" style={{ top: E + 3, background: n.color }}></span>
        <span className="lq" style={{ top: E, background: `linear-gradient(180deg,${n.color},rgba(0,0,0,.15)),${n.color}` }}></span>
        <span className="e" style={{ fontSize: Math.round(sz * .36) }}>{n.locked ? '🔒' : n.ico}</span>
      </span>
      {p >= 100 && <span className="ck" style={{ color: n.color, borderColor: n.color }}>✓</span>}
      {num ? <span className="num">{num}</span> : null}
    </button>
  );
}

function NeuroPractice({ student, settings, onBack, helpers, extras, explore, coach }) {
  const MIX = window.JUCUM_MIX, D = window.JUCUM_DATA, TT = window.JUCUM_TT;
  const uid = student.id;
  const H = helpers || {};
  const [tab, setTab] = React.useState(() => { try { return sessionStorage.getItem('jucum_nh_tab_v1') || 'hoy'; } catch (e) { return 'hoy'; } });
  const [showCoach, setShowCoach] = React.useState(false);
  const [coachTopic, setCoachTopic] = React.useState(null);   // XP-EXPLICA-V1: 0 = Neuro abre “⚡ ¿Cómo subo mi XP?”
  const [mats, setMats] = React.useState(null);
  const [rev, setRev] = React.useState(null);
  const [run, setRun] = React.useState(null);
  const [sum, setSum] = React.useState(null);
  const [, setTick] = React.useState(0);
  const refresh = () => setTick(t => t + 1);
  const runRef = React.useRef(null); runRef.current = run;
  const goTab = (t) => { setTab(t); try { sessionStorage.setItem('jucum_nh_tab_v1', t); } catch (e) {} };

  React.useEffect(() => {
    let alive = true; MIX._lastUid = uid;
    Promise.all([MIX.todayMaterials(student).catch(() => []), MIX.weekReviews(student).catch(() => null)]).then(([ms, r]) => {
      if (!alive) return;
      setMats(ms || []); setRev(r);
      MIX.pull(uid, (ms || []).concat(r ? r.mats : [])).then(() => MIX.refreshReady(uid)).then(() => alive && refresh());
      MIX.flush(uid);
    });
    const iv = setInterval(() => alive && refresh(), 60000);
    return () => { alive = false; clearInterval(iv); };
  }, [uid]);
  React.useEffect(() => { if (run || sum) { const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o; }; } }, [!!(run || sum)]);
  React.useEffect(() => { // latido de Clase en vivo mientras la sesión está abierta (cada 20 s)
    if (!run) return;
    const iv = setInterval(() => { const r = runRef.current; if (!r || document.hidden) return; const st = r.seq[r.k]; const m = st && r.pool.find(x => x.key === st.mat);
      MIX.live(student, 'active', m, (r.secs + Math.min(MIX.CFG.maxSecQ, (Date.now() - r.shownAt) / 1000)) / 60); }, 20000);
    return () => clearInterval(iv);
  }, [!!run]);

  /* ── lo del profe hoy → nodos alrededor de Neuro ── */
  const todayISO = nhPeruDay();
  const tp = TT ? TT.getTodayPracticeForStudent(student, todayISO) : { items: [] };
  const items = (tp && tp.items) || [];
  const mods = D.MODULE_CATALOG[student.level] || [];
  const prog = D.getStudentProgress(uid);
  const nodes = items.map((it, i) => {
    const mod = mods.find(m => m.id === it.moduleId); const a = mod && (mod.activities || []).find(x => x.id === it.activityId);
    if (!mod || !a) return null;
    const key = mod.id + ':' + a.id, mm = mats ? mats.find(m => m.key === key) : null, type = a.type || it.type;
    const story = type === 'story' || type === 'dialog', noGrade = story || type === 'summary' || type === 'quizlet';
    const e = prog.completed[key], doneToday = !!(e && e.date && nhPeruDay(Date.parse(e.date)) === todayISO);
    let pct, label, conn;
    if (mm) { const p = MIX.matProgress(uid, mm); pct = p.pct; conn = pct >= 100; label = conn ? (p.graded != null ? '✓ Nota ' + p.graded + '%' : '✓') : pct + '%'; }
    else if (story) { pct = doneToday ? 100 : 0; conn = doneToday; label = doneToday ? 'Leída ✓' : 'Leer 4 min'; }
    else {
      const sc = doneToday && !noGrade ? (D.scorePct ? D.scorePct(e.score) : e.score) : null;
      const passed = doneToday && (noGrade || D.entryPassed(e, student.level, student.group));
      pct = doneToday ? (passed ? 100 : Math.max(10, sc || 0)) : 0; conn = doneToday;
      label = doneToday ? (sc != null ? (passed ? '✓ ' : '↻ ') + sc + '%' : '✓ Hecho') : 'Abrir ›';
    }
    const href = H.linkFor ? H.linkFor(a, mod, uid) : null;
    let qGame = null;
    if (type === 'quizlet' && H.quizletGames) { const gs = H.quizletGames(a); const g = gs.find(x => x.key === it.quizKey) || gs[0]; qGame = g ? { ...g, url: it.quizUrl || g.url } : (it.quizUrl ? { key: it.quizKey, url: it.quizUrl } : null); }
    const locked = !!(H.isLockHref && H.isLockHref(href)) && !conn;
    return { i, key, it, mod, a, type, mm, pct, label, conn, href, qGame, locked, short: nhShort(type, it.label || a.name, a.url), full: it.label || a.name, color: NH_COLORS[i % NH_COLORS.length], ico: nhIco(type, a.url) };
  }).filter(Boolean);
  const N = nodes.length, connN = nodes.filter(n => n.conn).length, allConn = N > 0 && connN === N;

  const openNode = (n) => {
    if (n.mm) { if (n.pct < 100) start('mix'); return; }
    if (n.locked) { H.showLockToast && H.showLockToast(H.lockMsgOf(n.href)); return; }
    if (n.qGame) { try { D.markActivityComplete(uid, n.mod.id, n.a.id, null, 0, { quizlet: n.qGame.key }); } catch (e) {} window.open(n.qGame.url, '_blank', 'noopener'); setTimeout(refresh, 600); return; }
    if (n.href && H.openMat) H.openMat(n.href);
  };

  /* ── sesión mixta / caja / bonus ── */
  const colorOf = (pool) => (k) => { const i = pool.findIndex(m => m.key === k); const nd = nodes.find(x => x.key === k); return nd ? nd.color : NH_COLORS[(i + 3) % NH_COLORS.length]; };
  const start = (mode) => {
    const pool = mode === 'bonus' ? (rev ? rev.mats : []) : (mats || []);
    if (!pool.length) return;
    const seq = MIX.buildSession(uid, pool, mode === 'box' ? 'box' : 'mix', mode === 'bonus' ? 6 : undefined);
    if (!seq.length) { refresh(); return; }
    const before = {}; pool.forEach(m => { before[m.key] = MIX.matProgress(uid, m).pct; });
    setSum(null); setRun({ mode, pool, seq, k: 0, chosen: null, res: [], before, shownAt: Date.now(), secs: 0, won: [], lastWon: null });
    MIX.live(student, 'start', pool.find(m => m.key === seq[0].mat), 0);
  };
  const startBox = () => { MIX.refreshReady(uid).then(() => { refresh(); start('box'); }); };
  const onAnswered = (r, res, secs) => {
    const st = r.seq[r.k], m = r.pool.find(x => x.key === st.mat);
    MIX.live(student, res.matDone ? 'done' : 'active', m, secs / 60, res.matDone ? res.score : null);
  };
  const finish = (r) => {
    const secs = r.secs + (r.chosen === null ? Math.min(MIX.CFG.maxSecQ, (Date.now() - r.shownAt) / 1000) : 0);
    MIX.addSeconds(uid, Math.round(secs), (r.pool[0] || {}).moduleId);
    let xp = 0;
    if (r.mode === 'bonus' && r.res.length) { xp = r.res.filter(x => x.ok).length * 2 + (r.res.length === r.seq.length ? 8 : 0); try { if (xp && D.addBonusXP) D.addBonusXP(uid, xp); } catch (e) {} }
    MIX.flush(uid);
    const allDone = (mats || []).length > 0 && mats.every(m => MIX.matProgress(uid, m).pct >= 100);
    const last = r.seq[Math.min(r.k, r.seq.length - 1)];
    MIX.live(student, r.mode !== 'bonus' && allDone ? 'done' : 'paused', last && r.pool.find(m => m.key === last.mat), secs / 60);
    if (r.res.length) { const after = {}; r.pool.forEach(m => { after[m.key] = MIX.matProgress(uid, m).pct; }); setSum({ mode: r.mode, pool: r.pool, res: r.res, before: r.before, after, won: r.won, xp }); }
    setRun(null); refresh();
  };

  /* ── Tu día ── */
  const target = (settings && settings.dailyTargetMin) || 15;
  const todayMin = prog.todayMinutes || 0;
  const lit = todayMin > 0 || connN > 0;
  const streak = student.streak || 0;
  const active = (() => { const s = new Set(); try { if (D.getExtraActiveDays) D.getExtraActiveDays(uid).forEach(d => s.add(d)); } catch (e) {}
    Object.values(prog.completed || {}).forEach(e => { if (e && e.date) s.add(nhPeruDay(Date.parse(e.date))); }); return s; })();
  const week = Array.from({ length: 7 }).map((_, i) => { const t = Date.now() - (6 - i) * 86400e3, k = nhPeruDay(t), wd = (new Date(k + 'T12:00:00Z').getUTCDay() + 6) % 7; return { k, lab: NH_DAYN[wd], on: active.has(k) }; });
  const left = Math.max(0, target - todayMin);
  const say = allConn ? '¡Cerebro conectado! 💛 Hoy cumpliste todo lo del profe'
    : todayMin >= target ? '¡Meta cumplida! 🎉 Lo que sigas practicando hoy fortalece tu memoria 🧠'
    : !lit ? (N ? `¡Hola! Hoy conectamos ${N} ${N === 1 ? 'idea nueva' : 'ideas nuevas'} en tu cerebro 🧠` : '¡Hola! Hoy tu profe no dejó práctica: mira 🧭 Explorar 🧠')
    : `¡Siento las conexiones! ${left} min más y tu llama queda al máximo`;
  let xpAll = 0; try { xpAll = D.getStudentXP ? D.getStudentXP(student) : 0; } catch (e) {}
  const openXP = () => { if (showCoach && coachTopic === 0) { setShowCoach(false); return; } setCoachTopic(0); setShowCoach(true); };

  /* ── Cómo practicar hoy (instructivo del set del profe) ── */
  const plansToday = (TT && TT.getPracticePlansForStudentOnDate ? TT.getPracticePlansForStudentOnDate(student, todayISO) : []).filter(p => p.assignToStudents !== false);
  const planWithGuide = plansToday.find(p => p.guide && p.guide.steps && p.guide.steps.length);
  const openGuide = () => {
    if (!window.JUCUM_GUIDE) return;
    const g = planWithGuide ? planWithGuide.guide : window.JUCUM_GUIDE.build(student.level, items.map(it => ({ moduleId: it.moduleId, activityId: it.activityId, label: it.label, type: it.type })), '', { title: 'Cómo practicar hoy' });
    const links = (g.steps || []).map(s => {
      const mod = mods.find(m => m.id === s.moduleId); const a = mod && (mod.activities || []).find(x => x.id === s.activityId);
      if (mod && a && a.type === 'quizlet' && H.quizletGames) { const gs = H.quizletGames(a); const q = gs.find(x => x.key === s.quizKey) || gs[0]; return s.quizUrl || (q && q.url) || null; }
      return (mod && a && H.linkFor) ? H.linkFor(a, mod, uid) : null;
    });
    window.JUCUM_GUIDE.openOverlay(g, { links, studentName: (student.fullName || '').split(' ')[0] });
  };

  /* ── botón principal ── */
  const pool = mats ? mats.reduce((a, m) => a + MIX.matProgress(uid, m).pending, 0) : 0;
  const nOpen = Math.min(MIX.CFG.size, pool);
  const box = MIX.boxStatus(uid, mats || []);
  const nextOther = nodes.find(n => !n.conn && !n.mm && !n.locked);
  const L = nhLayout(Math.max(1, N));
  const avg = N ? nodes.reduce((a, n) => a + n.pct, 0) / N / 100 : 0;
  const ws = MIX.weekState(uid) || {}, dayIdx = MIX.weekDayIdx(), bonusToday = !!(ws.log && ws.log[dayIdx]);

  const brain = (
    <div className="brain">
      <div className="bh"><b>Tu cerebro hoy</b><span>{N ? `${connN} de ${N} conectados` : 'sin práctica del profe'}</span></div>
      {N > 0 && <div className="oblig"><span className="tg2">Del profe</span>lo que tienes que hacer hoy</div>}
      {N > 0 && window.JUCUM_GUIDE && <button type="button" className="guide" onClick={openGuide}><span>📋</span><span>Cómo practicar hoy</span><span>Ver →</span></button>}
      {N > 0 && (
        <div className="startb">
          {!mats ? <button type="button" className="zbtn" disabled>Preparando tus ejercicios…</button>
            : pool > 0 ? <><button type="button" className="zbtn" onClick={() => start('mix')}>▶ Empezar{mats.some(m => MIX.matProgress(uid, m).answered > 0) ? ' otra ronda' : ''}</button><small>{nOpen} ejercicios mezclados de tus prácticas · ≈ {Math.max(1, Math.round(nOpen * MIX.CFG.secPerQ / 60))} min</small></>
            : nextOther ? <><button type="button" className="zbtn" onClick={() => openNode(nextOther)}>▶ Sigue: {nextOther.full || nextOther.short}</button><small>{nextOther.type === 'story' ? 'Se marca al leer 4 minutos' : 'Se abre el material como siempre'}</small></>
            : <div className="bfoot" style={{ color: '#9FF0FF', fontSize: 13 }}>{allConn ? '🎉 ¡Respondiste todo lo del profe!' : '¡Respondiste todos los ejercicios!'}{box.total ? ' Solo falta tu caja de errores.' : ''}</div>}
        </div>
      )}
      {N > 0 ? (
        <div className="hub">
          {nodes.map((n, i) => { const [px, py] = L.pos[i], dx = 150 - px, dy = L.cy - py, len = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
            return <span key={'a' + i} className="axm" style={{ left: px, top: py - 1.5, width: len, transform: `rotate(${ang}deg)`, background: `linear-gradient(90deg,${n.color} 0,${n.color} ${n.pct}%,rgba(160,180,240,.22) ${n.pct}%)`, ...(n.pct >= 100 ? { boxShadow: '0 0 10px ' + n.color, height: 4 } : {}) }}></span>; })}
          <span className={'halo' + (allConn ? ' gold' : bonusToday ? ' bon' : '')} style={{ top: L.cy, opacity: .25 + .75 * Math.max(avg, bonusToday ? .6 : 0) }}></span>
          <div className="hcen" style={{ top: L.cy }}><NeuroFace z={N <= 6 ? .74 : .66} anim={allConn ? 'cheer' : 'idle'} mood={lit ? 'grin' : 'smile'} wave={!lit} sparks={allConn || bonusToday} /></div>
          {nodes.map((n, i) => { const [px, py] = L.pos[i];
            const click = (n.mm && n.pct < 100 && pool > 0) || (!n.mm && !(n.conn && n.type === 'story')) ? () => openNode(n) : null;
            return (
              <React.Fragment key={'n' + i}>
                <NhNode n={n} x={px} y={py} sz={L.sz} num={N > 6 ? i + 1 : 0} onClick={click} />
                {N <= 6
                  ? <div className="hl" style={{ left: px - 52, top: py + L.sz / 2 + 3 }}><span className="nm">{n.short}</span><span className="hlp" style={{ color: n.color }}>{n.locked ? '🔒' : n.label}</span></div>
                  : <div className="hl sm" style={{ left: px - 30, top: py + L.sz / 2 + 2 }}><span className="hlp" style={{ color: n.color, fontSize: 12 }}>{n.pct >= 100 ? '✓' : n.locked ? '🔒' : n.pct + '%'}</span></div>}
              </React.Fragment>
            ); })}
        </div>
      ) : (
        <div className="nh-empty"><NeuroFace z={.7} anim="idle" mood="smile" wave /><div>Hoy tu profe no dejó práctica. Puedes avanzar a tu ritmo en <b>🧭 Explorar</b> o hacer tu repaso bonus ⭐</div></div>
      )}
      {N > 6 && <div className="lgd">{nodes.map((n, i) => <div key={i}><i style={{ background: n.color }}>{i + 1}</i><span>{n.full || n.short}</span><b>{n.mm ? n.pct + '%' : n.label}</b></div>)}</div>}
      {box.total > 0
        ? <div className={'rbox' + (box.ready ? ' rdy' : '')}><span className="bi">🧠<b>{box.total}</b></span><span className="rn">Caja de errores<small>{box.ready ? `${box.ready} listo${box.ready > 1 ? 's' : ''} para repasar` : `Se abre a las ${nhTime(box.next)} (en ${nhDur(box.next - Date.now())})`}{box.tomorrow ? ` · ${box.tomorrow} vuelve${box.tomorrow > 1 ? 'n' : ''} mañana` : ''} · cuenta para tu 100%</small></span>
            {box.ready ? <button type="button" className="rbtn" onClick={startBox}>Repasar {Math.min(10, box.ready)}</button> : <span className="lock">🔒 {nhDur(box.next - Date.now())}</span>}</div>
        : (mats && mats.length > 0) ? <div className="bfoot">Lo que falles se guarda en tu caja de errores y vuelve 2 horas después 🧠</div> : null}
    </div>
  );

  /* ── ⭐ Repasos de la semana (opcional) ── */
  let bonus = null;
  if (rev && rev.mats.length) {
    const R = rev.mats.map((m, i) => { const p = MIX.matProgress(uid, m); return { m, p, n: { pct: p.pct, color: NH_COLORS[(i + 3) % NH_COLORS.length], ico: nhIco('grammar', m.url), short: m.name } }; });
    const T = R.length, dn = R.filter(x => x.p.pct >= 100).length, full = dn >= T;
    const resolved = R.reduce((a, x) => a + x.p.ok, 0), totItems = R.reduce((a, x) => a + x.p.total, 0), pend = totItems - resolved;
    const mon = new Date(rev.wk + 'T12:00:00Z'), sun = new Date(mon.getTime() + 6 * 86400e3), nextMon = new Date(mon.getTime() + 7 * 86400e3);
    const wkLabel = 'Semana ' + mon.getUTCDate() + (mon.getUTCMonth() !== sun.getUTCMonth() ? ' ' + NH_MON[mon.getUTCMonth()] : '') + '–' + sun.getUTCDate() + ' ' + NH_MON[sun.getUTCMonth()];
    const log = ws.log || {}, daysLeft = 7 - dayIdx;
    bonus = (
      <div className={'bonus' + (full ? ' full' : '')}>
        {rev.isNew && <div className="nwk">🎉 ¡Semana nueva! Neuro preparó tus repasos</div>}
        <div className="bh2"><b>⭐ Repasos de la semana</b><span className="c1">Opcional</span><span className="c2">x2 XP</span></div>
        <div className="bud">
          <div className="bt"><span><b>{dn} de {T}</b> repasos completos</span><span>{wkLabel}</span></div>
          <div className="pbar" style={{ background: '#F3E3B0' }}><i style={{ width: (totItems ? resolved / totItems * 100 : 0) + '%', background: 'linear-gradient(90deg,#FFCA28,#F59E00)' }}></i></div>
          <div className="bt" style={{ fontWeight: 700 }}><span>{resolved} de {totItems} ejercicios resueltos</span><span>tope {rev.levelName}: {Math.round(rev.pct * 100)}%</span></div>
        </div>
        <div className="wkr">{NH_DAYN.map((d, i) => <div key={i} className={(i === dayIdx ? 'hoy' : '') + (i > dayIdx ? ' fut' : '')}><span className="wb"><i style={{ height: Math.min(100, (log[i] || 0) / 8 * 100) + '%' }}></i></span>{i === dayIdx ? 'Hoy' : d}</div>)}</div>
        <div className="bcs">{R.map((x, i) => <div className="bcw" key={i}><NhNode n={x.n} sz={46} onClick={null} /><span>{x.m.name}</span><small>{x.p.pct >= 100 ? '✓ completo' : x.p.pct + '%'}</small></div>)}</div>
        {full
          ? <div className="bdone"><span className="ic">🧠✨</span><span>¡Repasos de la semana completos! Neuro quedó brillante. El <b>lunes {nextMon.getUTCDate()} {NH_MON[nextMon.getUTCMonth()]}</b> llegan repasos nuevos.</span></div>
          : pend > 0 ? <><button type="button" className="zbtn gold2" onClick={() => start('bonus')}>⭐ Hacer repaso bonus · {Math.min(6, pend)} ejercicios</button><div className="bnote" style={{ marginTop: -4 }}>Sugerido: un repaso por día · te {daysLeft === 1 ? 'queda 1 día' : `quedan ${daysLeft} días`} esta semana</div></> : null}
        <div className="bnote">Lo que resuelves queda completo toda la semana · no cuenta como pendiente y nunca te quita puntos</div>
      </div>
    );
  }

  const dayCard = (
    <div className="day">
      <div className="dlab"><b>Tu día</b><span>{left ? `Tu llama · faltan ${left} min` : '¡Llama al máximo!'}</span></div>
      <div className="dtop">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
          <NeuroFace z={.72} anim={todayMin >= target ? 'cheer' : 'idle'} mood={lit ? 'grin' : 'smile'} wave={!lit} sparks={todayMin >= target} />
          <div className="say" style={{ marginLeft: 10 }}>{say}</div>
        </div>
        <NhFlame mins={todayMin} goal={target} lit={lit} />
      </div>
      <div className="wk">
        <div className="wkh"><span className={'mf' + (lit ? '' : ' off')}></span>Racha de {streak} {streak === 1 ? 'día' : 'días'}<em>{lit ? '¡encendida hoy!' : 'enciéndela hoy'}</em></div>
        <div className="wkd">{week.map((d, i) => i < 6
          ? <div key={i}><span className="c"><span className={'mf' + (d.on ? '' : ' off')}></span></span>{d.lab}</div>
          : <div key={i} className={'hoy' + (lit ? ' lit' : '')}><span className="c"><span className={'mf' + (lit ? '' : ' off')}></span></span>Hoy</div>)}</div>
      </div>
    </div>
  );

  const pendN = N - connN;
  return (
    <main className="nh">
      <div className="ph">
        <button type="button" className="back-btn" onClick={onBack} style={{ marginBottom: 0 }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ttl">Mi práctica</div>
          <div className="hchips"><span className="hchip fire"><span className={'mf' + (lit ? '' : ' off')} style={{ width: 11, height: 11 }}></span>{streak} {streak === 1 ? 'día' : 'días'}</span><button type="button" className="hchip xp" onClick={openXP} aria-expanded={showCoach && coachTopic === 0} title="¿Cómo subo mi XP?">⚡ {xpAll} XP<span className="xq">?</span></button></div>
        </div>
        <button type="button" className="nzb" onClick={() => { setCoachTopic(null); setShowCoach(v => !v); }} title="Neuro te explica"><NeuroFace z={.4} anim="idle" mood="smile" /><span className="q">?</span></button>
      </div>
      {showCoach && (coachTopic != null && React.isValidElement(coach) ? React.cloneElement(coach, { startTopic: coachTopic, key: 'xp' + coachTopic }) : coach)}
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'hoy'} className={tab === 'hoy' ? 'on' : ''} onClick={() => goTab('hoy')}>🎯 Hoy{pendN > 0 ? <span className="n">{pendN}</span> : null}</button>
        <button type="button" role="tab" aria-selected={tab === 'ex'} className={tab === 'ex' ? 'on' : ''} onClick={() => goTab('ex')}>🧭 Explorar</button>
      </div>
      {tab === 'hoy' ? (
        <>
          <div className="nh-g">
            <div className="nh-col" style={{ gridArea: 'd' }}>{dayCard}</div>
            <div className="nh-col" style={{ gridArea: 'b' }}>{brain}</div>
            {bonus && <div className="nh-col" style={{ gridArea: 'r' }}>{bonus}</div>}
          </div>
          {extras}
        </>
      ) : <div>{explore}</div>}
      {run && window.MixedPlayer && <MixedPlayer uid={uid} mats={run.pool} run={run} setRun={setRun} color={colorOf(run.pool)} onFinish={finish} onAnswered={onAnswered} />}
      {sum && window.MixedSummary && <MixedSummary uid={uid} mats={sum.pool} sum={sum} color={colorOf(sum.pool)}
        pending={sum.pool.reduce((a, m) => a + MIX.matProgress(uid, m).pending, 0)}
        onAgain={() => start(sum.mode === 'bonus' ? 'bonus' : 'mix')} onClose={() => { setSum(null); refresh(); }} />}
    </main>
  );
}

Object.assign(window, { NeuroPractice, NeuroFace });
