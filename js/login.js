import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 🔥 CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyAN1JxitWiiw9Az7hgo-N-tl_w52Jra87U",
  authDomain: "cristianosenaccion-71a36.firebaseapp.com",
  projectId: "cristianosenaccion-71a36",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* DOM */
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const googleBtn = document.getElementById("googleBtn");
const forgotBtn = document.getElementById("forgotPassword");
const errorEl = document.getElementById("error");
const okEl = document.getElementById("ok");

/* Helpers */
function setError(msg) {
  if (okEl) okEl.textContent = "";
  if (errorEl) errorEl.textContent = msg || "";
}
function setOk(msg) {
  if (errorEl) errorEl.textContent = "";
  if (okEl) okEl.textContent = msg || "";
}
function getEmailPass() {
  const email = String(emailEl?.value || "").trim();
  const password = String(passEl?.value || "");
  return { email, password };
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function mapAuthError(e) {
  const code = e?.code || "";
  if (code === "auth/invalid-email") return "Correo inválido.";
  if (code === "auth/missing-email") return "Escribe tu correo.";
  if (code === "auth/missing-password") return "Escribe tu contraseña.";
  if (code === "auth/weak-password") return "Contraseña muy débil (mínimo 6 caracteres).";
  if (code === "auth/email-already-in-use") return "Ese correo ya está registrado.";
  if (code === "auth/invalid-credential") return "Credenciales incorrectas.";
  if (code === "auth/wrong-password") return "Contraseña incorrecta.";
  if (code === "auth/user-not-found") return "Usuario no existe.";
  if (code === "auth/popup-closed-by-user") return "Cerraste la ventana de Google.";
  if (code === "auth/unauthorized-domain") return "Dominio no autorizado en Firebase Auth.";
  return `Error: ${code || e?.message || "desconocido"}`;
}

/* Verificar rol/activo */
async function checkRoleAndGo(user) {
  const userRef = doc(db, "usuarios", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) throw new Error("NO_USER_DOC");

  const data = snap.data();
  const activo = data.Activo === true || data.activo === true;
  const rol = String(data.rol || "").toLowerCase().trim();

  if (!activo) throw new Error("INACTIVE");

  if (rol === "admin" || rol === "lider") {
    window.location.href = "admin-galeria.html";
  } else {
    throw new Error("ROLE");
  }
}

/* Crear doc de usuario (para registro) */
async function ensureUserDoc(user) {
  const ref = doc(db, "usuarios", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  // Por seguridad: al registrarse queda INACTIVO y rol MIEMBRO
  await setDoc(ref, {
    Nombre: user.displayName || "Usuario",
    rol: "miembro",
    activo: false,
    createdAt: serverTimestamp(),
  });
}

/* LOGIN email/pass */
loginBtn?.addEventListener("click", async () => {
  setError("");
  const { email, password } = getEmailPass();

  if (!email) return setError("Escribe tu correo.");
  if (!isValidEmail(email)) return setError("Correo inválido.");
  if (!password) return setError("Escribe tu contraseña.");

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await checkRoleAndGo(cred.user);
  } catch (e) {
    console.error(e);
    if (e?.message === "NO_USER_DOC") return setError("Usuario no autorizado.");
    if (e?.message === "INACTIVE") return setError("Tu usuario está inactivo. Pide activación.");
    if (e?.message === "ROLE") return setError("No tienes permiso para entrar.");
    setError(mapAuthError(e));
  }
});

/* REGISTRO email/pass */
registerBtn?.addEventListener("click", async () => {
  setError("");
  const { email, password } = getEmailPass();

  if (!email) return setError("Escribe tu correo.");
  if (!isValidEmail(email)) return setError("Correo inválido.");
  if (!password || password.length < 6) return setError("Contraseña mínimo 6 caracteres.");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await ensureUserDoc(cred.user);
    setOk("✅ Registrado. Espera activación del administrador.");
  } catch (e) {
    console.error(e);
    setError(mapAuthError(e));
  }
});

/* GOOGLE */
const provider = new GoogleAuthProvider();

async function doGoogleLogin() {
  setError("");
  try {
    const result = await signInWithPopup(auth, provider);
    await ensureUserDoc(result.user);

    try {
      await checkRoleAndGo(result.user);
    } catch (e) {
      if (e?.message === "INACTIVE") return setError("Tu usuario está inactivo. Pide activación.");
      if (e?.message === "ROLE") return setError("No tienes permiso para entrar.");
      if (e?.message === "NO_USER_DOC") return setError("Usuario no autorizado.");
      setError("Registrado con Google. Espera activación.");
    }
  } catch (e) {
    console.error(e);

    // si el navegador bloquea popup, probamos redirect
    if (String(e?.code || "").includes("popup")) {
      await signInWithRedirect(auth, provider);
      return;
    }
    setError(mapAuthError(e));
  }
}

googleBtn?.addEventListener("click", doGoogleLogin);

/* Si usó redirect */
getRedirectResult(auth)
  .then(async (result) => {
    if (!result) return;
    await ensureUserDoc(result.user);
    try {
      await checkRoleAndGo(result.user);
    } catch {
      setError("Registrado con Google. Espera activación.");
    }
  })
  .catch((e) => console.error(e));

/* ✅ OLVIDÉ MI CONTRASEÑA */
forgotBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  setError("");
  setOk("");

  const email = String(emailEl?.value || "").trim();
  if (!email) return setError("Escribe tu correo para enviarte el enlace.");
  if (!isValidEmail(email)) return setError("Correo inválido.");

  try {
    await sendPasswordResetEmail(auth, email);
    setOk("📩 Revisa tu correo: te enviamos el enlace para restablecer tu contraseña.");
  } catch (e2) {
    console.error(e2);
    setError(mapAuthError(e2));
  }
});
