<script lang="ts">
  // Sugerencias para los campos "Ingeniero", "Encargado" y "Quién lo atiende".
  // Si eliges a un usuario del panel, le llega el aviso y lo ve en Mi agenda.
  import { personas } from './catalogo';
  import { ROL } from './util.svelte';

  let lista = $state<{ correo: string; nombre: string | null; rol: string }[]>([]);
  personas().then((p) => (lista = p)).catch(() => {});
</script>

<datalist id="personas">
  {#each lista.filter((p) => p.rol !== 'admin' || p.nombre) as p}
    <option value={p.nombre ?? p.correo}>{ROL[p.rol] ?? p.rol} · {p.correo}</option>
  {/each}
</datalist>
