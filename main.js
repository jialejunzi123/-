const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let petWindow = null;
let tray = null;

function createPetWindow() {
  petWindow = new BrowserWindow({
    width: 200,
    height: 220,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    type: 'toolbar',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  petWindow.loadFile('index.html');

  // Prevent the window from being captured in screenshots (optional)
  petWindow.setVisibleOnAllWorkspaces(true);
  
  // Position at bottom-right of screen by default
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  petWindow.setPosition(width - 220, height - 240);

  // Ignore mouse events on transparent areas so clicks pass through
  petWindow.setIgnoreMouseEvents(false);

  // 右键菜单：直接退出
  const petContextMenu = Menu.buildFromTemplate([
    { label: '🐧 关于咕咕嘎嘎', enabled: false },
    { type: 'separator' },
    { label: '🙈 隐藏', click: () => petWindow?.hide() },
    { label: '🚶 散步模式', type: 'checkbox', checked: false, click: (item) => petWindow?.webContents.send('toggle-walk', item.checked) },
    { label: '🎯 跟随模式', type: 'checkbox', checked: false, click: (item) => petWindow?.webContents.send('toggle-follow', item.checked) },
    { type: 'separator' },
    { label: '❌ 退出', click: () => app.quit() }
  ]);

  petWindow.webContents.on('context-menu', () => {
    petContextMenu.popup();
  });

  petWindow.on('closed', () => {
    petWindow = null;
  });
}

function createTray() {
  // Create a simple 16x16 tray icon
  const iconPath = path.join(__dirname, 'assets', 'penguin.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏 咕咕嘎嘎',
      click: () => {
        if (petWindow) {
          petWindow.isVisible() ? petWindow.hide() : petWindow.show();
        }
      }
    },
    { type: 'separator' },
    {
      label: '🔄 跟随模式',
      type: 'checkbox',
      checked: false,
      click: (menuItem) => {
        petWindow?.webContents.send('toggle-follow', menuItem.checked);
      }
    },
    {
      label: '🚶 散步模式',
      type: 'checkbox',
      checked: false,
      click: (menuItem) => {
        petWindow?.webContents.send('toggle-walk', menuItem.checked);
      }
    },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]);

  tray.setToolTip('咕咕嘎嘎 - 桌面宠物');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (petWindow) {
      petWindow.isVisible() ? petWindow.hide() : petWindow.show();
    }
  });
}

// IPC handlers
ipcMain.handle('get-asset-path', () => {
  return path.join(__dirname, 'assets', 'penguin.png');
});

ipcMain.on('pet-move', (event, { deltaX, deltaY }) => {
  if (petWindow) {
    const [x, y] = petWindow.getPosition();
    petWindow.setPosition(x + deltaX, y + deltaY);
  }
});

ipcMain.on('set-position', (event, { x, y }) => {
  if (petWindow) {
    petWindow.setPosition(Math.round(x), Math.round(y));
  }
});

ipcMain.on('get-bounds', (event) => {
  if (petWindow) {
    event.returnValue = petWindow.getBounds();
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.on('hide-pet', () => {
  if (petWindow) petWindow.hide();
});

app.whenReady().then(() => {
  createPetWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createPetWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit on window close; keep running in tray
});

app.on('before-quit', () => {
  if (tray) tray.destroy();
});
