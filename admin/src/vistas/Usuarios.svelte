<script lang="ts">
  import { get, put } from '../lib/api';
  import { fecha, intentar, ROL } from '../lib/util.svelte';

  let usuarios = $state<any[]>([]);
  let nuevo = $state({ correo: '', nombre: '', rol: 'operacion' });
  const cargar = async () => { usuarios = (await intentar(() => get('/admin/usuarios'))) ?? []; };
  cargar();
  async function guardar(u: any) { await intentar(() => put('/admin/usuarios', u), 'Usuario guardado'); cargar(); }
  async function agregar() { await guardar({ ...nuevo, activo: true }); nuevo = { correo: '', nombre: '', rol: 'operacion' }; }
</script>

<div class="cabecera"><h1>Usuarios del panel</h1></div>
<div class="rejilla-2">
  <div class="card" style="padding:0">
    <table class="tabla">
      <thead><tr><th>Correo</th><th>Nombre</th><th>Rol</th><th>Activo</th><th>Desde</th></tr></thead>
      <tbody>
        {#each usuarios as u}
          <tr>
            <td>{u.correo}</td>
            <td><input bind:value={u.nombre} onchange={() => guardar(u)} /></td>
            <td><select bind:value={u.rol} onchange={() => guardar(u)}>{#each Object.entries(ROL) as [k, v]}<option value={k}>{v}</option>{/each}</select></td>
            <td><input type="checkbox" bind:checked={u.activo} onchange={() => guardar(u)} /></td>
            <td class="mute">{fecha(u.creado)}</td>
          </tr>
        {:else}<tr><td colspan="5" class="mute">Solo entran los correos de ADMIN_CORREOS. Agrega al equipo aquí.</td></tr>{/each}
      </tbody>
    </table>
  </div>
  <section class="card pila">
    <h2>Agregar usuario</h2>
    <label class="campo">Correo<input type="email" bind:value={nuevo.correo} /></label>
    <label class="campo">Nombre<input bind:value={nuevo.nombre} /></label>
    <label class="campo">Rol<select bind:value={nuevo.rol}>{#each Object.entries(ROL) as [k, v]}<option value={k}>{v}</option>{/each}</select></label>
    <button class="btn pri" disabled={!nuevo.correo} onclick={agregar}>Agregar e invitar</button>
    <p class="mute"><b>Administrador:</b> todo. <b>Operación:</b> agenda, pedidos, cobros, cargos, bloqueos, visitas y cupones; no cambia precios ni políticas. <b>Postproducción:</b> tablero de entregas y consulta de pedidos.</p>
  </section>
</div>
