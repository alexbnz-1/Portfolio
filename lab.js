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

let model, solution;
const nodesBody = document.getElementById('truss-nodes');
const membersBody = document.getElementById('truss-members');
const solverStatus = document.getElementById('truss-status');
const plot = document.getElementById('truss-plot');
const NS = 'http://www.w3.org/2000/svg';
function svgElement(tag, attributes, content) {
  const element = document.createElementNS(NS, tag);
  Object.entries(attributes).forEach(([key,value]) => element.setAttribute(key, value));
  if (content !== undefined) element.textContent = content;
  plot.append(element);return element;
}
function inputCell(item, key, label, attributes = {}) {
  const cell = document.createElement('td'), input = document.createElement('input');
  input.type = 'number';input.step = 'any';input.value = item[key];
  input.setAttribute('aria-label', `${label} ${item.id}`);
  Object.assign(input, attributes);
  input.addEventListener('input', () => { item[key] = input.value === '' ? NaN : Number(input.value);invalidateSolution(); });
  cell.append(input);return cell;
}
function invalidateSolution() {
  solution = undefined;
  document.getElementById('export-results').disabled = true;
  ['truss-displacement','truss-force','truss-balance'].forEach(id => document.getElementById(id).textContent = '-');
  document.getElementById('member-results').replaceChildren();document.getElementById('node-results').replaceChildren();
  solverStatus.classList.remove('error');solverStatus.textContent = 'Model changed. Solve to update the results.';drawTruss();
}
function renderEditor() {
  nodesBody.replaceChildren();membersBody.replaceChildren();
  model.nodes.forEach(node => {
    const row = document.createElement('tr');
    const id = document.createElement('td');id.textContent = node.id;row.append(id);
    ['x','y','fx','fy'].forEach(key => row.append(inputCell(node,key,`${key} for node`)));
    const supportCell = document.createElement('td'), select = document.createElement('select');
    select.setAttribute('aria-label', `Support for node ${node.id}`);
    [['free','Free'],['pin','Pinned'],['y','Fix y'],['x','Fix x']].forEach(([value,text]) => { const option = new Option(text,value);select.append(option); });
    select.value = node.support;select.addEventListener('change', () => { node.support = select.value;invalidateSolution(); });supportCell.append(select);row.append(supportCell);
    const deleteCell = document.createElement('td'), remove = document.createElement('button');remove.textContent = '×';remove.setAttribute('aria-label',`Remove node ${node.id}`);
    remove.addEventListener('click', () => { model.nodes = model.nodes.filter(n => n !== node);model.members = model.members.filter(m => m.a !== node.id && m.b !== node.id);invalidateSolution();renderEditor(); });deleteCell.append(remove);row.append(deleteCell);nodesBody.append(row);
  });
  model.members.forEach(member => {
    const row = document.createElement('tr'), id = document.createElement('td');id.textContent = member.id;row.append(id);
    ['a','b'].forEach(key => {
      const cell = document.createElement('td'), select = document.createElement('select');
      select.setAttribute('aria-label',`${key === 'a' ? 'From' : 'To'} node for member ${member.id}`);
      model.nodes.forEach(node => select.append(new Option(String(node.id),String(node.id))));select.value = member[key];
      select.addEventListener('change',() => { member[key] = Number(select.value);invalidateSolution(); });cell.append(select);row.append(cell);
    });
    row.append(inputCell(member,'E','Modulus GPa for member',{min:'0.001'}),inputCell(member,'A','Area mm2 for member',{min:'0.001'}));
    const cell = document.createElement('td'), remove = document.createElement('button');remove.textContent = '×';remove.setAttribute('aria-label',`Remove member ${member.id}`);
    remove.addEventListener('click',()=>{model.members = model.members.filter(m => m !== member);invalidateSolution();renderEditor();});cell.append(remove);row.append(cell);membersBody.append(row);
  });
  document.getElementById('add-node').disabled = model.nodes.length >= 24;
  document.getElementById('add-member').disabled = model.members.length >= 64 || model.nodes.length < 2;
}
function drawTruss() {
  plot.replaceChildren();
  const nodes = model.nodes.filter(n => Number.isFinite(n.x) && Number.isFinite(n.y));
  if (!nodes.length) {svgElement('text',{x:400,y:230,'text-anchor':'middle',fill:'currentColor'},'Add valid node coordinates to see the model.');return;}
  const xs = nodes.map(n=>n.x), ys = nodes.map(n=>n.y), minX = Math.min(...xs), minY = Math.min(...ys);
  const width = Math.max(...xs)-minX, height = Math.max(...ys)-minY;
  const scale = Math.min(620/Math.max(width,1),280/Math.max(height,1));
  const offsetX = (800-width*scale)/2, offsetY = 355-height*scale/2;
  const pos = (node, dx = 0, dy = 0) => [offsetX+(node.x+dx-minX)*scale,offsetY-(node.y+dy-minY)*scale];
  const color = getComputedStyle(document.documentElement).getPropertyValue('--signal-text').trim();
  const secondary = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim();
  const index = new Map(model.nodes.map((node,i)=>[node.id,i]));
  model.members.forEach(member => {
    const a = model.nodes[index.get(member.a)], b = model.nodes[index.get(member.b)];
    if (!a || !b || ![a.x,a.y,b.x,b.y].every(Number.isFinite)) return;
    const [x1,y1] = pos(a),[x2,y2] = pos(b);
    svgElement('line',{x1,y1,x2,y2,stroke:'currentColor','stroke-width':4,'stroke-linecap':'round',opacity:.65});
    svgElement('text',{x:(x1+x2)/2,y:(y1+y2)/2-10,fill:secondary,'text-anchor':'middle','font-size':13,'font-family':'monospace'},`M${member.id}`);
    if (solution) {
      const exaggeration = Number(document.getElementById('truss-scale').value);
      const ia = index.get(member.a)*2,ib = index.get(member.b)*2;
      const [dx1,dy1] = pos(a,solution.u[ia]*exaggeration,solution.u[ia+1]*exaggeration);
      const [dx2,dy2] = pos(b,solution.u[ib]*exaggeration,solution.u[ib+1]*exaggeration);
      svgElement('line',{x1:dx1,y1:dy1,x2:dx2,y2:dy2,stroke:color,'stroke-width':3,'stroke-dasharray':'7 5'});
    }
  });
  nodes.forEach(node => {
    const [x,y] = pos(node);
    if (node.support !== 'free') {
      svgElement('path',{d:`M ${x} ${y+6} l -13 20 h 26 Z`,fill:'none',stroke:secondary,'stroke-width':2});
      if (node.support === 'y') {[-8,8].forEach(d=>svgElement('circle',{cx:x+d,cy:y+31,r:3,fill:'none',stroke:secondary}));}
      if (node.support === 'x') svgElement('text',{x:x+18,y:y+30,fill:secondary,'font-size':11},'x');
    }
    svgElement('circle',{cx:x,cy:y,r:6,fill:color});
    svgElement('text',{x:x+12,y:y+5,fill:'currentColor','font-size':15,'font-family':'monospace'},String(node.id));
    if (Number.isFinite(node.fx) && Number.isFinite(node.fy) && Math.hypot(node.fx,node.fy)>0) {
      const mag = Math.hypot(node.fx,node.fy), dx = node.fx/mag*50,dy = -node.fy/mag*50;
      const ex=x+dx,ey=y+dy,ux=dx/50,uy=dy/50;
      svgElement('path',{d:`M ${x} ${y} L ${ex} ${ey} M ${ex-ux*10-uy*5} ${ey-uy*10+ux*5} L ${ex} ${ey} L ${ex-ux*10+uy*5} ${ey-uy*10-ux*5}`,fill:'none',stroke:color,'stroke-width':2});
      svgElement('text',{x:ex+12,y:ey+5,fill:color,'font-size':13,'font-family':'monospace'},`${mag.toFixed(1)} kN`);
    }
  });
  svgElement('text',{x:25,y:435,fill:secondary,'font-size':12,'font-family':'monospace'},'Geometry: metres. Loads: kN.');
}
function resultRow(values) {const row=document.createElement('tr');values.forEach(value=>{const cell=document.createElement('td');cell.textContent=value;row.append(cell);});return row;}
function runSolve() {
  try {
    solution = TrussEngine.solveTruss(model);
    document.getElementById('truss-displacement').textContent = `${(solution.maxDisplacement*1000).toFixed(3)} mm`;
    document.getElementById('truss-force').textContent = `${(Math.max(...solution.forces.map(f=>Math.abs(f.force)))/1000).toFixed(2)} kN`;
    document.getElementById('truss-balance').textContent = `${solution.balance.toExponential(1)} N`;
    document.getElementById('member-results').replaceChildren(...solution.forces.map(f=>resultRow([f.id,(f.force/1000).toFixed(3),(f.force/f.area).toFixed(3)])));
    document.getElementById('node-results').replaceChildren(...model.nodes.map((node,i)=>resultRow([node.id,(solution.u[2*i]*1000).toFixed(4),(solution.u[2*i+1]*1000).toFixed(4),solution.fixed.includes(2*i)?(solution.reactions[2*i]/1000).toFixed(3):'0.000',solution.fixed.includes(2*i+1)?(solution.reactions[2*i+1]/1000).toFixed(3):'0.000'])));
    solverStatus.classList.remove('error');solverStatus.textContent='Solved. Edit geometry, supports or loads to compare the response.';document.getElementById('export-results').disabled=false;
  } catch (error) {invalidateSolution();solverStatus.classList.add('error');solverStatus.textContent=error.message;}
  drawTruss();
}
function loadPreset() {model=structuredClone(TrussEngine.presets[document.getElementById('truss-preset').value]);renderEditor();runSolve();}
document.getElementById('truss-preset').addEventListener('change',loadPreset);document.getElementById('truss-reset').addEventListener('click',loadPreset);document.getElementById('truss-solve').addEventListener('click',runSolve);
document.getElementById('truss-scale').addEventListener('input',()=>{document.getElementById('truss-scale-label').textContent=`${document.getElementById('truss-scale').value}×`;drawTruss();});
document.getElementById('add-node').addEventListener('click',()=>{const id=Math.max(0,...model.nodes.map(n=>n.id))+1;model.nodes.push({id,x:0,y:1,fx:0,fy:0,support:'free'});invalidateSolution();renderEditor();});
document.getElementById('add-member').addEventListener('click',()=>{const id=Math.max(0,...model.members.map(n=>n.id))+1;model.members.push({id,a:model.nodes[0].id,b:model.nodes[1].id,E:200,A:1000});invalidateSolution();renderEditor();});
document.getElementById('export-results').addEventListener('click',()=>{
  if (!solution) return;
  const rows=['Member,Axial force (kN),Stress (MPa)',...solution.forces.map(f=>`${f.id},${f.force/1000},${f.force/f.area}`),'','Node,ux (mm),uy (mm),Rx (kN),Ry (kN)',...model.nodes.map((node,i)=>`${node.id},${solution.u[2*i]*1000},${solution.u[2*i+1]*1000},${solution.fixed.includes(2*i)?solution.reactions[2*i]/1000:0},${solution.fixed.includes(2*i+1)?solution.reactions[2*i+1]/1000:0}`)];
  const url=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='alex-bell-truss-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
new MutationObserver(drawTruss).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
loadPreset();

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
