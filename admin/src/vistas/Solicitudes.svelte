<script lang="ts">
  import { get, post } from '../lib/api';
  import { dinero, ESPACIO, fechaHora, intentar } from '../lib/util.svelte';

  let { id }: { id?: string } = $props();
  let pestana = $state<'solicitudes' | 'cotizaciones'>('solicitudes');
  let solicitudes = $state<any[]>([]);
  let cotizaciones = $state<any[]>([]);
  // La vista se monta de nuevo en cada cambio de ruta: basta el valor inicial.
  // svelte-ignore state_referenced_locally
  let sel = $state<string | null>(id ?? null);
  const ESTADOS: Record<string, string> = { nueva: 'Nueva', en_proceso: 'En proceso', convertida: 'Convertida en pedido', descartada: 'Descartada' };

  const cargar = async () => {
    solicitudes = (await intentar(() => get('/admin/solicitudes'))) ?? [];
    cotizaciones = (await intentar(() => get('/admin/cotizaciones'))) ?? [];
  };
  cargar();
  const actual = $derived(solicitudes.find((s) => s.id === sel));

  async function estado(s: any, e: string) {
    await intentar(() => post(`/admin/solicitudes/${s.id}`, { estado: e, notas: s.notas }), 'Guardado');
    cargar();
  }
  function crearPedido(s: any) {
    sessionStorage.setItem('nuevo-pedido', JSON.stringify({ carrito: s.carrito, cliente: { nombre: s.nombre, correo: s.correo, telefono: s.telefono ?? '' }, descripcion: s.descripcion }));
    post(`/admin/solicitudes/${s.id}`, { estado: 'en_proceso', notas: s.notas }).catch(() => {});
    location.hash = '#/pedidos/nuevo';
  }
  function abrirCotizacion(c: any) {
    sessionStorage.setItem('nuevo-pedido', JSON.stringify({ carrito: c.carrito }));
    location.hash = '#/pedidos/nuevo';
  }
</script>

<div class="cabecera"><h1>Solicitudes</h1></div>
<div class="pestanas">
  <button class:on={pestana === 'solicitudes'} onclick={() => (pestana = 'solicitudes')}>Solicitudes de cotización</button>
  <button class:on={pestana === 'cotizaciones'} onclick={() => (pestana = 'cotizaciones')}>Cotizaciones compartidas</button>
</div>

{#if pestana === 'solicitudes'}
  <div class="rejilla-2">
    <div class="card" style="padding:0">
      <table class="tabla">
        <thead><tr><th>Quién</th><th>Espacio</th><th>Fecha</th><th>Estado</th></tr></thead>
        <tbody>
          {#each solicitudes as s}
            <tr class="clic" onclick={() => (sel = s.id)} style={sel === s.id ? 'background:var(--bg-3)' : ''}>
              <td><b style="color:var(--ink)">{s.nombre}</b><br /><span class="mute">{s.correo}</span></td>
              <td>{ESPACIO[s.espacioId] ?? '—'}</td>
              <td>{fechaHora(s.creado)}</td>
              <td><span class="badge" class:pendiente_pago={s.estado === 'nueva'}>{ESTADOS[s.estado]}</span></td>
            </tr>
          {:else}<tr><td colspan="4" class="mute">Sin solicitudes.</td></tr>{/each}
        </tbody>
      </table>
    </div>
    {#if actual}
      <section class="card pila">
        <h2>{actual.nombre}</h2>
        <p><a href={'mailto:' + actual.correo}>{actual.correo}</a>{#if actual.telefono} · <a href={'https://wa.me/' + actual.telefono.replace(/\D/g, '').replace(/^(\d{10})$/, '52$1')} target="_blank" rel="noopener">{actual.telefono}</a>{/if}</p>
        <p style="white-space:pre-line">{actual.descripcion}</p>
        {#if actual.carrito}
          <p class="mute">Armó en el cotizador: {actual.carrito.sesiones?.length ?? 0} sesiones y {actual.carrito.productos?.length ?? 0} servicios.</p>
        {/if}
        <label class="campo">Notas<textarea rows="3" bind:value={actual.notas}></textarea></label>
        <div class="fila">
          <button class="btn pri" onclick={() => crearPedido(actual)}>Crear pedido con esto</button>
          <select value={actual.estado} onchange={(e) => estado(actual, (e.target as HTMLSelectElement).value)}>
            {#each Object.entries(ESTADOS) as [k, v]}<option value={k}>{v}</option>{/each}
          </select>
        </div>
      </section>
    {/if}
  </div>
{:else}
  <div class="card" style="padding:0">
    <table class="tabla">
      <thead><tr><th>Código</th><th>Espacio</th><th>Creada</th><th class="num">Total</th><th class="num">Vistas</th><th></th></tr></thead>
      <tbody>
        {#each cotizaciones as c}
          <tr>
            <td><b style="color:var(--ink)">{c.codigo}</b></td><td>{ESPACIO[c.espacioId]}</td><td>{fechaHora(c.creado)}</td>
            <td class="num">{c.total != null ? dinero(c.total) : '—'}</td><td class="num">{c.vistas}</td>
            <td><button class="btn chico" onclick={() => abrirCotizacion(c)}>Convertir en pedido</button></td>
          </tr>
        {:else}<tr><td colspan="6" class="mute">Nadie ha compartido cotizaciones todavía.</td></tr>{/each}
      </tbody>
    </table>
  </div>
{/if}
