<script lang="ts">
  import { get, post } from '../lib/api';
  import { catalogo } from '../lib/catalogo';
  import { dinero, ESPACIO, ESTADO_PEDIDO, ESTADO_TRABAJO, fecha, fechaHora, intentar, METODO, puede } from '../lib/util.svelte';
  import Modal from '../lib/Modal.svelte';
  import SelectorHorario from '../lib/SelectorHorario.svelte';
  import ListaPersonas from '../lib/ListaPersonas.svelte';

  let { id }: { id: string } = $props();
  let p = $state<any>(null);
  let cat = $state<any>(null);
  let notas = $state('');

  async function cargar() {
    const r = await intentar(() => get(`/admin/pedidos/${id}`));
    if (r) { p = r; notas = r.pedido.notasInternas ?? ''; }
  }
  cargar();
  catalogo().then((c) => (cat = c));

  const activas = $derived(p ? p.sesiones.filter((s: any) => s.estado === 'activa') : []);
  const editable = $derived(p && ['pagado', 'completado'].includes(p.pedido.estado) && puede('operacion'));
  const d = $derived(p?.pedido.datos ?? {});

  // ---------- Acciones ----------
  let modal = $state<'' | 'fecha' | 'extra' | 'cargo' | 'pago' | 'reembolso' | 'cancelar' | 'enlace'>('');
  let abierto = $state(false);
  let sesionSel = $state<any>(null);
  let nuevoInicio = $state('');
  let avisarCliente = $state(true);
  let horas = $state(1);
  let cobro = $state<{ modo: string; metodo: string; referencia: string }>({ modo: 'pendiente', metodo: 'efectivo', referencia: '' });
  let cargo = $state({ tipoCargo: '', concepto: '', precioUnitario: 0, cantidad: 1 });
  let pago = $state({ monto: 0, metodo: 'transferencia', referencia: '' });
  let reembolso = $state({ monto: 0, motivo: '' });
  let cancelar = $state({ tipo: 'politica', monto: '', motivo: '' });
  let horasEnlace = $state(24);

  function abrir(m: typeof modal, s: any = null) {
    modal = m;
    sesionSel = s;
    nuevoInicio = '';
    cobro = { modo: 'pendiente', metodo: 'efectivo', referencia: '' };
    if (m === 'pago') pago = { monto: p.saldo > 0 ? p.saldo : p.pedido.total, metodo: 'transferencia', referencia: '' };
    if (m === 'reembolso') reembolso = { monto: 0, motivo: '' };
    if (m === 'cargo') cargo = { tipoCargo: '', concepto: '', precioUnitario: 0, cantidad: 1 };
    abierto = true;
  }
  const hecho = async (fn: () => Promise<unknown>, ok: string) => { if (await intentar(fn, ok)) { abierto = false; cargar(); } };

  const tiposCargo = $derived(cat ? cat.tiposCargo.filter((t: any) => t.activo && (!t.espacioId || t.espacioId === p?.pedido.espacioId)) : []);
  $effect(() => {
    const t = tiposCargo.find((x: any) => x.id === cargo.tipoCargo);
    if (t) { cargo.concepto = t.nombre; if (t.precio != null) cargo.precioUnitario = t.precio; }
  });
  const extrasDe = (s: any) => (cat ? (s.extras ?? []).map((x: any) => cat.extras.find((e: any) => e.id === x.id)).filter(Boolean) : []);
  const textoExtra = (x: any) => { const e = cat?.extras.find((y: any) => y.id === x.id); const o = e?.opciones.find((z: any) => z.id === x.opcion); return `${e?.nombre ?? x.id}${o ? ': ' + (o.pideTexto ? x.texto : o.nombre) : ''}`; };

  async function guardarSesion(s: any, f: HTMLFormElement) {
    await intentar(() => post(`/admin/pedidos/${id}/sesion`, { sesion: s.id, ingenieroAsignado: f.ingeniero.value, notas: f.notas.value, avisarCliente: f.avisar.checked }), 'Sesión guardada');
    cargar();
  }
  // Productor, músico: servicios que se dan durante la sesión
  const enSesion = $derived(p ? p.lineas.filter((l: any) => l.enSesion) : []);
  const textoSesion = (l: any) => p.sesiones.find((s: any) => s.id === l.sesionId)?.texto ?? '';
  async function asignar(l: any, f: HTMLFormElement) {
    await intentar(() => post(`/admin/pedidos/${id}/linea`, { linea: l.id, asignado: f.asignado.value, avisarCliente: f.avisar.checked }), 'Guardado');
    f.avisar.checked = false;
    cargar();
  }
  async function tarea(t: any) { await intentar(() => post(`/admin/tareas/${t.id}`, { hecha: !t.hechaEn })); cargar(); }
</script>

<ListaPersonas />
{#if p}
  <div class="cabecera">
    <div>
      <p class="mute"><a href="#/pedidos">Pedidos</a> · {ESPACIO[p.pedido.espacioId]}</p>
      <h1>{p.pedido.numero} <span class="badge {p.pedido.estado}">{ESTADO_PEDIDO[p.pedido.estado]}</span></h1>
      <p class="mute">Creado el {fechaHora(p.pedido.creado)} {p.pedido.origen === 'panel' ? `por ${p.pedido.creadoPor}` : 'en el sitio'}{p.pedido.apartadoVence ? ` · apartado hasta ${fechaHora(p.pedido.apartadoVence)}` : ''}</p>
    </div>
    {#if puede('operacion')}
      <div class="fila">
        {#if p.saldo > 0 || p.pedido.estado === 'apartado'}<button class="btn" onclick={() => abrir('enlace')}>Mandar enlace de pago</button>{/if}
        {#if ['apartado', 'pendiente_pago', 'vencido', 'pagado', 'completado'].includes(p.pedido.estado)}<button class="btn" onclick={() => abrir('pago')}>Registrar pago</button>{/if}
        {#if editable}<button class="btn" onclick={() => abrir('cargo')}>Agregar cargo</button>{/if}
        {#if editable && puede()}<button class="btn" onclick={() => abrir('reembolso')}>Reembolsar</button>{/if}
        {#if ['pagado', 'apartado', 'pendiente_pago'].includes(p.pedido.estado)}<button class="btn peligro" onclick={() => abrir('cancelar')}>Cancelar</button>{/if}
      </div>
    {/if}
  </div>

  <div class="rejilla-2">
    <div>
      {#if p.sesiones.length}
        <section class="card">
          <h2>Sesiones</h2>
          <div class="lista">
            {#each p.sesiones as s}
              <div class="pila" style="gap:8px">
                <div class="fila entre">
                  <span><b style="color:var(--ink)" class:mute={s.estado !== 'activa'}>{s.texto}</b> · {s.bloqueHoras} h {s.modalidadCorta ?? ''}</span>
                  <span class="badge">{s.estado === 'activa' ? 'Activa' : s.estado === 'cancelada' ? 'Cancelada' : 'No se presentó'}</span>
                </div>
                {#if s.conflicto}<p class="err">El pago llegó cuando el horario ya estaba ocupado. Cambia la fecha o deja el pago como saldo a favor.</p>{/if}
                {#if (s.extras ?? []).length}<p>{s.extras.map(textoExtra).join(' · ')}</p>{/if}
                {#if s.ingenieroCliente?.nombre}<p class="mute">Ingeniero del cliente: {s.ingenieroCliente.nombre} {s.ingenieroCliente.telefono ?? ''}</p>{/if}
                {#if p.invitados.filter((i: any) => i.sesionId === s.id).length}
                  <p class="mute">Invitados: {p.invitados.filter((i: any) => i.sesionId === s.id).map((i: any) => i.nombre).join(', ')}</p>
                {/if}
                {#if s.estado === 'activa' && editable}
                  <form class="fila" onsubmit={(e) => { e.preventDefault(); guardarSesion(s, e.currentTarget as HTMLFormElement); }}>
                    <input name="ingeniero" list="personas" placeholder="Ingeniero asignado" value={s.ingenieroAsignado ?? ''} style="flex:1;min-width:140px" />
                    <input name="notas" placeholder="Notas de la sesión" value={s.notas ?? ''} style="flex:2;min-width:160px" />
                    <label class="check" title="Al guardar, le manda un correo al cliente con el nombre de su ingeniero"><input type="checkbox" name="avisar" /> Mandar correo al cliente con el nombre de su ingeniero</label>
                    <button class="btn chico">Guardar</button>
                  </form>
                  <div class="fila">
                    <button class="btn chico" onclick={() => abrir('fecha', s)}>Cambiar fecha</button>
                    <button class="btn chico" onclick={() => abrir('extra', s)}>Hora extra</button>
                    {#if new Date(s.inicio) < new Date()}<button class="btn chico" onclick={() => intentar(() => post(`/admin/pedidos/${id}/sesion`, { sesion: s.id, estado: 'no_presentado' }), 'Marcado').then(cargar)}>No se presentó</button>{/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </section>
      {/if}

      {#if enSesion.length}
        <section class="card">
          <h2>Productor y músicos</h2>
          <div class="lista">
            {#each enSesion as l}
              {@const m = l.datos?.material}
              <div class="pila" style="gap:8px">
                <div class="fila entre">
                  <span><b style="color:var(--ink)">{l.concepto}</b>{#if textoSesion(l)}{' · '}<span class="mute">{textoSesion(l)}</span>{/if}</span>
                  <span class="badge">{l.datos?.asignado ? l.datos.asignado : 'Sin asignar'}</span>
                </div>
                {#if (l.datos?.unidades ?? []).some((u: any) => Object.values(u ?? {}).some(Boolean))}
                  <p class="mute">{l.datos.unidades.map((u: any) => Object.values(u ?? {}).filter(Boolean).join(' ')).filter(Boolean).join(' · ')}</p>
                {/if}
                {#if m}
                  <p>
                    {#if m.enlace}<a href={m.enlace} target="_blank" rel="noopener">Demos y tracks</a>{/if}
                    {#if m.referencias}<br /><span class="mute">Referencias:</span> {m.referencias}{/if}
                    {#if m.notas}<br /><span class="mute">Notas:</span> {m.notas}{/if}
                    <br /><span class="mute">Recibido el {fechaHora(m.en)}</span>
                  </p>
                {:else}
                  <p class="mute">El cliente todavía no manda demos ni referencias.</p>
                {/if}
                {#if editable}
                  <form class="fila" onsubmit={(e) => { e.preventDefault(); asignar(l, e.currentTarget as HTMLFormElement); }}>
                    <input name="asignado" list="personas" placeholder="Nombre de quien lo atiende" value={l.datos?.asignado ?? ''} style="flex:1;min-width:160px" />
                    <label class="check" title="Al guardar, le manda un correo al cliente con el nombre"><input type="checkbox" name="avisar" /> Mandar correo al cliente con el nombre</label>
                    <button class="btn chico">Guardar</button>
                  </form>
                {/if}
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <section class="card">
        <h2>Cuenta</h2>
        <table class="tabla">
          <tbody>
            {#each p.lineas as l}<tr><td>{l.concepto}{#if l.creadoPor}<br /><span class="mute">{l.creadoPor}</span>{/if}</td><td class="num">{dinero(l.importe)}</td></tr>{/each}
            <tr><td><b>Total</b> <span class="mute">IVA incluido {dinero(p.pedido.iva)}</span></td><td class="num"><b>{dinero(p.pedido.total)}</b></td></tr>
          </tbody>
        </table>
        <h3 style="margin-top:14px">Pagos</h3>
        <table class="tabla">
          <tbody>
            {#each p.pagos as g}
              <tr class:mute={g.estado === 'fallido'}><td>{g.tipo === 'reembolso' ? 'Reembolso' : 'Pago'} · {METODO[g.metodo] ?? g.metodo}{g.referencia && g.referencia !== 'manual' && g.tipo !== 'reembolso' ? ` · ${g.referencia}` : ''}<br /><span class="mute">{fechaHora(g.confirmado ?? g.creado)} · {g.estado}{g.registradoPor ? ` · ${g.registradoPor}` : ''}</span></td><td class="num">{g.tipo === 'reembolso' ? '−' : ''}{dinero(g.monto)}</td></tr>
            {:else}<tr><td class="mute">Sin pagos.</td></tr>{/each}
          </tbody>
        </table>
        <p style="margin-top:10px">Cobrado: <b>{dinero(p.cobrado - p.reembolsado)}</b>{#if p.saldo > 0} · <b class="err">Saldo pendiente {dinero(p.saldo)}</b>{/if}</p>
        {#if p.pedido.cancelacion}<p class="mute" style="margin-top:6px">Cancelado por {p.pedido.cancelacion.por} · {p.pedido.cancelacion.tipo} {dinero(p.pedido.cancelacion.monto ?? 0)} {p.pedido.cancelacion.motivo ?? ''}</p>{/if}
      </section>

      {#if p.trabajos.length}
        <section class="card">
          <h2>Postproducción</h2>
          <div class="lista">
            {#each p.trabajos as t}
              <div class="fila entre"><span>{t.productoNombre} {t.titulo ? `· ${t.titulo}` : `· pieza ${t.unidad}`}{#if t.materialUrl} · <a href={t.materialUrl} target="_blank" rel="noopener">material</a>{/if}{#if t.entregaUrl} · <a href={t.entregaUrl} target="_blank" rel="noopener">entrega</a>{/if}</span>
                <span class="badge {t.estado}">{ESTADO_TRABAJO[t.estado]}</span></div>
            {/each}
          </div>
          <a class="btn chico" style="margin-top:10px" href="#/postproduccion">Abrir tablero</a>
        </section>
      {/if}

      <section class="card">
        <h2>Historial</h2>
        <div class="lista">
          {#each p.bitacora as b}<div><span class="mute">{fechaHora(b.creado)} · {b.usuario}</span><br />{b.accion.replace('_', ' ')}</div>{:else}<div class="mute">Sin cambios registrados.</div>{/each}
        </div>
        <h3 style="margin-top:14px">Correos enviados</h3>
        <div class="lista">
          {#each p.correos as c}<div><span class="mute">{fechaHora(c.creado)} · {c.para}</span><br />{c.asunto} {#if c.estado === 'error'}<span class="err">· error: {c.error}</span>{/if}</div>{:else}<div class="mute">Ninguno.</div>{/each}
        </div>
      </section>
    </div>

    <div>
      <section class="card pila">
        <h2>Cliente</h2>
        <p><a href={'#/clientes/' + p.cliente.id}><b>{p.cliente.nombre}</b></a>{#if p.cliente.empresa}<br />{p.cliente.empresa}{/if}</p>
        <p><a href={'mailto:' + p.cliente.correo}>{p.cliente.correo}</a>{#if p.cliente.telefono}<br /><a href={'https://wa.me/' + p.cliente.telefono.replace(/\D/g, '').replace(/^(\d{10})$/, '52$1')} target="_blank" rel="noopener">{p.cliente.telefono}</a>{/if}</p>
        {#if d.proyecto}<p>Proyecto: {d.proyecto}</p>{/if}
        {#if d.notas}<p>Notas del cliente: {d.notas}</p>{/if}
        {#if d.factura?.rfc}<p class="mute">Factura: {d.factura.rfc} · {d.factura.razonSocial} · {d.factura.regimen} · CP {d.factura.cp} · {d.factura.usoCfdi}</p>{/if}
        {#if p.creditos.filter((c: any) => c.saldo > 0).length}<p class="ok">Saldo a favor: {dinero(p.creditos.reduce((s: number, c: any) => s + c.saldo, 0))}</p>{/if}
      </section>
      <section class="card">
        <h2>Pendientes</h2>
        <div class="lista">
          {#each p.tareas as t}
            <label class="check" style="align-items:flex-start"><input type="checkbox" checked={!!t.hechaEn} onchange={() => tarea(t)} /><span><b>{t.etiqueta}</b><br /><span class="mute">{t.detalle}{t.hechaEn ? ` · hecho por ${t.hechaPor}` : ''}</span></span></label>
          {:else}<div class="mute">Sin pendientes.</div>{/each}
        </div>
      </section>
      {#if puede('operacion')}
        <section class="card pila">
          <h2>Notas internas</h2>
          <textarea rows="4" bind:value={notas} placeholder="Solo las ve el equipo"></textarea>
          <div class="fila">
            <button class="btn chico" onclick={() => intentar(() => post(`/admin/pedidos/${id}/notas`, { notas }), 'Notas guardadas')}>Guardar notas</button>
            {#if ['pagado', 'completado'].includes(p.pedido.estado)}<button class="btn chico" onclick={() => intentar(() => post(`/admin/pedidos/${id}/reenviar`), 'Confirmación reenviada')}>Reenviar confirmación</button>{/if}
          </div>
        </section>
      {/if}
    </div>
  </div>

  <Modal bind:abierto titulo={{ fecha: 'Cambiar fecha', extra: 'Hora extra', cargo: 'Agregar cargo', pago: 'Registrar pago', reembolso: 'Reembolsar', cancelar: 'Cancelar pedido', enlace: 'Mandar enlace de pago', '': '' }[modal]}>
    {#if modal === 'fecha' && sesionSel}
      <p class="mute">Actual: {sesionSel.texto}</p>
      <SelectorHorario espacioId={p.pedido.espacioId} duracionMin={(new Date(sesionSel.fin).getTime() - new Date(sesionSel.inicio).getTime()) / 60000} extras={extrasDe(sesionSel)} excluirPedido={id}
        propios={activas.filter((x: any) => x.id !== sesionSel.id).map((x: any) => ({ inicio: new Date(x.inicio).getTime(), fin: new Date(x.fin).getTime() + 3600000 }))} bind:valor={nuevoInicio} />
      <label class="check"><input type="checkbox" bind:checked={avisarCliente} /> Avisar al cliente por correo</label>
      <button class="btn pri" disabled={!nuevoInicio} onclick={() => hecho(() => post(`/admin/pedidos/${id}/cambiar-fecha`, { sesion: sesionSel.id, inicio: nuevoInicio, libre: true, avisar: avisarCliente }), 'Fecha cambiada')}>Cambiar fecha</button>
    {:else if modal === 'extra' && sesionSel}
      <p>Extiende la sesión. Se revisa que la siguiente hora esté libre (con la hora de margen). Precio según la modalidad, configurable en el catálogo.</p>
      <label class="campo">Horas<input type="number" min="0.5" step="0.5" bind:value={horas} /></label>
      {@render cobroCampos()}
      <button class="btn pri" onclick={() => hecho(() => post(`/admin/pedidos/${id}/hora-extra`, { sesion: sesionSel.id, horas, cobro }), 'Hora extra agregada')}>Agregar</button>
    {:else if modal === 'cargo'}
      <label class="campo">Tipo<select bind:value={cargo.tipoCargo}><option value="">Otro</option>{#each tiposCargo as t}<option value={t.id}>{t.nombre}{t.precio != null ? ` · ${dinero(t.precio)}` : ''}</option>{/each}</select></label>
      <div class="form">
        <label class="campo ancho">Concepto<input bind:value={cargo.concepto} /></label>
        <label class="campo">Precio<input type="number" min="0" bind:value={cargo.precioUnitario} /></label>
        <label class="campo">Cantidad<input type="number" min="1" bind:value={cargo.cantidad} /></label>
      </div>
      {@render cobroCampos()}
      <button class="btn pri" disabled={!cargo.concepto} onclick={() => hecho(() => post(`/admin/pedidos/${id}/cargo`, { ...cargo, cobro }), 'Cargo agregado')}>Agregar {dinero(cargo.precioUnitario * cargo.cantidad)}</button>
    {:else if modal === 'pago'}
      <div class="form">
        <label class="campo">Monto<input type="number" min="0" bind:value={pago.monto} /></label>
        <label class="campo">Método<select bind:value={pago.metodo}><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="tarjeta">Terminal</option></select></label>
        <label class="campo ancho">Referencia<input bind:value={pago.referencia} placeholder="Folio SPEI, recibo…" /></label>
      </div>
      {#if ['apartado', 'pendiente_pago', 'vencido'].includes(p.pedido.estado)}<p class="mute">Al registrar el pago se confirma el pedido y se manda la confirmación al cliente.</p>{/if}
      <button class="btn pri" onclick={() => hecho(() => post(`/admin/pedidos/${id}/pago`, pago), 'Pago registrado')}>Registrar</button>
    {:else if modal === 'reembolso'}
      <p>Los pagos con tarjeta se reembolsan en Stripe. Lo pagado en OXXO, efectivo o transferencia queda como pendiente para hacerlo por transferencia. El total del pedido baja en el mismo monto.</p>
      <div class="form">
        <label class="campo">Monto<input type="number" min="1" max={p.cobrado - p.reembolsado} bind:value={reembolso.monto} /></label>
        <label class="campo">Motivo<input bind:value={reembolso.motivo} /></label>
      </div>
      <button class="btn pri" disabled={!(reembolso.monto > 0)} onclick={() => hecho(() => post(`/admin/pedidos/${id}/reembolso`, reembolso), 'Reembolso hecho')}>Reembolsar {dinero(reembolso.monto || 0)}</button>
    {:else if modal === 'cancelar'}
      {#if p.pedido.estado !== 'pagado'}
        <p>El pedido no está pagado: se libera el horario.</p>
      {:else}
        <label class="campo">Qué pasa con el pago
          <select bind:value={cancelar.tipo}>
            <option value="politica">Según la política del espacio</option>
            <option value="credito">Saldo a favor</option>
            <option value="reembolso">Reembolso</option>
            <option value="nada">Sin devolución</option>
          </select>
        </label>
        {#if ['credito', 'reembolso'].includes(cancelar.tipo)}<label class="campo">Monto (vacío = todo lo devolvible)<input type="number" min="0" bind:value={cancelar.monto} /></label>{/if}
      {/if}
      <label class="campo">Motivo<input bind:value={cancelar.motivo} placeholder="Lo verá el equipo y el cliente" /></label>
      <label class="check"><input type="checkbox" bind:checked={avisarCliente} /> Avisar al cliente</label>
      <button class="btn peligro" onclick={() => hecho(() => post(`/admin/pedidos/${id}/cancelar`, { tipo: cancelar.tipo === 'politica' ? undefined : cancelar.tipo, monto: cancelar.monto, motivo: cancelar.motivo, avisar: avisarCliente }), 'Pedido cancelado')}>Cancelar pedido</button>
    {:else if modal === 'enlace'}
      {#if p.pedido.estado === 'apartado'}
        <label class="campo">Mantener el horario apartado por (horas)<input type="number" min="1" max="336" bind:value={horasEnlace} /></label>
      {:else}
        <p>Se manda un correo con el saldo pendiente de {dinero(p.saldo)} y un botón para pagar.</p>
      {/if}
      <button class="btn pri" onclick={() => hecho(() => post(`/admin/pedidos/${id}/enlace-pago`, p.pedido.estado === 'apartado' ? { horas: horasEnlace } : {}), 'Enlace enviado')}>Mandar enlace</button>
    {/if}
  </Modal>
{/if}

{#snippet cobroCampos()}
  <label class="campo">Cobro
    <select bind:value={cobro.modo}>
      <option value="pendiente">Dejar como saldo pendiente</option>
      <option value="enlace">Mandar enlace de pago al cliente</option>
      <option value="manual">Ya se pagó (registrar)</option>
    </select>
  </label>
  {#if cobro.modo === 'manual'}
    <div class="form">
      <label class="campo">Método<select bind:value={cobro.metodo}><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Terminal</option></select></label>
      <label class="campo">Referencia<input bind:value={cobro.referencia} /></label>
    </div>
  {/if}
{/snippet}
