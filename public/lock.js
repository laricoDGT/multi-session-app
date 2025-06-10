window.addEventListener("DOMContentLoaded", () => {
  const pinInput = document.getElementById("pin");
  const unlockBtn = document.getElementById("unlock-btn");
  const errorText = document.getElementById("error");

  function unlock() {
    const pin = pinInput?.value?.trim();
    if (!pin) {
      errorText.textContent = "Ingresa un PIN";
      return;
    }
    window.electronAPI.unlockAttempt(pin);
  }

  unlockBtn?.addEventListener("click", unlock);
  pinInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") unlock();
  });

  window.electronAPI.onUnlockResult((success) => {
    if (success) {
      // Redirigir al main app
      window.location = "index.html";
    } else {
      errorText.textContent = "PIN incorrecto";
      pinInput.value = "";
    }
  });
});
