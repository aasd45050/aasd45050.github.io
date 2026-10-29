(function(){
var store={get:function(k,d){try{var v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
var $=function(i){return document.getElementById(i)};
var views=["home","snake","reflex","td","mem","2048","whack"];
function route(){
  var h=(location.hash||"#home").slice(1); if(views.indexOf(h)<0)h="home";
  views.forEach(function(v){$("v-"+v).classList.toggle("on",v===h)});
  if(h!=="snake")snakeStop();
  tdOn=(h==="td");
  if(h!=="whack")wstop();
  $("hb-snake").textContent=store.get("ys_snake","0");
  var r=store.get("ys_reflex",""); $("hb-reflex").textContent=r?r+" ms":"none";
  $("hb-td").textContent="Level "+store.get("ys_td","1");
  var mb=store.get("ys_mem","");$("hb-mem").textContent=mb?mb+" moves":"none";
  $("hb-2048").textContent=store.get("ys_2048","0");$("hb-whack").textContent=store.get("ys_whack","0");
}
window.addEventListener("hashchange",route);

/* SNAKE */
var cv=$("cv"),cx=cv.getContext("2d"),N=20,S=cv.width/N;
var snake,dir,nd,food,score,timer,best=+store.get("ys_snake","0"),running=false;
$("sb").textContent=best;
function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function place(){do{food={x:Math.floor(Math.random()*N),y:Math.floor(Math.random()*N)}}while(snake.some(function(s){return s.x===food.x&&s.y===food.y}))}
function reset(){snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];dir=nd={x:1,y:0};score=0;$("sc").textContent=0;place();draw()}
function draw(){
  cx.fillStyle=css("--bg");cx.fillRect(0,0,cv.width,cv.height);
  cx.strokeStyle=css("--line");cx.lineWidth=1;
  for(var i=1;i<N;i++){cx.beginPath();cx.moveTo(i*S,0);cx.lineTo(i*S,cv.height);cx.moveTo(0,i*S);cx.lineTo(cv.width,i*S);cx.stroke()}
  cx.fillStyle=css("--coral");cx.fillRect(food.x*S+3,food.y*S+3,S-6,S-6);
  snake.forEach(function(s,i){cx.fillStyle=i===0?css("--sun"):css("--cobalt");cx.fillRect(s.x*S+1,s.y*S+1,S-2,S-2);
    if(i===0){cx.strokeStyle=css("--ink");cx.lineWidth=2;cx.strokeRect(s.x*S+2,s.y*S+2,S-4,S-4)}});
}
function step(){
  dir=nd;var h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
  if(h.x<0||h.y<0||h.x>=N||h.y>=N||snake.some(function(s){return s.x===h.x&&s.y===h.y})){return over()}
  snake.unshift(h);
  if(h.x===food.x&&h.y===food.y){score++;$("sc").textContent=score;place();clearInterval(timer);timer=setInterval(step,Math.max(60,130-score*3))}
  else snake.pop();
  draw();
}
function over(){
  snakeStop();
  if(score>best){best=score;store.set("ys_snake",String(best));$("sb").textContent=best;$("shint").textContent="New best: "+score+". Press Space to play again."}
  else $("shint").textContent="Game over with "+score+". Press Space to try again.";
  $("sstart").textContent="Play again";
}
function snakeStart(){snakeStop();reset();running=true;$("shint").textContent="Go!";timer=setInterval(step,130)}
function snakeStop(){running=false;clearInterval(timer)}
function turn(d){
  var m={U:{x:0,y:-1},D:{x:0,y:1},L:{x:-1,y:0},R:{x:1,y:0}}[d];
  if(m&&!(m.x===-dir.x&&m.y===-dir.y))nd=m;
}
$("sstart").onclick=snakeStart;
document.querySelectorAll(".pad").forEach(function(b){b.onclick=function(){if(running)turn(b.dataset.d)}});
document.addEventListener("keydown",function(e){
  if(!$("v-snake").classList.contains("on"))return;
  var k={ArrowUp:"U",ArrowDown:"D",ArrowLeft:"L",ArrowRight:"R",w:"U",s:"D",a:"L",d:"R"}[e.key];
  if(k){e.preventDefault();if(running)turn(k)}
  else if(e.key===" "&&!running){e.preventDefault();snakeStart()}
});
var t0;
cv.addEventListener("touchstart",function(e){t0=e.touches[0]},{passive:true});
cv.addEventListener("touchend",function(e){
  if(!t0)return;var t=e.changedTouches[0],dx=t.clientX-t0.clientX,dy=t.clientY-t0.clientY;
  if(Math.max(Math.abs(dx),Math.abs(dy))<20){if(!running)snakeStart();return}
  if(running)turn(Math.abs(dx)>Math.abs(dy)?(dx>0?"R":"L"):(dy>0?"D":"U"));
});
reset();

/* REFLEX */
var zone=$("zone"),state="idle",tm,tStart,times=[],rbest=+store.get("ys_reflex","0")||0;
if(rbest)$("rb").textContent=rbest+" ms";
function setZ(c,t){zone.className=c;zone.textContent=t}
zone.onclick=function(){
  if(state==="idle"){
    state="wait";setZ("wait","Wait for yellow…");
    tm=setTimeout(function(){state="go";tStart=performance.now();setZ("go","TAP NOW")},1000+Math.random()*3000);
  }else if(state==="wait"){
    clearTimeout(tm);state="idle";setZ("","Too early. Tap to try again");
  }else if(state==="go"){
    var ms=Math.round(performance.now()-tStart);state="idle";
    $("rl").textContent=ms+" ms";times.unshift(ms);times=times.slice(0,5);
    $("log").innerHTML=times.map(function(t){return "<span>"+t+" ms</span>"}).join("");
    var msg=ms+" ms. Tap to go again";
    if(!rbest||ms<rbest){rbest=ms;store.set("ys_reflex",String(ms));$("rb").textContent=ms+" ms";msg=ms+" ms, a new best! Tap to go again"}
    setZ("",msg);
  }
};
/* TOWER DEFENCE */
var TW=40,tc=$("tdc"),tx=tc.getContext("2d");
var PA=[[[-1,1],[9,1],[9,5],[2,5],[2,8]],[[-1,6],[3,6],[3,1],[8,1],[8,6],[12,6]],[[-1,2],[10,2],[10,4],[1,4],[1,6],[12,6]],[[-1,0],[2,0],[2,7],[5,7],[5,1],[8,1],[8,7],[12,7]],[[-1,4],[4,4],[4,1],[9,1],[9,6],[12,6]]];
var TT={dart:{c:50,r:2.6,cd:.45,d:2.5,k:"--cobalt",l:"D"},cannon:{c:110,r:2.8,cd:1.4,d:7,sp:1.1,k:"--coral",l:"C"},frost:{c:70,r:2.4,cd:.8,d:.5,sl:1,k:"--sun",l:"F"}};
var tdOn=false,unl=Math.min(10,+store.get("ys_td","1")||1),lv=1,pts,lens,total,blocked,towers=[],en=[],fx=[],cash=0,lives=15,spawnQ=[],spT=0,st="ready",tool="dart",spd=1,last=0,hc=null;
function pos(d){for(var i=1;i<lens.length;i++)if(d<=lens[i]){var f=(d-lens[i-1])/(lens[i]-lens[i-1]);return[pts[i-1][0]+(pts[i][0]-pts[i-1][0])*f,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*f]}return pts[pts.length-1]}
function lvBtns(){var h="";for(var i=1;i<=10;i++)h+='<button class="tool" data-l="'+i+'" aria-pressed="'+(i===lv)+'"'+(i>unl?" disabled":"")+'>'+i+'</button>';$("lvs").innerHTML=h}
function load(L){
  lv=L;var p=PA[(L-1)%5].map(function(q){return L>5?[q[0],7-q[1]]:q});
  pts=p.map(function(q){return[(q[0]+.5)*TW,(q[1]+.5)*TW]});
  lens=[0];for(var i=1;i<pts.length;i++)lens.push(lens[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  total=lens[lens.length-1];blocked={};
  for(i=1;i<p.length;i++){var a=p[i-1],b=p[i],n=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
    for(var j=0;j<=n;j++)blocked[(a[0]+Math.sign(b[0]-a[0])*j)+","+(a[1]+Math.sign(b[1]-a[1])*j)]=1}
  towers=[];en=[];fx=[];cash=150+L*40;lives=15;spawnQ=[];spT=1;st="ready";
  var cnt=10+4*L,hp=5+L*L*.8+L*3,sp=(1.5+L*.08)*TW,rw=5+L*2;
  for(i=0;i<cnt;i++){
    var q=i%5===4?{hp:hp*3,s:sp*.65,r:9,c:"--ink"}:i%3===2?{hp:hp*.6,s:sp*1.6,r:6,c:"--sun"}:{hp:hp,s:sp,r:7,c:"--coral"};
    q.d=0;q.sl=0;q.rw=rw;q.mh=q.hp;spawnQ.push(q)}
  $("tds").disabled=false;$("tds").textContent="Start level "+L;
  $("tdmsg").textContent="Level "+L+": "+cnt+" enemies. Place towers on empty tiles, then press Start.";
  lvBtns();hud();
}
function end(s){st=s;var b=$("tds");b.disabled=false;
  if(s==="won"){if(lv<10&&unl<=lv){unl=lv+1;store.set("ys_td",String(unl))}lvBtns();
    b.textContent=lv<10?"Next level":"Replay level 10";
    $("tdmsg").textContent=lv<10?"Level "+lv+" cleared. Level "+(lv+1)+" is unlocked.":"All 10 levels cleared. You win!"}
  else{b.textContent="Retry level "+lv;$("tdmsg").textContent="Defeated. Retry with a different tower layout."}}
function upd(dt){
  if(st==="run"){spT-=dt;if(spawnQ.length&&spT<=0){var n=spawnQ.shift();n.p=pos(0);en.push(n);spT=Math.max(.3,.9-lv*.05)}}
  en.forEach(function(e){e.sl=Math.max(0,e.sl-dt);e.d+=e.s*(e.sl>0?.5:1)*dt;e.p=pos(e.d);if(e.d>=total){e.hp=0;e.esc=1}});
  towers.forEach(function(t){var T=TT[t.type];t.cd-=dt;if(t.cd>0)return;var b=null;
    en.forEach(function(e){if(e.hp>0&&Math.hypot(e.p[0]-t.p[0],e.p[1]-t.p[1])<=T.r*TW&&(!b||e.d>b.d))b=e});
    if(!b)return;t.cd=T.cd;
    if(T.sp){en.forEach(function(e){if(Math.hypot(e.p[0]-b.p[0],e.p[1]-b.p[1])<=T.sp*TW)e.hp-=T.d})}else{b.hp-=T.d;if(T.sl)b.sl=1.5}
    fx.push({a:t.p,b:b.p.slice(),t:.12,k:T.k,w:T.sp?5:2})});
  en=en.filter(function(e){if(e.hp>0)return true;if(e.esc)lives--;else cash+=e.rw;return false});
  fx.forEach(function(f){f.t-=dt});fx=fx.filter(function(f){return f.t>0});
  if(st==="run"){if(lives<=0)end("lost");else if(!spawnQ.length&&!en.length)end("won")}
}
function hud(){$("tdlv").textContent=Math.max(0,lives);$("tdcs").textContent=cash}
function drawTD(){
  tx.fillStyle=css("--bg");tx.fillRect(0,0,480,320);
  tx.fillStyle=css("--line");for(var k in blocked){var q=k.split(",");tx.fillRect(q[0]*TW,q[1]*TW,TW,TW)}
  if(hc&&tool!=="sell"&&!blocked[hc.join()]){var T0=TT[tool];tx.strokeStyle=css("--mute");tx.lineWidth=1.5;tx.beginPath();tx.arc((hc[0]+.5)*TW,(hc[1]+.5)*TW,T0.r*TW,0,6.283);tx.stroke()}
  tx.font="bold 13px sans-serif";tx.textAlign="center";tx.textBaseline="middle";
  towers.forEach(function(t){var T=TT[t.type];tx.fillStyle=css(T.k);tx.strokeStyle=css("--ink");tx.lineWidth=2;tx.beginPath();tx.arc(t.p[0],t.p[1],14,0,6.283);tx.fill();tx.stroke();tx.fillStyle="#171a3a";tx.fillText(T.l,t.p[0],t.p[1]+1)});
  fx.forEach(function(f){tx.strokeStyle=css(f.k);tx.lineWidth=f.w;tx.beginPath();tx.moveTo(f.a[0],f.a[1]);tx.lineTo(f.b[0],f.b[1]);tx.stroke()});
  en.forEach(function(e){tx.fillStyle=css(e.c);tx.strokeStyle=e.sl>0?css("--cobalt"):css("--ink");tx.lineWidth=2;tx.beginPath();tx.arc(e.p[0],e.p[1],e.r,0,6.283);tx.fill();tx.stroke();
    tx.fillStyle=css("--ink");tx.fillRect(e.p[0]-9,e.p[1]-e.r-7,18,3);tx.fillStyle=css("--sun");tx.fillRect(e.p[0]-9,e.p[1]-e.r-7,18*Math.max(0,e.hp/e.mh),3)});
}
function loop(ts){requestAnimationFrame(loop);if(!tdOn){last=0;return}var dt=Math.min(.05,(ts-(last||ts))/1000);last=ts;for(var i=0;i<spd;i++)upd(dt);drawTD();hud()}
function cell(ev){var r=tc.getBoundingClientRect(),x=Math.floor((ev.clientX-r.left)/r.width*12),y=Math.floor((ev.clientY-r.top)/r.height*8);return x>=0&&y>=0&&x<12&&y<8?[x,y]:null}
tc.addEventListener("click",function(ev){var c=cell(ev);if(!c)return;var k=c.join(),ex=towers.filter(function(t){return t.k===k})[0];
  if(tool==="sell"){if(ex){cash+=Math.floor(TT[ex.type].c*.6);towers.splice(towers.indexOf(ex),1)}return}
  if(ex||blocked[k]||cash<TT[tool].c)return;cash-=TT[tool].c;towers.push({type:tool,k:k,p:[(c[0]+.5)*TW,(c[1]+.5)*TW],cd:0})});
tc.addEventListener("mousemove",function(ev){hc=cell(ev)});tc.addEventListener("mouseleave",function(){hc=null});
$("tools").addEventListener("click",function(ev){var b=ev.target.closest("button");if(!b)return;tool=b.dataset.t;document.querySelectorAll("#tools button").forEach(function(x){x.setAttribute("aria-pressed",x===b)})});
$("lvs").addEventListener("click",function(ev){var b=ev.target.closest("button");if(b&&!b.disabled)load(+b.dataset.l)});
$("tds").onclick=function(){if(st==="ready"){st="run";this.disabled=true;$("tdmsg").textContent="Wave incoming. Keep building as you earn cash."}else if(st==="won"&&lv<10)load(lv+1);else load(lv)};
$("tdx").onclick=function(){spd=spd%3+1;this.textContent="Speed "+spd+"×"};
load(1);requestAnimationFrame(loop);
/* MEMORY MATCH */
var mset=["🍒","🍋","🍇","🍉","🍓","🥝","🍑","🍍"],mc,mo,mmv,mlock,mbest=+store.get("ys_mem","0")||0;
if(mbest)$("mb").textContent=mbest;
function mr(){$("mg").innerHTML=mc.map(function(c,i){return '<button class="card'+(c.s===1?" up":c.s===2?" done":"")+'" data-i="'+i+'" aria-label="Card '+(i+1)+(c.s?": "+c.e:"")+'">'+(c.s?c.e:"")+'</button>'}).join("")}
function mnew(){mc=mset.concat(mset).sort(function(){return Math.random()-.5}).map(function(e){return{e:e,s:0}});mo=[];mmv=0;mlock=false;$("mm").textContent=0;$("mh").textContent="Flip two cards to find a pair.";mr()}
$("mg").addEventListener("click",function(ev){
  var b=ev.target.closest(".card");if(!b||mlock)return;var c=mc[+b.dataset.i];if(c.s)return;
  c.s=1;mo.push(c);mr();
  if(mo.length<2)return;
  mmv++;$("mm").textContent=mmv;
  if(mo[0].e===mo[1].e){mo[0].s=mo[1].s=2;mo=[];mr();
    if(mc.every(function(x){return x.s===2})){
      if(!mbest||mmv<mbest){mbest=mmv;store.set("ys_mem",String(mmv));$("mb").textContent=mmv;$("mh").textContent="All pairs found in "+mmv+" moves. New best!"}
      else $("mh").textContent="All pairs found in "+mmv+" moves."}}
  else{mlock=true;setTimeout(function(){mo[0].s=mo[1].s=0;mo=[];mlock=false;mr()},750)}
});
$("mr").onclick=mnew;mnew();

/* 2048 */
var b2,s2,bs2=+store.get("ys_2048","0")||0,o2;
$("g2b").textContent=bs2;
function a2(){var e=[];b2.forEach(function(v,i){if(!v)e.push(i)});if(e.length)b2[e[Math.floor(Math.random()*e.length)]]=Math.random()<.9?2:4}
function r2(){
  $("g2").innerHTML=b2.map(function(v){return v?'<div class="tl" style="background:hsl('+((220+Math.log2(v)*28)%360)+',75%,'+(72-Math.min(Math.log2(v),11)*2)+'%)">'+v+'</div>':'<div class="tl e"></div>'}).join("");
  $("g2s").textContent=s2;if(s2>bs2){bs2=s2;store.set("ys_2048",String(bs2));$("g2b").textContent=bs2}
}
function n2(){b2=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];s2=0;o2=false;a2();a2();$("g2h").textContent="Slide with arrow keys, WASD or swipe. Merge equal tiles.";r2()}
function d2(){for(var i=0;i<16;i++){if(!b2[i])return false;if(i%4<3&&b2[i]===b2[i+1])return false;if(i<12&&b2[i]===b2[i+4])return false}return true}
function m2(d){
  if(o2)return;var ch=false;
  for(var i=0;i<4;i++){
    var ix=[],j;for(j=0;j<4;j++)ix.push(d===0?i*4+j:d===1?i*4+3-j:d===2?j*4+i:(3-j)*4+i);
    var v=ix.map(function(g){return b2[g]}).filter(Boolean),o=[];
    for(j=0;j<v.length;j++){if(v[j]===v[j+1]){o.push(v[j]*2);s2+=v[j]*2;j++}else o.push(v[j])}
    while(o.length<4)o.push(0);
    ix.forEach(function(g,k){if(b2[g]!==o[k])ch=true;b2[g]=o[k]});
  }
  if(!ch)return;a2();r2();
  if(b2.indexOf(2048)>=0)$("g2h").textContent="You made 2048! Keep going for a higher score.";
  if(d2()){o2=true;$("g2h").textContent="Game over. Press New game."}
}
document.addEventListener("keydown",function(e){
  if(!$("v-2048").classList.contains("on"))return;
  var d={ArrowLeft:0,ArrowRight:1,ArrowUp:2,ArrowDown:3,a:0,d:1,w:2,s:3}[e.key];
  if(d!==undefined){e.preventDefault();m2(d)}
});
var g0;
$("g2").addEventListener("touchstart",function(e){g0=e.touches[0]},{passive:true});
$("g2").addEventListener("touchend",function(e){
  if(!g0)return;var t=e.changedTouches[0],dx=t.clientX-g0.clientX,dy=t.clientY-g0.clientY;
  if(Math.max(Math.abs(dx),Math.abs(dy))<20)return;
  m2(Math.abs(dx)>Math.abs(dy)?(dx>0?1:0):(dy>0?3:2));
});
$("g2r").onclick=n2;n2();

/* WHACK-A-MOLE */
var wsc=0,wtl=30,wtm,wsp,wup=-1,wrun=false,wbest=+store.get("ys_whack","0")||0;
$("wb").textContent=wbest;
(function(){var h="";for(var i=0;i<9;i++)h+='<button class="hole" data-i="'+i+'" aria-label="Hole '+(i+1)+'"></button>';$("wh").innerHTML=h})();
function wshow(n){document.querySelectorAll(".hole").forEach(function(b,k){b.classList.toggle("up",k===n);b.textContent=k===n?"🐹":""});wup=n}
function wspawn(){
  if(!wrun)return;var n;do{n=Math.floor(Math.random()*9)}while(n===wup);wshow(n);
  wsp=setTimeout(function(){wshow(-1);wsp=setTimeout(wspawn,200+Math.random()*300)},Math.max(450,900-wsc*15));
}
function wstop(){wrun=false;clearInterval(wtm);clearTimeout(wsp);wshow(-1)}
function wend(){
  wstop();var m="Time’s up. You hit "+wsc+".";
  if(wsc>wbest){wbest=wsc;store.set("ys_whack",String(wsc));$("wb").textContent=wsc;m+=" New best!"}
  $("wm").textContent=m;$("wstart").textContent="Play again";
}
$("wstart").onclick=function(){
  wstop();wrun=true;wsc=0;wtl=30;$("ws").textContent=0;$("wt").textContent=30;$("wm").textContent="Hit every mole you see.";
  wtm=setInterval(function(){wtl--;$("wt").textContent=wtl;if(wtl<=0)wend()},1000);wspawn();
};
$("wh").addEventListener("click",function(ev){
  var b=ev.target.closest(".hole");
  if(wrun&&b&&+b.dataset.i===wup){wsc++;$("ws").textContent=wsc;clearTimeout(wsp);wshow(-1);wsp=setTimeout(wspawn,150)}
});
route();
})();
