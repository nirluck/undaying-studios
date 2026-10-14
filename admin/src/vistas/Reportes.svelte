<script lang="ts">
  import { get } from '../lib/api';
  import { csv, dinero, ESPACIO, intentar, TZ } from '../lib/util.svelte';
  import { fechaLocal, sumarDias } from '../../../supabase/functions/_shared/core/tiempo.ts';

  const hoy = fechaLocal(new Date(), TZ);
  let desde = $state(hoy.slice(0, 8) + '01');
  let hasta = $state(hoy);
  let r = $state<any>(null);
  const cargar = async () => { r = await intentar(() => get(`/admin/reportes?desde=${desde}&hasta=${hasta}`)); };
  $effect(() => { void desde; void hasta; cargar(); });

  function periodo(p: string) {
    if (p === 'mes') { desde = hoy.slice(0, 8) + '01'; hasta = hoy; }
    if (p === 'pasado') { const fin = sumarDias(hoy.slice(0, 8) + '01', -1); desde = fin.slice(0, 8) + '01'; hasta = fin; }
    if (p === '90') { desde = sumarDias(hoy, -90); hasta = hoy; }
    if (p === 'anio') { desde = hoy.slice(0, 4) + '-01-01'; hasta = hoy; }
  }
  const total = $derived(r ? r.porMes.reduce((s: number, x: any) => s + x.monto, 0) : 0);
  const maxMes = $derived(r ? Math.max(1, ...Object.values(r.porMes.reduce((a: any, x: any) => ((a[x.mes] = (a[x.mes] ?? 0) + x.monto), a), {})) as number[]) : 1);
  const meses = $derived(r ? Object.entries(r.porMes.reduce((a: any, x: any) => ((a[x.mes] = (a[x.mes] ?? 0) + x.monto), a), {})) as [string, number][] : []);
  const TIPOS: Record<string, string> = { sesion: 'Horas', extra: 'Extras', producto: 'Servicios', hora_extra: 'Horas extra', cargo: 'Cargos', personalizado: 'Conceptos libres', descuento: 'Descuentos', credito: 'Saldo a favor usado' };
</script>

<div class="cabecera">
  <h1>Reportes</h1>
  <div class="fila">
    <button class="btn chico" onclick={() => periodo('mes')}>Este mes</button>
    <button class="btn chico" onclick={() => periodo('pasado')}>Mes pasado</button>
    <button class="btn chico" onclick={() => periodo('90')}>90 días</button>
    <button class="btn chico" onclick={() => periodo('anio')}>Este año</button>
    <input type="date" bind:value={desde} /> a <input type="date" bind:value={hasta} />
  </div>
</div>

{#if r}
  <div class="rejilla" style="margin-bottom:16px">
    <div class="card kpi"><b>{dinero(total)}</b><span>Cobrado (menos reembolsos)</span></div>
    <div class="card kpi"><b>{r.pedidos.n}</b><span>Pedidos pagados</span></div>
    <div class="card kpi"><b>{dinero(r.pedidos.promedio)}</b><span>Ticket promedio</span></div>
    <div class="card kpi"><b>{r.cancelados.reduce((s: number, c: any) => s + c.n, 0)}</b><span>Cancelaciones</span></div>
  </div>
  <div class="rejilla">
    <section class="card">
      <h2>Ocupación</h2>
      <div class="barras">
        {#each r.ocupacion as o}<div class="barra"><span>{o.nombre}</span><i style="width:{Math.min(100, o.porcentaje)}%"></i><span>{o.porcentaje}% · {o.vendidas} de {o.abiertas} h</span></div>{/each}
      </div>
      <p class="mute" style="margin-top:8px">Horas vendidas entre horas abiertas en el periodo.</p>
    </section>
    <section class="card">
      <div class="fila entre"><h2>Cobrado por mes</h2><button class="btn chico" onclick={() => csv('cobrado-por-mes.csv', [['Mes', 'Espacio', 'Monto'], ...r.porMes.map((x: any) => [x.mes, ESPACIO[x.espacioId], x.monto])])}>CSV</button></div>
      <div class="barras">
        {#each meses as [mes, monto]}<div class="barra"><span>{mes}</span><i style="width:{(monto / maxMes) * 100}%"></i><span>{dinero(monto)}</span></div>{/each}
      </div>
    </section>
  </div>
  <section class="card" style="margin-top:12px">
    <div class="fila entre"><h2>Ventas por concepto</h2><button class="btn chico" onclick={() => csv('ventas-por-concepto.csv', [['Tipo', 'Concepto', 'Espacio', 'Cantidad', 'Monto'], ...r.porConcepto.map((x: any) => [TIPOS[x.tipo] ?? x.tipo, x.nombre, ESPACIO[x.espacioId], x.cantidad, x.monto])])}>CSV</button></div>
    <table class="tabla">
      <thead><tr><th>Concepto</th><th>Tipo</th><th>Espacio</th><th class="num">Cantidad</th><th class="num">Monto</th></tr></thead>
      <tbody>{#each r.porConcepto as x}<tr><td>{x.nombre}</td><td>{TIPOS[x.tipo] ?? x.tipo}</td><td>{ESPACIO[x.espacioId]}</td><td class="num">{x.cantidad}</td><td class="num">{dinero(x.monto)}</td></tr>{:else}<tr><td colspan="5" class="mute">Sin ventas en el periodo.</td></tr>{/each}</tbody>
    </table>
    <p class="mute" style="margin-top:8px">Pedidos por origen: {r.porOrigen.map((o: any) => `${o.origen === 'web' ? 'sitio' : 'panel'} ${o.n}`).join(' · ') || '—'}. Cancelaciones: {r.cancelados.map((c: any) => `${c.por} ${c.n}`).join(' · ') || '—'}.</p>
  </section>
{/if}
