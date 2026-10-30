<script lang="ts">
  // Lo que tiene asignado quien entra: sesiones (como ingeniero, productor o
  // músico) y piezas de postproducción. Es la vista principal del rol Ingeniero.
  import { get, post } from '../lib/api';
  import { ESTADO_TRABAJO, fechaSola, hora, intentar, puede, sesion, TZ } from '../lib/util.svelte';

  let datos = $state<{ sesiones: any[]; trabajos: any[] } | null>(null);
  const cargar = async () => { datos = await intentar(() => get('/admin/mio')); };
  cargar();

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const dia = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
  const proximas = $derived(datos ? datos.sesiones.filter((s) => new Date(s.fin) > new Date()) : []);
  const pasadas = $derived(datos ? datos.sesiones.filter((s) => new Date(s.fin) <= new Date()) : []);
  const ESTADOS = ['esperando_material', 'en_cola', 'en_proceso', 'entregado', 'en_revision'];

  async function guardar(t: any, f: HTMLFormElement) {
    const estado = f.estado.value;
    const ok = await intentar(() => post(`/admin/mio/trabajos/${t.id}`, { estado, entregaUrl: f.entregaUrl.value || null, notas: f.notas.value }), estado === 'entregado' && t.estado !== 'entregado' ? 'Guardado; se avisó al cliente' : 'Guardado');
    if (ok) cargar();
  }
  const copiar = (t: string) => navigator.clipboard?.writeText(t);
</script>

<div class="cabecera"><h1>Mi agenda</h1><p class="mute">Tus sesiones y piezas de postproducción asignadas.</p></div>

{#if datos}
  <div class="rejilla-2">
    <div>
      <section class="card">
        <h2>Próximas sesiones</h2>
        <div class="lista">
          {#each proximas as s}
            <div class="pila" style="gap:6px">
              <div class="fila entre">
                <b style="color:var(--ink)">{dia(s.inicio) === hoy ? 'Hoy' : fechaSola(s.inicio)} · {hora(s.inicio)}–{hora(s.fin)}</b>
                <span class="badge">{s.espacio} · {s.horas ?? ''} h</span>
              </div>
              <p>{s.nombre} · <a href={'tel:' + (s.telefono ?? '')}>{s.telefono ?? ''}</a>{' · '}{#if puede('operacion')}<a href={'#/pedidos/' + s.pedidoId}>{s.numero}</a>{:else}{s.numero}{/if}</p>
              {#if s.modalidad}<p class="mute">{s.modalidad}{s.ingenieroAsignado ? ` · Ingeniero: ${s.ingenieroAsignado}` : ''}</p>{/if}
              {#if s.proyecto}<p>Proyecto: <b>{s.proyecto}</b></p>{/if}
              {#if s.notas}<p class="mute">Notas: {s.notas}</p>{/if}
              {#each s.servicios ?? [] as x}
                <p>
                  <b style="color:var(--ink)">{x.concepto}</b>{x.asignado ? ` · ${x.asignado}` : ''}
                  {#if x.material?.enlace} · <a href={x.material.enlace} target="_blank" rel="noopener">demos y tracks</a>{/if}
                  {#if x.material?.referencias}<br /><span class="mute">Referencias:</span> {x.material.referencias}{/if}
                  {#if x.material?.notas}<br /><span class="mute">Notas:</span> {x.material.notas}{/if}
                </p>
              {/each}
            </div>
          {:else}
            <p class="mute">No tienes sesiones próximas asignadas.</p>
          {/each}
        </div>
      </section>

      <section class="card">
        <h2>Postproducción</h2>
        <div class="lista">
          {#each datos.trabajos as t}
            {@const tarde = t.fechaEntrega && String(t.fechaEntrega).slice(0, 10) < hoy && ['en_cola', 'en_proceso', 'en_revision'].includes(t.estado)}
            <div class="pila" style="gap:6px">
              <div class="fila entre">
                <span><b style="color:var(--ink)">{t.producto}</b> · {t.titulo ?? `pieza ${t.unidad}`}</span>
                <span class="badge {t.estado}">{ESTADO_TRABAJO[t.estado]}</span>
              </div>
              <p class="mute">{t.proyecto ? `${t.proyecto} · ` : ''}{t.nombre} · {t.numero}{#if t.fechaEntrega} · <span class:err={tarde}>Entrega {fechaSola(String(t.fechaEntrega).slice(0, 10) + 'T12:00:00')}</span>{/if}</p>
              {#if t.materialUrl}<p><a href={t.materialUrl} target="_blank" rel="noopener">Material del cliente</a></p>{/if}
              {#if t.referencias}<p><span class="mute">Referencias:</span> {t.referencias}</p>{/if}
              {#if t.notasCliente}<p style="white-space:pre-line"><span class="mute">Notas del cliente:</span> {t.notasCliente}</p>{/if}
              {#if !['aprobado', 'cancelado'].includes(t.estado)}
                <form class="fila" onsubmit={(e) => { e.preventDefault(); guardar(t, e.currentTarget as HTMLFormElement); }}>
                  <select name="estado" value={t.estado}>{#each ESTADOS as c}<option value={c}>{ESTADO_TRABAJO[c]}</option>{/each}</select>
                  <input name="entregaUrl" type="url" placeholder="Enlace de entrega" value={t.entregaUrl ?? ''} style="flex:2;min-width:160px" />
                  <input name="notas" placeholder="Notas internas" value={t.notas ?? ''} style="flex:1;min-width:120px" />
                  <button class="btn chico">Guardar</button>
                </form>
              {/if}
            </div>
          {:else}
            <p class="mute">No tienes piezas de postproducción asignadas.</p>
          {/each}
        </div>
        <p class="mute" style="margin-top:10px">Al pasar una pieza a "Entregado" con su enlace, al cliente le llega el correo para escucharla, aprobarla o pedir revisión.</p>
      </section>

      {#if pasadas.length}
        <section class="card">
          <h2>Sesiones de los últimos días</h2>
          <div class="lista">
            {#each pasadas as s}<p class="mute">{fechaSola(s.inicio)} · {hora(s.inicio)}–{hora(s.fin)} · {s.nombre} · {s.espacio}</p>{/each}
          </div>
        </section>
      {/if}
    </div>

    <div>
      <section class="card pila">
        <h2>Mi calendario</h2>
        <p class="mute">Para tener tus sesiones y entregas en Google Calendar: copia el enlace y en Google Calendar ve a Otros calendarios → + → Desde URL. Se actualiza solo (Google tarda unas horas en reflejar cambios). Es personal: no lo compartas.</p>
        {#if sesion.miCalendario}
          <input readonly value={sesion.miCalendario} />
          <button class="btn chico" onclick={() => copiar(sesion.miCalendario)}>Copiar enlace</button>
        {/if}
      </section>
    </div>
  </div>
{/if}
