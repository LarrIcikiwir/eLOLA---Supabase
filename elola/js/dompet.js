import { checkAuth, logoutUser } from "./auth-guard.js";
import { supabase } from "./supabase-config.js";
import { formatRupiah, formatTanggal, showToast } from "./utils.js";

document.getElementById("btn-logout").onclick = logoutUser;

let userCtx = null;

async function init() {
  userCtx = await checkAuth(["warga"]);
  if (!userCtx) return;

  loadData();

  // Listener update saldo profile & mutasi
  supabase
    .channel("public:profiles_dompet")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userCtx.user.id}` }, () => {
      loadData();
    })
    .subscribe();
}

async function loadData() {
  // 1. Ambil Profil & Saldo Terkini
  const { data: profile } = await supabase.from("profiles").select("saldo_poin").eq("id", userCtx.user.id).single();
  const saldo = profile?.saldo_poin || 0;
  document.getElementById("saldo-poin").innerText = `${saldo} Pts`;
  document.getElementById("saldo-rupiah").innerText = `Setara ${formatRupiah(saldo * 10)}`;

  // 2. Ambil Riwayat Poin
  const { data: riwayat } = await supabase.from("riwayat_poin").select("*").eq("user_id", userCtx.user.id).order("created_at", { ascending: false });
  const rContainer = document.getElementById("riwayat-list");
  if (!riwayat || riwayat.length === 0) {
    rContainer.innerHTML = "<p style='color:var(--text-muted); font-size:0.9rem;'>Belum ada aktivitas poin.</p>";
  } else {
    rContainer.innerHTML = riwayat.map(r => `
      <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border); font-size:0.88rem;">
        <div>
          <div><b>${r.jenis === 'masuk' ? 'Poin Masuk (' + r.sumber + ')' : 'Tukar Reward'}</b></div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${formatTanggal(r.created_at)}</div>
        </div>
        <div style="font-weight:700; color:${r.jenis === 'masuk' ? 'var(--primary-dark)' : 'var(--danger)'};">
          ${r.jenis === 'masuk' ? '+' : '-'}${r.jumlah} Pts
        </div>
      </div>
    `).join("");
  }

  // 3. Ambil Katalog Reward
  const { data: rewards } = await supabase.from("poin_reward").select("*").eq("aktif", true);
  const wContainer = document.getElementById("reward-list");
  wContainer.innerHTML = rewards.map(rw => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
      <div>
        <div><b>${rw.nama}</b></div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${rw.harga_poin} Poin (Stok: ${rw.stok})</div>
      </div>
      <button class="btn btn-primary btn-tukar" data-id="${rw.id}">Tukar</button>
    </div>
  `).join("");

  document.querySelectorAll(".btn-tukar").forEach(b => {
    b.onclick = async () => {
      const rId = b.getAttribute("data-id");
      if (!confirm("Tukar poin Anda untuk hadiah ini?")) return;
      
      const { error } = await supabase.rpc("klaim_reward", {
        p_user_id: userCtx.user.id,
        p_reward_id: rId
      });

      if (error) showToast(error.message, "error");
      else {
        showToast("Hadiah berhasil ditukar!");
        loadData();
      }
    };
  });
}

init();