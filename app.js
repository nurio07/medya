// ============================================
// Tek dosya Firebase + Local Backup + Restore
// ============================================

// 1️⃣ Firebase setup
const firebaseConfig = {
    apiKey: "AIzaSyDrSnmHH4Vm9T2lC4YQ-i8lE-8NZtXSKQc",
      authDomain: "mytv-8b76d.firebaseapp.com",
      projectId: "mytv-8b76d",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// 2️⃣ Admin login fonksiyonu
async function adminLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    console.log("Admin giriş yaptı:", result.user.email);
    return result.user;
  } catch (err) {
    console.error("Admin login hatası:", err);
    alert("Admin hesabınla giriş yapmalısın!");
    throw err;
  }
}

// 3️⃣ Siteyi güncelleme fonksiyonu
function updateSite(data) {
  console.log("Veri yüklendi:", data);
  // Buraya weather-widget / UI update kodunu ekle
  // Örnek: document.getElementById("temp").innerText = data.temp;
}

// 4️⃣ Backup / Upload sistemi
function setupBackup(fileInputId, localBtnId, firebaseBtnId) {
  const input = document.getElementById(fileInputId);

  document.getElementById(localBtnId).onclick = () => {
    input.dataset.mode = "local";
    input.click();
  };
  document.getElementById(firebaseBtnId).onclick = () => {
    input.dataset.mode = "firebase";
    input.click();
  };

  input.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);

    if (input.dataset.mode === "local") {
      localStorage.setItem("app_backup", text);
      updateSite(data);
      console.log("Local yedek kaydedildi");
    }

    if (input.dataset.mode === "firebase") {
      try {
        const user = await adminLogin();
        await db.collection("backup").doc("latest").set(data);
        localStorage.setItem("app_backup", text);
        updateSite(data);
        console.log("Firebase'e yüklendi");
      } catch (err) {
        console.error("Firebase upload başarısız:", err);
      }
    }
  });
}

// 5️⃣ Sayfa açılınca veri restore etme
async function restoreData() {
  // 1️⃣ Local cache
  const local = localStorage.getItem("app_backup");
  if (local) {
    updateSite(JSON.parse(local));
  }

  // 2️⃣ Firebase’den güncel veri çek
  try {
    const docRef = db.collection("backup").doc("latest");
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      localStorage.setItem("app_backup", JSON.stringify(data));
      updateSite(data);
      console.log("Firebase'den veri yüklendi");
    }
  } catch (err) {
    console.warn("Firebase veri çekilemedi:", err);
  }
}

// 6️⃣ DOMContentLoaded ile başlat
window.addEventListener("DOMContentLoaded", () => {
  restoreData();
  setupBackup("fileInput", "localBtn", "firebaseBtn");
});
