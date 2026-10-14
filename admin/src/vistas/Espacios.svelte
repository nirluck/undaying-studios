<script lang="ts">
  import { put } from '../lib/api';
  import { catalogo } from '../lib/catalogo';
  import { intentar } from '../lib/util.svelte';

  let espacios = $state<any[]>([]);
  let sel = $state('estudio');
  const cargar = async () => { const c = await intentar(() => catalogo(true)); if (c) espacios = structuredClone(c.espacios); };
  cargar();
  const e = $derived(espacios.find((x) => x.id === sel));
  const RES = { credito: 'Saldo a favor', reembolso: 'Reembolso', nada: 'Sin devolución' };

  async function guardar() {
    await intentar(() => put('/admin/catalogo/espacios', {
      id: e.id, nombre: e.nombre, nombreCorto: e.nombreCorto, reservable: e.reservable, margenMin: e.margenMin, pasoMin: e.pasoMin, anticipacionH: e.anticipacionH,
      horizonteDias: e.horizonteDias, aforo: e.aforo, variasSesiones: e.variasSesiones, visitas: e.visitas, politica: e.politica, pago: e.pago, documentos: e.documentos, activo: e.activo,
    }), 'Reglas guardadas');
    cargar();
  }
</script>

<div class="cabecera">
  <h1>Reglas y políticas</h1>
  <select bind:value={sel}>{#each espacios as x}<option value={x.id}>{x.nombreCorto}</option>{/each}</select>
</div>

{#if e}
  <div class="rejilla">
    <section class="card pila">
      <h2>Calendario</h2>
      <div class="form">
        <label class="campo">Margen entre sesiones (min)<input type="number" min="0" step="15" bind:value={e.margenMin} /></label>
        <label class="campo">Inicios cada (min)<input type="number" min="15" step="15" bind:value={e.pasoMin} /></label>
        <label class="campo">Anticipación mínima (horas)<input type="number" min="0" bind:value={e.anticipacionH} /></label>
        <label class="campo">Reservas hasta (días)<input type="number" min="1" bind:value={e.horizonteDias} /></label>
        <label class="campo">Aforo<input type="number" min="1" bind:value={e.aforo} /></label>
      </div>
      <label class="check"><input type="checkbox" bind:checked={e.reservable} /> Se reserva en línea</label>
      <label class="check"><input type="checkbox" bind:checked={e.variasSesiones} /> Permite varias sesiones en un pedido</label>
    </section>

    <section class="card pila">
      <h2>Cambios y cancelaciones</h2>
      <div class="form">
        <label class="campo">Cambio de fecha con (horas)<input type="number" min="0" bind:value={e.politica.cambioH} /></label>
        <label class="campo">Límite de cancelación (horas)<input type="number" min="0" bind:value={e.politica.cancelacionH} /></label>
        <label class="campo">Si cancela antes del límite<select bind:value={e.politica.antes}>{#each Object.entries(RES) as [k, v]}<option value={k}>{v}</option>{/each}</select></label>
        <label class="campo">Si cancela después<select bind:value={e.politica.despues}>{#each Object.entries(RES) as [k, v]}<option value={k}>{v}</option>{/each}</select></label>
        <label class="campo">Vigencia del saldo a favor (días)<input type="number" min="1" bind:value={e.politica.creditoDias} /></label>
      </div>
      <p class="mute">El widget y los correos explican la política con estos valores. Revisa que coincida con los términos publicados.</p>
    </section>

    <section class="card pila">
      <h2>Pago</h2>
      <div class="form">
        <label class="campo">Apartado mientras paga con tarjeta (min)<input type="number" min="31" bind:value={e.pago.apartadoMin} /></label>
      </div>
      <label class="check"><input type="checkbox" bind:checked={e.pago.oxxo.activo} /> Aceptar OXXO</label>
      {#if e.pago.oxxo.activo}
        <div class="form">
          <label class="campo">Solo si la sesión está a (días)<input type="number" min="1" bind:value={e.pago.oxxo.diasMin} /></label>
          <label class="campo">Vigencia de la ficha (días)<input type="number" min="1" max="7" bind:value={e.pago.oxxo.vigenciaDias} /></label>
          <label class="campo">Monto máximo<input type="number" min="1" bind:value={e.pago.oxxo.montoMax} /></label>
        </div>
      {/if}
      <label class="check"><input type="checkbox" bind:checked={e.pago.msi.activo} /> Meses sin intereses</label>
      {#if e.pago.msi.activo}<label class="campo">A partir de<input type="number" min="0" bind:value={e.pago.msi.montoMin} /></label>{/if}
      <p class="mute">Los meses sin intereses también se activan en el panel de Stripe.</p>
    </section>

    <section class="card pila">
      <h2>Visitas</h2>
      <label class="check"><input type="checkbox" bind:checked={e.visitas.activas} /> Visitas en línea</label>
      <div class="form">
        <label class="campo">Duración (min)<input type="number" min="15" step="15" bind:value={e.visitas.duracionMin} /></label>
        <label class="campo">Inicios cada (min)<input type="number" min="15" step="15" bind:value={e.visitas.pasoMin} /></label>
        <label class="campo">Anticipación (horas)<input type="number" min="0" bind:value={e.visitas.anticipacionH} /></label>
      </div>
    </section>

    <section class="card pila">
      <h2>Documentos</h2>
      <div class="form">
        <label class="campo ancho">Términos<input bind:value={e.documentos.terminos} /></label>
        <label class="campo ancho">Reglamento (opcional)<input bind:value={e.documentos.reglamento} /></label>
        <label class="campo ancho">Aviso de privacidad<input bind:value={e.documentos.privacidad} /></label>
        <label class="campo">Versión aceptada<input bind:value={e.documentos.version} /></label>
      </div>
      <p class="mute">Cada pedido guarda qué versión aceptó el cliente. Cambia la versión cuando actualices los términos.</p>
    </section>
  </div>
  <button class="btn pri" style="margin-top:16px" onclick={guardar}>Guardar reglas de {e.nombreCorto}</button>
{/if}
