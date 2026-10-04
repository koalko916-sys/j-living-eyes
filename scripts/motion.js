/* Continuous simulation: critically damped gaze/head, random idle targets and blinks. */
(function () {
  'use strict';
  const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  class Spring {
    constructor(frequency) { this.value=0; this.velocity=0; this.frequency=frequency; }
    step(target,dt) {
      // Exact critically damped solution remains stable at 1 FPS and after long frames.
      const w=this.frequency, x=this.value-target, e=Math.exp(-w*dt);
      const c=this.velocity+w*x;
      this.value=target+(x+c*dt)*e;
      this.velocity=(this.velocity-w*c*dt)*e;
      return this.value;
    }
  }
  class Motion {
    constructor(random=Math.random) {
      this.random=random; this.time=0; this.mouseX=0; this.mouseY=0; this.mouseAge=Infinity;
      this.idleX=0;this.idleY=0;this.nextIdle=0;this.blinkStart=-Infinity;
      this.blinkDuration=.24; this.nextBlink=2+random()*3;
      this.gazeX=new Spring(18);this.gazeY=new Spring(18);
      this.pitch=new Spring(5);this.yaw=new Spring(5);this.roll=new Spring(4);
      this.depth=new Spring(3);this.engagement=new Spring(7);
      this.pose={pitch:0,yaw:0,roll:0,depth:0,gazeX:0,gazeY:0,open:1,breathe:0};
    }
    pointer(x,y) { this.mouseX=clamp(x,-1,1);this.mouseY=clamp(y,-1,1);this.mouseAge=0; }
    leave() { this.mouseAge=Infinity; }
    update(dt,s) {
      this.mouseAge+=dt;
      const sim=dt*s.animationspeed; this.time+=sim;const t=this.time;
      if(t>=this.nextIdle){this.idleX=(this.random()-.5)*.8;this.idleY=(this.random()-.5)*.55;this.nextIdle=t+1.6+this.random()*4.4;}
      const engagement=this.engagement.step(s.mousetracking && this.mouseAge<5 ? 1:0,dt);
      const ix=(this.idleX+.08*Math.sin(t*.317))*s.idlemovement;
      const iy=(this.idleY+.06*Math.sin(t*.223+2))*s.idlemovement;
      const tx=ix*(1-engagement)+this.mouseX*s.trackingstrength*engagement;
      const ty=iy*(1-engagement)+this.mouseY*s.trackingstrength*engagement;
      const p=this.pose;
      p.gazeX=this.gazeX.step(clamp(tx*.053,-.065,.065),dt);
      p.gazeY=this.gazeY.step(clamp(ty*.025,-.032,.032),dt);
      p.yaw=this.yaw.step((tx*.17+Math.sin(t*.173)*.026*s.idlemovement)*s.headmovement,dt);
      p.pitch=this.pitch.step((-ty*.11+Math.sin(t*.137+1)*.022*s.idlemovement)*s.headmovement,dt);
      p.roll=this.roll.step((tx*.02+Math.sin(t*.113+3)*.019*s.idlemovement)*s.headmovement,dt);
      p.depth=this.depth.step(Math.sin(t*.191)*.055*s.idlemovement*s.headmovement,dt);
      p.breathe=Math.sin(t*1.15)*.0035*s.breathing;
      if(!s.blinking){this.blinkStart=-Infinity;this.nextBlink=t+2+this.random()*4;}
      else if(t>=this.nextBlink){this.blinkStart=t;this.blinkDuration=.19+this.random()*.08;this.nextBlink=t+2.7+this.random()*5.2;}
      const phase=(t-this.blinkStart)/this.blinkDuration;
      // Fast close, slower open. Occasional gentle squint from unrelated phases.
      let closed=0;
      if(phase>=0&&phase<1) closed=phase<.36 ? Math.sin(phase/.36*Math.PI*.5):Math.cos((phase-.36)/.64*Math.PI*.5);
      const squint=Math.pow(Math.max(0,Math.sin(t*.29+1)*Math.sin(t*.071)),6)*.08*s.idlemovement;
      p.open=clamp((1-closed)*(1-squint),0,1);
      return p;
    }
  }
  window.JMotion={Motion,Spring};
})();
