let _ws = $state(null)
let _status = $state('idle') // idle | connecting | connected | error
let _error = $state('')

export const conn = {
  get ws() { return _ws },
  get status() { return _status },
  get error() { return _error },

  connect(url, token) {
    if (_ws) return
    _status = 'connecting'
    _error = ''
    const ws = new WebSocket(`${url}/ws/voice?token=${encodeURIComponent(token)}`)
    ws.binaryType = 'arraybuffer'
    _ws = ws
    ws.onopen = () => { _status = 'connected' }
    ws.onerror = () => { _status = 'error'; _error = 'Connection failed.' }
    ws.onclose = (e) => {
      _ws = null
      if (e.code === 4001) { _status = 'error'; _error = 'Invalid token.' }
      else if (_status !== 'error') { _status = 'idle'; _error = '' }
    }
  },

  disconnect() {
    _ws?.close(1000)
    _ws = null
    _status = 'idle'
    _error = ''
  }
}
