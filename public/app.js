let sessions = [];
let firstUnlock = true;
let lastActiveSessionId = null;

window.addEventListener("DOMContentLoaded", () => {
  const mainApp = document.getElementById("main-app");

  // Al cargar index.html, abrir la primera sesión solo si es el primer unlock
  window.electronAPI.getSessions().then((sessions) => {
    if (sessions && sessions.length > 0) {
      // Recuperar la última sesión activa de localStorage
      let lastId = null;
      try {
        lastId = localStorage.getItem("lastActiveSessionId");
      } catch {}
      if (firstUnlock) {
        window.electronAPI.openSession(sessions[0].id);
        lastActiveSessionId = sessions[0].id;
        firstUnlock = false;
      } else if (lastId && sessions.some((s) => s.id === lastId)) {
        window.electronAPI.openSession(lastId);
        lastActiveSessionId = lastId;
      } else if (lastActiveSessionId) {
        window.electronAPI.openSession(lastActiveSessionId);
      }
    }
  });

  // Aquí puedes agregar lógica específica para la app principal
});

// Escuchar cuando se cambia de sesión y guardar el id
window.electronAPI?.onSessionChanged?.((sessionId) => {
  lastActiveSessionId = sessionId;
  try {
    localStorage.setItem("lastActiveSessionId", sessionId);
  } catch {}
});
