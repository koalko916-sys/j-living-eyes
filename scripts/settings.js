/* Wallpaper Engine host bridge. All values are validated, partial updates supported. */
(function () {
  'use strict';
  const settings = window.JSettings = {
    eyecolor: [0.51, 0.29, 1], mousetracking: true, trackingstrength: 1,
    headmovement: 0.7, idlemovement: 0.65, blinking: true, breathing: 0.45,
    glow: 0.28, animationspeed: 1, density: 1, style: 'dots', scale: 0.72,
    positionx: 0.5, positiony: 0.5, brightness: 1, fps: 60, paused: false,
    revision: 0
  };
  const limits = {
    trackingstrength:[0,2],headmovement:[0,2],idlemovement:[0,2],breathing:[0,2],
    glow:[0,1],animationspeed:[0.1,2],density:[0.35,1],scale:[0.25,1.2],
    positionx:[0,1],positiony:[0,1],brightness:[0.2,2]
  };
  const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  window.wallpaperPropertyListener = {
    applyUserProperties(properties) {
      if (!properties || typeof properties !== 'object') return;
      for (const key of Object.keys(properties)) {
        const value = properties[key] && properties[key].value;
        if (key === 'eyecolor' && typeof value === 'string') {
          const rgb = value.trim().split(/\s+/).map(Number);
          if (rgb.length === 3 && rgb.every(Number.isFinite)) settings.eyecolor = rgb.map(v=>clamp(v,0,1));
        } else if (limits[key]) {
          const n = Number(value);
          if (value !== null && Number.isFinite(n)) settings[key] = clamp(n,...limits[key]);
        } else if (['mousetracking','blinking'].includes(key) && typeof value === 'boolean') {
          settings[key] = value;
        } else if (key === 'style' && ['dots','ascii'].includes(value)) settings.style = value;
      }
      settings.revision++;
    },
    applyGeneralProperties(properties) {
      const n = Number(properties && properties.fps);
      if (Number.isFinite(n) && n > 0) settings.fps = clamp(n,1,240);
    },
    setPaused(value) {
      settings.paused = !!value;
      if (window.JApp) window.JApp.syncPause();
    }
  };
})();
