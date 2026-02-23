import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 🔥 FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyAN1JxitWiiw9Az7hgo-N-tl_w52Jra87U",
  authDomain: "cristianosenaccion-71a36.firebaseapp.com",
  projectId: "cristianosenaccion-71a36",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ☁️ CLOUDINARY (VIDEO) */
const CLOUD_NAME = "dwap3udvq";
const UPLOAD_PRESET_VIDEO = "multimedia_publica"; // crea este preset en Cloudinary

/* DOM (IDs con sufijo _mm para no chocar con admin-galeria) */
const logoutBtn = document.getElementById("logoutBtn"); // compartido (único)
const youtubeUrl = document.getElementById("youtubeUrl_mm");
const addYoutubeBtn = document.getElementById("addYoutubeBtn_mm");

const videoInput = document.getElementById("videoInput_mm");
const uploadVideoBtn = document.getElementById("uploadVideoBtn_mm");

const uploadStatus = document.getElementById("uploadStatus_mm");
const grid = document.getElementById("media-grid_mm");
const countChip = document.getElementById("countChip_mm");

let currentUser = null;
let canDelete = false; // admin/lider
let canUpload = false; // activo

/* UI */
function setStatus(msg = "") {
  if (uploadStatus) uploadStatus.textContent = msg;
}
function toast(msg, type = "ok") {
  if (window.showToast) window.showToast(msg, type);
  else alert(msg);
}

/* PERFIL */
async function getProfile(user) {
  const uref = doc(db, "usuarios", user.uid);
  const snap = await getDoc(uref);
  if (!snap.exists()) return null;

  const data = snap.data();
  const rol = String(data.rol || "").toLowerCase().trim();
  const activo = data.activo === true || data.Activo === true;

  return { rol, activo };
}

/* LOGOUT (solo si existe) */
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

/* AUTH GUARD */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const profile = await getProfile(user);
  if (!profile) {
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  canUpload = profile.activo === true;
  canDelete = profile.activo === true && (profile.rol === "admin" || profile.rol === "lider");

  if (!canUpload) {
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }
});

/* ============ YOUTUBE HELPERS ============ */
function getYouTubeId(url) {
  if (!url) return null;
  const u = url.trim();

  // youtu.be/ID
  let m = u.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (m?.[1]) return m[1];

  // youtube.com/watch?v=ID
  m = u.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (m?.[1]) return m[1];

  // youtube.com/embed/ID
  m = u.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (m?.[1]) return m[1];

  // youtube.com/shorts/ID
  m = u.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/);
  if (m?.[1]) return m[1];

  return null;
}

/* Guardar YouTube en Firestore */
addYoutubeBtn?.addEventListener("click", async () => {
  if (!canUpload) return toast("Tu usuario no está activo.", "err");

  const id = getYouTubeId(youtubeUrl?.value || "");
  if (!id) return toast("Link de YouTube inválido.", "err");

  try {
    setStatus("Guardando YouTube...");

    await addDoc(collection(db, "multimedia"), {
      type: "youtube",
      youtubeId: id,
      title: "Video de YouTube",
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid,
    });

    if (youtubeUrl) youtubeUrl.value = "";
    setStatus("");
    toast("✅ YouTube agregado");
  } catch (e) {
    console.error(e);
    setStatus("");
    toast("❌ Error guardando YouTube: " + (e.code || e.message), "err");
  }
});

/* ============ CLOUDINARY VIDEO UPLOAD ============ */
async function uploadVideoToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET_VIDEO);
  formData.append("folder", "multimedia");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    { method: "POST", body: formData }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Error Cloudinary");
  return data.secure_url;
}

/* Subir archivo local */
uploadVideoBtn?.addEventListener("click", async () => {
  if (!canUpload) return toast("Tu usuario no está activo.", "err");

  const file = videoInput?.files?.[0];
  if (!file) return toast("Selecciona un video primero.", "err");

  uploadVideoBtn.disabled = true;
  setStatus("Subiendo video...");

  try {
    const url = await uploadVideoToCloudinary(file);

    await addDoc(collection(db, "multimedia"), {
      type: "local",
      url,
      title: file.name || "Video",
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid,
    });

    if (videoInput) videoInput.value = "";
    setStatus("");
    toast("✅ Video subido");
  } catch (e) {
    console.error(e);
    setStatus("");
    toast("❌ Error subiendo: " + (e.message || e.code), "err");
  } finally {
    uploadVideoBtn.disabled = false;
  }
});

/* ============ REALTIME LIST ============ */
const q = query(collection(db, "multimedia"), orderBy("createdAt", "desc"));

onSnapshot(
  q,
  (snap) => {
    if (!grid) return;

    const n = snap.size;
    if (countChip) countChip.textContent = `${n} videos`;

    if (!snap.docs.length) {
      grid.innerHTML = `
        <div class="empty">
          <div class="empty__icon">📺</div>
          <div class="empty__title">No hay videos todavía</div>
          <div class="empty__text">Agrega uno de YouTube o sube un archivo.</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = snap.docs
      .map((d, index) => {
        const data = d.data();
        const delay = index * 60;

        const mediaHtml =
          data.type === "youtube"
            ? `<iframe src="https://www.youtube.com/embed/${data.youtubeId}" allowfullscreen></iframe>`
            : `<video src="${data.url}" controls playsinline></video>`;

        const subtitle = data.type === "youtube" ? "YouTube" : "Archivo local";
        const safeTitle = String(data.title || "Video")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");

        return `
          <article class="card" style="animation-delay:${delay}ms">
            <div class="card__media">${mediaHtml}</div>

            <div class="card__body">
              <div class="meta">
                <div class="meta__title">${safeTitle}</div>
                <div class="meta__sub">${subtitle}</div>
              </div>

              ${canDelete ? `<button class="delete-btn" data-id="${d.id}">Eliminar</button>` : ""}
            </div>
          </article>
        `;
      })
      .join("");

    if (!canDelete) return;

    grid.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("¿Eliminar este video?")) return;

        try {
          await deleteDoc(doc(db, "multimedia", id));
          toast("✅ Eliminado");
        } catch (e) {
          console.error(e);
          toast("❌ No se pudo eliminar: " + (e.code || e.message), "err");
        }
      });
    });
  },
  (err) => {
    console.error("Snapshot error:", err);
    toast("❌ Error leyendo multimedia: " + (err.code || err.message), "err");
  }
);
