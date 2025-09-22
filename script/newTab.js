document.addEventListener("DOMContentLoaded", () => {
  setInterval(() => {
    document.getElementById('date').innerText = new Date().toLocaleTimeString()
  }, 1000);
}
)
