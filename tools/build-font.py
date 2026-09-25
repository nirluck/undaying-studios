# -*- coding: utf-8 -*-
"""Genera public/fonts/norwester.woff2 a partir del OTF original.

Norwester solo trae A-Z, a-z, números y signos básicos: le faltan las vocales
acentuadas, la eñe, la diéresis, el punto medio y los signos de apertura que
usa el español. Este script convierte el OTF a TrueType y compone los glifos
que faltan con los que sí existen, para que los textos en Norwester no se
mezclen con otra tipografía a media palabra.

Uso:  python tools/build-font.py
"""
import os
from fontTools.ttLib import TTFont, newTable
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'material-de-origen', 'fuente', 'norwester', 'norwester.otf')
OUT = os.path.join(ROOT, 'public', 'fonts', 'norwester.woff2')

font = TTFont(SRC)
upm = font['head'].unitsPerEm
glyphSet = font.getGlyphSet()
order = list(font.getGlyphOrder())
cmap = dict(font.getBestCmap())

# ---------- OTF (curvas cúbicas) -> TrueType (cuadráticas) ----------
glyf = newTable('glyf')
glyf.glyphOrder = order
glyf.glyphs = {}
for name in order:
    pen = TTGlyphPen(None)
    glyphSet[name].draw(Cu2QuPen(pen, 1.0))
    glyf[name] = pen.glyph()

hmtx = font['hmtx'].metrics
cap = font['OS/2'].sCapHeight if hasattr(font['OS/2'], 'sCapHeight') and font['OS/2'].sCapHeight else round(upm * 0.7)
xh = font['OS/2'].sxHeight if hasattr(font['OS/2'], 'sxHeight') and font['OS/2'].sxHeight else round(upm * 0.5)

def box(pen, x1, y1, x2, y2):
    pen.moveTo((x1, y1)); pen.lineTo((x2, y1)); pen.lineTo((x2, y2)); pen.lineTo((x1, y2)); pen.closePath()

def add(name, draw, width=0, code=None):
    pen = TTGlyphPen(None)
    draw(pen)
    glyf[name] = pen.glyph()
    hmtx[name] = (width, 0)
    if code is not None:
        cmap[code] = name

# ---------- Marcas diacríticas, con el trazo geométrico de Norwester ----------
T = round(upm * 0.085)          # grosor de la marca
MW = round(upm * 0.17)          # ancho de la marca
MH = round(upm * 0.13)          # alto de la marca

def acute(pen):                  # tilde de á, é, í, ó, ú
    s = round(MW * 0.55)
    pen.moveTo((0, 0)); pen.lineTo((T, 0)); pen.lineTo((T + s, MH)); pen.lineTo((s, MH)); pen.closePath()

def dieresis(pen):               # ü
    box(pen, 0, 0, T, T)
    box(pen, MW - T, 0, MW, T)

def tilde(pen):                  # ñ
    w, h, t = MW * 1.15, MH * 0.8, T * 0.85
    pen.moveTo((0, 0))
    pen.qCurveTo((w * 0.28, h * 1.25), (w * 0.5, h * 0.55))
    pen.qCurveTo((w * 0.72, h * 0.02), (w, h * 0.72))
    pen.lineTo((w, h * 0.72 + t))
    pen.qCurveTo((w * 0.72, h * 0.02 + t * 1.4), (w * 0.5, h * 0.55 + t))
    pen.qCurveTo((w * 0.28, h * 1.25 + t * 1.4), (0, t))
    pen.closePath()

add('acutecomb', acute)
add('dieresiscomb', dieresis)
add('tildecomb', tilde)

# ---------- Glifos compuestos: base + marca ----------
GAP = round(upm * 0.055)

def compose(name, base, mark, code, lowercase):
    # Norwester dibuja las minúsculas con altura de mayúscula, así que la marca
    # se coloca sobre el alto real del glifo y no sobre la altura de x teórica.
    g = glyf[base]
    g.recalcBounds(glyf)
    top = max(g.yMax, xh if lowercase else cap)
    bw = hmtx[base][0]
    mw = MW * 1.15 if mark == 'tildecomb' else MW
    pen = TTGlyphPen({n: glyf[n] for n in glyf.keys()})
    pen.addComponent(base, (1, 0, 0, 1, 0, 0))
    pen.addComponent(mark, (1, 0, 0, 1, round((bw - mw) / 2), top + GAP))
    glyf[name] = pen.glyph()
    hmtx[name] = (bw, 0)
    cmap[code] = name

ACCENTED = [
    ('Aacute', 'A', 'acutecomb', 0x00C1, False), ('Eacute', 'E', 'acutecomb', 0x00C9, False),
    ('Iacute', 'I', 'acutecomb', 0x00CD, False), ('Oacute', 'O', 'acutecomb', 0x00D3, False),
    ('Uacute', 'U', 'acutecomb', 0x00DA, False), ('Udieresis', 'U', 'dieresiscomb', 0x00DC, False),
    ('Ntilde', 'N', 'tildecomb', 0x00D1, False),
    ('aacute', 'a', 'acutecomb', 0x00E1, True), ('eacute', 'e', 'acutecomb', 0x00E9, True),
    ('iacute', 'dotlessi', 'acutecomb', 0x00ED, True), ('oacute', 'o', 'acutecomb', 0x00F3, True),
    ('uacute', 'u', 'acutecomb', 0x00FA, True), ('udieresis', 'u', 'dieresiscomb', 0x00FC, True),
    ('ntilde', 'n', 'tildecomb', 0x00F1, True),
]
# La í acentuada va sin punto: se copia la i y se descarta el contorno de arriba.
from fontTools.pens.recordingPen import RecordingPen

rec = RecordingPen()
glyphSet['i'].draw(Cu2QuPen(rec, 1.0))
contours = []
for op, args in rec.value:
    if op == 'moveTo':
        contours.append([])
    if contours:
        contours[-1].append((op, args))
def top_of(contour):
    ys = [pt[1] for op, args in contour for pt in args if isinstance(pt, tuple)]
    return max(ys) if ys else 0
body = [c for c in contours if top_of(c) <= xh * 1.15] or contours
pen = TTGlyphPen(None)
for contour in body:
    for op, args in contour:
        getattr(pen, op)(*args)
glyf['dotlessi'] = pen.glyph()
hmtx['dotlessi'] = hmtx['i']

for name, base, mark, code, lower in ACCENTED:
    compose(name, base, mark, code, lower)

# ---------- Signos que faltan: · ¿ ¡ ----------
add('periodcentered', lambda pen: box(pen, round(upm * 0.06), round(xh * 0.42), round(upm * 0.06) + T, round(xh * 0.42) + T), round(upm * 0.2), 0x00B7)

def flipped(name, base, code):
    bw, _ = hmtx[base]
    bounds = glyf[base]
    bounds.recalcBounds(glyf)
    pen = TTGlyphPen({n: glyf[n] for n in glyf.keys()})
    pen.addComponent(base, (-1, 0, 0, -1, bw, cap))
    glyf[name] = pen.glyph()
    hmtx[name] = (bw, 0)
    cmap[code] = name

flipped('questiondown', 'question', 0x00BF)
flipped('exclamdown', 'exclam', 0x00A1)

# ---------- Ensamblado ----------
order = list(glyf.glyphOrder)
assert len(order) == len(glyf.glyphs), (len(order), len(glyf.glyphs))
font.setGlyphOrder(order)
font['glyf'] = glyf
font['loca'] = newTable('loca')
for t in ('CFF ', 'VORG'):
    if t in font:
        del font[t]
# maxp en formato TrueType: los campos de hinting van en cero, el resto se recalcula.
maxp = newTable('maxp')
maxp.tableVersion = 0x00010000
maxp.numGlyphs = len(order)
maxp.maxZones = 1
maxp.maxTwilightPoints = 0
maxp.maxStorage = 0
maxp.maxFunctionDefs = 0
maxp.maxInstructionDefs = 0
maxp.maxStackElements = 0
maxp.maxSizeOfInstructions = 0
maxp.maxComponentElements = 2
maxp.maxComponentDepth = 1
font['maxp'] = maxp
font['head'].indexToLocFormat = 0
font['post'].formatType = 3.0
cm = font['cmap'].tables[0]
for table in font['cmap'].tables:
    table.cmap = cmap
font['hmtx'].metrics = hmtx

os.makedirs(os.path.dirname(OUT), exist_ok=True)
font.recalcBBoxes = True
font.flavor = 'woff2'
font.save(OUT)
print('glifos:', len(order), '| woff2:', os.path.getsize(OUT), 'bytes ->', OUT)
