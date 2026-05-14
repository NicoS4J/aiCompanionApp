import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getSources: () => ipcRenderer.invoke('get-sources')
})
