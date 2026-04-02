import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   FIREBASE CONFIG
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyAN1JxitWiiw9Az7hgo-N-tl_w52Jra87U",
  authDomain: "cristianosenaccion-71a36.firebaseapp.com",
  projectId: "cristianosenaccion-71a36",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================
   CLOUDINARY
========================= */
const CLOUD_NAME = "dwap3udvq";
const UPLOAD_PRESET = "galeria_publica";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

/* =========================
   ELEMENTOS DEL DOM
========================= */
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const grid = document.getElementById("admin-grid");
const uploadStatus = document.getElementById("uploadStatus");
const logoutBtn = document.getElementById("logoutBtn");
const countChip = document.getElementById("countChip");
const userChip = document.getElementById("userChip");

/* =========================
   ESTADO
========================= */
let currentUser = null;
let currentProfile = null;
let canDelete = false;
let canUpload = false;

/* =========================
   HELPERS UI
========================= */
function setStatus(message = "", type = "info") {
  if (!uploadStatus) return;
  uploadStatus.textContent = message;
  uploadStatus.style.color =
    type === "error" ? "#c62828" :
    type === "success" ? "#15803d" :
    "#5f6470";
}

function setCount(total) {
  if (!countChip) return;
  countChip.textContent = `${total} ${total === 1 ? "item" : "items"}`;
}

function updateUserChip() {
  if (!userChip) return;

  if (!currentUser || !currentProfile) {
    userChip.textContent = "Sin usuario";
    return;
  }

  const roleLabel = currentProfile.rol || "usuario";
  userChip.textContent = `${currentUser.email || currentUser.uid} · ${roleLabel}`;
}

function notify(message, type = "ok") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
    return;
  }
  if (type === "error") {
    alert(message);
  } else {
    console.log(message);
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(timestamp) {
  try {
    if (!timestamp?.toDate) return "Fecha no disponible";
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(timestamp.toDate());
  } catch {
    return "Fecha no disponible";
  }
}

function renderEmptyState() {
  if (!grid) return;
  grid.innerHTML = `
    <div class="empty">
      <div class="empty__icon">🖼️</div>
      <div class="empty__title">No hay contenido todavía</div>
      <div class="empty__text">Sube tu primer archivo para verlo aquí.</div>
    </div>
  `;
}

function getMediaType(file) {
  return file.type?.startsWith("video/") ? "video" : "image";
}

function validateFiles(files) {
  const allowedImage = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const allowedVideo = ["video/mp4", "video/webm", "video/quicktime", "video/ogg"];

  for (const file of files) {
    const isImage = allowedImage.includes(file.type);
    const isVideo = allowedVideo.includes(file.type) || file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      throw new Error(`Formato no permitido: ${file.name}`);
    }
  }
}

/* =========================
   AUTH / PERFIL
========================= */
async function getProfile(user) {
  const userRef = doc(db, "usuarios", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return null;

  const data = snap.data();
  const rol = String(data.rol || "").toLowerCase().trim();
  const activo = data.activo === true || data.Activo === true;

  return { rol, activo, raw: data };
}

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("Error cerrando sesión:", error);
    notify("No se pudo cerrar sesión.", "error");
  }
});

onAuthStateChanged(auth, async (user) => {
  try {
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
    currentProfile = profile;
    canUpload = profile.activo === true;
    canDelete = profile.activo === true && (profile.rol === "admin" || profile.rol === "lider");

    updateUserChip();

    if (!canUpload) {
      await signOut(auth);
      window.location.href = "login.html";
      return;
    }

    console.log("Usuario autenticado:", {
      uid: user.uid,
      email: user.email,
      rol: profile.rol,
      activo: profile.activo
    });
  } catch (error) {
    console.error("Error validando sesión:", error);
    notify("No se pudo validar la sesión.", "error");
    window.location.href = "login.html";
  }
});

/* =========================
   CLOUDINARY
========================= */
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "galeria");
  formData.append("resource_type", "auto");

  const response = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Error subiendo a Cloudinary");
  }

  return {
    url: data.secure_url,
    resourceType: data.resource_type
  };
}

/* =========================
   SUBIDA DE ARCHIVOS
========================= */
uploadBtn?.addEventListener("click", async () => {
  try {
    if (!canUpload) {
      notify("Tu usuario no está activo para subir contenido.", "error");
      return;
    }

    const files = Array.from(fileInput?.files || []);

    if (!files.length) {
      notify("Selecciona al menos un archivo.", "error");
      return;
    }

    validateFiles(files);

    uploadBtn.disabled = true;
    setStatus("Subiendo archivos...");

    let uploadedCount = 0;

    for (const file of files) {
      setStatus(`Subiendo ${uploadedCount + 1} de ${files.length}: ${file.name}`);

      const detectedType = getMediaType(file);
      const { url, resourceType } = await uploadToCloudinary(file);

      await addDoc(collection(db, "media"), {
        type: resourceType === "video" ? "video" : detectedType,
        url,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        createdByEmail: currentUser.email || "",
        originalName: file.name
      });

      uploadedCount += 1;
    }

    if (fileInput) fileInput.value = "";
    setStatus("✅ Archivos subidos correctamente", "success");
    notify("Contenido subido correctamente", "ok");

    setTimeout(() => setStatus(""), 2500);
  } catch (error) {
    console.error("Error subiendo archivos:", error);
    setStatus(`❌ ${error.message || "Error subiendo archivos"}`, "error");
    notify(error.message || "Error subiendo archivos", "error");
  } finally {
    uploadBtn.disabled = false;
  }
});

/* =========================
   RENDER DEL GRID
========================= */
function createCardMarkup(id, data) {
  const isVideo = data.type === "video";
  const mediaMarkup = isVideo
    ? `<video src="${escapeHtml(data.url)}" controls muted playsinline preload="metadata"></video>`
    : `<img src="${escapeHtml(data.url)}" alt="${escapeHtml(data.originalName || "Contenido de galería")}" loading="lazy" />`;

  const meta = `
    <div class="card__meta">
      <div class="card__name">${escapeHtml(data.originalName || (isVideo ? "Video" : "Imagen"))}</div>
      <div class="card__date">${formatDate(data.createdAt)}</div>
    </div>
  `;

  const actions = canDelete
    ? `
      <div class="card__actions">
        <button class="delete-btn" data-id="${id}" type="button">Eliminar</button>
      </div>
    `
    : "";

  return `
    <article class="card">
      <div class="card__media">
        ${mediaMarkup}
      </div>
      ${meta}
      ${actions}
    </article>
  `;
}

const mediaQuery = query(collection(db, "media"), orderBy("createdAt", "desc"));

onSnapshot(
  mediaQuery,
  (snapshot) => {
    if (!grid) return;

    const docs = snapshot.docs;
    setCount(docs.length);

    if (!docs.length) {
      renderEmptyState();
      return;
    }

    grid.innerHTML = docs
      .map((docSnap) => createCardMarkup(docSnap.id, docSnap.data()))
      .join("");

    if (!canDelete) return;

    grid.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.id;
        if (!id) return;

        const confirmed = confirm("¿Eliminar este contenido?");
        if (!confirmed) return;

        try {
          button.disabled = true;
          await deleteDoc(doc(db, "media", id));
          notify("Contenido eliminado correctamente", "ok");
        } catch (error) {
          console.error("Error eliminando:", error);
          notify(`Error eliminando: ${error.message || error.code}`, "error");
        } finally {
          button.disabled = false;
        }
      });
    });
  },
  (error) => {
    console.error("Error en onSnapshot(media):", error);
    setStatus("❌ Error cargando contenido", "error");
    notify("No se pudo cargar la galería en tiempo real.", "error");
    renderEmptyState();
  }
);

