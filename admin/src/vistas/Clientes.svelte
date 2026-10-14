<script lang="ts">
  import { get } from '../lib/api';
  import { dinero, fecha, intentar, csv } from '../lib/util.svelte';

  let q = $state('');
  let filas = $state<any[]>([]);
  let t = 0;
  const cargar = async () => { filas = (await intentar(() => get(`/admin/clientes${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`))) ?? []; };
  cargar();
  const buscar = () => { clearTimeout(t); t = window.setTimeout(cargar, 300); };
  const exportar = () => csv('clientes.csv', [['Nombre', 'Correo', 'Teléfono', 'Empresa', 'Pedidos', 'Gastado', 'Saldo a favor', 'Acepta promociones', 'Desde'], ...filas.map((c) => [c.nombre, c.correo, c.telefono, c.empresa, c.pedidos, c.gastado, c.credito, c.aceptaPromociones ? 'sí' : 'no', fecha(c.creado)])]);
</script>

<div class="cabecera"><h1>Clientes</h1><button class="btn" onclick={exportar}>Exportar CSV</button></div>
<input placeholder="Buscar por nombre, correo, teléfono o empresa" bind:value={q} oninput={buscar} style="width:100%;margin-bottom:12px" />
<div class="card desplazable" style="padding:0">
  <table class="tabla">
    <thead><tr><th>Cliente</th><th>Contacto</th><th class="num">Pedidos</th><th class="num">Gastado</th><th class="num">Saldo a favor</th><th>Desde</th></tr></thead>
    <tbody>
      {#each filas as c}
        <tr class="clic" onclick={() => (location.hash = `#/clientes/${c.id}`)}>
          <td><b style="color:var(--ink)">{c.nombre}</b>{#if c.empresa}<br /><span class="mute">{c.empresa}</span>{/if}</td>
          <td>{c.correo}<br /><span class="mute">{c.telefono ?? ''}</span></td>
          <td class="num">{c.pedidos}</td><td class="num">{dinero(Number(c.gastado))}</td>
          <td class="num">{Number(c.credito) > 0 ? dinero(Number(c.credito)) : '—'}</td><td>{fecha(c.creado)}</td>
        </tr>
      {:else}<tr><td colspan="6" class="mute">Sin resultados.</td></tr>{/each}
    </tbody>
  </table>
</div>
