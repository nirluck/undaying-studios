<script lang="ts">
  import { borrar, get, post, put } from '../lib/api';
  import { catalogo } from '../lib/catalogo';
  import { fechaHora, horaAMinutos, intentar, puede, TZ } from '../lib/util.svelte';
  import { fechaLocal, fechaLarga, horaTexto, sumarDias } from '../../../supabase/functions/_shared/core/tiempo.ts';

  const DIAS = [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [0, 'Domingo']] as const;
  let espacio = $state('estudio');
  let cat = $state<any>(null);
  let semana = $state<{ dia: number; abierto: boolean; abre: string; cierra: string }[]>([]);
  let exc = $state({ fecha: '', cerrado: true, abre: '10:00', cierra: '18:00', nota: '' });
  let bloqueos = $state<any[]>([]);
  let nuevoBloqueo = $state({ desde: '', hasta: '', nota: '' });
  const hoy = fechaLocal(new Date(), TZ);

  async function cargar() {
    cat = await intentar(() => catalogo(true));
    if (!cat) return;
    semana = DIAS.map(([d]) => {
      const h = cat.horarios.find((x: any) => x.espacioId === espacio && x.dia === d);
      return { dia: d, abierto: !!h, abre: horaTexto(h?.abre ?? 600), cierra: horaTexto(h?.cierra ?? 1320) };
    });
    const ag = await intentar(() => get(`/admin/agenda?desde=${hoy}&hasta=${sumarDias(hoy, 60)}`));
    bloqueos = ag ? ag.elementos.filter((e: any) => e.espacioId === espacio && e.tipo === 'bloqueo') : [];
  }
  $effect(() => { void espacio; cargar(); });

  const excepciones = $derived(cat ? cat.excepciones.filter((e: any) => e.espacioId === espacio && e.fecha >= hoy).sort((a: any, b: any) => a.fecha.localeCompare(b.fecha)) : []);
  const espacioCfg = $derived(cat?.espacios.find((e: any) => e.id === espacio));

  async function guardarSemana() {
    const datos = semana.filter((d) => d.abierto).map((d) => {
      const abre = horaAMinutos(d.abre);
      let cierra = horaAMinutos(d.cierra);
      if (cierra <= abre) cierra += 1440;
      return { dia: d.dia, abre, cierra };
    });
    await intentar(() => put(`/admin/horarios/${espacio}`, { semana: datos }), 'Horario guardado');
    cargar();
  }
  async function agregarExcepcion() {
    const abre = horaAMinutos(exc.abre);
    let cierra = horaAMinutos(exc.cierra);
    if (cierra <= abre) cierra += 1440;
    await intentar(() => post('/admin/excepciones', { espacio, fecha: exc.fecha, cerrado: exc.cerrado, ventanas: exc.cerrado ? [] : [{ abre, cierra }], nota: exc.nota }), 'Día especial guardado');
    exc = { fecha: '', cerrado: true, abre: '10:00', cierra: '18:00', nota: '' };
    cargar();
  }
  async function quitarExcepcion(f: string) { await intentar(() => borrar(`/admin/excepciones/${espacio}/${f}`), 'Quitado'); cargar(); }
  async function bloquear() {
    await intentar(() => post('/admin/bloqueos', { espacio, inicio: new Date(nuevoBloqueo.desde).toISOString(), fin: new Date(nuevoBloqueo.hasta).toISOString(), nota: nuevoBloqueo.nota }), 'Bloqueado');
    nuevoBloqueo = { desde: '', hasta: '', nota: '' };
    cargar();
  }
  async function quitarBloqueo(id: string) { await intentar(() => borrar(`/admin/bloqueos/${id}`), 'Bloqueo quitado'); cargar(); }
</script>

<div class="cabecera">
  <h1>Horarios y bloqueos</h1>
  <select bind:value={espacio}><option value="estudio">Estudio</option><option value="foro">Foro</option><option value="estudio-b">Estudio B</option></select>
</div>

<div class="rejilla-2">
  <div>
    <section class="card pila">
      <h2>Horario semanal</h2>
      <p class="mute">Un bloque solo se ofrece si cabe completo en el horario del día. Si el cierre es antes que la apertura, se entiende que termina al día siguiente (sesiones nocturnas).{#if espacioCfg} Margen entre sesiones: {espacioCfg.margenMin} min · inicios cada {espacioCfg.pasoMin} min.{/if}</p>
      <table class="tabla">
        <tbody>
          {#each semana as d, i}
            <tr>
              <td><label class="check"><input type="checkbox" bind:checked={semana[i].abierto} disabled={!puede()} /> {DIAS[i][1]}</label></td>
              <td>{#if d.abierto}<input type="time" step="1800" bind:value={semana[i].abre} disabled={!puede()} /> a <input type="time" step="1800" bind:value={semana[i].cierra} disabled={!puede()} />{#if horaAMinutos(d.cierra) <= horaAMinutos(d.abre)} <span class="mute">del día siguiente</span>{/if}{:else}<span class="mute">Cerrado</span>{/if}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if puede()}<button class="btn pri" onclick={guardarSemana}>Guardar horario</button>{/if}
    </section>

    <section class="card pila">
      <h2>Bloqueos (próximos 60 días)</h2>
      <p class="mute">Mantenimiento, eventos privados o reservas que llegaron por otro lado. También se crean desde la agenda.</p>
      <div class="lista">
        {#each bloqueos as b}<div class="fila entre"><span>{fechaHora(b.inicio)} – {fechaHora(b.fin)} · {b.titulo}</span><button class="btn chico" onclick={() => quitarBloqueo(b.id)}>Quitar</button></div>
        {:else}<div class="mute">Sin bloqueos.</div>{/each}
      </div>
      <div class="form">
        <label class="campo">Desde<input type="datetime-local" step="1800" bind:value={nuevoBloqueo.desde} /></label>
        <label class="campo">Hasta<input type="datetime-local" step="1800" bind:value={nuevoBloqueo.hasta} /></label>
        <label class="campo ancho">Motivo<input bind:value={nuevoBloqueo.nota} /></label>
      </div>
      <button class="btn" disabled={!nuevoBloqueo.desde || !nuevoBloqueo.hasta} onclick={bloquear}>Bloquear</button>
    </section>
  </div>

  <section class="card pila">
    <h2>Días especiales</h2>
    <p class="mute">Festivos, cierres o un horario distinto en una fecha.</p>
    <div class="lista">
      {#each excepciones as e}
        <div class="fila entre"><span><b style="color:var(--ink)">{fechaLarga(e.fecha)}</b><br /><span class="mute">{e.cerrado ? 'Cerrado' : e.ventanas.map((v: any) => `${horaTexto(v.abre)} a ${horaTexto(v.cierra)}`).join(', ')}{e.nota ? ` · ${e.nota}` : ''}</span></span><button class="btn chico" onclick={() => quitarExcepcion(e.fecha)}>Quitar</button></div>
      {:else}<div class="mute">Ninguno.</div>{/each}
    </div>
    <div class="form">
      <label class="campo">Fecha<input type="date" bind:value={exc.fecha} min={hoy} /></label>
      <label class="check"><input type="checkbox" bind:checked={exc.cerrado} /> Cerrado todo el día</label>
      {#if !exc.cerrado}
        <label class="campo">Abre<input type="time" step="1800" bind:value={exc.abre} /></label>
        <label class="campo">Cierra<input type="time" step="1800" bind:value={exc.cierra} /></label>
      {/if}
      <label class="campo ancho">Nota<input bind:value={exc.nota} placeholder="Día festivo, evento…" /></label>
    </div>
    <button class="btn" disabled={!exc.fecha} onclick={agregarExcepcion}>Agregar</button>
  </section>
</div>
