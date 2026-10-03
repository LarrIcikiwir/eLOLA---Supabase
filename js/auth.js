import { supabase } from "./supabase-config.js";

const $ = (id) => document.getElementById(id);
let petugas = false;
let masuk = true;

function segarkan() {
  if (petugas) masuk = true;
  $("pWarga").classList.toggle("aktif", !petugas);
  $("pPetugas").classList.toggle("aktif", petugas);
  $("tDaftar").classList.toggle("hidden", petugas);
  $("tMasuk").classList.toggle("aktif", masuk);
  $("tDaftar").classList.toggle("aktif", !masuk);
  $("fMasuk").classList.toggle("hidden", !masuk);
  $("fDaftar").classList.toggle("hidden", masuk);

  $("lblIdMasuk").textContent = petugas ? "ID Petugas / Admin" : "Nama Lengkap";
  $("idMasuk").placeholder = petugas ? "Contoh: PTG-001 atau ADM-001" : "Masukkan nama Anda";
  $("bantuan").textContent = petugas
    ? "Akun petugas dan admin dibuat lewat panel Supabase."
    : "Lupa kata sandi? Hubungi admin bank sampah kelurahan Anda.";
}

$("pWarga").onclick = () => { petugas = false; segarkan(); };
$("pPetugas").onclick = () => { petugas = true; segarkan(); };
$("tMasuk").onclick = () => { masuk = true; segarkan(); };
$("tDaftar").onclick = () => { masuk = false; segarkan(); };

document.querySelectorAll(".lihat").forEach(b => {
  b.onclick = () => {
    const k = $(b.dataset.t);
    const buka = k.type === "password";
    k.type = buka ? "text" : "password";
    b.classList.toggle("tampil", buka);
  };
});

const pesan = (id, teks, ok = false) => {
  $(id).textContent = teks;
  $(id).classList.toggle("ok", ok);
};

const toEmail = (str) => `${str.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}@elola.local`;

$("fMasuk").onsubmit = async (e) => {
  e.preventDefault();
  const idInput = $("idMasuk").value.trim();
  const sandi = $("sMasuk").value;

  if (!idInput) return pesan("pMasuk", "Harap isi nama akun.");
  if (!sandi) return pesan("pMasuk", "Harap isi kata sandi.");

  const btn = $("btnMasuk");
  btn.disabled = true; btn.textContent = "Memeriksa...";
  pesan("pMasuk", "");

  try {
    const email = toEmail(idInput);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: sandi });
    if (error) throw new Error("Nama atau kata sandi tidak cocok.");

    const { data: profile } = await supabase.from("profiles").select("peran").eq("id", data.user.id).single();
    pesan("pMasuk", "Berhasil masuk! Mengalihkan...", true);

    setTimeout(() => {
      if (profile?.peran === "petugas") window.location.href = "petugas/verifikasi.html";
      else if (profile?.peran === "admin") window.location.href = "admin/dashboard.html";
      else window.location.href = "warga/setoran.html";
    }, 400);
  } catch (err) {
    pesan("pMasuk", err.message);
    btn.disabled = false; btn.textContent = "Masuk ke eLOLA →";
  }
};

$("fDaftar").onsubmit = async (e) => {
  e.preventDefault();
  const nama = $("nama").value.trim();
  const rt = $("rt").value;
  const sandi = $("sDaftar").value;

  if (!nama) return pesan("pDaftar", "Nama lengkap wajib diisi.");
  if (!rt) return pesan("pDaftar", "Pilih nomor RT Anda.");
  if (sandi.length < 6) return pesan("pDaftar", "Kata sandi minimal 6 karakter.");

  const btn = $("btnDaftar");
  btn.disabled = true; btn.textContent = "Mendaftarkan...";
  pesan("pDaftar", "");

  try {
    const email = toEmail(nama);
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password: sandi });
    if (authErr) throw authErr;

    const { error: profErr } = await supabase.from("profiles").insert([{
      id: authData.user.id,
      nama: nama,
      peran: "warga",
      kelurahan: "Lalolara",
      rt: rt,
      unit_bank_sampah: "Unit Kelurahan",
      saldo_poin: 0,
      total_kg: 0
    }]);

    if (profErr) throw profErr;

    pesan("pDaftar", "Pendaftaran berhasil! Mengalihkan...", true);
    setTimeout(() => { window.location.href = "warga/setoran.html"; }, 500);
  } catch (err) {
    pesan("pDaftar", err.message || "Gagal membuat akun.");
    btn.disabled = false; btn.textContent = "Buat akun eLOLA →";
  }
};

segarkan();
