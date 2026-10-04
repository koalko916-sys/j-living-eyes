(function(){
  'use strict';
  const settings=window.JSettings;
  const canvas=document.getElementById('wallpaper');
  const renderer=new JRenderer.Renderer(canvas,JEyeData.points);
  const motion=new JMotion.Motion();
  let raf=0,lastRender=null,lastSimulation=null,frames=0;
  const stats={backend:renderer.gl?'WebGL':'Canvas2D',points:JEyeData.points.length/7,frames:0,frameMs:0};
  function frame(now){
    raf=0;
    if(settings.paused||document.hidden)return;
    const interval=1000/settings.fps;
    if(lastRender===null||now-lastRender>=interval-.3){
      const dt=lastSimulation===null?0:Math.min(1.1,Math.max(0,(now-lastSimulation)/1000));
      lastSimulation=now;
      lastRender=lastRender===null||now-lastRender<interval?now:now-((now-lastRender)%interval);
      const start=performance.now();renderer.render(motion.update(dt,settings),settings);
      stats.frameMs=performance.now()-start;stats.frames=++frames;
    }
    raf=requestAnimationFrame(frame);
  }
  function syncPause(){
    if(settings.paused||document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}
    else if(!raf){lastRender=null;lastSimulation=null;raf=requestAnimationFrame(frame);}
  }
  // Pointer events do no drawing; simulation consumes only the latest normalized position.
  window.addEventListener('pointermove',e=>motion.pointer(e.clientX/Math.max(1,innerWidth)*2-1,e.clientY/Math.max(1,innerHeight)*2-1),{passive:true});
  document.addEventListener('mouseleave',()=>motion.leave(),{passive:true});
  window.addEventListener('resize',()=>renderer.resize(),{passive:true});
  document.addEventListener('visibilitychange',syncPause);
  // Explicit preview=1 activates separate controls, never overlay the wallpaper itself.
  window.JApp={stats,syncPause,renderer,motion};
  syncPause();
})();
