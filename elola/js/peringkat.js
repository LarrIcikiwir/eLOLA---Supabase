import { supabase } from "./supabase-config.js";

async function loadLeaderboard() {
  const { data: rtList } = await supabase.from("master_rt").select("*");
  const { data: profiles } = await supabase.from("profiles").select("kelurahan, rt, saldo_poin, total_kg");

  if (!rtList) return;

  const aggregated = rtList.map(rt => {
    const wargaRT = profiles?.filter(p => p.kelurahan === rt.kelurahan && p.rt === rt.rt) || [];
    const totalPoin = wargaRT.reduce((sum, item) => sum + (item.saldo_poin || 0), 0);
    const totalKg = wargaRT.reduce((sum, item) => sum + Number(item.total_kg || 0), 0);
    const skor = rt.jumlah_kk ? Math.round(totalPoin / rt.jumlah_kk) : 0;
    return { ...rt, totalPoin, totalKg, skor };
  });

  aggregated.sort((a, b) => b.skor - a.skor);

  const container = document.getElementById("podium-list");
  container.innerHTML = aggregated.map((item, idx) => {
    const medals = ["🥇", "🥈", "🥉"];
    const medal = idx < 3 ? medals[idx] : `#${idx + 1}`;
    const bg = idx === 0 ? "background: #f0fdf4;" : "";
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border); ${bg}">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:1.2rem; font-weight:700;">${medal}</span>
          <div>
            <div style="font-weight:700;">${item.rt} ${item.kelurahan}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${item.totalKg.toFixed(1)} Kg | ${item.jumlah_kk} KK</div>
          </div>
        </div>
        <div style="font-size:1.1rem; font-weight:700; color:var(--primary-dark);">${item.skor} Pts/KK</div>
      </div>
    `;
  }).join("");
}

loadLeaderboard();