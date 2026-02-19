import { Tray, Menu, MenuItem, BrowserWindow, nativeImage, shell, app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import type { InboxSummary, SendingStreamSummary } from './api/types'
import { isInboxVisibleInTray, getInboxSummariesCache } from './store'

let tray: Tray | null = null
let cachedInboxes: InboxSummary[] = []
let cachedStreams: SendingStreamSummary[] = []

function createTrayIcon(): Electron.NativeImage {
  // Try loading from file first
  const possiblePaths = [
    join(__dirname, '../../resources/trayIconTemplate.png'),
    join(__dirname, '../../../resources/trayIconTemplate.png'),
    join(app.getAppPath(), 'resources/trayIconTemplate.png')
  ]

  for (const iconPath of possiblePaths) {
    if (existsSync(iconPath)) {
      console.log('[Tray] Loading icon from:', iconPath)
      const img = nativeImage.createFromPath(iconPath)
      if (!img.isEmpty()) {
        img.setTemplateImage(true)
        return img
      }
      console.log('[Tray] Image was empty from path:', iconPath)
    }
  }

  // Fallback: create a 16x16 programmatic icon (letter "M")
  console.log('[Tray] Using fallback programmatic icon')
  // 16x16 RGBA buffer — draw a simple "M" shape in black on transparent
  const size = 16
  const buf = Buffer.alloc(size * size * 4, 0)

  function setPixel(x: number, y: number, a: number): void {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      const idx = (y * size + x) * 4
      buf[idx] = 0     // R
      buf[idx + 1] = 0 // G
      buf[idx + 2] = 0 // B
      buf[idx + 3] = a // A
    }
  }

  function vline(x: number, y1: number, y2: number, a = 220): void {
    for (let y = y1; y <= y2; y++) setPixel(x, y, a)
  }

  // Draw "M" shape (envelope-like)
  // Left vertical
  vline(2, 3, 12)
  vline(3, 3, 12)
  // Right vertical
  vline(12, 3, 12)
  vline(13, 3, 12)
  // Left diagonal down
  for (let i = 0; i <= 4; i++) {
    setPixel(4 + i, 3 + i, 220)
    setPixel(4 + i, 4 + i, 180)
  }
  // Right diagonal down
  for (let i = 0; i <= 4; i++) {
    setPixel(11 - i, 3 + i, 220)
    setPixel(11 - i, 4 + i, 180)
  }
  // Center bottom of V
  setPixel(7, 8, 220)
  setPixel(8, 8, 220)

  const img = nativeImage.createFromBuffer(buf, { width: size, height: size })
  img.setTemplateImage(true)
  return img
}

export function createTray(mainWindow: BrowserWindow): void {
  try {
    if (tray) {
      tray.destroy()
      tray = null
    }
    mainWindowRef = mainWindow
    const icon = createTrayIcon()
    tray = new Tray(icon)
    tray.setToolTip('Mailtrap')

    // Restore cached data so tray is populated immediately on launch
    try {
      const inboxCache = getInboxSummariesCache()
      if (inboxCache && Array.isArray(inboxCache.data)) {
        cachedInboxes = inboxCache.data as InboxSummary[]
      }
    } catch {
      // ignore cache load failure
    }

    // Build initial menu
    rebuildTrayMenu(mainWindow)

    // On click (Windows/Linux), show the context menu
    tray.on('click', () => {
      rebuildTrayMenu(mainWindow)
    })

    console.log('[Tray] Created successfully')
  } catch (err) {
    console.error('[Tray] Failed to create tray:', err)
  }
}

let mainWindowRef: BrowserWindow | null = null

export function updateTrayData(
  inboxes: InboxSummary[],
  streams: SendingStreamSummary[]
): void {
  cachedInboxes = inboxes
  cachedStreams = streams
  // Rebuild the menu so it reflects the latest data
  if (mainWindowRef) {
    rebuildTrayMenu(mainWindowRef)
  }
}

function rebuildTrayMenu(mainWindow: BrowserWindow): void {
  const menu = new Menu()

  // ── Sandboxes Section ──
  menu.append(
    new MenuItem({
      label: 'Sandboxes',
      enabled: false
    })
  )

  menu.append(new MenuItem({ type: 'separator' }))

  const visibleInboxes = cachedInboxes.filter((inbox) => isInboxVisibleInTray(inbox.id))

  if (visibleInboxes.length === 0) {
    menu.append(
      new MenuItem({
        label: '  No sandboxes found',
        enabled: false
      })
    )
  } else {
    // Group by project
    const byProject: Record<string, typeof visibleInboxes> = {}
    for (const inbox of visibleInboxes) {
      const key = inbox.projectName
      if (!byProject[key]) byProject[key] = []
      byProject[key].push(inbox)
    }

    for (const [projectName, projectInboxes] of Object.entries(byProject)) {

      // Project name header
      menu.append(
        new MenuItem({
          label: `  ${projectName}`,
          enabled: false
        })
      )

      // Indented inboxes — aligned columns
      for (const inbox of projectInboxes) {
        const nameWithCount = `${inbox.name} (${inbox.unreadCount}/${inbox.totalCount})`
        const subject = inbox.lastEmailSubject ? `'${truncate(inbox.lastEmailSubject, 28)}'` : ''
        const dateStr = inbox.lastEmailDate ? `(${inbox.lastEmailDate})` : ''

        menu.append(
          new MenuItem({
            label: `    ${nameWithCount}  ${subject}  ${dateStr}`.trimEnd(),
            toolTip: inbox.lastEmailSubject || undefined,
            click: () => {
              focusAndNavigate(mainWindow, `sandbox/inbox/${inbox.id}`)
            }
          })
        )
      }

    }
  }

  menu.append(new MenuItem({ type: 'separator' }))

  // ── API/SMTP Section ──
  menu.append(
    new MenuItem({
      label: 'API/SMTP',
      enabled: false
    })
  )

  menu.append(new MenuItem({ type: 'separator' }))

  if (cachedStreams.length === 0) {
    menu.append(
      new MenuItem({
        label: '  No sending streams found',
        enabled: false
      })
    )
  } else {
    const STREAM_NAME_COL = Math.max(20, ...cachedStreams.map((s) => s.name.length)) + 2
    const STREAM_SENT_COL = 14

    for (const stream of cachedStreams) {
      const nameCol = stream.name.padEnd(STREAM_NAME_COL)
      const sentCol = `${stream.sentCount.toLocaleString()} sent`.padEnd(STREAM_SENT_COL)
      const rateCol = stream.deliveryRate != null ? `${stream.deliveryRate.toFixed(1)}% delivered` : ''

      menu.append(
        new MenuItem({
          label: `  ${nameCol}${sentCol}${rateCol}`,
          click: () => {
            focusAndNavigate(mainWindow, `sending/${stream.id}`)
          }
        })
      )
    }
  }

  menu.append(new MenuItem({ type: 'separator' }))

  // ── Footer Section ──
  menu.append(
    new MenuItem({
      label: 'Settings',
      click: () => {
        focusAndNavigate(mainWindow, 'settings')
      }
    })
  )

  menu.append(
    new MenuItem({
      label: 'Open Mailtrap Web',
      click: () => {
        shell.openExternal('https://mailtrap.io')
      }
    })
  )

  menu.append(new MenuItem({ type: 'separator' }))

  menu.append(
    new MenuItem({
      label: 'Quit Mailtrap',
      click: () => {
        app.quit()
      }
    })
  )

  tray?.setContextMenu(menu)
}

function focusAndNavigate(mainWindow: BrowserWindow, route: string): void {
  mainWindow.show()
  mainWindow.focus()
  mainWindow.webContents.send('navigate', route)
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.substring(0, maxLen) + '...'
}
