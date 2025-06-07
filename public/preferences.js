let sessions = [];

async function renderSessions() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";

  sessions.forEach((s, idx) => {
    const tabItem = document.createElement("div");
    tabItem.className = "tab-item";

    // Botón mover izquierda
    const moveLeft = document.createElement("button");
    moveLeft.className = "tab-move";
    moveLeft.textContent = "←";
    moveLeft.disabled = idx === 0;
    moveLeft.onclick = () => moveSession(idx, idx - 1);
    tabItem.appendChild(moveLeft);

    // Botón mover derecha
    const moveRight = document.createElement("button");
    moveRight.className = "tab-move";
    moveRight.textContent = "→";
    moveRight.disabled = idx === sessions.length - 1;
    moveRight.onclick = () => moveSession(idx, idx + 1);
    tabItem.appendChild(moveRight);

    // Botón de sesión
    const tabBtn = document.createElement("button");
    tabBtn.className = "tab-button";
    tabBtn.textContent = s.name;
    tabBtn.onclick = () => window.electronAPI.openSession(s.id);
    tabItem.appendChild(tabBtn);

    // Botón eliminar
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "tab-delete";
    deleteBtn.textContent = "❌";
    deleteBtn.onclick = () => {
      if (confirm(`¿Eliminar sesión "${s.name}"?`)) {
        window.electronAPI.deleteSession(s.id);
        setTimeout(() => reloadSessions(), 300);
      }
    };
    tabItem.appendChild(deleteBtn);

    tabs.appendChild(tabItem);
  });
}

function moveSession(from, to) {
  if (to < 0 || to >= sessions.length) return;
  const arr = [...sessions];
  const [moved] = arr.splice(from, 1);
  arr.splice(to, 0, moved);
  sessions = arr;
  renderSessions();
}

async function reloadSessions() {
  sessions = await window.electronAPI.getSessions();
  renderSessions();
}

document.getElementById("save-btn").onclick = async () => {
  await window.electronAPI.saveSessionsOrder(sessions);
  alert("Orden guardado.");
  // Actualizar menú principal automáticamente
  if (window.electronAPI.refreshMenu) {
    window.electronAPI.refreshMenu();
  } else {
    // Fallback: recargar sesiones para reflejar el orden
    reloadSessions();
  }
};

// Mostrar aviso de cambio de ventana
function showChangeWindowNotice() {
  let notice = document.getElementById("restart-notice");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "restart-notice";
    notice.style.marginTop = "16px";
    notice.style.background = "#ffe0e0";
    notice.style.color = "#a00";
    notice.style.padding = "10px";
    notice.style.borderRadius = "6px";
    notice.style.textAlign = "center";
    notice.innerHTML = `⚠️ Para seguir editando, cambia a otra ventana y vuelve a esta app. (si se bloquea los campos para escribir)`;
    document.body.appendChild(notice);
  }
}

// Cargar sesiones al iniciar
reloadSessions();

document.getElementById("session-form").onsubmit = async (e) => {
  e.preventDefault();
  const sessionData = {
    id: document.getElementById("id").value.trim(),
    name: document.getElementById("name").value.trim(),
    url: document.getElementById("url").value.trim(),
    partition: document.getElementById("partition").value.trim(),
  };
  if (
    !sessionData.id ||
    !sessionData.name ||
    !sessionData.url ||
    !sessionData.partition
  ) {
    alert("Todos los campos son obligatorios.");
    return;
  }
  await window.electronAPI.addSession(sessionData);
  await reloadSessions();
  if (window.electronAPI.refreshMenu) window.electronAPI.refreshMenu();
  document.getElementById("session-form").reset();
  showChangeWindowNotice();
};

// Ajustes de Seguridad
const settingsForm = document.getElementById("settings-form");
window.electronAPI.getSettings().then((data) => {
  document.getElementById("pin").value = data.pin;
  document.getElementById("timeout").value = data.autoLockMinutes;
});
settingsForm.onsubmit = (e) => {
  e.preventDefault();
  const newPin = document.getElementById("pin").value.trim();
  const timeout = parseInt(document.getElementById("timeout").value);
  if (newPin.length < 4) {
    alert("PIN demasiado corto. Usa al menos 4 dígitos.");
    return;
  }
  window.electronAPI.saveSettings({
    pin: newPin,
    autoLockMinutes: timeout,
  });

  const autoLaunchEnabled = document.getElementById("autolaunch").checked;
  window.electronAPI.setAutoLaunch(autoLaunchEnabled);

  alert("Ajustes guardados.");
  showChangeWindowNotice();
};

// auto launch
window.electronAPI.getAutoLaunch().then((enabled) => {
  document.getElementById("autolaunch").checked = enabled;
});
