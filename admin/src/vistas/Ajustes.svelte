<script lang="ts">
  import { get, post, put } from '../lib/api';
  import { intentar, sesion } from '../lib/util.svelte';

  let a = $state<any>(null);
  let equipo = $state('');
  const cargar = async () => {
    a = await intentar(() => get('/admin/ajustes'));
    if (a) equipo = (a.avisos.correosEquipo ?? []).join('\n');
  };
  cargar();

  async function guardarNegocio() { await intentar(() => put('/admin/ajustes/negocio', a.negocio), 'Datos guardados'); }
  async function guardarAvisos() {
    a.avisos.correosEquipo = equipo.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
    await intentar(() => put('/admin/ajustes/avisos', a.avisos), 'Avisos guardados');
  }
  const copiar = (t: string) => navigator.clipboard?.writeText(t);
</script>

<div class="cabecera"><h1>Ajustes</h1></div>
{#if a}
  <div class="rejilla">
    <section class="card pila">
      <h2>Datos del negocio</h2>
      <p class="mute">Aparecen en los correos y en los archivos de calendario.</p>
      <label class="campo">Nombre<input bind:value={a.negocio.nombre} /></label>
      <label class="campo">Correo de contacto<input bind:value={a.negocio.correo} /></label>
      <label class="campo">WhatsApp (solo números con 521)<input bind:value={a.negocio.whatsapp} /></label>
      <label class="campo">WhatsApp como se muestra<input bind:value={a.negocio.whatsappTexto} /></label>
      <label class="campo">Dirección<input bind:value={a.negocio.direccion} /></label>
      <label class="campo">Mapa<input bind:value={a.negocio.mapa} /></label>
      <label class="campo">Indicaciones de llegada<textarea rows="3" bind:value={a.negocio.llegada}></textarea></label>
      <button class="btn pri" onclick={guardarNegocio}>Guardar</button>
    </section>
    <section class="card pila">
      <h2>Avisos al equipo</h2>
      <label class="campo">Correos del equipo (uno por línea)<textarea rows="3" bind:value={equipo}></textarea></label>
      <div class="form">
        <label class="campo">Hora del resumen de mañana<input type="number" min="0" max="23" bind:value={a.avisos.horaResumen} /></label>
        <label class="campo">Resumen semanal (0 = domingo)<input type="number" min="0" max="6" bind:value={a.avisos.diaResumenSemanal} /></label>
        <label class="campo">Hora del correo de gracias<input type="number" min="0" max="23" bind:value={a.avisos.horaGracias} /></label>
        <label class="campo">Aprobar entregas solas tras (días)<input type="number" min="1" bind:value={a.avisos.autoAprobarDias} /></label>
        <label class="campo">Avisar saldo a favor por vencer (días antes)<input type="number" min="1" bind:value={a.avisos.creditoAvisoDias} /></label>
        <label class="campo">Recordar la pintura (días antes)<input type="number" min="1" bind:value={a.avisos.pinturaAvisoDias} /></label>
      </div>
      <label class="campo">Enlace para dejar reseña en Google<input bind:value={a.avisos.resenaUrl} placeholder="https://g.page/r/…/review" /></label>
      <button class="btn pri" onclick={guardarAvisos}>Guardar</button>
    </section>
    <section class="card pila">
      <h2>Calendarios para el equipo</h2>
      <p class="mute">Suscríbete desde Google Calendar (Otros calendarios → Desde URL). Se actualiza solo. No compartas estos enlaces fuera del equipo.</p>
      {#each sesion.feeds as f}
        <div class="fila"><b style="min-width:80px">{f.espacio}</b><input readonly value={f.url} style="flex:1" /><button class="btn chico" onclick={() => copiar(f.url)}>Copiar</button></div>
      {/each}
    </section>
    <section class="card pila">
      <h2>Sitio</h2>
      <p class="mute">Los precios del panel se cobran al momento y las tarjetas del sitio se actualizan solas. Publicar vuelve a compilar el sitio para que los datos de Google (SEO) tengan los precios nuevos.</p>
      <button class="btn" disabled={!sesion.publicar} onclick={() => intentar(() => post('/admin/publicar'), 'Publicación iniciada; tarda unos minutos')}>Publicar sitio</button>
      {#if !sesion.publicar}<p class="mute">Falta configurar GITHUB_TOKEN y GITHUB_REPO en la función.</p>{/if}
    </section>
  </div>
{/if}
