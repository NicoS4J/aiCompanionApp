import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', cb),
  installUpdate: () => ipcRenderer.invoke('install-update')
})
