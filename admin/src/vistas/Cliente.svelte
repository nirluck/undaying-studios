<script lang="ts">
  import { get, post } from '../lib/api';
  import { dinero, ESPACIO, ESTADO_PEDIDO, fecha, intentar, puede } from '../lib/util.svelte';

  let { id }: { id: string } = $props();
  let c = $state<any>(null);
  let credito = $state({ monto: 0, dias: 90, nota: '' });
  const cargar = async () => { c = await intentar(() => get(`/admin/clientes/${id}`)); };
  cargar();

  async function guardar() {
    await intentar(() => post(`/admin/clientes/${id}`, { nombre: c.nombre, correo: c.correo, telefono: c.telefono, empresa: c.empresa, notas: c.notas, datosFiscales: c.datosFiscales, aceptaPromociones: c.aceptaPromociones }), 'Cliente guardado');
  }
  async function darCredito() {
    if (await intentar(() => post(`/admin/clientes/${id}/credito`, credito), 'Saldo a favor agregado')) { credito = { monto: 0, dias: 90, nota: '' }; cargar(); }
  }
</script>

{#if c}
  <div class="cabecera"><div><p class="mute"><a href="#/clientes">Clientes</a></p><h1>{c.nombre}</h1></div>{#if puede('operacion')}<a class="btn pri" href="#/pedidos/nuevo" onclick={() => sessionStorage.setItem('nuevo-pedido', JSON.stringify({ cliente: { nombre: c.nombre, correo: c.correo, telefono: c.telefono ?? '', empresa: c.empresa ?? '' } }))}>Nuevo pedido para este cliente</a>{/if}</div>
  <div class="rejilla-2">
    <div>
      <section class="card">
        <h2>Pedidos</h2>
        <table class="tabla">
          <tbody>
            {#each c.pedidos as p}
              <tr class="clic" onclick={() => (location.hash = `#/pedidos/${p.id}`)}><td><b style="color:var(--ink)">{p.numero}</b> · {ESPACIO[p.espacioId]}</td><td>{fecha(p.creado)}</td><td class="num">{dinero(p.total)}</td><td><span class="badge {p.estado}">{ESTADO_PEDIDO[p.estado]}</span></td></tr>
            {:else}<tr><td class="mute">Sin pedidos.</td></tr>{/each}
          </tbody>
        </table>
      </section>
      <section class="card">
        <h2>Saldo a favor</h2>
        <table class="tabla">
          <tbody>
            {#each c.creditos as cr}<tr><td>{cr.nota ?? 'Saldo a favor'}<br /><span class="mute">Vence {fecha(cr.vence)}</span></td><td class="num">{dinero(cr.saldo)} de {dinero(cr.monto)}</td></tr>
            {:else}<tr><td class="mute">Sin saldo a favor.</td></tr>{/each}
          </tbody>
        </table>
        {#if puede()}
          <div class="form" style="margin-top:12px">
            <label class="campo">Monto<input type="number" min="1" bind:value={credito.monto} /></label>
            <label class="campo">Vigencia (días)<input type="number" min="1" bind:value={credito.dias} /></label>
            <label class="campo ancho">Motivo<input bind:value={credito.nota} /></label>
          </div>
          <button class="btn chico" style="margin-top:8px" disabled={!(credito.monto > 0)} onclick={darCredito}>Dar saldo a favor</button>
        {/if}
      </section>
    </div>
    <section class="card pila">
      <h2>Datos</h2>
      <label class="campo">Nombre<input bind:value={c.nombre} /></label>
      <label class="campo">Correo<input type="email" bind:value={c.correo} /></label>
      <label class="campo">Teléfono<input bind:value={c.telefono} /></label>
      <label class="campo">Empresa<input bind:value={c.empresa} /></label>
      <label class="campo">Notas internas<textarea rows="3" bind:value={c.notas}></textarea></label>
      <label class="check"><input type="checkbox" bind:checked={c.aceptaPromociones} /> Acepta recibir promociones{#if c.promocionesFecha} <span class="mute">(desde {fecha(c.promocionesFecha)})</span>{/if}</label>
      {#if c.datosFiscales}<p class="mute">Factura: {c.datosFiscales.rfc} · {c.datosFiscales.razonSocial} · CP {c.datosFiscales.cp}</p>{/if}
      {#if puede('operacion')}<button class="btn pri" onclick={guardar}>Guardar</button>{/if}
    </section>
  </div>
{/if}
