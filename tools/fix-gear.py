# -*- coding: utf-8 -*-
"""Limpia el fondo de fotos de equipo que vienen sobre gris o blanco sucio.

Las tarjetas del catálogo mezclan la foto con el fondo usando multiply, así
que cualquier fondo que no sea blanco puro se ve como un recuadro gris. Este
script toma el color del fondo desde las orillas, lo vuelve blanco con un
borde suave (solo lo que está conectado con la orilla, para no comerse partes
claras del equipo) y recorta al producto en un cuadro de 520 px.

    python tools/fix-gear.py
"""
import pathlib

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = pathlib.Path("material-de-origen/fotos de el estudio/Equipo/04 Equipo")
OUT = pathlib.Path("estudio/public/gear")

# salida: (foto original, brillo mínimo del fondo en cada canal)
FOTOS = {
    "apogee-rosetta-800": (SRC / "Rosetta 800" / "1_93ccfed9cf835cdf1a0d2a3f013f0c52.jpg", 215),
    "yamaha-pss780": (SRC / "Yamaha PortaSound PSS-780.webp", 168),
}


def limpiar(ruta: pathlib.Path, tol: int) -> Image.Image:
    im = np.asarray(Image.open(ruta).convert("RGB")).astype(np.float32)
    h, w, _ = im.shape
    # El fondo es claro y casi sin color; tiene viñeteo, así que no sirve
    # compararlo contra un solo color: se usa brillo mínimo y saturación.
    claro = im.min(axis=2) > tol
    gris = (im.max(axis=2) - im.min(axis=2)) < 24
    # Los bordes del equipo frenan el relleno: así no se come paneles plateados
    lum = im.mean(axis=2)
    borde = np.zeros_like(lum, dtype=bool)
    borde[:, 1:] |= np.abs(np.diff(lum, axis=1)) > 7
    borde[1:, :] |= np.abs(np.diff(lum, axis=0)) > 7
    candidato = claro & gris & ~borde
    # Solo cuenta como fondo lo que toca la orilla: relleno desde el borde
    # .copy(): fromarray comparte memoria de solo lectura y floodfill no escribiría
    capa = Image.fromarray((candidato * 255).astype(np.uint8)).copy()
    for x in range(0, w, 4):
        for y in (0, h - 1):
            if capa.getpixel((x, y)) == 255:
                ImageDraw.floodfill(capa, (x, y), 128)
    for y in range(0, h, 4):
        for x in (0, w - 1):
            if capa.getpixel((x, y)) == 255:
                ImageDraw.floodfill(capa, (x, y), 128)
    mascara = np.asarray(capa) == 128
    # Quita objetos sueltos chicos: esquinas de mesa, polvo o sombras
    objetos = Image.fromarray((~mascara * 255).astype(np.uint8)).copy()
    tamanos = {}
    for valor in range(1, 250):
        arr = np.asarray(objetos)
        pendientes = np.flatnonzero(arr == 255)
        if not len(pendientes):
            break
        y, x = divmod(int(pendientes[0]), w)
        ImageDraw.floodfill(objetos, (x, y), valor)
        tamanos[valor] = int((np.asarray(objetos) == valor).sum())
    if tamanos:
        # Se quedan las piezas grandes (un equipo puede quedar en dos partes,
        # p. ej. la tapa y el panel frontal); se va lo que mide menos del 4 %.
        mayor = max(tamanos.values())
        conservar = [v for v, n in tamanos.items() if n >= mayor * 0.04]
        mascara = ~np.isin(np.asarray(objetos), conservar)
    # Borde suave entre producto y fondo
    alfa = Image.fromarray((mascara * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    a = np.asarray(alfa).astype(np.float32)[..., None] / 255
    limpio = im * (1 - a) + 255 * a
    # Recorte al producto con margen y cuadro blanco
    ys, xs = np.where(~mascara)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    lado = int(max(y1 - y0, x1 - x0) * 1.12)
    lienzo = Image.new("RGB", (lado, lado), "white")
    pieza = Image.fromarray(limpio.clip(0, 255).astype(np.uint8)).crop((x0, y0, x1 + 1, y1 + 1))
    lienzo.paste(pieza, ((lado - pieza.width) // 2, (lado - pieza.height) // 2))
    return lienzo.resize((520, 520), Image.LANCZOS)


for nombre, (ruta, tol) in FOTOS.items():
    limpiar(ruta, tol).save(OUT / f"{nombre}.webp", "WEBP", quality=84, method=6)
    print(nombre, "listo")
