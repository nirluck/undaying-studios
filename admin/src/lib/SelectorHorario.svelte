<script lang="ts">
  import { get } from './api';
  import { catalogoActivo } from './catalogo';
  import { horariosDelDia } from '../../../supabase/functions/_shared/core/disponibilidad.ts';
  import { fechaLocal, utcDesdeLocal, horaTexto, rangoTexto } from '../../../supabase/functions/_shared/core/tiempo.ts';
  import type { Extra, Rango } from '../../../supabase/functions/_shared/core/tipos.ts';
  import { TZ } from './util.svelte';

  let {
    espacioId, duracionMin, extras = [], excluirPedido = '', propios = [], valor = $bindable(''),
  }: { espacioId: string; duracionMin: number; extras?: Extra[]; excluirPedido?: string; propios?: Rango[]; valor?: string } = $props();

  let fecha = $state(valor ? fechaLocal(new Date(valor), TZ) : fechaLocal(new Date(), TZ));
  let libre = $state(false);
  let horaLibre = $state(valor ? new Date(valor).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : '10:00');
  let opciones = $state<{ inicio: string; minuto: number }[]>([]);
  let motivo = $state('');
  let ocupado = $state<Rango[]>([]);

  async function calcular() {
    const cat = await catalogoActivo();
    const esp = cat.espacios.find((e) => e.id === espacioId);
    if (!esp || !fecha) return;
    const r = await get(`/admin/ocupacion?espacio=${espacioId}&desde=${fecha}&hasta=${fecha}${excluirPedido ? `&excluir=${excluirPedido}` : ''}`);
    ocupado = [...r.ocupacion, ...propios];
    const dia = horariosDelDia({ catalogo: cat, espacio: esp, duracionMin, extras, ocupacion: ocupado, ahora: new Date(), libre: true }, fecha);
    opciones = dia.horarios;
    motivo = dia.horarios.length ? '' : dia.motivo ?? '';
  }
  $effect(() => { void fecha; void duracionMin; void extras; void propios; calcular(); });

  $effect(() => {
    if (libre && fecha && horaLibre) {
      const [h, m] = horaLibre.split(':').map(Number);
      valor = utcDesdeLocal(fecha, h * 60 + m, TZ).toISOString();
    }
  });

  const choca = $derived(valor ? ocupado.some((o) => new Date(valor).getTime() < o.fin && o.inicio < new Date(valor).getTime() + duracionMin * 60000) : false);
</script>

<div class="pila" style="gap:8px">
  <div class="fila">
    <input type="date" bind:value={fecha} />
    <label class="check"><input type="checkbox" bind:checked={libre} /> Hora libre (fuera de horario o sin anticipación)</label>
  </div>
  {#if libre}
    <input type="time" bind:value={horaLibre} step="900" style="width:140px" />
  {:else if opciones.length}
    <div class="fila">
      {#each opciones as o}
        <button type="button" class="btn chico" class:pri={valor === o.inicio} onclick={() => (valor = o.inicio)}>{horaTexto(o.minuto)}</button>
      {/each}
    </div>
  {:else}
    <p class="mute">{motivo || 'Sin horarios.'}</p>
  {/if}
  {#if valor}
    <p class="mute">Elegido: {rangoTexto(new Date(valor), new Date(new Date(valor).getTime() + duracionMin * 60000), TZ)}</p>
    {#if choca}<p class="err">Ese horario choca con otra reserva o bloqueo (contando la hora de margen).</p>{/if}
  {/if}
</div>
