"""Optional offline rebuild from the editable reference. Requires Python + Pillow.
Run in project directory: python tools-build-eye-data.py. Runtime needs neither.
"""
from pathlib import Path
from PIL import Image
import json, math

ROOT = Path(__file__).resolve().parent
im = Image.open(ROOT / 'assets/reference-eyes.png').convert('RGB')
pixels = im.load()
points = []
# The user's reference is already a dot matrix. Preserve its sampled structure,
# including asymmetry, colored iris texture and gray eyebrows.
step = 4.7
for row in range(44):
    py = 70 + row * step
    for col in range(178):
        px = 120 + col * step
        samples = [(pixels[x,y],x,y) for y in range(round(py)-2,round(py)+3)
                   for x in range(round(px)-2,round(px)+3)
                   if 0 <= x < im.width and 0 <= y < im.height]
        (r,g,b),sx,sy = max(samples,key=lambda a:max(a[0]))
        light = max(r,g,b)
        if light < 35:
            continue
        tint = int(b > g*1.25 and b-r > 20)
        eye_center = 324 if sx < im.width/2 else 739
        glint = abs(sx-eye_center) < 32 and 190 < sy < 224
        feature = 0 if sy < 145 else 2 if tint or glint else 1
        x = (px-531.5)/531.5
        y = (py-211)/531.5
        # Slight convex facial dome; eyes lie ahead of brows. Not a flat bitmap.
        z = .13*math.sqrt(max(0,1-(x/1.0)**2))-.05*(y/.35)**2
        if feature == 2: z += .012
        brightness = ((light-10)/245)**1.1
        rank = ((row*374761393 + col*668265263) & 0xffffffff)/0xffffffff
        if feature == 2: rank *= .34  # Protect iris structure at minimum density.
        points.extend(round(v,6) for v in [x,y,z,brightness,feature,tint,rank])
data = {'source':'assets/reference-eyes.png','stride':7,'points':points}
(ROOT/'scripts/eye-data.js').write_text('window.JEyeData = '+json.dumps(data,separators=(',',':'))+';\n',encoding='utf-8')
print(f'Built {len(points)//7} static points.')
