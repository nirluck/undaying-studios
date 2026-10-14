<script lang="ts">
  import { borrar, get, post, put } from '../lib/api';
  import { fechaHora, intentar } from '../lib/util.svelte';

  let pestana = $state<'plantillas' | 'registro'>('plantillas');
  let plantillas = $state<any[]>([]);
  let registro = $state<any[]>([]);
  let sel = $state<any>(null);
  let vista = $state('');

  const cargar = async () => { plantillas = (await intentar(() => get('/admin/plantillas'))) ?? []; };
  cargar();
  $effect(() => { if (pestana === 'registro') intentar(() => get('/admin/correos')).then((r) => (registro = r ?? [])); });

  async function abrir(p: any) { sel = { ...p }; previsualizar(); }
  async function previsualizar() {
    const r = await intentar(() => post(`/admin/plantillas/${sel.id}/vista`, { asunto: sel.asunto, cuerpo: sel.cuerpo }));
    if (r) vista = r.html;
  }
  async function guardar() { await intentar(() => put(`/admin/plantillas/${sel.id}`, sel), 'Plantilla guardada'); cargar(); }
  async function restaurar() {
    await intentar(() => borrar(`/admin/plantillas/${sel.id}`), 'Texto original restaurado');
    sel = { ...sel, asunto: sel.asuntoBase, cuerpo: sel.cuerpoBase, activo: true, editado: false };
    previsualizar();
    cargar();
  }
</script>

<div class="cabecera"><h1>Correos</h1></div>
<div class="pestanas">
  <button class:on={pestana === 'plantillas'} onclick={() => (pestana = 'plantillas')}>Textos</button>
  <button class:on={pestana === 'registro'} onclick={() => (pestana = 'registro')}>Enviados</button>
</div>

{#if pestana === 'plantillas'}
  <div class="rejilla-2">
    <div class="card" style="padding:0">
      <table class="tabla">
        <thead><tr><th>Correo</th><th>Para</th><th>Cuándo</th></tr></thead>
        <tbody>
          {#each plantillas as p}
            <tr class="clic" onclick={() => abrir(p)} class:mute={!p.activo} style={sel?.id === p.id ? 'background:var(--bg-3)' : ''}>
              <td><b style="color:var(--ink)">{p.nombre}</b>{p.editado ? ' · editado' : ''}{p.activo ? '' : ' · apagado'}</td><td>{p.para === 'cliente' ? 'Cliente' : 'Equipo'}</td><td class="mute">{p.cuando}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if sel}
      <section class="card pila">
        <h2>{sel.nombre}</h2>
        <label class="campo">Asunto<input bind:value={sel.asunto} /></label>
        <label class="campo">Texto (deja una línea en blanco entre párrafos)<textarea rows="8" bind:value={sel.cuerpo}></textarea></label>
        <p class="mute">Variables: {sel.variables.map((v: string) => `{{${v}}}`).join(' ')}. El resumen del pedido, los botones y los datos de contacto se agregan solos.</p>
        <label class="check"><input type="checkbox" bind:checked={sel.activo} /> Enviar este correo</label>
        <div class="fila">
          <button class="btn" onclick={previsualizar}>Vista previa</button>
          <button class="btn pri" onclick={guardar}>Guardar</button>
          {#if sel.editado}<button class="btn link" onclick={restaurar}>Restaurar texto original</button>{/if}
        </div>
        {#if vista}<iframe title="Vista previa" srcdoc={vista} style="width:100%;height:520px;border:1px solid var(--line);border-radius:8px;background:#fff"></iframe>{/if}
      </section>
    {/if}
  </div>
{:else}
  <div class="card desplazable" style="padding:0">
    <table class="tabla">
      <thead><tr><th>Fecha</th><th>Para</th><th>Asunto</th><th>Pedido</th><th>Estado</th></tr></thead>
      <tbody>
        {#each registro as c}
          <tr><td>{fechaHora(c.creado)}</td><td>{c.para}</td><td>{c.asunto}</td><td>{#if c.pedidoId}<a href={'#/pedidos/' + c.pedidoId}>{c.numero}</a>{/if}</td><td class:err={c.estado === 'error'} title={c.error ?? ''}>{c.estado}</td></tr>
        {:else}<tr><td colspan="5" class="mute">Sin correos.</td></tr>{/each}
      </tbody>
    </table>
  </div>
{/if}
