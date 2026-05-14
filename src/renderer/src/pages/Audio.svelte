<script>
  import { onMount } from 'svelte'
  import { micId, threshold } from '$lib/store.js'

  let devices = $state([])
  let rms = $state(0)
  let animFrame

  onMount(async () => {
    const all = await navigator.mediaDevices.enumerateDevices()
    devices = all.filter(d => d.kind === 'audioinput')
    if (!micId.value && devices.length) micId.value = devices[0].deviceId
    startMeter()
    return () => cancelAnimationFrame(animFrame)
  })

  let stream = null
  let analyser = null

  async function startMeter() {
    try {
      stream?.getTracks().forEach(t => t.stop())
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: micId.value ? { exact: micId.value } : undefined }
      })
      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      tick()
    } catch {
      rms = 0
    }
  }

  function tick() {
    if (!analyser) return
    const buf = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(buf)
    const mean = buf.reduce((s, v) => s + Math.abs(v - 128), 0) / buf.length
    rms = Math.round(mean * 25)
    animFrame = requestAnimationFrame(tick)
  }

  function onMicChange() {
    startMeter()
  }

  $effect(() => {
    micId.value
    onMicChange()
  })
</script>

<div class="flex flex-col gap-6">
  <label class="flex flex-col gap-1">
    <span class="text-xs font-medium text-zinc-400">Microphone</span>
    <select bind:value={micId.value} class="input">
      {#each devices as d}
        <option value={d.deviceId}>{d.label || 'Microphone ' + d.deviceId.slice(0, 6)}</option>
      {/each}
    </select>
  </label>

  <!-- Live level meter -->
  <div class="flex flex-col gap-2">
    <span class="text-xs font-medium text-zinc-400">Input level</span>
    <div class="h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-75"
        style="width: {Math.min(rms, 100)}%; background: {rms > threshold.value ? '#22c55e' : '#6366f1'}"
      ></div>
    </div>
    <p class="text-xs text-zinc-500">Green = above sensitivity threshold</p>
  </div>

  <!-- Sensitivity slider -->
  <label class="flex flex-col gap-2">
    <div class="flex justify-between">
      <span class="text-xs font-medium text-zinc-400">Sensitivity threshold</span>
      <span class="text-xs text-zinc-500">{threshold.value}</span>
    </div>
    <input
      type="range"
      min="50"
      max="600"
      step="10"
      bind:value={threshold.value}
      class="accent-indigo-500 w-full"
    />
    <div class="flex justify-between text-xs text-zinc-600">
      <span>More sensitive</span>
      <span>Less sensitive</span>
    </div>
  </label>
</div>
