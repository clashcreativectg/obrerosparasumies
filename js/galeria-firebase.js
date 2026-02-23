import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 🔥 FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyAN1JxitWiiw9Az7hgo-N-tl_w52Jra87U",
  authDomain: "cristianosenaccion-71a36.firebaseapp.com",
  projectId: "cristianosenaccion-71a36",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const auth = getAuth(app);
export const db = getFirestore(app);

/* DOM */
const grid = document.getElementById("galeria-grid");

/* Estado */
let media = [];        // imagen + video (Cloudinary)
let youtubeItems = []; // opcional: si quieres seguir usando colección multimedia para youtube

function tsToMs(t) {
  try {
    return t?.toMillis ? t.toMillis() : 0;
  } catch {
    return 0;
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  if (!grid) return;

  // Unimos: media (img/video) + youtube (si existe)
  const all = [...media, ...youtubeItems]
    .sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt));

  if (!all.length) {
    grid.innerHTML = `<p class="galeria-loading">No hay contenido todavía.</p>`;
    return;
  }

  grid.innerHTML = all.map((item, idx) => {
    const delay = idx * 40;

    /* ✅ IMAGEN */
    if (item.kind === "image") {
      return `
        <article class="galeria-item" style="animation-delay:${delay}ms"
          data-kind="image" data-url="${escapeHtml(item.url)}">
          <img src="${escapeHtml(item.url)}" alt="Galería" loading="lazy"/>
        </article>
      `;
    }

    /* ✅ VIDEO LOCAL (Cloudinary) */
    if (item.kind === "video") {
      return `
        <article class="galeria-item" style="animation-delay:${delay}ms"
          data-kind="video" data-url="${escapeHtml(item.url)}">
          <div class="media-frame">
            <video src="${escapeHtml(item.url)}" muted playsinline preload="metadata"></video>
          </div>
          <div class="play-badge"><span><i></i></span></div>
        </article>
      `;
    }

    /* ✅ YOUTUBE (opcional) */
    if (item.kind === "youtube") {
      const thumb = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
      return `
        <article class="galeria-item" style="animation-delay:${delay}ms"
          data-kind="youtube" data-yid="${escapeHtml(item.youtubeId)}">
          <div class="card" style="position:relative; padding:0; border-radius:15px; overflow:hidden;">
            <img src="${thumb}" alt="YouTube" loading="lazy"
              style="height:230px; object-fit:cover; width:100%; display:block;">
            <div class="play-badge"><span><i></i></span></div>
          </div>
        </article>
      `;
    }

    return "";
  }).join("");

  /* Lightbox clicks */
  grid.querySelectorAll(".galeria-item").forEach((card) => {
    card.addEventListener("click", () => {
      const kind = card.dataset.kind;

      if (kind === "image") {
        const url = card.dataset.url;
        window.__openLightbox?.(`<img src="${escapeHtml(url)}" alt="Imagen ampliada">`);
        return;
      }

      if (kind === "video") {
        const url = card.dataset.url;
        window.__openLightbox?.(`
          <div class="media-frame">
            <video src="${escapeHtml(url)}" controls autoplay playsinline></video>
          </div>
        `);
        return;
      }

      if (kind === "youtube") {
        const yid = card.dataset.yid;
        window.__openLightbox?.(`
          <div class="media-frame">
            <iframe
              src="https://www.youtube.com/embed/${escapeHtml(yid)}?autoplay=1"
              allow="autoplay; encrypted-media"
              allowfullscreen
            ></iframe>
          </div>
        `);
      }
    });
  });
}

/* ✅ Realtime: MEDIA (IMÁGENES + VIDEOS) */
const qMedia = query(collection(db, "media"), orderBy("createdAt", "desc"));
onSnapshot(qMedia, (snap) => {
  media = snap.docs.map(d => {
    const data = d.data();

    // OJO: tu admin guarda type "image" o "video"
    const type = data.type === "video" ? "video" : "image";

    return {
      id: d.id,
      kind: type,
      url: data.url,
      createdAt: data.createdAt
    };
  });

  render();
}, (err) => {
  console.error("Error leyendo media:", err);
});

/* ✅ (OPCIONAL) Realtime: multimedia SOLO PARA YOUTUBE
   Si ya no usas YouTube, puedes borrar este bloque completo.
*/
const qYoutube = query(collection(db, "multimedia"), orderBy("createdAt", "desc"));
onSnapshot(qYoutube, (snap) => {
  youtubeItems = snap.docs
    .map(d => {
      const data = d.data();
      if (data.type !== "youtube") return null;
      return {
        id: d.id,
        kind: "youtube",
        youtubeId: data.youtubeId,
        createdAt: data.createdAt
      };
    })
    .filter(Boolean);

  render();
}, (err) => {
  console.error("Error leyendo multimedia (youtube):", err);

});
