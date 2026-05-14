import { app, shell, BrowserWindow, ipcMain, desktopCapturer } from 'electron'
import { join } from 'path'
import { autoUpdater } from 'electron-updater'

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 580,
    show: false,
    backgroundColor: '#0f0f0f',
    autoHideMenuBar: true,
    resizable: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f0f0f',
      symbolColor: '#ffffff',
      height: 32
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.nicos4j.aicompanionapp')

  ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 }
    })
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL()
    }))
  })

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall()
  })

  const win = createWindow()

  if (!isDev) {
    autoUpdater.checkForUpdates()
    autoUpdater.on('update-downloaded', () => {
      win.webContents.send('update-downloaded')
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
