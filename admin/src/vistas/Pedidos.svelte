<script lang="ts">
  import { get } from '../lib/api';
  import { dinero, ESPACIO, ESTADO_PEDIDO, fechaHora, fecha, intentar, puede, csv } from '../lib/util.svelte';

  let estado = $state('');
  let espacio = $state('');
  let q = $state('');
  let pagina = $state(0);
  let filas = $state<any[]>([]);
  let t = 0;

  async function cargar() {
    const p = new URLSearchParams();
    if (estado) p.set('estado', estado);
    if (espacio) p.set('espacio', espacio);
    if (q.trim()) p.set('q', q.trim());
    p.set('pagina', String(pagina));
    filas = (await intentar(() => get(`/admin/pedidos?${p}`))) ?? [];
  }
  $effect(() => { void estado; void espacio; void pagina; cargar(); });
  const buscar = () => { clearTimeout(t); t = window.setTimeout(() => { pagina = 0; cargar(); }, 300); };
  const exportar = () => csv('pedidos.csv', [['Número', 'Cliente', 'Correo', 'Espacio', 'Estado', 'Creado', 'Primera sesión', 'Total', 'Saldo'], ...filas.map((f) => [f.numero, f.nombre, f.correo, ESPACIO[f.espacioId], ESTADO_PEDIDO[f.estado], fecha(f.creado), fechaHora(f.primeraSesion), f.total, f.saldo])]);
</script>

<div class="cabecera"><h1>Pedidos</h1><div class="fila">{#if puede('operacion')}<a class="btn pri" href="#/pedidos/nuevo">Nuevo pedido</a>{/if}<button class="btn" onclick={exportar}>Exportar CSV</button></div></div>
<div class="fila" style="margin-bottom:12px">
  <input placeholder="Buscar por número, nombre, correo o teléfono" bind:value={q} oninput={buscar} style="flex:1;min-width:220px" />
  <select bind:value={estado}><option value="">Todos los estados</option>{#each Object.entries(ESTADO_PEDIDO) as [k, v]}<option value={k}>{v}</option>{/each}</select>
  <select bind:value={espacio}><option value="">Todos los espacios</option><option value="estudio">Estudio</option><option value="foro">Foro</option></select>
</div>
<div class="card desplazable" style="padding:0">
  <table class="tabla">
    <thead><tr><th>Número</th><th>Cliente</th><th>Espacio</th><th>Sesión</th><th class="num">Total</th><th class="num">Saldo</th><th>Estado</th><th></th></tr></thead>
    <tbody>
      {#each filas as f}
        <tr class="clic" onclick={() => (location.hash = `#/pedidos/${f.id}`)}>
          <td><b style="color:var(--ink)">{f.numero}</b><br /><span class="mute">{fecha(f.creado)}{f.origen === 'panel' ? ' · panel' : ''}</span></td>
          <td>{f.nombre}<br /><span class="mute">{f.telefono ?? f.correo}</span></td>
          <td>{ESPACIO[f.espacioId]}</td>
          <td>{f.primeraSesion ? fechaHora(f.primeraSesion) : 'Solo servicios'}{#if f.sesiones > 1}<br /><span class="mute">+{f.sesiones - 1} más</span>{/if}</td>
          <td class="num">{dinero(f.total)}</td>
          <td class="num" class:err={f.saldo > 0}>{f.saldo > 0 ? dinero(f.saldo) : '—'}</td>
          <td><span class="badge {f.estado}">{ESTADO_PEDIDO[f.estado]}</span></td>
          <td>{#if f.pendientes}<span class="cuenta">{f.pendientes}</span>{/if}</td>
        </tr>
      {:else}
        <tr><td colspan="8" class="mute">Sin pedidos con estos filtros.</td></tr>
      {/each}
    </tbody>
  </table>
</div>
<div class="fila" style="margin-top:12px">
  <button class="btn chico" disabled={pagina === 0} onclick={() => pagina--}>Anteriores</button>
  <button class="btn chico" disabled={filas.length < 50} onclick={() => pagina++}>Siguientes</button>
</div>
