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
  getDoc
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
const UPLOAD_PRESET = "galeria_publica";

/* ELEMENTOS */
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const grid = document.getElementById("admin-grid");
const uploadStatus = document.getElementById("uploadStatus");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;
let canDelete = true;   // admin/lider
let canUpload = false;  // activo

/* 🚪 LOGOUT */
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

/* 🔐 CARGAR PERFIL DESDE /usuarios/{uid} */
async function getProfile(user) {
  const uref = doc(db, "usuarios", user.uid);
  const snap = await getDoc(uref);
  if (!snap.exists()) return null;

  const data = snap.data();
  const rol = String(data.rol || "").toLowerCase().trim();
  const activo = data.activo === true || data.Activo === true;

  return { rol, activo };
}

/* ✅ PROTECCIÓN */
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

  canUpload = profile.activo === true; // cualquier activo puede subir
  canDelete = profile.activo === true && (profile.rol === "admin" || profile.rol === "lider");

  // Si NO está activo, lo sacamos (seguridad)
  if (!canUpload) {
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }
});

/* ✅ Detecta tipo de archivo */
function getMediaType(file) {
  if (file.type?.startsWith("video/")) return "video";
  return "image";
}

/* ☁️ SUBIR A CLOUDINARY (IMAGEN O VIDEO) */
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "galeria");
  formData.append("resource_type", "auto"); // auto detecta image/video

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: "POST", body: formData }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Error Cloudinary");

  return {
    url: data.secure_url,
    resourceType: data.resource_type, // "image" o "video"
  };
}

/* ⬆️ SUBIR (IMÁGENES + VIDEOS) */
uploadBtn?.addEventListener("click", async () => {
  if (!canUpload) {
    alert("Tu usuario no está activo.");
    return;
  }

  if (!fileInput?.files?.length) {
    alert("Selecciona al menos un archivo (imagen o video)");
    return;
  }

  uploadBtn.disabled = true;
  if (uploadStatus) uploadStatus.textContent = "Subiendo...";

  try {
    for (const file of fileInput.files) {
      const localType = getMediaType(file); // por si Cloudinary tarda en responder tipo
      const { url, resourceType } = await uploadToCloudinary(file);

      await addDoc(collection(db, "media"), {
        type: resourceType === "video" ? "video" : localType,
        url,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        originalName: file.name, // opcional
      });
    }

    fileInput.value = "";
    if (uploadStatus) {
      uploadStatus.textContent = "✅ Archivo subido correctamente";
      setTimeout(() => (uploadStatus.textContent = ""), 2000);
    }
  } catch (e) {
    console.error(e);
    if (uploadStatus) uploadStatus.textContent = "❌ " + (e.message || "Error");
  } finally {
    uploadBtn.disabled = false;
  }
});

/* 📡 LISTAR EN TIEMPO REAL */
const q = query(collection(db, "media"), orderBy("createdAt", "desc"));

onSnapshot(q, (snap) => {
  if (!grid) return;

  if (!snap.docs.length) {
    grid.innerHTML = "<p>No hay contenido todavía.</p>";
    return;
  }

  grid.innerHTML = snap.docs.map(d => {
    const data = d.data();
    const isVideo = data.type === "video";

    return `
      <div class="card">
        ${
          isVideo
            ? `<video src="${data.url}" controls muted playsinline></video>`
            : `<img src="${data.url}" alt="img" />`
        }
        ${canDelete ? `<button class="delete-btn" data-id="${d.id}">Eliminar</button>` : ""}
      </div>
    `;
  }).join("");

  // SOLO si es admin/lider ponemos eventos de borrar
  if (!canDelete) return;

  grid.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("¿Eliminar contenido?")) return;

      try {
        await deleteDoc(doc(db, "media", id));
      } catch (e) {
        console.error(e);
        alert("Error eliminando: " + (e.code || e.message));
      }
    });
  });
});

/* Debug opcional */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    console.log("DOC /usuarios/{uid} existe:", snap.exists());
    console.log("DATA:", snap.data());
  } catch (e) {
    console.error("Error leyendo doc usuarios:", e);
  }
});