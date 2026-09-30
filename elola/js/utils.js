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
  toast.className = `toast ${type === "error" ? "toast-error" : ""}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}