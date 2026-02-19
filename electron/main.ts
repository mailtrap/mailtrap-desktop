import { app, BrowserWindow, shell, nativeImage } from 'electron'
import { join } from 'path'
import { createTray } from './tray'
import { registerIpcHandlers } from './ipc/handlers'
import { getSettings } from './store'

// Set app name (visible in dock & menu bar instead of "Electron")
app.setName('Mailtrap')

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const isDev = process.env.NODE_ENV === 'development' || !!process.env['ELECTRON_RENDERER_URL']

  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#101A26',
    icon: join(__dirname, '../../resources/icon.png'),
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  // Open external links in browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  // Set dock icon on macOS (needed in dev mode; production uses the bundled icon)
  if (process.platform === 'darwin') {
    const iconPath = join(__dirname, '../../resources/icon.png')
    const dockIcon = nativeImage.createFromPath(iconPath)
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon)
    }
  }

  // Register IPC handlers before creating any windows
  registerIpcHandlers()

  // Apply persisted settings on startup
  const savedSettings = getSettings()
  app.setLoginItemSettings({ openAtLogin: savedSettings.launchAtStartup })

  mainWindow = createWindow()

  // Create the system tray
  createTray(mainWindow)

  // macOS: re-create window when dock icon is clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      createTray(mainWindow)
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
})

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
