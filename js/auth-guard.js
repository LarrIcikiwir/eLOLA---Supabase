import { supabase } from "./supabase-config.js";

export async function checkAuth(allowedRoles = []) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.replace("/index.html");
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    window.location.replace("/index.html");
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.peran)) {
    alert("Akses dibatasi untuk peran Anda.");
    if (profile.peran === "warga") window.location.replace("/warga/setoran.html");
    else if (profile.peran === "petugas") window.location.replace("/petugas/verifikasi.html");
    else if (profile.peran === "admin") window.location.replace("/admin/dashboard.html");
    return null;
  }

  return { user, profile };
}

export async function logoutUser() {
  await supabase.auth.signOut();
  window.location.replace("/index.html");
}
