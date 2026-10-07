'use strict';
// Accessible tabs: arrows, Home and End move focus and select the matching tool.
const labTabs = [...document.querySelectorAll('[data-lab-tab]')];
function selectLab(name, focus = false) {
  labTabs.forEach(tab => {
    const active = tab.dataset.labTab === name;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    if (active && focus) tab.focus();
  });
  if (name === 'elevator') startElevator();
  ScrollTrigger.refresh();
}
labTabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectLab(tab.dataset.labTab));
  tab.addEventListener('keydown', e => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const index = e.key === 'Home' ? 0 : e.key === 'End' ? labTabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + labTabs.length) % labTabs.length;
    selectLab(labTabs[index].dataset.labTab, true);
  });
});
document.querySelectorAll('[data-open-lab]').forEach(link => link.addEventListener('click', () => selectLab(link.dataset.openLab)));

// Five-floor browser controller. Three metres per floor; directional collective scheduling.
const elevatorPanel=document.getElementById('elevator-panel'),car=document.getElementById('elevator-car');
const floorButtons=[...document.querySelectorAll('[data-floor-call]')];
let lift, liftRaf=0, lastTime=0, lastPaint=0, eventCount=0;
const events=document.getElementById('elevator-log');
const message=document.getElementById('elevator-message');
function logLift(text){const li=document.createElement('li');li.textContent=text;events.prepend(li);while(events.children.length>4)events.lastChild.remove();}
function resetLift(){lift={position:0,velocity:0,target:null,direction:1,requests:new Set(),door:'closed',doorTime:0,integral:0,stopped:false,paused:false,obstructed:false,samples:[],elapsed:0,sampleTime:0};document.getElementById('elevator-stop').textContent='Emergency stop';document.getElementById('elevator-stop').setAttribute('aria-pressed','false');document.getElementById('elevator-pause').textContent='Pause';document.getElementById('elevator-obstruction').checked=false;events.replaceChildren();message.textContent='Choose a floor to begin.';paintLift();}
function atFloor(){return Math.abs(lift.position/3-Math.round(lift.position/3))<.004 && Math.abs(lift.velocity)<.02;}
function openDoors(){lift.door='opening';lift.doorTime=.65;lift.velocity=0;lift.integral=0;logLift(`Doors opening at ${floorName(Math.round(lift.position/3))}`);}
function floorName(floor){return floor===0?'ground':`floor ${floor}`;}
function selectTarget(){
  if(!lift.requests.size)return null;
  const floors=[...lift.requests],current=lift.position/3;
  let ahead=floors.filter(f=>(f-current)*lift.direction>=-.005);
  if(!ahead.length){lift.direction*=-1;ahead=floors;}
  return ahead.sort((a,b)=>Math.abs(a-current)-Math.abs(b-current))[0];
}
function stepLift(dt){
  if(lift.paused||lift.stopped)return;
  lift.elapsed+=dt;
  if(lift.door!=='closed'){
    lift.velocity=0;
    if(lift.obstructed){lift.door='open';lift.doorTime=2;}
    else{
      lift.doorTime-=dt;
      if(lift.doorTime<=0){
        if(lift.door==='opening'){lift.door='open';lift.doorTime=2;}
        else if(lift.door==='open'){lift.door='closing';lift.doorTime=.65;}
        else{lift.door='closed';logLift('Doors closed. Motion enabled.');}
      }
    }
  }else{
    if(lift.target===null)lift.target=selectTarget();
    if(lift.target!==null){
      const delta=lift.target*3-lift.position;
      if(Math.abs(delta)<.015&&Math.abs(lift.velocity)<.15){lift.position=lift.target*3;lift.requests.delete(lift.target);logLift(`Arrived at ${floorName(lift.target)}`);lift.target=null;openDoors();}
      else{
        const direction=Math.sign(delta),maxSpeed=Number(document.getElementById('elevator-speed').value);
        const demand=direction*Math.min(maxSpeed,Math.sqrt(1.3*Math.abs(delta)));
        const error=demand-lift.velocity;lift.integral=Math.max(-.5,Math.min(.5,lift.integral+error*dt));
        const acceleration=Math.max(-.9,Math.min(.9,4*error+.7*lift.integral));
        const velocity=lift.velocity+acceleration*dt,step=(lift.velocity+velocity)/2*dt;
        if(Math.abs(step)>=Math.abs(delta)&&Math.sign(step)===direction){lift.position=lift.target*3;lift.velocity=0;}
        else{lift.position+=step;lift.velocity=velocity;}
        lift.direction=direction;
      }
    }
  }
  lift.sampleTime+=dt;
  if(lift.sampleTime>.1){lift.sampleTime=0;lift.samples.push([lift.elapsed,lift.velocity]);lift.samples=lift.samples.filter(s=>s[0]>=lift.elapsed-20);}
}
function paintLift(){
  const shaft=car.parentElement;const travel=Math.max(0,shaft.clientHeight-car.offsetHeight);
  car.style.setProperty('--car-y',`${-lift.position/12*travel}px`);
  car.style.setProperty('--door-open',lift.door==='open'||lift.door==='opening'?1:0);
  const floor=atFloor()?Math.round(lift.position/3):null;document.getElementById('car-floor').textContent=floor===null?'':floor===0?'G':floor;
  document.getElementById('elevator-position').textContent=`${lift.position.toFixed(2)} m`;
  document.getElementById('elevator-velocity').textContent=`${lift.velocity.toFixed(2)} m/s`;
  document.getElementById('elevator-direction').textContent=Math.abs(lift.velocity)<.02?'Stopped':lift.velocity>0?'Travelling up':'Travelling down';
  document.getElementById('elevator-mode').textContent=lift.stopped?'Emergency stop engaged':lift.paused?'Simulation paused':lift.door!=='closed'?`Doors ${lift.door}${lift.obstructed?' (obstruction)':''}`:lift.target!==null?`Travelling to ${floorName(lift.target)}`:`Idle at ${floorName(Math.round(lift.position/3))}`;
  document.getElementById('elevator-queue').textContent=[...lift.requests].sort((a,b)=>a-b).map(f=>f===0?'G':f).join(', ')||'None';
  floorButtons.forEach(button=>{const requested=lift.requests.has(Number(button.dataset.floorCall));button.classList.toggle('is-requested',requested);button.setAttribute('aria-pressed',String(requested));});
  drawVelocity();
}
function drawVelocity(){
  const canvas=document.getElementById('elevator-chart');if(!canvas.clientWidth)return;
  const ratio=Math.min(window.devicePixelRatio||1,2),width=canvas.clientWidth,height=canvas.clientHeight;
  if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}
  const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
  const css=getComputedStyle(document.documentElement),color=css.getPropertyValue('--signal-text').trim(),muted=css.getPropertyValue('--secondary').trim();
  ctx.strokeStyle=muted;ctx.globalAlpha=.25;ctx.beginPath();ctx.moveTo(45,height/2);ctx.lineTo(width-15,height/2);ctx.stroke();ctx.globalAlpha=1;ctx.font='10px monospace';ctx.fillStyle=muted;ctx.fillText('+2 m/s',8,17);ctx.fillText('0',20,height/2-5);ctx.fillText('-2 m/s',8,height-10);
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();lift.samples.forEach(([t,v],i)=>{const x=45+(t-Math.max(0,lift.elapsed-20))/20*(width-60),y=height/2-v/2*(height/2-15);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();
}
function tickLift(time){
  liftRaf=0;if(elevatorPanel.hidden||document.hidden){lastTime=0;return;}
  const dt=lastTime?Math.min((time-lastTime)/1000,.05):0;lastTime=time;stepLift(dt);
  if(time-lastPaint>50){paintLift();lastPaint=time;}
  liftRaf=requestAnimationFrame(tickLift);
}
function startElevator(){if(!liftRaf){lastTime=0;liftRaf=requestAnimationFrame(tickLift);}}
floorButtons.forEach(button=>button.addEventListener('click',()=>{
  const floor=Number(button.dataset.floorCall);lift.requests.add(floor);logLift(`Call registered: ${floorName(floor)}`);message.textContent=lift.stopped?'Call queued. Release the emergency stop to continue.':`Request queued for ${floorName(floor)}.`;
  if(lift.target!==null&&lift.door==='closed'&&!lift.stopped){const distance=lift.velocity*lift.velocity/(2*.65)+.1;const delta=floor*3-lift.position;if(delta*lift.direction>distance&&Math.abs(delta)<Math.abs(lift.target*3-lift.position))lift.target=floor;}
  if(lift.door!=='closed'&&atFloor()&&Math.round(lift.position/3)===floor){lift.requests.delete(floor);lift.door='open';lift.doorTime=2;}
  paintLift();startElevator();
}));
document.getElementById('elevator-open').addEventListener('click',()=>{if(!atFloor()||lift.stopped){message.textContent='Door interlock: doors can open only while stopped at a floor.';return;}openDoors();message.textContent='Doors opening. Travel is inhibited until they close.';paintLift();});
document.getElementById('elevator-close').addEventListener('click',()=>{if(lift.obstructed){message.textContent='Door interlock: clear the obstruction before closing.';return;}if(lift.door==='closed'){message.textContent='Doors are already closed.';return;}lift.door='closing';lift.doorTime=.65;message.textContent='Doors closing.';paintLift();});
document.getElementById('elevator-obstruction').addEventListener('change',e=>{lift.obstructed=e.target.checked;if(lift.obstructed&&lift.door!=='closed'){lift.door='open';lift.doorTime=2;}message.textContent=lift.obstructed?'Door sensor blocked. Open doors will remain open.':'Obstruction cleared.';paintLift();});
document.getElementById('elevator-speed').addEventListener('input',e=>{document.getElementById('elevator-speed-label').textContent=`${Number(e.target.value).toFixed(1)} m/s`;});
document.getElementById('elevator-stop').addEventListener('click',e=>{lift.stopped=!lift.stopped;if(lift.stopped){lift.velocity=0;lift.integral=0;}e.target.textContent=lift.stopped?'Release stop':'Emergency stop';e.target.setAttribute('aria-pressed',String(lift.stopped));message.textContent=lift.stopped?'Motion stopped. Requests are retained.':'Emergency stop released.';logLift(lift.stopped?'Emergency stop':'Stop released');paintLift();});
document.getElementById('elevator-pause').addEventListener('click',e=>{lift.paused=!lift.paused;e.target.textContent=lift.paused?'Resume':'Pause';paintLift();});
document.getElementById('elevator-reset').addEventListener('click',resetLift);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!elevatorPanel.hidden)startElevator();});
window.addEventListener('resize',paintLift,{passive:true});
resetLift();
