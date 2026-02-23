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

/* ☁️ CLOUDINARY */
const CLOUD_NAME = "dwap3udvq";
const UPLOAD_PRESET_IMAGES = "galeria_publica";     // 👈 tu preset imágenes
const UPLOAD_PRESET_VIDEO  = "multimedia_publica";  // 👈 tu preset videos

/* DOM */
const logoutBtn = document.getElementById("logoutBtn");
const userChip = document.getElementById("userChip");

/* Galería */
const imageInput = document.getElementById("imageInput");
const uploadImagesBtn = document.getElementById("uploadImagesBtn");
const imageStatus = document.getElementById("imageStatus");
const imagesGrid = document.getElementById("imagesGrid");
const imagesCount = document.getElementById("imagesCount");

/* Multimedia */
const youtubeUrl = document.getElementById("youtubeUrl");
const addYoutubeBtn = document.getElementById("addYoutubeBtn");
const videoInput = document.getElementById("videoInput");
const uploadVideoBtn = document.getElementById("uploadVideoBtn");
const videoStatus = document.getElementById("videoStatus");
const videosGrid = document.getElementById("videosGrid");
const videosCount = document.getElementById("videosCount");

/* State */
let currentUser = null;
let canUpload = false;
let canDelete = false;

function toast(msg, type = "ok") {
  if (window.showToast) window.showToast(msg, type);
}
function setStatus(el, msg = "") {
  if (el) el.textContent = msg;
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

/* LOGOUT */
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

  if (userChip) userChip.textContent = `${user.email || "Usuario"} • ${profile.rol}`;

  // Arrancamos listeners realtime SOLO cuando ya está autorizado
  startImagesRealtime();
  startVideosRealtime();
});

/* ===================== CLOUDINARY HELPERS ===================== */
async function uploadImageToCloudinary(file) {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET_IMAGES);
  form.append("folder", "galeria");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Error Cloudinary (imagen)");
  return data.secure_url;
}

async function uploadVideoToCloudinary(file) {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET_VIDEO);
  form.append("folder", "multimedia");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Error Cloudinary (video)");
  return data.secure_url;
}

/* ===================== YOUTUBE PARSER ===================== */
function getYouTubeId(url) {
  if (!url) return null;
  const u = url.trim();

  // youtu.be/ID
  const short = u.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (short?.[1]) return short[1];

  // youtube.com/watch?v=ID
  const watch = u.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watch?.[1]) return watch[1];

  // youtube.com/embed/ID
  const embed = u.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (embed?.[1]) return embed[1];

  // shorts
  const shorts = u.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/);
  if (shorts?.[1]) return shorts[1];

  return null;
}

/* ===================== GALERIA (FOTOS) ===================== */
uploadImagesBtn?.addEventListener("click", async () => {
  if (!canUpload) return toast("Tu usuario no está activo.", "err");
  if (!imageInput?.files?.length) return toast("Selecciona al menos una imagen.", "err");

  uploadImagesBtn.disabled = true;
  setStatus(imageStatus, "Subiendo imágenes...");

  try {
    for (const file of imageInput.files) {
      const url = await uploadImageToCloudinary(file);
      await addDoc(collection(db, "media"), {
        type: "image",
        url,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      });
    }
    imageInput.value = "";
    setStatus(imageStatus, "");
    toast("✅ Imágenes subidas");
  } catch (e) {
    console.error(e);
    setStatus(imageStatus, "");
    toast("❌ " + (e.code || e.message), "err");
  } finally {
    uploadImagesBtn.disabled = false;
  }
});

function startImagesRealtime() {
  const q = query(collection(db, "media"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    if (!imagesGrid) return;
    if (imagesCount) imagesCount.textContent = `${snap.size} imágenes`;

    if (!snap.docs.length) {
      imagesGrid.innerHTML = `
        <div class="empty">
          <div class="empty__icon">🖼️</div>
          <div class="empty__title">No hay imágenes todavía</div>
          <div class="empty__text">Sube tu primera foto para verla aquí.</div>
        </div>
      `;
      return;
    }

    imagesGrid.innerHTML = snap.docs.map((d) => {
      const data = d.data();
      return `
        <article class="card">
          <div class="card__media">
            <img src="${data.url}" alt="img" />
          </div>
          <div class="card__body">
            <div class="meta">
              <div class="meta__title">Imagen</div>
              <div class="meta__sub">Galería</div>
            </div>
            ${canDelete ? `<button class="delete-btn" data-id="${d.id}" data-col="media">Eliminar</button>` : ""}
          </div>
        </article>
      `;
    }).join("");

    if (!canDelete) return;
    imagesGrid.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("¿Eliminar imagen?")) return;
        try {
          await deleteDoc(doc(db, "media", id));
          toast("✅ Imagen eliminada");
        } catch (e) {
          console.error(e);
          toast("❌ No se pudo eliminar: " + (e.code || e.message), "err");
        }
      });
    });
  }, (err) => {
    console.error("Snapshot media error:", err);
    toast("❌ Error leyendo galería: " + (err.code || err.message), "err");
  });
}

/* ===================== MULTIMEDIA (VIDEOS) ===================== */
addYoutubeBtn?.addEventListener("click", async () => {
  if (!canUpload) return toast("Tu usuario no está activo.", "err");

  const id = getYouTubeId(youtubeUrl?.value || "");
  if (!id) return toast("Link de YouTube inválido.", "err");

  try {
    setStatus(videoStatus, "Guardando YouTube...");
    await addDoc(collection(db, "multimedia"), {
      type: "youtube",
      youtubeId: id,
      title: "Video de YouTube",
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid,
    });
    youtubeUrl.value = "";
    setStatus(videoStatus, "");
    toast("✅ YouTube agregado");
  } catch (e) {
    console.error(e);
    setStatus(videoStatus, "");
    toast("❌ Error guardando: " + (e.code || e.message), "err");
  }
});

uploadVideoBtn?.addEventListener("click", async () => {
  if (!canUpload) return toast("Tu usuario no está activo.", "err");
  const file = videoInput?.files?.[0];
  if (!file) return toast("Selecciona un video primero.", "err");

  uploadVideoBtn.disabled = true;
  setStatus(videoStatus, "Subiendo video...");

  try {
    const url = await uploadVideoToCloudinary(file);
    await addDoc(collection(db, "multimedia"), {
      type: "local",
      url,
      title: file.name || "Video",
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid,
    });

    videoInput.value = "";
    setStatus(videoStatus, "");
    toast("✅ Video subido");
  } catch (e) {
    console.error(e);
    setStatus(videoStatus, "");
    toast("❌ Error subiendo: " + (e.code || e.message), "err");
  } finally {
    uploadVideoBtn.disabled = false;
  }
});

function startVideosRealtime() {
  const q = query(collection(db, "multimedia"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    if (!videosGrid) return;
    if (videosCount) videosCount.textContent = `${snap.size} videos`;

    if (!snap.docs.length) {
      videosGrid.innerHTML = `
        <div class="empty">
          <div class="empty__icon">📺</div>
          <div class="empty__title">No hay videos todavía</div>
          <div class="empty__text">Agrega uno de YouTube o sube un archivo.</div>
        </div>
      `;
      return;
    }

    videosGrid.innerHTML = snap.docs.map((d) => {
      const data = d.data();

      const mediaHtml = (data.type === "youtube")
        ? `<iframe src="https://www.youtube.com/embed/${data.youtubeId}" allowfullscreen></iframe>`
        : `<video src="${data.url}" controls></video>`;

      const subtitle = data.type === "youtube" ? "YouTube" : "Archivo local";
      const safeTitle = String(data.title || "Video").replaceAll("<", "&lt;");

      return `
        <article class="card">
          <div class="card__media">
            ${mediaHtml}
          </div>
          <div class="card__body">
            <div class="meta">
              <div class="meta__title">${safeTitle}</div>
              <div class="meta__sub">${subtitle}</div>
            </div>
            ${canDelete ? `<button class="delete-btn" data-id="${d.id}" data-col="multimedia">Eliminar</button>` : ""}
          </div>
        </article>
      `;
    }).join("");

    if (!canDelete) return;
    videosGrid.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("¿Eliminar este video?")) return;
        try {
          await deleteDoc(doc(db, "multimedia", id));
          toast("✅ Video eliminado");
        } catch (e) {
          console.error(e);
          toast("❌ No se pudo eliminar: " + (e.code || e.message), "err");
        }
      });
    });
  }, (err) => {
    console.error("Snapshot multimedia error:", err);
    toast("❌ Error leyendo multimedia: " + (err.code || err.message), "err");
  });
}

