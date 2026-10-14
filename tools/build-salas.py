# -*- coding: utf-8 -*-
"""Selección de fotos del cliente para las salas y reemplazos del equipo.

- Galerías de Live Room, Control Room, Amenidades y Estudio B: WebP de
  400, 800 y 1600 px en estudio/public/img (lr-01…, cr-01…, am-01…, eb-01…).
  El orden de cada lista es el orden de la galería; la primera es la portada.
- Equipo: reemplazos de fotos mal recortadas (Apogee Rosetta 800, Yamaha
  PSS-780) y las que faltaban (Jay Turser, congas), en cuadro blanco de 520 px
  igual que el resto del equipo.

    python tools/build-salas.py
"""
import os
import unicodedata
from PIL import Image, ImageChops, ImageOps

SRC = 'material-de-origen'
PUB = 'estudio/public'


def abrir(carpeta, nombre):
    # Los nombres con acento pueden venir descompuestos (NFD) desde macOS
    for f in os.listdir(carpeta):
        if unicodedata.normalize('NFC', f) == unicodedata.normalize('NFC', nombre):
            return Image.open(os.path.join(carpeta, f))
    raise FileNotFoundError(os.path.join(carpeta, nombre))


GALERIAS = {
    'lr': ('seleccion fotos Live Room', [
        'LiveRoomFront.png', 'LiveSessionVidaIn.jpeg', 'EnsayoVidaInLR.png', 'LiveRoomVidaInVacía.png',
        'EnsayoMarAbreuLR.png', 'LiveRoom Hiwatt.jpg', 'Tracking Drums.jpg', 'Tuning Drums.jpg',
        'Tracking Vocals.jpg', 'Reamp Guitars.jpg', 'Caja de Conectores.jpg', 'Panorámica Estudio.png',
    ]),
    'cr': ('Selección Fotos Control Room', [
        'ControlRoomC.jpg', 'Control Room Full.jpg', 'Control Room Derecha.jpg', 'Control Room Molduras H.jpeg',
        'Control Room Back.jpg', 'ControlRoomTracking.jpg', 'Tracking Guitars.jpg', 'Control Room Molduras V.jpeg',
    ]),
    'am': ('Selección fotos Amenidades/Amenidades', [
        'CamerinoArcade.png', 'CamerinoB.png', 'CamerinoF.png', 'MujerMaquillaje.png',
        'Cocina.png', 'TerrazaAsador.jpg', 'TerrazaAzador2.jpg', 'TrrazaFuente.jpg',
    ]),
    'eb': ('Fotos Estudio B/Control Room B', [
        'WhatsApp Image 2026-09-29 at 11.08.46.jpeg', 'WhatsApp Image 2026-09-29 at 11.08.47 (1).jpeg',
        'WhatsApp Image 2026-09-29 at 11.08.47.jpeg', 'WhatsApp Image 2026-09-29 at 11.08.46 (1).jpeg',
        'WhatsApp Image 2026-09-29 at 11.08.47 (3).jpeg', 'WhatsApp Image 2026-09-29 at 11.08.47 (2).jpeg',
        'WhatsApp Image 2026-09-29 at 11.08.46 (2).jpeg',
    ]),
}
for prefijo, (carpeta, fotos) in GALERIAS.items():
    for i, fn in enumerate(fotos, 1):
        im = ImageOps.exif_transpose(abrir(os.path.join(SRC, carpeta), fn)).convert('RGB')
        nombre = f'{prefijo}-{i:02d}'
        for w in (400, 800, 1600):
            c = im.copy()
            if max(c.size) > w:
                c.thumbnail((w, w), Image.LANCZOS)
            c.save(os.path.join(PUB, 'img', f'{nombre}-{w}.webp'), 'WEBP', quality=80 if w == 1600 else 76, method=6)
        print('img', nombre, im.size, fn)

# ---------- Equipo: reemplazos y faltantes ----------
G = os.path.join(SRC, 'Reemplazar imagenes con fondo mal recortado y faltantes')
EQUIPO = {
    'apogee-rosetta-800': 'Apogee Roseta 800 F.png',
    'yamaha-pss780': 'Yamaha PortaSound PSS-780 2.png',
    'jay-turser': 'Guitarra Jay Tarser.png',
    'congas': 'Par de Congas.jpeg',
}
S = 520
for name, fn in EQUIPO.items():
    im = abrir(G, fn)
    if im.mode in ('P', 'LA', 'RGBA'):
        im = im.convert('RGBA'); bg = Image.new('RGBA', im.size, 'white'); bg.alpha_composite(im); im = bg
    im = ImageOps.exif_transpose(im).convert('RGB')
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
