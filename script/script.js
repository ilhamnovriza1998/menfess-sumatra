// Inisialisasi Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

// Inisialisasi Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Data untuk menyimpan jumlah kiriman per pengguna
let submissionCount = 0;
const MAX_SUBMISSIONS = 2;

// Fungsi untuk mendapatkan identifier pengguna
async function getUserIdentifier() {
  // Coba dapatkan identifier yang sudah ada
  let identifier = localStorage.getItem('userIdentifier');
  
  // Jika belum ada, buat yang baru
  if (!identifier) {
    // Generate identifier unik
    identifier = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('userIdentifier', identifier);
  }
  
  return identifier;
}

// Fungsi untuk memeriksa jumlah kiriman
async function checkSubmissionCount() {
  try {
    const userIdentifier = await getUserIdentifier();
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // Query ke Supabase untuk menghitung kiriman hari ini
    const { count, error } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_identifier', userIdentifier)
      .gte('created_at', today + 'T00:00:00Z')
      .lte('created_at', today + 'T23:59:59Z');
    
    if (error) {
      console.error('Error checking submission count:', error);
      return 0;
    }
    
    return count;
  } catch (error) {
    console.error('Error in checkSubmissionCount:', error);
    return 0;
  }
}

// Inisialisasi halaman pekanbaru
async function initPekanbaruPage() {
  // Periksa jumlah kiriman dan update UI
  submissionCount = await checkSubmissionCount();
  document.getElementById('remainingCount').textContent = MAX_SUBMISSIONS - submissionCount;
  
  // Jika sudah mencapai batas, nonaktifkan form
  if (submissionCount >= MAX_SUBMISSIONS) {
    document.getElementById('menfessForm').style.display = 'none';
    document.getElementById('errorSection').style.display = 'block';
    document.getElementById('errorMessage').textContent = 'Anda telah mencapai batas pengiriman menfess untuk hari ini (maksimal 2 kiriman).';
  }
}

function goToHome() {
  window.location.href = 'index.html';
}

function previewMenfess() {
  const menfessText = document.getElementById('menfess').value;
  const imageFile = document.getElementById('gambar').files[0];
  
  if (!menfessText) {
    alert("Isi menfess terlebih dahulu!");
    return;
  }
  
  document.getElementById('previewText').textContent = menfessText;
  
  if (imageFile) {
    // Validasi ukuran file (maksimal 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar terlalu besar! Maksimal 5MB.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('previewImage').src = e.target.result;
      document.getElementById('previewImage').style.display = 'block';
    }
    reader.readAsDataURL(imageFile);
  } else {
    document.getElementById('previewImage').style.display = 'none';
  }
  
  document.getElementById('previewSection').style.display = 'block';
}

function hidePreview() {
  document.getElementById('previewSection').style.display = 'none';
}

// Fungsi untuk mengupload gambar ke Supabase Storage
async function uploadImage(file) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `menfess-images/${fileName}`;

    const { data, error } = await supabase.storage
      .from('menfess-images')
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    // Dapatkan URL publik
    const { data: { publicUrl } } = supabase.storage
      .from('menfess-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

// Fungsi untuk memposting ke Twitter melalui backend
async function postToTwitter() {
  const menfessText = document.getElementById('menfess').value;
  const imageFile = document.getElementById('gambar').files[0];
  
  if (!menfessText) {
    alert("Isi menfess terlebih dahulu!");
    return;
  }
  
  // Sembunyikan form, tampilkan loading
  document.getElementById('menfessForm').style.display = 'none';
  document.getElementById('previewSection').style.display = 'none';
  document.getElementById('postingSection').style.display = 'block';
  
  try {
    let imageUrl = null;
    
    // Upload gambar jika ada
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
    }
    
    // Dapatkan identifier pengguna
    const userIdentifier = await getUserIdentifier();
    
    // Simpan data ke Supabase
    const { data, error } = await supabase
      .from('menfess_submissions')
      .insert([
        { 
          text: menfessText, 
          image_url: imageUrl,
          user_identifier: userIdentifier,
          city: 'Pekanbaru'
        }
      ]);
    
    if (error) {
      throw error;
    }
    
    // Juga simpan record submission untuk pembatasan
    await supabase
      .from('submissions')
      .insert([
        { 
          user_identifier: userIdentifier
        }
      ]);
    
    // Kirim ke Twitter API (harus diimplementasikan di backend)
    const response = await fetch('/api/post-to-twitter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message: menfessText,
        imageUrl: imageUrl 
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      // Tampilkan sukses
      document.getElementById('postingSection').style.display = 'none';
      document.getElementById('successSection').style.display = 'block';
    } else {
      throw new Error(result.message || 'Gagal memposting ke Twitter');
    }
  } catch (error) {
    console.error('Error posting to Twitter:', error);
    document.getElementById('postingSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'block';
    document.getElementById('errorMessage').textContent = error.message || 'Terjadi kesalahan saat mengirim menfess. Silakan coba lagi.';
  }
}

// Event listener untuk form submission
document.addEventListener('DOMContentLoaded', function() {
  // Cek jika kita di halaman pekanbaru
  if (window.location.pathname.endsWith('pekanbaru.html') || window.location.pathname.endsWith('pekanbaru')) {
    initPekanbaruPage();
    
    document.getElementById('menfessForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      const menfessText = document.getElementById('menfess').value;
      
      if (!menfessText) {
        alert("Isi menfess terlebih dahulu!");
        return;
      }
      
      // Cek apakah pengguna masih memiliki jatah kirim
      if (submissionCount >= MAX_SUBMISSIONS) {
        showLimitReached();
        return;
      }
      
      postToTwitter();
    });
  }
});

function showLimitReached() {
  const toast = new bootstrap.Toast(document.getElementById('limitToast'));
  toast.show();
}
