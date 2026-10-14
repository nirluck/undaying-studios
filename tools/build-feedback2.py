# -*- coding: utf-8 -*-
"""Material de la segunda revisión del cliente (material-de-origen/segundo feedback).

Solo procesa lo nuevo; lo repetido de la primera revisión ya está en
tools/build-salas.py y tools/build-estudio-b.py.

- Portadas de "El sonido de Undying": WebP cuadrado de 400 y 800 px.
- Fotos para probar el home con imagen fija en vez de video: WebP de 900 y
  1600 px en home/public/img.
- Términos y condiciones nuevos del foro (PDF).

    python tools/build-feedback2.py
"""
import os
import shutil
import unicodedata
from PIL import Image, ImageOps

SRC = 'material-de-origen/segundo feedback'


def ruta(nombre):
    for f in os.listdir(SRC):
        if unicodedata.normalize('NFC', f) == unicodedata.normalize('NFC', nombre):
            return os.path.join(SRC, f)
    raise FileNotFoundError(nombre)


def guardar(im, destino, anchos, calidad=80):
    for w in anchos:
        c = im.copy()
        if max(c.size) > w:
            c.thumbnail((w, w), Image.LANCZOS)
        c.save(f'{destino}-{w}.webp', 'WEBP', quality=calidad, method=6)


PORTADAS = {
    'cover-illuminate': 'AK Illmnt Fnl port 2026-01.jpg',
    'cover-a-la-que-venga': 'EvaDavisAlaqueVenga.jpeg',
    'cover-flashlight': 'Flashlight Artwork.png',
    'cover-oveja-negra': 'OvejaNegraGael.jpeg',
    'cover-camino-a-un-sueno': 'Camino a un Sueño EV texto AlbumArt.png',
}
for nombre, fn in PORTADAS.items():
    im = ImageOps.exif_transpose(Image.open(ruta(fn))).convert('RGB')
    guardar(im, f'estudio/public/img/{nombre}', (400, 800))
    print('portada', nombre, im.size)

FONDOS_HOME = {
    'fondo-foro-1': 'Foro_EspacioTrabajo-Opción 1 Foro.png',
    'fondo-foro-2': 'Opción 2 Foro Foro_EspacioTrabajo5.png',
    'fondo-live-room': 'LiveRoom.png',
}
os.makedirs('home/public/img', exist_ok=True)
for nombre, fn in FONDOS_HOME.items():
    im = ImageOps.exif_transpose(Image.open(ruta(fn))).convert('RGB')
    guardar(im, f'home/public/img/{nombre}', (900, 1600), 78)
    print('home', nombre, im.size)

shutil.copy(ruta('TÉRMINOS Y CONDICIONES FORO US.pdf'), 'foro/public/documentos/terminos-y-condiciones-foro.pdf')
print('pdf terminos del foro')
