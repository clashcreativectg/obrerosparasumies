import { db } from "./firebase-config.js"; 
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js";

// Capturamos el contenedor de la grilla pública
const firebaseGrid = document.querySelector(".firebase-grid");

if (firebaseGrid) {
  // Consulta ordenada para traer siempre lo más nuevo arriba
  const q = query(collection(db, "multimedia"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    firebaseGrid.innerHTML = ""; // Limpiamos el spinner de carga inicial

    if (snapshot.empty) {
      firebaseGrid.innerHTML = `
        <div class="empty" style="grid-column: 1/-1; text-align: center; padding: 60px;">
          <div style="font-size: 3.5rem; color: var(--primary); margin-bottom: 12px;"><i class="fas fa-photo-video"></i></div>
          <h3 style="color: #fff; font-family:'Montserrat', sans-serif;">Próximamente más contenido</h3>
          <p style="color: rgba(255,255,255,0.6); margin-top: 5px;">Estamos preparando videos y predicaciones de bendición para tu vida.</p>
        </div>
      `;
      return;
    }

    let delay = 100;
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Creamos la estructura de la tarjeta agregando de inmediato la visibilidad
      const mediaCard = document.createElement("div");
      mediaCard.className = "media-card reveal-item is-visible"; 
      mediaCard.style.animationDelay = `${delay}ms`;

      // Evaluamos el tipo de video (Enlace YouTube / Archivo Cloudinary)
      let mediaHtml = "";
      if (data.type === "youtube") {
        mediaHtml = `<iframe class="media-card__video" src="${data.url}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%; height:100%; border:none; display:block;"></iframe>`;
      } else {
        mediaHtml = `<video class="media-card__video" src="${data.url}" controls preload="metadata" playsinline></video>`;
      }

      // Convertimos el timestamp de Firebase de forma segura
      let fechaFormateada = "Reciente";
      if (data.createdAt) {
        const dateObj = data.createdAt.seconds ? new Date(data.createdAt.seconds * 1000) : new Date(data.createdAt);
        fechaFormateada = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
      }

      // Inyectamos el marcado final idéntico a tus estilos CSS
      mediaCard.innerHTML = `
        <div class="media-card__wrapper">
          ${mediaHtml}
        </div>
        <div class="media-card__body">
          <div class="media-card__meta">
            <span class="media-card__date">
              <i class="far fa-calendar-alt"></i> ${fechaFormateada}
            </span>
            <span class="media-card__tag">
              <i class="${data.type === 'youtube' ? 'fab fa-youtube' : 'fas fa-video'}"></i> ${data.type === 'youtube' ? 'YouTube' : 'Video'}
            </span>
          </div>
          <h3 class="media-card__title">${data.title || "Video sin título"}</h3>
        </div>
      `;

      firebaseGrid.appendChild(mediaCard);
      delay += 50; // Delay incremental sutil para efectos visuales elegantes
    });
  });
}