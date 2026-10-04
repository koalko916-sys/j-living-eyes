/* Run with Node.js: node tests/verify.cjs. No npm dependencies. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const box={window:{},console,Math};vm.createContext(box);
for(const name of ['settings','motion','renderer','eye-data'])vm.runInContext(fs.readFileSync(path.join(root,'scripts',name+'.js'),'utf8'),box);
const w=box.window,s=w.JSettings,listener=w.wallpaperPropertyListener;
listener.applyUserProperties({eyecolor:{value:'0.2 0.6 1'},mousetracking:{value:false},trackingstrength:{value:100}});
assert.equal(s.eyecolor.join(','),'0.2,0.6,1');assert.equal(s.mousetracking,false);assert.equal(s.trackingstrength,2);
listener.applyUserProperties({eyecolor:{value:'broken'},density:{value:NaN},blinking:{value:'false'}});
assert.equal(s.eyecolor.join(','),'0.2,0.6,1');assert.equal(s.density,1);assert.equal(s.blinking,true);
listener.applyGeneralProperties({fps:30});assert.equal(s.fps,30);
listener.applyGeneralProperties({fps:-1});assert.equal(s.fps,30);
let pauseCalls=0;w.JApp={syncPause(){pauseCalls++;}};listener.setPaused(true);listener.setPaused(false);assert.equal(pauseCalls,2);
s.mousetracking=true;s.trackingstrength=1;s.idlemovement=0;
const {Motion,Spring}=w.JMotion;
for(const fps of [1,30,60,144]){
  const spring=new Spring(5);for(let i=0;i<fps*4;i++)spring.step(1,1/fps);
  assert.ok(Math.abs(spring.value-1)<1e-6,'Spring convergence '+fps);
  const motion=new Motion(()=>.5);motion.pointer(1,-1);
  for(let i=0;i<fps*3;i++)motion.update(1/fps,s);
  assert.ok(motion.pose.gazeX>.05&&motion.pose.gazeY<-.024,'Gaze response '+fps);
  assert.ok(motion.pose.yaw>0&&motion.pose.pitch>0,'Rotation direction '+fps);
  motion.leave();for(let i=0;i<fps*5;i++)motion.update(1/fps,s);
  assert.ok(Math.abs(motion.pose.gazeX)<.0001,'Idle handover '+fps);
}
const blink=new Motion(()=>.5);let minOpen=1;
for(let i=0;i<1200;i++){blink.update(1/120,s);minOpen=Math.min(minOpen,blink.pose.open);}
assert.ok(minOpen<.01,'Blink fully closes');
s.blinking=false;assert.equal(blink.update(.1,s).open,1);
const long=new Motion(()=>.5);s.idlemovement=.65;
for(let i=0;i<60*60*10;i++){const p=long.update(1/60,s);assert.ok(Object.values(p).every(Number.isFinite));assert.ok(p.open>=0&&p.open<=1);}
const matrix=w.JRenderer.rotation({pitch:.31,yaw:-.22,roll:.17});
for(let a=0;a<3;a++)for(let b=0;b<3;b++){let dot=0;for(let j=0;j<3;j++)dot+=matrix[a*3+j]*matrix[b*3+j];assert.ok(Math.abs(dot-(a===b?1:0))<1e-12);}
const data=w.JEyeData.points;assert.equal(data.length%7,0);assert.ok(data.every(Number.isFinite));
let colored=0;for(let i=0;i<data.length;i+=7){assert.ok(data[i+6]>=0&&data[i+6]<=1);if(data[i+5]){colored++;assert.equal(data[i+4],2);}}
assert.ok(colored>50);
const project=JSON.parse(fs.readFileSync(path.join(root,'project.json'),'utf8'));
for(const [key,p] of Object.entries(project.general.properties))assert.ok(key in s,'Property wired: '+key);
for(const file of [project.file,project.preview,'preview.html'])assert.ok(fs.existsSync(path.join(root,file)),file+' exists');
console.log('PASS: properties, pause, spring stability (1–144 FPS), tracking/idle, blinking, 10-minute simulation, 3D matrix, point data, project wiring.');
