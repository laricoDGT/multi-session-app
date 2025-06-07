const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openSession: (id) => ipcRenderer.send("open-session", id),
  addSession: (data) => ipcRenderer.send("add-session", data),
  deleteSession: (id) => ipcRenderer.send("delete-session", id),
  getSessions: () => ipcRenderer.invoke("get-sessions"),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (data) => ipcRenderer.send("save-settings", data),
  unlockAttempt: (pin) => ipcRenderer.send("unlock-attempt", pin),
  onUnlockResult: (cb) =>
    ipcRenderer.on("unlock-result", (event, success) => cb(success)),
  saveSessionsOrder: (sessionsArr) =>
    ipcRenderer.send("save-sessions-order", sessionsArr),
  refreshMenu: () => ipcRenderer.send("refresh-menu"),

  getAutoLaunch: () => ipcRenderer.invoke("get-auto-launch"),
  setAutoLaunch: (enabled) => ipcRenderer.send("set-auto-launch", enabled),
});
