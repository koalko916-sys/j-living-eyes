/* Two GPU draws per frame; static geometry, shader rotation/projection/blinking. */
(function () {
  'use strict';
  const vertex = `
    precision highp float;
    attribute vec3 aPosition;
    attribute vec4 aMeta; // brightness, feature (brow/rim/iris), tint, stable density rank
    uniform mat3 uRotation;
    uniform vec2 uViewport,uCenter,uGaze;
    uniform float uScale,uDepth,uOpen,uBreath,uDensity,uPointSize;
    uniform mediump float uPass;
    varying mediump float vBrightness,vTint,vGlyph;
    void main(){
      vec3 p=aPosition; float side=p.x<0.0?-1.0:1.0;
      float center=side*0.388, u=(p.x-center)/0.36;
      float top=(-29.0+15.0*u*u)/531.5;
      float bottom=(48.0-60.0*u*u)/531.5;
      float lower=top+(bottom-top)*uOpen+(1.0-uOpen)*0.025;
      float upper=top+(1.0-uOpen)*0.025;
      float visible=step(aMeta.w,uDensity);
      if(aMeta.y>1.5){
        p.xy+=uGaze;
        u=(p.x-center)/0.36;
        top=(-29.0+15.0*u*u)/531.5;
        bottom=(48.0-60.0*u*u)/531.5;
        upper=top+(1.0-uOpen)*0.025;
        lower=top+(bottom-top)*uOpen+(1.0-uOpen)*0.025;
        visible*=smoothstep(upper-0.006,upper+0.003,p.y)*(1.0-smoothstep(lower-0.003,lower+0.006,p.y));
        // Keep all neutral points; progressively narrow the side aperture during gaze.
        float sideEdge=0.176-1.25*abs(uGaze.x);
        visible*=1.0-smoothstep(sideEdge,sideEdge+0.035,abs(p.x-center));
        visible*=smoothstep(0.01,0.1,uOpen);
      } else if(aMeta.y>0.5){p.y=top+(p.y-top)*uOpen+(1.0-uOpen)*0.025;}
      p.y+=uBreath; p*=1.0+uBreath*0.45;
      p=uRotation*p;
      float perspective=3.2/(3.2-p.z-uDepth);
      vec2 screen=uCenter+p.xy*uScale*perspective;
      gl_Position=vec4(screen.x/uViewport.x*2.0-1.0,1.0-screen.y/uViewport.y*2.0,0.0,1.0);
      gl_PointSize=uPointSize*perspective*(uPass>0.5?3.8:1.0);
      vBrightness=aMeta.x*visible;vTint=aMeta.z;vGlyph=floor(clamp(aMeta.x*8.0,0.0,7.0));
    }`;
  const fragment = `
    precision mediump float;
    uniform vec3 uEyeColor;
    uniform float uPass,uGlow,uBrightness,uStyle;
    uniform sampler2D uAtlas;
    varying float vBrightness,vTint,vGlyph;
    void main(){
      vec2 q=gl_PointCoord-0.5;
      float r=length(q)*2.0;
      float alpha;
      if(uPass>0.5) alpha=exp(-r*r*5.0)*uGlow*0.24;
      else if(uStyle>0.5) alpha=texture2D(uAtlas,vec2((vGlyph+gl_PointCoord.x)/8.0,gl_PointCoord.y)).a;
      else alpha=1.0-smoothstep(0.65,1.0,r);
      vec3 color=mix(vec3(0.91,0.93,0.96),uEyeColor,vTint);
      gl_FragColor=vec4(color,alpha*vBrightness*uBrightness);
    }`;
  function rotation(p) {
    const cx=Math.cos(p.pitch),sx=Math.sin(p.pitch),cy=Math.cos(p.yaw),sy=Math.sin(p.yaw),cz=Math.cos(p.roll),sz=Math.sin(p.roll);
    // Column-major Rz * Ry * Rx, genuine rotation of all depth-bearing points.
    return [cz*cy,sz*cy,-sy, cz*sy*sx-sz*cx,sz*sy*sx+cz*cx,cy*sx, cz*sy*cx+sz*sx,sz*sy*cx-cz*sx,cy*cx];
  }
  function atlas() {
    const c=document.createElement('canvas');c.width=256;c.height=32;const ctx=c.getContext('2d');
    ctx.font='bold 27px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';
    '.:;=+*#@'.split('').forEach((g,i)=>ctx.fillText(g,i*32+16,17));return c;
  }
  class Renderer {
    constructor(canvas,data) {
      this.canvas=canvas;this.data=data;this.lost=false;
      this.gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
      this.atlas=atlas();this.uniforms={};
      if(this.gl)this.initGL();else this.ctx=canvas.getContext('2d',{alpha:false});
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;});
      canvas.addEventListener('webglcontextrestored',()=>{this.initGL();this.lost=false;});
      this.resize();
    }
    initGL() {
      const gl=this.gl;
      const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
      const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment);
      const program=this.program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
      gl.deleteShader(v);gl.deleteShader(f);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.data),gl.STATIC_DRAW);
      for(const [name,size,offset] of [['aPosition',3,0],['aMeta',4,12]]){const i=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,gl.FLOAT,false,28,offset);}
      for(const name of ['uRotation','uViewport','uCenter','uGaze','uScale','uDepth','uOpen','uBreath','uDensity','uPointSize','uPass','uEyeColor','uGlow','uBrightness','uStyle','uAtlas'])this.uniforms[name]=gl.getUniformLocation(program,name);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.atlas);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.uniform1i(this.uniforms.uAtlas,0);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.clearColor(0,0,0,1);
    }
    resize() {
      // No full-size 4K/retina buffer: crisp dots with bounded fill cost.
      this.ratio=Math.min(window.devicePixelRatio||1,1.5,2560/Math.max(1,innerWidth),1440/Math.max(1,innerHeight));
      this.canvas.width=Math.max(1,Math.round(innerWidth*this.ratio));this.canvas.height=Math.max(1,Math.round(innerHeight*this.ratio));
      if(this.gl)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
    }
    render(p,s) {
      if(this.lost)return;
      const w=this.canvas.width,h=this.canvas.height;
      const scale=Math.min(w*s.scale*.5,h*1.7),center=[w*s.positionx,h*s.positiony];
      const matrix=rotation(p);
      if(!this.gl){this.renderCanvas(p,s,scale,center,matrix);return;}
      const gl=this.gl,u=this.uniforms;gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniformMatrix3fv(u.uRotation,false,matrix);gl.uniform2f(u.uViewport,w,h);gl.uniform2fv(u.uCenter,center);
      gl.uniform2f(u.uGaze,p.gazeX,p.gazeY);gl.uniform1f(u.uScale,scale);gl.uniform1f(u.uDepth,p.depth);
      gl.uniform1f(u.uOpen,p.open);gl.uniform1f(u.uBreath,p.breathe);gl.uniform1f(u.uDensity,s.density);
      gl.uniform3fv(u.uEyeColor,s.eyecolor);gl.uniform1f(u.uGlow,s.glow);gl.uniform1f(u.uBrightness,s.brightness);
      gl.uniform1f(u.uStyle,s.style==='ascii'?1:0);
      gl.uniform1f(u.uPointSize,s.style==='ascii'?Math.max(3,scale*.0102):Math.max(1.1,scale*.0048));
      if(s.glow>.001){gl.uniform1f(u.uPass,1);gl.drawArrays(gl.POINTS,0,this.data.length/7);}
      gl.uniform1f(u.uPass,0);gl.drawArrays(gl.POINTS,0,this.data.length/7);
    }
    renderCanvas(p,s,scale,center,m) {
      const c=this.ctx,d=this.data;c.fillStyle='#000';c.fillRect(0,0,this.canvas.width,this.canvas.height);
      const eye='rgb('+s.eyecolor.map(v=>Math.round(v*255)).join(',')+')';
      if(this.tintColor!==eye){
        this.tintColor=eye;this.tintedAtlas=document.createElement('canvas');this.tintedAtlas.width=256;this.tintedAtlas.height=32;
        const a=this.tintedAtlas.getContext('2d');a.drawImage(this.atlas,0,0);a.globalCompositeOperation='source-in';a.fillStyle=eye;a.fillRect(0,0,256,32);
      }
      for(let i=0;i<d.length;i+=7){
        if(d[i+6]>s.density)continue;
        let visibility=1;
        let x=d[i],y=d[i+1],z=d[i+2];const feature=d[i+4],u=(x-(x<0?-.388:.388))/.36;
        let top=(-29+15*u*u)/531.5;
        if(feature===2){
          const eyeCenter=x<0?-.388:.388;
          x+=p.gazeX;y+=p.gazeY;const q=(x-eyeCenter)/.36;
          top=(-29+15*q*q)/531.5;
          const lo=top+((48-60*q*q)/531.5-top)*p.open+(1-p.open)*.025;
          if(y<top+(1-p.open)*.025||y>lo||p.open<.02)continue;
          const sideEdge=.176-1.25*Math.abs(p.gazeX);
          const fade=Math.min(1,Math.max(0,(Math.abs(x-eyeCenter)-sideEdge)/.035));
          visibility=1-fade*fade*(3-2*fade);
          if(visibility<=0)continue;
        }
        else if(feature===1)y=top+(y-top)*p.open+(1-p.open)*.025;
        y+=p.breathe;const b=1+p.breathe*.45;x*=b;y*=b;z*=b;
        const xx=m[0]*x+m[3]*y+m[6]*z,yy=m[1]*x+m[4]*y+m[7]*z,zz=m[2]*x+m[5]*y+m[8]*z;
        const f=3.2/(3.2-zz-p.depth),px=center[0]+xx*scale*f,py=center[1]+yy*scale*f;
        c.globalAlpha=Math.min(1,d[i+3]*visibility*s.brightness);c.fillStyle=d[i+5]?eye:'#e8edf5';
        if(s.style==='ascii'){const size=Math.max(3,scale*.0102)*f;const glyph=Math.min(7,Math.floor(d[i+3]*8));c.drawImage(d[i+5]?this.tintedAtlas:this.atlas,glyph*32,0,32,32,px-size/2,py-size/2,size,size);}
        else {const r=Math.max(1.1,scale*.0048)*f*.5;c.beginPath();c.arc(px,py,r,0,Math.PI*2);c.fill();}
      }
      c.globalAlpha=1;
    }
  }
  window.JRenderer={Renderer,rotation,version:'3-side-fade'};
})();
