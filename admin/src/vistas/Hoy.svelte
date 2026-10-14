<script lang="ts">
  import { get, post } from '../lib/api';
  import { dinero, ESPACIO, fechaHora, fechaSola, hora, intentar, puede, ESTADO_TRABAJO } from '../lib/util.svelte';

  let r = $state<any>(null);
  let error = $state('');
  const cargar = async () => { try { r = await get('/admin/resumen'); } catch (e) { error = (e as Error).message; } };
  cargar();

  const delDia = (s: any, hoy: string) => new Date(s.inicio).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }) === hoy;

  async function hecha(t: any) {
    await intentar(() => post(`/admin/tareas/${t.id}`, { hecha: true }), 'Pendiente resuelto');
    cargar();
  }
  async function ingeniero(s: any, nombre: string, avisarCliente: boolean) {
    await intentar(() => post(`/admin/pedidos/${s.pedidoId}/sesion`, { sesion: s.id, ingenieroAsignado: nombre, avisarCliente }), 'Ingeniero guardado');
    cargar();
  }
</script>

<div class="cabecera"><h1>Hoy</h1>{#if puede('operacion')}<a class="btn pri" href="#/pedidos/nuevo">Nuevo pedido</a>{/if}</div>
{#if error}<p class="err">{error}</p>{/if}
{#if r}
  <div class="rejilla" style="margin-bottom:16px">
    <div class="card kpi"><b>{dinero(r.mes.ingresos)}</b><span>Cobrado este mes</span></div>
    <div class="card kpi"><b>{r.mes.pedidos}</b><span>Pedidos con pago este mes</span></div>
    <div class="card kpi"><b>{r.tareas.length}</b><span>Pendientes del equipo</span></div>
    <div class="card kpi"><b>{r.solicitudesNuevas}</b><span>Solicitudes sin atender</span></div>
  </div>

  <div class="rejilla-2">
    <div>
      {#each ['Hoy', 'Mañana'] as titulo, k}
        {@const fecha = k === 0 ? r.hoy : new Date(new Date(r.hoy + 'T12:00:00Z').getTime() + 86400000).toISOString().slice(0, 10)}
        {@const ses = r.sesiones.filter((s: any) => delDia(s, fecha))}
        {@const vis = r.visitas.filter((s: any) => delDia(s, fecha))}
        {@const blo = r.bloqueos.filter((s: any) => delDia(s, fecha))}
        <section class="card">
          <h2>{titulo} <span class="mute">{fechaSola(fecha + 'T12:00:00')}</span></h2>
          {#if !ses.length && !vis.length && !blo.length}<p class="mute">Nada agendado.</p>{/if}
          <div class="lista" style="margin-top:10px">
            {#each ses as s}
              <div class="pila" style="gap:6px">
                <div class="fila entre">
                  <span><b style="color:var(--ink)">{hora(s.inicio)}–{hora(s.fin)}</b> · {ESPACIO[s.espacioId]} · <a href={'#/pedidos/' + s.pedidoId}>{s.nombre}</a></span>
                  <span class="badge {s.pedidoEstado}">{s.modalidad ?? ''}</span>
                </div>
                <div class="fila mute">
                  <span>{s.numero}</span>{#if s.telefono}<span>· {s.telefono}</span>{/if}
                  {#if s.invitados}<span>· {s.invitados} invitados</span>{/if}
                  {#if (s.extras ?? []).length}<span>· con extras</span>{/if}
                  {#if s.conflicto}<span class="err">· pago sin horario</span>{/if}
                  {#if s.pedidoEstado === 'pendiente_pago'}<span class="err">· OXXO sin pagar</span>{/if}
                </div>
                {#if s.modalidadTarea === 'asignar_ingeniero'}
                  <form class="fila" onsubmit={(e) => { e.preventDefault(); const f = e.currentTarget as HTMLFormElement; ingeniero(s, f.nombre.value, f.avisar.checked); }}>
                    <input name="nombre" placeholder="Ingeniero asignado" value={s.ingenieroAsignado ?? ''} style="flex:1;min-width:140px" />
                    <label class="check"><input type="checkbox" name="avisar" /> Avisar al cliente</label>
                    <button class="btn chico">Guardar</button>
                  </form>
                {/if}
              </div>
            {/each}
            {#each vis as v}<div><b style="color:var(--ink)">{hora(v.inicio)}</b> · Visita al {ESPACIO[v.espacioId]} · {v.nombre} <span class="mute">{v.telefono}</span></div>{/each}
            {#each blo as b}<div class="mute">{hora(b.inicio)}–{hora(b.fin)} · {ESPACIO[b.espacioId]} · {b.tipo === 'pintura' ? 'Pintura del ciclorama' : b.nota || 'Bloqueado'}</div>{/each}
          </div>
        </section>
      {/each}

      {#if r.trabajos.length}
        <section class="card">
          <h2>Entregas próximas</h2>
          <div class="lista">
            {#each r.trabajos as t}
              <div class="fila entre"><span><a href={'#/pedidos/' + t.pedidoId}>{t.producto}{t.titulo ? ` · ${t.titulo}` : ''}</a> <span class="mute">{t.nombre} · {t.encargado ?? 'sin encargado'}</span></span>
                <span class:err={t.fechaEntrega < r.hoy}>{fechaSola(t.fechaEntrega + 'T12:00:00')} · {ESTADO_TRABAJO[t.estado]}</span></div>
            {/each}
          </div>
        </section>
      {/if}
    </div>

    <div>
      <section class="card">
        <h2>Pendientes</h2>
        {#if !r.tareas.length}<p class="mute">Todo al día.</p>{/if}
        <div class="lista">
          {#each r.tareas as t}
            <div class="fila entre" style="align-items:flex-start">
              <div class="pila" style="gap:2px;flex:1">
                <span><b style="color:var(--ink)">{t.etiqueta}</b>{#if t.numero} · <a href={'#/pedidos/' + t.pedidoId}>{t.numero}</a>{/if}</span>
                <span class="mute">{t.detalle}</span>
                {#if t.vence}<span class="mute" class:err={new Date(t.vence) < new Date()}>Para el {fechaHora(t.vence)}</span>{/if}
              </div>
              <button class="btn chico" onclick={() => hecha(t)}>Hecho</button>
            </div>
          {/each}
        </div>
      </section>
      {#if r.oxxo.length || r.apartados.length}
        <section class="card">
          <h2>Pagos por recibir</h2>
          <div class="lista">
            {#each r.oxxo as p}<div class="fila entre"><a href={'#/pedidos/' + p.id}>{p.numero} · {p.nombre}</a><span>OXXO {dinero(p.total)} · vence {fechaHora(p.apartadoVence)}</span></div>{/each}
            {#each r.apartados as p}<div class="fila entre"><a href={'#/pedidos/' + p.id}>{p.numero} · {p.nombre}</a><span>Enlace {dinero(p.total)} · vence {fechaHora(p.apartadoVence)}</span></div>{/each}
          </div>
        </section>
      {/if}
      {#if r.saldos.length}
        <section class="card">
          <h2>Saldos pendientes</h2>
          <div class="lista">{#each r.saldos as p}<div class="fila entre"><a href={'#/pedidos/' + p.id}>{p.numero} · {p.nombre}</a><b>{dinero(p.saldo)}</b></div>{/each}</div>
        </section>
      {/if}
    </div>
  </div>
{/if}
