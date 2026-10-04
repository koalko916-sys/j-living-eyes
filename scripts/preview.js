(function(){
  'use strict';
  const fields=document.getElementById('fields');
  const specs=[['eyecolor','Цвет глаз','color'],['style','Рисунок','select'],['mousetracking','Следить за мышью','checkbox'],['blinking','Моргание','checkbox'],['trackingstrength','Сила трекинга','range',0,2],['headmovement','Повороты X/Y/Z','range',0,2],['idlemovement','Движения в покое','range',0,2],['breathing','Дыхание','range',0,2],['glow','Свечение','range',0,1],['scale','Размер','range',.25,1.2],['brightness','Яркость','range',.2,2],['density','Плотность','range',.35,1],['animationspeed','Скорость','range',.1,2],['positionx','Положение X','range',0,1],['positiony','Положение Y','range',0,1]];
  for(const [key,label,type,min,max] of specs){
    const row=document.createElement('label');row.textContent=label;
    const input=document.createElement(type==='select'?'select':'input');input.id='control-'+key;
    if(type==='select'){for(const [value,text] of [['dots','Точки'],['ascii','ASCII']]){const opt=document.createElement('option');opt.value=value;opt.textContent=text;input.append(opt);}}
    else input.type=type;
    const value=JSettings[key];
    if(type==='checkbox')input.checked=value;
    else if(type==='color')input.value='#'+value.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
    else input.value=value;
    if(type==='range'){input.min=min;input.max=max;input.step=.01;const out=document.createElement('output');out.value=value;row.append(out);fields.append(row,input);input.addEventListener('input',()=>out.value=input.value);}
    else {row.append(input);fields.append(row);}
    input.addEventListener('input',()=>{let v=type==='checkbox'?input.checked:type==='range'?Number(input.value):input.value;if(type==='color')v=[1,3,5].map(i=>parseInt(input.value.slice(i,i+2),16)/255).join(' ');wallpaperPropertyListener.applyUserProperties({[key]:{value:v}});});
  }
  document.getElementById('pause').onclick=function(){wallpaperPropertyListener.setPaused(!JSettings.paused);this.textContent=JSettings.paused?'Продолжить':'Пауза';};
  document.getElementById('reset').onclick=()=>location.reload();
  document.addEventListener('keydown',e=>{if(e.code==='KeyH'){const panel=document.getElementById('controls');panel.hidden=!panel.hidden;document.getElementById('hint').hidden=panel.hidden;}});
})();
