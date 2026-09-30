import { checkAuth, logoutUser } from "./auth-guard.js";
import { supabase } from "./supabase-config.js";
import { showToast, formatTanggal } from "./utils.js";

document.getElementById("btn-logout").onclick = logoutUser;

let userCtx = null;
let kategoriMap = {};

async function init() {
  userCtx = await checkAuth(["warga"]);
  if (!userCtx) return;

  const { data: katData } = await supabase.from("kategori_sampah").select("*").eq("aktif", true);
  const select = document.getElementById("kategori-select");
  select.innerHTML = '<option value="">-- Pilih Kategori --</option>';
  katData?.forEach(k => {
    kategoriMap[k.id] = k;
    select.innerHTML += `<option value="${k.id}">${k.nama} (${k.bobot_poin_per_kg} Poin/kg)</option>`;
  });

  document.getElementById("estimasi-kg").oninput = calcEstimasi;
  select.onchange = calcEstimasi;

  loadRiwayatSetoran();

  // Supabase Realtime Listener untuk transaksi_setoran
  supabase
    .channel("public:transaksi_setoran")
    .on("postgres_changes", { event: "*", schema: "public", table: "transaksi_setoran" }, () => {
      loadRiwayatSetoran();
    })
    .subscribe();
}

function calcEstimasi() {
  const kat = kategoriMap[document.getElementById("kategori-select").value];
  const kg = parseFloat(document.getElementById("estimasi-kg").value) || 0;
  if (kat && kg > 0) {
    document.getElementById("est-poin-box").innerText = `Estimasi Poin: ~${Math.round(kg * kat.bobot_poin_per_kg)} Pts`;
  } else {
    document.getElementById("est-poin-box").innerText = "";
  }
}

async function loadRiwayatSetoran() {
  const { data, error } = await supabase
    .from("transaksi_setoran")
    .select("*, kategori_sampah(nama)")
    .eq("user_id", userCtx.user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const container = document.getElementById("list-setoran");
  if (!data || data.length === 0) {
    container.innerHTML = "<p style='color: var(--text-muted); font-size: 0.9rem;'>Belum ada setoran.</p>";
    return;
  }

  container.innerHTML = data.map(s => `
    <div style="padding: 10px 0; border-bottom: 1px solid var(--border);">
      <div style="display: flex; justify-content: space-between;">
        <strong>${s.kategori_sampah?.nama || s.kategori_id}</strong>
        <span class="badge badge-${s.status}">${s.status.toUpperCase()}</span>
      </div>
      <div style="color: var(--text-muted); font-size: 0.8rem; margin: 4px 0;">${formatTanggal(s.created_at)} | Estimasi: ${s.estimasi_kg} kg</div>
      ${s.status === 'terverifikasi' ? `<div style="color: var(--primary-dark); font-weight: 600; font-size: 0.85rem;">Aktual: ${s.berat_aktual_kg} kg (+${s.poin} Poin)</div>` : ''}
      ${s.status === 'ditolak' ? `<div style="color: var(--danger); font-size: 0.8rem;">Ditolak: ${s.alasan_tolak}</div>` : ''}
    </div>
  `).join("");
}

document.getElementById("form-setor").onsubmit = async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btn-submit");
  btn.disabled = true; btn.innerText = "Mengunggah...";

  try {
    const file = document.getElementById("foto-sampah").files[0];
    const katId = document.getElementById("kategori-select").value;
    const estKg = parseFloat(document.getElementById("estimasi-kg").value);

    // Upload ke Supabase Storage (Bucket: bukti-sampah)
    const ext = file.name.split('.').pop();
    const filePath = `${userCtx.user.id}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("bukti-sampah").upload(filePath, file);
    if (upErr) throw upErr;

    const { data: urlData } = supabase.storage.from("bukti-sampah").getPublicUrl(filePath);

    const { error: insErr } = await supabase.from("transaksi_setoran").insert([{
      user_id: userCtx.user.id,
      kategori_id: katId,
      estimasi_kg: estKg,
      foto_url: urlData.publicUrl,
      status: "menunggu"
    }]);

    if (insErr) throw insErr;

    showToast("Setoran berhasil dikirim!");
    document.getElementById("form-setor").reset();
    document.getElementById("est-poin-box").innerText = "";
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false; btn.innerText = "Kirim Setoran";
  }
};

init();