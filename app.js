'use strict';
/* 丹丹的院子·春天7天小样：单canvas、零外部资源、localStorage存档 */
var SAVE_KEY='dandan_save_v1';
var cv=document.getElementById('cv'),ctx=cv.getContext('2d');
var W=960,H=760;

/* 8个地点 */
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
/* 障碍：矩形房子/厨房、圆形树干/水缸 */
var OBSTACLES=[
 {x:380,y:46,w:220,h:96},{x:44,y:236,w:150,h:110},
 {x:660,y:70,w:240,h:60}
];
var CIRCLES=[{x:250,y:180,r:16},{x:835,y:470,r:26},{x:120,y:480,r:14}];

var RECIPES={
 tomato:{name:'西红柿炒鸡蛋',steps:['打鸡蛋','切西红柿','热锅倒油','下锅翻炒','加盐出锅']},
 cucumber:{name:'凉拌黄瓜',steps:['拍黄瓜','放蒜末','倒香醋','淋香油','拌匀装盘']}
};
/* 每天2-3个任务 */
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

var S=null; /* 存档状态 */
function freshState(name){
 return {girlName:name||'小女孩',day:1,mode:'girl',trust:0,
  tasksDone:{},fragments:[],recipes:[],photos:[],
  plant:0,wateredDays:0,carrying:null,revealed:{},fedToday:false,
  lowQ:false,fps30:false,finished:false};
}
function dayTasks(){return DAYS[S.day-1].tasks;}
function taskDone(id){return !!(S.tasksDone[S.day]&&S.tasksDone[S.day][id]);}
function completeTask(id){
 if(!S.tasksDone[S.day])S.tasksDone[S.day]={};
 if(S.tasksDone[S.day][id])return;
 S.tasksDone[S.day][id]=true;
 addTrust(0);renderTasks();save();
}
function addFragment(key){
 if(S.fragments.indexOf(key)<0){S.fragments.push(key);toast('收集到记忆碎片：'+FRAGMENTS[key]);save();}
}
function addPhoto(name){
 if(S.photos.indexOf(name)<0){S.photos.push(name);toast('相册多了一张：'+name);save();}
}
function addTrust(n){S.trust=Math.max(0,S.trust+n);var el=document.getElementById('hud-trust');if(el)el.textContent='丹丹信任♥'+S.trust;}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch(e){}}
function load(){try{var r=localStorage.getItem(SAVE_KEY);return r?JSON.parse(r):null;}catch(e){return null;}}

/* 玩家与NPC位置 */
var player={x:480,y:420,vx:0,vy:0};
var dog={x:520,y:450};
var grandma={x:210,y:330};
var cat={x:700,y:700};
var autoTarget=null,pendingInteract=null;
var keys={},smellUntil=0,smellTrail=[];
var running=false,rafId=null,lastT=0,paused=false,dialogueOpen=false;

function $(id){return document.getElementById(id);}
function toast(msg){var t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(t._tm);t._tm=setTimeout(function(){t.hidden=true;},3600);}
function girl(){return S.girlName||'小女孩';}

/* 对话：打开时暂停渲染 */
var dlgQueue=[],dlgCb=null;
function say(speaker,lines,cb){
 dlgQueue=lines.slice();dlgCb=cb||null;
 $('dlg-speaker').textContent=speaker;
 showDlgLine();
}
function showDlgLine(){
 if(!dlgQueue.length){$('dialogue').hidden=true;dialogueOpen=false;var cb=dlgCb;dlgCb=null;if(cb)cb();return;}
 $('dlg-text').textContent=dlgQueue.shift();
 $('dialogue').hidden=false;dialogueOpen=true;
}
$('dlg-next').addEventListener('click',showDlgLine);

/* 渲染任务列表与地点按钮 */
function renderTasks(){
 var ul=$('task-list');ul.innerHTML='';
 dayTasks().forEach(function(t){
  var li=document.createElement('li');
  li.textContent=(taskDone(t.id)?'✓ ':'○ ')+t.label;
  if(taskDone(t.id))li.className='done';
  ul.appendChild(li);
 });
 $('hud-day').textContent=DAYS[S.day-1].title;
 addTrust(0);
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
 autoTarget={x:ap.x,y:ap.y};pendingInteract=id;
}

/* ---------- 移动与碰撞 ---------- */
function clampPos(p){
 p.x=Math.max(28,Math.min(W-28,p.x));
 p.y=Math.max(52,Math.min(H-28,p.y));
 if(p.y>648&&p.y<668&&(p.x<430||p.x>530)){ /* 院墙：只留院门 */
  p.y=p.y<658?648:668;
 }
 OBSTACLES.forEach(function(o){
  if(p.x>o.x-12&&p.x<o.x+o.w+12&&p.y>o.y-12&&p.y<o.y+o.h+12){
   var dxl=p.x-(o.x-12),dxr=(o.x+o.w+12)-p.x,dyt=p.y-(o.y-12),dyb=(o.y+o.h+12)-p.y;
   var m=Math.min(dxl,dxr,dyt,dyb);
   if(m===dxl)p.x=o.x-12;else if(m===dxr)p.x=o.x+o.w+12;
   else if(m===dyt)p.y=o.y-12;else p.y=o.y+o.h+12;
  }
 });
 CIRCLES.forEach(function(c){
  var dx=p.x-c.x,dy=p.y-c.y,d=Math.sqrt(dx*dx+dy*dy),min=c.r+12;
  if(d<min&&d>0){p.x=c.x+dx/d*min;p.y=c.y+dy/d*min;}
 });
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
  p.x+=dx/l*sp*dt;p.y+=dy/l*sp*dt;autoTarget=null;pendingInteract=null;
 }else if(autoTarget){
  /* 离目标地点中心够近（可互动半径内）就直接互动，避免被障碍卡住 */
  if(pendingInteract){
   var pa=areaById(pendingInteract);
   if(pa&&Math.sqrt((pa.x-p.x)*(pa.x-p.x)+(pa.y-p.y)*(pa.y-p.y))<120){
    autoTarget=null;var pid=pendingInteract;pendingInteract=null;interactArea(pid);
    clampPos(p);return;
   }
  }
  var tx=autoTarget.x-p.x,ty=autoTarget.y-p.y,td=Math.sqrt(tx*tx+ty*ty);
  if(td<14){autoTarget=null;if(pendingInteract){var id=pendingInteract;pendingInteract=null;interactArea(id);}}
  else{p.x+=tx/td*sp*dt;p.y+=ty/td*sp*dt;}
 }
 clampPos(p);
 /* 另一角色跟随 */
 var other=S.mode==='dog'?player:dog;
 var ox=other.x-p.x,oy=other.y-p.y,od=Math.sqrt(ox*ox+oy*oy);
 if(od>80){other.x+=ox/od*120*dt;other.y+=oy/od*120*dt;clampPos(other);}
 /* 奶奶白天在厨房附近，晚上回正房 */
 grandma.x=210;grandma.y=330;
}
function dist(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}
function nearestArea(p){
 var best=null,bd=1e9;
 AREAS.forEach(function(a){var d=Math.sqrt((a.x-p.x)*(a.x-p.x)+(a.y-p.y)*(a.y-p.y));if(d<bd){bd=d;best=a;}});
 return bd<130?best:null;
}
function interact(){
 if(dialogueOpen)return;
 var p=activePos();
 /* 当天未完成的任务优先：在附近所有地点里找，先做事，再聊天 */
 var bestTask=null,bestD=1e9;
 AREAS.forEach(function(a){
  var d=Math.sqrt((a.x-p.x)*(a.x-p.x)+(a.y-p.y)*(a.y-p.y));
  if(d<130&&d<bestD&&dayTasks().some(function(t){return t.area===a.id&&!taskDone(t.id);})){bestTask=a;bestD=d;}
 });
 if(bestTask){interactArea(bestTask.id);return;}
 /* 先看是不是在跟奶奶/丹丹身边 */
 if(dist(p,grandma)<70){talkGrandma();return;}
 var other=S.mode==='dog'?player:dog;
 if(dist(p,other)<70){talkDog();return;}
 if(S.day>=5&&dist(p,cat)<70){talkCat();return;}
 var a=nearestArea(p);
 if(a)interactArea(a.id);
 else toast('这里没什么可做的，往有名字的地方走走。');
}
function talkDog(){
 if(S.mode==='dog'){say('丹丹',['汪！（丹丹摇着尾巴，绕着你转了一圈。）'],null);return;}
 addTrust(1);
 if(S.day===3&&!taskDone('feed')){
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
  completeTask('meet_grandma');
  say('奶奶',['哎哟，'+g+'来啦。快进来，炕都给你烧热了。','丹丹，过来闻闻，这是咱们家的新孩子。以后啊，你们俩就是一个院子的人了。']);
 }else if(S.day===4&&taskDone('capsule')&&!taskDone('story')){
  completeTask('story');addFragment('story');
  say('奶奶',['这个铁盒子啊……是你爷爷年轻时埋的。','那年下了一场大雨，他说，要把最想留住的日子埋进墙角，等老了再挖出来慢慢看。','没想到，是丹丹先替我们把它找回来了。']);
 }else if(S.day===6&&!taskDone('comfort')){
  completeTask('comfort');
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

/* ---------- 丹丹的四种能力 ---------- */
function dogAction(kind){
 if(S.mode!=='dog'){toast('先切换成丹丹再用这个本事。');return;}
 var p=dog;
 if(kind==='smell'){
  smellUntil=Date.now()+6000;
  smellTrail=hiddenSpots().map(function(s){return s;});
  var spots=hiddenSpots();
  if(spots.length)toast('丹丹抽了抽鼻子：金色气味指向'+spots[0].name+'，快跟过去看看！');
  else toast('丹丹闻了闻：院子里没有新的旧气味了，只有饭香和花香。');
 }else if(kind==='hear'){
  var hints=[];
  if(S.day===4&&!taskDone('capsule'))hints.push('墙角那边有很轻很轻的动静，像铁盒子在土里叹气');
  else if(S.day===6&&!taskDone('glasses'))hints.push('炕头那边传来很轻的叮当声，像有什么小东西掉在了砖缝里');
  else if(S.day===2&&!taskDone('marble'))hints.push('花坛那边有丹丹埋东西时留下的气味');
  else hints.push('胡同口有脚步声，邻居在聊天，橘猫在打哈欠');
  say('丹丹的耳朵',['丹丹竖起耳朵，头微微一歪。','它听见：'+hints[0]+'。']);
 }else if(kind==='drill'){
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
  if(spot.id==='marble'){completeTask('marble');addFragment('marble');addPhoto('丹丹挖弹珠');addTrust(2);
   say('丹丹',['丹丹前爪飞快地刨土，土里滚出一颗亮晶晶的旧弹珠。','弹珠上还沾着十年前的阳光。丹丹得意地抬起头：看，我藏的宝贝！']);}
  else if(spot.id==='capsule'){completeTask('capsule');addFragment('capsule');
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
   S.carrying=null;completeTask('glasses');addTrust(3);addFragment('photo_old');
   say('奶奶',['哎哟，我的眼镜！丹丹，你可真是咱们家的功臣。','奶奶戴上眼镜，报纸上的字一下子全清楚了，她笑着摸了摸丹丹的头。']);
  }else toast('丹丹叼着眼镜呢，带它到奶奶身边再松口。');
 }else if(S.carrying==='capsule'){
  if(dist(p,grandma)<80){S.carrying=null;say('奶奶',['你把铁盒子递给奶奶，她捧着盒子，半天没说话，只是一个劲儿地笑。']);}
  else toast('丹丹叼着铁盒子呢。');
 }else{
  var spot=nearHiddenSpot(p);
  if(spot)revealSpot(spot);
  else toast('附近没有能叼的东西。先用闻找到气味，再过来叼。');
 }
}

/* ---------- 地点互动 ---------- */
function interactArea(id){
 var g=girl();
 if(S.mode==='dog'&&id!=='jar'&&id!=='garden'&&id!=='house'){
  /* 狗在多数地方仍可互动，但提示用狗视角 */
 }
 switch(id){
  case 'tree':
   if(S.day===1&&!taskDone('meet_dog')){
    completeTask('meet_dog');addTrust(1);
    say('丹丹',['石榴树下趴着一只小小的北京犬，毛是金棕色的，脸皱皱的，表情很严肃。','它抬眼看了你一眼，又低下头，尾巴却轻轻摇了一下。','奶奶在屋里喊：它叫丹丹，别看它脸凶，心可软了。']);
   }else if(S.day===7&&!taskDone('photo')){
    completeTask('photo');addFragment('family');addPhoto('全家福');
    say(g,['石榴花开了，满树都是粉白的小花。','奶奶抱着丹丹，你站在树下，邻居帮忙按下了快门。','咔嚓——这个春天，被留住了。']);
   }else if(S.day===7){
    say('石榴树',['石榴花开得正好，风一吹，花瓣落在丹丹的头顶上，像一顶小帽子。']);
   }else{
    say('石榴树',['石榴树还只有绿叶，花苞鼓鼓的，像攥紧的小拳头。','树干上有一道浅浅的刻痕，是很多年前量身高留下的。']);
   }
   break;
  case 'house':
   if(S.day===1&&!taskDone('unpack')){
    completeTask('unpack');
    say(g,['你把衣服一件件放进柜子，把书摆上炕桌，把小熊放在枕头边。','行李箱空了，这个房间，开始有点像你的了。']);
   }else if(S.day===6&&!taskDone('glasses')&&S.mode==='dog'){
    toast('丹丹在炕头下闻到了老花镜的气味！按闻确认，再按叼取出来。');
    smellUntil=Date.now()+6000;smellTrail=hiddenSpots();
   }else if(S.day===7&&!taskDone('farewell')){
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
    completeTask('plant');S.plant=1;
    say(g,['你把向日葵种子一颗颗按进土里，盖上薄薄一层土。','奶奶说：每天浇点水，它会比你长得还快。']);
   }else if((S.day===2&&!taskDone('water'))||(S.day===4&&!taskDone('water2'))||(S.day===6&&!taskDone('water3'))){
    var tid=S.day===2?'water':(S.day===4?'water2':'water3');
    completeTask(tid);S.wateredDays++;if(S.plant<3)S.plant++;
    say(g,['水壶倾斜，水落在土里，发出很轻的沙沙声。','向日葵好像轻轻动了一下，在说：谢谢。']);
   }else if(S.day===7&&!taskDone('sunflower')){
    completeTask('sunflower');
    if(S.wateredDays>=2){S.plant=4;addFragment('sunflower');addPhoto('向日葵开花');
     say(g,['向日葵开花了！金黄的大花盘朝着太阳，像一张笑脸。','奶奶说：你种的，你浇的，这个春天，它是你的。']);}
    else{
     say(g,['向日葵长高了，花苞还没有完全打开。','它还在努力，春天也是。']);
    }
   }else if(S.day===2&&!taskDone('marble')&&S.mode==='dog'){
    var sp=nearHiddenSpot(dog)||hiddenSpots()[0];
    if(sp)revealSpot(sp);
   }else if(S.plant>0){
    say('花坛',['向日葵长得很好，叶子绿油油的。'+(S.plant>=4?'花已经开了，金灿灿的。':'再浇浇水，它还会长。')]);
   }else{
    say('花坛',['花坛里的土松松软软的，适合种点什么。','旁边放着一包向日葵种子和一把小水壶。']);
   }
   break;
  case 'jar':
   if(S.day===4&&!taskDone('capsule')&&S.mode==='dog'){
    var sp2=nearHiddenSpot(dog);
    if(sp2)revealSpot(sp2);
    else{toast('丹丹闻到了！墙角的洞里有东西，先按闻，再按钻。');smellUntil=Date.now()+6000;smellTrail=hiddenSpots();}
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
    completeTask('breakfast');addTrust(0);
    say('邻居王爷爷',['哟，新来的小姑娘吧？豆浆油条，趁热吃。','王爷爷往你手里塞了一个茶叶蛋：头一回，爷爷请你的。']);
   }else if(S.day===5&&!taskDone('cat')){
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

/* ---------- 做饭小游戏 ---------- */
var cookState=null;
function startCook(recipeId,taskId){
 var r=RECIPES[recipeId];
 cookState={recipe:recipeId,task:taskId,step:0};
 $('cook-title').textContent='跟奶奶做'+r.name;
 $('cook-hint').textContent='按正确的顺序点食材和步骤，做错一步就要从这一步重来。奶奶在旁边看着呢，别急。';
 renderCook();
 $('cook').hidden=false;dialogueOpen=true;
}
function renderCook(){
 var r=RECIPES[cookState.recipe];
 $('cook-steps').textContent='已完成：'+cookState.step+'/'+r.steps.length+'步（下一步：'+r.steps[cookState.step]+'）';
 var box=$('cook-choices');box.innerHTML='';
 var choices=r.steps.slice().sort(function(){return Math.random()-0.5;});
 choices.forEach(function(c){
  var b=document.createElement('button');
  b.textContent=c;
  b.addEventListener('click',function(){
   if(c===r.steps[cookState.step]){
    cookState.step++;
    if(cookState.step>=r.steps.length){
     $('cook').hidden=true;dialogueOpen=false;
     if(S.recipes.indexOf(cookState.recipe)<0)S.recipes.push(cookState.recipe);
     if(cookState.task)completeTask(cookState.task);
     addTrust(1);save();
     say('奶奶',['端上桌了！'+r.name+'，色香味都齐了。','奶奶夹了一筷子，点点头：嗯，有我当年的味道。','菜谱收进了你的小本子，以后想吃，随时能做。']);
    }else renderCook();
   }else{
    toast('奶奶笑着摇头：不是这一步，先'+r.steps[cookState.step]+'。');
   }
  });
  box.appendChild(b);
 });
}
$('cook-close').addEventListener('click',function(){$('cook').hidden=true;dialogueOpen=false;});

/* ---------- 一天结束与结局 ---------- */
function endDay(){
 if(dialogueOpen)return;
 var done=0,total=dayTasks().length;
 dayTasks().forEach(function(t){if(taskDone(t.id))done++;});
 var missed=dayTasks().filter(function(t){return !taskDone(t.id);}).map(function(t){return t.label;});
 var body='今天完成了'+done+'/'+total+'件事。\n';
 if(missed.length)body+='没来得及的：'+missed.join('、')+'——没关系，错过也是春天的一部分。\n';
 body+='丹丹信任♥'+S.trust+'，记忆碎片'+S.fragments.length+'个，菜谱'+S.recipes.length+'道。\n';
 if(S.plant>0&&S.plant<4)body+='向日葵又长高了一点。\n';
 if(S.plant>=4)body+='向日葵开着花，院子金灿灿的。\n';
 $('dinner-title').textContent=DAYS[S.day-1].title+'·晚饭';
 $('dinner-body').textContent=body+'一家人围着小桌吃饭，丹丹趴在桌子底下，尾巴一下一下地扫着地面。';
 $('dinner').hidden=false;dialogueOpen=true;
 $('dinner-next').onclick=function(){
  $('dinner').hidden=true;dialogueOpen=false;
  if(S.day>=7){showEnding();}
  else{S.day++;S.fedToday=false;startDay();}
 };
}
function startDay(){
 player.x=480;player.y=420;dog.x=520;dog.y=450;
 renderTasks();save();
 say(DAYS[S.day-1].title,[DAYS[S.day-1].intro+'\n今天要做的事写在右边的单子上，做完就吃晚饭。']);
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
}
$('ending-restart').addEventListener('click',function(){
 $('ending').hidden=true;dialogueOpen=false;
 S=freshState(S.girlName);S.lowQ=$('set-lowq').checked;S.fps30=$('set-fps30').checked;
 player.x=480;player.y=420;dog.x=520;dog.y=450;
 showGame();startDay();
});
$('btn-dinner').addEventListener('click',endDay);

/* ---------- 渲染 ---------- */
var petals=[];
function draw(){
 ctx.clearRect(0,0,W,H);
 /* 地面：青砖院子 */
 ctx.fillStyle='#e8d5a8';ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='rgba(150,110,60,.25)';ctx.lineWidth=1;
 for(var gy=60;gy<H;gy+=40){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}
 for(var gx=0;gx<W;gx+=60){ctx.beginPath();ctx.moveTo(gx,40);ctx.lineTo(gx,650);ctx.stroke();}
 /* 胡同地面 */
 ctx.fillStyle='#d9c49a';ctx.fillRect(0,668,W,H-668);
 ctx.fillStyle='#c9b183';ctx.fillRect(0,668,W,6);
 ctx.fillStyle='#8a6a45';ctx.font='16px sans-serif';ctx.fillText('半条胡同',20,700);
 ctx.fillStyle='#a33b2a';ctx.fillText('豆浆油条',620,700);
 /* 围墙 */
 ctx.fillStyle='#b98a5a';ctx.fillRect(0,34,W,14);ctx.fillRect(0,34,14,634);ctx.fillRect(W-14,34,14,634);
 ctx.fillRect(0,648,430,14);ctx.fillRect(530,648,430,14);
 /* 正房 */
 ctx.fillStyle='#c96f4a';ctx.fillRect(380,46,220,96);
 ctx.fillStyle='#8a3b2a';ctx.fillRect(370,36,240,16);
 ctx.fillStyle='#f3e7cf';ctx.fillRect(470,80,40,62);
 ctx.fillStyle='#5a4632';ctx.font='15px sans-serif';ctx.fillText('正房·炕头',440,66);
 /* 厨房 */
 ctx.fillStyle='#b56a3a';ctx.fillRect(44,236,150,110);
 ctx.fillStyle='#5a4632';ctx.font='15px sans-serif';ctx.fillText('厨房·灶台',70,230);
 ctx.fillStyle='#3a2c1e';ctx.fillRect(70,280,60,30);
 if(!S.lowQ){ctx.fillStyle='#e8912a';ctx.beginPath();ctx.arc(100,278,10+Math.random()*3,0,7);ctx.fill();}
 /* 石榴树 */
 ctx.fillStyle='#7a4a2a';ctx.fillRect(242,180,16,60);
 ctx.fillStyle=S.day>=7?'#e8a0a8':'#5a8a3a';
 ctx.beginPath();ctx.arc(250,150,52,0,7);ctx.fill();
 ctx.beginPath();ctx.arc(210,170,34,0,7);ctx.fill();
 ctx.beginPath();ctx.arc(292,170,34,0,7);ctx.fill();
 if(S.day>=7){ctx.fillStyle='#f3d0d8';for(var pf=0;pf<8;pf++){ctx.beginPath();ctx.arc(210+pf*11,120+(pf%3)*8,4,0,7);ctx.fill();}}
 /* 花坛 */
 ctx.fillStyle='#8a6a45';ctx.fillRect(80,440,190,90);
 ctx.fillStyle='#6a4a2a';ctx.fillRect(88,448,174,74);
 if(S.plant===0){ctx.fillStyle='#d8b98a';ctx.font='14px sans-serif';ctx.fillText('空花坛',150,490);}
 else{
  var ph=[0,14,30,52,64][S.plant]||10;
  ctx.strokeStyle='#4a7a2a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(175,520);ctx.lineTo(175,520-ph);ctx.stroke();
  if(S.plant>=4){ctx.fillStyle='#f2c230';ctx.beginPath();ctx.arc(175,520-ph,16,0,7);ctx.fill();ctx.fillStyle='#8a5a10';ctx.beginPath();ctx.arc(175,520-ph,7,0,7);ctx.fill();}
  else{ctx.fillStyle='#5a8a3a';ctx.beginPath();ctx.arc(175,520-ph,10,0,7);ctx.fill();}
  ctx.fillStyle='#5a4632';ctx.font='14px sans-serif';ctx.fillText('向日葵',140,545);
 }
 /* 水缸与墙角 */
 ctx.fillStyle='#7a8a99';ctx.beginPath();ctx.arc(835,470,26,0,7);ctx.fill();
 ctx.fillStyle='#a8c8d8';ctx.beginPath();ctx.arc(835,470,19,0,7);ctx.fill();
 ctx.fillStyle='#8a6a45';ctx.fillRect(880,500,60,60);
 ctx.fillStyle='#5a4632';ctx.font='14px sans-serif';ctx.fillText('墙角洞',884,532);
 /* 院门 */
 ctx.fillStyle='#8a3b2a';ctx.fillRect(430,640,100,20);
 ctx.fillStyle='#f3e7cf';ctx.font='14px sans-serif';ctx.fillText('院门',468,636);
 /* 屋顶与晾衣绳 */
 ctx.fillStyle='#a33b2a';ctx.fillRect(660,70,240,60);
 ctx.fillStyle='#5a4632';ctx.font='15px sans-serif';ctx.fillText('屋顶',770,60);
 ctx.strokeStyle='#5a4632';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(660,180);ctx.lineTo(920,180);ctx.stroke();
 ctx.fillStyle='#f3e7cf';ctx.fillRect(700,180,34,44);
 ctx.fillStyle='#a8c8d8';ctx.fillRect(760,180,34,44);
 if(S.day>=3){ctx.fillStyle='#e8d5a8';ctx.fillRect(820,180,40,50);}
 /* 地点标签 */
 ctx.font='13px sans-serif';ctx.fillStyle='rgba(58,44,30,.75)';
 AREAS.forEach(function(a){ctx.fillText(a.name,a.x-30,a.y+a.r+16);});
 /* 橘猫（第5天起在胡同） */
 if(S.day>=5){
  ctx.fillStyle='#e8912a';ctx.beginPath();ctx.ellipse(cat.x,cat.y,16,10,0,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(cat.x+12,cat.y-8,8,0,7);ctx.fill();
 }
 /* 奶奶 */
 ctx.fillStyle='#8a7a99';ctx.beginPath();ctx.arc(grandma.x,grandma.y,13,0,7);ctx.fill();
 ctx.fillStyle='#6a5a7a';ctx.fillRect(grandma.x-11,grandma.y+8,22,22);
 ctx.fillStyle='#e8e0d0';ctx.beginPath();ctx.arc(grandma.x,grandma.y-4,9,0,7);ctx.fill();
 ctx.fillStyle='#5a4632';ctx.font='12px sans-serif';ctx.fillText('奶奶',grandma.x-12,grandma.y-18);
 /* 丹丹 */
 ctx.fillStyle='#c89a5a';ctx.beginPath();ctx.ellipse(dog.x,dog.y,15,10,0,0,7);ctx.fill();
 ctx.beginPath();ctx.arc(dog.x+12,dog.y-6,8,0,7);ctx.fill();
 ctx.fillStyle='#8a6a45';ctx.beginPath();ctx.arc(dog.x+6,dog.y-12,4,0,7);ctx.fill();
 ctx.beginPath();ctx.arc(dog.x+18,dog.y-12,4,0,7);ctx.fill();
 if(S.carrying){ctx.fillStyle='#a33b2a';ctx.font='12px sans-serif';ctx.fillText('叼着东西',dog.x-18,dog.y-20);}
 ctx.fillStyle='#5a4632';ctx.font='12px sans-serif';ctx.fillText('丹丹',dog.x-12,dog.y+26);
 /* 小女孩 */
 ctx.fillStyle='#a33b2a';ctx.beginPath();ctx.arc(player.x,player.y,12,0,7);ctx.fill();
 ctx.fillStyle='#e8b98a';ctx.beginPath();ctx.arc(player.x,player.y-6,8,0,7);ctx.fill();
 ctx.fillStyle='#3a2c1e';ctx.beginPath();ctx.arc(player.x-4,player.y-12,5,0,7);ctx.fill();
 ctx.beginPath();ctx.arc(player.x+6,player.y-12,5,0,7);ctx.fill();
 ctx.fillStyle='#5a4632';ctx.font='12px sans-serif';ctx.fillText(girl(),player.x-14,player.y-20);
 /* 狗视角：画面压低+淡色+气味轨迹 */
 if(S.mode==='dog'){
  ctx.fillStyle='rgba(140,150,160,.16)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(58,44,30,.85)';ctx.font='14px sans-serif';
  ctx.fillText('丹丹视角：世界变大了，气味看得见',16,58);
  if(Date.now()<smellUntil){
   smellTrail.forEach(function(s){
    ctx.strokeStyle='#f2c230';ctx.lineWidth=3;ctx.setLineDash([6,6]);
    ctx.beginPath();ctx.moveTo(dog.x,dog.y);ctx.lineTo(s.x,s.y);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#f2c230';ctx.beginPath();ctx.arc(s.x,s.y,8,0,7);ctx.fill();
    ctx.fillStyle='#5a4632';ctx.font='13px sans-serif';ctx.fillText(s.name,s.x-40,s.y-14);
   });
  }
 }
 /* 低画质关粒子；高画质第7天飘花瓣 */
 if(!S.lowQ&&S.day>=7){
  if(petals.length<14&&Math.random()<0.1)petals.push({x:Math.random()*W,y:-10,v:20+Math.random()*20});
  ctx.fillStyle='rgba(243,208,216,.9)';
  petals.forEach(function(p){p.y+=p.v*0.016;p.x+=Math.sin(p.y/30)*0.6;ctx.beginPath();ctx.arc(p.x,p.y,3,0,7);ctx.fill();});
  petals=petals.filter(function(p){return p.y<H;});
 }
 /* 当前角色光圈 */
 var ap=activePos();
 ctx.strokeStyle='#a33b2a';ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(ap.x,ap.y,22,0,7);ctx.stroke();
}

/* ---------- 主循环（可暂停、可锁30帧） ---------- */
function loop(t){
 rafId=requestAnimationFrame(loop);
 if(!running||paused||dialogueOpen||document.hidden)return;
 if(S.fps30&&t-lastT<33)return;
 var dt=Math.min(0.05,(t-lastT)/1000||0.016);
 lastT=t;
 update(dt);draw();
}
function setPaused(v){paused=v;}

/* ---------- 切换角色 ---------- */
function switchMode(){
 S.mode=S.mode==='girl'?'dog':'girl';
 $('btn-switch').textContent=S.mode==='dog'?'切换：丹丹':'切换：小女孩';
 $('btn-switch2').textContent=S.mode==='dog'?'切换：丹丹':'切换：小女孩';
 $('dog-actions').hidden=S.mode!=='dog';
 toast(S.mode==='dog'?'你变成了丹丹。按闻、听、钻、叼，用狗的办法看院子。':'你变回了'+girl()+'。');
 save();
}

/* ---------- 输入 ---------- */
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
 else{autoTarget={x:wx,y:wy};pendingInteract=null;}
});
/* 触屏方向键 */
document.querySelectorAll('#dpad button').forEach(function(b){
 var dir=b.getAttribute('data-dir');
 var map={up:'arrowup',down:'arrowdown',left:'arrowleft',right:'arrowright'};
 b.addEventListener('pointerdown',function(){keys[map[dir]]=true;});
 ['pointerup','pointerleave','pointercancel'].forEach(function(ev){b.addEventListener(ev,function(){keys[map[dir]]=false;});});
});
$('btn-act').addEventListener('click',interact);
$('btn-switch').addEventListener('click',switchMode);
$('btn-switch2').addEventListener('click',switchMode);
document.querySelectorAll('#dog-actions button').forEach(function(b){
 b.addEventListener('click',function(){dogAction(b.getAttribute('data-dog'));});
});
document.addEventListener('visibilitychange',function(){setPaused(document.hidden);});

/* ---------- 开始画面与设置 ---------- */
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
 localStorage.removeItem(SAVE_KEY);
 S=freshState($('girl-name').value.trim());
 S.lowQ=$('set-lowq').checked;S.fps30=$('set-fps30').checked;
 $('settings-panel').hidden=true;player.x=480;player.y=420;dog.x=520;dog.y=450;
 renderTasks();startDay();save();
});
$('btn-album').addEventListener('click',function(){
 $('collect-title').textContent='相册·记忆碎片';
 var body='记忆碎片（'+S.fragments.length+'/8）：\n'+(S.fragments.length?S.fragments.map(function(f){return '· '+FRAGMENTS[f];}).join('\n'):'还没有，换成丹丹闻一闻墙角。');
 body+='\n\n照片（'+S.photos.length+'张）：\n'+(S.photos.length?S.photos.map(function(p){return '· '+p;}).join('\n'):'还没有。');
 body+='\n\n丹丹信任♥'+S.trust+'。';
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

/* 继续按钮 */
(function init(){
 var sv=load();
 if(sv)$('btn-continue').disabled=false;
 S=freshState('');
})();

/* 供本地测试用的钩子（不影响正常游玩） */
window.__dandan={
 state:function(){return S;},
 player:function(){return activePos();},
 dog:function(){return dog;},
 goToArea:goToArea,interactArea:interactArea,interact:interact,
 dogAction:dogAction,switchMode:switchMode,endDay:endDay,startDay:startDay,
 say:say,save:save,warp:function(x,y){var p=activePos();p.x=x;p.y=y;},
 warpDog:function(x,y){dog.x=x;dog.y=y;},
 closeDialogue:function(){if(dialogueOpen)showDlgLine();}
};
