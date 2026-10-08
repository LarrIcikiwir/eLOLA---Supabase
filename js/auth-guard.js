import { supabase } from './supabase-config.js';

/**
 * Memeriksa sesi login dan peran user.
 * @param {Array<string>} allowedRoles - Contoh: ['admin'], ['petugas'], ['warga']
 */
export async function checkAuth(allowedRoles = []) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  // Jika belum login sama sekali, lempar ke halaman login awal
  if (sessionError || !session) {
    window.location.href = '../index.html';
    return null;
  }

  // Ambil peran dari tabel users
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, nama, email, peran, saldo_poin')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile) {
    console.error('Gagal mengambil profil:', profileError);
    window.location.href = '../index.html';
    return null;
  }

  // Jika halaman butuh peran spesifik dan user tidak cocok
  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.peran)) {
    alert('Anda tidak memiliki akses ke halaman ini!');
    
    // Alihkan ke halaman yang sesuai
    if (profile.peran === 'admin') {
      window.location.href = '../admin/dashboard.html';
    } else if (profile.peran === 'petugas') {
      window.location.href = '../petugas/verifikasi.html';
    } else {
      window.location.href = '../warga/setoran.html';
    }
    return null;
  }

  return { session, profile };
}

// Fungsi logout serbaguna
export async function logoutUser() {
  await supabase.auth.signOut();
  window.location.href = '../index.html';
}
