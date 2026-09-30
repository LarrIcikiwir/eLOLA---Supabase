import { checkAuth, logoutUser } from "./auth-guard.js";
import { supabase } from "./supabase-config.js";
import { showToast, formatTanggal } from "./utils.js";

document.getElementById("btn-logout").onclick = logoutUser;

let userCtx = null;

async function init() {
  userCtx = await checkAuth(["petugas", "admin"]);
  if (!userCtx) return;

  loadAntrean();

  // Supabase Realtime update antrean
  supabase
    .channel("public:antrean_verif")
    .on("postgres_changes", { event: "*", schema: "public", table: "transaksi_setoran" }, () => {
      loadAntrean();
    })
    .subscribe();
}

async function loadAntrean() {
  const { data, error } = await supabase
    .from("transaksi_setoran")
    .select("*, profiles!transaksi_setoran_user_id_fkey(nama, kelurahan, rt, is_asn, instansi), kategori_sampah(nama, bobot_poin_per_kg)")
    .eq("status", "menunggu")
    .order("created_at", { ascending: true });

  const container = document.getElementById("antrean-list");
  if (!data || data.length === 0) {
    container.innerHTML = "<p style='color: var(--text-muted); font-size: 0.9rem;'>Tidak ada antrean setoran saat ini.</p>";
    return;
  }

  container.innerHTML = data.map(s => `
    <div class="card" style="border: 1px solid var(--border); margin-bottom: 12px; padding: 12px;">
      <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
        <strong>${s.profiles?.nama} (${s.profiles?.kelurahan} - ${s.profiles?.rt})</strong>
        <span style="font-size:0.8rem; color:var(--text-muted);">${formatTanggal(s.created_at)}</span>
      </div>
      <div style="display:flex; gap: 12px; margin-bottom: 10px;">
        <img src="${s.foto_url}" style="width: 100px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border);">
        <div style="font-size: 0.85rem; line-height: 1.5;">
          <div>Kategori: <b>${s.kategori_sampah?.nama}</b></div>
          <div>Estimasi: ${s.estimasi_kg} kg</div>
          <div>Status: ${s.profiles?.is_asn ? `ASN (${s.profiles?.instansi})` : 'Warga'}</div>
        </div>
      </div>
      <div style="display:flex; gap: 8px;">
        <input type="number" step="0.1" id="berat-${s.id}" placeholder="Berat Aktual (Kg)" style="width: 160px;">
        <button class="btn btn-primary btn-verif" data-id="${s.id}">Konfirmasi</button>
        <button class="btn btn-danger btn-tolak" data-id="${s.id}">Tolak</button>
      </div>
    </div>
  `).join("");

  bindActions();
}

function bindActions() {
  document.querySelectorAll(".btn-verif").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-id");
      const berat = parseFloat(document.getElementById(`berat-${id}`).value);
      if (!berat || berat <= 0) return alert("Masukkan berat timbangan yang valid!");

      btn.disabled = true; btn.innerText = "Memproses...";
      // Panggil fungsi RPC SQL Supabase (Atomic ACID)
      const { error } = await supabase.rpc("verifikasi_setoran", {
        p_setoran_id: id,
        p_petugas_id: userCtx.user.id,
        p_berat_aktual: berat
      });

      if (error) {
        showToast(error.message, "error");
        btn.disabled = false; btn.innerText = "Konfirmasi";
      } else {
        showToast("Setoran terverifikasi!");
      }
    };
  });

  document.querySelectorAll(".btn-tolak").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-id");
      const alasan = prompt("Masukkan alasan penolakan:");
      if (!alasan) return;

      const { error } = await supabase
        .from("transaksi_setoran")
        .update({ status: "ditolak", alasan_tolak: alasan, petugas_id: userCtx.user.id })
        .eq("id", id);

      if (error) showToast(error.message, "error");
      else showToast("Setoran ditolak.");
    };
  });
}

init();