<script lang="ts">
  import { onMount } from 'svelte';
  import { API, cambiarContrasena, entrar, entrarConContrasena, get, modoLocal, salir, supabase } from './lib/api';
  import { aviso, avisar, puede, sesion, ROL } from './lib/util.svelte';
  import Hoy from './vistas/Hoy.svelte';
  import Agenda from './vistas/Agenda.svelte';
  import Pedidos from './vistas/Pedidos.svelte';
  import Pedido from './vistas/Pedido.svelte';
  import NuevoPedido from './vistas/NuevoPedido.svelte';
  import Trabajos from './vistas/Trabajos.svelte';
  import Solicitudes from './vistas/Solicitudes.svelte';
  import Clientes from './vistas/Clientes.svelte';
  import Cliente from './vistas/Cliente.svelte';
  import Catalogo from './vistas/Catalogo.svelte';
  import Horarios from './vistas/Horarios.svelte';
  import Espacios from './vistas/Espacios.svelte';
  import Correos from './vistas/Correos.svelte';
  import Reportes from './vistas/Reportes.svelte';
  import Usuarios from './vistas/Usuarios.svelte';
  import Ajustes from './vistas/Ajustes.svelte';

  let estado = $state<'cargando' | 'fuera' | 'dentro'>('cargando');
  let mensaje = $state('');
  let correo = $state('');
  let contrasena = $state('');
  let conEnlace = $state(false);
  let enviado = $state(false);
  let cambiando = $state(false);
  let nueva = $state('');
  let ruta = $state(location.hash.slice(1) || '/');
  let menu = $state(false);
  let pendientes = $state({ tareas: 0, solicitudes: 0 });

  const partes = $derived(ruta.split('?')[0].split('/').filter(Boolean));
  const params = $derived(new URLSearchParams(ruta.split('?')[1] ?? ''));

  async function cargarSesion() {
    try {
      const yo = await get('/admin/yo');
      Object.assign(sesion, yo);
      estado = 'dentro';
      refrescarContadores();
    } catch (e) {
      estado = 'fuera';
      const err = e as { estado?: number; message: string };
      if (err.estado !== 401) mensaje = err.message;
    }
  }

  async function refrescarContadores() {
    try {
      const r = await get('/admin/resumen');
      pendientes = { tareas: r.tareas.length, solicitudes: r.solicitudesNuevas };
    } catch { /* sin permisos o sin red */ }
  }

  onMount(() => {
    const cambio = () => { ruta = location.hash.slice(1) || '/'; menu = false; window.scrollTo(0, 0); };
    window.addEventListener('hashchange', cambio);
    if (!API) { estado = 'fuera'; mensaje = 'Falta configurar VITE_RESERVAS_API.'; return; }
    if (supabase) supabase.auth.onAuthStateChange((evento) => { if (evento === 'SIGNED_IN' && estado !== 'dentro') cargarSesion(); });
    cargarSesion();
    const t = setInterval(refrescarContadores, 120000);
    return () => { window.removeEventListener('hashchange', cambio); clearInterval(t); };
  });

  async function enviarCorreo(e: Event) {
    e.preventDefault();
    mensaje = '';
    try {
      const r = conEnlace ? await entrar(correo) : await entrarConContrasena(correo, contrasena);
      if (r === 'listo') cargarSesion();
      else enviado = true;
    } catch (err) { mensaje = (err as Error).message; }
  }

  async function guardarContrasena(e: Event) {
    e.preventDefault();
    if (nueva.length < 8) return avisar('La contraseña debe tener al menos 8 caracteres.', true);
    try {
      await cambiarContrasena(nueva);
      nueva = '';
      cambiando = false;
      avisar('Contraseña guardada. La próxima vez entra con tu correo y esta contraseña.');
    } catch (err) { avisar((err as Error).message, true); }
  }

  const enlaces = $derived([
    { grupo: 'Operación' },
    { href: '/', texto: 'Hoy', roles: ['operacion', 'postproduccion'], cuenta: pendientes.tareas },
    { href: '/agenda', texto: 'Agenda', roles: ['operacion'] },
    { href: '/pedidos', texto: 'Pedidos', roles: ['operacion', 'postproduccion'] },
    { href: '/pedidos/nuevo', texto: 'Nuevo pedido', roles: ['operacion'] },
    { href: '/postproduccion', texto: 'Postproducción', roles: ['operacion', 'postproduccion'] },
    { href: '/solicitudes', texto: 'Solicitudes', roles: ['operacion'], cuenta: pendientes.solicitudes },
    { href: '/clientes', texto: 'Clientes', roles: ['operacion', 'postproduccion'] },
    { grupo: 'Configuración' },
    { href: '/catalogo', texto: 'Precios y catálogo', roles: ['operacion'] },
    { href: '/horarios', texto: 'Horarios y bloqueos', roles: ['operacion'] },
    { href: '/espacios', texto: 'Reglas y políticas', roles: [] },
    { href: '/correos', texto: 'Correos', roles: [] },
    { href: '/reportes', texto: 'Reportes', roles: [] },
    { href: '/usuarios', texto: 'Usuarios', roles: [] },
    { href: '/ajustes', texto: 'Ajustes', roles: [] },
  ] as { href?: string; texto?: string; roles?: string[]; grupo?: string; cuenta?: number }[]);

  const activo = (href: string) => (href === '/' ? ruta === '/' : ruta === href || (ruta.startsWith(href + '/') && href !== '/pedidos') || (href === '/pedidos' && /^\/pedidos\/(?!nuevo)/.test(ruta)));
</script>

{#if estado === 'cargando'}
  <p style="padding:40px">Cargando…</p>
{:else if estado === 'fuera'}
  <main style="max-width:420px;margin:12vh auto;padding:0 20px" class="pila">
    <p class="marca">UNDYING <span>STUDIOS</span></p>
    <h1>Panel de reservas</h1>
    {#if enviado}
      <p>Te mandamos un enlace a <b>{correo}</b>. Ábrelo en este mismo navegador para entrar.</p>
    {:else}
      {#if modoLocal}
        <p class="mute">Modo local: entra con un correo de ADMIN_CORREOS (admin@undying.test).</p>
      {:else if conEnlace}
        <p class="mute">Te mandamos un enlace para entrar. Úsalo si olvidaste tu contraseña o aún no tienes una.</p>
      {/if}
      <form class="pila" onsubmit={enviarCorreo}>
        <label class="campo">Correo<input type="email" bind:value={correo} required autocomplete="email" /></label>
        {#if !modoLocal && !conEnlace}
          <label class="campo">Contraseña<input type="password" bind:value={contrasena} required autocomplete="current-password" /></label>
        {/if}
        <button class="btn pri" type="submit">{conEnlace ? 'Mandarme el enlace' : 'Entrar'}</button>
      </form>
      {#if !modoLocal}
        <button class="btn chico" type="button" onclick={() => { conEnlace = !conEnlace; mensaje = ''; }}>
          {conEnlace ? 'Entrar con contraseña' : 'Olvidé mi contraseña o no tengo una'}
        </button>
      {/if}
    {/if}
    {#if mensaje}<p class="err">{mensaje}</p>{/if}
  </main>
{:else}
  <div class="movil"><span class="marca" style="padding:0">UNDYING <span>STUDIOS</span></span><button class="btn chico" onclick={() => (menu = !menu)}>Menú</button></div>
  <div class="app">
    <nav class="lateral" class:abierto={menu}>
      <p class="marca">UNDYING <span>STUDIOS</span></p>
      {#each enlaces as e}
        {#if e.grupo}
          <p class="grupo">{e.grupo}</p>
        {:else if puede(...(e.roles ?? []))}
          <a href={'#' + e.href} class:on={activo(e.href!)}>{e.texto}{#if e.cuenta}<span class="cuenta">{e.cuenta}</span>{/if}</a>
        {/if}
      {/each}
      <div class="pie">
        <span>{sesion.correo}</span>
        <span>{ROL[sesion.rol] ?? sesion.rol}</span>
        {#if !modoLocal}
          {#if cambiando}
            <form class="pila" onsubmit={guardarContrasena}>
              <label class="campo">Contraseña nueva<input type="password" bind:value={nueva} minlength="8" required autocomplete="new-password" /></label>
              <button class="btn chico pri" type="submit">Guardar</button>
            </form>
          {:else}
            <button class="btn chico" onclick={() => (cambiando = true)}>Cambiar contraseña</button>
          {/if}
        {/if}
        <button class="btn chico" onclick={salir}>Salir</button>
      </div>
    </nav>
    <main class="principal">
      {#key ruta}
        {#if partes.length === 0}<Hoy />
        {:else if partes[0] === 'agenda'}<Agenda />
        {:else if partes[0] === 'pedidos' && partes[1] === 'nuevo'}<NuevoPedido {params} />
        {:else if partes[0] === 'pedidos' && partes[1]}<Pedido id={partes[1]} />
        {:else if partes[0] === 'pedidos'}<Pedidos />
        {:else if partes[0] === 'postproduccion'}<Trabajos />
        {:else if partes[0] === 'solicitudes'}<Solicitudes id={partes[1]} />
        {:else if partes[0] === 'clientes' && partes[1]}<Cliente id={partes[1]} />
        {:else if partes[0] === 'clientes'}<Clientes />
        {:else if partes[0] === 'catalogo'}<Catalogo />
        {:else if partes[0] === 'horarios'}<Horarios />
        {:else if partes[0] === 'espacios'}<Espacios />
        {:else if partes[0] === 'correos'}<Correos />
        {:else if partes[0] === 'reportes'}<Reportes />
        {:else if partes[0] === 'usuarios'}<Usuarios />
        {:else if partes[0] === 'ajustes'}<Ajustes />
        {:else}<p>Página no encontrada.</p>{/if}
      {/key}
    </main>
  </div>
{/if}

{#if aviso.texto}
  <div class="aviso-flotante" class:error={aviso.error} role="status">{aviso.texto}</div>
{/if}
