const { BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const { app } = require("electron");
const storageFile = path.join(app.getPath("userData"), "storage.json");

function getStorage() {
  if (!fs.existsSync(storageFile)) {
    const defaultData = {
      sessions: [
        {
          id: "fb",
          name: "Facebook",
          url: "https://facebook.com",
          partition: "persist:fb",
        },
        {
          id: "x",
          name: "X (Twitter)",
          url: "https://twitter.com",
          partition: "persist:x",
        },
        {
          id: "ig",
          name: "Instagram",
          url: "https://instagram.com",
          partition: "persist:ig",
        },
        {
          id: "wa",
          name: "WhatsApp",
          url: "https://web.whatsapp.com",
          partition: "persist:wa",
        },
        {
          id: "tg",
          name: "Telegram",
          url: "https://web.telegram.org",
          partition: "persist:tg",
        },
      ],
      settings: {
        pin: "1234",
        autoLockMinutes: 5,
      },
    };
    fs.writeFileSync(storageFile, JSON.stringify(defaultData, null, 2));
  }
  return JSON.parse(fs.readFileSync(storageFile));
}

function saveStorage(data) {
  fs.writeFileSync(storageFile, JSON.stringify(data, null, 2));
}

function loadSessions() {
  return getStorage().sessions || [];
}

function saveSessionConfig(data) {
  const storage = getStorage();
  const existingIndex = storage.sessions.findIndex((s) => s.id === data.id);

  if (existingIndex !== -1) {
    storage.sessions[existingIndex] = data; // Editar existente
  } else {
    storage.sessions.push(data); // Agregar nuevo
  }

  saveStorage(storage);
}

function deleteSession(id) {
  const storage = getStorage();
  storage.sessions = storage.sessions.filter((s) => s.id !== id);
  saveStorage(storage);
}

function loadSettings() {
  return getStorage().settings || { pin: "1234", autoLockMinutes: 5 };
}

function saveSettings(newSettings) {
  const storage = getStorage();
  storage.settings = newSettings;
  saveStorage(storage);
}

function openSessionWindow(id) {
  const session = loadSessions().find((s) => s.id === id);
  if (!session) return;

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      partition: session.partition,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(session.url);
}

module.exports = {
  openSessionWindow,
  saveSessionConfig,
  loadSessions,
  loadSettings,
  saveSettings,
  deleteSession,
};
