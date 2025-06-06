let sessions = [];

async function renderSessions() {
  sessions = await window.electronAPI.getSessions();
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";

  sessions.forEach((s) => {
    const tabItem = document.createElement("div");
    tabItem.className = "tab-item"; // 💡 para estilos en CSS

    const tabBtn = document.createElement("button");
    tabBtn.className = "tab-button";
    tabBtn.textContent = s.name;
    tabBtn.onclick = () => window.electronAPI.openSession(s.id);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "tab-delete";
    deleteBtn.textContent = "❌";
    deleteBtn.onclick = () => {
      if (confirm(`¿Eliminar sesión "${s.name}"?`)) {
        window.electronAPI.deleteSession(s.id);
        setTimeout(() => {
          renderSessions();
        }, 300);
      }
    };

    tabItem.appendChild(tabBtn);
    tabItem.appendChild(deleteBtn);
    tabs.appendChild(tabItem);
  });

  if (sessions.length > 0) {
    window.electronAPI.openSession(sessions[0].id);
  }
}

// 🔐 AppLock
function unlock() {
  const pin = document.getElementById("pin").value;
  window.electronAPI.unlockAttempt(pin);
}

window.electronAPI.onUnlockResult((success) => {
  if (success) {
    document.getElementById("main-app").style.display = "flex";
    document.getElementById("lock-screen").style.display = "none";
    renderSessions(); // cargar las pestañas
  } else {
    document.getElementById("error").textContent = "PIN incorrecto";
  }
});

// Carga inicial al abrir la app
renderSessions();
