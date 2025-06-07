let sessions = [];

// 🔐 AppLock
function unlock() {
  const pin = document.getElementById("pin").value;
  window.electronAPI.unlockAttempt(pin);
}

window.electronAPI.onUnlockResult((success) => {
  if (success) {
    document.getElementById("main-app").style.display = "flex";
    document.getElementById("lock-screen").style.display = "none";
  } else {
    document.getElementById("error").textContent = "PIN incorrecto";
  }
});
