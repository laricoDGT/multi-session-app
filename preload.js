// Ocultar process y propiedades de Electron para evitar detección
try {
  Object.defineProperty(window, "process", { value: undefined });
  // Eliminar propiedades de Electron en navigator
  delete window.require;
  delete window.module;
  delete window.exports;
  // Ocultar electron en navigator.userAgentData si existe
  if (navigator.userAgentData && navigator.userAgentData.brands) {
    Object.defineProperty(navigator.userAgentData, "brands", {
      value: [
        { brand: "Chromium", version: "124" },
        { brand: "Google Chrome", version: "124" },
      ],
    });
  }
  // Eliminar propiedades sospechosas de navigator
  delete navigator.__proto__.webdriver;
  delete navigator.__proto__.languages;
  // Simular Chrome
  Object.defineProperty(navigator, "platform", { get: () => "Win32" });
  Object.defineProperty(navigator, "productSub", { get: () => "20030107" });
  Object.defineProperty(navigator, "vendor", { get: () => "Google Inc." });
  Object.defineProperty(navigator, "oscpu", { get: () => undefined });
} catch (e) {}
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
  onSessionChanged: (cb) =>
    ipcRenderer.on("session-changed", (e, id) => cb(id)),
});
