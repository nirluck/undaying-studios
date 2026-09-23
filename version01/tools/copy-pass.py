# -*- coding: utf-8 -*-
"""Aplica la revisión de copy (cabeceras, leads, descripciones). Se ejecuta una vez."""
import io, os, sys
os.chdir(os.path.join(os.path.dirname(__file__), '..'))

def apply(path, pairs):
    s = io.open(path, encoding='utf-8').read(); miss = []
    for a, b in pairs:
        if a not in s: miss.append(a[:70]); continue
        s = s.replace(a, b)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(s)
    print(path, 'ok' if not miss else 'MISSING: ' + repr(miss))

JSONLD = '''  <link rel="stylesheet" href="/src/styles/main.css" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Undying Studios · Estudio de grabación",
    "description": "Renta de estudio de grabación profesional en Naucalpan, Estado de México, a 30 minutos del centro de la CDMX.",
    "url": "https://undyingstudios.mx/estudio/",
    "email": "estudio@undyingstudios.mx",
    "address": { "@type": "PostalAddress", "streetAddress": "Arrayanes 13, Lomas de San Mateo", "addressLocality": "Naucalpan de Juárez", "addressRegion": "Estado de México", "postalCode": "53200", "addressCountry": "MX" },
    "geo": { "@type": "GeoCoordinates", "latitude": 19.4954628, "longitude": -99.2705957 },
    "openingHours": "Mo-Su 09:00-22:00",
    "priceRange": "$$",
    "sameAs": ["https://www.instagram.com/undyingstudios", "https://www.tiktok.com/@undyingstudios", "https://www.youtube.com/@undyingstudios", "https://www.facebook.com/UndyingStudios"]
  }
  </script>
</head>'''

apply('index.html', [
 ('<title>Estudio de Grabación en CDMX | Undying Studios</title>', '<title>Renta de Estudio de Grabación en CDMX | Undying Studios</title>'),
 ('content="Renta un estudio de grabación profesional a 30 minutos del centro de la CDMX. Live Room de 45 m², consola SSL, micrófonos clásicos e ingeniero de casa. Cotiza y reserva en línea."',
  'content="Estudio de grabación profesional en Naucalpan, a 30 minutos del centro de la CDMX. Live Room de 45 m², consola SSL e ingeniero incluido. Renta por bloques de 4, 8 y 12 horas. Cotiza y reserva en línea."'),
 ('<meta property="og:title" content="Estudio de Grabación en CDMX | Undying Studios" />', '<meta property="og:title" content="Renta de Estudio de Grabación en CDMX | Undying Studios" />'),
 ('content="Live Room de 45 m², consola SSL, locker de micrófonos clásicos e ingeniero de casa. Cotiza tu sesión en un minuto." />',
  'content="Live Room de 45 m², consola SSL, micrófonos Neumann, Royer y Shure e ingeniero incluido. Bloques de 4, 8 y 12 horas con precio publicado." />'),
 ('<p class="eyebrow hero__eyebrow"><span>Naucalpan · Edo. Méx.</span><span class="dot"></span><span>A 30 minutos del centro de la CDMX</span></p>',
  '<p class="eyebrow hero__eyebrow"><span>Estudio de grabación</span><span class="dot"></span><span>Naucalpan, Estado de México</span></p>'),
 ('''            <span class="line"><span>Un estudio de grabación</span></span>
            <span class="line"><span>hecho para que la toma</span></span>
            <span class="line"><span>buena salga <em>hoy.</em></span></span>''',
  '''            <span class="line"><span>Renta un estudio de</span></span>
            <span class="line"><span>grabación <em>profesional</em></span></span>
            <span class="line"><span>a 30 minutos de la CDMX</span></span>'''),
 ('<p class="hero__sub">Live Room de 45 m², consola SSL, locker de micrófonos clásicos e ingeniero de casa. Todo parcheado, afinado y listo desde la primera hora.</p>',
  '<p class="hero__sub">Live Room de 45 m², consola SSL, micrófonos Neumann, Royer y Shure, e ingeniero de casa incluido. Bloques de 4, 8 y 12 horas con el precio publicado.</p>'),
 ('              Escuchar el estudio\n', '              Escuchar grabaciones\n'),
 ('''          <p class="eyebrow">Para quién es</p>
          <h2>Cuatro formas de usar el estudio</h2>
          <p class="lead">Elige la que se parece a tu proyecto. El cotizador te sugiere el bloque de horas y los extras que suelen hacer falta.</p>''',
  '''          <p class="eyebrow">Qué se graba aquí</p>
          <h2>Bandas, solistas, productores y podcasts</h2>
          <p class="lead">Elige tu caso. El cotizador te propone las horas y los extras que normalmente se necesitan para ese tipo de sesión.</p>'''),
 ('''          <h2>Cuatro espacios, un solo aire</h2>
          <p class="lead">Un Live Room vivo, un Control Room cómodo para doce horas y dos cabinas que no dejan pasar nada. Todo con visión directa entre salas.</p>''',
  '''          <h2>Conoce las salas del estudio</h2>
          <p class="lead">Un Live Room con acústica viva, un Control Room con consola SSL y dos cabinas aisladas. Todas las salas se ven entre sí a través del vidrio.</p>'''),
 ('''          <h2>Lo que hay detrás del vidrio</h2>
          <p class="lead">Lista completa y actualizada. Si necesitas algo que no ves aquí, lo conseguimos antes de tu sesión.</p>''',
  '''          <h2>Consola, micrófonos, outboard y backline</h2>
          <p class="lead">La lista completa, tal como está en el estudio hoy. Si necesitas algo que no aparece, avísanos antes de tu sesión y lo conseguimos.</p>'''),
 ('<a class="link-arrow" id="riderLink" href="#" download>Descargar rider técnico completo</a>', '<a class="link-arrow" id="riderLink" href="#" download>Descargar el rider técnico</a>'),
 ('''            <h2>Cinco tomas, cinco géneros, un mismo cuarto</h2>
          </div>
          <p class="lead">Debajo de cada pista te decimos cómo se grabó: sala, micrófono y cadena. Así escuchas el sonido y entiendes cómo se logró.</p>''',
  '''            <h2>Así suena lo que se graba aquí</h2>
          </div>
          <p class="lead">Cinco canciones grabadas en este estudio. Debajo de cada una dice en qué sala se grabó, con qué micrófonos y por qué cadena pasó la señal.</p>'''),
 ('''          <h2>Bloques claros, sin letra chica</h2>
          <p class="lead">Todos los bloques incluyen salas, backline básico, lounge y café. Elige si quieres a nuestro ingeniero o traes al tuyo.</p>''',
  '''          <h2>Tarifas por bloque de horas</h2>
          <p class="lead">Todos los bloques incluyen las salas, el backline básico y el lounge con café. Elige si trabajas con nuestro ingeniero o traes al tuyo.</p>'''),
 ('<p class="pricing__note">Precios en pesos mexicanos más IVA. Hora extra el mismo día: <b id="extraHour"></b>. Anticipo del 50 % para apartar fecha.</p>',
  '<p class="pricing__note">Precios en pesos mexicanos más IVA. La hora extra el mismo día cuesta <b id="extraHour"></b>. Se aparta con el 50 % de anticipo.</p>'),
 ('''          <h2>Tu presupuesto en menos de un minuto</h2>
          <p class="lead">Tres preguntas. El estimado se actualiza en vivo y lo puedes mandar por WhatsApp o reservar directo en el calendario.</p>''',
  '''          <h2>Cotiza tu sesión de grabación</h2>
          <p class="lead">Responde tres preguntas y el estimado se calcula al momento. Puedes mandarlo por WhatsApp o pasar directo al calendario para reservar.</p>'''),
 ('<p class="quote__hint" id="qHint">Elige un perfil para empezar.</p>', '<p class="quote__hint" id="qHint">Elige qué vas a grabar para empezar.</p>'),
 ('<p class="quote__foot">Sin compromiso. El precio final se confirma al reservar.</p>', '<p class="quote__foot">El precio final se confirma al reservar.</p>'),
 ('''            <h2>Conoce el estudio antes de decidir</h2>
            <p>Treinta minutos con el ingeniero de casa. Recorres las salas, escuchas el monitoreo, pruebas la batería y resolvemos lo técnico. Sin costo y sin compromiso.</p>''',
  '''            <h2>Ven a conocer el estudio</h2>
            <p>Agenda una visita de 30 minutos con el ingeniero de casa. Recorres las salas, escuchas el monitoreo y pruebas la batería. La visita no tiene costo.</p>'''),
 ('<a class="link-arrow" id="scoutWa" href="#" target="_blank" rel="noopener">O escríbenos por WhatsApp</a>', '<a class="link-arrow" id="scoutWa" href="#" target="_blank" rel="noopener">O pregunta por WhatsApp</a>'),
 ('''            <h2>Lo que nos preguntan antes de reservar</h2>
            <p class="lead">Si tu duda no está aquí, escríbenos. Respondemos en horario de estudio, normalmente en menos de una hora.</p>''',
  '''            <h2>Preguntas frecuentes</h2>
            <p class="lead">Si tu duda no está aquí, escríbenos por WhatsApp. Respondemos en horario de estudio.</p>'''),
 ('''          <h2>A 30 minutos del centro, en una calle tranquila</h2>
          <p class="lead">Zona residencial en Lomas de San Mateo. Sin tráfico de avenida, con estacionamiento privado y descarga a la puerta.</p>''',
  '''          <h2>Dónde está el estudio</h2>
          <p class="lead">Estamos en Lomas de San Mateo, Naucalpan, a 30 minutos del centro de la Ciudad de México. Es una calle residencial con estacionamiento privado y descarga en la puerta.</p>'''),
 ('<div><b>Estacionamiento</b><span>Cuatro cajones privados sin costo. Zona de carga y descarga a diez metros del Live Room.</span></div>',
  '<div><b>Estacionamiento</b><span>Cuatro cajones privados sin costo. La zona de carga y descarga está a diez metros del Live Room.</span></div>'),
 ('<p>Estudio de grabación y foro audiovisual en el Estado de México. Grabamos, mezclamos y masterizamos música que se escucha en todo el país.</p>',
  '<p>Estudio de grabación y foro audiovisual en Naucalpan, Estado de México. Renta por horas para grabación, mezcla, podcast y producción audiovisual.</p>'),
 ('<p class="muted">Hecho con cuidado en la Ciudad de México.</p>', '<p class="muted">Naucalpan de Juárez, Estado de México.</p>'),
 ('<p class="modal__foot">Apartas con el 50 % de anticipo. Recibirás confirmación por correo y WhatsApp.</p>', '<p class="modal__foot">Se aparta con el 50 % de anticipo. Te llega la confirmación por correo y por WhatsApp.</p>'),
 ('  <link rel="stylesheet" href="/src/styles/main.css" />\n</head>', JSONLD),
])

apply('src/data.js', [
 ("desc: 'Acústica viva de decaimiento corto, ideal para baterías con cuerpo y ensambles que necesitan escucharse en el mismo aire. Difusores de madera y trampas de bajos en esquinas, con línea de vista directa al Control Room.',",
  "desc: 'La sala tiene acústica viva con decaimiento corto. Funciona muy bien para batería y para bandas que quieren grabar todos al mismo tiempo. Tiene difusores de madera, trampas de bajos en las esquinas y ventana directa al Control Room.',"),
 ("desc: 'Diseñada para sesiones largas: consola SSL al centro, monitoreo Focal calibrado al punto de escucha y un sofá atrás donde el artista escucha lo mismo que el ingeniero. Sin fatiga, sin sorpresas al salir.',",
  "desc: 'Está pensado para sesiones largas. La consola SSL va al centro, los monitores Focal están calibrados al punto de escucha y hay un sofá atrás para que el artista escuche lo mismo que el ingeniero.',"),
 ("desc: 'Cabina A afinada para voz y locución, cabina B para amplificadores a volumen real. Graba guitarras y voces en simultáneo con la batería sin que nada se cuele en el micrófono equivocado.',",
  "desc: 'La cabina A está tratada para voz y locución. La cabina B es para amplificadores a volumen real. Así puedes grabar guitarras y voz al mismo tiempo que la batería sin que se filtren entre micrófonos.',"),
 ("desc: 'Café de grano, sillones, mesa de trabajo y wifi simétrico. El lugar donde se escriben las letras de último minuto y se decide el orden del EP.',",
  "desc: 'Café de grano, sillones, una mesa grande para trabajar y wifi simétrico. Es donde la banda espera su turno o termina la letra que faltaba.',"),
 ("acoustics: 'Silencio para pensar',", "acoustics: 'Aislado del Live Room',"),
 ("intro: 'Flujo híbrido: sumas y preamplificas en analógico, grabas y editas en digital sin latencia.',", "intro: 'Grabas en digital con preamplificación y suma analógica. El cue de los músicos no tiene latencia.',"),
 ("intro: 'Tres puntos de vista para que la mezcla traduzca en el coche, el celular y el club.',", "intro: 'Tres sistemas de monitoreo distintos para revisar que la mezcla suene bien en el coche, en el celular y en una bocina grande.',"),
 ("intro: 'Un locker armado para cubrir voz, batería, cuerdas y amplificadores sin repetir color.',", "intro: 'Condensadores, dinámicos y de cinta para cubrir voz, batería, cuerdas y amplificadores.',"),
 ("intro: 'Preamplificadores, compresores y ecualizadores que le dan al sonido lo que un plugin todavía no.',", "intro: 'Preamplificadores, compresores y ecualizadores de hardware. Se usan tanto en la grabación como en la mezcla.',"),
 ("intro: 'Instrumentos afinados y mantenidos, listos para sonar desde la primera toma.',", "intro: 'Batería, amplificadores y teclados con mantenimiento mensual. Llegan afinados a tu sesión.',"),
 ("note: 'Guitarra y voz en simultáneo. Coles 4038 en guitarra, AT4050 en voz, cero edición, la toma cuatro.',", "note: 'Guitarra y voz grabadas al mismo tiempo. Coles 4038 en la guitarra y AT4050 en la voz. Sin edición, es la cuarta toma.',"),
 ("note: 'Voz principal en Iso Booth A con Neumann U 87 a través de Neve 1073 y LA-2A. Coros apilados en la misma cadena.',", "note: 'Voz principal en la cabina A con Neumann U 87, Neve 1073 y LA-2A. Los coros se grabaron con la misma cadena.',"),
 ("note: 'Producción de casa. Voz con SM7B en Chandler TG2, compresión paralela con Distressor. Master para plataformas.',", "note: 'Producción de casa. Voz con SM7B por Chandler TG2 y compresión paralela con Distressor. Master para plataformas de streaming.',"),
 ("note: 'Toma en vivo de piano, contrabajo y batería en el Live Room. Par AKG C414 en el piano, Coles 4038 en batería.',", "note: 'Piano, contrabajo y batería grabados en vivo en el Live Room. Par de AKG C414 en el piano y Coles 4038 en la batería.',"),
 ("text: 'La batería sonó enorme desde la primera toma. El Live Room tiene ese aire que en otros estudios tienes que fingir con reverb. Y el ingeniero de casa entendió el disco antes de que lo explicáramos.',",
  "text: 'La batería sonó grande desde la primera toma, sin tener que meterle reverb después. El ingeniero de casa entendió el disco rápido y nos ahorró medio día de pruebas.',"),
 ("text: 'Renté en dry hire con mi propio ingeniero. Todo estaba parcheado, etiquetado y funcionando. Llegamos a las nueve y a las nueve y media ya estábamos grabando. Eso no pasa.',",
  "text: 'Renté en dry hire con mi propio ingeniero. Todo estaba parcheado y etiquetado. Llegamos a las nueve y a las nueve y media ya estábamos grabando. En otros estudios eso me ha tomado toda la mañana.',"),
 ("text: 'Grabé un EP completo en el bloque de día completo. El lounge, el café y la luz hacen que las doce horas se sientan como seis. Volví al mes siguiente a mezclar.',",
  "text: 'Grabé un EP de cinco canciones en un bloque de día completo. Las doce horas se pasan bien porque hay dónde descansar y el café es bueno. Regresé al mes siguiente a mezclar.',"),
 ("desc: 'Tracking en vivo con todos en la misma sala y sin filtraciones.'", "desc: 'Batería, bajo, guitarras y voz al mismo tiempo, cada quien en su sala.'"),
 ("desc: 'Cabina afinada, cadena de voz clásica y un ingeniero que sabe escuchar.'", "desc: 'Cabina tratada para voz, cadena Neumann, Neve y LA-2A e ingeniero de casa.'"),
 ("desc: 'Renta seca con consola SSL, outboard y monitoreo calibrado.'", "desc: 'Renta dry hire con consola SSL, outboard y monitoreo calibrado.'"),
 ("desc: 'Hasta cuatro voces, video opcional y entrega el mismo día.'", "desc: 'Hasta cuatro micrófonos, cámara opcional y archivos el mismo día.'"),
 ("desc: 'Grabar voces, guitarras o un sencillo sobre pistas.'", "desc: 'Voces, guitarras o un sencillo sobre pistas que ya tienes.'"),
 ("desc: 'Del demo a la canción terminada con nuestro equipo.'", "desc: 'Del demo a la canción terminada, con productor e ingeniero de casa.'"),
 ("desc: 'Hasta cuatro voces, video opcional, entrega el mismo día.'", "desc: 'Hasta cuatro micrófonos, cámara opcional, archivos el mismo día.'"),
 ("a: 'Sí. Todos los bloques tienen tarifa dry hire sin ingeniero de casa. Recibirás la sala parcheada, con sesión plantilla en Pro Tools y un asistente disponible para dudas del equipo.',",
  "a: 'Sí. Todos los bloques tienen tarifa dry hire sin ingeniero de casa. Recibes la sala parcheada, una sesión plantilla en Pro Tools y un asistente disponible por si tienes dudas del equipo.',"),
 ("a: 'Si la agenda lo permite, extiendes en el momento a tarifa de hora extra. Te avisamos con una hora de anticipación si hay sesión después de la tuya.',",
  "a: 'Si la agenda lo permite, puedes extender en el momento a tarifa de hora extra. Si hay otra sesión después de la tuya te avisamos con una hora de anticipación.',"),
 ("a: 'Sí. Al terminar la sesión te llevas la sesión completa de Pro Tools o los stems consolidados en un disco tuyo o por enlace de descarga que dura 30 días.',",
  "a: 'Sí. Al terminar te llevas la sesión completa de Pro Tools o los stems consolidados, en tu disco o por un enlace de descarga que dura 30 días.',"),
 ("a: 'Agenda un scouting gratuito de 30 minutos. Recorres las salas, escuchas el monitoreo y resolvemos dudas técnicas con el ingeniero de casa.',",
  "a: 'Sí. Agenda una visita gratuita de 30 minutos. Recorres las salas, escuchas el monitoreo y resuelves tus dudas técnicas con el ingeniero de casa.',"),
])

apply('src/main.js', [
 ('<span class="cta">Cotizar este perfil →</span>', '<span class="cta">Cotizar esta sesión →</span>'),
 ("${img(a.img, '', '(min-width: 900px) 25vw, 50vw')}", "${img(a.img, a.name + ' en el estudio de grabación', '(min-width: 900px) 25vw, 50vw')}"),
 ("$('#qHint').textContent = p ? `Para ${p.name.toLowerCase()} solemos recomendar el bloque de ${PRICING.blocks.find((b) => b.id === p.block).hours} horas.` : 'Elige un perfil para empezar.';",
  "$('#qHint').textContent = p ? `Para ${p.name.toLowerCase()} normalmente alcanza con el bloque de ${PRICING.blocks.find((b) => b.id === p.block).hours} horas.` : 'Elige qué vas a grabar para empezar.';"),
 ('const summary = `Hola, cotizé una sesión en el estudio:', 'const summary = `Hola, hice una cotización en la página del estudio:'),
])
