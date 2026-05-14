<script>
  import { onMount } from 'svelte'
  import { sourceId } from '$lib/store.js'

  let sources = $state([])
  let loading = $state(true)

  onMount(async () => {
    sources = await window.api.getSources()
    loading = false
    if (!sourceId.value && sources.length) sourceId.value = sources[0].id
  })
</script>

<div class="flex flex-col gap-4">
  <p class="text-xs text-zinc-500">
    Choose the display or window Shiro can watch. Screen capture will be used for
    game commentary (coming soon).
  </p>

  {#if loading}
    <p class="text-sm text-zinc-500">Loading sources…</p>
  {:else if sources.length === 0}
    <p class="text-sm text-zinc-500">No sources found.</p>
  {:else}
    <div class="grid grid-cols-2 gap-3">
      {#each sources as src}
        <button
          onclick={() => sourceId.value = src.id}
          class="flex flex-col gap-2 p-2 rounded-xl border transition-colors text-left
                 {sourceId.value === src.id
                   ? 'border-indigo-500 bg-indigo-500/10'
                   : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}"
        >
          <img src={src.thumbnail} alt={src.name} class="w-full rounded-lg aspect-video object-cover bg-zinc-800" />
          <span class="text-xs text-zinc-300 truncate">{src.name}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
