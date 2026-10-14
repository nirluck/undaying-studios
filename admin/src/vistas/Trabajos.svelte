<script lang="ts">
  import { get, post } from '../lib/api';
  import { ESTADO_TRABAJO, fechaSola, intentar, TZ } from '../lib/util.svelte';
  import Modal from '../lib/Modal.svelte';

  let trabajos = $state<any[]>([]);
  let sel = $state<any>(null);
  let abierto = $state(false);
  let reenviar = $state(false);
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const COLUMNAS = ['esperando_material', 'en_cola', 'en_proceso', 'entregado', 'en_revision', 'aprobado'];

  const cargar = async () => { trabajos = (await intentar(() => get('/admin/trabajos'))) ?? []; };
  cargar();

  function abrir(t: any) {
    sel = { ...t, fechaEntrega: t.fechaEntrega ? String(t.fechaEntrega).slice(0, 10) : '' };
    reenviar = false;
    abierto = true;
  }
  async function guardar() {
    const ok = await intentar(() => post(`/admin/trabajos/${sel.id}`, { estado: sel.estado, encargado: sel.encargado, fechaEntrega: sel.fechaEntrega || null, entregaUrl: sel.entregaUrl, titulo: sel.titulo, notas: sel.notas, reenviar }), sel.estado === 'entregado' ? 'Guardado; se avisó al cliente' : 'Guardado');
    if (ok) { abierto = false; cargar(); }
  }
</script>

<div class="cabecera"><h1>Postproducción</h1><p class="mute">Cada tarjeta es una pieza: una mezcla de una canción, un máster, una edición.</p></div>
<div class="tablero">
  {#each COLUMNAS as c}
    {@const lista = trabajos.filter((t) => t.estado === c)}
    <div class="columna">
      <h3>{ESTADO_TRABAJO[c]} <span class="mute">{lista.length}</span></h3>
      {#each lista as t}
        {@const tarde = t.fechaEntrega && String(t.fechaEntrega).slice(0, 10) < hoy && ['en_cola', 'en_proceso', 'en_revision'].includes(t.estado)}
        <button class="tarjeta" class:tarde onclick={() => abrir(t)}>
          <b style="color:var(--ink)">{t.producto}</b>
          <span>{t.titulo ?? `Pieza ${t.unidad}`}</span>
          <span class="mute">{t.nombre} · {t.numero}</span>
          {#if t.fechaEntrega}<span class="mute" class:err={tarde}>Entrega {fechaSola(String(t.fechaEntrega).slice(0, 10) + 'T12:00:00')}</span>{/if}
          {#if t.encargado}<span class="mute">{t.encargado}</span>{/if}
          {#if t.revisionesUsadas}<span class="mute">Revisión {t.revisionesUsadas} de {t.revisionesIncluidas}</span>{/if}
        </button>
      {/each}
    </div>
  {/each}
</div>

<Modal titulo={sel ? `${sel.producto} · ${sel.titulo ?? 'pieza ' + sel.unidad}` : ''} bind:abierto>
  {#if sel}
    <p class="mute">{sel.nombre} · <a href={'#/pedidos/' + sel.pedidoId}>{sel.numero}</a> · {sel.correo}</p>
    {#if sel.materialUrl}<p>Material: <a href={sel.materialUrl} target="_blank" rel="noopener">{sel.materialUrl}</a></p>{/if}
    {#if sel.referencias}<p>Referencias: {sel.referencias}</p>{/if}
    {#if sel.notasCliente}<p style="white-space:pre-line">Notas del cliente:<br />{sel.notasCliente}</p>{/if}
    <div class="form">
      <label class="campo">Estado<select bind:value={sel.estado}>{#each [...COLUMNAS, 'cancelado'] as c}<option value={c}>{ESTADO_TRABAJO[c]}</option>{/each}</select></label>
      <label class="campo">Encargado<input bind:value={sel.encargado} /></label>
      <label class="campo">Fecha de entrega<input type="date" bind:value={sel.fechaEntrega} /></label>
      <label class="campo">Título<input bind:value={sel.titulo} /></label>
      <label class="campo ancho">Enlace de entrega<input type="url" bind:value={sel.entregaUrl} placeholder="https://" /></label>
      <label class="campo ancho">Notas internas<textarea rows="2" bind:value={sel.notas}></textarea></label>
    </div>
    {#if sel.estado === 'entregado'}<label class="check"><input type="checkbox" bind:checked={reenviar} /> Volver a mandar el aviso de entrega al cliente</label>{/if}
    <p class="mute">Al pasar a "Entregado" se manda el correo al cliente con el enlace y los botones para aprobar o pedir revisión.</p>
    <button class="btn pri" onclick={guardar}>Guardar</button>
  {/if}
</Modal>
