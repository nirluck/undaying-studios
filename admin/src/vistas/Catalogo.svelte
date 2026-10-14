<script lang="ts">
  import { borrar, put } from '../lib/api';
  import { catalogo } from '../lib/catalogo';
  import { dinero, intentar, puede } from '../lib/util.svelte';
  import Modal from '../lib/Modal.svelte';
  import { ahorroBloque, precioVigente } from '../../../supabase/functions/_shared/core/precios.ts';
  import { horasTexto } from '../../../supabase/functions/_shared/core/util.ts';

  let cat = $state<any>(null);
  let espacio = $state('estudio');
  let pestana = $state(puede() ? 'bloques' : 'cupones');
  let edit = $state<any>(null);
  let tabla = $state('');
  let abierto = $state(false);
  const cargar = async (fresco = true) => { cat = await intentar(() => catalogo(fresco)); };
  cargar(false);

  const de = (xs: any[]) => (xs ?? []).filter((x) => x.espacioId === espacio);
  const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  const fechaInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');
  const TAREAS = { '': 'Ninguna', asignar_ingeniero: 'Asignar ingeniero', confirmar_productor: 'Confirmar productor', confirmar_musico: 'Confirmar músico', programar_pintura: 'Pintar ciclorama' };

  function abrir(t: string, x: any = null) {
    tabla = t;
    const nuevo = !x;
    if (t === 'bloques') {
      const mods = de(cat.modalidades);
      edit = nuevo ? { nuevo, espacioId: espacio, horas: 3, etiqueta: '', frase: '', destacado: false, orden: de(cat.bloques).length + 1, activo: true, precios: Object.fromEntries(mods.map((m: any) => [m.id, { precio: 0, nuevo: null, desde: '' }])) }
        : { ...x, precios: Object.fromEntries(mods.map((m: any) => [m.id, { precio: x.precios[m.id]?.precio ?? 0, nuevo: x.precios[m.id]?.nuevo ?? null, desde: fechaInput(x.precios[m.id]?.desde) }])) };
    } else if (t === 'modalidades') {
      edit = nuevo ? { nuevo, espacioId: espacio, nombre: '', nota: '', descripcionCorta: '', ventajas: '', tarea: '', pideIngenieroCliente: false, horaExtra: 500, horaExtraNuevo: null, horaExtraDesde: '', orden: 9, activo: true }
        : { ...x, ventajas: (x.ventajas ?? []).join('\n'), horaExtra: x.horaExtra.precio, horaExtraNuevo: x.horaExtra.nuevo, horaExtraDesde: fechaInput(x.horaExtra.desde), tarea: x.tarea ?? '' };
    } else if (t === 'extras') {
      edit = nuevo ? { nuevo, espacioId: espacio, nombre: '', descripcion: '', precio: null, precioNuevo: null, precioNuevoDesde: '', anticipacionDias: 0, bloqueoAntesDias: 0, bloqueoDespuesDias: 0, bloques: [], opciones: [], unaVezPorRacha: false, tarea: '', orden: 9, activo: true }
        : { ...x, precio: x.precio.precio, precioNuevo: x.precio.nuevo, precioNuevoDesde: fechaInput(x.precio.desde), bloques: x.bloques ?? [], opciones: structuredClone(x.opciones ?? []), tarea: x.tarea ?? '' };
    } else if (t === 'productos') {
      edit = nuevo ? { nuevo, espacioId: espacio, nombre: '', descripcion: '', precio: 0, precioNuevo: null, precioNuevoDesde: '', unidad: 'cancion', requiereSesion: false, maxPorSesion: null, maxCantidad: 20, revisiones: 0, precioRevision: null, entregaDias: null, generaTrabajo: true, tarea: '', campos: [], orden: 9, activo: true }
        : { ...x, precio: x.precio.precio, precioNuevo: x.precio.nuevo, precioNuevoDesde: fechaInput(x.precio.desde), campos: structuredClone(x.campos ?? []), tarea: x.tarea ?? '' };
    } else if (t === 'paquetes') {
      edit = nuevo ? { nuevo, espacioId: espacio, nombre: '', descripcion: '', bloqueId: '', modalidadId: '', productos: {}, orden: 9, activo: true } : { ...x, productos: { ...x.productos } };
    } else if (t === 'tipos_cargo') {
      edit = nuevo ? { nuevo, espacioId: espacio, nombre: '', precio: null, orden: 9, activo: true } : { ...x };
    } else if (t === 'cupones') {
      edit = nuevo ? { nuevo, codigo: '', descripcion: '', tipo: 'porcentaje', valor: 10, espacioId: '', desde: '', hasta: '', usosMax: null, activo: true } : { ...x, desde: fechaInput(x.desde), hasta: fechaInput(x.hasta), espacioId: x.espacioId ?? '' };
    }
    abierto = true;
  }

  const n = (v: any) => (v === '' || v == null ? null : Number(v));
  const f = (v: any) => (v ? new Date(v).toISOString() : null);

  async function guardar() {
    const e = edit;
    const id = e.id ?? (tabla === 'bloques' ? `${espacio}-${e.horas}h` : `${espacio}-${slug(e.nombre)}`);
    let ok: unknown;
    if (tabla === 'bloques') {
      ok = await intentar(async () => {
        await put('/admin/catalogo/bloques', { id, espacioId: e.espacioId, horas: n(e.horas), etiqueta: e.etiqueta, frase: e.frase, destacado: e.destacado, orden: n(e.orden), activo: e.activo });
        for (const [m, p] of Object.entries<any>(e.precios)) await put('/admin/catalogo/precios_bloque', { bloqueId: id, modalidadId: m, precio: n(p.precio) ?? 0, precioNuevo: n(p.nuevo), precioNuevoDesde: f(p.desde) });
        return true;
      }, 'Bloque guardado');
    } else if (tabla === 'modalidades') {
      ok = await intentar(() => put('/admin/catalogo/modalidades', { id, espacioId: e.espacioId, nombre: e.nombre, nota: e.nota, descripcionCorta: e.descripcionCorta, ventajas: e.ventajas.split('\n').map((x: string) => x.trim()).filter(Boolean), tarea: e.tarea || null, pideIngenieroCliente: e.pideIngenieroCliente, horaExtra: n(e.horaExtra), horaExtraNuevo: n(e.horaExtraNuevo), horaExtraDesde: f(e.horaExtraDesde), orden: n(e.orden), activo: e.activo }), 'Modalidad guardada');
    } else if (tabla === 'extras') {
      ok = await intentar(() => put('/admin/catalogo/extras', { id, espacioId: e.espacioId, nombre: e.nombre, descripcion: e.descripcion, precio: n(e.precio), precioNuevo: n(e.precioNuevo), precioNuevoDesde: f(e.precioNuevoDesde), anticipacionDias: n(e.anticipacionDias) ?? 0, bloqueoAntesDias: n(e.bloqueoAntesDias) ?? 0, bloqueoDespuesDias: n(e.bloqueoDespuesDias) ?? 0, bloques: e.bloques, opciones: e.opciones.map((o: any) => ({ ...o, id: o.id || slug(o.nombre) })), unaVezPorRacha: e.unaVezPorRacha, tarea: e.tarea || null, orden: n(e.orden), activo: e.activo }), 'Extra guardado');
    } else if (tabla === 'productos') {
      ok = await intentar(() => put('/admin/catalogo/productos', { id: e.id ?? slug(e.nombre), espacioId: e.espacioId, nombre: e.nombre, descripcion: e.descripcion, precio: n(e.precio), precioNuevo: n(e.precioNuevo), precioNuevoDesde: f(e.precioNuevoDesde), precioConReserva: n(e.precioConReserva), unidad: e.unidad, requiereSesion: e.requiereSesion, maxPorSesion: n(e.maxPorSesion), maxCantidad: n(e.maxCantidad) ?? 20, revisiones: n(e.revisiones) ?? 0, precioRevision: n(e.precioRevision), entregaDias: n(e.entregaDias), generaTrabajo: e.generaTrabajo, tarea: e.tarea || null, campos: e.campos.map((c: any) => ({ ...c, id: c.id || slug(c.etiqueta) })), orden: n(e.orden), activo: e.activo }), 'Servicio guardado');
    } else if (tabla === 'paquetes') {
      ok = await intentar(() => put('/admin/catalogo/paquetes', { id: e.id ?? slug(e.nombre), espacioId: e.espacioId, nombre: e.nombre, descripcion: e.descripcion, bloqueId: e.bloqueId || null, modalidadId: e.modalidadId || null, productos: Object.fromEntries(Object.entries(e.productos).filter(([, v]) => Number(v) > 0)), orden: n(e.orden), activo: e.activo }), 'Paquete guardado');
    } else if (tabla === 'tipos_cargo') {
      ok = await intentar(() => put('/admin/catalogo/tipos_cargo', { id, espacioId: e.espacioId || null, nombre: e.nombre, precio: n(e.precio), orden: n(e.orden), activo: e.activo }), 'Cargo guardado');
    } else if (tabla === 'cupones') {
      ok = await intentar(() => put('/admin/catalogo/cupones', { codigo: e.codigo.toUpperCase(), descripcion: e.descripcion, tipo: e.tipo, valor: n(e.valor), espacioId: e.espacioId || null, desde: f(e.desde), hasta: f(e.hasta), usosMax: n(e.usosMax), activo: e.activo }), 'Cupón guardado');
    }
    if (ok) { abierto = false; cargar(); }
  }

  async function quitar() {
    const id = tabla === 'cupones' ? edit.codigo : edit.id;
    const r = await intentar(() => borrar(`/admin/catalogo/${tabla}/${encodeURIComponent(id)}`));
    if (r) { abierto = false; cargar(); }
  }

  const ahora = new Date();
  const precio = (p: any) => { const v = precioVigente(p, ahora); return v == null ? 'se cotiza' : dinero(v); };
  const programado = (p: any) => (p?.nuevo != null && p?.desde && new Date(p.desde) > ahora ? ` → ${dinero(p.nuevo)} desde ${new Date(p.desde).toLocaleDateString('es-MX')}` : '');
</script>

<div class="cabecera">
  <h1>Precios y catálogo</h1>
  <select bind:value={espacio}><option value="estudio">Estudio</option><option value="foro">Foro</option></select>
</div>
<p class="mute" style="margin-bottom:12px">Los cambios se cobran de inmediato en el sitio. Puedes programar un precio nuevo con fecha de inicio. Lo que se desactiva deja de ofrecerse, pero los pedidos ya hechos no cambian.</p>
<div class="pestanas">
  {#each (puede() ? [['bloques', 'Bloques y precios'], ['modalidades', 'Modalidades'], ['extras', 'Extras'], ['productos', 'Servicios'], ['paquetes', 'Paquetes'], ['tipos_cargo', 'Cargos'], ['cupones', 'Cupones']] : [['cupones', 'Cupones']]) as [k, v]}
    <button class:on={pestana === k} onclick={() => (pestana = k)}>{v}</button>
  {/each}
</div>

{#if cat}
  <div class="card desplazable" style="padding:0">
    <table class="tabla">
      {#if pestana === 'bloques'}
        <thead><tr><th>Bloque</th>{#each de(cat.modalidades) as m}<th>{m.nombre}</th>{/each}<th>Etiqueta</th><th></th></tr></thead>
        <tbody>{#each de(cat.bloques) as b}
          <tr class="clic" onclick={() => abrir('bloques', b)} class:mute={!b.activo}>
            <td><b style="color:var(--ink)">{horasTexto(b.horas)}</b>{b.destacado ? ' · destacado' : ''}</td>
            {#each de(cat.modalidades) as m}<td>{precio(b.precios[m.id])}<span class="mute">{programado(b.precios[m.id])}</span>{#if ahorroBloque(cat, b, m.id, ahora)}<br /><span class="mute">{ahorroBloque(cat, b, m.id, ahora)}% menos</span>{/if}</td>{/each}
            <td>{b.etiqueta ?? ''}</td><td>{b.activo ? '' : 'Inactivo'}</td>
          </tr>{/each}</tbody>
      {:else if pestana === 'modalidades'}
        <thead><tr><th>Modalidad</th><th>Hora extra</th><th>Al venderse</th><th></th></tr></thead>
        <tbody>{#each de(cat.modalidades) as m}
          <tr class="clic" onclick={() => abrir('modalidades', m)} class:mute={!m.activo}><td><b style="color:var(--ink)">{m.nombre}</b> <span class="mute">{m.nota ?? ''}</span></td><td>{precio(m.horaExtra)}{programado(m.horaExtra)}</td><td>{TAREAS[(m.tarea ?? '') as keyof typeof TAREAS]}</td><td>{m.activo ? '' : 'Inactiva'}</td></tr>{/each}</tbody>
      {:else if pestana === 'extras'}
        <thead><tr><th>Extra</th><th>Precio</th><th>Reglas</th><th></th></tr></thead>
        <tbody>{#each de(cat.extras) as x}
          <tr class="clic" onclick={() => abrir('extras', x)} class:mute={!x.activo}><td><b style="color:var(--ink)">{x.nombre}</b></td><td>{precio(x.precio)}{programado(x.precio)}</td>
            <td class="mute">{x.anticipacionDias ? `${x.anticipacionDias} días de anticipación · ` : ''}{x.bloqueoAntesDias ? `aparta ${x.bloqueoAntesDias} días antes · ` : ''}{x.bloqueoDespuesDias ? `aparta ${x.bloqueoDespuesDias} días después · ` : ''}{x.bloques ? `solo ${x.bloques.map((id: string) => cat.bloques.find((b: any) => b.id === id)?.horas + ' h').join(', ')}` : 'todos los bloques'}</td><td>{x.activo ? '' : 'Inactivo'}</td></tr>{/each}</tbody>
      {:else if pestana === 'productos'}
        <thead><tr><th>Servicio</th><th>Precio</th><th>Entrega</th><th>Revisiones</th><th></th></tr></thead>
        <tbody>{#each de(cat.productos) as p}
          <tr class="clic" onclick={() => abrir('productos', p)} class:mute={!p.activo}><td><b style="color:var(--ink)">{p.nombre}</b><br /><span class="mute">por {p.unidad === 'cancion' ? 'canción' : p.unidad}{p.requiereSesion ? ' · con horas de estudio' : ''}</span></td><td>{precio(p.precio)}{programado(p.precio)}{#if p.precioConReserva != null}<br /><span class="mute">{dinero(p.precioConReserva)} con reserva</span>{/if}</td><td>{p.entregaDias ? `${p.entregaDias} días hábiles` : '—'}</td><td>{p.revisiones || '—'}</td><td>{p.activo ? '' : 'Inactivo'}</td></tr>{/each}</tbody>
      {:else if pestana === 'paquetes'}
        <thead><tr><th>Paquete</th><th>Incluye</th><th></th></tr></thead>
        <tbody>{#each de(cat.paquetes) as p}
          <tr class="clic" onclick={() => abrir('paquetes', p)} class:mute={!p.activo}><td><b style="color:var(--ink)">{p.nombre}</b></td><td class="mute">{p.bloqueId ? cat.bloques.find((b: any) => b.id === p.bloqueId)?.horas + ' h' : ''} {Object.entries(p.productos).map(([k, v]) => `${cat.productos.find((x: any) => x.id === k)?.nombre ?? k} × ${v}`).join(', ')}</td><td>{p.activo ? '' : 'Inactivo'}</td></tr>{/each}</tbody>
      {:else if pestana === 'tipos_cargo'}
        <thead><tr><th>Cargo posterior</th><th>Precio</th><th>Espacio</th></tr></thead>
        <tbody>{#each cat.tiposCargo.filter((t: any) => !t.espacioId || t.espacioId === espacio) as t}
          <tr class="clic" onclick={() => abrir('tipos_cargo', t)} class:mute={!t.activo}><td><b style="color:var(--ink)">{t.nombre}</b></td><td>{t.precio == null ? 'Monto libre' : dinero(t.precio)}</td><td>{t.espacioId ?? 'Todos'}</td></tr>{/each}</tbody>
      {:else if pestana === 'cupones'}
        <thead><tr><th>Código</th><th>Descuento</th><th>Vigencia</th><th>Usos</th></tr></thead>
        <tbody>{#each cat.cupones as c}
          <tr class="clic" onclick={() => abrir('cupones', c)} class:mute={!c.activo}><td><b style="color:var(--ink)">{c.codigo}</b><br /><span class="mute">{c.descripcion ?? ''}</span></td><td>{c.tipo === 'porcentaje' ? `${c.valor}%` : dinero(c.valor)}{c.espacioId ? ` · ${c.espacioId}` : ''}</td><td class="mute">{c.desde ? new Date(c.desde).toLocaleDateString('es-MX') : 'siempre'} – {c.hasta ? new Date(c.hasta).toLocaleDateString('es-MX') : 'sin fin'}</td><td>{c.usos}{c.usosMax ? ` de ${c.usosMax}` : ''}</td></tr>
        {:else}<tr><td colspan="4" class="mute">Sin cupones.</td></tr>{/each}</tbody>
      {/if}
    </table>
  </div>
  <button class="btn" style="margin-top:12px" onclick={() => abrir(pestana)}>+ Agregar</button>
{/if}

<Modal titulo={edit?.nuevo ? 'Agregar' : 'Editar'} bind:abierto>
  {#if edit}
    {#if tabla === 'bloques'}
      <div class="form">
        <label class="campo">Horas<input type="number" min="0.5" step="0.5" bind:value={edit.horas} disabled={!edit.nuevo} /></label>
        <label class="campo">Orden<input type="number" bind:value={edit.orden} /></label>
        <label class="campo ancho">Etiqueta (Más popular, Mejor tarifa…)<input bind:value={edit.etiqueta} /></label>
        <label class="campo ancho">Frase<input bind:value={edit.frase} /></label>
      </div>
      {#each de(cat.modalidades) as m}
        <fieldset class="form" style="border:1px solid var(--line);border-radius:8px;padding:10px">
          <legend class="mute">{m.nombre}</legend>
          <label class="campo">Precio<input type="number" min="0" bind:value={edit.precios[m.id].precio} /></label>
          <label class="campo">Precio nuevo<input type="number" min="0" bind:value={edit.precios[m.id].nuevo} /></label>
          <label class="campo">A partir de<input type="datetime-local" bind:value={edit.precios[m.id].desde} /></label>
        </fieldset>
      {/each}
      <label class="check"><input type="checkbox" bind:checked={edit.destacado} /> Destacado</label>
    {:else if tabla === 'modalidades'}
      <div class="form">
        <label class="campo">Nombre<input bind:value={edit.nombre} /></label>
        <label class="campo">Nota<input bind:value={edit.nota} /></label>
        <label class="campo ancho">Cómo se lee en el pedido ("con ingeniero")<input bind:value={edit.descripcionCorta} /></label>
        <label class="campo ancho">Qué incluye (una línea por punto)<textarea rows="4" bind:value={edit.ventajas}></textarea></label>
        <label class="campo">Hora extra<input type="number" min="0" bind:value={edit.horaExtra} /></label>
        <label class="campo">Hora extra nueva<input type="number" min="0" bind:value={edit.horaExtraNuevo} /></label>
        <label class="campo">A partir de<input type="datetime-local" bind:value={edit.horaExtraDesde} /></label>
        <label class="campo">Pendiente al venderse<select bind:value={edit.tarea}>{#each Object.entries(TAREAS) as [k, v]}<option value={k}>{v}</option>{/each}</select></label>
        <label class="campo">Orden<input type="number" bind:value={edit.orden} /></label>
      </div>
      <label class="check"><input type="checkbox" bind:checked={edit.pideIngenieroCliente} /> Pedir datos del ingeniero del cliente (Dry Hire)</label>
    {:else if tabla === 'extras'}
      <div class="form">
        <label class="campo ancho">Nombre<input bind:value={edit.nombre} /></label>
        <label class="campo ancho">Descripción<textarea rows="2" bind:value={edit.descripcion}></textarea></label>
        <label class="campo">Precio (vacío = se cotiza)<input type="number" min="0" bind:value={edit.precio} /></label>
        <label class="campo">Precio nuevo<input type="number" min="0" bind:value={edit.precioNuevo} /></label>
        <label class="campo">A partir de<input type="datetime-local" bind:value={edit.precioNuevoDesde} /></label>
        <label class="campo">Días de anticipación<input type="number" min="0" bind:value={edit.anticipacionDias} /></label>
        <label class="campo">Aparta días antes<input type="number" min="0" bind:value={edit.bloqueoAntesDias} /></label>
        <label class="campo">Aparta días después<input type="number" min="0" bind:value={edit.bloqueoDespuesDias} /></label>
        <label class="campo">Pendiente al venderse<select bind:value={edit.tarea}>{#each Object.entries(TAREAS) as [k, v]}<option value={k}>{v}</option>{/each}</select></label>
      </div>
      <p class="mute">Bloques donde se ofrece (ninguno marcado = todos):</p>
      <div class="fila">{#each de(cat.bloques) as b}<label class="check"><input type="checkbox" checked={edit.bloques.includes(b.id)} onchange={(e) => (edit.bloques = (e.target as HTMLInputElement).checked ? [...edit.bloques, b.id] : edit.bloques.filter((x: string) => x !== b.id))} /> {b.horas} h</label>{/each}</div>
      <label class="check"><input type="checkbox" bind:checked={edit.unaVezPorRacha} /> En días seguidos con la misma opción se cobra y se prepara una sola vez</label>
      <p class="mute">Opciones (colores, variantes):</p>
      {#each edit.opciones as o, i}
        <div class="fila">
          <input bind:value={o.nombre} placeholder="Nombre" style="flex:1" />
          <input type="color" bind:value={o.muestra} title="Muestra" />
          <label class="check"><input type="checkbox" bind:checked={o.pideTexto} /> Pide texto</label>
          <button class="btn link" onclick={() => edit.opciones.splice(i, 1)}>Quitar</button>
        </div>
      {/each}
      <button class="btn chico" onclick={() => edit.opciones.push({ id: '', nombre: '', muestra: '#888888', pideTexto: false })}>+ Opción</button>
    {:else if tabla === 'productos'}
      <div class="form">
        <label class="campo ancho">Nombre<input bind:value={edit.nombre} /></label>
        <label class="campo ancho">Descripción<textarea rows="2" bind:value={edit.descripcion}></textarea></label>
        <label class="campo">Precio (vacío = se cotiza)<input type="number" min="0" bind:value={edit.precio} /></label>
        <label class="campo">Precio nuevo<input type="number" min="0" bind:value={edit.precioNuevo} /></label>
        <label class="campo">A partir de<input type="datetime-local" bind:value={edit.precioNuevoDesde} /></label>
        <label class="campo">Precio con reserva de horas (vacío = el mismo)<input type="number" min="0" bind:value={edit.precioConReserva} /></label>
        <label class="campo">Se cobra por<select bind:value={edit.unidad}><option value="cancion">Canción</option><option value="sesion">Sesión</option><option value="pieza">Pieza</option></select></label>
        <label class="campo">Máximo por pedido<input type="number" min="1" bind:value={edit.maxCantidad} /></label>
        <label class="campo">Máximo por sesión<input type="number" min="1" bind:value={edit.maxPorSesion} /></label>
        <label class="campo">Revisiones incluidas<input type="number" min="0" bind:value={edit.revisiones} /></label>
        <label class="campo">Días hábiles de entrega<input type="number" min="0" bind:value={edit.entregaDias} /></label>
        <label class="campo">Pendiente al venderse<select bind:value={edit.tarea}>{#each Object.entries(TAREAS) as [k, v]}<option value={k}>{v}</option>{/each}</select></label>
      </div>
      <label class="check"><input type="checkbox" bind:checked={edit.requiereSesion} /> Solo junto con horas de estudio</label>
      <label class="check"><input type="checkbox" bind:checked={edit.generaTrabajo} /> Se entrega (aparece en el tablero de postproducción)</label>
      <p class="mute">Datos que se piden por pieza:</p>
      {#each edit.campos as c, i}
        <div class="fila"><input bind:value={c.etiqueta} placeholder="Ej. Instrumento" style="flex:1" /><label class="check"><input type="checkbox" bind:checked={c.alReservar} /> Obligatorio al reservar</label><button class="btn link" onclick={() => edit.campos.splice(i, 1)}>Quitar</button></div>
      {/each}
      <button class="btn chico" onclick={() => edit.campos.push({ id: '', etiqueta: '', alReservar: false })}>+ Dato</button>
    {:else if tabla === 'paquetes'}
      <div class="form">
        <label class="campo ancho">Nombre<input bind:value={edit.nombre} /></label>
        <label class="campo ancho">Descripción<input bind:value={edit.descripcion} /></label>
        <label class="campo">Bloque<select bind:value={edit.bloqueId}><option value="">Sin horas</option>{#each de(cat.bloques) as b}<option value={b.id}>{b.horas} h</option>{/each}</select></label>
        <label class="campo">Modalidad<select bind:value={edit.modalidadId}><option value=""></option>{#each de(cat.modalidades) as m}<option value={m.id}>{m.nombre}</option>{/each}</select></label>
      </div>
      {#each de(cat.productos) as p}<label class="campo">{p.nombre}<input type="number" min="0" value={edit.productos[p.id] ?? 0} oninput={(e) => (edit.productos[p.id] = Number((e.target as HTMLInputElement).value))} /></label>{/each}
    {:else if tabla === 'tipos_cargo'}
      <div class="form">
        <label class="campo ancho">Nombre<input bind:value={edit.nombre} /></label>
        <label class="campo">Precio (vacío = monto libre)<input type="number" min="0" bind:value={edit.precio} /></label>
        <label class="campo">Espacio<select bind:value={edit.espacioId}><option value="">Todos</option><option value="estudio">Estudio</option><option value="foro">Foro</option></select></label>
      </div>
    {:else if tabla === 'cupones'}
      <div class="form">
        <label class="campo">Código<input bind:value={edit.codigo} disabled={!edit.nuevo} style="text-transform:uppercase" /></label>
        <label class="campo">Tipo<select bind:value={edit.tipo}><option value="porcentaje">Porcentaje</option><option value="monto">Monto fijo</option></select></label>
        <label class="campo">Valor<input type="number" min="1" bind:value={edit.valor} /></label>
        <label class="campo">Espacio<select bind:value={edit.espacioId}><option value="">Todos</option><option value="estudio">Estudio</option><option value="foro">Foro</option></select></label>
        <label class="campo">Desde<input type="datetime-local" bind:value={edit.desde} /></label>
        <label class="campo">Hasta<input type="datetime-local" bind:value={edit.hasta} /></label>
        <label class="campo">Usos máximos<input type="number" min="1" bind:value={edit.usosMax} /></label>
        <label class="campo ancho">Descripción<input bind:value={edit.descripcion} /></label>
      </div>
    {/if}
    <label class="check"><input type="checkbox" bind:checked={edit.activo} /> Activo</label>
  {/if}
  {#snippet pie()}
    {#if edit && !edit.nuevo}<button class="btn peligro" onclick={quitar}>Borrar</button>{/if}
    <button class="btn pri" onclick={guardar}>Guardar</button>
  {/snippet}
</Modal>
