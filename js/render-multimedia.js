import { db } from "./firebase-config.js"; 
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Capturamos el contenedor de la grilla de videos
const firebaseGrid = document.querySelector(".firebase-grid");

if (firebaseGrid) {
  try {
    // Consulta para ordenar los videos de forma cronológica descendente
    const q = query(collection(db, "multimedia"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
      firebaseGrid.innerHTML = ""; // Limpiamos el cargador circular

      if (snapshot.empty) {
        firebaseGrid.innerHTML = `
          <div class="empty" style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
            <div style="font-size: 4rem; color: rgba(240,74,0,0.3); margin-bottom: 16px;"><i class="fas fa-film"></i></div>
            <h3 style="color: #fff; font-family:'Montserrat', sans-serif; font-size: 1.5rem;">Próximamente más transmisiones</h3>
            <p style="color: var(--text-muted); margin-top: 8px; font-size: 1rem;">Estamos preparando nuevas predicaciones para edificación de la iglesia.</p>
          </div>
        `;
        return;
      }

      let delay = 50;
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Creamos la tarjeta responsiva con efecto tridimensional
        const mediaCard = document.createElement("div");
        mediaCard.className = "media-card reveal-item is-visible"; 
        mediaCard.style.animationDelay = `${delay}ms`;

        // Evaluamos si es un enlace embebido de YouTube o video de Cloudinary
        let mediaHtml = "";
        if (data.type === "youtube") {
          mediaHtml = `<iframe class="media-card__video" src="${data.url}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%; height:100%; border:none; display:block;"></iframe>`;
        } else {
          mediaHtml = `<video class="media-card__video" src="${data.url}" controls preload="metadata" playsinline></video>`;
        }

        // Formateo seguro de marcas de tiempo de Firebase
        let fechaFormateada = "Reciente";
        if (data.createdAt) {
          const dateObj = data.createdAt.seconds ? new Date(data.createdAt.seconds * 1000) : new Date(data.createdAt);
          fechaFormateada = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        // Construcción de la interfaz de usuario de la tarjeta
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
                <i class="${data.type === 'youtube' ? 'fab fa-youtube' : 'fas fa-play-circle'}"></i> ${data.type === 'youtube' ? 'YouTube' : 'Video'}
              </span>
            </div>
            <h3 class="media-card__title">${data.title || "Mensaje de Bendición"}</h3>
          </div>
        `;

        firebaseGrid.appendChild(mediaCard);
        delay += 60;
      });
    }, (error) => {
      console.error("Error en tiempo real de Firestore: ", error);
      firebaseGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color: var(--primary);">Error de conexión: Permisos insuficientes o base de datos inactiva.</p>`;
    });

  } catch (err) {
    console.error("Fallo crítico en el script multimedia:", err);
  }
}