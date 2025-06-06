const {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  Menu,
  dialog,
} = require("electron");
const path = require("path");
const fs = require("fs");
const {
  saveSessionConfig,
  loadSessions,
  loadSettings,
  saveSettings,
  deleteSession,
} = require("./sessions");

let mainWin;
let views = {};
let currentViewId = null;
let lockTimer;
let appMenu;

const VIEW_TOP_OFFSET = 22;

const WINDOW_STATE_FILE = path.join(
  app.getPath("userData"),
  "window-state.json"
);

function getSavedWindowBounds() {
  if (fs.existsSync(WINDOW_STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(WINDOW_STATE_FILE));
    } catch {
      return null;
    }
  }
  return null;
}

function saveWindowBounds() {
  if (mainWin) {
    const bounds = mainWin.getBounds();
    fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(bounds));
  }
}

function createWindow(file = "lock.html") {
  const savedBounds = getSavedWindowBounds();

  mainWin = new BrowserWindow({
    width: savedBounds?.width || 1400,
    height: savedBounds?.height || 900,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    fullscreenable: true,
    frame: true,
    useContentSize: false,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWin.loadFile(path.join(__dirname, "public", file));

  mainWin.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape" && mainWin.isFullScreen()) {
      mainWin.setFullScreen(false);
      event.preventDefault();
    }
  });

  mainWin.on("close", saveWindowBounds);
  mainWin.on("resize", resizeCurrentView);
}

function resizeCurrentView() {
  if (currentViewId && views[currentViewId]) {
    const bounds = mainWin.getBounds();
    views[currentViewId].setBounds({
      x: 0,
      y: VIEW_TOP_OFFSET,
      width: bounds.width,
      height: bounds.height - VIEW_TOP_OFFSET,
    });
  }
}

function showSessionInView(session) {
  if (!views[session.id]) {
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    view.webContents.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    view.webContents.loadURL(session.url);
    views[session.id] = view;
  }

  if (currentViewId && views[currentViewId]) {
    mainWin.removeBrowserView(views[currentViewId]);
  }

  currentViewId = session.id;
  mainWin.setBrowserView(views[session.id]);
  resizeCurrentView();

  views[session.id].setAutoResize({ width: true, height: true });
}

function removeCurrentView() {
  if (currentViewId && views[currentViewId]) {
    mainWin.removeBrowserView(views[currentViewId]);
    currentViewId = null;
  }
}

function resetLockTimer() {
  const settings = loadSettings();
  const delay = (settings.autoLockMinutes || 5) * 60 * 1000;

  if (lockTimer) clearTimeout(lockTimer);
  lockTimer = setTimeout(() => {
    if (mainWin) {
      removeCurrentView();
      mainWin.loadFile(path.join(__dirname, "public", "lock.html"));
      buildAppMenu(true);
    }
  }, delay);
}

function createChildWindow(fileName, width = 500, height = 600) {
  const child = new BrowserWindow({
    parent: mainWin,
    modal: true,
    width,
    height,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  child.loadFile(path.join(__dirname, "public", fileName));
}

function buildAppMenu(isLocked = true) {
  const template = [
    {
      label: "MultiSession",
      submenu: [
        {
          label: "Acerca de",
          click: () => {
            dialog.showMessageBox({
              type: "info",
              title: "Acerca de",
              message: "MultiSession App v1.0\nCreado con Electron",
              buttons: ["Cerrar"],
            });
          },
        },
        { type: "separator" },
        {
          label: "Ajustes de seguridad",
          id: "settings",
          enabled: !isLocked,
          click: () => createChildWindow("settings.html"),
        },
        {
          label: "Nueva sesión",
          id: "newsession",
          enabled: !isLocked,
          click: () => createChildWindow("session-form.html"),
        },
        {
          label: "Pantalla completa",
          click: () => {
            const isFull = mainWin.isFullScreen();
            mainWin.setFullScreen(!isFull);
          },
        },
        { type: "separator" },
        {
          label: "Salir",
          role: "quit",
        },
      ],
    },
  ];

  appMenu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(appMenu);
}

// 🟢 App lista
app.whenReady().then(() => {
  createWindow("lock.html");
  buildAppMenu(true);
});

// 🔓 Desbloqueo con PIN
ipcMain.on("unlock-attempt", (event, pin) => {
  const settings = loadSettings();
  const success = pin === settings.pin;
  event.reply("unlock-result", success);
  if (success) {
    mainWin.loadFile(path.join(__dirname, "public", "index.html"));
    buildAppMenu(false);
    resetLockTimer();
  }
});

// 📦 Sesiones
ipcMain.on("open-session", (event, sessionId) => {
  const session = loadSessions().find((s) => s.id === sessionId);
  if (session) showSessionInView(session);
  resetLockTimer();
});

ipcMain.on("add-session", (event, sessionData) => {
  saveSessionConfig(sessionData);
  resetLockTimer();
});

ipcMain.on("delete-session", (event, id) => {
  deleteSession(id);
  resetLockTimer();
});

ipcMain.handle("get-sessions", () => loadSessions());
ipcMain.handle("get-settings", () => loadSettings());

ipcMain.on("save-settings", (event, data) => {
  saveSettings(data);
  resetLockTimer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
