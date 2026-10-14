# -*- coding: utf-8 -*-
"""Fotos que mandó el cliente en octubre de 2026 para el estudio.

- Tarjetas de "para quién" (fotos sugeridas): WebP de 400, 800 y 1600 px.
- Equipo del Estudio B (carpeta "studio 2"): WebP cuadrado de 520 px sobre
  fondo blanco, recortado al producto, igual que el equipo del Estudio A en
  tools/build-assets.py.

    python tools/build-estudio-b.py
"""
import os
from PIL import Image, ImageChops, ImageOps

SRC = 'material-de-origen'
PUB = 'estudio/public'

# ---------- Tarjetas de "para quién" ----------
CARDS = {
    'aud-banda': 'LiveSessionVidaIn-foto sugerida para banda.jpeg',
    'aud-productores': 'WorkStationD-sugerida para productores e ingenieros.jpeg',
    'aud-podcast': 'DSC03101 (1) 2-sugeridos para podcast y locucion.JPG',
}
for name, fn in CARDS.items():
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, fn))).convert('RGB')
    for w in (400, 800, 1600):
        c = im.copy()
        if max(c.size) > w:
            c.thumbnail((w, w), Image.LANCZOS)
        c.save(os.path.join(PUB, 'img', f'{name}-{w}.webp'), 'WEBP', quality=80 if w == 1600 else 76, method=6)
    print('img', name, im.size)

# ---------- Equipo del Estudio B ----------
G = os.path.join(SRC, 'studio 2')
GEAR_B = {
    'lauten-atlantis': 'Lauten Audio Atlantis FC-387.png',
    'wunder-cm7': 'Microfono Wunder Audio CM7-GT_M7.jpeg',
    'antelope-orion-32': 'Antelope Orion 32+.png',
    'ssl-xdesk': 'SSL XDESK MIXER.jpg',
    'avalon-vt737sp': 'Avalon VT 737SP Tube Channel Strip.jpeg',
    'burl-bomber-adc': 'BURL BOMBER ADC ANALOG _ DIGITAL CONVERTER.png',
    'dynaudio-bm15a': 'DYNAUDIO BM15A.jpeg',
    'ssl-g-comp': 'SSL G SERIES STEREO COMPRESSOR.png',
    'ssl-fusion': 'SSL Fusion Analog Master Processor.png',
    'bettermaker-limiter': 'Bettermaker mastering limiter v2.JPG',
    'bettermaker-eq': 'Bettermaker Valve Stereo Passive Equalizer.avif',
    'darkglass-anagram': 'Darkglass Anagram Multi-Effects Unit para bajo y guitarra.jpeg',
}
# El PNG del Lauten trae una línea negra bajo el micrófono (fila 1012 de 1018)
RECORTE = {'lauten-atlantis': lambda im: im.crop((0, 0, im.width, 1008))}
S = 520
for name, fn in GEAR_B.items():
    im = Image.open(os.path.join(G, fn))
    if name in RECORTE:
        im = RECORTE[name](im)
    if im.mode in ('P', 'LA', 'RGBA'):
        im = im.convert('RGBA'); bg = Image.new('RGBA', im.size, 'white'); bg.alpha_composite(im); im = bg
    im = ImageOps.exif_transpose(im).convert('RGB')
    # recorta el borde blanco para centrar el producto
    diff = ImageChops.difference(im, Image.new('RGB', im.size, (255, 255, 255)))
    diff = ImageOps.grayscale(diff).point(lambda p: 255 if p > 18 else 0)
    box = diff.getbbox()
    if box:
        im = im.crop(box)
    im.thumbnail((int(S * .84), int(S * .84)), Image.LANCZOS)
    canvas = Image.new('RGB', (S, S), 'white')
    canvas.paste(im, ((S - im.width) // 2, (S - im.height) // 2))
    canvas.save(os.path.join(PUB, 'gear', f'{name}.webp'), 'WEBP', quality=82, method=6)
    print('gear', name, im.size)
