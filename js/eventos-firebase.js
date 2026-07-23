import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("EVENTOS-FIREBASE CARGADO");

/* Firebase */
const firebaseConfig = {
  apiKey: "AIzaSyAN1JxitWiiw9Az7hgo-N-tl_w52Jra87U",
  authDomain: "cristianosenaccion-71a36.firebaseapp.com",
  projectId: "cristianosenaccion-71a36",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* Contenedor */
const grid = document.getElementById("eventos-grid");

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Leer eventos en tiempo real */
const q = collection(db, "events");

onSnapshot(
  q,
  (snapshot) => {

    console.log("Eventos encontrados:", snapshot.size);

    if (!grid) return;

    if (snapshot.empty) {
      grid.innerHTML = `
        <div class="evento-loading">
          <i class="fa-solid fa-calendar-xmark"></i>
          <h3>No hay eventos publicados</h3>
          <p>Próximamente tendremos nuevos eventos.</p>
        </div>
      `;
      return;
    }

    let html = "";

    snapshot.forEach((doc) => {

      console.log("Documento:", doc.id, doc.data());

      const e = doc.data();

     html += `
<article class="evento-card reveal-3d">

    ${
        e.image
        ? `
        <div class="evento-imagen">
            <img
                src="${e.image}"
                alt="${escapeHtml(e.title || "Evento")}"
                loading="lazy">
        </div>
        `
        : ""
    }

    <div class="evento-body">

        <div class="evento-fecha">
            <i class="fa-solid fa-calendar-days"></i>
            ${escapeHtml(e.date || "")}
        </div>

        <h3>${escapeHtml(e.title || "")}</h3>

        <div class="evento-info">

            <span>
                <i class="fa-solid fa-clock"></i>
                ${escapeHtml(e.time || "")}
            </span>

            <span>
                <i class="fa-solid fa-location-dot"></i>
                ${escapeHtml(e.place || "")}
            </span>

        </div>

        <p>${escapeHtml(e.desc || "")}</p>

        ${
            e.link
            ? `
            <a
                href="${escapeHtml(e.link)}"
                target="_blank"
                class="btn-primary">
                Inscribirme
            </a>
            `
            : ""
        }

    </div>

</article>
`;
    });

    grid.innerHTML = html;

  },
  (error) => {

    console.error("Código:", error.code);
    console.error("Mensaje:", error.message);
    console.error(error);

    grid.innerHTML = `
      <div class="evento-loading">
        Error cargando los eventos.
      </div>
    `;

  }
);
