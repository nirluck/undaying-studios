# -*- coding: utf-8 -*-
"""Prepara las dos fotos del home (foro y estudio) en 900 y 1600 px WebP.

La del foro se descarga del WordPress del foro, que es donde vive el material
audiovisual; la del estudio sale de public/img, ya optimizada.

    python tools/build-home-assets.py
"""
import io
import pathlib
import urllib.request

from PIL import Image

OUT = pathlib.Path("home/public/img")
OUT.mkdir(parents=True, exist_ok=True)
WP = "https://undyingstudios.mx/wp-content/uploads/2025/03/"

FUENTES = {
    # Rodaje de podcast sobre el ciclorama blanco: gente trabajando y se lee el foro.
    "foro": WP + "Foro_WIP1.webp",
    # Rodaje con croma verde, por si se quiere cambiar la del foro.
    "foro-alt": WP + "Foro_undaying7.webp",
    # Live session en el Live Room.
    "estudio": "public/img/live-12-1600.webp",
    # Baterista en el Live Room, por si se quiere una toma más cálida.
    "estudio-alt": "public/img/live-04-1600.webp",
}


def abrir(origen: str) -> Image.Image:
    if origen.startswith("http"):
        pedido = urllib.request.Request(origen, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(pedido) as r:
            return Image.open(io.BytesIO(r.read())).convert("RGB")
    return Image.open(origen).convert("RGB")


for nombre, origen in FUENTES.items():
    im = abrir(origen)
    for ancho in (900, 1600):
        if im.width < ancho:
            continue
        alto = round(ancho * im.height / im.width)
        destino = OUT / f"{nombre}-{ancho}.webp"
        im.resize((ancho, alto), Image.LANCZOS).save(destino, "WEBP", quality=80, method=6)
        print(f"{destino}  {ancho}x{alto}  {destino.stat().st_size // 1024} KB")
