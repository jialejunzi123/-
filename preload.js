const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  getAssetPath: () => ipcRenderer.invoke('get-asset-path'),
  movePet: (deltaX, deltaY) => ipcRenderer.send('pet-move', { deltaX, deltaY }),
  setPosition: (x, y) => ipcRenderer.send('set-position', { x, y }),
  getBounds: () => ipcRenderer.sendSync('get-bounds'),
  onToggleFollow: (callback) => ipcRenderer.on('toggle-follow', (_event, value) => callback(value)),
  onToggleWalk: (callback) => ipcRenderer.on('toggle-walk', (_event, value) => callback(value)),
  quitApp: () => ipcRenderer.send('quit-app'),
  hidePet: () => ipcRenderer.send('hide-pet')
});
