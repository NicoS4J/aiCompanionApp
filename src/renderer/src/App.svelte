<script>
  import { onMount } from 'svelte'
  import Connect from './pages/Connect.svelte'
  import Audio from './pages/Audio.svelte'
  import Stream from './pages/Stream.svelte'

  let page = $state('connect')
  let updateReady = $state(false)

  const tabs = [
    { id: 'connect', label: 'Connect' },
    { id: 'audio',   label: 'Audio' },
    { id: 'stream',  label: 'Stream' },
  ]

  onMount(() => {
    window.api?.onUpdateDownloaded(() => { updateReady = true })
  })
</script>

<div class="flex flex-col h-screen bg-zinc-950 text-zinc-100">
  <!-- Custom titlebar drag region -->
  <div class="h-8 w-full" style="-webkit-app-region: drag"></div>

  <!-- Update banner -->
  {#if updateReady}
    <div class="flex items-center justify-between px-4 py-2 bg-indigo-600 text-white text-sm">
      <span>A new version is ready.</span>
      <button
        onclick={() => window.api.installUpdate()}
        class="ml-4 px-3 py-0.5 rounded bg-white text-indigo-700 font-medium hover:bg-indigo-50 transition-colors"
      >
        Restart & Update
      </button>
    </div>
  {/if}

  <!-- Tab bar -->
  <div class="flex gap-1 px-4 pb-3 border-b border-zinc-800">
    {#each tabs as tab}
      <button
        onclick={() => page = tab.id}
        class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors
               {page === tab.id
                 ? 'bg-zinc-800 text-white'
                 : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'}"
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Page content -->
  <div class="flex-1 overflow-y-auto p-5">
    {#if page === 'connect'}
      <Connect />
    {:else if page === 'audio'}
      <Audio />
    {:else if page === 'stream'}
      <Stream />
    {/if}
  </div>
</div>
