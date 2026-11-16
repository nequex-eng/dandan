'use strict';
/* 丹丹的院子·春天7天 v2：玩法优先升级
   变化：画出来的小人/狗/猫 + 走路动画、网格寻路+轴向碰撞、每天6点时光、
   做饭火候计时、种花成长模拟、捉迷藏、气味轨迹实时追踪、记忆拼图、
   程序化音效、大模型聊天走后端（离线自动回落手写台词）。
   不走大模型的：移动/碰撞/渲染、种花生长、做饭计时、存档、主线与结局、藏点触发。 */
var SAVE_KEY='dandan_save_v2', SAVE_KEY_V1='dandan_save_v1';
var cv=document.getElementById('cv'),ctx=cv.getContext('2d');
var W=960,H=760;

var AREAS=[
 {id:'tree',name:'石榴树下',x:250,y:180,r:64},
 {id:'kitchen',name:'厨房与灶台',x:130,y:300,r:64},
 {id:'house',name:'正房与炕头',x:490,y:115,r:78},
 {id:'garden',name:'花坛与菜畦',x:170,y:485,r:78},
 {id:'jar',name:'水缸与墙角',x:835,y:485,r:78},
 {id:'gate',name:'门槛与院门',x:480,y:600,r:64},
 {id:'roof',name:'屋顶与晾衣绳',x:800,y:150,r:78},
 {id:'hutong',name:'半条胡同',x:480,y:710,r:88}
];
function areaById(id){for(var i=0;i<AREAS.length;i++)if(AREAS[i].id===id)return AREAS[i];return null;}
var OBSTACLES=[
 {x:380,y:46,w:220,h:96},{x:44,y:236,w:150,h:110},
 {x:660,y:70,w:240,h:60}
];
var CIRCLES=[{x:250,y:180,r:16},{x:835,y:470,r:26},{x:120,y:480,r:14}];
var WEATHER=[{n:'晴',i:'☀'},{n:'微风',i:'🍃'},{n:'晴',i:'☀'},{n:'小雨',i:'🌧'},{n:'多云',i:'⛅'},{n:'晴',i:'☀'},{n:'花瓣雨',i:'🌸'}];
var DAYPARTS=['清晨','上午','中午','午后','傍晚','夜晚','夜晚'];

var RECIPES={
 tomato:{name:'西红柿炒鸡蛋',steps:['打鸡蛋','切西红柿','热锅倒油','下锅翻炒','加盐出锅']},
 cucumber:{name:'凉拌黄瓜',steps:['拍黄瓜','放蒜末','倒香醋','淋香油','拌匀装盘']}
};
var DAYS=[
 {title:'第1天·搬来',intro:'行李箱的轮子碾过青砖，吱呀一声停在院门口。',tasks:[
   {id:'meet_grandma',label:'跟奶奶打招呼',area:'house'},
   {id:'meet_dog',label:'认识丹丹',area:'tree'},
   {id:'unpack',label:'在正房收拾行李',area:'house'}]},
 {title:'第2天·播种',intro:'清早的阳光落在花坛上，土是松的，心是新的。',tasks:[
   {id:'plant',label:'在花坛种下向日葵',area:'garden'},
   {id:'water',label:'给花坛浇水',area:'garden'},
   {id:'marble',label:'丹丹好像在花坛边闻到了什么',area:'garden'}]},
 {title:'第3天·做饭',intro:'灶台生了火，奶奶系上围裙，厨房就是课堂。',tasks:[
   {id:'cook',label:'跟奶奶做西红柿炒鸡蛋',area:'kitchen'},
   {id:'dry',label:'帮奶奶在晾衣绳上晒被子',area:'roof'},
   {id:'feed',label:'喂丹丹吃饭',area:'tree'}]},
 {title:'第4天·往事',intro:'墙角的老气味醒了，丹丹一早上都在那里打转。',tasks:[
   {id:'capsule',label:'丹丹闻出墙角有东西',area:'jar'},
   {id:'story',label:'听奶奶讲墙角的故事',area:'house'},
   {id:'water2',label:'给向日葵浇水',area:'garden'}]},
 {title:'第5天·胡同',intro:'胡同口飘来豆浆的香气，橘猫蹲在墙头等太阳。',tasks:[
   {id:'breakfast',label:'去胡同买早点',area:'hutong'},
   {id:'cat',label:'遇见胡同口的橘猫',area:'hutong'},
   {id:'cook2',label:'跟奶奶做凉拌黄瓜',area:'kitchen'}]},
 {title:'第6天·眼镜',intro:'奶奶的老花镜不见了，报纸上的字全糊成了一团。',tasks:[
   {id:'glasses',label:'丹丹找回奶奶的老花镜',area:'house'},
   {id:'comfort',label:'陪奶奶在炕头坐一会儿',area:'house'},
   {id:'water3',label:'给向日葵浇水',area:'garden'}]},
 {title:'第7天·开花',intro:'石榴树开了花，向日葵也抬起了头，春天要收尾了。',tasks:[
   {id:'photo',label:'在石榴树下拍全家福',area:'tree'},
   {id:'sunflower',label:'看看向日葵开花了没有',area:'garden'},
   {id:'farewell',label:'和奶奶、丹丹吃春天最后一顿晚饭',area:'house'}]}
];
var FRAGMENTS={marble:'旧弹珠',capsule:'时间胶囊',photo_old:'奶奶年轻时的照片',kite:'屋顶上的旧风筝',fish:'橘猫藏的鱼干',story:'奶奶的雨天故事',sunflower:'向日葵开花',family:'全家福'};
var MEMORY_ORDER={
 marble:['十年前，丹丹还是小狗','它把弹珠埋进花坛边','弹珠上沾着那年的阳光'],
 capsule:['爷爷年轻时写了一张纸条','他把纸条装进铁盒埋进墙角','他说等老了再挖出来慢慢看'],
 photo_old:['奶奶很年轻，站在石榴树下','树才刚栽下，比人还矮','照片是爷爷按下的快门'],
 kite:['小时候的风筝糊着旧报纸','风筝飞上天，绳结是红色的','风筝挂上屋顶，再也没取下来'],
 fish:['橘猫每天来墙根下藏鱼干','它以为没人知道','丹丹闻到了，但没偷吃'],
 story:['那年下了一场大雨','爷爷冒雨把石榴树扶正','奶奶在门口等了一夜'],
 sunflower:['你把种子按进土里','每天浇水，盼它长高','花开了，朝着太阳笑'],
 family:['石榴花开了','一家人站在树下','快门一响，春天被留住了']
};

var S=null;
function freshState(name){
 return {girlName:name||'小女孩',day:1,mode:'girl',trust:0,grandmaMood:6,
  tasksDone:{},fragments:[],recipes:[],photos:[],
  plant:0,wateredDays:0,carrying:null,revealed:{},fedToday:false,
  lowQ:false,fps30:false,finished:false,
  ap:6,apUsed:0,actionsToday:[],chatToday:0,
  plantSim:{stage:0,water:0,sun:0,weeds:0},
  hideSeek:{active:false,hiddenArea:null,guesses:0,found:false,doneToday:false},
  soundOn:true,llmMode:'offline',weededOnce:false};
}
function dayTasks(){return DAYS[S.day-1].tasks;}
function taskDone(id){return !!(S.tasksDone[S.day]&&S.tasksDone[S.day][id]);}
function weatherToday(){return WEATHER[S.day-1];}
function dayPart(){return DAYPARTS[Math.min(6,S.apUsed)];}
function logAction(a){if(S.actionsToday.indexOf(a)<0)S.actionsToday.push(a);if(S.actionsToday.length>12)S.actionsToday.shift();}
/* 时光点：做一件正事花1点，点数为0就只能吃晚饭。走路、闻一闻不花点。 */
function spendAP(n){
 n=n||1;
 if(S.ap<n){toast('今天的时光用完了，吃晚饭吧。');return false;}
 S.ap-=n;S.apUsed+=n;updateHUD();save();return true;
}
function completeTask(id){
 if(!S.tasksDone[S.day])S.tasksDone[S.day]={};
 if(S.tasksDone[S.day][id])return;
 S.tasksDone[S.day][id]=true;
 logAction(id);renderTasks();save();
}
var pendingPuzzle=null;
function addFragment(key,skipPuzzle){
 if(S.fragments.indexOf(key)<0){S.fragments.push(key);toast('收集到记忆碎片：'+FRAGMENTS[key]);save();}
 if(!skipPuzzle&&MEMORY_ORDER[key]){
  /* 拼图永远等当前对话关了再弹：碎片后面紧跟着就是一段对话，直接弹会盖住对话框 */
  pendingPuzzle=key;
  setTimeout(function(){
   if(pendingPuzzle===key&&!dialogueOpen){pendingPuzzle=null;openPuzzle(key);}
  },300);
 }
}
function addPhoto(name){
 if(S.photos.indexOf(name)<0){S.photos.push(name);toast('相册多了一张：'+name);save();}
}
function addTrust(n){S.trust=Math.max(0,Math.min(20,S.trust+n));updateHUD();}
function addMood(n){S.grandmaMood=Math.max(0,Math.min(10,S.grandmaMood+n));updateHUD();}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch(e){}}
function load(){try{var r=localStorage.getItem(SAVE_KEY);if(r)return JSON.parse(r);var o=localStorage.getItem(SAVE_KEY_V1);if(!o)return null;var s=JSON.parse(o);var f=freshState(s.girlName);['day','mode','trust','tasksDone','fragments','recipes','photos','plant','wateredDays','carrying','revealed','lowQ','fps30','finished'].forEach(function(k){if(s[k]!==undefined)f[k]=s[k];});f.plantSim.stage=f.plant||0;return f;}catch(e){return null;}}

var player={x:480,y:420,vx:0,vy:0,walk:0,moving:false,dir:1};
var dog={x:520,y:450,walk:0,moving:false,dir:1,sniff:0,dig:0};
var grandma={x:210,y:330,walk:0,cookAnim:0};
var cat={x:700,y:700,walk:0};
var autoPath=null,autoTarget=null,pendingInteract=null;
var keys={},smellUntil=0,smellTrail=[];
var running=false,rafId=null,lastT=0,paused=false,dialogueOpen=false;
var petals=[],rain=[];
var cookState=null,cookTimer=null,puzzleState=null;

function $(id){return document.getElementById(id);}
function toast(msg){var t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(t._tm);t._tm=setTimeout(function(){t.hidden=true;},3600);}
function girl(){return S.girlName||'小女孩';}
function updateHUD(){
 if(!S)return;
 $('hud-day').textContent=DAYS[S.day-1].title;
 $('hud-weather').textContent=weatherToday().i+weatherToday().n+'·'+dayPart();
 $('hud-ap').textContent='时光✦'+S.ap;
 $('hud-trust').textContent='丹丹信任♥'+S.trust;
 var m=$('hud-mood');if(m)m.textContent='奶奶心情'+(S.grandmaMood>=8?'☺':S.grandmaMood<=3?'☹':'😐')+S.grandmaMood;
 var sb=$('btn-sound');if(sb)sb.textContent=S.soundOn?'🔊声音开':'🔇声音关';
}

var dlgQueue=[],dlgCb=null;
function say(speaker,lines,cb){
 dlgQueue=lines.slice();dlgCb=cb||null;
 $('dlg-speaker').textContent=speaker;
 showDlgLine();
}
function showDlgLine(){
 if(!dlgQueue.length){$('dialogue').hidden=true;dialogueOpen=false;var cb=dlgCb;dlgCb=null;if(cb)cb();
  if(pendingPuzzle){var pk=pendingPuzzle;pendingPuzzle=null;openPuzzle(pk);}
  return;}
 $('dlg-text').textContent=dlgQueue.shift();
 $('dialogue').hidden=false;dialogueOpen=true;
}
$('dlg-next').addEventListener('click',showDlgLine);

function renderTasks(){
 var ul=$('task-list');ul.innerHTML='';
 dayTasks().forEach(function(t){
  var li=document.createElement('li');
  li.textContent=(taskDone(t.id)?'✓ ':'○ ')+t.label;
  if(taskDone(t.id))li.className='done';
  ul.appendChild(li);
 });
 updateHUD();
}
function renderAreas(){
 var box=$('area-list');box.innerHTML='';
 AREAS.forEach(function(a){
  var b=document.createElement('button');
  b.textContent=a.name;
  b.addEventListener('click',function(){goToArea(a.id);});
  box.appendChild(b);
 });
}
var APPROACH={tree:{x:250,y:235},kitchen:{x:220,y:300},house:{x:490,y:175},garden:{x:170,y:485},jar:{x:835,y:545},gate:{x:480,y:600},roof:{x:800,y:150},hutong:{x:480,y:710}};
function goToArea(id){
 var a=areaById(id);if(!a)return;
 var ap=APPROACH[id]||{x:a.x,y:a.y};
 autoPath=findPath(activePos(),ap);autoTarget={x:ap.x,y:ap.y};pendingInteract=id;
}

/* ---------- 网格寻路（48格）+ 轴向碰撞：不穿墙、不贴边滑行 ---------- */
var CELL=48,GCOLS=20,GROWS=16;
function cellBlocked(cx,cy){
 if(cx<0||cy<0||cx>=GCOLS||cy>=GROWS)return true;
 var x=cx*CELL+24,y=cy*CELL+24;
 /* 院墙在y648-668，只留院门x430-530：格子第13行（y624-672）只有中心落在门洞内的两格能走 */
 if(cy===13&&(cx<9||cx>10))return true;
 if(y<52)return true;
 for(var i=0;i<OBSTACLES.length;i++){var o=OBSTACLES[i];
  if(x>o.x-10&&x<o.x+o.w+10&&y>o.y-10&&y<o.y+o.h+10)return true;}
 for(var j=0;j<CIRCLES.length;j++){var c=CIRCLES[j];
  var dx=x-c.x,dy=y-c.y;if(dx*dx+dy*dy<(c.r+10)*(c.r+10))return true;}
 return false;
}
function findPath(from,to){
 var sx=Math.floor(from.x/CELL),sy=Math.floor(from.y/CELL);
 var tx=Math.floor(to.x/CELL),ty=Math.floor(to.y/CELL);
 if(cellBlocked(tx,ty)){
  var best=null,bd=1e9;
  for(var dy=-2;dy<=2;dy++)for(var dx=-2;dx<=2;dx++){
   if(!cellBlocked(tx+dx,ty+dy)){var d=dx*dx+dy*dy;if(d<bd){bd=d;best={x:tx+dx,y:ty+dy};}}
  }
  if(best){tx=best.x;ty=best.y;}else return null;
 }
 var key=function(x,y){return x+','+y;};
 var prev={},seen={},q=[[sx,sy]];seen[key(sx,sy)]=true;
 while(q.length){
  var cur=q.shift();
  if(cur[0]===tx&&cur[1]===ty)break;
  var dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(var i=0;i<4;i++){
   var nx=cur[0]+dirs[i][0],ny=cur[1]+dirs[i][1];
   if(cellBlocked(nx,ny)||seen[key(nx,ny)])continue;
   seen[key(nx,ny)]=true;prev[key(nx,ny)]=cur;q.push([nx,ny]);
  }
 }
 if(!seen[key(tx,ty)])return null;
 var path=[],c=[tx,ty];
 while(!(c[0]===sx&&c[1]===sy)){path.unshift({x:c[0]*CELL+24,y:c[1]*CELL+24});c=prev[key(c[0],c[1])];if(!c)break;}
 path.push({x:to.x,y:to.y});
 return path;
}
function hitObstacle(x,y){
 if(x<28||x>W-28||y<52||y>H-28)return true;
 if(y>648&&y<668&&(x<430||x>530))return true;
 for(var i=0;i<OBSTACLES.length;i++){var o=OBSTACLES[i];
  if(x>o.x-12&&x<o.x+o.w+12&&y>o.y-12&&y<o.y+o.h+12)return true;}
 for(var j=0;j<CIRCLES.length;j++){var c=CIRCLES[j];
  var dx=x-c.x,dy=y-c.y;if(dx*dx+dy*dy<(c.r+12)*(c.r+12))return true;}
 return false;
}
function movePos(p,dx,dy){
 if(dx&&!hitObstacle(p.x+dx,p.y))p.x+=dx;
 if(dy&&!hitObstacle(p.x,p.y+dy))p.y+=dy;
}
function activePos(){return S.mode==='dog'?dog:player;}
function update(dt){
 var p=activePos(),sp=S.mode==='dog'?115:150,dx=0,dy=0;
 if(keys['arrowup']||keys['w'])dy-=1;
 if(keys['arrowdown']||keys['s'])dy+=1;
 if(keys['arrowleft']||keys['a'])dx-=1;
 if(keys['arrowright']||keys['d'])dx+=1;
 if(dx||dy){
  var l=Math.sqrt(dx*dx+dy*dy);
  movePos(p,dx/l*sp*dt,dy/l*sp*dt);
  p.moving=true;p.walk+=dt*9;if(dx)p.dir=dx>0?1:-1;
  autoPath=null;autoTarget=null;pendingInteract=null;
  stepSound(dt);
 }else if(autoPath&&autoPath.length){
  var wp=autoPath[0];
  var tx=wp.x-p.x,ty=wp.y-p.y,td=Math.sqrt(tx*tx+ty*ty);
  if(td<16){autoPath.shift();
   if(!autoPath.length){autoTarget=null;if(pendingInteract){var id=pendingInteract;pendingInteract=null;interactArea(id);}}
  }else{
   movePos(p,tx/td*sp*dt,ty/td*sp*dt);
   p.moving=true;p.walk+=dt*9;if(tx)p.dir=tx>0?1:-1;
  }
 }else{
  p.moving=false;
  if(autoTarget&&pendingInteract){
   var pa=areaById(pendingInteract);
   if(pa&&Math.sqrt((pa.x-p.x)*(pa.x-p.x)+(pa.y-p.y)*(pa.y-p.y))<120){
    autoTarget=null;var pid=pendingInteract;pendingInteract=null;interactArea(pid);
   }
  }
 }
 var other=S.mode==='dog'?player:dog;
 var ox=other.x-p.x,oy=other.y-p.y,od=Math.sqrt(ox*ox+oy*oy);
 if(od>80){var lead=S.trust>=5&&S.mode==='girl'?150:120;movePos(other,ox/od*lead*dt,oy/od*lead*dt);other.moving=true;other.walk+=dt*9;}
 else other.moving=false;
 grandma.x=210;grandma.y=330;
 if(dog.sniff>0)dog.sniff-=dt;
 if(dog.dig>0)dog.dig-=dt;
 if(grandma.cookAnim>0)grandma.cookAnim-=dt;
 if(smellTrail.length){
  var now=Date.now();
  smellTrail=smellTrail.filter(function(t){return t.pts.some(function(pt){return now<pt.until;});});
 }
}
function dist(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}
function nearestArea(p){
 var best=null,bd=1e9;
 AREAS.forEach(function(a){var d=Math.sqrt((a.x-p.x)*(a.x-p.x)+(a.y-p.y)*(a.y-p.y));if(d<bd){bd=d;best=a;}});
 return bd<130?best:null;
}

/* ---------- 程序化音效（WebAudio，无外部文件） ---------- */
var AC=null,bgmTimer=null,stepAcc=0;
function audio(){
 if(!S||!S.soundOn)return null;
 try{
  if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();
  if(AC.state==='suspended')AC.resume();
  return AC;
 }catch(e){return null;}
}
function tone(freq,dur,type,vol,slide){
 var ac=audio();if(!ac)return;
 try{
  var o=ac.createOscillator(),g=ac.createGain();
  o.type=type||'sine';o.frequency.value=freq;
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,slide),ac.currentTime+dur);
  g.gain.setValueAtTime(vol||0.08,ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur);
  o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+dur);
 }catch(e){}
}
function noiseBurst(dur,vol){
 var ac=audio();if(!ac)return;
 try{
  var len=Math.floor(ac.sampleRate*dur),buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);
  for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
  var s=ac.createBufferSource(),g=ac.createGain();s.buffer=buf;g.gain.value=vol||0.05;
  s.connect(g);g.connect(ac.destination);s.start();
 }catch(e){}
}
function stepSound(dt){stepAcc+=dt;if(stepAcc>0.38){stepAcc=0;noiseBurst(0.05,0.03);}}
function barkSound(){tone(420,0.12,'square',0.07,180);setTimeout(function(){tone(380,0.1,'square',0.06,160);},140);}
function sizzleSound(){noiseBurst(0.4,0.06);}
function birdSound(){tone(2400,0.15,'sine',0.03,3200);setTimeout(function(){tone(2800,0.12,'sine',0.025,2200);},200);}
function startBGM(){
 if(bgmTimer||!S||!S.soundOn||S.lowQ)return;
 var notes=[523,587,659,784,880,784,659,587],i=0;
 bgmTimer=setInterval(function(){
  if(!S||!S.soundOn||document.hidden||dialogueOpen)return;
  tone(notes[i%notes.length],0.5,'triangle',0.025);i++;
  if(i%8===0)birdSound();
 },900);
}
function stopBGM(){if(bgmTimer){clearInterval(bgmTimer);bgmTimer=null;}}

/* ---------- 互动：先做事，再聊天；正事花时光 ---------- */
function interact(){
 if(dialogueOpen)return;
 var p=activePos();
 if(S.ap<=0){toast('今天的时光用完了，吃晚饭吧。');return;}
 /* 捉迷藏进行中：按互动就是猜“丹丹藏在我身边这个地方” */
 if(S.hideSeek.active){
  var na=nearestArea(p);
  if(na){guessHideSeek(na.id);return;}
 }
 var bestTask=null,bestD=1e9;
 AREAS.forEach(function(a){
  var d=Math.sqrt((a.x-p.x)*(a.x-p.x)+(a.y-p.y)*(a.y-p.y));
  if(d<130&&d<bestD&&dayTasks().some(function(t){return t.area===a.id&&!taskDone(t.id);})){bestTask=a;bestD=d;}
 });
 if(bestTask){interactArea(bestTask.id);return;}
 if(dist(p,grandma)<70){talkGrandma();return;}
 var other=S.mode==='dog'?player:dog;
 if(dist(p,other)<70){talkDog();return;}
 if(S.day>=5&&dist(p,cat)<70){talkCat();return;}
 var a=nearestArea(p);
 if(a)interactArea(a.id);
 else toast('这里没什么可做的，往有名字的地方走走。');
}
function talkDog(){
 if(S.mode==='dog'){barkSound();say('丹丹',['汪！（丹丹摇着尾巴，绕着你转了一圈。）'],null);return;}
 addTrust(1);
 if(S.day===3&&!taskDone('feed')){
  if(!spendAP(1))return;
  completeTask('feed');
  say('丹丹',['你把狗粮倒进丹丹的小碗里，它先闻了闻，再抬头看你一眼，才埋头吃起来。','吃完它舔了舔嘴，蹭了蹭你的手：好吃，明天还来。']);
  return;
 }
 say('丹丹',['丹丹抬起头，黑亮的眼睛看着你，尾巴摇得像拨浪鼓。','它用鼻子拱了拱你的手，好像在说：带我玩，带我闻闻这个院子。']);
}
function talkCat(){
 addPhoto('胡同橘猫');
 say('橘猫',['橘猫眯着眼，尾巴尖轻轻一甩，没有跑。','它蹲在墙头上，胡子沾着一点鱼干的香气，仿佛在说：这条胡同，我熟。']);
}
function talkGrandma(){
 var g=girl();
 if(S.day===1&&!taskDone('meet_grandma')){
  if(!spendAP(1))return;
  completeTask('meet_grandma');addMood(1);
  say('奶奶',['哎哟，'+g+'来啦。快进来，炕都给你烧热了。','丹丹，过来闻闻，这是咱们家的新孩子。以后啊，你们俩就是一个院子的人了。']);
 }else if(S.day===4&&taskDone('capsule')&&!taskDone('story')){
  if(!spendAP(1))return;
  completeTask('story');addFragment('story');addMood(1);
  say('奶奶',['这个铁盒子啊……是你爷爷年轻时埋的。','那年下了一场大雨，他说，要把最想留住的日子埋进墙角，等老了再挖出来慢慢看。','没想到，是丹丹先替我们把它找回来了。']);
 }else if(S.day===6&&!taskDone('comfort')){
  if(!spendAP(1))return;
  completeTask('comfort');addMood(2);
  say('奶奶',['坐，坐。眼镜找不着，报纸看不清，可你来了，字就都清楚了。','人老了，丢三落四的，幸好有你们在。']);
 }else{
  var lines=[
   '奶奶正在择菜，抬头冲你笑：饿了就说，锅里一直热着呢。',
   '奶奶说：石榴树是你爷爷种的，每年春天开花，比闹钟还准。',
   '奶奶眯着眼看天：今儿个天好，适合晒被子，也适合发呆。'
  ];
  say('奶奶',[lines[(S.day+Math.floor(Math.random()*3))%3]]);
 }
}

/* ---------- 丹丹的四种能力 + 气味轨迹实时追踪 ---------- */
function dogAction(kind){
 if(S.mode!=='dog'){toast('先切换成丹丹再用这个本事。');return;}
 var p=dog;
 if(kind==='smell'){
  dog.sniff=1.2;barkSound();
  var spots=hiddenSpots();
  var now=Date.now();
  smellTrail=spots.map(function(s,i){
   /* 轨迹是实时衰减的：从丹丹当前位置逐段指向藏点，8秒后消失 */
   var pts=[],n=6;
   for(var k=1;k<=n;k++)pts.push({x:p.x+(s.x-p.x)*k/n,y:p.y+(s.y-p.y)*k/n,until:now+8000-k*300});
   return {spot:s,pts:pts};
  });
  smellUntil=now+8000;
  if(spots.length)toast('丹丹抽了抽鼻子：金色气味指向'+spots[0].name+'，8秒内跟过去！');
  else toast('丹丹闻了闻：院子里没有新的旧气味了，只有饭香和花香。');
 }else if(kind==='hear'){
  var hints=[];
  if(S.day===4&&!taskDone('capsule'))hints.push('墙角那边有很轻很轻的动静，像铁盒子在土里叹气');
  else if(S.day===6&&!taskDone('glasses'))hints.push('炕头那边传来很轻的叮当声，像有什么小东西掉在了砖缝里');
  else if(S.day===2&&!taskDone('marble'))hints.push('花坛那边有丹丹埋东西时留下的气味');
  else hints.push('胡同口有脚步声，邻居在聊天，橘猫在打哈欠');
  say('丹丹的耳朵',['丹丹竖起耳朵，头微微一歪。','它听见：'+hints[0]+'。']);
 }else if(kind==='drill'){
  dog.dig=1.0;
  var spot=nearHiddenSpot(p);
  if(spot){revealSpot(spot);}
  else if(dist(p,{x:900,y:545})<70){findKite();}
  else toast('这里没有能钻的洞。墙角、水缸边和炕头底下才有缝。');
 }else if(kind==='carry'){
  carryAction();
 }
}
function hiddenSpots(){
 var list=[];
 if(S.day===2&&!taskDone('marble'))list.push({id:'marble',name:'花坛边的旧弹珠',x:230,y:520});
 if(S.day===4&&!taskDone('capsule'))list.push({id:'capsule',name:'墙角的时间胶囊',x:890,y:540});
 if(S.day===6&&!taskDone('glasses'))list.push({id:'glasses',name:'炕头下的老花镜',x:470,y:150});
 if(!S.revealed.oldphoto)list.push({id:'oldphoto',name:'炕头底下的旧照片',x:520,y:150});
 return list;
}
function nearHiddenSpot(p){
 var spots=hiddenSpots();
 for(var i=0;i<spots.length;i++)if(dist(p,spots[i])<80)return spots[i];
 return null;
}
function revealSpot(spot){
 if(!S.revealed[spot.id]){
  S.revealed[spot.id]=true;
  if(spot.id==='marble'){if(!spendAP(1))return;completeTask('marble');addFragment('marble');addPhoto('丹丹挖弹珠');addTrust(2);
   say('丹丹',['丹丹前爪飞快地刨土，土里滚出一颗亮晶晶的旧弹珠。','弹珠上还沾着十年前的阳光。丹丹得意地抬起头：看，我藏的宝贝！']);}
  else if(spot.id==='capsule'){if(!spendAP(1))return;completeTask('capsule');addFragment('capsule');
   say('丹丹',['丹丹从墙角的洞里拖出一个生锈的小铁盒，盒盖上刻着一行小字。','奶奶的手有点抖：这是你爷爷埋的时间胶囊啊……']);}
  else if(spot.id==='glasses'){S.carrying='glasses';toast('丹丹叼起了老花镜，快送到奶奶身边！');
   say('丹丹',['丹丹从炕头底下叼出奶奶的老花镜，镜腿上还沾着一点灰。','它叼着眼镜，尾巴摇得飞快，等着你带它去找奶奶。']);}
  else if(spot.id==='oldphoto'){addFragment('photo_old');addPhoto('奶奶年轻时的照片');
   say('丹丹',['丹丹从炕头底下钻出来，嘴里叼着一张发黄的旧照片。','照片上的奶奶很年轻，站在石榴树下笑，树才刚栽下，比人还矮。']);}
  save();
 }else{
  toast('这里已经找过了。');
 }
}
function findKite(){
 if(S.revealed.kite){toast('屋顶的旧风筝已经拿下来了。');return;}
 S.revealed.kite=true;addFragment('kite');
 say('丹丹',['丹丹钻进屋顶下的小洞，拖出一只糊着旧报纸的小风筝。','风筝尾巴上系着一根红绳，绳结还是小时候的手法。']);
 save();
}
function carryAction(){
 var p=dog;
 if(S.carrying==='glasses'){
  if(dist(p,grandma)<80){
   S.carrying=null;if(!spendAP(1))return;completeTask('glasses');addTrust(3);addFragment('photo_old');
   say('奶奶',['哎哟，我的眼镜！丹丹，你可真是咱们家的功臣。','奶奶戴上眼镜，报纸上的字一下子全清楚了，她笑着摸了摸丹丹的头。']);
  }else toast('丹丹叼着眼镜呢，带它到奶奶身边再松口。');
 }else{
  var spot=nearHiddenSpot(p);
  if(spot)revealSpot(spot);
  else toast('附近没有能叼的东西。先用闻找到气味，再过来叼。');
 }
}

/* ---------- 捉迷藏：丹丹藏进8个地点之一，3次机会 ---------- */
function startHideSeek(){
 if(S.day<3){toast('第3天起才能和丹丹玩捉迷藏。');return false;}
 if(S.hideSeek.doneToday){toast('今天已经玩过捉迷藏了，明天再来。');return false;}
 if(!spendAP(1))return false;
 var ids=AREAS.map(function(a){return a.id;});
 S.hideSeek={active:true,hiddenArea:ids[Math.floor(Math.random()*ids.length)],guesses:0,found:false,doneToday:true};
 toast('丹丹一溜烟跑开了！它藏在院子某个地方，你有3次机会，走过去找找。');
 save();return true;
}
function guessHideSeek(areaId){
 var hs=S.hideSeek;
 if(!hs.active)return false;
 var p=activePos(),a=areaById(areaId);
 if(!a)return false;
 if(dist(p,a)>130){toast('先走近'+a.name+'再找找。');return false;}
 hs.guesses++;
 if(areaId===hs.hiddenArea){
  hs.active=false;hs.found=true;addTrust(2);addFragment('kite',true);
  say('丹丹',['找到了！丹丹从'+a.name+'后面跳出来，尾巴摇得飞快。','它得意地绕着你转圈：再来一局，我藏得更好！']);
  save();return true;
 }
 if(hs.guesses>=3){
  hs.active=false;
  say('丹丹',['3次都找错啦。丹丹从'+areaById(hs.hiddenArea).name+'后面探出头，眨眨眼。','它说：明天再来，我藏得更难一点。']);
 }else{
  var hint=dist(p,areaById(hs.hiddenArea))<200?'很近了，气味很浓！':'还远呢，往另一边找找。';
  toast('没在这里。'+hint+'还剩'+(3-hs.guesses)+'次机会。');
 }
 save();return false;
}

/* ---------- 地点互动（正事花时光） ---------- */
function interactArea(id){
 var g=girl();
 switch(id){
  case 'tree':
   if(S.day===1&&!taskDone('meet_dog')){
    if(!spendAP(1))return;
    completeTask('meet_dog');addTrust(1);
    say('丹丹',['石榴树下趴着一只小小的北京犬，毛是金棕色的，脸皱皱的，表情很严肃。','它抬眼看了你一眼，又低下头，尾巴却轻轻摇了一下。','奶奶在屋里喊：它叫丹丹，别看它脸凶，心可软了。']);
   }else if(S.day===7&&!taskDone('photo')){
    if(!spendAP(1))return;
    completeTask('photo');addFragment('family');addPhoto('全家福');
    say(g,['石榴花开了，满树都是粉白的小花。','奶奶抱着丹丹，你站在树下，邻居帮忙按下了快门。','咔嚓——这个春天，被留住了。']);
   }else if(S.day>=3&&!S.hideSeek.doneToday){
    startHideSeek();
   }else if(S.day===7){
    say('石榴树',['石榴花开得正好，风一吹，花瓣落在丹丹的头顶上，像一顶小帽子。']);
   }else{
    say('石榴树',['石榴树还只有绿叶，花苞鼓鼓的，像攥紧的小拳头。','树干上有一道浅浅的刻痕，是很多年前量身高留下的。']);
   }
   break;
  case 'house':
   if(S.day===1&&!taskDone('unpack')){
    if(!spendAP(1))return;
    completeTask('unpack');
    say(g,['你把衣服一件件放进柜子，把书摆上炕桌，把小熊放在枕头边。','行李箱空了，这个房间，开始有点像你的了。']);
   }else if(S.day===6&&!taskDone('glasses')&&S.mode==='dog'){
    toast('丹丹在炕头下闻到了老花镜的气味！按闻确认，再按叼取出来。');
    smellUntil=Date.now()+6000;smellTrail=hiddenSpots().map(function(s){return {spot:s,pts:[{x:dog.x,y:dog.y,until:Date.now()+6000}]};});
   }else if(S.day===7&&!taskDone('farewell')){
    if(!spendAP(1))return;
    completeTask('farewell');
    say('奶奶',['晚饭摆上了桌，石榴花从窗外探进来。','奶奶给每个人都盛了满满一碗：春天最后一顿，要吃得饱饱的。']);
   }else{
    say('正房',['炕头铺着花布，炕桌上放着一本翻旧了的相册。','墙上挂着一张全家福，照片里的人都笑得很年轻。']);
   }
   break;
  case 'kitchen':
   if(S.day===3&&!taskDone('cook')){startCook('tomato','cook');}
   else if(S.day===5&&!taskDone('cook2')){startCook('cucumber','cook2');}
   else if(S.recipes.length<2&&S.day>3){startCook(S.recipes.indexOf('tomato')<0?'tomato':'cucumber',null);}
   else{
    say('厨房',['灶台上炖着汤，咕嘟咕嘟地冒着热气。','奶奶说：做饭的秘诀就一个，别急，火到了，菜自己就香了。']);
   }
   break;
  case 'garden':
   if(S.day===2&&!taskDone('plant')){
    if(!spendAP(1))return;
    completeTask('plant');S.plant=1;S.plantSim.stage=1;S.plantSim.water=0;
    say(g,['你把向日葵种子一颗颗按进土里，盖上薄薄一层土。','奶奶说：每天浇点水，它会比你长得还快。']);
   }else if((S.day===2&&!taskDone('water'))||(S.day===4&&!taskDone('water2'))||(S.day===6&&!taskDone('water3'))){
    var tid=S.day===2?'water':(S.day===4?'water2':'water3');
    if(!spendAP(1))return;
    completeTask(tid);S.wateredDays++;waterPlant();
    say(g,['水壶倾斜，水落在土里，发出很轻的沙沙声。','向日葵好像轻轻动了一下，在说：谢谢。']);
   }else if(S.day===7&&!taskDone('sunflower')){
    if(!spendAP(1))return;
    completeTask('sunflower');
    if(S.plantSim.stage>=4){addFragment('sunflower');addPhoto('向日葵开花');
     say(g,['向日葵开花了！金黄的大花盘朝着太阳，像一张笑脸。','奶奶说：你种的，你浇的，这个春天，它是你的。']);}
    else{
     say(g,['向日葵长高了，花苞还没有完全打开。','它还在努力，春天也是。']);
    }
   }else if(S.day===2&&!taskDone('marble')&&S.mode==='dog'){
    var sp=nearHiddenSpot(dog)||hiddenSpots()[0];
    if(sp)revealSpot(sp);
   }else if(S.plantSim.weeds>0){
    if(!spendAP(1))return;
    S.plantSim.weeds=0;S.weededOnce=true;logAction('weed');
    say(g,['你蹲下来，把花坛里的杂草一根根拔掉。','向日葵的叶子舒展开了，好像松了一口气。']);
    save();
   }else if(S.plantSim.stage>0){
    say('花坛',['向日葵长得很好，叶子绿油油的。'+(S.plantSim.stage>=4?'花已经开了，金灿灿的。':'再浇浇水、除除草，它还会长。')]);
   }else{
    say('花坛',['花坛里的土松松软软的，适合种点什么。','旁边放着一包向日葵种子和一把小水壶。']);
   }
   break;
  case 'jar':
   if(S.day===4&&!taskDone('capsule')&&S.mode==='dog'){
    var sp2=nearHiddenSpot(dog);
    if(sp2)revealSpot(sp2);
    else{toast('丹丹闻到了！墙角的洞里有东西，先按闻，再按钻。');smellUntil=Date.now()+6000;}
   }else if(S.day===4&&!taskDone('capsule')){
    say(g,['水缸里的水清清凉凉的，墙角堆着旧砖。','丹丹围着墙角打转，鼻子贴在地上，好像那里藏着什么——可你看不出来。','也许，换成丹丹的眼睛就能看见。']);
   }else{
    say('水缸',['水缸里的水映着天，几片石榴叶漂在水面上。','墙角有个小小的洞，刚好够丹丹钻进去。']);
   }
   break;
  case 'gate':
   say('院门',['门槛有点高，你小时候要踮脚才迈得过去。','门外就是胡同，卖豆浆的吆喝声、自行车的铃声，都从这里飘进来。']);
   break;
  case 'roof':
   if(S.day===3&&!taskDone('dry')){
    if(!spendAP(1))return;
    completeTask('dry');
    say(g,['你把被子搭上晾衣绳，夹子一个一个夹好。','被子在风里轻轻鼓起来，像一张等着晒太阳的帆。']);
   }else if(S.mode==='dog'&&!S.revealed.kite){
    findKite();
   }else{
    say('屋顶',['晾衣绳上挂着几件衣服，风一吹就轻轻晃。','从这里能看见半条胡同的屋顶，鸽子在屋脊上走来走去。']);
   }
   break;
  case 'hutong':
   if(S.day===5&&!taskDone('breakfast')){
    if(!spendAP(1))return;
    completeTask('breakfast');
    say('邻居王爷爷',['哟，新来的小姑娘吧？豆浆油条，趁热吃。','王爷爷往你手里塞了一个茶叶蛋：头一回，爷爷请你的。']);
   }else if(S.day===5&&!taskDone('cat')){
    if(!spendAP(1))return;
    completeTask('cat');addPhoto('胡同橘猫');
    say('橘猫',['橘猫从墙头跳下来，绕着你的腿转了一圈。','丹丹和它对视了三秒，然后一起蹲下来晒太阳——这就是它们的打招呼方式。']);
   }else if(S.day===5&&S.mode==='dog'&&!S.revealed.fish){
    S.revealed.fish=true;addFragment('fish');
    say('丹丹',['丹丹闻到墙根下有鱼干的气味，扒开一片砖，果然藏着橘猫的私房鱼干。','橘猫瞪了它一眼，丹丹赶紧把鱼干推回去：你的你的，我就是闻闻。']);
   }else{
    say('半条胡同',['胡同不长，几户人家，几棵树，几只猫。','邻居们见了你都笑：这不是奶奶家的小姑娘吗，长这么高了。']);
   }
   break;
 }
 renderTasks();save();
}
/* 种花成长模拟：水+阳光够、没杂草才长；杂草每天长 */
function waterPlant(){
 var ps=S.plantSim;
 ps.water++;
 if(ps.water>=1&&ps.weeds<=1&&ps.stage<4){ps.stage++;S.plant=ps.stage;}
 if(weatherToday().n==='晴'||weatherToday().n==='微风')ps.sun++;
 save();
}
function growPlantOvernight(){
 var ps=S.plantSim;
 if(ps.stage>0&&ps.stage<4){
  ps.weeds=Math.min(2,ps.weeds+1);
  if(ps.water>=1&&ps.weeds<=2){ps.stage++;S.plant=ps.stage;}
  ps.water=0;ps.sun=0;
 }
 save();
}

/* ---------- 做饭：火候计时小游戏（不是点顺序） ---------- */
function startCook(recipeId,taskId){
 var r=RECIPES[recipeId];
 cookState={recipe:recipeId,task:taskId,step:0,score:0,misses:0,marker:0,dir:1,running:true};
 $('cook-title').textContent='跟奶奶做'+r.name;
 $('cook-hint').textContent='火候条上的红标来回跑，点下面这一步时标在绿区里才算好火候；奶奶心情好时绿区更宽。连续两次烧糊，这道菜就得重做。';
 grandma.cookAnim=2;
 renderCook();
 $('cook').hidden=false;dialogueOpen=true;
 sizzleSound();
 if(cookTimer)clearInterval(cookTimer);
 cookTimer=setInterval(function(){
  if(!cookState||!cookState.running)return;
  cookState.marker+=cookState.dir*2.2;
  if(cookState.marker>100){cookState.marker=100;cookState.dir=-1;}
  if(cookState.marker<0){cookState.marker=0;cookState.dir=1;}
  var m=$('cook-marker');if(m)m.style.left=cookState.marker+'%';
 },30);
}
function cookZoneWidth(){return S.grandmaMood>=8?34:24;}
function renderCook(){
 var r=RECIPES[cookState.recipe];
 $('cook-steps').textContent='第'+(cookState.step+1)+'步：'+r.steps[cookState.step]+'（共'+r.steps.length+'步）';
 var z=$('cook-zone');if(z){z.style.left=(50-cookZoneWidth()/2)+'%';z.style.width=cookZoneWidth()+'%';}
 $('cook-score').textContent='得分：'+cookState.score+' · 烧糊：'+cookState.misses+'/2';
 var box=$('cook-choices');box.innerHTML='';
 var b=document.createElement('button');
 b.textContent='就是现在：'+r.steps[cookState.step];
 b.addEventListener('click',cookHit);
 box.appendChild(b);
}
function cookHit(){
 if(!cookState||!cookState.running)return;
 var w=cookZoneWidth(),lo=50-w/2,hi=50+w/2,m=cookState.marker;
 var r=RECIPES[cookState.recipe];
 if(m>=lo&&m<=hi){
  var perfect=Math.abs(m-50)<w/4;
  cookState.score+=perfect?30:15;
  tone(perfect?880:660,0.15,'triangle',0.07);
  toast(perfect?'火候正好！':'火候不错。');
  cookState.step++;
  if(cookState.step>=r.steps.length){
   cookState.running=false;if(cookTimer){clearInterval(cookTimer);cookTimer=null;}
   $('cook').hidden=true;dialogueOpen=false;
   if(S.recipes.indexOf(cookState.recipe)<0)S.recipes.push(cookState.recipe);
   if(cookState.task){if(spendAP(1))completeTask(cookState.task);}
   addTrust(1);addMood(1);save();
   var grade=cookState.score>=120?'色香味都齐了，奶奶竖起大拇指。':'端上桌了，热气腾腾的。';
   say('奶奶',[grade+' '+r.name+'做好了，得分'+cookState.score+'分。','奶奶夹了一筷子，点点头：嗯，有我当年的味道。','菜谱收进了你的小本子，以后想吃，随时能做。']);
  }else renderCook();
 }else{
  cookState.misses++;
  noiseBurst(0.2,0.08);
  if(cookState.misses>=2){
   cookState.running=false;if(cookTimer){clearInterval(cookTimer);cookTimer=null;}
   $('cook').hidden=true;dialogueOpen=false;
   toast('烧糊了……这道菜重做吧，不扣时光，奶奶也没怪你。');
  }else{
   toast('火候过了！再烧糊一次这道菜就得重做。');
   renderCook();
  }
 }
}
function cookForceHit(){if(cookState){cookState.marker=50;cookHit();}}
$('cook-close').addEventListener('click',function(){
 if(cookTimer){clearInterval(cookTimer);cookTimer=null;}
 if(cookState)cookState.running=false;
 $('cook').hidden=true;dialogueOpen=false;
});

/* ---------- 记忆拼图：三张卡按先后顺序点 ---------- */
function openPuzzle(key){
 var lines=MEMORY_ORDER[key];if(!lines)return;
 puzzleState={key:key,order:lines.slice(),picked:[],tries:0,done:false};
 var box=$('puzzle-cards');box.innerHTML='';
 var shuffled=lines.slice().sort(function(){return Math.random()-0.5;});
 $('puzzle-title').textContent='拼一拼：'+FRAGMENTS[key];
 $('puzzle-status').textContent='已点 0/3';
 shuffled.forEach(function(text){
  var b=document.createElement('button');
  b.textContent=text;
  b.addEventListener('click',function(){
   if(puzzleState.done||b.className==='picked')return;
   b.className='picked';
   puzzleState.picked.push(text);
   $('puzzle-status').textContent='已点 '+puzzleState.picked.length+'/3';
   if(puzzleState.picked.length===3)checkPuzzle();
  });
  box.appendChild(b);
 });
 $('puzzle').hidden=false;dialogueOpen=true;
}
function checkPuzzle(){
 var ps=puzzleState;
 var ok=ps.picked.every(function(t,i){return t===ps.order[i];});
 if(ok){
  ps.done=true;
  $('puzzle-status').textContent='拼对了！这段记忆完整了：\n'+ps.order.join(' → ');
  tone(880,0.3,'triangle',0.07);
 }else{
  ps.tries++;
  if(ps.tries>=2){
   ps.done=true;
   $('puzzle-status').textContent='这次没拼对，正确答案是：\n'+ps.order.join(' → ');
  }else{
   $('puzzle-status').textContent='顺序不对，再试一次（还剩1次）。';
   ps.picked=[];
   var btns=$('puzzle-cards').querySelectorAll('button');
   btns.forEach(function(b){b.className='';});
  }
 }
 save();
}
$('puzzle-close').addEventListener('click',function(){$('puzzle').hidden=true;dialogueOpen=false;});

/* ---------- 大模型聊天：只走后端 /api，离线回落手写台词 ---------- */
var chatHistory={grandma:[],dandan:[]},chatSpeaker='grandma',chatChecked=false;
var OFFLINE_GRANDMA=[
 '奶奶笑着说：饿了就说，锅里一直热着呢。',
 '奶奶说：石榴树是你爷爷种的，每年春天开花，比闹钟还准。',
 '奶奶眯着眼看天：今儿个天好，适合晒被子，也适合发呆。',
 '奶奶说：丹丹别看脸凶，心可软了，跟你一样。'
];
var OFFLINE_DANDAN=[
 '汪！（丹丹摇着尾巴：带我出去闻闻！）',
 '汪汪！（丹丹用鼻子拱你：墙角那边有旧气味！）',
 '呜……（丹丹趴下来：今天跑累了，摸摸我。）'
];
function compactState(){
 return {day:S.day,girlName:girl(),fragments:S.fragments.slice(),recipes:S.recipes.slice(),
  trust:S.trust,plantStage:S.plantSim.stage,tasksDoneToday:Object.keys(S.tasksDone[S.day]||{}),
  grandmaMood:S.grandmaMood,actionsToday:S.actionsToday.slice()};
}
function chatOfflineLine(speaker){
 if(speaker==='grandma'){
  var i=(S.day+S.fragments.length)%OFFLINE_GRANDMA.length;
  return OFFLINE_GRANDMA[i];
 }
 var spots=hiddenSpots();
 if(spots.length)return '汪汪！（丹丹：'+spots[0].name+'那边有气味，跟我来！）';
 return OFFLINE_DANDAN[(S.day+S.trust)%OFFLINE_DANDAN.length];
}
async function checkLLMStatus(){
 if(chatChecked)return;
 chatChecked=true;
 try{
  var c=new AbortController();setTimeout(function(){c.abort();},3000);
  var r=await fetch('/api/status',{signal:c.signal});
  var d=await r.json();
  S.llmMode=d.available?d.mode:'offline';
 }catch(e){S.llmMode='offline';}
 var b=$('chat-badge');
 if(b){b.textContent=S.llmMode==='offline'?'离线·手写台词':'在线·'+S.llmMode;b.className=S.llmMode==='offline'?'':'on';}
}
function openChat(){
 $('chat').hidden=false;dialogueOpen=true;
 $('chat-title').textContent='和奶奶聊聊';
 checkLLMStatus();
 renderChatLog();
}
function renderChatLog(){
 var log=$('chat-log');log.innerHTML='';
 chatHistory[chatSpeaker].forEach(function(m){
  var d=document.createElement('div');
  d.className=m.role==='user'?'me':'them';
  d.textContent=(m.role==='user'?girl()+'：':(chatSpeaker==='grandma'?'奶奶：':'丹丹：'))+m.content;
  log.appendChild(d);
 });
 log.scrollTop=log.scrollHeight;
}
async function sendChat(){
 var input=$('chat-input'),text=input.value.trim();
 if(!text)return;
 if(S.chatToday>=8){toast('今天已经聊了8句了，明天再聊。');return;}
 input.value='';
 S.chatToday++;logAction('chat');
 chatHistory[chatSpeaker].push({role:'user',content:text});
 renderChatLog();
 var reply=null;
 try{
  var c=new AbortController();setTimeout(function(){c.abort();},8000);
  var r=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({speaker:chatSpeaker,messages:chatHistory[chatSpeaker].slice(-6),state:compactState()}),signal:c.signal});
  var d=await r.json();
  if(r.ok&&d.reply)reply=d.reply;
 }catch(e){reply=null;}
 if(!reply)reply=chatOfflineLine(chatSpeaker);
 chatHistory[chatSpeaker].push({role:'assistant',content:reply});
 if(chatHistory[chatSpeaker].length>12)chatHistory[chatSpeaker]=chatHistory[chatSpeaker].slice(-12);
 renderChatLog();save();
}
$('chat-send').addEventListener('click',sendChat);
$('chat-input').addEventListener('keydown',function(e){if(e.key==='Enter')sendChat();});
$('chat-close').addEventListener('click',function(){$('chat').hidden=true;dialogueOpen=false;});
$('btn-chat').addEventListener('click',openChat);
document.querySelectorAll('#chat-speakers button').forEach(function(b){
 b.addEventListener('click',function(){
  chatSpeaker=b.getAttribute('data-speaker');
  document.querySelectorAll('#chat-speakers button').forEach(function(x){x.className=x===b?'on':'';});
  $('chat-title').textContent=chatSpeaker==='grandma'?'和奶奶聊聊':'丹丹的心声';
  renderChatLog();
 });
});
/* 动态小任务：大模型只提议，白名单校验后才出现，失败就用手写任务 */
var bonusTask=null;
async function requestSideTask(){
 try{
  var c=new AbortController();setTimeout(function(){c.abort();},5000);
  var r=await fetch('/api/task',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({state:compactState()}),signal:c.signal});
  var d=await r.json();
  var t=d.task||d.fallback;
  if(!t)return;
  var okArea=AREAS.some(function(a){return a.id===t.area;});
  var okKind=['water','tidy','find','greet','cook','play'].indexOf(t.kind)>=0;
  if(!okArea||!okKind||typeof t.label!=='string'||t.label.length>20)return;
  bonusTask=t;
  toast('今天的小任务：'+t.label+'（'+areaById(t.area).name+'）');
 }catch(e){/* 离线：没有动态任务，不挡玩 */}
}

/* ---------- 一天结束与结局（晚饭总结先写手写版，大模型到了再补一句） ---------- */
function endDay(){
 if(dialogueOpen)return;
 var done=0,total=dayTasks().length;
 dayTasks().forEach(function(t){if(taskDone(t.id))done++;});
 var missed=dayTasks().filter(function(t){return !taskDone(t.id);}).map(function(t){return t.label;});
 var body='今天完成了'+done+'/'+total+'件事。\n';
 if(missed.length)body+='没来得及的：'+missed.join('、')+'——没关系，错过也是春天的一部分。\n';
 body+='丹丹信任♥'+S.trust+'，记忆碎片'+S.fragments.length+'个，菜谱'+S.recipes.length+'道。\n';
 if(S.plantSim.stage>0&&S.plantSim.stage<4)body+='向日葵又长高了一点。\n';
 if(S.plantSim.stage>=4)body+='向日葵开着花，院子金灿灿的。\n';
 $('dinner-title').textContent=DAYS[S.day-1].title+'·晚饭';
 $('dinner-body').textContent=body+'一家人围着小桌吃饭，丹丹趴在桌子底下，尾巴一下一下地扫着地面。';
 $('dinner').hidden=false;dialogueOpen=true;
 /* 后台问大模型要一句晚饭总结，到了就补上，没到也不等 */
 fetch('/api/summary',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:'dinner',state:compactState(),actionsToday:S.actionsToday.slice()})})
  .then(function(r){return r.json();}).then(function(d){
   if(d&&d.text&&!$('dinner').hidden){
    $('dinner-body').textContent+='\n奶奶说：'+d.text;
   }
  }).catch(function(){});
 $('dinner-next').onclick=function(){
  $('dinner').hidden=true;dialogueOpen=false;
  growPlantOvernight();
  if(S.day>=7){showEnding();}
  else{S.day++;S.ap=6;S.apUsed=0;S.actionsToday=[];S.chatToday=0;S.fedToday=false;S.hideSeek={active:false,hiddenArea:null,guesses:0,found:false,doneToday:false};startDay();}
 };
}
function startDay(){
 player.x=480;player.y=420;dog.x=520;dog.y=450;
 renderTasks();save();
 requestSideTask();
 say(DAYS[S.day-1].title,[DAYS[S.day-1].intro+'\n今天有'+S.ap+'点时光，做一件正事花1点，点数用完就吃晚饭。']);
}
function showEnding(){
 S.finished=true;save();
 var n=S.fragments.length;
 var head=n>=6?'春天圆满收尾':(n>=3?'春天暖暖收尾':'春天轻轻收尾');
 var body='';
 if(n>=6)body='你收集了'+n+'个记忆碎片：弹珠、铁盒子、旧照片……院子的往事，几乎都被你和丹丹找回来了。\n';
 else if(n>=3)body='你收集了'+n+'个记忆碎片，还有一些秘密留在墙角和炕头底下，等着下一个春天。\n';
 else body='你收集了'+n+'个记忆碎片。这个春天过得慢悠悠的，没找到的秘密，就留给下一次来院子的时候。\n';
 body+='石榴花开了，向日葵朝着太阳，丹丹趴在门槛上打盹。\n奶奶说：明年春天还来啊，院子等你们。\n\n';
 body+='记忆碎片'+n+'/8，菜谱'+S.recipes.length+'/2，相册'+S.photos.length+'张，丹丹信任♥'+S.trust+'。\n';
 body+='没有坏结局——有人陪着过完的每一天，都算赢。';
 $('ending-title').textContent=head;
 $('ending-body').textContent=body;
 $('ending').hidden=false;dialogueOpen=true;
 fetch('/api/summary',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:'letter',state:compactState(),actionsToday:S.actionsToday.slice()})})
  .then(function(r){return r.json();}).then(function(d){
   if(d&&d.text&&!$('ending').hidden){$('ending-body').textContent+='\n\n奶奶的信：'+d.text;}
  }).catch(function(){});
}
$('ending-restart').addEventListener('click',function(){
 $('ending').hidden=true;dialogueOpen=false;
 S=freshState(S.girlName);S.lowQ=$('set-lowq').checked;S.fps30=$('set-fps30').checked;
 player.x=480;player.y=420;dog.x=520;dog.y=450;
 showGame();startDay();
});
$('btn-dinner').addEventListener('click',endDay);

/* ---------- 渲染：画出来的小人/狗/猫 + 时段光线 + 天气 ---------- */
function shadow(x,y,rx){if(S.lowQ)return;ctx.fillStyle='rgba(60,40,20,.18)';ctx.beginPath();ctx.ellipse(x,y+16,rx,5,0,0,7);ctx.fill();}
function drawGirl(p){
 var bob=p.moving?Math.sin(p.walk)*2:Math.sin(Date.now()/600)*1;
 var leg=p.moving?Math.sin(p.walk)*5:0;
 shadow(p.x,p.y,14);
 ctx.strokeStyle='#5a2c1e';ctx.lineWidth=4;
 ctx.beginPath();ctx.moveTo(p.x-4,p.y+10);ctx.lineTo(p.x-4+leg,p.y+20);ctx.stroke();
 ctx.beginPath();ctx.moveTo(p.x+4,p.y+10);ctx.lineTo(p.x+4-leg,p.y+20);ctx.stroke();
 ctx.fillStyle='#a33b2a';
 ctx.beginPath();ctx.moveTo(p.x-11,p.y+12);ctx.lineTo(p.x+11,p.y+12);ctx.lineTo(p.x+7,p.y-6);ctx.lineTo(p.x-7,p.y-6);ctx.closePath();ctx.fill();
 ctx.fillStyle='#e8b98a';ctx.beginPath();ctx.arc(p.x,p.y-12+bob,8,0,7);ctx.fill();
 ctx.fillStyle='#3a2c1e';
 ctx.beginPath();ctx.arc(p.x-7,p.y-19+bob,4.5,0,7);ctx.fill();
 ctx.beginPath();ctx.arc(p.x+7,p.y-19+bob,4.5,0,7);ctx.fill();
 ctx.fillStyle='#a33b2a';ctx.beginPath();ctx.arc(p.x,p.y-20+bob,3,0,7);ctx.fill();
 ctx.fillStyle='#3a2c1e';ctx.beginPath();ctx.arc(p.x-3,p.y-12+bob,1.2,0,7);ctx.fill();ctx.beginPath();ctx.arc(p.x+3,p.y-12+bob,1.2,0,7);ctx.fill();
 ctx.fillStyle='#5a4632';ctx.font='12px sans-serif';ctx.fillText(girl(),p.x-14,p.y-26+bob);
}
function drawGrandma(){
 var stir=grandma.cookAnim>0?Math.sin(Date.now()/80)*4:0;
 shadow(grandma.x,grandma.y,14);
 ctx.fillStyle='#8a7a99';ctx.fillRect(grandma.x-11,grandma.y-4,22,24);
 ctx.fillStyle='#f3e7cf';ctx.fillRect(grandma.x-8,grandma.y+2,16,16);
 ctx.fillStyle='#e8e0d0';ctx.beginPath();ctx.arc(grandma.x,grandma.y-10,9,0,7);ctx.fill();
 ctx.fillStyle='#6a5a7a';ctx.beginPath();ctx.arc(grandma.x,grandma.y-18,4,0,7);ctx.fill();
 ctx.strokeStyle='#8a7a99';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(grandma.x+10,grandma.y+2);ctx.lineTo(grandma.x+16,grandma.y+10+stir);ctx.stroke();
 ctx.fillStyle='#5a4632';ctx.font='12px sans-serif';ctx.fillText('奶奶',grandma.x-12,grandma.y-24);
}
function drawDog(p){
 var wag=Math.sin(Date.now()/120)*6;
 var bob=p.moving?Math.sin(p.walk)*2:0;
 var headY=p.y-6+(dog.sniff>0?6:0)+bob;
 shadow(p.x,p.y,15);
 /* 短腿 */
 ctx.strokeStyle='#8a6a45';ctx.lineWidth=3;
 var leg=p.moving?Math.sin(p.walk)*4:0;
 ctx.beginPath();ctx.moveTo(p.x-8,p.y+4);ctx.lineTo(p.x-8+leg,p.y+12);ctx.stroke();
 ctx.beginPath();ctx.moveTo(p.x+8,p.y+4);ctx.lineTo(p.x+8-leg,p.y+12);ctx.stroke();
 /* 身子 + 狮子鬃 */
 ctx.fillStyle='#c89a5a';ctx.beginPath();ctx.ellipse(p.x,p.y,16,10,0,0,7);ctx.fill();
 ctx.fillStyle='#a87a3a';ctx.beginPath();ctx.arc(p.x+10,p.y-4,10,0,7);ctx.fill();
 ctx.fillStyle='#c89a5a';ctx.beginPath();ctx.arc(p.x+14,p.y-6,8,0,7);ctx.fill();
 /* 扁脸 + 耳朵 */
 ctx.fillStyle='#8a6a45';ctx.beginPath();ctx.arc(p.x+8,p.y-13,3.5,0,7);ctx.fill();
 ctx.beginPath();ctx.arc(p.x+19,p.y-13,3.5,0,7);ctx.fill();
 ctx.fillStyle='#3a2c1e';ctx.beginPath();ctx.arc(p.x+18,p.y-7,1.5,0,7);ctx.fill();
 ctx.fillStyle='#e8b98a';ctx.beginPath();ctx.arc(p.x+21,p.y-4,3,0,7);ctx.fill();
 /* 摇尾巴 */
 ctx.strokeStyle='#a87a3a';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(p.x-15,p.y-6);ctx.quadraticCurveTo(p.x-22,p.y-12+wag,p.x-20,p.y-18+wag);ctx.stroke();
 if(p.dig>0){ctx.fillStyle='#c9b183';for(var i=0;i<5;i++){ctx.beginPath();ctx.arc(p.x+14+Math.random()*10,p.y+10+Math.random()*6,2,0,7);ctx.fill();}}
 if(S.carrying){ctx.fillStyle='#a33b2a';ctx.font='12px sans-serif';ctx.fillText('叼着东西',p.x-18,p.y-24);}
 ctx.fillStyle='#5a4632';ctx.font='12px sans-serif';ctx.fillText('丹丹',p.x-12,p.y+26);
}
function drawCat(){
 shadow(cat.x,cat.y,13);
 ctx.fillStyle='#e8912a';ctx.beginPath();ctx.ellipse(cat.x,cat.y,16,10,0,0,7);ctx.fill();
 ctx.beginPath();ctx.arc(cat.x+12,cat.y-8,8,0,7);ctx.fill();
 ctx.beginPath();ctx.moveTo(cat.x+6,cat.y-14);ctx.lineTo(cat.x+8,cat.y-20);ctx.lineTo(cat.x+11,cat.y-14);ctx.fill();
 ctx.strokeStyle='#e8912a';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(cat.x-15,cat.y);ctx.quadraticCurveTo(cat.x-24,cat.y-8,cat.x-20,cat.y-16);ctx.stroke();
}
function draw(){
 ctx.clearRect(0,0,W,H);
 ctx.fillStyle='#e8d5a8';ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='rgba(150,110,60,.25)';ctx.lineWidth=1;
 for(var gy=60;gy<H;gy+=40){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}
 for(var gx=0;gx<W;gx+=60){ctx.beginPath();ctx.moveTo(gx,40);ctx.lineTo(gx,650);ctx.stroke();}
 ctx.fillStyle='#d9c49a';ctx.fillRect(0,668,W,H-668);
 ctx.fillStyle='#c9b183';ctx.fillRect(0,668,W,6);
 ctx.fillStyle='#8a6a45';ctx.font='16px sans-serif';ctx.fillText('半条胡同',20,700);
 ctx.fillStyle='#a33b2a';ctx.fillText('豆浆油条',620,700);
 ctx.fillStyle='#b98a5a';ctx.fillRect(0,34,W,14);ctx.fillRect(0,34,14,634);ctx.fillRect(W-14,34,14,634);
 ctx.fillRect(0,648,430,14);ctx.fillRect(530,648,430,14);
 ctx.fillStyle='#c96f4a';ctx.fillRect(380,46,220,96);
 ctx.fillStyle='#8a3b2a';ctx.fillRect(370,36,240,16);
 ctx.fillStyle='#f3e7cf';ctx.fillRect(470,80,40,62);
 ctx.fillStyle='#5a4632';ctx.font='15px sans-serif';ctx.fillText('正房·炕头',440,66);
 ctx.fillStyle='#b56a3a';ctx.fillRect(44,236,150,110);
 ctx.fillStyle='#5a4632';ctx.font='15px sans-serif';ctx.fillText('厨房·灶台',70,230);
 ctx.fillStyle='#3a2c1e';ctx.fillRect(70,280,60,30);
 if(!S.lowQ){ctx.fillStyle='#e8912a';ctx.beginPath();ctx.arc(100,278,10+Math.random()*3,0,7);ctx.fill();}
 ctx.fillStyle='#7a4a2a';ctx.fillRect(242,180,16,60);
 ctx.fillStyle=S.day>=7?'#e8a0a8':'#5a8a3a';
 ctx.beginPath();ctx.arc(250,150,52,0,7);ctx.fill();
 ctx.beginPath();ctx.arc(210,170,34,0,7);ctx.fill();
 ctx.beginPath();ctx.arc(292,170,34,0,7);ctx.fill();
 if(S.day>=7){ctx.fillStyle='#f3d0d8';for(var pf=0;pf<8;pf++){ctx.beginPath();ctx.arc(210+pf*11,120+(pf%3)*8,4,0,7);ctx.fill();}}
 ctx.fillStyle='#8a6a45';ctx.fillRect(80,440,190,90);
 ctx.fillStyle='#6a4a2a';ctx.fillRect(88,448,174,74);
 var ps=S.plantSim;
 if(ps.stage===0){ctx.fillStyle='#d8b98a';ctx.font='14px sans-serif';ctx.fillText('空花坛',150,490);}
 else{
  var ph=[0,14,30,52,64][ps.stage]||10;
  ctx.strokeStyle='#4a7a2a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(175,520);ctx.lineTo(175,520-ph);ctx.stroke();
  if(ps.stage>=4){ctx.fillStyle='#f2c230';ctx.beginPath();ctx.arc(175,520-ph,16,0,7);ctx.fill();ctx.fillStyle='#8a5a10';ctx.beginPath();ctx.arc(175,520-ph,7,0,7);ctx.fill();}
  else{ctx.fillStyle='#5a8a3a';ctx.beginPath();ctx.arc(175,520-ph,10,0,7);ctx.fill();}
  if(ps.weeds>0){ctx.strokeStyle='#7a9a4a';ctx.lineWidth=2;for(var w=0;w<ps.weeds;w++){ctx.beginPath();ctx.moveTo(110+w*40,520);ctx.lineTo(114+w*40,505);ctx.stroke();}}
  ctx.fillStyle='#5a4632';ctx.font='14px sans-serif';ctx.fillText('向日葵'+(ps.weeds>0?'·有草':''),140,545);
 }
 ctx.fillStyle='#7a8a99';ctx.beginPath();ctx.arc(835,470,26,0,7);ctx.fill();
 ctx.fillStyle='#a8c8d8';ctx.beginPath();ctx.arc(835,470,19,0,7);ctx.fill();
 ctx.fillStyle='#8a6a45';ctx.fillRect(880,500,60,60);
 ctx.fillStyle='#5a4632';ctx.font='14px sans-serif';ctx.fillText('墙角洞',884,532);
 ctx.fillStyle='#8a3b2a';ctx.fillRect(430,640,100,20);
 ctx.fillStyle='#f3e7cf';ctx.font='14px sans-serif';ctx.fillText('院门',468,636);
 ctx.fillStyle='#a33b2a';ctx.fillRect(660,70,240,60);
 ctx.fillStyle='#5a4632';ctx.font='15px sans-serif';ctx.fillText('屋顶',770,60);
 ctx.strokeStyle='#5a4632';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(660,180);ctx.lineTo(920,180);ctx.stroke();
 ctx.fillStyle='#f3e7cf';ctx.fillRect(700,180,34,44);
 ctx.fillStyle='#a8c8d8';ctx.fillRect(760,180,34,44);
 if(S.day>=3){ctx.fillStyle='#e8d5a8';ctx.fillRect(820,180,40,50);}
 ctx.font='13px sans-serif';ctx.fillStyle='rgba(58,44,30,.75)';
 AREAS.forEach(function(a){ctx.fillText(a.name,a.x-30,a.y+a.r+16);});
 if(S.day>=5)drawCat();
 drawGrandma();
 drawDog(dog);
 drawGirl(player);
 /* 气味轨迹：实时衰减的金色点 */
 var now=Date.now();
 smellTrail.forEach(function(t){
  t.pts.forEach(function(pt){
   var left=pt.until-now;if(left<=0)return;
   ctx.fillStyle='rgba(242,194,48,'+(left/8000)+')';
   ctx.beginPath();ctx.arc(pt.x,pt.y,5,0,7);ctx.fill();
  });
  ctx.fillStyle='#5a4632';ctx.font='13px sans-serif';ctx.fillText(t.spot.name,t.spot.x-40,t.spot.y-14);
 });
 if(S.mode==='dog'){
  ctx.fillStyle='rgba(140,150,160,.16)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(58,44,30,.85)';ctx.font='14px sans-serif';
  ctx.fillText('丹丹视角：世界变大了，气味看得见',16,58);
 }
 /* 天气粒子 */
 if(!S.lowQ){
  var w=weatherToday().n;
  if(w==='花瓣雨'||S.day>=7){
   if(petals.length<14&&Math.random()<0.1)petals.push({x:Math.random()*W,y:-10,v:20+Math.random()*20});
   ctx.fillStyle='rgba(243,208,216,.9)';
   petals.forEach(function(p){p.y+=p.v*0.016;p.x+=Math.sin(p.y/30)*0.6;ctx.beginPath();ctx.arc(p.x,p.y,3,0,7);ctx.fill();});
   petals=petals.filter(function(p){return p.y<H;});
  }
  if(w==='小雨'){
   if(rain.length<30&&Math.random()<0.3)rain.push({x:Math.random()*W,y:-10,v:300+Math.random()*100});
   ctx.strokeStyle='rgba(120,150,180,.6)';ctx.lineWidth=1;
   rain.forEach(function(p){p.y+=p.v*0.016;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-4,p.y+12);ctx.stroke();});
   rain=rain.filter(function(p){return p.y<H;});
  }
  if(w==='微风'){
   ctx.fillStyle='rgba(122,154,74,.7)';
   for(var lf=0;lf<5;lf++){var lx=(Date.now()/40+lf*180)%W;ctx.beginPath();ctx.arc(lx,120+lf*40,3,0,7);ctx.fill();}
  }
 }
 /* 时段光线 */
 var part=dayPart(),ov=null;
 if(part==='清晨')ov='rgba(255,220,150,.08)';
 else if(part==='午后')ov='rgba(255,180,90,.10)';
 else if(part==='傍晚')ov='rgba(255,120,60,.18)';
 else if(part==='夜晚')ov='rgba(20,20,60,.35)';
 else if(weatherToday().n==='多云')ov='rgba(120,120,120,.10)';
 if(ov){ctx.fillStyle=ov;ctx.fillRect(0,0,W,H);}
 var ap=activePos();
 ctx.strokeStyle='#a33b2a';ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(ap.x,ap.y,22,0,7);ctx.stroke();
}

function loop(t){
 rafId=requestAnimationFrame(loop);
 if(!running||paused||dialogueOpen||document.hidden)return;
 if(S.fps30&&t-lastT<33)return;
 var dt=Math.min(0.05,(t-lastT)/1000||0.016);
 lastT=t;
 update(dt);draw();
}
function setPaused(v){paused=v;}

function switchMode(){
 S.mode=S.mode==='girl'?'dog':'girl';
 $('btn-switch').textContent=S.mode==='dog'?'切换：丹丹':'切换：小女孩';
 $('btn-switch2').textContent=S.mode==='dog'?'切换：丹丹':'切换：小女孩';
 $('dog-actions').hidden=S.mode!=='dog';
 if(S.mode==='dog')barkSound();
 toast(S.mode==='dog'?'你变成了丹丹。按闻、听、钻、叼，用狗的办法看院子。':'你变回了'+girl()+'。');
 save();
}

window.addEventListener('keydown',function(e){
 var k=e.key.toLowerCase();
 keys[k]=true;
 if(['arrowup','arrowdown','arrowleft','arrowright',' '].indexOf(k)>=0)e.preventDefault();
 if(k==='e'&&!dialogueOpen)interact();
 if(k==='q'&&!dialogueOpen)switchMode();
 if(k==='z')dogAction('smell');
 if(k==='x')dogAction('hear');
 if(k==='c')dogAction('drill');
 if(k==='v')dogAction('carry');
});
window.addEventListener('keyup',function(e){keys[e.key.toLowerCase()]=false;});
cv.addEventListener('click',function(e){
 if(dialogueOpen)return;
 var r=cv.getBoundingClientRect();
 var wx=(e.clientX-r.left)*W/r.width,wy=(e.clientY-r.top)*H/r.height;
 var best=null,bd=1e9;
 AREAS.forEach(function(a){var d=Math.sqrt((a.x-wx)*(a.x-wx)+(a.y-wy)*(a.y-wy));if(d<bd){bd=d;best=a;}});
 if(best&&bd<110)goToArea(best.id);
 else{autoPath=findPath(activePos(),{x:wx,y:wy});autoTarget={x:wx,y:wy};pendingInteract=null;}
});
document.querySelectorAll('#dpad button').forEach(function(b){
 var dir=b.getAttribute('data-dir');
 var map={up:'arrowup',down:'arrowdown',left:'arrowleft',right:'arrowright'};
 b.addEventListener('pointerdown',function(){keys[map[dir]]=true;});
 ['pointerup','pointerleave','pointercancel'].forEach(function(ev){b.addEventListener(ev,function(){keys[map[dir]]=false;});});
});
$('btn-act').addEventListener('click',interact);
$('btn-switch').addEventListener('click',switchMode);
$('btn-switch2').addEventListener('click',switchMode);
$('btn-sound').addEventListener('click',function(){
 S.soundOn=!S.soundOn;if(!S.soundOn)stopBGM();else startBGM();
 updateHUD();save();
});
document.querySelectorAll('#dog-actions button').forEach(function(b){
 b.addEventListener('click',function(){dogAction(b.getAttribute('data-dog'));});
});
document.addEventListener('visibilitychange',function(){setPaused(document.hidden);if(document.hidden)stopBGM();else if(S&&S.soundOn)startBGM();});

function syncPerfUI(){
 $('opt-lowq').checked=S.lowQ;$('opt-fps30').checked=S.fps30;
 $('set-lowq').checked=S.lowQ;$('set-fps30').checked=S.fps30;
}
function applyPerfFromUI(){
 S.lowQ=$('set-lowq').checked;S.fps30=$('set-fps30').checked;
 $('opt-lowq').checked=S.lowQ;$('opt-fps30').checked=S.fps30;save();
}
['opt-lowq','opt-fps30'].forEach(function(id){
 $(id).addEventListener('change',function(){
  if(!S)S=freshState('');
  S.lowQ=$('opt-lowq').checked;S.fps30=$('opt-fps30').checked;
  $('set-lowq').checked=S.lowQ;$('set-fps30').checked=S.fps30;
 });
});
['set-lowq','set-fps30'].forEach(function(id){$(id).addEventListener('change',applyPerfFromUI);});
function showGame(){
 $('start-screen').hidden=true;$('game-screen').hidden=false;
 renderAreas();renderTasks();syncPerfUI();
 $('dog-actions').hidden=S.mode!=='dog';
 $('btn-switch').textContent=S.mode==='dog'?'切换：丹丹':'切换：小女孩';
 if(!running){running=true;lastT=performance.now();rafId=requestAnimationFrame(loop);}
 startBGM();
 draw();
}
$('btn-start').addEventListener('click',function(){
 var name=$('girl-name').value.trim();
 S=freshState(name);
 S.lowQ=$('opt-lowq').checked;S.fps30=$('opt-fps30').checked;
 player.x=480;player.y=420;dog.x=520;dog.y=450;
 showGame();startDay();save();
});
$('btn-continue').addEventListener('click',function(){
 var sv=load();if(!sv)return;
 S=sv;player.x=480;player.y=420;dog.x=520;dog.y=450;
 showGame();
 say(DAYS[S.day-1].title,['回来了，'+girl()+'。'+DAYS[S.day-1].intro]);
});
$('btn-save').addEventListener('click',function(){save();toast('已保存到这台设备，下次可以继续。');});
$('btn-settings').addEventListener('click',function(){$('settings-panel').hidden=false;});
$('btn-close-settings').addEventListener('click',function(){$('settings-panel').hidden=true;});
$('btn-restart').addEventListener('click',function(){
 if(!confirm('重新开始会清空当前存档，确定吗？'))return;
 localStorage.removeItem(SAVE_KEY);localStorage.removeItem(SAVE_KEY_V1);
 S=freshState($('girl-name').value.trim());
 S.lowQ=$('set-lowq').checked;S.fps30=$('set-fps30').checked;
 $('settings-panel').hidden=true;player.x=480;player.y=420;dog.x=520;dog.y=450;
 renderTasks();startDay();save();
});
$('btn-album').addEventListener('click',function(){
 $('collect-title').textContent='相册·记忆碎片';
 var body='记忆碎片（'+S.fragments.length+'/8）：\n'+(S.fragments.length?S.fragments.map(function(f){return '· '+FRAGMENTS[f];}).join('\n'):'还没有，换成丹丹闻一闻墙角。');
 body+='\n\n照片（'+S.photos.length+'张）：\n'+(S.photos.length?S.photos.map(function(p){return '· '+p;}).join('\n'):'还没有。');
 body+='\n\n丹丹信任♥'+S.trust+'，奶奶心情'+S.grandmaMood+'。';
 $('collect-body').textContent=body;
 $('collect').hidden=false;dialogueOpen=true;
});
$('btn-recipes').addEventListener('click',function(){
 $('collect-title').textContent='菜谱';
 var body='已学会（'+S.recipes.length+'/2）：\n'+(S.recipes.length?S.recipes.map(function(r){return '· '+RECIPES[r].name+'：'+RECIPES[r].steps.join('→');}).join('\n'):'还没有。去厨房跟奶奶做一道菜吧。');
 $('collect-body').textContent=body;
 $('collect').hidden=false;dialogueOpen=true;
});
$('collect-close').addEventListener('click',function(){$('collect').hidden=true;dialogueOpen=false;});

(function init(){
 var sv=load();
 if(sv)$('btn-continue').disabled=false;
 S=freshState('');
})();

window.__dandan={
 state:function(){return S;},
 player:function(){return activePos();},
 dog:function(){return dog;},
 goToArea:goToArea,interactArea:interactArea,interact:interact,
 dogAction:dogAction,switchMode:switchMode,endDay:endDay,startDay:startDay,
 say:say,save:save,warp:function(x,y){var p=activePos();p.x=x;p.y=y;},
 warpDog:function(x,y){dog.x=x;dog.y=y;},
 closeDialogue:function(){if(dialogueOpen)showDlgLine();},
 cookForceHit:cookForceHit,
 cookState:function(){return cookState;},
 startHideSeek:startHideSeek,guessHideSeek:guessHideSeek,
 smellTrail:function(){return smellTrail;},
 plantState:function(){return S.plantSim;},
 actionPoints:function(){return S.ap;},
 chatOffline:chatOfflineLine,
 findPath:findPath,
 openChat:openChat,sendChat:sendChat,
 requestSideTask:requestSideTask
};
