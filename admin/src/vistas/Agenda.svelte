<script lang="ts">
  import { borrar, get, post } from '../lib/api';
  import { fechaLocal, minutosLocales, sumarDias, utcDesdeLocal, fechaCorta, horaTexto } from '../../../supabase/functions/_shared/core/tiempo.ts';
  import { intentar, TZ, hora } from '../lib/util.svelte';
  import Modal from '../lib/Modal.svelte';

  const hoy = fechaLocal(new Date(), TZ);
  const lunes = (f: string) => sumarDias(f, -((new Date(f + 'T12:00:00Z').getUTCDay() + 6) % 7));
  let espacio = $state(localStorage.getItem('agenda-espacio') ?? 'estudio');
  let modo = $state<'semana' | 'dia'>(innerWidth < 700 ? 'dia' : 'semana');
  let desde = $state(innerWidth < 700 ? hoy : lunes(hoy));
  let datos = $state<any>(null);
  const PX = 0.9; // píxeles por minuto

  const hasta = $derived(modo === 'semana' ? sumarDias(desde, 6) : desde);
  const dias = $derived(datos ? datos.dias.filter((d: any) => d.fecha >= desde && d.fecha <= hasta) : []);
  const rango = $derived.by(() => {
    let a = 8 * 60; let b = 22 * 60;
    for (const d of dias) for (const v of d.espacios[espacio] ?? []) { a = Math.min(a, v.abre); b = Math.max(b, v.cierra); }
    return { a: Math.floor(a / 60) * 60, b: Math.ceil(b / 60) * 60 };
  });

  async function cargar() {
    localStorage.setItem('agenda-espacio', espacio);
    datos = await intentar(() => get(`/admin/agenda?desde=${desde}&hasta=${hasta}`));
  }
  $effect(() => { void desde; void hasta; cargar(); });

  function mover(n: number) { desde = sumarDias(desde, n * (modo === 'semana' ? 7 : 1)); }

  function bloques(fecha: string) {
    if (!datos) return [];
    const ini = utcDesdeLocal(fecha, 0, TZ).getTime();
    return datos.elementos.filter((e: any) => e.espacioId === espacio).map((e: any) => {
      const a = Math.max(new Date(e.inicio).getTime(), ini + rango.a * 60000);
      const b = Math.min(new Date(e.fin).getTime(), ini + rango.b * 60000);
      if (b <= a) return null;
      const m = e.margenFin ? Math.min(new Date(e.margenFin).getTime(), ini + rango.b * 60000) : b;
      return { ...e, top: ((a - ini) / 60000 - rango.a) * PX, alto: Math.max(18, ((b - a) / 60000) * PX), margen: Math.max(0, ((m - b) / 60000) * PX) };
    }).filter(Boolean);
  }

  let menu = $state<{ fecha: string; minuto: number } | null>(null);
  let menuAbierto = $state(false);
  let bloqueo = $state({ fin: '', nota: '' });
  let detalle = $state<any>(null);
  let detalleAbierto = $state(false);

  function clicColumna(ev: MouseEvent, fecha: string) {
    if ((ev.target as HTMLElement).closest('.ev')) return;
    const y = ev.offsetY;
    const minuto = Math.floor((rango.a + y / PX) / 30) * 30;
    menu = { fecha, minuto };
    bloqueo = { fin: horaTexto(minuto + 120), nota: '' };
    menuAbierto = true;
  }
  const inicioMenu = $derived(menu ? utcDesdeLocal(menu.fecha, menu.minuto, TZ).toISOString() : '');

  async function bloquear() {
    if (!menu) return;
    const [h, m] = bloqueo.fin.split(':').map(Number);
    let fin = h * 60 + m;
    if (fin <= menu.minuto) fin += 1440;
    const ok = await intentar(() => post('/admin/bloqueos', { espacio, inicio: inicioMenu, fin: utcDesdeLocal(menu!.fecha, fin, TZ).toISOString(), nota: bloqueo.nota }), 'Horario bloqueado');
    if (ok) { menuAbierto = false; cargar(); }
  }

  function clicEvento(e: any) {
    if (e.tipo === 'sesion' || (e.tipo === 'pintura' && e.pedidoId)) { location.hash = `#/pedidos/${e.pedidoId}`; return; }
    detalle = e;
    detalleAbierto = true;
  }
  async function quitarBloqueo() {
    if (await intentar(() => borrar(`/admin/bloqueos/${detalle.id}`), 'Bloqueo eliminado')) { detalleAbierto = false; cargar(); }
  }
  async function visita(estado: string) {
    if (await intentar(() => post(`/admin/visitas/${detalle.visitaId}`, { estado }), 'Visita actualizada')) { detalleAbierto = false; cargar(); }
  }
</script>

<div class="cabecera">
  <h1>Agenda</h1>
  <div class="fila">
    <button class="btn chico" onclick={() => mover(-1)}>‹</button>
    <button class="btn chico" onclick={() => (desde = modo === 'semana' ? lunes(hoy) : hoy)}>Hoy</button>
    <button class="btn chico" onclick={() => mover(1)}>›</button>
    <select bind:value={modo} onchange={() => { if (modo === 'semana') desde = lunes(desde); }}><option value="semana">Semana</option><option value="dia">Día</option></select>
  </div>
</div>
<div class="pestanas">
  {#each datos?.espacios ?? [{ id: 'estudio', nombre: 'Estudio' }, { id: 'foro', nombre: 'Foro' }, { id: 'estudio-b', nombre: 'Estudio B' }] as e}
    <button class:on={espacio === e.id} onclick={() => { espacio = e.id; cargar(); }}>{e.nombre}</button>
  {/each}
</div>
<p class="mute" style="margin-bottom:10px">Clic en un hueco para crear un pedido o bloquear el horario. Lo rayado después de una sesión es la hora de margen.</p>

{#if datos}
  <div class="agenda" style="--dias:{dias.length}">
    <div class="horas" style="height:{(rango.b - rango.a) * PX + 44}px">
      <div class="cab"></div>
      {#each Array.from({ length: (rango.b - rango.a) / 60 + 1 }, (_, i) => rango.a + i * 60) as m}
        <span class="h" style="top:{(m - rango.a) * PX + 44}px">{horaTexto(m)}</span>
      {/each}
    </div>
    {#each dias as d}
      <div class="col">
        <div class="cab" class:hoy={d.fecha === hoy}>{fechaCorta(d.fecha)}</div>
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div style="position:relative;height:{(rango.b - rango.a) * PX}px" onclick={(ev) => clicColumna(ev, d.fecha)}>
          {#each d.espacios[espacio] ?? [] as v}
            <div class="abierto" style="top:{(v.abre - rango.a) * PX}px;height:{(v.cierra - v.abre) * PX}px"></div>
          {/each}
          {#each Array.from({ length: (rango.b - rango.a) / 60 }, (_, i) => i) as i}
            <div class="linea" style="top:{i * 60 * PX}px"></div>
          {/each}
          {#each bloques(d.fecha) as e}
            {#if e.margen}<div class="margen" style="top:{e.top + e.alto}px;height:{e.margen}px"></div>{/if}
            <button class="ev {e.tipo} {e.estado ?? ''}" style="top:{e.top}px;height:{e.alto}px" onclick={() => clicEvento(e)} title={e.titulo}>
              <b>{e.titulo}</b>{hora(e.inicio)}–{hora(e.fin)} {e.detalle ?? ''}
              {#if e.ingeniero}<br />Ing. {e.ingeniero}{/if}
              {#if e.apartado || e.estado === 'apartado'}<br />Apartado sin pagar{/if}
              {#if e.estado === 'pendiente_pago'}<br />OXXO pendiente{/if}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}

<Modal titulo={menu ? `${fechaCorta(menu.fecha)} · ${horaTexto(menu.minuto)}` : ''} bind:abierto={menuAbierto}>
  {#if menu}
    <a class="btn pri" href={`#/pedidos/nuevo?espacio=${espacio}&inicio=${encodeURIComponent(inicioMenu)}`}>Nuevo pedido a esta hora</a>
    <hr class="sep" />
    <h3>Bloquear horario</h3>
    <div class="form">
      <label class="campo">Hasta<input type="time" bind:value={bloqueo.fin} step="1800" /></label>
      <label class="campo">Motivo<input bind:value={bloqueo.nota} placeholder="Mantenimiento, evento privado…" /></label>
    </div>
    <button class="btn" onclick={bloquear}>Bloquear</button>
  {/if}
</Modal>

<Modal titulo={detalle?.titulo ?? ''} bind:abierto={detalleAbierto}>
  {#if detalle}
    <p>{hora(detalle.inicio)}–{hora(detalle.fin)} {detalle.detalle ?? ''}</p>
    {#if detalle.tipo === 'bloqueo'}
      <button class="btn peligro" onclick={quitarBloqueo}>Quitar bloqueo</button>
    {:else if detalle.tipo === 'visita'}
      <div class="fila">
        <button class="btn" onclick={() => visita('realizada')}>Asistió</button>
        <button class="btn" onclick={() => visita('no_asistio')}>No asistió</button>
        <button class="btn peligro" onclick={() => visita('cancelada')}>Cancelar y avisar</button>
      </div>
    {/if}
  {/if}
</Modal>
