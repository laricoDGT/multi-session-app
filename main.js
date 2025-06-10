const {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  Menu,
  dialog,
  Tray,
} = require("electron");

const path = require("path");
const fs = require("fs");

const AutoLaunch = require("auto-launch");

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
let tray = null;
let isQuitting = false;

const autoLauncher = new AutoLaunch({
  name: "MultiSession",
});

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
    height: savedBounds?.height || 1000,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    fullscreenable: true,
    frame: true,
    useContentSize: true,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextMenu: true, // Habilitar menú contextual nativo
    },
  });

  mainWin.loadFile(path.join(__dirname, "public", file));

  mainWin.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape" && mainWin.isFullScreen()) {
      mainWin.setFullScreen(false);
      event.preventDefault();
    }
  });

  // Habilitar menú contextual nativo en BrowserWindow
  mainWin.webContents.on("context-menu", (event, params) => {
    event.preventDefault();
    Menu.buildFromTemplate([
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { type: "separator" },
      { role: "selectAll" },
      { type: "separator" },
      { role: "reload" },
    ]).popup({ window: mainWin });
  });

  mainWin.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault(); // Solo bloquea si NO es una salida real
      mainWin.hide();
      saveWindowBounds();
    }
  });
  mainWin.on("resize", resizeCurrentView);
}

function resizeCurrentView() {
  if (currentViewId && views[currentViewId]) {
    // Usar getContentBounds para asegurar que el BrowserView ocupe el área de contenido
    const bounds = mainWin.getContentBounds();
    views[currentViewId].setBounds({
      x: 0,
      y: 0,
      width: bounds.width,
      height: bounds.height,
    });
  }
}

function showSessionInView(session) {
  if (!views[session.id]) {
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: session.partition || undefined,
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

  const { shell } = require("electron");

  // Habilitar menú contextual en BrowserView
  views[session.id].webContents.on("context-menu", (event, params) => {
    const menuTemplate = [];

    if (params.linkURL) {
      menuTemplate.push({
        label: "Abrir enlace en navegador",
        click: () => {
          shell.openExternal(params.linkURL);
        },
      });
      menuTemplate.push({ type: "separator" });
    }

    menuTemplate.push(
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { type: "separator" },
      { role: "selectAll" },
      { type: "separator" },
      { role: "reload" }
    );

    Menu.buildFromTemplate(menuTemplate).popup({ window: mainWin });
  });

  // Si se muestra una sesión, asegurarse de que no esté la vista de preferencias
  if (mainWin.webContents.getURL().endsWith("preferences.html")) {
    mainWin.loadFile(path.join(__dirname, "public", "index.html"));
  }
  buildAppMenu(false); // Refresca el menú para mostrar el activo
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
    if (mainWin && !mainWin.isFocused()) {
      // Solo bloquear si la ventana NO está activa
      removeCurrentView();
      mainWin.loadFile(path.join(__dirname, "public", "lock.html"));
      buildAppMenu(true);
    } else {
      // Si la ventana está activa, reintentar después de un pequeño intervalo
      resetLockTimer();
    }
  }, delay);
}

// Pausar el temporizador cuando la ventana está activa, reanudar cuando pierde foco
function setupLockTimerFocusHandlers() {
  if (!mainWin) return;
  mainWin.on("focus", () => {
    if (lockTimer) clearTimeout(lockTimer);
  });
  mainWin.on("blur", () => {
    resetLockTimer();
  });
}

function showPreferencesInMain() {
  // Quitar cualquier BrowserView para que la vista de preferencias quede al frente
  removeCurrentView();
  currentViewId = null;
  mainWin.loadFile(path.join(__dirname, "public", "preferences.html"));
  buildAppMenu(false);
}

function buildAppMenu(isLocked = true) {
  const sessions = loadSessions();
  const sessionTabsMenus = sessions.map((s) => ({
    label: s.name + (currentViewId === s.id ? " ●" : ""),
    enabled: !isLocked,
    type: "normal",
    click: () => {
      if (!isLocked) {
        showSessionInView(s);
        buildAppMenu(false);
      }
    },
    visible: true,
    icon: isLocked ? path.join(__dirname, "icon.png") : undefined,
  }));

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
              message:
                "MultiSession App v1.0\nCreado con Electron \n por Chris Larico <chris@larico.dev> \n https://larico.dev",
              buttons: ["Cerrar"],
            });
          },
        },
        { type: "separator" },
        {
          label: "Preferencias",
          id: "preferences",
          enabled: !isLocked,
          click: () => {
            if (!isLocked) showPreferencesInMain();
          },
        },
        {
          label: "Bloquear ahora",
          click: () => {
            removeCurrentView();
            if (mainWin) {
              mainWin.loadFile(path.join(__dirname, "public", "lock.html"));
            }
            buildAppMenu(true);
          },
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
    ...sessionTabsMenus,
  ];

  appMenu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(appMenu);
}

function createTray() {
  tray = new Tray(path.join(__dirname, "icon.png"));
  tray.setToolTip("MultiSession App");

  // Menú contextual (click derecho)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Mostrar ventana",
      click: () => {
        if (mainWin) {
          mainWin.show();
          mainWin.focus();
        }
      },
    },
    {
      label: "Ocultar ventana",
      click: () => {
        if (mainWin) {
          mainWin.hide();
        }
      },
    },
    {
      type: "separator",
    },
    {
      label: "Salir por completo",
      click: () => {
        isQuitting = true;
        tray.destroy();
        tray = null;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Click izquierdo: toggle visibilidad
  tray.on("click", () => {
    if (!mainWin) return;
    if (mainWin.isVisible()) {
      mainWin.hide();
    } else {
      mainWin.show();
      mainWin.focus();
    }
  });

  // Opcional: ignorar doble clic (no hace nada)
  tray.on("double-click", (e) => {
    // No hace nada para evitar duplicación de comportamiento
  });
}

app.whenReady().then(() => {
  createWindow("lock.html");
  buildAppMenu(true);
  createTray();
  setupLockTimerFocusHandlers();
});

ipcMain.handle("get-auto-launch", async () => {
  return await autoLauncher.isEnabled();
});

ipcMain.on("set-auto-launch", (event, enabled) => {
  if (enabled) {
    autoLauncher.enable();
  } else {
    autoLauncher.disable();
  }
});

ipcMain.on("unlock-attempt", (event, pin) => {
  const settings = loadSettings();
  const success = pin === settings.pin;
  event.reply("unlock-result", success);
  if (success) {
    mainWin.loadFile(path.join(__dirname, "public", "index.html"));
    // Mostrar la primera sesión automáticamente
    const sessions = loadSessions();
    if (sessions.length > 0) {
      showSessionInView(sessions[0]);
    }
    buildAppMenu(false);
    resetLockTimer();
  }
});

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

ipcMain.on("save-sessions-order", (event, sessionsArr) => {
  // sessionsArr es un array de objetos sesión ordenados
  const storage = require("./sessions").getStorage();
  // Solo guardar los campos válidos (id, name, url, partition)
  storage.sessions = sessionsArr.map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    partition: s.partition,
  }));
  require("./sessions").saveStorage(storage);
});

ipcMain.on("refresh-menu", () => {
  buildAppMenu(false);
});

ipcMain.handle("get-sessions", () => loadSessions());
ipcMain.handle("get-settings", () => loadSettings());

ipcMain.on("save-settings", (event, data) => {
  saveSettings(data);
  resetLockTimer();
});

ipcMain.on("lock-app", () => {
  if (mainWin) {
    mainWin.webContents.send("lock");
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
