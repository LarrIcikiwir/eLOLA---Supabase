import { checkAuth, logoutUser } from "./auth-guard.js";
import { supabase } from "./supabase-config.js";

document.getElementById("btn-logout").onclick = logoutUser;

async function init() {
  const userCtx = await checkAuth(["admin"]);
  if (!userCtx) return;

  loadKPI();
}

async function loadKPI() {
  // Ambil semua data profil untuk agregasi langsung via relational query
  const { data: profiles } = await supabase.from("profiles").select("*");

  let totalKg = 0;
  let totalPoin = 0;
  let totalAsn = 0;
  let patuhAsn = 0;
  const instansiMap = {};

  profiles?.forEach(p => {
    totalKg += Number(p.total_kg || 0);
    totalPoin += (p.saldo_poin || 0);

    if (p.is_asn) {
      totalAsn++;
      const isPatuh = (p.total_kg || 0) >= 2.0;
      if (isPatuh) patuhAsn++;

      const inst = p.instansi || "Tidak Disebutkan";
      if (!instansiMap[inst]) instansiMap[inst] = { total: 0, patuh: 0 };
      instansiMap[inst].total++;
      if (isPatuh) instansiMap[inst].patuh++;
    }
  });

  document.getElementById("kpi-volume").innerText = `${totalKg.toFixed(1)} Kg`;
  document.getElementById("kpi-poin").innerText = `${totalPoin} Pts`;
  document.getElementById("kpi-asn").innerText = `${totalAsn} Orang`;
  const pct = totalAsn > 0 ? Math.round((patuhAsn / totalAsn) * 100) : 0;
  document.getElementById("kpi-kepatuhan").innerText = `${pct}%`;

  const container = document.getElementById("asn-list");
  const keys = Object.keys(instansiMap);
  if (keys.length === 0) {
    container.innerHTML = "<p style='color:var(--text-muted);'>Belum ada ASN terdaftar.</p>";
  } else {
    container.innerHTML = keys.map(k => {
      const row = instansiMap[k];
      const p = Math.round((row.patuh / row.total) * 100);
      return `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border); font-size:0.9rem;">
          <div><b>${k}</b> (${row.patuh}/${row.total} ASN)</div>
          <span style="font-weight:600; color:${p >= 70 ? 'var(--primary-dark)' : 'var(--danger)'};">${p}% Patuh</span>
        </div>
      `;
    }).join("");
  }
}

init();