<script>
  import { onMount, onDestroy } from 'svelte'
  import { micId, threshold } from '$lib/store.svelte.js'
  import { conn } from '$lib/connection.svelte.js'

  // AnalyserNode output bytes are 0-255 centered at 128.
  // display rms = mean(|v-128|) * 25, so threshold on scale 50-600
  // maps to float32 RMS via: float_rms * 2543 ≈ display_rms
  const FLOAT_SCALE = 2543

  const SAMPLE_RATE = 16000
  const BUFFER_SIZE = 1024   // 64 ms per frame
  const SILENCE_FRAMES = 12  // ~768 ms silence before flush
  const MIN_SPEECH_FRAMES = 4 // ~256 ms minimum utterance

  let devices = $state([])
  let rms = $state(0)

  let stream = null
  let audioCtx = null
  let analyserNode = null
  let procNode = null
  let animId = null
  let sessionId = 0

  onMount(async () => {
    const all = await navigator.mediaDevices.enumerateDevices()
    devices = all.filter(d => d.kind === 'audioinput')
    if (!micId.value && devices.length) micId.value = devices[0].deviceId
  })

  onDestroy(stopAudio)

  $effect(() => {
    micId.value // track mic changes
    startAudio()
    return stopAudio
  })

  async function startAudio() {
    stopAudio()
    if (!micId.value) return
    const mySession = ++sessionId
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: micId.value },
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        }
      })
      if (mySession !== sessionId) { s.getTracks().forEach(t => t.stop()); return }
      stream = s

      audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE })
      const src = audioCtx.createMediaStreamSource(stream)

      // --- Meter via AnalyserNode ---
      analyserNode = audioCtx.createAnalyser()
      analyserNode.fftSize = 256
      src.connect(analyserNode)
      tickMeter()

      // --- Streaming via ScriptProcessorNode ---
      procNode = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1)
      let speechBuf = []
      let silenceCount = 0
      let speechCount = 0
      let isSpeaking = false

      procNode.onaudioprocess = (e) => {
        if (conn.status !== 'connected' || !conn.ws || conn.ws.readyState !== 1) return

        const samples = e.inputBuffer.getChannelData(0)

        // Float32 RMS
        const energy = samples.reduce((s, v) => s + v * v, 0) / samples.length
        const floatRms = Math.sqrt(energy)
        const isVoice = floatRms * FLOAT_SCALE > threshold.value

        // Convert float32 → int16 PCM
        const pcm = new Int16Array(samples.length)
        for (let i = 0; i < samples.length; i++) {
          pcm[i] = Math.max(-32768, Math.min(32767, samples[i] * 32768))
        }

        if (isVoice) {
          if (!isSpeaking) { isSpeaking = true; speechCount = 0; speechBuf = [] }
          speechBuf.push(pcm)
          speechCount++
          silenceCount = 0
        } else if (isSpeaking) {
          speechBuf.push(pcm)
          silenceCount++
          if (silenceCount >= SILENCE_FRAMES) {
            if (speechCount >= MIN_SPEECH_FRAMES) sendAudio(speechBuf)
            isSpeaking = false; speechBuf = []; silenceCount = 0; speechCount = 0
          }
        }
      }

      src.connect(procNode)
      procNode.connect(audioCtx.destination) // required for onaudioprocess to fire

    } catch (err) {
      console.error('[audio]', err)
      rms = 0
    }
  }

  function tickMeter() {
    if (!analyserNode) return
    const buf = new Uint8Array(analyserNode.fftSize)
    analyserNode.getByteTimeDomainData(buf)
    const mean = buf.reduce((s, v) => s + Math.abs(v - 128), 0) / buf.length
    rms = Math.round(mean * 25)
    animId = requestAnimationFrame(tickMeter)
  }

  function sendAudio(bufs) {
    const ws = conn.ws
    if (!ws || ws.readyState !== 1) return
    const total = bufs.reduce((s, b) => s + b.length, 0)
    const out = new Int16Array(total)
    let off = 0
    for (const b of bufs) { out.set(b, off); off += b.length }
    ws.send(out.buffer)
  }

  function stopAudio() {
    cancelAnimationFrame(animId)
    procNode?.disconnect()
    analyserNode?.disconnect()
    audioCtx?.close()
    stream?.getTracks().forEach(t => t.stop())
    procNode = null; analyserNode = null; audioCtx = null; stream = null; animId = null
    rms = 0
  }
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

  <div class="flex flex-col gap-2">
    <span class="text-xs font-medium text-zinc-400">Input level</span>
    <div class="h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-75"
        style="width: {Math.min(rms / 6, 100)}%; background: {rms > threshold.value ? '#22c55e' : '#6366f1'}"
      ></div>
    </div>
    <p class="text-xs text-zinc-500">
      {#if conn.status === 'connected'}
        Streaming active — green = above threshold
      {:else}
        Connect on the Connect tab to start streaming
      {/if}
    </p>
  </div>

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
