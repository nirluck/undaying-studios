# -*- coding: utf-8 -*-
"""Prepara el material del foro en foro/public/.

Las fotos y los PDF salen del WordPress actual del foro (undyingstudios.mx),
que es donde vive el material audiovisual. Se copian al proyecto para que la
landing nueva no dependa del sitio viejo cuando se reemplace.

    python tools/build-foro-assets.py            # todo
    python tools/build-foro-assets.py amplificador  # solo esas fotos
"""
import io
import pathlib
import shutil
import sys
import urllib.request

from PIL import Image

ROOT = pathlib.Path("foro/public")
IMG = ROOT / "img"
DOCS = ROOT / "documentos"
WP = "https://undyingstudios.mx/wp-content/uploads/"

# nombre en el proyecto: archivo original en el WordPress
FOTOS = {
    # Producciones (hero y galería)
    "podcast": "2025/03/Foro_WIP1.webp",
    "croma-rodaje": "2025/03/Foro_undaying7.webp",
    "sesion-foto": "2025/03/Foro_WIP3_bn.webp",
    "entrevista": "2025/03/Foro_WIP6.webp",
    "montaje": "2025/04/foro-undying-studios.webp",
    "croma-portatil": "2025/03/foro-web.webp",
    # El foro vacío
    "ciclorama-01": "2025/03/Foro_undaying1.webp",
    "ciclorama-02": "2025/03/Foro_undaying3.webp",
    "ciclorama-03": "2025/03/Foro_undaying5.webp",
    "croma-azul": "2025/03/Foro_undaying2.webp",
    "croma-verde": "2025/03/Foro_undaying6.webp",
    "fondo-negro": "2025/03/Foro_undaying4.webp",
    "luces": "2025/03/Foro_WIP8.webp",
    "amplificador": "2025/03/Foro_amplifier-1.webp",
    # Fondo de la sección de reseñas
    "resenas-fondo": "2025/03/undying-studios.webp",
    # Amenidades
    "camerino": "2025/03/Foro_Amenidades3-e1743496791308.webp",
    "terraza": "2025/04/amenidades-foro-undying-studios-2.webp",
    "sala": "2025/04/amenidades-foro-undying-studios-3.webp",
    "sala-02": "2025/04/amenidades-foro-undying-studios-4.webp",
    "cocina": "2025/04/amenidades-foro-undying-studios.webp",
}

PDFS = {
    "manual-tecnico-foro.pdf": WP + "2025/09/Manual-Tecnico-US.pdf",
    "reglamento-foro.pdf": "https://undyingstudios.mx/documentos/Reglamento-para-Uso-del-Foro-Undying-Studios.pdf",
    "terminos-y-condiciones-foro.pdf": "https://undyingstudios.mx/documentos/terminos-y-condiciones.pdf",
}


def bajar(url: str) -> bytes:
    pedido = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(pedido) as r:
        return r.read()


def guardar(nombre: str, im: Image.Image) -> None:
    im = im.convert("RGB")
    for ancho in (400, 800, 1600):
        w = min(ancho, im.width)  # las de amenidades miden 1200: no se agrandan
        h = round(w * im.height / im.width)
        destino = IMG / f"{nombre}-{ancho}.webp"
        im.resize((w, h), Image.LANCZOS).save(destino, "WEBP", quality=80, method=6)
    print(f"{nombre:16} {im.width}x{im.height}")


IMG.mkdir(parents=True, exist_ok=True)
DOCS.mkdir(parents=True, exist_ok=True)

SOLO = sys.argv[1:]
for nombre, ruta in FOTOS.items():
    if not SOLO or nombre in SOLO:
        guardar(nombre, Image.open(io.BytesIO(bajar(WP + ruta))))
if SOLO:
    sys.exit()
for nombre, url in PDFS.items():
    (DOCS / nombre).write_bytes(bajar(url))
    print(f"{nombre:32} {(DOCS / nombre).stat().st_size // 1024} KB")

# Logo (las tipografías salen de shared/fonts)
(ROOT / "brand").mkdir(exist_ok=True)
shutil.copy("estudio/public/brand/monograma-blanco.svg", ROOT / "brand")
