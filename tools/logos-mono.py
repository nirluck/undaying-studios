# Convierte los logotipos renderizados a PNG blanco con transparencia (2x de 30 px).
# silhouette: todo lo opaco queda blanco. knockout: solo lo claro queda blanco
# (sirve para logos con caja de color y letras blancas, como Colgate o Samsung).
import os
from PIL import Image
RAW = 'tools/.logo-raw'; OUT = 'public/clients'
MODE = {'colgate': 'knockout', 'samsung': 'knockout', 'fiat': 'knockout', 'burger-king': 'knockout'}
SKIP = {'paramount', 'fiat'}  # fotografía y emblema cromado: no funcionan en monocromo
def smooth(x, a, b):
    t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
for f in sorted(os.listdir(RAW)):
    name = f[:-4]
    if name in SKIP: continue
    im = Image.open(os.path.join(RAW, f)).convert('RGBA')
    px = im.load(); w, h = im.size
    out = Image.new('RGBA', (w, h), (255, 255, 255, 0)); po = out.load()
    mode = MODE.get(name, 'silhouette')
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0: continue
            if mode == 'knockout':
                lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
                a = int(a * smooth(lum, 0.6, 0.85))
            po[x, y] = (255, 255, 255, a)
    box = out.getbbox()
    if box: out = out.crop(box)
    out.thumbnail((400, 60), Image.LANCZOS)
    out.save(os.path.join(OUT, name + '.png'))
    print(name, mode, out.size)
