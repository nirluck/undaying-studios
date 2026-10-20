# Sistema de reservas, cotizador y pagos

Propuesta funcional y técnica para reemplazar los calendarios de Prospex en el
estudio de grabación y en el foro de Undying Studios.

Versión 1 · 6 de octubre de 2026

---

## 1. Resumen

Un solo sistema para las dos landings que hace cinco cosas:

1. **Cotiza** cualquier combinación de horas, modalidad, extras y productos,
   con precios que se editan desde el panel.
2. **Aparta horarios** en el calendario de cada espacio, respetando horario de
   operación, margen entre sesiones, anticipación mínima y bloqueos.
3. **Cobra** con Stripe (tarjeta, meses sin intereses y OXXO), siempre el 100%
   al reservar.
4. **Da seguimiento** a lo que no ocupa calendario: mezcla, máster, edición,
   afinación, productor y músico de sesión.
5. **Avisa** por correo al cliente y al equipo en cada paso.

La idea central: el precio, el calendario y el producto son tres cosas
separadas. Un pedido puede tener varias sesiones, extras y productos, y cada
sesión aparta un espacio por un rango de horas. Así no hace falta un
calendario por cada combinación.

---

## 2. Lo que venden hoy las landings

Inventario tomado de `estudio/src/data.js`, `estudio/src/main.js`,
`estudio/terminos/`, `foro/src/data.js` y los PDF de términos y reglamento del
foro.

### Estudio de grabación

| Variable | Valores actuales | Ocupa calendario |
|---|---|---|
| Espacio | Estudio A (Live Room + Control Room). El Estudio B es de mezcla y máster y no se renta por horas | Sí |
| Modalidad | Con ingeniero / Sin ingeniero (Dry Hire) | No, cambia el precio |
| Bloque | 3 h · 6 h · 9 h | Sí |
| Precio con ingeniero | $2,700 · $4,500 · $5,500 | |
| Precio Dry Hire | $2,100 · $3,500 · $4,300 | |
| Descuento mostrado | 6 h: 17% · 9 h: 32% (contra la tarifa por hora del bloque de 3 h) | |
| Podcast y locución | Paquete sobre el bloque de 3 h; "equipo de video opcional" sin precio | Sí |
| Mezcla multitrack | $6,900 por canción, 2 revisiones | No |
| Máster | $3,000 por canción, 2 revisiones | No |
| Edición multitrack | $4,400 por canción (hasta 24 tracks) | No |
| Edición y afinación vocal | $3,800 por canción (hasta 6 pistas de voz) | No |
| Productor musical | $7,000 por sesión | No, pero va ligado a una sesión |
| Músico de sesión | $2,500 por sesión | No, pero va ligado a una sesión |
| Paquetes sugeridos | Banda (6 h + edición + mezcla + máster) · Solista (3 h + afinación + mezcla + máster) · Producción (9 h + productor + afinación + mezcla + máster) · Podcast (3 h) | |
| Solo postproducción | Se puede comprar sin horas de estudio | No |
| Proyectos a la medida | Composición, locución para marcas, doblaje: se cotizan aparte | No |
| Visita | Gratuita | Sí |
| Tolerancia | 15 minutos para desalojar | |
| Hora extra | El mismo día, sujeta a agenda | Sí |
| Cancelación | Más de 72 h: crédito por 90 días. Menos de 72 h: sin reembolso | |

### Foro

| Variable | Valores actuales | Ocupa calendario |
|---|---|---|
| Espacio | Foro de 72 m² con ciclorama y zona negra | Sí |
| Bloque | 3 h · 6 h · 12 h | Sí |
| Precio | $2,000 · $3,000 · $5,200 (ahorro 25% y 35%) | |
| Cambio de color del ciclorama | $4,800, hoy solo en el bloque de 12 h | Sí: 2 días antes de la sesión |
| Aforo | 25 personas | |
| Invitados sin registro | $100 por persona | No, cargo posterior |
| Limpieza por basura no retirada | $200 | No, cargo posterior |
| Pintura del ciclorama por daños | $2,500 | No, cargo posterior |
| Visita (scouting) | Gratuita | Sí |
| Tolerancia | 15 minutos para desalojar | |
| Hora extra | Sin precio publicado | Sí |
| Cancelación | Los documentos del foro se contradicen (ver sección 13) | |

### Reglas que ya confirmaste

- Foro y estudio se pueden usar al mismo tiempo.
- Pago completo al reservar. Se acepta OXXO.
- Los ingenieros no se agendan en el sistema: si piden ingeniero, el equipo lo
  busca y lo asigna.
- Margen de 1 hora entre sesiones. Sin recargos por noche ni fin de semana.
- Se reserva con al menos un día de anticipación.
- El cambio de color se pide con al menos 7 días de anticipación y bloquea el
  foro 2 días.
- Hora extra: $500 en el foro y $500 en el estudio, por ahora.
- Horarios, precios y reglas se editan desde el panel.

---

## 3. Conceptos

| Concepto | Qué es |
|---|---|
| **Espacio** | Lo que se renta por tiempo: Estudio A y Foro. El Estudio B queda dado de alta para bloqueos internos y por si un día se renta |
| **Bloque** | Duración que se vende (3, 6, 9 o 12 h) con su precio por modalidad |
| **Modalidad** | Variante de precio de un bloque. Estudio: con ingeniero o Dry Hire. Foro: una sola |
| **Sesión** | Un bloque en una fecha y hora concretas dentro de un espacio. Es lo que ocupa el calendario |
| **Extra** | Algo que se agrega a una sesión y puede tener reglas de calendario (cambio de color del ciclorama, equipo de video para podcast) |
| **Producto** | Algo con precio fijo que no ocupa calendario: mezcla, máster, edición, afinación, productor, músico |
| **Trabajo** | Cada unidad de un producto de postproducción (una mezcla de una canción). Tiene estado, entrega y revisiones |
| **Pedido** | Lo que el cliente compra: una o varias sesiones, extras y productos, con un solo pago |
| **Cotización** | Un pedido sin pagar. Se puede guardar y compartir con un enlace |
| **Apartado** | Reserva temporal de un horario mientras el cliente paga |
| **Bloqueo** | Tiempo en que un espacio no se puede reservar: mantenimiento, pintura, evento privado, reservas importadas de Prospex |
| **Cargo posterior** | Cobro que se agrega después de la sesión: hora extra, invitados, limpieza, daños |
| **Crédito** | Saldo a favor de un cliente por una cancelación, con fecha de vencimiento |
| **Visita** | Cita gratuita para conocer el espacio |

---

## 4. Calendario y disponibilidad

### 4.1 Configuración de cada espacio

| Ajuste | Valor inicial | Nota |
|---|---|---|
| Horario por día de la semana | Foro: 9:00 a 18:00 (lo que dice la página). Estudio: por definir | Puede cerrar después de medianoche (por ejemplo, de 10:00 a 2:00) para sesiones nocturnas |
| Excepciones | Ninguna | Días festivos, cierres u horarios especiales por fecha |
| Margen entre sesiones | 60 min | Incluye los 15 minutos de tolerancia |
| Inicio de sesión cada | 60 min | Horas en punto. Se puede bajar a 30 min |
| Anticipación mínima | 24 h | |
| Reservas hasta | 180 días adelante | |
| Zona horaria | America/Mexico_City | |

### 4.2 Cómo se calcula un horario disponible

Para un espacio, una fecha y un bloque de H horas:

1. Se toman las ventanas de apertura de ese día (horario semanal o excepción).
2. Se juntan los tiempos ocupados del espacio: sesiones confirmadas, apartados
   vigentes, bloqueos y visitas. Cada sesión ocupa su duración más el margen
   de 1 hora al final.
3. Se recorren los inicios posibles cada 60 minutos. Un inicio es válido si:
   - la sesión completa cabe dentro de la ventana de apertura;
   - no choca con nada ocupado, contando el margen antes y después;
   - empieza al menos 24 h después de este momento;
   - está dentro del horizonte de reservas.
4. Si la sesión lleva extras con reglas de calendario (cambio de color), la
   fecha también debe cumplir esas reglas (sección 6.2).

El margen solo se aplica entre sesiones: la primera puede empezar a la hora de
apertura y la última puede terminar a la hora de cierre.

Consecuencia: si el foro abre 9 horas, el bloque de 12 horas no aparece. Para
que aparezca, el horario de ese día tiene que ampliarse desde el panel. El
cliente no ve un error; ve el bloque como "no disponible en este horario".

### 4.3 Cómo lo ve el cliente

- Calendario mensual. Cada día muestra si hay al menos un horario para el
  bloque elegido. Si cambia el bloque, los días se recalculan.
- Al elegir un día aparece la lista de horas de inicio, cada una con su hora
  de término ("10:00 a 16:00").
- Si un día no tiene horarios, se dice por qué cuando es útil: "cerrado",
  "lleno", "el cambio de color necesita 7 días de anticipación".

### 4.4 Sin dobles reservas

Todo lo que ocupa un espacio (sesiones, apartados, bloqueos, pintura y
visitas) vive en una sola tabla de ocupación con una restricción de exclusión
de Postgres: dos rangos del mismo espacio no pueden encimarse. Si dos personas
pagan el mismo horario al mismo tiempo, la base de datos acepta a una y
rechaza a la otra, y a esa segunda persona se le ofrece otro horario antes de
cobrarle.

---

## 5. Reglas del estudio

### 5.1 Bloques y modalidades

- Cada bloque tiene un precio por modalidad.
- El porcentaje de ahorro se calcula solo: precio del bloque contra (precio
  por hora del bloque base × horas). Si cambian los precios, cambian las
  etiquetas. El texto de la etiqueta ("Más popular", "Mejor tarifa") se edita
  aparte.
- **Con ingeniero:** el pedido llega al equipo con la tarea "asignar
  ingeniero". En el panel hay un campo para anotar a quién se asignó. Si el
  cliente lo pide, se le avisa por correo quién será su ingeniero.
- **Dry Hire:** al reservar se pide, de forma opcional, el nombre y teléfono
  del ingeniero que operará la sesión, para la inducción.

### 5.2 Podcast y locución

- Es un paquete sugerido sobre el bloque de 3 horas, en cualquiera de las dos
  modalidades.
- "Equipo de video opcional" no tiene precio. Mientras no lo tenga, es un
  extra "se cotiza": si el cliente lo marca, el pedido no se puede pagar en
  línea y se convierte en solicitud de cotización (sección 9).

### 5.3 Productos ligados a una sesión

El productor musical y el músico de sesión se cobran "por sesión":

- Solo se pueden agregar si el pedido tiene al menos una sesión de estudio.
- Si el pedido tiene varias sesiones, el cliente elige en cuál.
- Productor: máximo 1 por sesión.
- Músico de sesión: la cantidad es el número de músicos. Se pide el
  instrumento de cada uno.
- Igual que los ingenieros, el equipo los asigna a mano. El pedido entra con
  la tarea "confirmar productor" o "confirmar músico".

### 5.4 Varias sesiones en un pedido

Un EP o un disco casi nunca cabe en un día. El cotizador permite agregar
varias sesiones (por ejemplo, tres días de 9 horas) en un solo pedido y un
solo pago. Cada sesión tiene su propia fecha, bloque y modalidad. Al elegir la
fecha de una sesión, el calendario ya descuenta las otras del mismo pedido.

---

## 6. Reglas del foro

### 6.1 Bloques

3, 6 y 12 horas, con el ahorro calculado igual que en el estudio. Un bloque
solo se ofrece en los días cuyo horario lo permite (sección 4.2).

### 6.2 Cambio de color del ciclorama

| Regla | Valor inicial |
|---|---|
| Precio | $4,800 |
| Anticipación mínima | 7 días antes de la sesión |
| Bloqueo del foro | Los 2 días completos anteriores a la sesión |
| Bloqueo después de la sesión | 0 días (por confirmar, sección 13) |
| Bloques en los que se ofrece | 12 h (como hoy en la página) |
| Colores | Verde croma, azul croma u otro (el cliente escribe el color, HEX o Pantone) |

Cómo funciona:

- La opción solo aparece en fechas que estén a 7 días o más, y solo si el foro
  está libre los 2 días anteriores. Si no, se explica: "para esta fecha no hay
  tiempo de pintar el foro".
- Al pagar, el sistema crea un bloqueo "Pintura de ciclorama" en esos 2 días
  y le avisa al equipo con el color y la fecha límite.
- Si el cliente reserva varios días seguidos con el mismo color en un solo
  pedido, se pinta y se cobra una sola vez.
- Si el cliente cambia la fecha a otra que ya no cumple los 7 días, el sistema
  no deja hacer el cambio con color. Puede quitar el color (el ajuste de precio
  sigue la política de cancelación) o escribirle al equipo.

Por qué ofrecerlo solo en 12 horas: pintar quita 2 días de renta del foro.
Vendido sobre un bloque de 3 horas, el pedido completo ($6,800) puede valer
menos que lo que el foro deja de rentar esos 2 días. Desde el panel se puede
abrir a otros bloques.

### 6.3 Invitados y aforo

- Desde "Mis reservas" el cliente registra a su equipo e invitados antes de la
  sesión. El sistema avisa si se pasa del aforo de 25 personas.
- El equipo recibe la lista el día anterior (sirve para la caseta del
  circuito).
- Las personas que lleguen sin registro se cobran como cargo posterior ($100
  cada una).

### 6.4 Cargos posteriores del foro

Catálogo editable. Valores iniciales tomados del reglamento:

| Cargo | Precio |
|---|---|
| Invitado sin registro | $100 por persona |
| Limpieza por basura no retirada | $200 |
| Pintura del ciclorama por daños | $2,500 |
| Hora extra | $500 por hora |
| Daños a equipo o instalaciones | Monto libre |

---

## 7. Postproducción: productos tipo tienda

Mezcla, máster, edición multitrack y afinación vocal se compran como en una
tienda: precio fijo, cantidad y pago. Pueden ir solas o en un pedido con
sesiones.

### 7.1 Cada unidad es un trabajo

Comprar "Mezcla × 3" crea tres trabajos, uno por canción. Cada trabajo tiene:

- título de la canción;
- enlace al material (Drive, WeTransfer, Dropbox). No se suben archivos al
  sistema: las sesiones pesan gigas y el almacenamiento costaría más que el
  servicio;
- referencias y notas;
- encargado (anotado a mano);
- fecha de entrega (se calcula al recibir el material);
- revisiones usadas de las incluidas;
- enlace de entrega.

### 7.2 Estados de un trabajo

```
Esperando material → En cola → En proceso → Entregado → En revisión (1, 2) → Aprobado
```

- **Esperando material:** el cliente todavía no manda sus archivos. Recibe
  recordatorios a los 3 y a los 7 días.
- **En cola:** ya llegó el material. Desde aquí corre el tiempo de entrega.
- **Entregado:** el cliente recibe el enlace y dos botones en "Mis reservas":
  aprobar o pedir revisión (con notas).
- Cuando se acaban las revisiones incluidas, pedir otra genera un cargo de
  revisión adicional (precio por definir) o se cierra el trabajo, según lo que
  se configure.
- Si el cliente no responde 14 días después de una entrega, el trabajo se
  aprueba solo (configurable).

### 7.3 Configuración de cada producto

| Campo | Ejemplo (mezcla) |
|---|---|
| Nombre, descripción | Mezcla multitrack |
| Precio | $5,500 |
| Unidad | Por canción / por sesión |
| Requiere sesión de estudio | No |
| Cantidad máxima por pedido | 20 |
| Revisiones incluidas | 2 |
| Precio de revisión adicional | Por definir |
| Días hábiles de entrega | Por definir |
| Datos a pedir al cliente | Título, enlace al material, referencias |
| Activo, orden | Sí, 1 |

---

## 8. Pagos con Stripe

### 8.1 Flujo

1. El cliente confirma su pedido. El servidor recalcula el total con el
   catálogo vigente; nunca se usa el total que manda el navegador.
2. Se crean los apartados de horario y una sesión de Stripe Checkout con una
   línea por concepto.
3. El cliente paga en la página de Stripe y regresa a la página de
   confirmación.
4. **La reserva se confirma solo cuando Stripe avisa (webhook) que el pago
   entró.** La página de confirmación espera ese aviso y muestra el estado.

### 8.2 Métodos

| Método | Reglas |
|---|---|
| Tarjeta de crédito o débito | Apartado de 30 minutos (es lo mínimo que permite Stripe Checkout). Si no paga, el horario se libera solo |
| Meses sin intereses | Opcional, a partir de un monto mínimo configurable |
| OXXO | Solo si la primera sesión está a 3 días o más. La ficha vence en 1 día y el horario queda apartado hasta entonces. Stripe limita OXXO a $10,000 por pago (confirmarlo al configurar la cuenta): en pedidos mayores no aparece la opción |
| Transferencia o efectivo | Solo desde el panel, para pedidos hechos por el equipo. Se registra a mano |

Si un pago OXXO entra después de que venció el apartado y el horario ya se
ocupó, el sistema avisa al equipo para que ofrezca otra fecha o dé el pedido
como crédito. Es raro, pero tiene que estar previsto.

### 8.3 Reembolsos

- Desde el panel, totales o parciales, con motivo.
- Los pagos con tarjeta se reembolsan en Stripe.
- Stripe no permite reembolsar OXXO directamente (confirmarlo al configurar).
  Esos reembolsos se hacen por transferencia y se registran a mano.

### 8.4 Precios e IVA

Los precios incluyen IVA. En recibos y correos se desglosa: subtotal
(total ÷ 1.16) e IVA incluido. Cada línea del pedido guarda el precio con el
que se vendió, así que un cambio de precio en el catálogo no altera los
pedidos que ya existen.

---

## 9. Cotizaciones, proyectos a la medida y pedidos del equipo

- **Guardar y compartir:** el cotizador genera un enlace a la cotización. El
  botón de WhatsApp sigue, pero ahora manda ese enlace, y el equipo lo abre
  directo en el panel. Una cotización no aparta horario.
- **Solicitud de cotización:** cuando algo no tiene precio (proyecto a la
  medida, equipo de video para podcast), el cliente manda una solicitud con
  sus datos y su descripción. Al equipo le llega un correo y la solicitud
  aparece en el panel.
- **Pedido armado por el equipo:** desde el panel se usa el mismo cotizador,
  con dos opciones extra: líneas con precio libre (para proyectos a la medida)
  y descuentos. Luego se elige:
  - mandar enlace de pago (el horario queda apartado el tiempo que se elija,
    por ejemplo 24 horas);
  - registrar el pago a mano (transferencia o efectivo).

---

## 10. Cancelaciones, cambios de fecha y créditos

Cada espacio tiene su propia política:

| Regla | Estudio | Foro |
|---|---|---|
| Cambio de fecha | Libre con más de 72 h | Libre con más de 48 h |
| Cancelación con más de X horas | 72 h: el pago queda como crédito por 90 días | Sin reembolso (ver sección 13) |
| Cancelación con menos de X horas | Sin reembolso | Sin reembolso |
| Cancelación por parte del estudio | Nueva fecha o reembolso total | Nueva fecha o reembolso total |

- El cliente cambia la fecha desde "Mis reservas" mientras esté dentro de la
  política. Fuera de ella, el botón se convierte en "escríbenos".
- Al cambiar de fecha se revalidan los extras (por ejemplo, los 7 días del
  color).
- Los créditos se aplican solos en el siguiente pedido del mismo correo. Si
  cubren todo, no pasa por Stripe.
- Los productos de postproducción no se cancelan una vez que el trabajo pasa a
  "En proceso".
- El equipo puede saltarse la política desde el panel, pero queda registrado
  quién lo hizo y por qué.

---

## 11. Hora extra y cargos posteriores

- La hora extra **no se vende por adelantado en línea**: si se necesitan más
  horas, se elige un bloque más largo o una sesión adicional. La hora extra se
  agrega en el momento, desde el panel.
- Al agregarla, el sistema revisa que la hora siguiente esté libre contando el
  margen con la sesión que viene. Si no cabe, lo dice.
- Precio: $500 por hora completa, configurable por espacio y por modalidad.
- Los cargos posteriores se cobran con un enlace de pago que llega al cliente
  por correo, o se registran como pagados a mano. El pedido muestra el saldo
  pendiente hasta que se cubra.

---

## 12. Visitas (scouting)

- Gratuitas, de 30 minutos (configurable), en el horario del espacio.
- Ocupan el espacio, pero sin margen de 1 hora: se pueden agendar en huecos
  entre sesiones.
- Anticipación mínima de 24 h, igual que las reservas (configurable).
- El cliente puede cancelarlas o moverlas desde el enlace del correo.
- Si después reserva, la visita queda en su historial.

---

## 13. Vistas para el cliente

### 13.1 Landing del estudio

Las tarjetas de tarifas, productos y paquetes leen el catálogo de la base de
datos. El cotizador queda en cuatro pasos, en la misma sección de hoy:

1. **Punto de partida:** paquetes sugeridos o "armar desde cero". Las
   tarjetas de "para quién" siguen llevando aquí.
2. **Sesiones:** modalidad, bloque, fecha y hora. Botón "agregar otra
   sesión". Opción "solo postproducción".
3. **Postproducción y servicios:** productos con cantidad; productor y músico
   eligen sesión.
4. **Resumen:** líneas, total, IVA incluido, política de pago y cancelación.
   Botones: pagar, compartir cotización, mandar por WhatsApp.

Los botones "Reservar" de las tarjetas de tarifas abren el cotizador ya
posicionado en el paso 2 con ese bloque y modalidad.

### 13.2 Landing del foro

Tarjetas de 3, 6 y 12 horas como hoy. "Seleccionar" abre el mismo componente
de reserva: fecha y hora, extras (color de ciclorama con sus reglas) y
resumen.

### 13.3 Pago

Página o panel lateral con:

- nombre, correo, WhatsApp;
- nombre del artista, proyecto o producción;
- empresa (opcional);
- ¿requieres factura? (RFC, razón social, régimen, código postal y uso de
  CFDI);
- Dry Hire: ingeniero que opera (opcional);
- aceptación del aviso de privacidad y de los términos (en el foro, también
  del reglamento). Se guarda la versión de cada documento y la fecha.

Después, Stripe Checkout.

### 13.4 Confirmación

Número de pedido, estado del pago (pagado / esperando pago OXXO), resumen,
botón para agregar al calendario (.ics), cómo llegar y siguiente paso
(por ejemplo, "manda tu material" si compró mezcla).

### 13.5 Mis reservas

Acceso con enlace que llega al correo, sin contraseña. Ahí el cliente puede:

- ver sus pedidos, recibos y créditos;
- descargar el .ics;
- cambiar la fecha o cancelar según la política;
- registrar invitados (foro);
- mandar material, aprobar entregas o pedir revisiones (postproducción);
- pagar cargos pendientes.

---

## 14. Panel de administración

En `/admin/`, con acceso por correo.

### 14.1 Roles

| Rol | Puede |
|---|---|
| Administrador | Todo, incluidos precios, políticas, horarios, usuarios y reportes |
| Operación | Agenda, pedidos, cobros, cargos, bloqueos y visitas. No cambia precios ni políticas |
| Postproducción | Ver y actualizar trabajos de postproducción |

### 14.2 Vistas

1. **Hoy.** Sesiones de hoy y mañana por espacio. Pendientes: asignar
   ingeniero, productor o músico; pagos OXXO por vencer; pinturas por
   programar; trabajos atrasados; solicitudes de cotización sin respuesta;
   saldos pendientes. Ingresos del mes.
2. **Agenda.** Columnas por espacio (Foro, Estudio A, Estudio B), vista de
   día, semana y mes. Muestra sesiones, márgenes (rayados), bloqueos, pintura
   y visitas. Clic en un hueco: nueva reserva, bloqueo o visita. Arrastrar una
   sesión pide confirmación y avisa al cliente.
3. **Pedidos.** Lista con filtros por espacio, estado, fecha y pago, y
   búsqueda por nombre, correo o número. En el detalle:
   - líneas, sesiones, pagos y saldo;
   - historial de cambios;
   - notas internas;
   - ingeniero, productor y músicos asignados;
   - invitados;
   - acciones: cambiar fecha, cancelar (con o sin política), reembolsar,
     agregar hora extra o cargo, reenviar confirmación, marcar como no
     presentado.
4. **Nuevo pedido.** El cotizador con precios libres, descuentos, enlace de
   pago o pago manual (sección 9).
5. **Postproducción.** Tablero por estado con fecha de entrega, encargado,
   revisiones y enlaces. Cambiar un estado avisa al cliente.
6. **Solicitudes.** Proyectos a la medida y extras sin precio. Se convierten
   en pedido con un clic.
7. **Clientes.** Historial, total gastado, créditos, datos de factura, notas.
8. **Catálogo.** Espacios, bloques, precios por modalidad, extras, productos,
   paquetes sugeridos, hora extra y cargos posteriores. Un cambio de precio se
   puede programar a partir de una fecha.
9. **Horarios.** Horario semanal por espacio, excepciones y bloqueos.
10. **Políticas.** Pago, OXXO, cancelación, cambio de fecha, créditos,
    anticipación, horizonte, margen, apartados.
11. **Correos.** Plantillas editables (asunto y texto con variables) y quién
    del equipo recibe cada aviso.
12. **Reportes.** Ingresos por espacio, producto y mes; ocupación (horas
    vendidas entre horas abiertas); bloques y paquetes más vendidos; ticket
    promedio; cancelaciones. Exportación a CSV.
13. **Usuarios.** Altas, bajas y roles.

---

## 15. Correos

Se envían desde `reservas@undyingstudios.mx`, con respuesta a
`music@undyingstudios.mx`. Las plantillas se editan desde el panel.

### 15.1 Al cliente

| Evento | Cuándo | Contenido |
|---|---|---|
| Pedido confirmado | Al entrar el pago | Número, sesiones, extras, productos, total con IVA, .ics, cómo llegar, reglas básicas, enlace a Mis reservas |
| Ficha OXXO | Al elegir OXXO | Monto, referencia, fecha límite, aviso de que el horario se libera si no paga |
| Apartado por vencer | 6 h antes de que venza la ficha OXXO | Recordatorio de pago |
| Apartado vencido | Al vencer | El horario se liberó; enlace para volver a reservar |
| Recordatorio de sesión | 48 h y 24 h antes | Hora, dirección, estacionamiento y descarga; registrar invitados (foro); qué traer |
| Cambio de fecha | Al hacerlo | Nueva fecha y .ics actualizado |
| Cancelación | Al hacerla | Qué pasa con el pago: crédito, reembolso o nada, según la política |
| Reembolso | Al hacerlo | Monto y tiempo estimado |
| Cargo pendiente | Al agregarlo | Concepto, monto y enlace de pago |
| Manda tu material | Al confirmar un pedido con postproducción; recordatorio a los 3 y 7 días | Enlace para mandar el material de cada canción |
| Trabajo entregado | Al entregar | Enlace de entrega, botones de aprobar o pedir revisión, revisiones restantes |
| Ingeniero asignado | Opcional, al asignarlo | Nombre del ingeniero |
| Visita agendada | Al agendarla, y 24 h antes | Fecha, hora, cómo llegar, enlace para cambiarla |
| Gracias | Al día siguiente de la sesión | Agradecimiento, enlace a reseña de Google, crédito restante si lo hay |
| Crédito por vencer | 15 días antes | Monto y fecha de vencimiento |
| Enlace de acceso | Al pedirlo | Entrar a Mis reservas |

### 15.2 Al equipo

| Evento | Cuándo |
|---|---|
| Nuevo pedido pagado | Al entrar el pago. Marca si hay que asignar ingeniero, productor o músico, o programar pintura |
| Pintura de ciclorama | Al confirmarse, con color y fecha límite; recordatorio 3 días antes |
| Pago OXXO pendiente y vencido | Al generarse y al vencer |
| Cambio de fecha o cancelación | Al hacerse |
| Pago OXXO tardío sin horario | Al ocurrir |
| Solicitud de cotización | Al llegar |
| Material recibido o revisión pedida | Al ocurrir |
| Trabajo por vencer o atrasado | 1 día antes de la fecha de entrega y el día que vence |
| Resumen de mañana | Todos los días a las 20:00: sesiones, modalidad, ingeniero, invitados, extras |
| Pago fallido o disputa de Stripe | Al ocurrir |
| Resumen semanal | Lunes: ingresos, ocupación, pendientes |

---

## 16. Configuración inicial

Todo esto se edita desde el panel. Valores de arranque:

| Ajuste | Estudio | Foro |
|---|---|---|
| Bloques | 3 h, 6 h, 9 h | 3 h, 6 h, 12 h |
| Precios | Con ingeniero $2,700 / $4,500 / $5,500. Dry Hire $2,100 / $3,500 / $4,300 | $2,000 / $3,000 / $5,200 |
| Hora extra | $500 | $500 |
| Horario | Por definir | Lunes a domingo, 9:00 a 18:00 |
| Margen entre sesiones | 60 min | 60 min |
| Inicio cada | 60 min | 60 min |
| Anticipación mínima | 24 h | 24 h |
| Reservas hasta | 180 días | 180 días |
| Apartado con tarjeta | 30 min | 30 min |
| OXXO | Sesión a 3 días o más; ficha de 1 día; hasta $10,000 | Igual |
| Cambio de fecha | Más de 72 h | Más de 48 h |
| Cancelación | Más de 72 h: crédito por 90 días | Sin reembolso |
| Visitas | 30 min, gratis | 30 min, gratis |
| Extras | Equipo de video para podcast: se cotiza | Color de ciclorama: $4,800, 7 días, bloqueo de 2 días, solo 12 h |
| Productos | Mezcla $5,500, máster $2,000, edición $3,500, afinación $2,500, productor $7,000, músico $2,500 | |
| Cargos posteriores | Daños: monto libre | Invitado $100, limpieza $200, pintura por daños $2,500, daños: monto libre |

---

## 17. Arquitectura

### 17.1 Lenguajes y piezas

| Parte | Lenguaje | Dónde corre |
|---|---|---|
| Landings, cotizador, calendario del cliente | TypeScript | Navegador; el sitio sigue estático en Hostinger |
| Motor de precios | TypeScript, un solo módulo compartido | Navegador (vista previa) y servidor (total que se cobra) |
| API: disponibilidad, pedidos, Stripe, correos | TypeScript | Supabase Edge Functions (Deno) |
| Base de datos y reglas | SQL | Postgres en Supabase |
| Tareas programadas | SQL y TypeScript | pg_cron en Supabase |
| Panel | TypeScript con Svelte; FullCalendar para la agenda | Navegador, en `/admin/` |
| Correo | Resend, con plantillas en TypeScript | |
| Pagos | Stripe Checkout y webhooks | |

### 17.2 Motor de precios

Una función pura, sin acceso a la red:

```ts
cotizar(pedido, catalogo, politicas, ahora) → {
  lineas,       // concepto, cantidad, precio unitario, importe
  total,        // con IVA
  iva,          // incluido
  avisos,       // "el color necesita 7 días", "OXXO no disponible arriba de $10,000"
  errores,      // lo que impide pagar
  pagable,      // false si hay algo "se cotiza"
}
```

Se prueba con casos fijos (los paquetes de la página, pedidos con varias
sesiones, color con fechas límite) para que ningún cambio rompa un precio sin
que alguien se entere.

### 17.3 Tareas programadas

| Cada | Tarea |
|---|---|
| 5 min | Liberar apartados vencidos |
| 15 min | Recordatorios de sesión y de OXXO |
| Diario, 20:00 | Resumen de mañana al equipo; lista de invitados |
| Diario | Créditos por vencer, recordatorios de material, trabajos por vencer, aprobación automática de entregas |
| Semanal | Resumen semanal |

### 17.4 SEO

El build de las landings consulta el catálogo para generar los precios del
JSON-LD (`shared/vite/seo.js`) y las tarjetas iniciales en el HTML. Si un
precio cambia en el panel, el panel ofrece publicar el sitio (lanza el flujo
de GitHub Actions) para que el HTML y los datos estructurados se actualicen.
El cotizador, en cambio, siempre lee el precio vigente.

---

## 18. Modelo de datos

| Tabla | Campos principales |
|---|---|
| `spaces` | nombre, slug, zona horaria, margen, paso de inicio, anticipación, horizonte, activo |
| `opening_hours` | espacio, día de la semana, abre, cierra (puede pasar de 24:00) |
| `calendar_exceptions` | espacio, fecha, cerrado o abre/cierra, nota |
| `modes` | espacio, nombre, nota (con ingeniero, Dry Hire, única) |
| `blocks` | espacio, horas, etiqueta, frase, destacado, orden, activo |
| `block_prices` | bloque, modalidad, precio, vigente desde |
| `addons` | espacio, nombre, precio o "se cotiza", anticipación en días, días de bloqueo antes y después, bloques donde aplica, opciones (colores) |
| `products` | nombre, descripción, precio, unidad, requiere sesión, máximo, revisiones incluidas, precio de revisión extra, días de entrega, campos a pedir |
| `presets` | espacio, nombre, descripción, bloque, modalidad, productos |
| `charge_types` | espacio, nombre, precio o monto libre |
| `policies` | espacio, horas para cambio de fecha, horas para cancelación, resultado (crédito, reembolso, nada), días de vigencia del crédito, reglas OXXO |
| `customers` | correo, nombre, WhatsApp, empresa, datos fiscales, notas |
| `orders` | número (UND-0001), cliente, estado, total, origen (web o panel), versiones de documentos aceptados, cupón, notas |
| `order_lines` | pedido, tipo (sesión, extra, producto, hora extra, cargo, descuento, crédito), concepto, cantidad, precio unitario, importe, sesión relacionada |
| `sessions` | pedido, espacio, modalidad, bloque, inicio, fin, estado, ingeniero asignado, ingeniero del cliente |
| `occupancy` | espacio, rango ocupado, tipo (sesión, apartado, bloqueo, pintura, visita), referencia, vence en. Con restricción de exclusión por espacio |
| `holds` | pedido, vence en, método de pago |
| `payments` | pedido, tipo (cobro o reembolso), método, monto, estado, IDs de Stripe, registrado por |
| `credits` | cliente, monto, vence, pedido de origen, pedido donde se usó |
| `jobs` | línea del pedido, canción, estado, encargado, material, entrega, revisiones usadas, fecha de entrega |
| `guests` | sesión, nombre |
| `visits` | espacio, inicio, fin, nombre, correo, WhatsApp, estado |
| `quote_requests` | cliente, espacio, descripción, estado, pedido generado |
| `email_templates` y `email_log` | plantilla, asunto, cuerpo; envíos y estado |
| `admin_users` | correo, nombre, rol |
| `audit_log` | quién, qué, cuándo, antes y después |
| `settings` | ajustes generales |

### Estados

**Pedido:** cotización → apartado → pagado → completado. También: vencido,
cancelado (con crédito, con reembolso o sin nada).

**Sesión:** confirmada → en curso → completada. También: reprogramada,
cancelada, no presentado.

**Trabajo:** ver sección 7.2.

---

## 19. Migración desde Prospex

1. El sistema nuevo se instala con Stripe en modo de prueba y el equipo lo usa
   en paralelo.
2. Las reservas futuras de Prospex se importan como bloqueos (o como pedidos,
   si se quiere su historial), para que no haya empalmes.
3. Se cambia un espacio a la vez: primero el estudio, que hoy no tiene
   calendarios en Prospex, y después el foro.
4. Los calendarios de Prospex se apagan cuando no queden reservas futuras
   hechas ahí.
5. Si Prospex se sigue usando como CRM, cada pedido manda el contacto por su
   API.

Los términos del estudio hay que actualizarlos antes de abrir: hoy hablan de
"anticipo" y de pago 48 horas antes, y la regla nueva es pago completo al
reservar.

---

## 20. Fases

| Fase | Incluye |
|---|---|
| 1. Estudio | Catálogo, horarios, disponibilidad, cotizador con calendario, varias sesiones, productos, Stripe (tarjeta y OXXO), correos de confirmación y recordatorio, panel con agenda, pedidos, catálogo y horarios |
| 2. Foro y autogestión | Foro con color de ciclorama, invitados y cargos; Mis reservas; cambios de fecha y cancelaciones; créditos; hora extra; visitas; cotizaciones compartidas y pedidos del equipo |
| 3. Postproducción y reportes | Tablero de trabajos y revisiones, reportes, plantillas editables, cupones, cambios de precio programados, factura (CFDI), sincronización con Google Calendar |

---

## 21. Decisiones tomadas

Lo que estaba pendiente se resolvió así para construir el sistema. Todo se
cambia desde el panel, sin tocar código.

| Tema | Decisión | Dónde se cambia |
|---|---|---|
| Pago | 100% al reservar, con tarjeta, meses sin intereses (apagado) u OXXO | Reglas y políticas |
| OXXO | Solo si la sesión está a 3 días o más, ficha de 1 día, hasta $10,000 (límite de Stripe). El horario queda apartado hasta 36 horas después del vencimiento de la ficha, porque OXXO tarda hasta un día hábil en confirmar | Reglas y políticas |
| Cancelación (estudio y foro) | Como dicen los términos de octubre de 2026: sin reembolso por cancelación del cliente; reprogramación sin penalización con 48 horas; con menos de 24 horas se pierde el pago. El saldo a favor solo lo da el equipo desde el panel | Reglas y políticas |
| Versión de documentos | `2026-10-13` (aviso de privacidad y términos nuevos). Cada pedido guarda la versión aceptada | Reglas y políticas → Documentos |
| Hora extra | $500 por hora en las tres modalidades, por indicación del estudio (la guía del cliente decía $900 con ingeniero y $700 Dry Hire; por confirmar). Solo la agrega el equipo, en el momento; no se vende en línea por adelantado (es más barata que la hora de cualquier bloque) | Precios y catálogo → Modalidades |
| Horario del estudio | Lunes a domingo, de 10:00 a 22:00 (supuesto inicial) | Horarios |
| Horario del foro | De 8:00 a 20:00, como el manual técnico. Con 9:00 a 18:00 el bloque de 12 horas no cabría | Horarios |
| Cambio de color | $5,800, solo en 12 horas, se confirma con 72 horas de anticipación (términos del foro) y aparta los 2 días anteriores para pintar y secar. Opciones verde, azul u otro color | Precios y catálogo → Extras |
| Equipo de video para podcast | Se cotiza: si el cliente lo marca, el pedido se vuelve solicitud | Precios y catálogo → Extras |
| Entrega de postproducción | Mezcla 7 días hábiles, máster 3, edición 5, afinación 5, desde que llega el material. Revisiones: 2 en mezcla y máster (como dice la página), 0 en ediciones. Las revisiones extra se cotizan y se cobran como cargo | Precios y catálogo → Servicios |
| Músico de sesión | Hasta 6 por sesión; se pide el instrumento de cada uno al reservar | Precios y catálogo → Servicios |
| Factura | El cliente captura sus datos al pagar y el pedido crea el pendiente "Emitir factura" para el contador. No se timbra desde el sistema | Pendientes del pedido |
| Estudio B | No se renta por horas; existe en la agenda para bloquear tiempo | Reglas y políticas |
| Remitente | `Undying Studios <reservas@undyingstudios.mx>`, con respuesta a `music@undyingstudios.mx` | Secreto `CORREO_REMITENTE` y Ajustes |
| Avisos al equipo | `music@`, `foro@` y `admin@undyingstudios.mx` | Ajustes |
| Promociones | Casilla opcional al reservar, guardada en el cliente aparte de los términos (finalidades secundarias del aviso de privacidad) | Clientes |
| Precio con reserva | Campo opcional por servicio: si se llena, se cobra ese precio cuando el pedido incluye horas de estudio | Precios y catálogo → Servicios |
| Ingenieros | No se agendan. "Con ingeniero" crea el pendiente "Asignar ingeniero"; el nombre se anota en el pedido o en Hoy, con opción de avisar al cliente | Hoy, Pedido |
| Precios del sitio | El panel manda: el widget cobra el precio vigente y las tarjetas de las landings se actualizan solas. El botón "Publicar sitio" actualiza los datos de Google (JSON-LD) | Precios y catálogo, Ajustes |

### Pendientes del cliente

1. Revisar el horario del estudio y el del foro.
2. Revisión legal: los términos del estudio ya dicen "pago al 100% al
   reservar" y "saldo a favor"; el aviso de privacidad debe mencionar a Stripe
   (pagos), Supabase (base de datos) y Resend (correo) como encargados.
3. Enlace de Google para reseñas (Ajustes).
4. Los textos de los correos se pueden ajustar en Correos.

## 22. Implementación

Construido en octubre de 2026. La guía para activarlo está en
[reservas-puesta-en-marcha.md](reservas-puesta-en-marcha.md).

| Pieza | Tecnología |
|---|---|
| Núcleo (precios, calendario, políticas) | TypeScript puro, compartido por sitio, API y panel |
| API | Supabase Edge Function (Deno), conexión directa a Postgres |
| Base de datos | Postgres con restricción de exclusión contra empalmes |
| Pagos | Stripe Checkout por REST, webhooks firmados |
| Correo | Resend, con plantillas editables |
| Tareas | pg_cron cada 5 minutos |
| Widget y Mis reservas | TypeScript sin framework, cargado solo al abrir una reserva |
| Panel | Svelte 5 en `/admin/`, entrada con enlace mágico de Supabase Auth |
| Pruebas | 33 pruebas de núcleo y de API contra Postgres real (PGlite) |
