function persisted(key, initial) {
  let value = $state(JSON.parse(localStorage.getItem(key) ?? 'null') ?? initial)

  return {
    get value() { return value },
    set value(v) {
      value = v
      localStorage.setItem(key, JSON.stringify(v))
    }
  }
}

export const token     = persisted('token', '')
export const serverUrl = persisted('serverUrl', 'ws://localhost:8000')
export const micId     = persisted('micId', '')
export const threshold = persisted('threshold', 300)
export const sourceId  = persisted('sourceId', '')
