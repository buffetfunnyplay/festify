// ─────────────────────────────────────────────────────────────
// Festify para Windows (Electron)
// Carrega o mesmo site (pasta web/) por um protocolo próprio app://
// para que módulos JS, localStorage e rotas funcionem como na web.
// ─────────────────────────────────────────────────────────────
const { app, BrowserWindow, Menu, net, protocol, shell } = require('electron')
const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')

const WEB_DIR = path.join(__dirname, 'web')
const START_URL = 'app://festify/index.html?admin=1'

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
])

// Só uma janela do app por vez
if (!app.requestSingleInstanceLock()) app.quit()

let win

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 600,
    title: 'Festify',
    backgroundColor: '#fbf8ff',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: true },
  })
  win.once('ready-to-show', () => win.show())

  // Links externos (WhatsApp, Maps, Waze, Supabase...) abrem no navegador padrão
  const isExternal = (url) => !url.startsWith('app://')
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (isExternal(url)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  win.loadURL(START_URL)
}

app.whenReady().then(() => {
  // Serve os arquivos da pasta web/ (fallback para index.html)
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url)
    let file = path.normalize(path.join(WEB_DIR, decodeURIComponent(pathname)))
    if (!file.startsWith(WEB_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(WEB_DIR, 'index.html')
    }
    return net.fetch(pathToFileURL(file).toString())
  })

  Menu.setApplicationMenu(null)
  createWindow()

  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow())
})

app.on('window-all-closed', () => app.quit())
