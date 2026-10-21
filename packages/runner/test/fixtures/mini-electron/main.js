const { app, BrowserWindow, ipcMain } = require("electron");
function shout(text) { return String(text).toUpperCase() + "!"; }
ipcMain.handle("shout", (_e, text) => shout(text));
app.whenReady().then(() => new BrowserWindow({ webPreferences: { contextIsolation: true } }).loadFile("index.html"));
