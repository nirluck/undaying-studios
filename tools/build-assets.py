# -*- coding: utf-8 -*-
"""Procesa material-de-origen/ hacia public/.
Fotos -> WebP 800/1600 con orientación EXIF corregida.
Equipo -> WebP cuadrado 520 px sobre fondo blanco, recortado al contenido.
Clientes -> copia de SVG/WebP.
Portafolio -> miniaturas de YouTube en WebP.
Se puede volver a correr cuando el cliente mande fotos nuevas."""
import io, os, shutil, urllib.request
from PIL import Image, ImageOps, ImageChops
import pillow_heif
pillow_heif.register_heif_opener()

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'material-de-origen', 'fotos de el estudio')
PUB = os.path.join(ROOT, 'public')
for d in ('img', 'gear', 'clients', 'portfolio'):
    os.makedirs(os.path.join(PUB, d), exist_ok=True)

# ---------- Fotos del estudio ----------
PHOTOS = {
    'control-01': 'Control Room 01.jpeg',
    'control-02': 'Control Room 02.jpg',
    'control-03': 'Control Room 07.jpeg',
    'control-04': 'Control Room 04.JPEG',
    'control-05': 'Control Room 05.JPG',
    'control-06': 'Control Room 06.JPEG',
    'control-07': 'Control Room 07.JPG',
    'engineer':   'Control Room - ingeniero 03.JPEG',
    'live-01': 'Live Room.JPG',
    'live-02': 'Live Room 02.JPG',
    'live-03': 'Live Room 03.JPG',
    'live-04': 'Live Room 04.JPG',
    'live-05': 'Live Room 05.JPG',
    'live-06': 'Live Room 06.JPG',
    'live-08': 'Live Room 08.JPG',
    'live-09': 'Live Room 09.JPG',
    'live-10': 'Live Room 10.JPG',
    'live-11': 'Live Room 11.JPG',
    'live-12': 'Live Room 12.HEIC',
    'live-13': 'Live Room 13.JPG',
    'live-14': 'Live Room 14.JPG',
    'lounge-01': 'area-de-descanso-01.JPG',
    'lounge-02': 'area-de-descanso-02.JPG',
    'lounge-03': 'area-de-descanso-03.JPG',
    'team': 'team.JPG',
}
for name, fn in PHOTOS.items():
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, fn))).convert('RGB')
    for w in (800, 1600):
        c = im.copy()
        if max(c.size) > w:
            c.thumbnail((w, w) if c.width < c.height else (w, w * 4))
        c.save(os.path.join(PUB, 'img', f'{name}-{w}.webp'), 'WEBP', quality=80 if w == 1600 else 76, method=6)
    print('img', name, im.size)

# ---------- Equipo ----------
G = os.path.join(SRC, 'Equipo', '04 Equipo')
GEAR = {
    'krk-rokit-8': 'Rokit 8.jpeg',
    'krk-sub-10s': 'KRK Sub 10s.webp',
    'yamaha-hs50': 'HS50.jpg',
    'm-audio-profire-2626': 'M-Audio_ProFire_2626.jpg',
    'focusrite-octopre': 'OctoPreMKII/OctoPre MKii.jpg',
    'broadhurst-gardens': 'D.A.V/bg1photo.jpg',
    'apogee-rosetta-800': 'Rosetta 800/1_93ccfed9cf835cdf1a0d2a3f013f0c52.jpg',
    'shure-sm57': 'SM57.jpg',
    'shure-sm58': 'SM58.jpg',
    'shure-pg48': 'PG48.jpg',
    'shure-beta-52': 'Beta 52/beta_52_main__68039.webp',
    'shure-beta-57a': 'Beta 57A.jpg',
    'shure-beta-91': 'shure-91-g.jpg',
    'akg-c414': '760.webp',
    'slate-ml2': 'preview.jpg',
    'at-atm450': 'ATM450.jpg',
    'wurlitzer': 'Piano Wurlitzer Reg US PAT OFF Dekalb illinois US.jpeg',
    'rmv-x5': 'RMV_Drums.jpeg',
    'yamaha-p105': 'Digital Piano P-105 Yamaha.jpg',
    'yamaha-pss470': 'Yamaha PortaSound PSS-470.jpg',
    'yamaha-pss780': 'Yamaha PortaSound PSS-780.webp',
    'yamaha-dx21': 'Yamaha DX21.jpeg',
    'casio-mt750': 'Casio MT-750.jpeg',
    'epiphone-sg': 'Epiphone SG.jpg',
    'peavey-tnt115': 'Peavey TNT115.jpg',
    'crate-pa8fx': 'Crate PA8FX.jpeg',
    'cerwin-vega-v15b': 'Cerwin-Vega! V-15B.jpeg',
    'alto-l20': 'ALTO_L201.jpg',
    'yorkville-ysm1p': 'Yorkville YSM1p.jpeg',
    'tascam-porta-two': 'Tascam Ministudio PortaTwo.jpeg',
    'novation-lcxl': 'Novation LaunchControl XL.jpg',
    'sony-ps-t25': 'Tornamesa SONY PS-T25.webp',
}
S = 520
for name, fn in GEAR.items():
    im = Image.open(os.path.join(G, fn))
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
print('gear', len(GEAR))

# ---------- Clientes ----------
C = os.path.join(SRC, 'Clientes', '03 Clientes')
CLIENTS = {
    'samsung': 'Samsung.svg', 'coca-cola': 'Coca-Cola_(Bold).svg', 'colgate': 'Colgate_(2018).svg',
    'fox': 'Fox.svg', 'mtv': 'MTV-2021.svg', 'nickelodeon': 'Nickelodeon-2023-altvariant.svg',
    'paramount': 'Paramount_2025_Logo.webp', 'tv-azteca': 'TV_Azteca_(2015).svg', 'claro': 'ClaroM_3FsicaTV.webp',
    'huawei': 'Huawei_2018.svg', 'burger-king': 'Burger_King_2020.svg', 'fiat': 'Fiat_2006.svg',
    'starz': 'STARZ-2022.svg', 'paper-mate': 'Paper_Mate__282013_29.webp', 'gemini': 'Gemini_2025.svg',
}
for name, fn in CLIENTS.items():
    ext = os.path.splitext(fn)[1].lower()
    # Los originales van a tools/.logo-src. Después corre:
    #   node tools/logos-render.mjs && python tools/logos-mono.py
    # para generar los PNG blancos que usa la cinta de clientes.
    os.makedirs(os.path.join(ROOT, 'tools', '.logo-src'), exist_ok=True)
    shutil.copyfile(os.path.join(C, fn), os.path.join(ROOT, 'tools', '.logo-src', name + ext))
print('clients', len(CLIENTS))

# ---------- Miniaturas de YouTube ----------
YT = ['5VoHfpRIwtM', 'Fi3fnLuwUw4', 'GelEJmHYRhs', 'TLj5tRVr9ZY', 'sMu77iWg7CM', 'JTQTn4a-ajE', 'FaZrvZ7yIpM',
      'VPnYTc6e4no', 'f19f0gvge0Y', 'y3iv4sxZxPQ', 'VAXCMwjb568', 'uuRFOkEHePY', 'ShNGvolpIJE']
for vid in YT:
    data = None
    for q in ('maxresdefault', 'sddefault', 'hqdefault'):
        try:
            data = urllib.request.urlopen(f'https://i.ytimg.com/vi/{vid}/{q}.jpg', timeout=20).read()
            im = Image.open(io.BytesIO(data)).convert('RGB')
            if q == 'maxresdefault' and im.width < 1000:
                continue
            break
        except Exception:
            data = None
    # recorta barras negras de 4:3 a 16:9
    w, h = im.size
    th = round(w * 9 / 16)
    if th < h:
        top = (h - th) // 2; im = im.crop((0, top, w, top + th))
    im.thumbnail((960, 540))
    im.save(os.path.join(PUB, 'portfolio', f'{vid}.webp'), 'WEBP', quality=80, method=6)
    print('yt', vid, q, im.size)
