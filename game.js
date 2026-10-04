/* ================= PLAYABLES PLATFORM LAYER (state) ================= */
/* The YouTube Playables SDK (global `ytgame`) is loaded by index.html BEFORE this file.
   YT is null outside Playables (local testing): every platform call is then skipped and progress lives in memory only. */
const YT=(typeof ytgame!=='undefined'&&ytgame&&ytgame.IN_PLAYABLES_ENV)?ytgame:null;
let ytPaused=false,booted=false;   /* ytPaused: platform pause (onPause..onResume). booted: first interactive frame is on screen. */
const YA={on:true};                /* YouTube audio state (ytgame.system.isAudioEnabled / onAudioEnabledChange) */
const hlog=(()=>{let n=0;return kind=>{if(!YT||!YT.health||n++>20)return;try{kind==='e'?YT.health.logError():YT.health.logWarning();}catch(_){/* SDK health logging is best-effort and rate-limited by design */}};})();

/* ================= CONFIG & DATA ================= */
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const W=480,H=760,GS=610,G=1900,JV=745,R=17,MC=2.2,MAX_DPR=2;
let FS=1,fitDirty=true;            /* FS = css pixels per logical unit */
/* Responsive layout: the css size follows the viewport immediately; the canvas backing store is only re-allocated right
   before a frame is drawn (never while the platform has us paused). Resizing never touches game state. */
function layout(){const bw=document.body.clientWidth||innerWidth,bh=document.body.clientHeight||innerHeight;FS=Math.max(.01,Math.min(bw/W,bh/H));cv.style.width=W*FS+'px';cv.style.height=H*FS+'px';fitDirty=true;}
function applyFit(){if(!fitDirty)return;fitDirty=false;const d=Math.min(MAX_DPR,Math.max(1,devicePixelRatio||1)),pw=Math.max(1,Math.round(W*FS*d)),ph=Math.max(1,Math.round(H*FS*d));
 if(cv.width!==pw||cv.height!==ph){cv.width=pw;cv.height=ph;}ctx.setTransform(pw/W,0,0,ph/H,0,0);}
addEventListener('resize',layout);layout();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=(a,b)=>a+Math.random()*(b-a);
const mkSV=()=>({coins:0,best:0,skin:0,own:[1,0,0,0,0,0,0,0,0,0],up:[0,0,0],net:0,g:0,stars:0,perf:0,streak:0,done:[],xp:0,ach:[],landings:0,jumps:0,bestCombo:0,collapses:0,time:0,earned:0,quakes:0,heavy:0,bigFall:0,mute:0,camp:[],relics:[],hat:-1,d:null,dm:null,dstreak:0,dlast:0,bosses:0,shk:2,cb:0,hap:1,tut:0,cc:0,bestY:0,gld:0,chests:0,wk:null});
const SV=mkSV();
/* Progression is persisted ONLY through the Playables cloud save (see Cloud). save(1) = urgent milestone, save() = debounced. */
const save=u=>Cloud.mark(u);
const SK=[['Sunny','#ffe58a','#f2a93b','#8a5416',0,1],['Mint','#c8ffe0','#3fbf8a','#1d6b4a',40,2],['Berry','#ffc2e4','#d03c8c','#7a1f55',80,4],['Sky','#cfe9ff','#3a86d6','#1d4a85',150,6],['Ghost','#ffffff','#a9b6ff','#4a5499',250,9],['Lava','#ffd0a0','#ff5a2a','#7a1a0a',300,10],['Lime','#f0ffb0','#8fd62a','#3c6b0a',350,12],['Grape','#e8c8ff','#8a4ad8','#43207a',400,15],['Cosmos','#b8b0ff','#3a2a9a','#150f4a',600,20],['Gold','#fff3b0','#e6b800','#7a5a00',1000,25]];
const UP=[['Slow slabs','Slabs move 8% slower per level',[60,120,200]],['Wide slabs','Slabs are 7% wider per level',[60,120,200]],['Sturdy tower','Wind and quakes shake it less',[80,160,260]]];
const NETC=40;
const TK=[['Build 10 levels in one run','best',10,25],['Collect a star','stars',1,30],['Land 3 perfect in a row','streak',3,20],['Play 5 games','g',5,25],['Reach 25 levels','best',25,100],['Reach a 5x combo','bestCombo',5,60],['Make 40 perfect landings','perf',40,80],['Survive an earthquake','quakes',1,70],['Grab 15 air coins','cc',15,50],['Land 10 heavy slabs','heavy',10,60],['Collapse a tower','collapses',1,15],['Reach 15 levels','best',15,45],['Defeat a boss','bosses',1,120],['Earn 300 coins','earned',300,50],['Land 250 slabs','landings',250,100],['Reach a 10x combo','bestCombo',10,120],['Collect 5 stars','stars',5,70],['Survive 3 quakes','quakes',3,90],['Reach 40 levels','best',40,150],['Land 5 golden slabs','gld',5,90],['Play 20 games','g',20,80],['Make 400 jumps','jumps',400,70]];
const DMK=[['Land 30 slabs','landings',30,40],['Land 12 perfects','perf',12,50],['Play 3 games','g',3,30],['Grab 8 air coins','cc',8,40],['Jump 150 times','jumps',150,35]];
const dmInit=()=>{if(!SV.dm||SV.dm.day!==today())SV.dm={day:today(),b:DMK.map(k=>SV[k[1]]||0),c:[0,0,0]};};
const dmPick=()=>{const q=seedD()>>>4;return[q%5,(q+2)%5,(q+3)%5];};
const WKK=[['Land 400 slabs','landings',400,300],['Land 120 perfects','perf',120,350],['Play 25 games','g',25,250]],wkI=()=>Math.floor((today()+3)/7),wkInit=()=>{if(!SV.wk||SV.wk.w!==wkI()){const k=WKK[wkI()%3];SV.wk={w:wkI(),b:SV[k[1]]||0,done:0};}};
const ACH=[['First Steps','Land a slab',()=>SV.landings>=1],['Tall Order','Reach 20 levels',()=>SV.best>=20],['Sky High','Reach 50 levels',()=>SV.best>=50],['Combo Master','Hit an 8x combo',()=>SV.bestCombo>=8],['Star Collector','Collect 10 stars',()=>SV.stars>=10],['Heavy Lifter','Land 10 heavy slabs',()=>SV.heavy>=10],['Shaken','Survive a quake',()=>SV.quakes>=1],['Demolition','Collapse a 15+ tower',()=>SV.bigFall>=1],['Wealthy','Earn 500 coins',()=>SV.earned>=500],['Moon Walker','Clear The Moon',()=>(SV.camp[9]||0)>0],['Boss Slayer','Defeat a boss',()=>SV.bosses>=1],['Daily Driver','3-day challenge streak',()=>SV.dstreak>=3],['Coin Chaser','Grab 50 air coins',()=>SV.cc>=50],['Golden Touch','Land 5 golden slabs',()=>SV.gld>=5]];
/* name:[fill,stroke,massMul,extraThick(-1=thin),friction,speedMul,minLevel,weight] */
const TY={normal:['#b27c46','#6b4423',1,0,1,1,0,10],heavy:['#5d6272','#2b2f3a',2.6,10,1.3,.8,4,3],thin:['#d9c38e','#8a7240',.5,-1,.9,1.1,3,3],
 moving:['#5fa8e0','#25608f',1,0,1,1,6,3],rotating:['#e0904a','#8f4f18',1,0,1,1,8,3],bouncy:['#ec6fa4','#9b2a64',.9,0,1,1,5,3],
 slippery:['#aee8f2','#4a98aa',1,0,.08,1,7,3],breakable:['#cdb08a','#7a5a38',.9,0,1,1,10,2],unstable:['#a36ee0','#5a2f96',1,0,.9,1,12,3],golden:['#ffd24a','#9a6a00',1,0,1,1.05,6,1]};
const BI=[[0,[111,183,232],[250,228,196],'Meadow'],[15,[70,60,130],[250,160,120],'Dusk'],[35,[38,46,72],[112,122,146],'Storm'],[60,[8,10,30],[44,30,96],'Space']];

const STG=[['Base Camp',8,{},'Every tower starts with one brave slab.'],['Windy Meadow',12,{wind:1.6},'The meadow breeze has opinions.'],['Heavy Metal',12,{types:['heavy','normal']},'Iron slabs. Mind the momentum.',['ball'],'WRECKING BALL'],
['Ice Rink',15,{types:['slippery','normal']},'Who left the ice out?'],['Cloud Village',18,{wind:1.2},'Neighbours wave from the clouds.'],['Jelly Peaks',18,{types:['bouncy','thin','normal']},'Everything here bounces. Everything.',['bolt'],'THUNDER KING'],
['Storm Front',22,{wind:2,quake:1},'Thunder in the foundations.'],['Crumble Canyon',22,{types:['breakable','unstable','normal']},'Do not linger.',['rock'],'ROCK GIANT'],['Moon Gate',28,{wind:1.3},'Almost there. The moon is watching.'],['The Moon',35,{wind:1.8,quake:1},'One small slab for creature-kind.',['bolt','rock'],'MOON TITAN'],
['Neon Ridge',30,{types:['moving','rotating','normal']},'Everything slides. Everything spins.'],['Glass Spire',32,{types:['thin','slippery','normal'],wind:1.5},'Thin air, thinner slabs.'],['Gravity Well',35,{wind:1.4,quake:1},'The ground pulls back.',['ball','rock'],'GRAVITY BEAST'],['Starfall',38,{types:['unstable','bouncy','breakable'],wind:1.6,quake:1},'Stars fall. So might you.'],['The Summit',45,{wind:2,quake:1,types:['heavy','moving','unstable','normal']},'The top of everything.',['ball','bolt','rock'],'SKY EMPEROR']];
const STORY=['Welcome, builder! Slabs first, panic later. Land near the middle.','The breeze here has opinions. Lean into it, not against it.','Iron slabs hit hard. Watch the swinging ball, it never tires.','Ice rink! Your feet will slide, so brake early and stay calm.','Neighbours wave from the clouds. Wave back, then keep climbing.','Everything bounces here. The Thunder King bounces too, loudly.','Feel that rumble? Quakes shake the whole stack. Stay centred.','Crumbling slabs do not wait. Hop on, hop off, never linger.','The moon is watching. Almost there, do not wobble now.','One small slab for you. The Moon Titan guards the way.','Neon slabs slide and spin. Time your jumps to the rhythm.','Thin slabs on ice. Delicate work. Breathe, then jump.','The ground pulls back here. The Gravity Beast wants you down.','Stars fall from the sky. Some are friendly. Most are not.','The Summit! The Sky Emperor waits. Show them what you built.'];
/* name,desc,coin/xp multiplier,forced types,wind mult,quakes,width mult */
const CT=[['Chill','Standard rules',1],['Hurricane','Wind is doubled',1.5,null,2],['Iron Only','Only heavy slabs',1.6,['heavy']],['Ice Age','Only slippery slabs',1.6,['slippery']],['Tightrope','Slabs 22% narrower',1.4,null,1,0,.78],['Ironman','No safety nets, more quakes',1.5,null,1,1]];
const RLC=[['\ud83c\udfa9','Top Hat'],['\ud83d\udc51','Crown'],['\ud83e\udde2','Cap'],['\ud83d\ude0e','Shades'],['\ud83c\udf44','Mushroom'],['\ud83e\ude99','Old Coin'],['\ud83d\udc8e','Gem'],['\ud83e\uddb4','Fossil'],['\ud83d\udd2d','Telescope'],['\ud83e\udded','Compass'],['\ud83e\ude81','Kite'],['\ud83d\udddd\ufe0f','Key']];
const cIdx=()=>mode==='campaign'?0:mode==='daily'?dTwist():contract;
const rules=()=>{const r=mode==='campaign'?STG[stage][2]:{},c=CT[cIdx()];return{types:r.types||c[3]||null,wind:(r.wind||1)*(c[4]||1),quake:r.quake||c[5]||0,w:c[6]||1,nets:cIdx()!==5};};
/* daily challenge: same seed for everyone on a given day */
const DAYR=[50,60,75,90,110,140,300];
const today=()=>Math.floor((Date.now()-new Date().getTimezoneOffset()*60000)/864e5),seedD=()=>(today()*2654435761)>>>0;
const dTwist=()=>1+((seedD()>>>8)%5),dgoal=()=>14+(seedD()%6)*2;
const dailyInit=()=>{if(!SV.d||SV.d.day!==today())SV.d={day:today(),best:0,done:0};};
const dailyDone=()=>!!(SV.d&&SV.d.day===today()&&SV.d.done),curStreak=()=>SV.dlast>=today()-1?SV.dstreak:0;
const mul=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const gr=()=>mode==='daily'&&dr?dr():Math.random();
const vib=n=>{if(SV.hap&&typeof navigator!=='undefined'&&navigator.vibrate)try{navigator.vibrate(n)}catch(e){}};
const bossK=()=>mode==='campaign'?(STG[stage][4]||[]):[];

/* ================= CLOUD SAVE (YouTube Playables saveData / loadData) ================= */
const SAVE_VERSION=1,MAX_SAVE_CHARS=60000;   /* payload is ~1 KB; the 64 KiB exit-flush limit is the tightest documented bound */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const resumeWaiters=[];
const whenActive=()=>ytPaused?new Promise(r=>resumeWaiters.push(r)):Promise.resolve();
/* Accepts: {v:1,sv:{...}} (current), any future {v:n,sv:{...}} (best effort), or a version-less legacy Teeter save (teeter2/teeter3 shape). */
function migrate(o){if(!o||typeof o!=='object'||Array.isArray(o))return null;if(typeof o.v==='number')return(o.sv&&typeof o.sv==='object')?o.sv:null;return o;}
/* Whitelist + clamp every field so corrupted/hand-edited data can never crash the game (e.g. SK[badSkin], RLC[badHat]). */
function sanitize(s){
 const o=mkSV();if(!s||typeof s!=='object')return o;
 const num=(v,max)=>typeof v==='number'&&isFinite(v)?Math.min(max,Math.max(0,v)):null;
 const int=(k,max)=>{const v=num(s[k],max===undefined?1e9:max);if(v!==null)o[k]=Math.floor(v);};
 ['coins','best','g','stars','perf','streak','landings','jumps','bestCombo','collapses','earned','quakes','heavy','bigFall','bosses','cc','gld','dstreak','dlast'].forEach(k=>int(k));
 int('net',9999);int('chests',9999);
 ['xp','time','bestY'].forEach(k=>{const v=num(s[k],1e10);if(v!==null)o[k]=v;});
 const idx=(a,n)=>Array.isArray(a)?[...new Set(a.filter(v=>Number.isInteger(v)&&v>=0&&v<n))]:[];
 o.done=idx(s.done,TK.length);o.ach=idx(s.ach,ACH.length);o.relics=idx(s.relics,RLC.length);
 if(Array.isArray(s.own))o.own=SK.map((_,i)=>i===0||s.own[i]?1:0);
 if(Array.isArray(s.up))o.up=[0,1,2].map(i=>{const v=num(s.up[i],3);return v===null?0:Math.floor(v);});
 if(Array.isArray(s.camp))o.camp=STG.map((_,i)=>{const v=num(s.camp[i],3);return v===null?0:Math.floor(v);});
 const sk=Number.isInteger(s.skin)?s.skin:0;o.skin=(sk>=0&&sk<SK.length&&o.own[sk])?sk:0;
 const h=Number.isInteger(s.hat)?s.hat:-1;o.hat=(h>=0&&h<RLC.length&&o.relics.includes(h))?h:-1;
 o.mute=s.mute?1:0;o.cb=s.cb?1:0;o.tut=s.tut?1:0;o.hap=(s.hap===0||s.hap===false)?0:1;
 o.shk=(Number.isInteger(s.shk)&&s.shk>=0&&s.shk<=2)?s.shk:2;
 if(s.d&&typeof s.d==='object'){const day=num(s.d.day,1e9),b=num(s.d.best,1e6);if(day!==null)o.d={day:Math.floor(day),best:b===null?0:Math.floor(b),done:s.d.done?1:0};}
 if(s.dm&&typeof s.dm==='object'&&Array.isArray(s.dm.b)&&Array.isArray(s.dm.c)){const day=num(s.dm.day,1e9);
  if(day!==null){o.dm={day:Math.floor(day),b:DMK.map((_,i)=>num(s.dm.b[i],1e9)||0),c:[0,1,2].map(i=>s.dm.c[i]?1:0)};if(s.dm.bx)o.dm.bx=1;}}
 if(s.wk&&typeof s.wk==='object'){const w=num(s.wk.w,1e9),b=num(s.wk.b,1e9);if(w!==null)o.wk={w:Math.floor(w),b:b===null?0:b,done:s.wk.done?1:0};}
 return o;
}
const serialize=()=>{const o={};for(const k of Object.keys(mkSV()))o[k]=SV[k];return JSON.stringify({v:SAVE_VERSION,sv:o});};
const Cloud={
 mode:YT?'loading':'local',   /* 'loading' | 'cloud' (saves allowed) | 'failed' (load failed: saves disabled) | 'local' (not in Playables) */
 dirty:0,dt:0,gap:0,fail:0,flying:0,again:0,last:'',savedBest:0,sentBest:0,
 /* load FIRST; saveData is never called unless this has succeeded (it would be rejected and could clobber data) */
 async load(){
  for(let i=0;i<3;i++){
   await whenActive();let raw;
   try{raw=await YT.game.loadData();}
   catch(e){hlog('w');if(i<2)await sleep(400*(i+1));continue;}
   try{
    let o=null;
    if(typeof raw==='string'&&raw.length){try{o=JSON.parse(raw);}catch(e){o=null;hlog('w');}}   /* corrupted JSON -> start fresh */
    const fresh=sanitize(migrate(o));for(const k of Object.keys(SV))delete SV[k];Object.assign(SV,fresh);
   }catch(e){hlog('e');console.error(e);this.mode='failed';return false;}   /* a bug in restore must never overwrite good cloud data */
   this.last=serialize();this.savedBest=Math.floor(SV.best);this.mode='cloud';return true;
  }
  this.mode='failed';return false;
 },
 /* mark progress as changed. urgent = milestone (purchase, unlock, stage/daily clear, run end); otherwise debounced */
 mark(urgent){if(this.mode!=='cloud')return;this.dirty=1;const d=urgent?.25:6;if(!this.dt||this.dt>d)this.dt=d;},
 /* driven by the (single) game loop, so nothing fires while the platform has us paused */
 tick(dt){if(this.gap>0)this.gap-=dt;if(!this.dirty||this.mode!=='cloud')return;this.dt-=dt;if(this.dt<=0&&this.gap<=0&&!this.flying)this.flush();},
 async flush(force){
  if(this.mode!=='cloud')return;
  if(this.flying){if(force)this.again=1;return;}
  const data=serialize();
  if(data===this.last){this.dirty=0;this.dt=0;return;}
  if(data.length>MAX_SAVE_CHARS||(typeof data.isWellFormed==='function'&&!data.isWellFormed())){hlog('e');this.dirty=0;return;}
  const sb=Math.floor(SV.best);this.flying=1;this.dirty=0;this.dt=0;
  try{await YT.game.saveData(data);this.last=data;this.fail=0;this.gap=2;this.savedBest=sb;this.sendBest();}
  catch(e){this.fail++;this.dirty=1;this.dt=Math.min(30,2**this.fail);this.gap=0;hlog('w');}   /* retry later with backoff; never throws into the game */
  this.flying=0;
  if(this.again){this.again=0;this.flush(true);}
 },
 runEnded(){this.mark(1);},
 /* Score = best height (SV.best): the same number the hub/profile show as "BEST". Sent only after it was successfully saved. */
 sendBest(){
  if(!YT||this.mode!=='cloud')return;const b=this.savedBest;if(!Number.isSafeInteger(b)||b<1||b<=this.sentBest)return;
  const prev=this.sentBest;this.sentBest=b;
  try{YT.engagement.sendScore({value:b}).catch(()=>{this.sentBest=prev;hlog('w');});}catch(e){this.sentBest=prev;hlog('w');}
 },
 reset(){for(const k of Object.keys(SV))delete SV[k];Object.assign(SV,mkSV());UI.dc=undefined;skp=0;qp=0;contract=0;chs={};this.mark(1);toMenu();toast('Progress reset');}
};

/* ================= STATE ================= */
let st='title',mode='endless',stage=0,contract=0,RL={wind:1,w:1,nets:true,quake:0,types:null},trT=1,ban=null,pend=null,dr=null,rp=0,rc=0,netUsed=0,win=false,ovStars=0,wsg=0,hudS=0,mx=240,my=400,tower,cr,slab,debris=[],fl=[],toasts=[],B=[],t=0,camY=0,hud=0,lv=0,combo=0,runC=0,runXP=0,why='',overT=0,jb=0,spawnT=0,stabz=null,gs=null,nextStar=10,ts=1,wi=0,wcom=0,stress=0,rs=0,evT=20;
const World={wind:0,gust:0,gustT:0,gold:0,quake:0};
let paused=0,zp=0,gc=[],nbd=0,cfd=0,CF=[],rsc=0,rscT=0,qp=0,skp=0,chs={},RP=[];
/* gameplay timers (replaces setTimeout): advanced by step(), so they never fire while paused */
const LT=[],later=(s,f)=>LT.push({s,f}),tickLater=dt=>{for(let i=LT.length-1;i>=0;i--){const o=LT[i];o.s-=dt;if(o.s<=0){LT.splice(i,1);o.f();}}};
const topS=()=>tower[tower.length-1],sy=y=>GS-(y-camY),sx=x=>W/2+x;
const lvl=()=>Math.floor(Math.sqrt(SV.xp/50))+1;
const biome=()=>{if(mode==='campaign'&&st!=='title')return stage<3?0:stage<6?1:stage<8?2:3;let k=0;BI.forEach((b,i)=>{if(lv>=b[0])k=i});return k};
const toast=s=>toasts.push({s,t:0});
const mk=(c,w,th,y,k,m,s)=>({c,w,t:th,y,k,m,th:0,om:0,vx:0,st:s||1,cr:0,M:1,H:10});
function reset(){
 tower=[mk(0,230,34,0,'normal',230*34/2500)];
 cr={x:0,vx:0,fy:34,vy:0,mode:'stand',on:0,sq:0,blink:2,coy:0};
 slab=null;debris=[];stabz=null;gs=null;spawnT=.8;camY=0;hud=0;lv=0;ts=1;stress=0;wi=0;
 Object.assign(World,{wind:0,gust:0,gustT:0,gold:0,quake:0});
}
reset();

/* ================= PROGRESSION ================= */
const prSig=()=>SV.done.length+SV.ach.length+(SV.dm?SV.dm.c.reduce((a,b)=>a+b,0)+(SV.dm.bx?1:0):0)+(SV.wk&&SV.wk.done?1:0);
const Progress={
 coins(n,s){n=Math.round(n);UI.spring('coin').s=1;SV.coins+=n;SV.earned+=n;runC+=n;if(s)fl.push({s,t:0});},
 xp(n){const L=lvl();SV.xp+=n;runXP+=n;if(lvl()>L){SV.coins+=25*lvl();banner('LEVEL UP!',`Level ${lvl()}  +${25*lvl()} coins`);if(lvl()%5===0){SV.chests=(SV.chests||0)+1;toast('Treasure chest earned!');}Snd.perfect(6);save(1);}},
 check(){const s0=prSig();
  TK.forEach((k,i)=>{if(!SV.done.includes(i)&&SV[k[1]]>=k[2]){SV.done.push(i);SV.coins+=k[3];toast(`Task done: ${k[0]}  +${k[3]}`);}});
  ACH.forEach((a,i)=>{if(!SV.ach.includes(i)&&a[2]()){SV.ach.push(i);SV.coins+=20;toast(`Achievement: ${a[0]}  +20`);}});
  dmInit();dmPick().forEach((ix,j)=>{const k=DMK[ix];if(!SV.dm.c[j]&&SV[k[1]]-SV.dm.b[ix]>=k[2]){SV.dm.c[j]=1;SV.coins+=k[3];toast(`Daily mission: ${k[0]}  +${k[3]}`);}});if(SV.dm.c.every(x=>x)&&!SV.dm.bx){SV.dm.bx=1;SV.coins+=60;toast('All daily missions!  +60');SV.chests=(SV.chests||0)+1;}
  wkInit();{const wk=WKK[wkI()%3];if(!SV.wk.done&&SV[wk[1]]-SV.wk.b>=wk[2]){SV.wk.done=1;SV.coins+=wk[3];SV.chests=(SV.chests||0)+1;toast(`WEEKLY DONE!  +${wk[3]} & chest`);}}
  save(prSig()!==s0?1:0);
 }
};

/* ================= AUDIO (synthesised) ================= */
const Snd={c:null,m:null,nb:{},nv:0,
 /* AudioContext is created lazily from a user gesture, and only while YouTube audio is enabled */
 init(){if(this.c||!YA.on||ytPaused)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.c=new AC();this.m=this.c.createGain();this.m.connect(this.c.destination);}catch(e){this.c=null;this.m=null;hlog('w');}this.sync();},
 /* single place that applies YouTube mute + platform pause to the audio graph */
 sync(){if(!this.c||!this.m)return;const on=YA.on&&!ytPaused;this.m.gain.value=on?1:0;
  try{if(on){if(this.c.state==='suspended')this.c.resume().catch(()=>{/* expected if the browser has not unlocked audio yet */});}
   else if(this.c.state==='running')this.c.suspend().catch(()=>{/* nothing to do: context already closing */});}catch(e){hlog('w');}},
 /* SV.mute is only the granular "sound effects" setting: it can silence effects, but never un-mute YouTube */
 ok(){return!!this.c&&YA.on&&!ytPaused&&!SV.mute&&this.nv<24;},
 tone(f,d,ty,v,sl,dl){if(!this.ok())return;const c=this.c,o=c.createOscillator(),g=c.createGain(),n=c.currentTime+(dl||0);
  o.type=ty||'sine';o.frequency.setValueAtTime(f,n);if(sl)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+sl),n+d);
  g.gain.setValueAtTime(v||.15,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.connect(g);g.connect(this.m);o.start(n);o.stop(n+d);
  this.nv++;o.onended=()=>{this.nv--;o.disconnect();g.disconnect();};},
 noise(d,v,fr){if(!this.ok())return;const c=this.c,k=Math.round(d*100);let b=this.nb[k];
  if(!b){const n=c.sampleRate*d|0;b=this.nb[k]=c.createBuffer(1,n,c.sampleRate);const a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);}
  const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();f.type='lowpass';f.frequency.value=fr;g.gain.value=v;s.buffer=b;s.connect(f);f.connect(g);g.connect(this.m);s.start();
  this.nv++;s.onended=()=>{this.nv--;s.disconnect();f.disconnect();g.disconnect();};},
 jump(){this.tone(320,.14,'square',.05,300)},land(m){this.noise(.16,.22,500+m*40);this.tone(110,.12,'sine',.3,-50)},
 perfect(c){this.tone(520+c*50,.2,'triangle',.16);this.tone(780+c*50,.25,'triangle',.13,0,.08)},
 crash(){this.noise(1.1,.5,420);this.tone(70,.8,'sawtooth',.2,-40)},thud(){this.noise(.1,.15,300)},creak(s){this.tone(70+s*50,.35,'sawtooth',.07,-30+Math.random()*60);this.noise(.12,.07,300)},zap(){this.noise(.5,.5,2500);this.tone(900,.3,'sawtooth',.15,-800)}};

/* ================= FX: particles, shake ================= */
const MAXP=500;
function compact(a,f){let j=0;for(let i=0;i<a.length;i++){const x=a[i];if(f(x))a[j++]=x;}a.length=j;}
const FX={p:[],rg:[],sh:0,
 spark(x,y,n){n=Math.min(n,Math.max(0,MAXP-this.p.length));for(let i=0;i<n;i++)this.p.push({x:x+rnd(-12,12),y:y+rnd(-6,12),vx:rnd(-90,90),vy:rnd(40,160),l:rnd(.5,.9),c:'rgba(255,240,150,',r:rnd(2.5,4.5),k:1});},
 burst(x,y,n,s,c){n=Math.min(n,Math.max(0,MAXP-this.p.length));for(let i=0;i<n;i++)this.p.push({x:x+rnd(-10,10),y,vx:rnd(-s,s),vy:rnd(0,s*.7),l:rnd(.5,1.1),c,r:rnd(2,5)});},
 up(dt){for(const o of this.rg)o.t+=dt;compact(this.rg,o=>o.t<.5);for(const q of this.p){q.l-=dt;q.vy-=260*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.98;}compact(this.p,q=>q.l>0);this.sh*=Math.exp(-dt*5);},
 draw(){for(const o of this.rg){const k=.3+o.t*2.4;ctx.strokeStyle=o.c+(1-o.t*2)+')';ctx.lineWidth=1+4*(1-o.t*2);ctx.beginPath();ctx.ellipse(sx(o.x),sy(o.y),o.r*k,o.r*k*.25,0,0,7);ctx.stroke();}for(const q of this.p){ctx.fillStyle=q.c+Math.min(1,q.l)+')';if(q.k){ctx.save();ctx.translate(sx(q.x),sy(q.y));ctx.rotate(q.l*6);const r_=q.r*2.6*Math.min(1,q.l*2);ctx.beginPath();ctx.moveTo(0,-r_);ctx.quadraticCurveTo(0,0,r_,0);ctx.quadraticCurveTo(0,0,0,r_);ctx.quadraticCurveTo(0,0,-r_,0);ctx.quadraticCurveTo(0,0,0,-r_);ctx.fill();ctx.restore();continue;}ctx.beginPath();ctx.arc(sx(q.x),sy(q.y),q.r*(1.4-q.l*.4),0,7);ctx.fill();}}
};
const DUST='rgba(215,195,160,',GOLD='rgba(255,215,80,';

/* ================= SLABS ================= */
const Slabs={
 pick(n){const ks=RL.types||Object.keys(TY).filter(k=>TY[k][6]<=n),tot=ks.reduce((a,k)=>a+TY[k][7],0);let r=gr()*tot;for(const k of ks){r-=TY[k][7];if(r<=0)return k;}return'normal';},
 spawn(){
  const n=lv,T=topS(),dir=gr()<.5?1:-1,k=this.pick(n),d=TY[k];
  const w=(Math.max(80,150-2*n)+gr()*20-10)*(1+.07*SV.up[1])*RL.w,th=d[3]<0?14:Math.min(66,26+1.6*n)+d[3];
  slab={x:-dir*(W/2+w/2+30),w,t:th,y:T.y+T.t,base:Math.min(430,170+7*n)*d[5]*(1-.08*SV.up[0]),dir,k,m:w*th/2500*d[2],ph:gr()*6,ang:0,v:0,st:tower.length%2};
 },
 move(dt){
  const s=slab;s.v=s.dir*s.base*(s.k==='moving'?1+.45*Math.sin(t*3+s.ph):1)+World.wind*.2;s.x+=s.v*dt;
  s.ang=s.k==='rotating'?.55*Math.sin(t*3+s.ph):0;
  if(s.dir>0?s.x>W/2+s.w/2+40:s.x<-W/2-s.w/2-40){slab=null;spawnT=.5;combo=0;}
 }
};

/* ================= PHYSICS: rocking joints + rigid debris ================= */
const CORN=[[-1,-1],[1,-1],[1,1],[-1,1]];
const Phys={
 /* Each joint i (slab i resting on slab i-1) is a rocking block: the whole stack above rotates about the support edge.
    alpha = g*(lever arm)/(H^2+k): taller stacks have bigger H => tip far more easily. */
 joints(dt){
  const T=tower,n=T.length-1;let M=0,X=0,Y=0,wor=0,col=0;wsg=0;
  if(cr.mode!=='dead'){M=MC;X=MC*cr.x;Y=MC*(cr.fy+R);}
  const sturdy=1-.08*SV.up[2];
  for(let i=n;i>=1;i--){
   const s=T[i],sp=T[i-1];M+=s.m;X+=s.m*s.c;Y+=s.m*(s.y+s.t/2);
   const b=sp.w/2,Hh=Math.max(10,Y/M-s.y);s.M=M;s.H=Hh;
   const e=X/M-sp.c+World.wind/G*Hh*.5*sturdy+(s.k==='unstable'?Math.sin(t*7+i)*7:0);
   let a=s.th,w=s.om;
   if(World.quake>0)w+=(Math.random()-.5)*dt*8*sturdy/(1+(n-i)*.15);
   const ps=a>0?1:a<0?-1:w>0?1:w<0?-1:e>b?1:e<-b?-1:0;
   if(ps){
    const arm=ps>0?e-b+Hh*a:e+b+Hh*a;
    w+=G*arm/(Hh*Hh+700)*dt;w*=1-1.4*dt;a+=w*dt;
    if(ps*a<0){a=0;w*=-.3;}
    if(Math.abs(a)<1e-4&&Math.abs(w)<.01){a=0;w=0;}
   }
   s.th=a;s.om=w;
   const risk=Math.max(Math.abs(e)/b,Math.abs(a)/.5);
   if(risk>wor){wor=risk;wi=i;wcom=X/M;wsg=Math.sign(e)*Math.min(1.2,risk);}
   if(Math.abs(a)>.5)col=i;
  }
  stress=wor;return col;
 },
 /* impulse into every joint from a landing: vertical creature impact + horizontal slab momentum */
 kick(x,vy,px,midY){
  for(let i=1;i<tower.length;i++){const s=tower[i],arm=x-tower[i-1].c,hh=Math.max(0,midY-s.y);
   s.om+=clamp(.6*(MC*vy*arm+px*hh)/(s.M*(s.H*s.H+700)),-2,2);}
 },
 /* world-space transform of every slab given the joint chain (y-up, clockwise-positive) */
 chain(){
  const out=[];let th=0,tx=0,ty=0;const R2=(a,x,y)=>[x*Math.cos(a)+y*Math.sin(a),-x*Math.sin(a)+y*Math.cos(a)];
  out.push({th:0,tx:0,ty:0,px:0,py:0});
  for(let i=1;i<tower.length;i++){
   const s=tower[i],sp=tower[i-1],ps=s.th>=0?1:-1,P=[sp.c+ps*sp.w/2,sp.y+sp.t],r=R2(s.th,P[0],P[1]),q=R2(th,P[0]-r[0],P[1]-r[1]);
   tx+=q[0];ty+=q[1];th+=s.th;out.push({th,tx,ty,px:P[0],py:P[1]});
  }
  return out;
 },
 world(f,x,y){const a=f.th,c=Math.cos(a),s=Math.sin(a);return[x*c+y*s+f.tx,-x*s+y*c+f.ty];},
 /* rigid body vs ground plane with rotational impulse + friction */
 debris(p,dt){
  p.vy-=G*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.om*dt;
  if(p.cr){if(p.y<R){p.y=R;if(p.vy<-120)Snd.thud();p.vy=Math.abs(p.vy)*.35;p.vx*=.8;p.om*=.7;}return;}
  const I=p.m*(p.w*p.w+p.t*p.t)/12*1.4,cs=Math.cos(p.r),sn=Math.sin(p.r);let deep=0;
  for(const[lx,ly]of CORN){
   const rx=lx*p.w/2*cs+ly*p.t/2*sn,ry=-lx*p.w/2*sn+ly*p.t/2*cs,pen=-(p.y+ry);if(pen<=0)continue;
   deep=Math.max(deep,pen);
   const vpy=p.vy-p.om*rx,vpx=p.vx+p.om*ry;
   if(vpy<0){
    const j=-(1+.28)*vpy/(1/p.m+rx*rx/I);p.vy+=j/p.m;p.om-=rx*j/I;
    if(j>6){FX.burst(p.x+rx,0,Math.min(8,j/3|0),90,DUST);FX.sh=Math.min(10,FX.sh+j*.02);if(j>20)Snd.thud();}
    const jt=clamp(-vpx/(1/p.m+ry*ry/I),-.6*j,.6*j);p.vx+=jt/p.m;p.om+=ry*jt/I;
   }
  }
  p.y+=deep*.8;if(deep>0){p.om*=1-4*dt;p.vx*=1-1.5*dt;}
 }
};

/* ================= PLAYER ================= */
const In={kl:0,kr:0,ptr:{}};
const dirIn=()=>{const v=Object.values(In.ptr);return(In.kr||v.includes(1)?1:0)-(In.kl||v.includes(-1)?1:0);};
const Player={
 surf(x,pf){let b=null;for(let i=0;i<tower.length;i++){const s=tower[i],y=s.y+s.t;if(Math.abs(x-s.c)<=s.w/2&&y<=pf+1.5&&(!b||y>b.y))b={y,i};}return b;},
 step(dt){
  const d=dirIn(),on=tower[cr.on]||tower[0],mu=TY[on.k][4],gE=G*(biome()===3?.82:1),gr=Math.min(1,mu+.12);
  if(cr.mode==='stand'){
   if(d)cr.vx+=d*1500*gr*dt;else cr.vx-=Math.sign(cr.vx)*Math.min(Math.abs(cr.vx),2300*gr*dt);
   cr.vx=clamp(cr.vx,-150,150);
   if(Math.abs(cr.x-on.c)>on.w/2){cr.mode='air';cr.coy=.1;cr.vy=0;}
  }else if(cr.mode==='air'){cr.vx=clamp(cr.vx+(d*900+World.wind*.5)*dt,-190,190);cr.coy-=dt;}
  cr.x=clamp(cr.x+cr.vx*dt,-W/2+18,W/2-18);
  jb-=dt;
  if(jb>0&&(cr.mode==='stand'||(cr.mode==='air'&&cr.coy>0&&cr.vy<=0))){cr.vy=JV;cr.mode='air';cr.sq=-.7;cr.coy=0;jb=0;SV.jumps++;Snd.jump();}
  if(cr.mode==='air'){
   if(Math.random()<.6&&FX.p.length<MAXP)FX.p.push({x:cr.x+rnd(-4,4),y:cr.fy+R,vx:rnd(-10,10),vy:40+rnd(0,15),l:.35,c:'rgba(255,255,255,',r:rnd(2,4)});const pf=cr.fy;cr.vy-=gE*dt;cr.fy+=cr.vy*dt;cr.sq=-Math.min(.5,Math.abs(cr.vy)/2200);
   if(slab&&cr.vy<0){const sT=slab.y+slab.t;
    if(pf>=sT-2&&cr.fy<=sT&&Math.abs(cr.x-slab.x)<=slab.w/2&&Math.abs(slab.ang)<.18)Game.land();}
   if(cr.mode==='air'&&cr.vy<0){
    const s=this.surf(cr.x,pf);
    if(s&&cr.fy<=s.y){const v=-cr.vy;cr.fy=s.y;cr.vy=0;cr.mode='stand';cr.on=s.i;cr.sq=.7;Phys.kick(cr.x,v,0,s.y);FX.burst(cr.x,s.y,4,60,DUST);Snd.land(1);}
    else if(!s&&cr.fy<=0){cr.fy=0;Game.fell();}
   }
  }
 }
};

/* ================= GAME LOGIC ================= */
const Game={
 start(){if(mode==='daily'){dailyInit();dr=mul(seedD()^0x9e3779b9);}RL=rules();reset();Haz.reset();gc=[];paused=0;nbd=0;cfd=0;CF=[];st='play';trT=1;SV.g++;combo=0;rs=0;runC=0;runXP=0;rp=0;rc=0;netUsed=0;win=false;nextStar=10;evT=18;Progress.check();if(mode==='campaign'&&bossK().length)banner('BOSS: '+STG[stage][5],`Reach level ${STG[stage][1]} to win`);else if(mode==='campaign')banner(STG[stage][0],STG[stage][3]);},
 land(){
  const s=slab,dx=Math.abs(cr.x-s.x)/(s.w/2),o=tower.length,d=TY[s.k];
  tower.push({c:s.x,w:s.w,t:s.t,y:s.y,k:s.k,m:s.m,th:0,om:0,vx:s.v*.9,st:s.st,cr:0,M:1,H:10,pop:1});
  Phys.kick(cr.x,Math.abs(cr.vy),s.m*s.v,s.y+s.t/2);
  cr.fy=s.y+s.t;cr.on=o;cr.vy=0;cr.mode='stand';cr.sq=.9;slab=null;lv++;spawnT=.5;SV.landings++;
  if(s.k==='heavy')SV.heavy++;if(s.k==='golden'){SV.gld++;FX.spark(cr.x,cr.fy,12);}
  const perfect=dx<=.2;
  if(perfect){combo++;rs++;SV.perf++;SV.streak=Math.max(SV.streak,rs);}else{rs=0;if(dx>.65)combo=0;}
  SV.bestCombo=Math.max(SV.bestCombo,combo);if(lv>SV.best){SV.bestY=cr.fy;if(SV.best>4&&!nbd){nbd=1;banner('NEW BEST!','Past '+SV.best+' levels');}}SV.best=Math.max(SV.best,lv);
  rc=Math.max(rc,combo);if(perfect)rp++;const mult=1+.25*Math.min(combo,16),g=(World.gold>0?2:1)*CT[cIdx()][2],c=((perfect?3:1)+(s.k!=='normal'?1:0)+(s.k==='golden'?8:0))*mult*g;
  Progress.coins(c,(perfect?'PERFECT ':'')+'+'+Math.round(c)+(mult>1?`  x${mult.toFixed(2)}`:''));Progress.xp(10*mult+(perfect?10:0));
  FX.burst(cr.x,cr.fy,perfect?10:6,perfect?120:80,perfect?GOLD:DUST);
  UI.spring('hgt').s=1;if(perfect){UI.spring('cmb').v+=6;UI.spring('cmb').s=1;FX.spark(cr.x,cr.fy+8,6+combo);ts=Math.min(ts,.85);FX.rg.push({x:cr.x,y:cr.fy,r:40+combo*4,t:0,c:GOLD});zp=Math.min(.05,.02+combo*.004);if(rs%3===0){tower.forEach(q=>{q.om*=.4});toast('Steady hands!');}if(combo===5||combo===10||combo===15)banner(combo===5?'HOT STREAK!':combo===10?'ON FIRE!':'UNSTOPPABLE!','Combo x'+combo);}
  if(mode==='endless'&&lv%25===0){Progress.coins(lv*2,'MILESTONE');if(lv%50===0)Game.chest();banner('LEVEL '+lv+'!','+'+lv*2+' coins');}
  if(!gs&&gc.length<2&&Math.random()<.4)gc.push({x:rnd(-100,100),y:cr.fy+rnd(70,130),t:0});
  FX.sh=Math.max(FX.sh,2+d[2]*2);
  perfect?Snd.perfect(Math.min(combo,8)):Snd.land(d[2]*3);vib(perfect?18:8);
  if(s.k==='bouncy'){cr.vy=JV*.7;cr.mode='air';cr.coy=0;}
  if(lv>=nextStar&&!gs){gs={};nextStar+=10;}
  if(perfect?(s.k!=='normal'?Math.random()<.22:Math.random()<.04):0)Game.relic();
  Progress.check();
  if(mode==='campaign'&&lv>=STG[stage][1])Game.win();
  if(mode==='daily')Game.dailyCheck();
 },
 stabilise(msg){stabz={t:0,from:tower.map(s=>s.c),fx:cr.x};slab=null;spawnT=1.6;toast(msg);Snd.perfect(7);},
 chest(){SV.chests=(SV.chests||0)+1;toast('TREASURE CHEST earned!');save(1);},
 relic(){const miss=RLC.map((_,i)=>i).filter(i=>!SV.relics.includes(i));if(!miss.length)return;const i=miss[Math.random()*miss.length|0];SV.relics.push(i);
  toast(`RELIC FOUND: ${RLC[i][1]} ${RLC[i][0]}`);Snd.perfect(8);FX.burst(cr.x,cr.fy+30,16,160,GOLD);if(SV.relics.length%4===0)Progress.coins(100,'SET BONUS +100');save(1);},
 win(){const g=STG[stage][1],n=1+(rp>=Math.ceil(g*.4)?1:0)+(!netUsed&&rc>=4?1:0);if(n===3&&(SV.camp[stage]||0)<3)later(.7,()=>Game.relic()),Game.chest();SV.camp[stage]=Math.max(SV.camp[stage]||0,n);ovStars=n;
  Progress.coins(g*3*n);Progress.xp(g*10);if(bossK().length){SV.bosses++;Game.relic();Game.chest();Progress.coins(150,'BOSS DEFEATED +150');}Haz.reset();slab=null;win=true;st='over';why=stage===STG.length-1?'CAMPAIGN COMPLETE!':'STAGE CLEAR!';overT=0;SV.best=Math.max(SV.best,lv);Snd.perfect(8);FX.burst(cr.x,cr.fy+20,30,240,GOLD);Progress.check();Cloud.runEnded();},
 zap(m,vx){debris.push({cr:1,x:cr.x,y:cr.fy+R,vx:vx||rnd(-200,200),vy:420,r:0,om:rnd(-9,9)});cr.mode='dead';FX.sh=14;Snd.crash();vib([60,40,120]);Game.over(m);},
 dailyCheck(){dailyInit();SV.d.best=Math.max(SV.d.best,lv);
  if(!SV.d.done&&lv>=dgoal()){const d=today();SV.d.done=1;SV.dstreak=SV.dlast===d-1?SV.dstreak+1:1;SV.dlast=d;
   const r=DAYR[(SV.dstreak-1)%7];Progress.coins(r,`DAILY CLEAR +${r}`);Progress.xp(80);
   if(SV.dstreak===3)Progress.coins(150,'3-DAY BONUS +150');if(SV.dstreak===30)Progress.coins(1000,'30-DAY BONUS +1000');
   if(SV.dstreak%7===0)Game.relic();banner('DAILY CLEAR!',`Streak: ${SV.dstreak} day${SV.dstreak>1?'s':''}  +${r} coins`);save(1);}},
 fell(){cr.mode='dead';debris.push({cr:1,x:cr.x,y:cr.fy+R,vx:0,vy:200,r:0,om:3});Game.over('You fell off the tower!');},
 hit(){debris.push({cr:1,x:cr.x,y:cr.fy+R,vx:slab.dir*520,vy:420,r:0,om:slab.dir*9});cr.mode='dead';FX.sh=12;Snd.crash();Game.over('Squashed by the slab!');},
 over(m){st='over';why=m;overT=0;SV.best=Math.max(SV.best,lv);SV.collapses+=m.startsWith('The tower')?1:0;Progress.check();Cloud.runEnded();},
 collapse(j){
  const ch=Phys.chain(),b=tower[j];
  for(let i=j;i<tower.length;i++){
   const s=tower[i],p=Phys.world(ch[i],s.c,s.y+s.t/2),r=[p[0]-ch[j].px,p[1]-ch[j].py],om=b.om;
   debris.push({x:p[0],y:p[1],w:s.w,t:s.t,k:s.k,st:s.st,m:s.m,r:ch[i].th,vx:om*r[1]+rnd(-30,30),vy:-om*r[0]*.6+rnd(0,80),om:om*.8+rnd(-1,1),cr:0});
  }
  const p=Phys.world(ch[tower.length-1],cr.x,cr.fy+R);
  debris.push({cr:1,x:p[0],y:p[1],vx:b.om*40,vy:300,r:0,om:Math.sign(b.om||1)*6});
  if(lv>=15)SV.bigFall++;
  tower.length=j;cr.mode='dead';slab=null;ts=.3;FX.sh=16;Snd.crash();FX.burst(0,40,40,320,DUST);FX.rg.push({x:0,y:0,r:140,t:0,c:'rgba(215,195,160,'});zp=.07;
  Game.over('The tower collapsed!');
 }
};

function sim(dt){
 const T=topS(),n=lv;
 /* world: wind + events */
 const amp=Math.min(200,n*4.5);World.gustT=Math.max(0,World.gustT-dt);World.gold=Math.max(0,World.gold-dt);
 World.wind=RL.wind*(amp*.7*(Math.sin(t*.3)+.5*Math.sin(t*.77+1))+(World.gustT>0?World.gust:0))+(RL.wind-1)*60*Math.sin(t*.45);
 if(World.quake>0){World.quake-=dt;FX.sh=Math.max(FX.sh,6);if(World.quake<=0){SV.quakes++;toast('Quake survived!');Progress.check();}}
 evT-=dt;if(evT<=0&&n>=(RL.quake?5:8)&&!stabz){const r=gr();evT=(22+gr()*18)/(RL.quake?1.6:1);
  if(r<.4){World.gust=(gr()<.5?-1:1)*(160+gr()*100);World.gustT=5;toast('Wind gust!');}
  else if(r<.75&&(n>=12||RL.quake)){World.quake=4;toast('EARTHQUAKE!');}else if(gr()<.5){for(let i=0;i<5;i++)gc.push({x:rnd(-120,120),y:T.y+T.t+rnd(60,150),t:-i*.2});toast('COIN RAIN!');}else{World.gold=14;toast('GOLDEN HOUR: coins x2');}}
 /* spawn + incoming slab */
 const sliding=tower.some(s=>Math.abs(s.vx)>1);
 if(!slab&&!stabz&&!sliding){spawnT-=dt;if(spawnT<=0)Slabs.spawn();}
 if(slab)Slabs.move(dt);
 /* landed slabs keep their momentum and slide to a halt on friction */
 for(let i=1;i<tower.length;i++){const s=tower[i];if(s.vx){const dx=s.vx*dt;s.c+=dx;if(cr.mode==='stand'&&cr.on===i)cr.x+=dx;
  const dec=TY[s.k][4]*G*3*dt;s.vx=Math.abs(s.vx)<=dec?0:s.vx-Math.sign(s.vx)*dec;}}
 Player.step(dt);if(st!=='play')return;
 Haz.upd(dt);if(st!=='play')return;
 /* breakable slabs crumble if you linger */
 const last=tower.length-1,ls=tower[last];
 if(last>0&&ls.k==='breakable'&&cr.mode==='stand'&&cr.on===last){ls.cr+=dt;
  if(ls.cr>1.3){tower.pop();for(const sg of[-1,1])debris.push({x:ls.c+sg*ls.w/4,y:ls.y+ls.t/2,w:ls.w/2,t:ls.t,k:ls.k,st:1,m:ls.m/2,r:0,vx:sg*60,vy:80,om:sg*1.5,cr:0});
   cr.mode='air';cr.vy=0;cr.coy=0;toast('Slab crumbled!');FX.burst(ls.c,ls.y,10,100,DUST);Snd.crash();}}
 /* incoming slab vs creature (circle vs box) */
 if(slab&&cr.mode!=='dead'){
  const cy=cr.fy+R,qx=clamp(cr.x,slab.x-slab.w/2,slab.x+slab.w/2),qy=clamp(cy,slab.y,slab.y+slab.t);
  if(Math.hypot(cr.x-qx,cy-qy)<R*.85){Game.hit();return;}
 }
 /* star: steer into it to straighten the tower */
 const T2=topS();
 if(gs&&!stabz&&Math.hypot(cr.x,cr.fy+R-(T2.y+T2.t+100))<R+18){gs=null;SV.stars++;Progress.coins(10,'STAR +10');Progress.xp(50);Game.stabilise('Tower stabilised!');Progress.check();}
 gc=gc.filter(c=>{c.t+=dt;if(cr.mode!=='dead'&&Math.hypot(cr.x-c.x,cr.fy+R-c.y)<R+14){SV.cc++;Progress.coins(5,'+5');FX.burst(c.x,c.y,6,90,GOLD);FX.spark(c.x,c.y,6);Snd.tone(900,.1,'triangle',.1,400);return false;}return c.t<7;});
 /* tower dynamics */
 if(stabz){stabz.t+=dt;const q=Math.min(1,stabz.t/1.2),e=1-Math.pow(1-q,3);
  tower.forEach((s,i)=>{if(i>0){s.c=stabz.from[i]*(1-e);s.th*=.85;s.om*=.8;}});if(cr.mode==='stand')cr.x=stabz.fx*(1-e);if(q>=1)stabz=null;}
 const col=Phys.joints(dt);Warn.upd(dt);
 if(col){if(SV.net>0&&RL.nets){SV.net--;netUsed=1;save(1);Game.stabilise('Safety net saved the tower!');tower.forEach(s=>{s.th=0;s.om=0;});}else Game.collapse(col);}
}
function step(dt){
 t+=dt;tickLater(dt);ts+=(1-ts)*Math.min(1,dt*1.5);const d=dt*ts;for(const q of tower)if(q.pop>0)q.pop=Math.max(0,q.pop-dt*3);zp*=Math.exp(-dt*7);cr.blink-=dt;if(cr.blink<-.12)cr.blink=1.2+Math.random()*2.5;cr.sq*=Math.exp(-dt*9);
 if(ban){ban.t+=dt;if(ban.t>2.6)ban=null;}toasts.forEach(o=>o.t+=dt);toasts=toasts.filter(o=>o.t<3);fl.forEach(o=>o.t+=dt);fl=fl.filter(o=>o.t<1);
 if(st==='play'&&!paused){SV.time+=dt;sim(d/2);if(st==='play')sim(d/2);
  const tg=Math.max(0,topS().y+topS().t-.28*H);camY+=(tg-camY)*Math.min(1,dt*3);}
 if(st==='over'){overT+=dt;camY+=(0-camY)*Math.min(1,dt*1.6);if(slab)slab.x+=slab.v*d;}
 for(let k=0;k<2;k++)for(const p of debris)Phys.debris(p,d/2);
 hud+=(Math.min(1.2,stress)-hud)*Math.min(1,dt*8);hudS+=(wsg-hudS)*Math.min(1,dt*10);UI.upd(dt);trT=Math.min(1,trT+dt*3.2);FX.up(dt);
 if(st==='over'&&overT>.9&&!cfd&&(win||nbd)){cfd=1;for(let i=0;i<90;i++)CF.push({x:rnd(0,W),y:rnd(-300,-10),vx:rnd(-40,40),vy:rnd(120,260),r:rnd(0,6),vr:rnd(-6,6),c:['#ffd166','#ff94ca','#74c8ff','#a4e86a','#c7a6ff'][i%5]});}
 for(const q of CF){q.y+=q.vy*dt;q.x+=q.vx*dt+Math.sin(q.r*2)*30*dt;q.r+=q.vr*dt;}CF=CF.filter(q=>q.y<H+20);for(const o of RP)o.t+=dt;RP=RP.filter(o=>o.t<.45);
}

/* ================= RENDER ================= */
const col=(a,b,q)=>`rgb(${a.map((v,i)=>(v+(b[i]-v)*q)|0)})`;
const stars=Array.from({length:50},(_,i)=>[(Math.sin(i*91.3)*.5+.5)*W,(Math.sin(i*47.7)*.5+.5)*H*.8,1+(i%3)*.6]);
function sky(){
 const k=biome(),b=BI[k],p=BI[Math.max(0,k-1)],f=k?Math.min(1,(lv-b[0])/6):1,g=ctx.createLinearGradient(0,0,0,H);
 g.addColorStop(0,col(p[1],b[1],f));g.addColorStop(1,col(p[2],b[2],f));ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 if(k>=2){ctx.fillStyle='#fff';ctx.globalAlpha=k===3?f:.25*f;for(const s of stars)ctx.fillRect(s[0],s[1],s[2],s[2]);ctx.globalAlpha=1;}
 if(k<3){ctx.fillStyle='#fff';for(let i=0;i<6;i++){const y=GS-(200+i*330-camY*.4),x=((i*173+t*(6+World.wind*.15)*(1+i%2))%(W+200)+W+200)%(W+200)-100;
  ctx.globalAlpha=k===2?.3:.5;ctx.beginPath();ctx.arc(x,y,22,0,7);ctx.arc(x+26,y+4,18,0,7);ctx.arc(x-24,y+6,16,0,7);ctx.fill();}ctx.globalAlpha=1;}
 {const mc=k===1?'255,230,120':k===3?'200,210,255':'255,255,255';for(let i=0;i<22;i++){const x=(((i*89+t*(8+i%5*3))%W)+W)%W,y=(((i*131+camY*.2*(1+i%3*.4)+Math.sin(t*.8+i)*14)%H)+H)%H;ctx.fillStyle=`rgba(${mc},${(.25+.25*Math.sin(t*2+i))*(k===2?.3:1)})`;ctx.beginPath();ctx.arc(x,y,1.5+i%3*.8,0,7);ctx.fill();}}
 if(k<2){const hb=GS+camY*.3;for(let j=0;j<2;j++){ctx.fillStyle=j?'rgba(70,120,90,.55)':'rgba(90,140,110,.4)';ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W;x+=20)ctx.lineTo(x,hb-30-j*28-Math.sin(x*.012+j*2)*26-Math.sin(x*.031+j)*10);ctx.lineTo(W,H);ctx.fill();}}
 if(k>=2){const n_=Math.floor(t*.35),ph=t*.35-n_;if(ph<.18){const q=ph/.18,x=(n_*137)%W,y=60+(n_*61)%200;ctx.strokeStyle=`rgba(255,255,255,${1-q})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+q*120,y+q*60);ctx.lineTo(x+q*120-30,y+q*60-15);ctx.stroke();}}
 const gy=sy(0);if(gy<H){ctx.fillStyle=k===3?'#3b3556':'#6b4a2e';ctx.fillRect(0,gy,W,H-gy);ctx.fillStyle=k===3?'#6e6a8c':'#5f9b4a';ctx.fillRect(0,gy,W,12);}
}
function slabArt(cx,cy,w,t,k,stn,rt,crack){
 const d=TY[k],stone=k==='normal'&&stn;ctx.save();ctx.translate(cx,cy);ctx.rotate(rt);const r=Math.min(6,t/3);
 ctx.beginPath();ctx.roundRect(-w/2,-t/2,w,t,r);ctx.fillStyle=stone?'#8f95a3':d[0];ctx.fill();
 ctx.save();ctx.clip();ctx.strokeStyle='rgba(0,0,0,.28)';ctx.lineWidth=1.5;ctx.beginPath();
 if(k==='normal'&&!stone)for(let y=-t/2+t/3;y<t/2-2;y+=t/3){ctx.moveTo(-w/2,y);ctx.lineTo(w/2,y)}
 else if(stone||k==='breakable')for(let i=1;i<4;i++){const x=-w/2+w*i/4;ctx.moveTo(x,-t/2);ctx.lineTo(x+(i%2?6:-6),t/2)}
 else if(k==='heavy')for(const x of[-w/2+8,w/2-8]){ctx.moveTo(x+3,0);ctx.arc(x,0,3,0,7)}
 else if(k==='bouncy'||k==='unstable')for(let x=-w/2+10;x<w/2;x+=14){ctx.moveTo(x,-t/2);ctx.lineTo(x+7,t/2)}
 else if(k==='slippery'){ctx.moveTo(-w/2+10,-t/4);ctx.lineTo(w/4,-t/4)}
 else if(k==='moving'){ctx.moveTo(-14,0);ctx.lineTo(14,0);ctx.moveTo(8,-4);ctx.lineTo(14,0);ctx.lineTo(8,4);ctx.moveTo(-8,-4);ctx.lineTo(-14,0);ctx.lineTo(-8,4)}
 else if(k==='rotating'){ctx.moveTo(5,0);ctx.arc(0,0,5,0,7)}
 else if(k==='golden'){for(let i=-2;i<=2;i++){ctx.moveTo(i*w/6-6,t/2);ctx.lineTo(i*w/6+6,-t/2);}}
 ctx.stroke();
 if(crack>0){ctx.strokeStyle=`rgba(40,20,0,${Math.min(1,crack)})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-w/4,-t/2);ctx.lineTo(0,0);ctx.lineTo(-w/6,t/2);ctx.moveTo(w/5,-t/2);ctx.lineTo(w/8,t/3);ctx.stroke();}
 ctx.fillStyle='rgba(255,255,255,.28)';ctx.fillRect(-w/2,-t/2,w,4);ctx.restore();
 ctx.beginPath();ctx.roundRect(-w/2,-t/2,w,t,r);ctx.lineWidth=2.5;ctx.strokeStyle=stone?'#4f5566':d[1];ctx.stroke();ctx.restore();
}
function drawCreature(x,y,u,rt,air,look,si){
 const K=SK[si===undefined?SV.skin:si];
 ctx.save();ctx.translate(x,y);ctx.rotate(rt+Math.sin(t*13)*.1*Math.max(0,u-.5));
 const q=cr.sq+(air?0:Math.sin(t*3.2)*.025);ctx.scale(1+q*.3,1-q*.3);ctx.translate(0,-R);
 const g=ctx.createRadialGradient(-5,-6,2,0,0,R+2);g.addColorStop(0,K[1]);g.addColorStop(1,K[2]);
 ctx.beginPath();ctx.arc(0,0,R,0,7);ctx.fillStyle=g;ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle=K[3];ctx.stroke();
 const re=6+Math.min(1,u)*2.5,blink=cr.blink<0&&cr.blink>-.12;
 for(const sg of[-1,1]){
  const ex=sg*6.8,ey=-3;
  if(blink){ctx.beginPath();ctx.moveTo(ex-4,ey);ctx.lineTo(ex+4,ey);ctx.lineWidth=2;ctx.strokeStyle='#3a2208';ctx.stroke();}
  else{ctx.beginPath();ctx.arc(ex,ey,re,0,7);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#3a2208';ctx.stroke();
   ctx.beginPath();ctx.arc(ex+look[0]*(re-3.3),ey+look[1]*(re-3.3),3,0,7);ctx.fillStyle='#1c1104';ctx.fill();}
  if(u>.45||air){ctx.beginPath();ctx.moveTo(ex-sg*5,ey-re-2);ctx.lineTo(ex+sg*4,ey-re-(u>.45?7:5));ctx.lineWidth=2;ctx.strokeStyle='#3a2208';ctx.stroke();}
 }
 ctx.strokeStyle='#3a2208';ctx.lineWidth=2;ctx.fillStyle='#7a2a1a';
 if(air){ctx.beginPath();ctx.ellipse(0,9,3.5,4,0,0,7);ctx.fill();}
 else if(u>.55){ctx.beginPath();for(let i=0;i<=6;i++){const px=-6+i*2,py=10+(i%2?-2:1);i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();}
 else{ctx.beginPath();ctx.arc(0,6,5,.2,Math.PI-.2);ctx.stroke();}
 if(u>.8){ctx.fillStyle='#6cc3ff';ctx.beginPath();ctx.moveTo(R-2,-R+2);ctx.quadraticCurveTo(R+5,-R+10,R-2,-R+11);ctx.quadraticCurveTo(R-8,-R+8,R-2,-R+2);ctx.fill();}
 ctx.restore();
}
function drawStar(x,y,r){
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*2)*.2);
 ctx.shadowColor='#ffd23f';ctx.shadowBlur=18;ctx.fillStyle='#ffd23f';ctx.strokeStyle='#b88400';ctx.lineWidth=2;
 ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}
 ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.stroke();ctx.restore();
}
function drawTower(){
 const T=tower;slabArt(sx(T[0].c),sy(T[0].y+T[0].t/2),T[0].w,T[0].t,'normal',1,0,wi===1&&stress>.55?Math.min(1,(stress-.55)*2.4):0);
 ctx.save();
 for(let i=1;i<T.length;i++){
  const s=T[i],sp=T[i-1];
  if(i===wi&&st==='play'&&stress>.4){const x=sx(wcom),y=sy(sp.y+sp.t)-3;ctx.fillStyle=`hsl(${120-120*Math.min(1,stress)},85%,52%)`;ctx.strokeStyle='#222';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-6,y-11);ctx.lineTo(x+6,y-11);ctx.closePath();ctx.fill();ctx.stroke();}
  const ps=s.th>=0?1:-1,px=sx(sp.c+ps*sp.w/2),py=sy(sp.y+sp.t);
  ctx.translate(px,py);ctx.rotate(s.th);ctx.translate(-px,-py);
  if(i===wi&&stress>.75&&st==='play')ctx.translate((Math.random()-.5)*(stress-.7)*6,0);
  const pp=s.pop>0?s.pop*.1*Math.cos((1-s.pop)*12):0;if(pp){ctx.save();ctx.translate(sx(s.c),sy(s.y));ctx.scale(1+pp,1-pp);ctx.translate(-sx(s.c),-sy(s.y));}
  const vy_=sy(s.y+s.t/2);if(vy_>-300&&vy_<H+300)slabArt(sx(s.c),vy_,s.w,s.t,s.k,s.st,0,Math.max(s.cr,(i===wi-1||i===wi)&&stress>.55?Math.min(1,(stress-.55)*2.4):0));if(pp)ctx.restore();
 }
 if(cr.mode!=='dead'){
  {const sf=Player.surf(cr.x,cr.fy+2);if(sf){const h_=Math.max(0,cr.fy-sf.y),k_=Math.max(.2,1-h_/700);ctx.fillStyle=`rgba(0,0,0,${Math.max(0,.3-h_/500)})`;ctx.beginPath();ctx.ellipse(sx(cr.x),sy(sf.y)+1,R*k_,4*k_+1,0,0,7);ctx.fill();}}
  if(combo>=3){const ax=sx(cr.x),ay=sy(cr.fy)-R,ga=ctx.createRadialGradient(ax,ay,4,ax,ay,R*2.6);ga.addColorStop(0,`rgba(255,200,80,${Math.min(.55,.1*combo)})`);ga.addColorStop(1,'rgba(255,200,80,0)');ctx.fillStyle=ga;ctx.fillRect(ax-60,ay-60,120,120);}
  const u=hud,lk=slab?[clamp((slab.x-cr.x)/150,-1,1),-.2]:[0,-.7];
  drawCreature(sx(cr.x),sy(cr.fy),u,clamp(cr.vx/900,-.25,.25),cr.mode==='air',cr.mode==='air'?[0,-.8]:lk);hatArt(sx(cr.x),sy(cr.fy));
 }
 ctx.restore();
}
function draw(){
 B=[];sky();if(st!=='play'&&st!=='over'){ui();return;}
 ctx.save();const shk=FX.sh*[0,.5,1][SV.shk];if(shk>.3)ctx.translate(rnd(-shk,shk)*.5,rnd(-shk,shk)*.5);if(st==='play'){ctx.translate(W/2,H*.7);ctx.rotate(hudS*.012);ctx.translate(-W/2,-H*.7);}if(zp>.001){ctx.translate(W/2,GS*.9);ctx.scale(1+zp,1+zp);ctx.translate(-W/2,-GS*.9);}
 drawTower();
 if(mode==='endless'&&SV.bestY>0&&lv<SV.best){const by=sy(SV.bestY);ctx.setLineDash([10,8]);ctx.strokeStyle='rgba(255,230,140,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,by);ctx.lineTo(W,by);ctx.stroke();ctx.setLineDash([]);txt('BEST '+SV.best,W-10,by-6,14,'#ffe9a8','right');}
 if(gs&&st==='play'){const T=topS();drawStar(sx(0),sy(T.y+T.t+100+Math.sin(t*3)*6),17);}
 if(st==='play')for(const c of gc){const w=Math.abs(Math.cos(t*4+c.x));ctx.save();ctx.translate(sx(c.x),sy(c.y)+Math.sin(t*3+c.x)*3);ctx.globalAlpha=Math.min(1,7-c.t);ctx.fillStyle='#ffd166';ctx.strokeStyle='#8a5a00';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,0,10*w+2,11,0,0,7);ctx.fill();ctx.stroke();ctx.restore();}
 if(slab&&st==='play'&&Math.abs(slab.x)>W/2+slab.w/2){const ix=slab.dir>0?16:W-16,iy=sy(slab.y+slab.t/2),d_=slab.dir;ctx.fillStyle=`rgba(255,120,80,${.6+.4*Math.sin(t*14)})`;ctx.beginPath();ctx.moveTo(ix+d_*12,iy);ctx.lineTo(ix-d_*8,iy-14);ctx.lineTo(ix-d_*8,iy+14);ctx.fill();}
 if(slab&&st==='play')for(let j=3;j>0;j--){ctx.globalAlpha=.16/j;slabArt(sx(slab.x-slab.dir*j*16),sy(slab.y+slab.t/2),slab.w,slab.t,slab.k,slab.st,slab.ang,0);}ctx.globalAlpha=1;
 if(slab)slabArt(sx(slab.x),sy(slab.y+slab.t/2),slab.w,slab.t,slab.k,slab.st,slab.ang,0);
 for(const p of debris){
  if(p.cr){ctx.save();ctx.translate(sx(p.x),sy(p.y));ctx.rotate(p.r);ctx.translate(0,R);drawCreature(0,0,1.2,0,true,[Math.cos(t*20),Math.sin(t*20)]);ctx.restore();}
  else if(sy(p.y)>-300&&sy(p.y)<H+300)slabArt(sx(p.x),sy(p.y),p.w,p.t,p.k,p.st,p.r,0);
 }
 Haz.draw();FX.draw();ctx.restore();
 const bk=biome();
 if(bk===2){ctx.strokeStyle='rgba(200,220,255,.4)';ctx.lineWidth=1.2;ctx.beginPath();for(let i=0;i<70;i++){const x=(i*83+t*World.wind*.4)%W,y=(i*57+t*650)%H;ctx.moveTo((x+W)%W,y);ctx.lineTo((x+W)%W+World.wind*.04,y+14);}ctx.stroke();}
 if(World.gold>0){ctx.fillStyle='rgba(255,200,60,.12)';ctx.fillRect(0,0,W,H);}
 for(const o of fl){ctx.globalAlpha=Math.max(0,1-o.t);ttl(o.s,sx(cr.x)+26,sy(cr.fy)-60-o.t*50,16+14*Math.max(0,1-o.t*5),'#ffe58a','left');ctx.globalAlpha=1;}
 if(stabz)for(let i=0;i<14;i++){const a=i*.9+t*3,rr=40+stabz.t*120;ctx.fillStyle=`rgba(255,215,70,${1-stabz.t/1.2})`;ctx.fillRect(sx(cr.x)+Math.cos(a)*rr,sy(cr.fy)-30+Math.sin(a)*rr,4,4);}
 ui();
}
/* ================= UI KIT: everything is a slab ================= */
const PAL={gold:['#ffd166','#e8890c'],blue:['#74c8ff','#2b72c9'],green:['#a4e86a','#3f9d2e'],pink:['#ff94ca','#c93d8a'],violet:['#c7a6ff','#7a4ad8'],white:['#ffffff','#b5bdd9'],red:['#ff8374','#c6372b'],wood:['#c58a52','#8a5a2b'],dark:['#3b4070','#222647']};
const FONT='"Lilita One","Trebuchet MS",system-ui,sans-serif';
const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r)};
function spk(x,y,r){ctx.beginPath();ctx.moveTo(x,y-r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.quadraticCurveTo(x,y,x,y+r);ctx.quadraticCurveTo(x,y,x-r,y);ctx.quadraticCurveTo(x,y,x,y-r);ctx.fill();}
const ICON={PLAY:'▶',SHOP:'🛍️',QUESTS:'📜',RELICS:'🏺',PROFILE:'👤',BACK:'◀','CLIMB!':'⛰️',RETRY:'🔄',MENU:'🏠',MAP:'🗺️','NEXT STAGE':'➡️',REPLAY:'🔁',RESUME:'▶',RESTART:'🔄',HOME:'🏠',START:'🚀','GOT IT':'👍','PLAY AGAIN':'🔁'};
function txt(s,x,y,size,c,al){ctx.font=`${size}px ${FONT}`;ctx.textAlign=al||'center';ctx.fillStyle=c;ctx.fillText(s,x,y);}
function ttl(s,x,y,size,c,al){ctx.font=`${size}px ${FONT}`;ctx.textAlign=al||'center';ctx.lineJoin='round';ctx.lineWidth=size/4.2;ctx.strokeStyle='#241437';ctx.strokeText(s,x,y);ctx.fillStyle=c||'#fff';ctx.fillText(s,x,y);}
function plank(x,y,w,h,p,r){
 r=r||14;ctx.fillStyle='rgba(8,6,28,.5)';rr(x,y+6,w,h,r);ctx.fill();
 const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,p[0]);g.addColorStop(1,p[1]);ctx.fillStyle=g;rr(x,y,w,h,r);ctx.fill();
 ctx.fillStyle='rgba(0,0,0,.13)';rr(x+3,y+h-10,w-6,7,5);ctx.fill();ctx.fillStyle='rgba(255,255,255,.38)';rr(x+5,y+4,w-10,Math.min(8,h/4),5);ctx.fill();
 ctx.lineWidth=3;ctx.strokeStyle='#241437';rr(x,y,w,h,r);ctx.stroke();ctx.lineWidth=1.5;ctx.strokeStyle='rgba(255,255,255,.2)';rr(x+2.5,y+2.5,w-5,h-5,Math.max(2,r-2));ctx.stroke();
}
const UI={sp:{},spring(id){return this.sp[id]||(this.sp[id]={a:0,v:0,s:0});},
 upd(dt){for(const k in this.sp){const o=this.sp[k];o.v+=(-o.a*170-o.v*6)*dt;o.a+=o.v*dt;o.s*=Math.exp(-dt*9);}}};
function go(s){st=s;trT=0;Snd.tone(260,.1,'triangle',.06,120);}
function toMenu(){reset();go('title');}
function btn(x,y,w,h,label,fn,pal,dis,sub){
 const o=UI.spring(label+x+y),p=dis?PAL.dark:PAL[pal||'gold'];
 const px_=Math.min(5,Math.max(0,(44/FS-w)/2)),py_=Math.min(5,Math.max(0,(44/FS-h)/2));
 B.push({x:x-px_,y:y-py_,w:w+2*px_,h:h+2*py_,fn:dis?null:()=>{o.v+=(Math.random()<.5?-1:1)*6;o.s=1;Snd.tone(430,.08,'square',.05,200);vib(10);fn();}});
 ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(o.a*.1+Math.sin(t*1.4+x*.02+y*.01)*.006);o.h=(o.h||0)+(((mx>=x&&mx<=x+w&&my>=y&&my<=y+h&&!dis)?1:0)-(o.h||0))*.2;const hv=1+o.h*.045;ctx.scale((1+o.s*.07)*hv,(1-o.s*.07)*hv);
 plank(-w/2,-h/2,w,h,p);if(!dis){ctx.save();rr(-w/2,-h/2,w,h,14);ctx.clip();const sw=(((t*.5+x*.003)%3.4)-.7)*w-w/2;ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.moveTo(sw-10,-h/2);ctx.lineTo(sw+14,-h/2);ctx.lineTo(sw-6,h/2);ctx.lineTo(sw-30,h/2);ctx.fill();ctx.restore();}const sz=Math.min(26,h*.5);
 ttl(label,0,sub?-2:sz*.35,sz,dis?'#9aa0c8':'#fff');if(sub)txt(sub,0,h*.3,Math.min(13,h*.24),'rgba(36,20,55,.85)');{const ic=ICON[label];if(ic){ctx.font=`${sz}px serif`;ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(ic,-w/2+h*.55,sz*.35+1);}}
 ctx.restore();
}
function coinChip(xr,y){
 const o_=UI.spring('coin');ctx.save();ctx.translate(xr-56,y+18);ctx.scale(1+o_.s*.15,1+o_.s*.15);ctx.translate(-(xr-56),-(y+18));
 plank(xr-112,y,112,36,PAL.dark,12);ctx.fillStyle='#ffd166';ctx.strokeStyle='#8a5a00';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(xr-90,y+18,11,0,7);ctx.fill();ctx.stroke();
 txt('$',xr-90,y+23,14,'#8a5a00');ttl(Math.round(UI.dc=(UI.dc===undefined?SV.coins:UI.dc+(SV.coins-UI.dc)*.15)),xr-14,y+27,22,'#fff','right');ctx.restore();
}
function bg(){
 ctx.fillStyle='rgba(22,14,54,.88)';ctx.fillRect(0,0,W,H);
 ctx.globalCompositeOperation='screen';
 [[.2,.25,'#5b3fd8'],[.85,.55,'#d83f9a'],[.4,.9,'#2f8fd8']].forEach((b,i)=>{const x=W*(b[0]+.08*Math.sin(t*.35+i*2)),y=H*(b[1]+.06*Math.cos(t*.3+i)),g=ctx.createRadialGradient(x,y,10,x,y,320);g.addColorStop(0,b[2]+'59');g.addColorStop(1,b[2]+'00');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);});
 ctx.globalCompositeOperation='source-over';
 const gv=ctx.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,H*.8);gv.addColorStop(0,'rgba(0,0,0,0)');gv.addColorStop(1,'rgba(0,0,0,.4)');ctx.fillStyle=gv;ctx.fillRect(0,0,W,H);
 const P=['#ffd166','#74c8ff','#ff94ca','#a4e86a','#c7a6ff'];
 for(let i=0;i<10;i++){const sc=.6+(i%3)*.35;ctx.save();ctx.translate((i*97+30)%W,((t*(18+i%3*12)+i*150)%(H+120))-60);ctx.rotate(t*.3*(i%2?1:-1)+i);ctx.globalAlpha=.1+.04*(i%3);ctx.fillStyle=P[i%5];rr(-26*sc,-9*sc,52*sc,18*sc,5);ctx.fill();ctx.restore();}
 ctx.fillStyle='#fff';for(let i=0;i<26;i++){ctx.globalAlpha=.15+.35*Math.abs(Math.sin(t*1.5+i*1.7));ctx.fillRect((i*71)%W,(i*113+t*6)%H,2,2);}ctx.globalAlpha=1;
}
function head(title,back){
 bg();plank(W/2-100,18,200,48,PAL.gold,16);ctx.fillStyle='rgba(36,20,55,.55)';for(const rx of[W/2-86,W/2+86]){ctx.beginPath();ctx.arc(rx,42,4,0,7);ctx.fill();}ttl(title,W/2,54,title.length>11?20:30,'#fff');coinChip(W-12,24);
 btn(W/2-70,H-62,140,46,'BACK',()=>go(back||'title'),'white');
}
function hatArt(x,y){if(SV.hat<0)return;ctx.font='22px serif';ctx.textAlign='center';ctx.fillStyle='#000';ctx.fillText(RLC[SV.hat][0],x,y-2*R+5);}
function card(x,y,w,h,pal,title,sub,foot,fn){
 const o=UI.spring('c'+title);B.push({x,y,w,h,fn:()=>{o.v+=5;o.s=1;Snd.tone(430,.08,'square',.05,200);vib(10);fn();}});
 ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(o.a*.06+Math.sin(t*1.2+y)*.004);o.h=(o.h||0)+(((mx>=x&&mx<=x+w&&my>=y&&my<=y+h)?1:0)-(o.h||0))*.2;const hv=1+o.h*.025;ctx.scale((1+o.s*.04)*hv,(1-o.s*.04)*hv);
 plank(-w/2,-h/2,w,h,pal,20);ctx.save();rr(-w/2,-h/2,w,h,20);ctx.clip();{const sw=(((t*.4+y*.004)%3.2)-.6)*w-w/2;ctx.fillStyle='rgba(255,255,255,.2)';ctx.beginPath();ctx.moveTo(sw-12,-h/2);ctx.lineTo(sw+20,-h/2);ctx.lineTo(sw-4,h/2);ctx.lineTo(sw-36,h/2);ctx.fill();}ctx.restore();{const ic={ENDLESS:'♾️',CAMPAIGN:'🗺️','DAILY CHALLENGE':'📅'}[title];if(ic){ctx.font='40px serif';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(ic,w/2-44,14+Math.sin(t*3)*3);}}ttl(title,0,-h/2+46,title.length>9?30:36,'#fff');txt(sub,0,-h/2+70,14,'rgba(36,20,55,.85)');ttl(foot,0,h/2-14,17,'#fff');ctx.restore();
}
function starRow(x,y,n,r,gap){for(let i=0;i<3;i++){ctx.globalAlpha=i<n?1:.22;drawStar(x+i*gap,y,r);}ctx.globalAlpha=1;}

/* ---------- HUB: the menu is a swaying tower of slabs ---------- */
function hub(){
 {const gl=ctx.createRadialGradient(W/2,150,10,W/2,150,240);gl.addColorStop(0,`rgba(255,200,90,${.28+.08*Math.sin(t*2)})`);gl.addColorStop(1,'rgba(255,200,90,0)');ctx.fillStyle=gl;ctx.fillRect(0,40,W,240);}
 const L='TEETER',cols=['wood','blue','pink','green','violet','gold'];
 for(let i=0;i<6;i++){const o=UI.spring('L'+i),x=48+i*64,y=112+Math.sin(t*1.7+i)*3;
  B.push({x,y,w:60,h:70,fn:()=>{o.v+=8;o.s=1;Snd.tone(300+i*60,.12,'triangle',.08);}});
  ctx.save();ctx.translate(x+30,y+35);ctx.rotate(o.a*.22+Math.sin(t*1.1+i*1.7)*.05+(i%2?.03:-.03));ctx.scale(1+o.s*.1,1-o.s*.1);
  plank(-30,-35,60,70,PAL[cols[i]],10);ttl(L[i],0,19,54,'#fff');ctx.restore();}
 ttl('BUILD IT. BALANCE IT. DON\u2019T LOOK DOWN.',W/2,226,15,'#ffe9a8');for(let i=0;i<8;i++){const ph=(t*.8+i*.37)%1;ctx.globalAlpha=Math.sin(ph*3.14);ctx.fillStyle='#fff6c0';spk(40+((i*61)%400),100+((i*47)%120),3+ph*7);}ctx.globalAlpha=1;
 plank(130,244,220,36,PAL.dark,12);txt(`LV ${lvl()}   \u2022   BEST ${SV.best}`,W/2,269,18,'#8be9ff');{const L_=lvl(),a_=50*(L_-1)**2,b_=50*L_*L_;ctx.fillStyle='rgba(0,0,0,.4)';rr(150,286,180,9,4);ctx.fill();ctx.fillStyle='#8be9ff';rr(150,286,Math.max(9,180*(SV.xp-a_)/(b_-a_)),9,4);ctx.fill();}coinChip(W-12,10);btn(12,10,70,36,'SET',()=>go('settings'),'white');btn(90,10,44,36,'?',()=>go('help'),'white');btn(142,10,84,36,'CHEST',()=>go('chest'),'gold');if(SV.chests>0){ctx.fillStyle='#ff4d4d';ctx.strokeStyle='#241437';ctx.lineWidth=3;ctx.beginPath();ctx.arc(218,12,12,0,7);ctx.fill();ctx.stroke();ttl(SV.chests,218,19,16,'#fff');}
 const rows=[['PLAY','gold',320,74,()=>go('modes')],['SHOP','blue',290,62,()=>go('shop')],['QUESTS','green',260,62,()=>go('quests')],['RELICS','violet',230,62,()=>go('relics')],['PROFILE','pink',200,62,()=>go('profile')]];
 const tw=UI.spring('tw');let y=706,dx=0;
 rows.forEach((r,i)=>{y-=r[3];dx=Math.sin(t*.9)*i*1.8+tw.a*i*7;
  btn(W/2-r[2]/2+dx,y,r[2],r[3],r[0],()=>{tw.v+=7;r[4]();},r[1]);
  if(i===0&&!dailyDone()){ctx.fillStyle='#ff4d4d';ctx.strokeStyle='#241437';ctx.lineWidth=3;ctx.beginPath();ctx.arc(W/2+r[2]/2-8+dx,y+8,13,0,7);ctx.fill();ctx.stroke();ttl('!',W/2+r[2]/2-8+dx,y+15,20,'#fff');}y-=6;});
 const cx=W/2+dx,cy=y+6;
 drawCreature(cx,cy,0,dx*.004,false,[clamp((mx-cx)/100,-1,1),clamp((my-cy+17)/100,-1,1)]);hatArt(cx,cy);
}

/* ---------- MODES, CAMPAIGN, STAGE CARD ---------- */
function modes(){
 head('CHOOSE YOUR CLIMB');const sts=SV.camp.reduce((a,b)=>a+(b||0),0);
 card(24,84,W-48,108,PAL.gold,'ENDLESS','Climb until it all comes crashing down.',`Best: ${SV.best} levels`,()=>begin(()=>{mode='endless';Game.start();}));
 card(24,204,W-48,108,PAL.blue,'CAMPAIGN','15 stages \u2022 6 bosses \u2022 the Summit',`${STG.every((_,i)=>SV.camp[i]>0)?'COMPLETE \u2022 ':''}${sts} / ${STG.length*3} stars`,()=>go('camp'));
 card(24,324,W-48,108,PAL.pink,'DAILY CHALLENGE','Same slabs for everyone. Keep your streak!',dailyDone()?`\u2713 Cleared  \u2022  streak ${curStreak()}`:`Streak ${curStreak()}  \u2022  new today!`,()=>go('daily'));
 const c=CT[contract];plank(24,448,W-48,150,PAL.dark,18);ttl('CONTRACT  \u2022  Endless only',W/2,476,18,'#ffd166');
 btn(36,492,52,52,'<',()=>contract=(contract+CT.length-1)%CT.length,'violet');btn(W-88,492,52,52,'>',()=>contract=(contract+1)%CT.length,'violet');
 ttl(c[0],W/2,520,26,'#fff');txt(c[1],W/2,542,14,'#cfd6ff');ttl(c[2]>1?`COINS & XP  x${c[2]}`:'No bonus',W/2,582,17,c[2]>1?'#a4e86a':'#9aa3d6');
 dmInit();dmPick().forEach((ix,j)=>{const k=DMK[ix],v=Math.min(k[2],SV[k[1]]-SV.dm.b[ix]),d=SV.dm.c[j],x=24+j*146;B.push({x,y:608,w:138,h:76,fn:()=>{qp=0;go('quests')}});plank(x,608,138,76,d?PAL.green:PAL.dark,14);txt(k[0],x+69,630,12,d?'#2a1a3a':'#dfe4ff');ctx.fillStyle='rgba(0,0,0,.4)';rr(x+12,642,114,10,5);ctx.fill();ctx.fillStyle=d?'#fff':'#ffd166';rr(x+12,642,Math.max(10,114*v/k[2]),10,5);ctx.fill();ttl(d?'DONE':'+'+k[3],x+69,674,17,d?'#fff':'#ffd166');});
}
function camp(){
 head('CAMPAIGN','modes');const sts=SV.camp.reduce((a,b)=>a+(b||0),0),nx=STG.findIndex((_,i)=>!(SV.camp[i]>0));
 plank(12,24,104,36,PAL.dark,12);ttl('\u2605 '+sts+'/'+STG.length*3,64,50,17,'#ffd166');
 if(STG.every((_,i)=>SV.camp[i]>0)){plank(W-168,66,156,26,PAL.green,10);ttl('ALL STAGES CLEAR',W-90,85,13,'#fff');}
 STG.forEach((s,i)=>{
  const unl=i===0||(SV.camp[i-1]||0)>0,n=SV.camp[i]||0,x=W/2-110+(i%2?44:-44),y=648-i*41;
  const pal=n?'green':unl?'gold':'dark',o=UI.spring('n'+i);
  if(unl)B.push({x,y,w:220,h:37,fn:()=>{o.v+=5;o.s=1;stage=i;go('stage');}});
  ctx.save();ctx.translate(x+110,y+18);ctx.rotate(o.a*.08+Math.sin(t*1.3+i)*.01);ctx.scale(1+o.s*.05,1-o.s*.05);
  plank(-110,-18,220,37,PAL[pal],11);ttl(`${i+1}. ${s[0]}`,-98,5,unl?16:14,unl?'#fff':'#8d93c2','left');ctx.restore();
  if(unl)starRow(x+168,y+18,n,5,14);else txt('LOCKED',x+192,y+23,12,'#8d93c2');
  if(s[4]){plank(x-34,y+3,28,30,PAL.red,8);ttl('\u2620',x-20,y+25,16,'#fff');}
  if(i===nx&&unl){ctx.fillStyle='#ff6b5e';ctx.strokeStyle='#241437';ctx.lineWidth=2;const ax=x+228+Math.sin(t*6)*4;ctx.beginPath();ctx.moveTo(ax,y+18);ctx.lineTo(ax+12,y+8);ctx.lineTo(ax+12,y+28);ctx.closePath();ctx.fill();ctx.stroke();}
 });
}
function ruleText(i){const r=STG[i][2],a=[];if(r.types)a.push('Only '+r.types.join(' / ')+' slabs');if(r.wind>1)a.push('Strong wind');if(r.quake)a.push('Earthquakes');if(STG[i][4])a.push('Boss: '+STG[i][4].map(k=>({ball:'wrecking ball',bolt:'lightning',rock:'boulders'})[k]).join(' + '));return a.length?a:['Classic rules'];}
function stageCard(){
 head('STAGE '+(stage+1),'camp');const s=STG[stage];
 plank(30,96,W-60,430,PAL.dark,22);ttl(s[0],W/2,158,36,'#ffd166');txt(s[3],W/2,190,16,'#cfd6ff');if(s[4]){plank(W/2-120,200,240,32,PAL.red,10);ttl('BOSS: '+s[5],W/2,224,18,'#fff');}
 ttl(`GOAL: REACH ${s[1]} LEVELS`,W/2,252,24,'#fff');
 ruleText(stage).forEach((r,i)=>txt('\u2022 '+r,W/2,292+i*26,18,'#a4e86a'));
 starRow(W/2-48,380,SV.camp[stage]||0,17,48);
 txt('\u2605 reach the goal    \u2605\u2605 40% perfect landings',W/2,422,13,'#b9c2ee');txt('\u2605\u2605\u2605 no safety net + a 4x combo',W/2,442,13,'#b9c2ee');
 {const L_=STORY[stage].split(' ');let a_='',b_='';L_.forEach(w=>{if((a_+w).length<34)a_+=w+' ';else b_+=w+' ';});plank(112,548,W-134,84,PAL.white,16);ctx.fillStyle='#fff';ctx.strokeStyle='#241437';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(114,590);ctx.lineTo(96,602);ctx.lineTo(114,608);ctx.closePath();ctx.fill();ctx.stroke();ttl('PIP',130,572,15,'#7a4ad8','left');txt(a_,130,596,14,'#2a1a3a','left');txt(b_,130,616,14,'#2a1a3a','left');drawCreature(56,640,0,Math.sin(t*2)*.06,false,[.6,-.2],4);}
 btn(80,462,320,56,'CLIMB!',()=>begin(()=>{mode='campaign';Game.start();toast(`${s[0]} \u2014 reach ${s[1]}`);}),'gold');
}

/* ---------- SHOP ---------- */
function shop(){
 head('SHOP');txt('CREATURES  '+(skp+1)+'/2',24,108,16,'#ffd166','left');btn(W-130,84,52,28,'<',()=>{skp=(skp+1)%2},'violet');btn(W-70,84,52,28,'>',()=>{skp=(skp+1)%2},'violet');
 SK.forEach((K,i)=>{if((i/5|0)!==skp)return;
  const x=20+(i%5)*88,y=118,own=SV.own[i],lock=lvl()<K[5],eq=SV.skin===i,o=UI.spring('sk'+i);
  B.push({x,y,w:80,h:124,fn:()=>{o.v+=5;if(lock)return;if(own)SV.skin=i;else if(SV.coins>=K[4]){SV.coins-=K[4];SV.own[i]=1;SV.skin=i;}save(1);}});
  ctx.save();ctx.translate(x+40,y+62);ctx.rotate(o.a*.1);plank(-40,-62,80,124,eq?PAL.gold:PAL.dark,14);
  drawCreature(0,12,0,0,false,[0,0],i);ttl(K[0],0,-38,15,'#fff');
  ttl(eq?'ON':lock?'LV '+K[5]:own?'WEAR':K[4]+'$',0,48,16,eq?'#fff':lock?'#8d93c2':own?'#a4e86a':'#ffd166');ctx.restore();
 });
 txt('UPGRADES',24,274,16,'#ffd166','left');
 UP.forEach((U,i)=>{
  const y=284+i*70,lv_=SV.up[i],c=U[2][lv_];plank(20,y,W-40,60,PAL.dark,14);ttl(U[0],34,y+27,20,'#fff','left');txt(U[1],34,y+48,12,'#b9c2ee','left');
  for(let k=0;k<3;k++){ctx.fillStyle=k<lv_?'#ffd166':'rgba(255,255,255,.18)';ctx.strokeStyle='#241437';ctx.lineWidth=2;ctx.beginPath();ctx.arc(250+k*22,y+30,8,0,7);ctx.fill();ctx.stroke();}
  btn(W-150,y+9,124,42,lv_>=3?'MAX':c+'$',()=>{if(SV.coins>=c){SV.coins-=c;SV.up[i]++;save(1);}},'gold',lv_>=3||SV.coins<c);
 });
 const y=284+3*70;plank(20,y,W-40,60,PAL.dark,14);ttl('Safety net  x'+SV.net,34,y+27,20,'#9fe8ff','left');txt('Saves the tower once instead of collapsing',34,y+48,12,'#b9c2ee','left');
 btn(W-150,y+9,124,42,NETC+'$',()=>{if(SV.coins>=NETC){SV.coins-=NETC;SV.net++;save(1);}},'blue',SV.coins<NETC);
}

/* ---------- QUESTS ---------- */
function openChest(){SV.chests--;chs.t0=t;chs.b=0;Snd.tone(160,.3,'sawtooth',.08,-60);const q=Math.random();let m;
 if(q<.45){const n=60+(Math.random()*100|0);SV.coins+=n;SV.earned+=n;m='+'+n+' coins';UI.spring('coin').s=1;}
 else if(q<.62){SV.net++;m='+1 Safety net';}
 else if(q<.85){const n=100+(Math.random()*150|0);Progress.xp(n);m='+'+n+' XP';}
 else{const ms=RLC.map((_,i)=>i).filter(i=>!SV.relics.includes(i));if(ms.length){const i=ms[Math.random()*ms.length|0];SV.relics.push(i);m='NEW RELIC! '+RLC[i][1]+' '+RLC[i][0];if(SV.relics.length%4===0)SV.coins+=100;}else{SV.coins+=250;SV.earned+=250;m='+250 coins';}}
 chs.rw=m;save(1);}
function chestScr(){
 head('TREASURE');const n=SV.chests||0,e=chs.t0===undefined?-1:t-chs.t0,cx=W/2,cy=360;
 const shake=e>=0&&e<1?Math.sin(e*45)*.1*e:0,bob=e<0?Math.sin(t*2)*5:0,lid=e>1?-Math.min(1,(e-1)*3)*1.15:0;
 if(e>1&&!chs.b){chs.b=1;Snd.perfect(8);}
 if(e>1){ctx.save();ctx.translate(cx,cy-20);ctx.rotate(t*.3);const g_=Math.min(1,(e-1)*2);for(let i=0;i<14;i++){ctx.rotate(.45);ctx.fillStyle=`rgba(255,226,120,${.2*g_})`;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-18,-240*g_);ctx.lineTo(18,-240*g_);ctx.fill();}ctx.restore();}
 ctx.save();ctx.translate(cx,cy+bob);ctx.rotate(shake);
 plank(-80,-10,160,90,PAL.wood,14);ctx.fillStyle='#e8a317';rr(-14,-10,28,90,4);ctx.fill();ctx.beginPath();ctx.arc(0,26,10,0,7);ctx.fillStyle='#ffe58a';ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle='#241437';ctx.stroke();
 if(e>1){ctx.fillStyle='rgba(255,240,150,.95)';rr(-70,-14,140,10,5);ctx.fill();}
 ctx.save();ctx.translate(-80,-10);ctx.rotate(lid);plank(0,-46,160,46,PAL.gold,14);ctx.restore();ctx.restore();
 if(e>1.3&&chs.rw){const q=Math.min(1,(e-1.3)*3);ctx.save();ctx.translate(W/2,150);ctx.scale(q*(1+Math.sin(q*3.14)*.2),q*(1+Math.sin(q*3.14)*.2));ctx.globalAlpha=q;ttl(chs.rw,0,0,chs.rw.length>20?26:34,'#ffe27a');ctx.restore();}
 if(e<0||e>2.2){if(n>0)btn(80,490,320,62,'OPEN CHEST ('+n+')',openChest,'gold');else txt('No chests yet',W/2,524,22,'#b9c2ee');}
 txt('Chests drop from bosses, first 3-star clears,',W/2,590,13,'#8f9ad8');txt('daily missions, weekly goals, every 50 levels',W/2,608,13,'#8f9ad8');txt('and every 5 account levels.',W/2,626,13,'#8f9ad8');
}
function quests(){
 head('QUESTS');dmInit();const np=1+Math.ceil(TK.length/8);
 btn(24,H-62,70,46,'<',()=>{qp=(qp+np-1)%np},'violet');btn(W-94,H-62,70,46,'>',()=>{qp=(qp+1)%np},'violet');
 for(let i=0;i<np;i++){ctx.fillStyle=i===qp?'#ffd166':'rgba(255,255,255,.25)';ctx.beginPath();ctx.arc(W/2-(np-1)*8+i*16,H-80,4,0,7);ctx.fill();}
 if(qp===0){
  ttl('DAILY MISSIONS',W/2,106,24,'#ffd166');txt('Fresh every day  \u2022  clear all 3 for +60 bonus',W/2,128,13,'#b9c2ee');
  dmPick().forEach((ix,j)=>{const k=DMK[ix],y=146+j*88,d=SV.dm.c[j],v=Math.min(k[2],SV[k[1]]-SV.dm.b[ix]);
   plank(20,y,W-40,78,d?PAL.green:PAL.dark,14);ttl(k[0],34,y+30,20,'#fff','left');ctx.fillStyle='rgba(0,0,0,.4)';rr(34,y+46,270,14,7);ctx.fill();
   if(v>0){ctx.fillStyle=d?'#fff':'#ffd166';rr(34,y+46,Math.max(14,270*v/k[2]),14,7);ctx.fill();}
   txt(v+'/'+k[2],316,y+58,14,'#e8ecff','left');d?ttl('DONE',W-34,y+44,22,'#fff','right'):ttl('+'+k[3],W-34,y+48,28,'#ffd166','right');});
  const n=new Date(),ms=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1)-n,p2=v=>String(v).padStart(2,'0');
  txt(`New missions in ${p2(ms/36e5|0)}:${p2(ms/6e4%60|0)}:${p2(ms/1e3%60|0)}`,W/2,430,14,'#8f9ad8');
  wkInit();{const k=WKK[wkI()%3],v=Math.min(k[2],SV[k[1]]-SV.wk.b),d=SV.wk.done;plank(20,452,W-40,92,d?PAL.green:PAL.violet,14);txt('WEEKLY CHALLENGE',34,474,13,d?'#2a1a3a':'#f1e8ff','left');ttl(k[0]+' this week',34,502,20,'#fff','left');ctx.fillStyle='rgba(0,0,0,.4)';rr(34,516,270,14,7);ctx.fill();if(v>0){ctx.fillStyle=d?'#fff':'#ffd166';rr(34,516,Math.max(14,270*v/k[2]),14,7);ctx.fill();}txt(v+'/'+k[2],316,528,14,'#fff','left');ttl(d?'DONE':'+'+k[3]+' & chest',W-34,500,d?22:17,'#ffd166','right');}
  ttl(`TASKS DONE  ${SV.done.length} / ${TK.length}`,W/2,584,22,'#a4e86a');txt('Use the arrows for permanent tasks',W/2,608,13,'#8f9ad8');return;}
 TK.slice((qp-1)*8,qp*8).forEach((k,i0)=>{
  const i=(qp-1)*8+i0,y=84+i0*68,d=SV.done.includes(i),v=Math.min(SV[k[1]]||0,k[2]);plank(20,y,W-40,60,d?PAL.green:PAL.dark,14);
  ttl(k[0],34,y+25,18,'#fff','left');ctx.fillStyle='rgba(0,0,0,.4)';rr(34,y+36,250,12,6);ctx.fill();
  if(v>0){ctx.fillStyle=d?'#fff':'#ffd166';rr(34,y+36,Math.max(12,250*v/k[2]),12,6);ctx.fill();}
  txt(v+'/'+k[2],294,y+47,13,'#e8ecff','left');
  d?ttl('DONE',W-34,y+36,20,'#fff','right'):ttl('+'+k[3],W-34,y+38,26,'#ffd166','right');
 });
}

/* ---------- RELICS (collection book + hats) ---------- */
function relics(){
 head('RELICS');txt(`Found ${SV.relics.length}/12   \u2022   tap a relic to wear it`,W/2,100,15,'#ffd166');
 RLC.forEach((r,i)=>{
  const x=20+(i%3)*150,y=114+(i/3|0)*128,own=SV.relics.includes(i),eq=SV.hat===i,o=UI.spring('r'+i);
  B.push({x,y,w:140,h:118,fn:()=>{o.v+=6;if(own){SV.hat=eq?-1:i;save(1);}}});
  ctx.save();ctx.translate(x+70,y+59);ctx.rotate(o.a*.12);plank(-70,-59,140,118,eq?PAL.gold:own?PAL.violet:PAL.dark,14);
  ctx.font='46px serif';ctx.textAlign='center';ctx.globalAlpha=own?1:.3;ctx.fillStyle='#000';ctx.fillText(own?r[0]:'\u2753',0,12);ctx.globalAlpha=1;
  ttl(own?r[1]:'???',0,40,16,'#fff');txt(eq?'WEARING':own?'tap to wear':'perfect on a special slab',0,54,10,'rgba(255,255,255,.75)');ctx.restore();
 });
 txt('Every 4 relics found = +100 coin set bonus',W/2,H-76,14,'#b9c2ee');
}

/* ---------- PROFILE ---------- */
function profile(){
 head('PROFILE');const L=lvl(),a=50*(L-1)**2,b=50*L*L,q=(SV.xp-a)/(b-a);
 ctx.lineWidth=14;ctx.lineCap='round';ctx.strokeStyle='rgba(255,255,255,.15)';ctx.beginPath();ctx.arc(W/2,150,46,0,7);ctx.stroke();
 ctx.strokeStyle='#8be9ff';ctx.beginPath();ctx.arc(W/2,150,46,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(.02,q));ctx.stroke();ctx.lineCap='butt';
 ttl(L,W/2,166,48,'#fff');txt('LEVEL',W/2,100,13,'#8be9ff');txt(`${SV.xp|0} / ${b} XP`,W/2,222,14,'#b9c2ee');
 const S=[['Best height',SV.best],['Landings',SV.landings],['Perfects',SV.perf],['Best combo',SV.bestCombo],['Jumps',SV.jumps],['Games',SV.g],['Collapses',SV.collapses],['Stars',SV.stars],['Coins earned',SV.earned],['Time played',(SV.time/60|0)+' min'],['Air coins',SV.cc],['Quakes',SV.quakes]];
 S.forEach((s,i)=>{const x=24+(i%2)*220,y=250+(i/2|0)*28;txt(s[0],x,y,14,'#b9c2ee','left');ttl(s[1],x+200,y,17,'#fff','right');});
 txt(`ACHIEVEMENTS   ${SV.ach.length}/${ACH.length}`,24,420,14,'#ffd166','left');
 ACH.forEach((A,i)=>{const d=SV.ach.includes(i),x=20+(i%2)*222,y=428+(i/2|0)*36;
  plank(x,y,214,34,d?PAL.gold:PAL.dark,11);txt((d?'\u2605 ':'')+A[0],x+10,y+15,15,d?'#3a2300':'#aab2e0','left');txt(A[1],x+10,y+28,11,d?'#5a3a10':'#7d86b8','left');});
}

/* ---------- IN-RUN HUD ---------- */
function hudUI(){
 const L=lvl(),a=50*(L-1)**2,b=50*L*L,camp_=mode==='campaign';
 if(hud>.8&&st==='play'){const g2=ctx.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.75);g2.addColorStop(0,'rgba(255,0,0,0)');g2.addColorStop(1,`rgba(255,40,40,${Math.min(.45,(hud-.8)*1.2)*(.7+.3*Math.sin(t*12))})`);ctx.fillStyle=g2;ctx.fillRect(0,0,W,H);}
 ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(0,0,W,6);ctx.fillStyle='#8be9ff';ctx.fillRect(0,0,W*(SV.xp-a)/(b-a),6);
 const hs=UI.spring('hgt');ctx.save();ctx.translate(74,49);ctx.scale(1+hs.s*.18,1+hs.s*.18);ctx.translate(-74,-49);plank(12,14,124,70,PAL.wood,14);txt('HEIGHT',74,34,13,'#f6e1c0');ttl(camp_?`${lv}/${STG[stage][1]}`:lv,74,72,camp_?32:42,'#fff');ctx.restore();
 coinChip(W-12,14);btn(W-70,56,58,40,'II',()=>{paused=1;},'white');
 if(combo>1){ctx.save();ctx.translate(W/2,32);const cs_=1+.05*Math.sin(t*10)+UI.spring('cmb').s*.22;ctx.scale(cs_,cs_);ctx.rotate(UI.spring('cmb').a*.15);plank(-76,-18,152,36,PAL.pink,12);
  ttl(`COMBO ${combo}  x${(1+.25*Math.min(combo,16)).toFixed(2)}`,0,7,18,'#fff');ctx.restore();}
 plank(W/2-62,56,124,24,PAL.dark,10);txt(`${BI[biome()][3]}  ${World.wind>8?'\u2192':World.wind<-8?'\u2190':'\u2022'} ${Math.abs(World.wind|0)}`,W/2,73,13,'#cfd6ff');
 /* spirit-level balance gauge: the bubble slides toward the heavy side */
 plank(W/2-100,92,200,26,PAL.wood,13);const g=ctx.createLinearGradient(0,97,0,113);g.addColorStop(0,'#eaffc4');g.addColorStop(1,'#9bd36a');
 ctx.fillStyle=g;rr(W/2-94,97,188,16,8);ctx.fill();ctx.fillStyle='rgba(230,60,60,.55)';rr(W/2-94,97,22,16,8);ctx.fill();rr(W/2+72,97,22,16,8);ctx.fill();
 ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W/2-12,97);ctx.lineTo(W/2-12,113);ctx.moveTo(W/2+12,97);ctx.lineTo(W/2+12,113);ctx.stroke();
 const bx=W/2+clamp(hudS,-1.2,1.2)/1.2*80,bq=Math.min(1,Math.abs(hudS));
 ctx.fillStyle=SV.cb?`hsl(${215-175*bq},85%,55%)`:`hsl(${130-130*bq},85%,55%)`;ctx.strokeStyle='#241437';ctx.lineWidth=2;ctx.beginPath();ctx.arc(bx,105,7.5,0,7);ctx.fill();ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.arc(bx-2.5,102.5,2.3,0,7);ctx.fill();
 if(camp_&&STG[stage][4]&&st==='play'){plank(W/2-110,128,220,24,PAL.dark,10);ctx.fillStyle='#ff5a4d';rr(W/2-104,133,208*Math.max(0,1-lv/STG[stage][1]),14,6);ctx.fill();txt(STG[stage][5],W/2,147,12,'#fff');}
 if(SV.net&&RL.nets){plank(12,94,70,26,PAL.blue,10);txt('NET x'+SV.net,47,112,13,'#fff');}
 if(st==='play'){
  if(lv<3)ttl('Jump over the slab \u2022 steer mid-air with \u25C0 \u25B6 / A D',W/2,H-72,15,'#fff');
  else if(hudS>.7||hudS<-.7)ttl('Tower is tipping \u2014 re-centre!',W/2,H-72,17,'#ffd2a8');
  if(gs)ttl('\u2605 Steer into the star to straighten the tower!',W/2,H-72,16,'#ffe27a');
  let obj='';if(camp_)obj=`STAGE ${stage+1}: ${STG[stage][0]}  \u2022  reach ${STG[stage][1]}`;
  else{const k=TK.findIndex((x,i)=>!SV.done.includes(i));if(k>=0)obj=`QUEST: ${TK[k][0]} (${Math.min(SV[TK[k][1]],TK[k][2])}/${TK[k][3-1]})`;}
  if(obj){plank(24,H-54,W-48,36,PAL.dark,12);txt(obj,W/2,H-30,15,'#ffe9a8');}
  ctx.globalAlpha=.3;ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(24,H-110);ctx.lineTo(50,H-124);ctx.lineTo(50,H-96);ctx.fill();
  ctx.beginPath();ctx.moveTo(W-24,H-110);ctx.lineTo(W-50,H-124);ctx.lineTo(W-50,H-96);ctx.fill();ctx.globalAlpha=1;
 }
}

/* ---------- RESULT SCREEN ---------- */
function overUI(){
 if(overT<1)return;const ku=Math.min(1,Math.max(0,(overT-1.3)/.9)),e=Math.min(1,(overT-1)/.35),pop=e*(1+Math.sin(e*Math.PI)*.07),camp_=mode==='campaign';
 ctx.fillStyle=`rgba(14,8,40,${.55*e})`;ctx.fillRect(0,0,W,H);if(win||nbd){ctx.save();ctx.translate(W/2,250);ctx.rotate(t*.25);for(let i=0;i<12;i++){ctx.rotate(Math.PI/6);ctx.fillStyle=`rgba(255,226,120,${.13*e})`;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-40,-560);ctx.lineTo(40,-560);ctx.fill();}ctx.restore();}
 ctx.save();ctx.translate(W/2,H/2);ctx.scale(pop,pop);ctx.translate(-W/2,-H/2);
 plank(36,110,W-72,520,PAL.dark,26);plank(60,88,W-120,58,win?PAL.gold:PAL.red,18);ttl(why,W/2,128,why.length>20?21:27,'#fff');
 ttl(Math.round(lv*(1-Math.pow(1-ku,3))),W/2,246,92,'#fff');txt(camp_?`of ${STG[stage][1]} levels`:'LEVELS',W/2,274,16,'#cfd6ff');
 if(camp_){const n=win?ovStars:0;for(let i=0;i<3;i++){const q=Math.max(0,Math.min(1,(overT-1.4-i*.3)*3)),on=i<n;ctx.save();ctx.translate(W/2-52+i*52,318);const sc=on?q*(1+Math.sin(q*3.14)*.5):1;ctx.scale(sc,sc);ctx.globalAlpha=on?1:.22;drawStar(0,0,20);ctx.restore();}}
 else if(mode==='daily')txt(`Today: ${SV.d.best}  /  goal ${dgoal()}`,W/2,316,20,'#ffd166');else txt(lv>=SV.best&&lv>0?'NEW BEST!':'Best: '+SV.best,W/2,316,20,'#ffd166');
 ttl(`+${Math.round(runC*ku)} coins     +${Math.round(runXP*ku)} XP`,W/2,368,22,'#ffe27a');txt(`best combo ${rc}   \u2022   perfects ${rp}`,W/2,394,15,'#b9c2ee');
 const fin=win&&stage<STG.length-1;
 btn(70,420,W-140,58,fin?'NEXT STAGE':'RETRY',()=>{if(fin){stage++;Game.start();toast(STG[stage][0]);}else Game.start();},'gold');
 if(fin)btn(70,490,W-140,46,'REPLAY',()=>Game.start(),'blue');
 btn(70,fin?548:490,W-140,46,camp_?'MAP':'HOME',()=>camp_?go('camp'):toMenu(),'white');
 if(win&&camp_&&stage===STG.length-1){txt('No more campaign stages \u2014 you cleared them all!',W/2,584,14,'#ffe27a');txt('Keep climbing in Endless or the Daily Challenge.',W/2,604,14,'#b9c2ee');}
 {const rk=camp_?(win?['C','B','A','S'][ovStars]:'D'):(lv>=50?'S':lv>=30?'A':lv>=15?'B':'C'),sq=Math.max(0,Math.min(1,(overT-1.9)*3));if(sq>0){ctx.save();ctx.translate(W-95,252);ctx.rotate(.25);ctx.scale(3-2*sq,3-2*sq);ctx.globalAlpha=sq;ctx.beginPath();ctx.arc(0,0,38,0,7);ctx.fillStyle=rk==='S'?'#ffd166':rk==='A'?'#a4e86a':rk==='B'?'#74c8ff':'#c9c4d8';ctx.fill();ctx.lineWidth=5;ctx.strokeStyle='#241437';ctx.stroke();ttl(rk,0,17,50,'#fff');ctx.restore();}}
 ctx.restore();
}

/* ================= WARNING CUES ================= */
const Warn={t:0,upd(dt){
 const k=stress;if(k<.6||cr.mode==='dead')return;this.t-=dt*(.6+(k-.6)*8);
 if(this.t<=0){this.t=1;Snd.creak(k);const sp=tower[Math.max(0,wi-1)];FX.burst(sp.c+rnd(-sp.w/2,sp.w/2),sp.y+sp.t,2+(k*3|0),30,DUST);if(k>.85){FX.sh=Math.max(FX.sh,2);vib(8);}}}};

/* ================= BOSS HAZARDS ================= */
const Haz={ball:null,bolts:[],rocks:[],tb:3,tr:2.5,cd:0,bt:0,fl:0,
 reset(){this.ball=null;this.bolts=[];this.rocks=[];this.tb=3;this.tr=2.5;this.cd=0;this.bt=0;},
 upd(dt){
  const K=bossK();if(!K.length||lv<2||cr.mode==='dead')return;const T=topS(),topY=T.y+T.t;this.cd-=dt;
  if(K.includes('ball')){
   this.bt+=dt;const L=340,A=Math.min(1.05,.5+lv*.05),ph=this.bt*1.9,th=A*Math.sin(ph),bx=L*Math.sin(th),vx=L*Math.cos(th)*A*1.9*Math.cos(ph),by=topY+18+L*(1-Math.cos(th));
   this.ball={x:bx,y:by,r:26,py:topY+18+L};
   if(Math.hypot(cr.x-bx,cr.fy+R-by)<R+23){Game.zap('Smashed by the wrecking ball!',vx*.8);return;}
   if(this.cd<=0&&Math.abs(bx-T.c)<T.w/2+20&&by-26<topY){this.cd=.9;Phys.kick(bx,0,Math.sign(vx)*Math.min(2500,Math.abs(vx)*5),T.y+T.t/2);FX.burst(bx,topY,8,120,DUST);Snd.thud();FX.sh=Math.max(FX.sh,6);}
  }
  if(K.includes('bolt')){
   this.tb-=dt;if(this.tb<=0){this.tb=Math.max(1.3,rnd(2.2,3.4)-lv*.03);this.bolts.push({x:clamp(cr.x+rnd(-110,110),-210,210),t:0,hit:0});}
   for(const b of this.bolts){b.t+=dt;if(b.t>1.1&&!b.hit){b.hit=1;this.fl=t+.25;FX.sh=14;Snd.zap();
    if(Math.abs(cr.x-b.x)<26){Game.zap('Struck by lightning!',0);return;}
    if(Math.abs(b.x-T.c)<T.w/2+30)Phys.kick(b.x,900,0,topY);}}
   this.bolts=this.bolts.filter(b=>b.t<1.4);
  }
  if(K.includes('rock')){
   this.tr-=dt;if(this.tr<=0){this.tr=Math.max(1.4,rnd(2.4,3.6)-lv*.03);this.rocks.push({x:clamp(cr.x+rnd(-90,90),-210,210),y:topY+560,vy:0,t:0,r:22,fall:0});}
   for(const r of this.rocks){r.t+=dt;if(!r.fall&&r.t>1)r.fall=1;
    if(r.fall){r.vy-=1500*dt;r.y+=r.vy*dt;
     if(Math.hypot(cr.x-r.x,cr.fy+R-r.y)<R+r.r-3){Game.zap('Crushed by a boulder!',0);return;}
     if(r.y-r.r<=topY&&Math.abs(r.x-T.c)<=T.w/2+r.r*.5){r.dead=1;Phys.kick(r.x,700,0,topY);FX.burst(r.x,topY,10,140,DUST);FX.sh=Math.max(FX.sh,9);Snd.thud();}
     else if(r.y<-80)r.dead=1;}}
   this.rocks=this.rocks.filter(r=>!r.dead);
  }
 },
 draw(){
  const T=topS(),topY=T.y+T.t;
  if(this.ball&&st==='play'){const b=this.ball;ctx.strokeStyle='#3a3a4a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(sx(0),sy(b.py));ctx.lineTo(sx(b.x),sy(b.y));ctx.stroke();
   ctx.fillStyle='#4b4f63';ctx.strokeStyle='#14151f';ctx.beginPath();ctx.arc(sx(b.x),sy(b.y),b.r,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(255,255,255,.3)';ctx.beginPath();ctx.arc(sx(b.x)-8,sy(b.y)-8,7,0,7);ctx.fill();}
  for(const b of this.bolts){
   if(b.t<1.1){ctx.strokeStyle=`rgba(255,240,120,${.4+.35*Math.sin(b.t*24)})`;ctx.lineWidth=3;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(sx(b.x),0);ctx.lineTo(sx(b.x),sy(0));ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,220,60,.5)';ctx.beginPath();ctx.ellipse(sx(b.x),sy(topY),22,5,0,0,7);ctx.fill();}
   else{ctx.strokeStyle='#fffbe0';ctx.lineWidth=6;ctx.shadowColor='#ffe34d';ctx.shadowBlur=20;ctx.beginPath();let x=sx(b.x),y=0;ctx.moveTo(x,y);
    while(y<sy(topY)){y+=34;x=sx(b.x)+(Math.random()-.5)*34;ctx.lineTo(x,Math.min(y,sy(topY)));}ctx.stroke();ctx.shadowBlur=0;}}
  for(const r of this.rocks){
   if(r.fall){ctx.fillStyle='#7b6f66';ctx.strokeStyle='#2a221c';ctx.lineWidth=3;ctx.beginPath();ctx.arc(sx(r.x),sy(r.y),r.r,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(255,255,255,.2)';ctx.beginPath();ctx.arc(sx(r.x)-6,sy(r.y)-6,6,0,7);ctx.fill();}
   else{ctx.fillStyle=`rgba(0,0,0,${.25+.2*Math.sin(r.t*20)})`;ctx.beginPath();ctx.ellipse(sx(r.x),sy(topY),26,6,0,0,7);ctx.fill();ctx.fillStyle='rgba(255,120,80,.8)';ctx.fillRect(sx(r.x)-1.5,sy(topY)-60,3,50);}}
  if(this.fl>t){ctx.fillStyle=`rgba(255,255,255,${(this.fl-t)*2.5})`;ctx.fillRect(-20,-20,W+40,H+40);}
 }};

/* ================= BANNERS, HELP, SETTINGS, DAILY SCREEN ================= */
function banner(a,b){ban={a,b,t:0};Snd.perfect(6);}
function drawBan(){
 if(!ban)return;const e=Math.min(1,ban.t*4),f=Math.min(1,(2.6-ban.t)*2.5),sc=.6+.4*e+Math.sin(e*3.14)*.1;
 ctx.save();ctx.globalAlpha=Math.max(0,Math.min(e,f));ctx.translate(W/2,H*.36);ctx.scale(sc,sc);plank(-210,-56,420,112,PAL.gold,22);
 ttl(ban.a,0,-2,ban.a.length>14?34:44,'#fff');txt(ban.b,0,36,18,'rgba(36,20,55,.9)');ctx.restore();
}
function begin(fn){if(!SV.tut){pend=fn;go('help');}else fn();}
function helpScr(){
 head('HOW TO PLAY');
 const T=[['1','JUMP','Tap anywhere or press Space. Hop over the slab\u2019s front edge and land on top.'],['2','STEER','Hold the left or right third of the screen (or A / D) to move and steer in the air.'],
 ['3','LAND CENTRE','Perfect landings build combos and multipliers. Edges are risky.'],['4','WATCH THE LEVEL','Bubble leaves the middle = tower tipping. Creaks, dust and cracks warn you.'],['\u2605','STAR EVERY 10','Steer into it to straighten the whole tower.']];
 T.forEach((r,i)=>{const y=86+i*100;plank(20,y,W-40,88,PAL.dark,16);plank(30,y+14,52,52,PAL.gold,12);ttl(r[0],56,y+52,30,'#fff');ttl(r[1],96,y+34,22,'#ffd166','left');
  const w=r[2].split(' ');let l1='',l2='';w.forEach(x=>{if((l1+x).length<36)l1+=x+' ';else l2+=x+' ';});txt(l1,96,y+58,14,'#dfe4ff','left');txt(l2,96,y+76,14,'#dfe4ff','left');});
 btn(W/2-110,H-130,220,56,'GOT IT',()=>{SV.tut=1;save();const f=pend;pend=null;f?f():go('title');},'green');
}
function settingsScr(){
 head('SETTINGS');if(rsc&&t>rscT)rsc=0;
 const R_=[['Sound effects',YA.on?'Game effects (YouTube mute always wins)':'YouTube audio is off - effects stay silent',SV.mute?'OFF':'ON',()=>{SV.mute=SV.mute?0:1;}],['Screen shake','Impact and collapse',['OFF','LOW','FULL'][SV.shk],()=>{SV.shk=(SV.shk+1)%3;}],
 ['Haptics','Vibration on phones',SV.hap?'ON':'OFF',()=>{SV.hap=SV.hap?0:1;}],['Colour-blind gauge','Blue to orange balance bubble',SV.cb?'ON':'OFF',()=>{SV.cb=SV.cb?0:1;}],['Reset progress','Erase all saved progress',rsc?'SURE?':'RESET',()=>{if(rsc){rsc=0;Cloud.reset();}else{rsc=1;rscT=t+3;}}]];
 R_.forEach((r,i)=>{const y=90+i*84;plank(20,y,W-40,72,PAL.dark,16);ttl(r[0],36,y+32,22,'#fff','left');txt(r[1],36,y+56,13,'#b9c2ee','left');if((r[2]==='ON'||r[2]==='OFF')&&r[0]!=='Screen shake'){const on=r[2]==='ON',o=UI.spring('sw'+i);B.push({x:W-130,y:y+14,w:100,h:44,fn:()=>{r[3]();save();o.v+=4;Snd.tone(on?300:520,.08,'square',.05);}});o.k=o.k===undefined?(on?1:0):o.k+((on?1:0)-o.k)*.25;plank(W-130,y+14,100,44,on?PAL.green:PAL.dark,22);ctx.beginPath();ctx.arc(W-108+o.k*56,y+36,17,0,7);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#241437';ctx.stroke();txt(on?'ON':'OFF',W-130+(on?30:70),y+41,13,on?'#2a1a3a':'#9aa0c8');}else btn(W-150,y+12,118,48,r[2],()=>{r[3]();save();},'gold');});
 txt(Cloud.mode==='cloud'?'Progress saves automatically.':'Saving is unavailable in this session.',W/2,540,14,'#8f9ad8');
}
function dailyScr(){
 head('DAILY CHALLENGE','modes');dailyInit();const c=CT[dTwist()],g=dgoal(),cs=curStreak(),dd=dailyDone();
 plank(24,84,W-48,140,PAL.dark,18);ttl('TODAY\u2019S TWIST',W/2,112,15,'#ffd166');ttl(c[0].toUpperCase(),W/2,152,36,'#fff');txt(c[1],W/2,176,15,'#cfd6ff');ttl(`REACH LEVEL ${g}`,W/2,208,23,'#a4e86a');
 txt('REWARD STREAK',24,258,15,'#ffd166','left');
 const claimed=dd?((cs-1)%7+1):cs%7;
 for(let k=0;k<7;k++){const x=20+k*65,cl=k<claimed,td=!dd&&k===claimed;
  plank(x,270,58,92,cl?PAL.green:td?PAL.gold:PAL.dark,10);txt('DAY '+(k+1),x+29,290,12,cl||td?'#2a1a3a':'#aab2e0');
  ctx.font='26px serif';ctx.textAlign='center';ctx.fillStyle='#000';ctx.fillText(cl?'\u2705':'\ud83c\udf81',x+29,326);ttl(DAYR[k],x+29,352,15,'#fff');}
 txt('Bonus: 3 days +150  \u2022  every 7th day a relic  \u2022  30 days +1000',W/2,392,12,'#b9c2ee');
 const n=new Date(),ms=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1)-n,p2=v=>String(v).padStart(2,'0');
 plank(24,408,W-48,92,PAL.dark,16);ttl(dd?'\u2713 CLEARED TODAY':'NOT CLEARED YET',W/2,440,22,dd?'#a4e86a':'#ffd166');
 txt(`Today\u2019s best: ${SV.d.best}   \u2022   Streak: ${cs} day${cs===1?'':'s'}`,W/2,466,15,'#dfe4ff');txt(`New challenge in ${p2(ms/36e5|0)}:${p2(ms/6e4%60|0)}:${p2(ms/1e3%60|0)}`,W/2,488,13,'#8f9ad8');
 btn(80,520,320,62,dd?'PLAY AGAIN':'START',()=>begin(()=>{mode='daily';Game.start();toast(`Daily: ${c[0]} \u2014 reach ${g}`);}),'gold');
 txt('Everyone gets the same slabs today.',W/2,610,13,'#8f9ad8');
}

/* ---------- ROOT UI ---------- */
function ui(){
 const inMenu=st!=='play'&&st!=='over';
 if(!inMenu)hudUI();
 if(st==='over'){overUI();for(const q of CF){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.r);ctx.scale(1,Math.cos(q.r*3));ctx.fillStyle=q.c;ctx.fillRect(-5,-3,10,6);ctx.restore();}}
 if(paused&&st==='play'){ctx.fillStyle='rgba(14,8,40,.7)';ctx.fillRect(0,0,W,H);plank(60,200,W-120,300,PAL.dark,24);ttl('PAUSED',W/2,262,44,'#ffd166');btn(100,290,W-200,60,'RESUME',()=>{paused=0},'green');btn(100,362,W-200,52,'RESTART',()=>{paused=0;Game.start()},'blue');btn(100,426,W-200,52,'HOME',()=>{paused=0;toMenu()},'white');}
 if(inMenu){const e=1-Math.pow(1-trT,3),eb=1+2.7*Math.pow(trT-1,3)+1.7*Math.pow(trT-1,2);ctx.save();ctx.translate(W/2,H/2+(1-eb)*40);ctx.scale(.94+.06*eb,.94+.06*eb);ctx.translate(-W/2,-H/2);ctx.globalAlpha=e;({title:hub,modes,camp,stage:stageCard,shop,quests,profile,relics,daily:dailyScr,help:helpScr,settings:settingsScr,chest:chestScr})[st]();ctx.restore();if(trT<.7){const P=['#ffd166','#74c8ff','#ff94ca','#a4e86a','#c7a6ff','#ff8374'];for(let i=0;i<6;i++){const q=clamp(trT*1.7-i*.07,0,1),ww=W*(1-q*q*(3-2*q));ctx.fillStyle=P[i];ctx.fillRect(i%2?0:W-ww,i*H/6,ww,H/6+1);}}}
 ctx.font=`18px ${FONT}`;
 toasts.forEach((o,i)=>{const w=ctx.measureText(o.s).width+32,y=166+i*42,e=Math.min(1,o.t*5,3-o.t);ctx.save();ctx.globalAlpha=Math.max(0,e);
  plank(W/2-w/2,y-(1-Math.min(1,o.t*5))*20,w,32,/chest|relic/i.test(o.s)?PAL.violet:/task|daily|weekly|achiev/i.test(o.s)?PAL.green:/quake|gust|wind/i.test(o.s)?PAL.red:PAL.dark,12);txt(o.s,W/2,y+22-(1-Math.min(1,o.t*5))*20,18,'#ffe9a8');ctx.restore();});drawBan();
 for(const o of RP){ctx.strokeStyle=`rgba(255,255,255,${Math.max(0,.6*(1-o.t*2.3))})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(o.x,o.y,10+o.t*140,0,7);ctx.stroke();}
}

/* ================= INPUT ================= */
const clearInput=()=>{In.kl=0;In.kr=0;for(const k in In.ptr)delete In.ptr[k];};
const BACK={modes:'title',camp:'modes',stage:'camp',shop:'title',quests:'title',profile:'title',relics:'title',daily:'modes',settings:'title',chest:'title'};
function press(){if(st==='title')go('modes');else if(st==='play'&&!paused)jb=.12;else if(st==='over'&&overT>1.5)Game.start();}
/* listeners are registered exactly once, at load */
addEventListener('pointerdown',e=>{
 if(ytPaused||!booted)return;
 Snd.init();e.preventDefault();const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;if(st!=='play'||paused)RP.push({x,y,t:0});
 for(let i=B.length-1;i>=0;i--){const b=B[i];if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h){if(b.fn)b.fn();return;}}
 if(st==='play'&&!paused){In.ptr[e.pointerId]=x<W*.33?-1:x>W*.67?1:0;jb=.12;}
});
addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();mx=(e.clientX-r.left)/r.width*W;my=(e.clientY-r.top)/r.height*H;});
const up=e=>{delete In.ptr[e.pointerId]};addEventListener('pointerup',up);addEventListener('pointercancel',up);
addEventListener('keydown',e=>{
 if(ytPaused||!booted)return;
 Snd.init();
 /* Escape closes the current modal/screen. preventDefault() is deliberately NEVER called on Escape (Playables requirement). */
 if(e.code==='Escape'){if(e.repeat)return;if(st==='play')paused=paused?0:1;else if(st==='help'){pend=null;go('title');}else if(BACK[st])go(BACK[st]);return;}
 if(e.code==='KeyP'&&st==='play'){paused=paused?0:1;return;}
 if(e.code==='ArrowLeft'||e.code==='KeyA')In.kl=1;else if(e.code==='ArrowRight'||e.code==='KeyD')In.kr=1;
 else if(['Space','ArrowUp','Enter','KeyW'].includes(e.code)){if(!(e.ctrlKey||e.metaKey||e.altKey))e.preventDefault();if(!e.repeat)press();}});
addEventListener('keyup',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA')In.kl=0;if(e.code==='ArrowRight'||e.code==='KeyD')In.kr=0;});

/* ================= LOOP: exactly one requestAnimationFrame chain ================= */
let rafId=0,last=0,errN=0;
function recover(){try{debris=[];gc=[];Haz.reset();paused=0;win=false;stabz=null;gs=null;toMenu();}catch(e){console.error(e);}}
function frame(now){
 rafId=0;if(ytPaused)return;
 let dt=(now-last)/1000;last=now;if(!(dt>0))dt=0;dt=Math.min(1/30,dt);   /* clamp: no giant physics step after a hitch or a resume */
 try{applyFit();step(dt);draw();Cloud.tick(dt);errN=0;}
 catch(err){if(errN===0)console.error(err);hlog('e');if(++errN>=5){errN=0;recover();}}
 if(!ytPaused&&!rafId)rafId=requestAnimationFrame(frame);
}
const startLoop=()=>{if(rafId||ytPaused)return;last=performance.now();rafId=requestAnimationFrame(frame);};
const stopLoop=()=>{if(rafId){cancelAnimationFrame(rafId);rafId=0;}};

/* ================= PLAYABLES LIFECYCLE ================= */
let ffrDone=false,grDone=false;
const markFirstFrame=()=>{if(ffrDone||!YT)return;ffrDone=true;try{YT.game.firstFrameReady();}catch(e){hlog('e');console.error(e);}};
const markGameReady=()=>{if(grDone||!YT)return;grDone=true;try{YT.game.gameReady();}catch(e){hlog('e');console.error(e);}};
const nextPaint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
function hookPlatform(){
 if(!YT)return;
 try{YA.on=!!YT.system.isAudioEnabled();}catch(e){hlog('w');}
 try{YT.system.onAudioEnabledChange(on=>{YA.on=!!on;Snd.sync();});}catch(e){hlog('e');}
 try{
  YT.system.onPause(()=>{
   if(ytPaused)return;ytPaused=true;
   stopLoop();clearInput();
   if(st==='play'&&!paused)paused=1;   /* the player returns to the existing pause menu instead of mid-air */
   Snd.sync();Cloud.flush(true);       /* progress is saved on pause */
  });
  YT.system.onResume(()=>{
   if(!ytPaused)return;ytPaused=false;
   clearInput();Snd.sync();while(resumeWaiters.length)resumeWaiters.pop()();
   if(booted)startLoop();
  });
 }catch(e){hlog('e');}
}
function showGame(){const sp=document.getElementById('splash');if(sp&&sp.parentNode)sp.parentNode.removeChild(sp);booted=true;startLoop();}
async function boot(){
 hookPlatform();
 await nextPaint();                    /* the static HTML splash ("Loading...") has been painted */
 markFirstFrame();
 const fontP=(document.fonts&&document.fonts.load)?Promise.race([document.fonts.load('24px "Lilita One"').catch(()=>[]/* font file missing/blocked: the fallback stack is used */),sleep(1200)]):Promise.resolve();
 await Promise.all([fontP,YT?Cloud.load():Promise.resolve()]);
 if(!YT)console.info('[Teeter] Not running inside YouTube Playables: platform APIs are disabled and progress is NOT saved.');
 await whenActive();
 layout();applyFit();draw();           /* menu is rendered under the splash with the loaded progress */
 showGame();
 if(Cloud.mode==='failed')toast('Cloud save unavailable this session');
 await nextPaint();                    /* a real, interactive frame is on screen */
 await whenActive();
 markGameReady();
 Cloud.sendBest();
}
boot().catch(err=>{console.error(err);hlog('e');if(!booted)showGame();markFirstFrame();markGameReady();});
