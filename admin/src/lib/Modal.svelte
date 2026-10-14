<script lang="ts">
  import type { Snippet } from 'svelte';
  let { titulo, abierto = $bindable(false), children, pie }: { titulo: string; abierto: boolean; children: Snippet; pie?: Snippet } = $props();
  let dlg: HTMLDialogElement;
  $effect(() => {
    if (abierto && !dlg.open) dlg.showModal();
    if (!abierto && dlg.open) dlg.close();
  });
</script>

<dialog class="modal" bind:this={dlg} onclose={() => (abierto = false)}>
  {#if abierto}
    <header><h2>{titulo}</h2><button class="btn chico" type="button" onclick={() => (abierto = false)} aria-label="Cerrar">×</button></header>
    <div class="cuerpo">{@render children()}</div>
    {#if pie}<footer>{@render pie()}</footer>{/if}
  {/if}
</dialog>
