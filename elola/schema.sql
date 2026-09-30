-- 1. Tabel Profil Pengguna
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nama TEXT NOT NULL,
  nik TEXT,
  peran TEXT CHECK (peran IN ('warga', 'petugas', 'admin')) DEFAULT 'warga',
  is_asn BOOLEAN DEFAULT FALSE,
  nip TEXT,
  instansi TEXT,
  kelurahan TEXT DEFAULT 'Lalolara',
  rt TEXT NOT NULL,
  unit_bank_sampah TEXT DEFAULT 'Unit Kelurahan',
  saldo_poin INTEGER DEFAULT 0,
  total_kg NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Master Kategori Sampah
CREATE TABLE public.kategori_sampah (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  bobot_poin_per_kg INTEGER NOT NULL,
  aktif BOOLEAN DEFAULT TRUE
);

INSERT INTO public.kategori_sampah (id, nama, bobot_poin_per_kg) VALUES
('anorganik', 'Sampah Anorganik', 20),
('organik', 'Sampah Organik', 10),
('b3', 'Sampah B3 / Elektronik', 35);

-- 3. Transaksi Setoran Sampah
CREATE TABLE public.transaksi_setoran (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  kategori_id TEXT REFERENCES public.kategori_sampah(id),
  estimasi_kg NUMERIC(6, 2) NOT NULL,
  berat_aktual_kg NUMERIC(6, 2),
  foto_url TEXT,
  status TEXT CHECK (status IN ('menunggu', 'terverifikasi', 'ditolak')) DEFAULT 'menunggu',
  alasan_tolak TEXT,
  poin INTEGER DEFAULT 0,
  petugas_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

-- 4. Buku Tabungan Mutasi Poin
CREATE TABLE public.riwayat_poin (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  jenis TEXT CHECK (jenis IN ('masuk', 'keluar')),
  jumlah INTEGER NOT NULL,
  sumber TEXT NOT NULL,
  ref_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Master Poin Reward
CREATE TABLE public.poin_reward (
  id BIGSERIAL PRIMARY KEY,
  nama TEXT NOT NULL,
  harga_poin INTEGER NOT NULL,
  stok INTEGER DEFAULT 0,
  aktif BOOLEAN DEFAULT TRUE
);

INSERT INTO public.poin_reward (nama, harga_poin, stok) VALUES
('Token Listrik Rp 20.000', 2000, 20),
('Saldo E-Wallet Rp 10.000', 1000, 50),
('Minyak Goreng 1 Liter', 1500, 15);

-- 6. Tabel Penukaran Reward
CREATE TABLE public.penukaran_poin (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id BIGINT REFERENCES public.poin_reward(id),
  poin INTEGER NOT NULL,
  status TEXT DEFAULT 'diajukan',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Master RT untuk Papan Peringkat
CREATE TABLE public.master_rt (
  id TEXT PRIMARY KEY, -- format: Lalolara_RT03
  kelurahan TEXT NOT NULL,
  rt TEXT NOT NULL,
  jumlah_kk INTEGER DEFAULT 50
);

INSERT INTO public.master_rt (id, kelurahan, rt, jumlah_kk) VALUES
('Lalolara_RT01', 'Lalolara', 'RT01', 50),
('Lalolara_RT02', 'Lalolara', 'RT02', 45),
('Lalolara_RT03', 'Lalolara', 'RT03', 48);

-- FUNGSI ATOMIK 1: Verifikasi Petugas (5 Perubahan Sekaligus)
CREATE OR REPLACE FUNCTION verifikasi_setoran(
  p_setoran_id BIGINT,
  p_petugas_id UUID,
  p_berat_aktual NUMERIC
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_kat_id TEXT;
  v_status TEXT;
  v_bobot INT;
  v_total_poin INT;
BEGIN
  SELECT user_id, kategori_id, status 
  INTO v_user_id, v_kat_id, v_status 
  FROM public.transaksi_setoran 
  WHERE id = p_setoran_id FOR UPDATE;

  IF v_status != 'menunggu' THEN
    RAISE EXCEPTION 'Setoran sudah diverifikasi atau diproses sebelumnya';
  END IF;

  SELECT bobot_poin_per_kg INTO v_bobot 
  FROM public.kategori_sampah 
  WHERE id = v_kat_id;

  v_total_poin := ROUND(p_berat_aktual * v_bobot);

  UPDATE public.transaksi_setoran
  SET status = 'terverifikasi',
      berat_aktual_kg = p_berat_aktual,
      poin = v_total_poin,
      petugas_id = p_petugas_id,
      verified_at = NOW()
  WHERE id = p_setoran_id;

  UPDATE public.profiles
  SET saldo_poin = saldo_poin + v_total_poin,
      total_kg = total_kg + p_berat_aktual
  WHERE id = v_user_id;

  INSERT INTO public.riwayat_poin(user_id, jenis, jumlah, sumber, ref_id)
  VALUES (v_user_id, 'masuk', v_total_poin, 'setoran', p_setoran_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNGSI ATOMIK 2: Penukaran Reward (Cek Saldo & Kurangi Stok)
CREATE OR REPLACE FUNCTION klaim_reward(
  p_user_id UUID,
  p_reward_id BIGINT
) RETURNS VOID AS $$
DECLARE
  v_saldo INT;
  v_harga INT;
  v_stok INT;
BEGIN
  SELECT saldo_poin INTO v_saldo FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  SELECT harga_poin, stok INTO v_harga, v_stok FROM public.poin_reward WHERE id = p_reward_id FOR UPDATE;

  IF v_stok <= 0 THEN
    RAISE EXCEPTION 'Stok hadiah sudah habis';
  END IF;

  IF v_saldo < v_harga THEN
    RAISE EXCEPTION 'Saldo poin tidak mencukupi';
  END IF;

  UPDATE public.profiles SET saldo_poin = saldo_poin - v_harga WHERE id = p_user_id;
  UPDATE public.poin_reward SET stok = stok - 1 WHERE id = p_reward_id;

  INSERT INTO public.penukaran_poin(user_id, reward_id, poin)
  VALUES (p_user_id, p_reward_id, v_harga);

  INSERT INTO public.riwayat_poin(user_id, jenis, jumlah, sumber, ref_id)
  VALUES (p_user_id, 'keluar', v_harga, 'penukaran', p_reward_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;