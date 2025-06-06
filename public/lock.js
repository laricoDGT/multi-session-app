const pinInput = document.getElementById("pin");
const errorDiv = document.getElementById("error");

function unlock() {
  window.electronAPI.unlockAttempt(pinInput.value);
}

window.electronAPI.onUnlockResult((success) => {
  if (!success) {
    errorDiv.textContent = "PIN incorrecto";
    pinInput.value = "";
  }
});
