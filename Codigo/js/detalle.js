const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const contenedor = document.getElementById('detalle-contenido');
const API_BASE = 'http://localhost:3000';

function obtenerImagenCiudad(ciudad) {
    return ciudad.imagen || `https://source.unsplash.com/1200x500/?${encodeURIComponent(ciudad.nombre || 'city')},cityscape,university`;
}

async function cargarDetalle() {
    if (!id) {
        contenedor.innerHTML = "<h2>No se ha especificado ninguna ciudad.</h2>";
        return;
    }
    try {
        const respuesta = await fetch(`${API_BASE}/api/ciudades/${id}`);
        if (!respuesta.ok) throw new Error("Ciudad no encontrada");
        const ciudad = await respuesta.json();

        // Extraemos textos enciclopédicos con fallbacks (porsi no existen o están vacíos)
        const hist = ciudad.historia || "Datos históricos en construcción para esta ciudad.";
        const aloj = ciudad.alojamiento || "Información de residencias y alquiler pendiente de actualización.";
        const trans = ciudad.transporte || "Pronto detallaremos cómo moverte por esta ciudad.";
        const barr = ciudad.barrios || "Próximamente incluiremos la guía completa de barrios universitarios.";
        const descBack = ciudad.descripcion || "";

        // Si la ciudad tiene el país referenciado (`paisId` populado)
        const nombrePais = ciudad.paisId ? (ciudad.paisId.nombre || "País Desconocido") : "País Mágico";

        const maquetacion = `
            <div class="ficha">
                <div class="ficha-img-header" style="background-image: url('${obtenerImagenCiudad(ciudad)}')"></div>
                <h1>${ciudad.nombre} <span style="font-size: 1.2rem; color: var(--text-muted); font-weight: normal;">| ${nombrePais}</span></h1>
                
                <div class="grid-info">
                    <div class="info-item">
                        <span class="icon">💶</span>
                        <span class="label">Presupuesto Mín.</span>
                        <span class="value">${ciudad.presupuesto}€ / mes</span>
                    </div>
                    <div class="info-item">
                        <span class="icon">🎭</span>
                        <span class="label">Ambiente</span>
                        <span class="value" style="text-transform: capitalize;">${ciudad.ambiente}</span>
                    </div>
                    <div class="info-item">
                        <span class="icon">🛡️</span>
                        <span class="label">Seguridad</span>
                        <span class="value">${"⭐".repeat(ciudad.seguridad || 0)}</span>
                    </div>
                    <div class="info-item">
                        <span class="icon">🎉</span>
                        <span class="label">Ocio</span>
                        <span class="value">${"⭐".repeat(ciudad.ocio || 0)}</span>
                    </div>
                </div>

                <div class="articulo-wiki">
                    <!-- CONTENIDO PRINCIPAL -->
                    <div class="contenido-texto">
                        <p class="texto-largo" style="font-size: 1.25rem; font-weight: 500; margin-bottom: 30px;">
                            ${descBack}
                        </p>

                        <div class="bloque-texto" id="historia">
                            <h3>🏛️ Acerca de la Ciudad y su Universidad</h3>
                            <p>${hist}</p>
                        </div>

                        <div class="bloque-texto" id="barrios">
                            <h3>🏘️ Barrios y Zonas Recomendadas</h3>
                            <p>${barr}</p>
                        </div>

                        <div class="bloque-texto" id="coste">
                            <h3>💰 Coste de Vida y Alojamiento</h3>
                            <p>${aloj}</p>
                        </div>

                        <div class="bloque-texto" id="transporte">
                            <h3>🚲 Transporte e Infraestructura</h3>
                            <p>${trans}</p>
                        </div>

                        <div class="bloque-texto" style="background: #fffcee; border-color: #fbbf24;">
                            <h3 style="color: #d97706;">📝 Opiniones de Estudiantes</h3>
                            <div id="opinionesCiudadContainer" style="margin-top: 15px;">
                                <p style="color: #92400e;">Cargando reseñas...</p>
                            </div>
                            <button class="btn-submit" style="margin-top: 20px; width: auto; font-size: 0.9rem;" onclick="location.href='comunidad.html'">Escribir mi experiencia</button>
                        </div>
                    </div>

                    <!-- SIDEBAR LATERAL -->
                    <aside class="sidebar-ficha">
                        <h3>Resumen Rápido</h3>
                        
                        <div class="dato-lista">
                            <strong>Código Postal</strong>
                            <span>${ciudad.c_postal || "---"}</span>
                        </div>
                        <div class="dato-lista">
                            <strong>Valoración General</strong>
                            <span>${ciudad.valoracion ? ciudad.valoracion + "/5" : "---"}</span>
                        </div>
                        <div class="dato-lista">
                            <strong>Visitas al mes</strong>
                            <span>+${Math.floor(Math.random() * 50) + 10}k</span>
                        </div>
                        <div class="dato-lista" style="margin-top: 20px;" id="favBtnContainer">
                            <!-- Se carga por JS para saber el estado -->
                            <button class="btn-submit" style="width: 100%; border-radius: 8px;" id="btnFavorito">Añadir a Favoritos ❤️</button>
                        </div>
                    </aside>
                </div>
            </div>
        `;
        
        contenedor.innerHTML = maquetacion;

        // --- CARGAR OPINIONES REALES ---
        fetch(`${API_BASE}/api/opiniones/${id}`)
            .then(res => res.json())
            .then(ops => {
                const opDiv = document.getElementById('opinionesCiudadContainer');
                if (ops.length === 0) {
                    opDiv.innerHTML = '<p style="color: #92400e; font-style: italic;">Aún no hay reseñas específicas. ¡Ayuda a otros siendo el primero!</p>';
                } else {
                    opDiv.innerHTML = ops.map(o => `
                        <div style="border-bottom: 1px solid #fde68a; padding: 10px 0;">
                            <strong style="color: #b45309;">${o.usuarioId ? o.usuarioId.nombre : 'Estudiante'}:</strong>
                            <span style="font-size: 0.85rem; color: #d97706;">(${o.valoracion}/5 estrella)</span>
                            <p style="margin-top: 5px; color: #92400e;">"${o.texto}"</p>
                        </div>
                    `).join('');
                }
            });

        // --- GESTIÓN DE FAVORITOS ---
        const user = JSON.parse(localStorage.getItem('usuarioInfo') || 'null');
        const btnFav = document.getElementById('btnFavorito');

        if (user) {
            // Verificar si ya es favorito cargando el perfil del usuario
            fetch(`${API_BASE}/api/usuarios/${user.id}`)
                .then(res => res.json())
                .then(u => {
                    const isFav = u.ciudadesFavoritas && u.ciudadesFavoritas.some(f => (f._id || f) === id);
                    actualizarEstadoBotonFav(isFav);
                });

            btnFav.onclick = async () => {
                try {
                    const res = await fetch(`${API_BASE}/api/usuarios/${user.id}/favorito`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ciudadId: id })
                    });
                    
                    // 1. Verificar si el ID del usuario sigue siendo válido
                    const sesionExpirada = await verificarSesion(res);
                    if (sesionExpirada) return;

                    if (res.ok) {
                        const data = await res.json();
                        actualizarEstadoBotonFav(data.esFavorito);
                        
                        // 2. Feedback visual elegante
                        showToast(data.esFavorito ? "❤️ Añadido a favoritos" : "🤍 Eliminado de favoritos", data.esFavorito ? "success" : "default");
                    } else {
                        showToast("⚠️ Fallo al actualizar favorito", "error");
                    }
                } catch (e) { 
                    console.error(e);
                    showToast("🔌 Error de conexión", "error");
                }
            };
        } else {
            btnFav.onclick = () => window.location.href = 'login.html';
        }

        function actualizarEstadoBotonFav(isFav) {
            if (isFav) {
                btnFav.innerText = "Quitar de Favoritos 💔";
                btnFav.style.background = "#94a3b8"; // Gris slate
            } else {
                btnFav.innerText = "Añadir a Favoritos ❤️";
                btnFav.style.background = ""; // Reset a primary
            }
        }
    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h2>Aún no hay información profunda disponible.</h2>
                <p>No se ha podido cargar el fichero detallado de esta ciudad o el servidor está apagado.</p>
                <button onclick="location.href='index.html'" class="btn-submit" style="width: auto; margin-top: 20px;">Volver a Inicio</button>
            </div>
        `;
    }
}

cargarDetalle();