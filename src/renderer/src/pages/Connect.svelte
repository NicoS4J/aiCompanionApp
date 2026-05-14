<script>
  import { token, serverUrl } from '$lib/store.js'

  let status = $state('idle') // idle | connecting | connected | error
  let errorMsg = $state('')
  let ws = $state(null)

  function connect() {
    if (!token.value || !serverUrl.value) return
    status = 'connecting'
    errorMsg = ''

    try {
      ws = new WebSocket(`${serverUrl.value}/ws/voice?token=${encodeURIComponent(token.value)}`)

      ws.onopen = () => { status = 'connected' }
      ws.onerror = () => { status = 'error'; errorMsg = 'Connection failed.' }
      ws.onclose = (e) => {
        if (status === 'connected') {
          status = e.code === 4001 ? 'error' : 'idle'
          errorMsg = e.code === 4001 ? 'Invalid token.' : ''
        }
      }
    } catch {
      status = 'error'
      errorMsg = 'Invalid URL.'
    }
  }

  function disconnect() {
    ws?.close()
    ws = null
    status = 'idle'
  }

  const statusColor = {
    idle:       'bg-zinc-600',
    connecting: 'bg-yellow-500 animate-pulse',
    connected:  'bg-green-500',
    error:      'bg-red-500',
  }
  const statusLabel = {
    idle:       'Disconnected',
    connecting: 'Connecting…',
    connected:  'Connected',
    error:      'Error',
  }
</script>

<div class="flex flex-col gap-6">
  <div>
    <p class="text-xs text-zinc-500 mb-1">Get your token with <code class="text-zinc-300">/link</code> in Discord.</p>
  </div>

  <div class="flex flex-col gap-3">
    <label class="flex flex-col gap-1">
      <span class="text-xs font-medium text-zinc-400">Server URL</span>
      <input
        type="text"
        bind:value={serverUrl.value}
        placeholder="ws://localhost:8000"
        disabled={status === 'connected'}
        class="input"
      />
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-xs font-medium text-zinc-400">Token</span>
      <input
        type="password"
        bind:value={token.value}
        placeholder="Paste your token here"
        disabled={status === 'connected'}
        class="input"
      />
    </label>
  </div>

  {#if errorMsg}
    <p class="text-sm text-red-400">{errorMsg}</p>
  {/if}

  <!-- Status indicator -->
  <div class="flex items-center gap-2">
    <span class="w-2 h-2 rounded-full {statusColor[status]}"></span>
    <span class="text-sm text-zinc-400">{statusLabel[status]}</span>
  </div>

  {#if status !== 'connected'}
    <button onclick={connect} disabled={!token.value || !serverUrl.value || status === 'connecting'} class="btn-primary">
      Connect
    </button>
  {:else}
    <button onclick={disconnect} class="btn-secondary">
      Disconnect
    </button>
  {/if}
</div>

<style>
  :global(.input) {
    @apply bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100
           placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors
           disabled:opacity-40 disabled:cursor-not-allowed w-full;
  }
  :global(.btn-primary) {
    @apply bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed
           text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors w-full;
  }
  :global(.btn-secondary) {
    @apply bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium
           py-2 px-4 rounded-lg transition-colors w-full;
  }
</style>
