export function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number);
}

export function formatTanggal(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

export function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 9999;";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.innerText = message;
  toast.style.cssText = `background: ${type === "error" ? "#b3261e" : "#284d32"}; color: #fff; padding: 10px 16px; border-radius: 8px; margin-top: 8px; font-size: 0.88rem; box-shadow: 0 4px 10px rgba(0,0,0,0.15);`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
