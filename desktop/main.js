// Tiên Lộ Online – Windows client. A window onto the online game (same account, server and
// updates as the web version); nothing of the game is bundled, so it never goes stale.
const { app, BrowserWindow, shell, Menu } = require('electron');
const GAME = 'https://mkt.ddnsfree.com/?play';
const ORIGIN = new URL(GAME).origin;
if (!app.requestSingleInstanceLock()) app.quit();
let win = null;
function create() {
  win = new BrowserWindow({
    width: 1366, height: 800, minWidth: 960, minHeight: 600, backgroundColor: '#0f1d24', title: 'Tiên Lộ Online',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false }
  });
  Menu.setApplicationMenu(null);
  win.webContents.setUserAgent(win.webContents.getUserAgent() + ' TienLoDesktop/0.1');
  // Only the game origin opens inside the window; other links go to the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== ORIGIN) { event.preventDefault(); shell.openExternal(url); } });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); event.preventDefault(); }
    if (input.key === 'F5') { win.webContents.reload(); event.preventDefault(); }
  });
  win.webContents.on('did-fail-load', (_e, code, desc, url, isMain) => {
    if (!isMain) return;
    win.webContents.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
      '<body style="background:#0f1d24;color:#e9e2cf;font:16px system-ui;display:grid;place-items:center;height:100vh;margin:0;text-align:center">' +
      '<div><h2>Không kết nối được máy chủ Tiên Lộ</h2><p>Kiểm tra mạng rồi bấm thử lại.</p>' +
      '<button style="padding:10px 22px;font-size:16px" onclick="location.href=\'' + GAME + '\'">Thử lại</button></div></body>'));
  });
  win.loadURL(GAME);
}
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
