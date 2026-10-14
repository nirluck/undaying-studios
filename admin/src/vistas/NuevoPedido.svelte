<script lang="ts">
  import { get, post } from '../lib/api';
  import { catalogoActivo } from '../lib/catalogo';
  import { dinero, intentar, avisar } from '../lib/util.svelte';
  import SelectorHorario from '../lib/SelectorHorario.svelte';
  import { cotizar } from '../../../supabase/functions/_shared/core/precios.ts';
  import { ocupacionDeCarrito } from '../../../supabase/functions/_shared/core/disponibilidad.ts';
  import { horasTexto } from '../../../supabase/functions/_shared/core/util.ts';
  import type { Carrito, Catalogo } from '../../../supabase/functions/_shared/core/tipos.ts';

  let { params }: { params: URLSearchParams } = $props();

  let cat = $state<Catalogo | null>(null);
  // La vista se monta de nuevo en cada cambio de ruta: basta el valor inicial.
  // svelte-ignore state_referenced_locally
  let espacioId = $state(params.get('espacio') ?? 'estudio');
  let carrito = $state<Carrito>({ espacioId: 'estudio', sesiones: [], productos: [] });
  let cliente = $state({ nombre: '', correo: '', telefono: '', empresa: '' });
  let datos = $state({ proyecto: '', notas: '' });
  let libres = $state<{ concepto: string; importe: number; cantidad: number }[]>([]);
  let descuento = $state({ concepto: 'Descuento', importe: 0 });
  let accion = $state<'enlace' | 'pago_manual'>('enlace');
  let apartadoHoras = $state(24);
  let pagoManual = $state({ metodo: 'transferencia', referencia: '' });
  let buscar = $state('');
  let resultados = $state<any[]>([]);
  let enviando = $state(false);

  catalogoActivo().then((c) => {
    cat = c;
    const previo = sessionStorage.getItem('nuevo-pedido');
    if (previo) {
      sessionStorage.removeItem('nuevo-pedido');
      const x = JSON.parse(previo);
      espacioId = x.carrito?.espacioId ?? espacioId;
      if (x.carrito) carrito = { espacioId, sesiones: x.carrito.sesiones ?? [], productos: x.carrito.productos ?? [] };
      else reiniciar(params.get('inicio'));
      Object.assign(cliente, x.cliente ?? {});
      if (x.descripcion) datos.notas = x.descripcion;
    } else {
      reiniciar(params.get('inicio'));
    }
  });

  function sesionNueva(inicio: string | null = null) {
    const b = cat!.bloques.filter((x) => x.espacioId === espacioId);
    const m = cat!.modalidades.filter((x) => x.espacioId === espacioId);
    return { bloqueId: (b.find((x) => x.destacado) ?? b[0])?.id, modalidadId: m[0]?.id, inicio, extras: [] as { id: string; opcion?: string | null; texto?: string | null }[] };
  }
  function reiniciar(inicio: string | null = null) {
    carrito = { espacioId, sesiones: [sesionNueva(inicio)], productos: [] };
  }

  const bloques = $derived(cat ? cat.bloques.filter((x) => x.espacioId === espacioId) : []);
  const modalidades = $derived(cat ? cat.modalidades.filter((x) => x.espacioId === espacioId) : []);
  const extras = $derived(cat ? cat.extras.filter((x) => x.espacioId === espacioId) : []);
  const productos = $derived(cat ? cat.productos.filter((x) => x.espacioId === espacioId) : []);
  const q = $derived(cat ? cotizar({ ...carrito, espacioId }, cat, { ahora: new Date() }) : null);
  const totalLibres = $derived(libres.reduce((s, l) => s + (Number(l.importe) || 0) * (Number(l.cantidad) || 1), 0));
  const total = $derived((q?.total ?? 0) + totalLibres - (Number(descuento.importe) || 0));
  const errores = $derived(q ? q.errores.filter((e) => e.codigo !== 'EXTRA_ANTICIPACION') : []);
  const margen = $derived(cat?.espacios.find((e) => e.id === espacioId)?.margenMin ?? 60);

  function propiosDe(i: number) {
    if (!cat) return [];
    const sin = { ...carrito, espacioId, sesiones: carrito.sesiones.map((s, k) => (k === i ? { ...s, inicio: null } : s)) };
    return ocupacionDeCarrito(sin, cat, margen).map((r) => ({ inicio: r.inicio, fin: r.fin }));
  }

  let t = 0;
  function buscarCliente() {
    clearTimeout(t);
    t = window.setTimeout(async () => { resultados = buscar.trim().length > 1 ? await get(`/admin/clientes?q=${encodeURIComponent(buscar.trim())}`) : []; }, 250);
  }
  function usarCliente(c: any) {
    cliente = { nombre: c.nombre, correo: c.correo, telefono: c.telefono ?? '', empresa: c.empresa ?? '' };
    resultados = [];
    buscar = '';
    if (Number(c.credito) > 0) avisar(`Tiene ${dinero(Number(c.credito))} de saldo a favor: se aplica solo al crear el pedido.`);
  }

  function cantidad(id: string, sesion: number | null) {
    return carrito.productos.find((p) => p.id === id && (p.sesion ?? null) === sesion)?.cantidad ?? 0;
  }
  function fijarCantidad(id: string, sesion: number | null, n: number) {
    const i = carrito.productos.findIndex((p) => p.id === id && (p.sesion ?? null) === sesion);
    if (n <= 0) { if (i >= 0) carrito.productos.splice(i, 1); return; }
    if (i >= 0) carrito.productos[i].cantidad = n;
    else carrito.productos.push({ id, cantidad: n, sesion, datos: [] });
  }
  function toggleExtra(s: any, x: any, on: boolean) {
    s.extras = (s.extras ?? []).filter((e: any) => e.id !== x.id);
    if (on) s.extras.push({ id: x.id, opcion: x.opciones[0]?.id ?? null, texto: null });
  }

  async function crear() {
    enviando = true;
    const r = await intentar(() => post('/admin/pedidos', {
      carrito: { ...carrito, espacioId }, cliente, datos, libre: true, accion,
      lineasLibres: libres.filter((l) => l.concepto && l.importe > 0), descuento: descuento.importe > 0 ? descuento : null,
      apartadoHoras, pagoManual: accion === 'pago_manual' ? pagoManual : undefined,
    }), accion === 'enlace' ? 'Pedido creado y enlace enviado' : 'Pedido creado y pagado');
    enviando = false;
    if (r) location.hash = `#/pedidos/${r.pedidoId}`;
  }
</script>

<div class="cabecera"><h1>Nuevo pedido</h1></div>
{#if cat}
  <div class="rejilla-2">
    <div>
      <section class="card pila">
        <div class="fila entre">
          <h2>Espacio</h2>
          <select bind:value={espacioId} onchange={() => reiniciar()}>
            {#each cat.espacios.filter((e) => e.reservable) as e}<option value={e.id}>{e.nombreCorto}</option>{/each}
          </select>
        </div>
        {#each carrito.sesiones as s, i}
          {@const b = bloques.find((x) => x.id === s.bloqueId)}
          <div class="card pila" style="background:var(--bg-3)">
            <div class="fila entre"><h3>Sesión {i + 1}</h3><button class="btn link" onclick={() => carrito.sesiones.splice(i, 1)}>Quitar</button></div>
            <div class="form">
              <label class="campo">Horas<select bind:value={s.bloqueId}>{#each bloques as x}<option value={x.id}>{horasTexto(x.horas)}</option>{/each}</select></label>
              {#if modalidades.length > 1}<label class="campo">Modalidad<select bind:value={s.modalidadId}>{#each modalidades as m}<option value={m.id}>{m.nombre}</option>{/each}</select></label>{/if}
            </div>
            {#each extras as x}
              {@const sel = s.extras?.find((e) => e.id === x.id)}
              {@const aplica = !x.bloques || x.bloques.includes(s.bloqueId)}
              <div class="pila" style="gap:6px">
                <label class="check"><input type="checkbox" checked={!!sel} disabled={!aplica} onchange={(e) => toggleExtra(s, x, (e.target as HTMLInputElement).checked)} /> {x.nombre} {x.precio.precio == null ? '(se cotiza: agrégalo como concepto libre)' : `+ ${dinero(x.precio.precio)}`}{aplica ? '' : ' · no aplica a este bloque'}</label>
                {#if sel && x.opciones.length}
                  <div class="fila">
                    <select bind:value={sel.opcion}>{#each x.opciones as o}<option value={o.id}>{o.nombre}</option>{/each}</select>
                    {#if x.opciones.find((o) => o.id === sel.opcion)?.pideTexto}<input bind:value={sel.texto} placeholder="Color" />{/if}
                  </div>
                {/if}
              </div>
            {/each}
            {#if b}
              <SelectorHorario espacioId={espacioId} duracionMin={b.horas * 60} extras={(s.extras ?? []).map((e) => extras.find((x) => x.id === e.id)!).filter(Boolean)} propios={propiosDe(i)} bind:valor={s.inicio as string} />
            {/if}
          </div>
        {/each}
        <button class="btn" onclick={() => carrito.sesiones.push(sesionNueva())}>+ Agregar sesión</button>
      </section>

      {#if productos.length}
        <section class="card">
          <h2>Postproducción y servicios</h2>
          <table class="tabla">
            <tbody>
              {#each productos as pr}
                {@const filas = pr.unidad === 'sesion' && carrito.sesiones.length > 1 ? carrito.sesiones.map((_, k) => k) : [pr.unidad === 'sesion' && carrito.sesiones.length ? 0 : null]}
                {#each filas as k}
                  <tr>
                    <td>{pr.nombre}{k != null && carrito.sesiones.length > 1 ? ` · Sesión ${k + 1}` : ''}<br /><span class="mute">{pr.precio.precio == null ? 'se cotiza' : dinero(pr.precio.precio)} por {pr.unidad === 'cancion' ? 'canción' : pr.unidad}</span></td>
                    <td class="num"><input type="number" min="0" max={pr.maxCantidad} style="width:70px" value={cantidad(pr.id, k)} oninput={(e) => fijarCantidad(pr.id, k, Number((e.target as HTMLInputElement).value))} /></td>
                  </tr>
                  {#each pr.campos.filter((c) => c.alReservar) as c}
                    {#each Array.from({ length: cantidad(pr.id, k) }, (_, u) => u) as u}
                      {@const item = carrito.productos.find((p) => p.id === pr.id && (p.sesion ?? null) === k)}
                      <tr><td colspan="2"><input placeholder="{c.etiqueta} {u + 1}" value={item?.datos?.[u]?.[c.id] ?? ''} oninput={(e) => { if (!item) return; item.datos = item.datos ?? []; item.datos[u] = { ...(item.datos[u] ?? {}), [c.id]: (e.target as HTMLInputElement).value }; }} /></td></tr>
                    {/each}
                  {/each}
                {/each}
              {/each}
            </tbody>
          </table>
        </section>
      {/if}

      <section class="card pila">
        <h2>Conceptos con precio libre</h2>
        <p class="mute">Para proyectos a la medida, equipo extra o lo que no esté en el catálogo.</p>
        {#each libres as l, i}
          <div class="fila">
            <input bind:value={l.concepto} placeholder="Concepto" style="flex:2" />
            <input type="number" min="0" bind:value={l.importe} placeholder="Precio" style="width:110px" />
            <input type="number" min="1" bind:value={l.cantidad} style="width:70px" />
            <button class="btn link" onclick={() => libres.splice(i, 1)}>Quitar</button>
          </div>
        {/each}
        <button class="btn chico" onclick={() => libres.push({ concepto: '', importe: 0, cantidad: 1 })}>+ Agregar concepto</button>
        <div class="fila">
          <input bind:value={descuento.concepto} style="flex:2" />
          <input type="number" min="0" bind:value={descuento.importe} style="width:110px" placeholder="Descuento" />
        </div>
      </section>
    </div>

    <div>
      <section class="card pila">
        <h2>Cliente</h2>
        <input placeholder="Buscar cliente existente" bind:value={buscar} oninput={buscarCliente} />
        {#if resultados.length}
          <div class="lista">{#each resultados as c}<button class="btn link" style="text-align:left" onclick={() => usarCliente(c)}>{c.nombre} · {c.correo}</button>{/each}</div>
        {/if}
        <label class="campo">Nombre<input bind:value={cliente.nombre} /></label>
        <label class="campo">Correo<input type="email" bind:value={cliente.correo} /></label>
        <label class="campo">WhatsApp<input bind:value={cliente.telefono} /></label>
        <label class="campo">Empresa<input bind:value={cliente.empresa} /></label>
        <label class="campo">Proyecto<input bind:value={datos.proyecto} /></label>
        <label class="campo">Notas<textarea rows="2" bind:value={datos.notas}></textarea></label>
      </section>

      <section class="card pila">
        <h2>Resumen</h2>
        {#if q}
          <table class="tabla"><tbody>
            {#each q.lineas as l}<tr><td>{l.concepto}</td><td class="num">{l.seCotiza ? 'cotizar' : dinero(l.importe)}</td></tr>{/each}
            {#each libres.filter((l) => l.concepto && l.importe > 0) as l}<tr><td>{l.concepto}{l.cantidad > 1 ? ` × ${l.cantidad}` : ''}</td><td class="num">{dinero(l.importe * l.cantidad)}</td></tr>{/each}
            {#if descuento.importe > 0}<tr><td>{descuento.concepto}</td><td class="num">−{dinero(descuento.importe)}</td></tr>{/if}
            <tr><td><b>Total</b></td><td class="num"><b>{dinero(total)}</b></td></tr>
          </tbody></table>
          {#each errores.filter((e) => e.codigo !== 'FALTA_FECHA') as e}<p class="err">{e.mensaje}</p>{/each}
          {#if q.seCotiza}<p class="err">Hay extras "se cotiza": quítalos y agrégalos como concepto libre con su precio.</p>{/if}
        {/if}
        <label class="campo">Cobro
          <select bind:value={accion}>
            <option value="enlace">Mandar enlace de pago al cliente (Stripe)</option>
            <option value="pago_manual">Ya pagó (transferencia o efectivo)</option>
          </select>
        </label>
        {#if accion === 'enlace'}
          <label class="campo">Apartar el horario por (horas)<input type="number" min="1" max="336" bind:value={apartadoHoras} /></label>
        {:else}
          <div class="form">
            <label class="campo">Método<select bind:value={pagoManual.metodo}><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option></select></label>
            <label class="campo">Referencia<input bind:value={pagoManual.referencia} /></label>
          </div>
        {/if}
        <button class="btn pri" disabled={enviando || !cliente.nombre || !cliente.correo || errores.length > 0 || !!q?.seCotiza || (!carrito.sesiones.length && !carrito.productos.length && !libres.length)} onclick={crear}>
          {accion === 'enlace' ? 'Crear y mandar enlace' : 'Crear pedido pagado'}
        </button>
        {#if errores.some((e) => e.codigo === 'FALTA_FECHA')}<p class="mute">Elige fecha y hora de cada sesión.</p>{/if}
      </section>
    </div>
  </div>
{/if}
