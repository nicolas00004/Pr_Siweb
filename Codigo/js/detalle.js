const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const contenedor = document.getElementById('detalle-contenido');
const headerSeccion = document.getElementById('detalle-header-seccion');
const breadcrumbCiudad = document.getElementById('breadcrumb-ciudad');
// URL relativa: usa el mismo host/puerto desde el que se sirvió la página
const API_BASE = '';

let globalCiudadData = null;

function obtenerImagenCiudad(ciudad, index = 0) {
    // Si tenemos array de imágenes locales en el JSON, las usamos
    if (ciudad.imagenes && ciudad.imagenes.length > 0) {
        return ciudad.imagenes[index % ciudad.imagenes.length];
    }
    // Fallback a imagen de la DB o Unsplash
    const keywords = ['cityscape', 'university', 'streets', 'architecture', 'culture'];
    const kw = keywords[index % keywords.length];
    return ciudad.imagen ? ciudad.imagen : `https://picsum.photos/seed/${encodeURIComponent(ciudad.nombre || 'city')}/800/600`;
}

async function cargarDetalle() {
    if (!id) {
        contenedor.innerHTML = "<h2 style='text-align:center;'>No se ha especificado ninguna ciudad.</h2>";
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/ciudades/${id}`);
        if (!respuesta.ok) throw new Error("Ciudad no encontrada");
        globalCiudadData = await respuesta.json();

        // Actualizar Breadcrumbs
        if (breadcrumbCiudad) {
            breadcrumbCiudad.innerText = globalCiudadData.nombre;
            breadcrumbCiudad.classList.add('fade-in');
        }

        // --- RENDERIZAR CABECERA (TÍTULO Y TABS) ---
        const etiquetas = globalCiudadData.etiquetas || {};
        headerSeccion.innerHTML = `
            <h1 class="fade-in">${globalCiudadData.nombre}</h1>
            <div class="tabs-container fade-in" id="tabs-destinos">
                <button class="tab-btn active" data-seccion="historia">${etiquetas.historia ? '🏛️ ' + etiquetas.historia.split(' ').slice(1).join(' ') : '🏛️ Historia'}</button>
                <button class="tab-btn" data-seccion="campus">🎓 Campus</button>
                <button class="tab-btn" data-seccion="sitios">📍 Sitios</button>
                <button class="tab-btn" data-seccion="guia">📖 Guía</button>
                <button class="tab-btn" data-seccion="opiniones">📝 Opiniones</button>
            </div>
        `;

        // Renderizar sección inicial (Historia)
        renderizarSeccion('historia');

        // --- LÓGICA DE TABS ---
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.onclick = () => {
                const targetId = tab.getAttribute('data-seccion');
                
                // Actualizar estado botones
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // CAMBIAR CONTENIDO (Mini-página)
                renderizarSeccion(targetId);
                
                // Scroll arriba suave si es necesario para centrar la vista en el contenido
                headerSeccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
        });

    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `<div style="text-align:center; padding: 50px;"><h2>Error al cargar el destino</h2><p>${error.message}</p></div>`;
    }
}

function renderizarSeccion(seccionId) {
    if (!globalCiudadData) return;

    let html = '';
    
    if (seccionId === 'historia') {
        const etiquetas = globalCiudadData.etiquetas || {};
        html = `
            <div class="mini-pagina fade-in">
                <section class="seccion-destino">
                    <div class="seccion-img">
                        <img src="${obtenerImagenCiudad(globalCiudadData, 0)}" alt="${globalCiudadData.nombre}">
                    </div>
                    <div class="seccion-text">
                        <h2>${etiquetas.historia || "🏛️ Historia y Universidad"}</h2>
                        <p>${globalCiudadData.historia || "Datos históricos en construcción para esta ciudad."}</p>
                    </div>
                </section>
                
                <section class="seccion-destino">
                    <div class="seccion-text">
                        <h2>${etiquetas.alojamiento || "🏠 Vivienda y Alojamiento"}</h2>
                        <p>${globalCiudadData.alojamiento || "Información sobre alojamiento en proceso."}</p>
                        ${globalCiudadData.barrios ? `<p style="margin-top:15px;"><strong>Principales Barrios:</strong> ${globalCiudadData.barrios}</p>` : ''}
                    </div>
                    <div class="seccion-img">
                        <img src="${obtenerImagenCiudad(globalCiudadData, 1)}" alt="Tip extra">
                    </div>
                </section>
            </div>
        `;
        contenedor.innerHTML = html;
    } else if (seccionId === 'campus') {
        html = `
            <div class="fade-in">
                <h2>🎓 Universidades y Facultades</h2>
                <div class="grid-guias" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                    ${globalCiudadData.universidades.length > 0 ? globalCiudadData.universidades.map(u => `
                        <div class="card" style="padding: 20px; background: white; border-radius: 15px; border: 1px solid #e2e8f0;">
                            <h3 style="color: var(--primary-color); margin-top: 0;">${u.nombre}</h3>
                            <p>${u.descripcion || 'Sin descripción disponible.'}</p>
                        </div>
                    `).join('') : '<p>No hay universidades registradas para esta ciudad.</p>'}
                </div>
            </div>
        `;
        contenedor.innerHTML = html;
    } else if (seccionId === 'sitios') {
        // Agrupar sitios por categoría
        const categorias = {
            ocio: '🎭 Ocio y Entretenimiento',
            cultura: '🏛️ Cultura y Patrimonio',
            ocioNocturno: '🌙 Vida Nocturna',
            seguridad: '🏘️ Barrios y Zonas'
        };
        
        html = `
            <div class="fade-in">
                <h2>📍 Lugares de Interés</h2>
                <div style="display: flex; flex-direction: column; gap: 30px;">
                    ${Object.keys(categorias).map(cat => {
                        const sitiosCat = globalCiudadData.sitios.filter(s => s.categoria === cat);
                        if (sitiosCat.length === 0) return '';
                        return `
                            <div>
                                <h3 style="color: var(--accent-color); border-bottom: 2px solid var(--accent-color); display: inline-block; padding-bottom: 5px;">${categorias[cat]}</h3>
                                <div class="grid-guias" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 15px;">
                                    ${sitiosCat.map(s => `
                                        <div class="card" style="padding: 20px; background: white; border-radius: 15px; border: 1px solid #e2e8f0;">
                                            <h4 style="margin-top: 0;">${s.nombre}</h4>
                                            <p style="font-size: 0.9rem;">${s.descripcion || 'Punto de interés recomendado.'}</p>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        contenedor.innerHTML = html;
    } else if (seccionId === 'guia') {
        html = `
            <div class="guide-content fade-in">
                <section class="seccion-destino" style="flex-direction: column; align-items: flex-start;">
                    <div class="seccion-text" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2>📖 Hoja de Ruta: ${globalCiudadData.nombre}</h2>
                            <div style="text-align: right;">
                                <div class="progress-container" style="width: 200px; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                                    <div id="main-progress" style="width: 0%; height: 100%; background: var(--primary-color); transition: width 0.3s;"></div>
                                </div>
                                <span id="progress-text" style="font-size: 0.75rem; color: var(--text-muted);">0% completado</span>
                            </div>
                        </div>
                        
                        <p style="margin-bottom: 30px;">Completa estos pasos esenciales para asegurar tu estancia en ${globalCiudadData.nombre}. Tu progreso se guarda automáticamente.</p>
                        
                        <div class="checklist" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; width: 100%;">
                            <div class="card" style="padding: 20px; background: white; border-radius: 15px; border: 1px solid #e2e8f0;">
                                <h3 style="margin-top:0;">🏠 Vivienda</h3>
                                <label style="display: block; margin: 10px 0; cursor: pointer;"><input type="checkbox" id="v-1" onchange="toggleTask('v-1')"> Reservar alojamiento inicial</label>
                                <label style="display: block; margin: 10px 0; cursor: pointer;"><input type="checkbox" id="v-2" onchange="toggleTask('v-2')"> Revisar contrato de alquiler</label>
                                <label style="display: block; margin: 10px 0; cursor: pointer;"><input type="checkbox" id="v-3" onchange="toggleTask('v-3')"> Confirmar fianza y primer mes</label>
                            </div>
                            <div class="card" style="padding: 20px; background: white; border-radius: 15px; border: 1px solid #e2e8f0;">
                                <h3 style="margin-top:0;">⚖️ Legal y Salud</h3>
                                <label style="display: block; margin: 10px 0; cursor: pointer;"><input type="checkbox" id="l-1" onchange="toggleTask('l-1')"> Solicitar NIE / Registro local</label>
                                <label style="display: block; margin: 10px 0; cursor: pointer;"><input type="checkbox" id="s-1" onchange="toggleTask('s-1')"> Activar Seguro Médico / TSE</label>
                                <label style="display: block; margin: 10px 0; cursor: pointer;"><input type="checkbox" id="l-2" onchange="toggleTask('l-2')"> Padrón de habitantes</label>
                            </div>
                            <div class="card" style="padding: 20px; background: white; border-radius: 15px; border: 1px solid #e2e8f0;">
                                <h3 style="margin-top:0;">💰 Finanzas</h3>
                                <label style="display: block; margin: 10px 0; cursor: pointer;"><input type="checkbox" id="f-1" onchange="toggleTask('f-1')"> Abrir cuenta bancaria local</label>
                                <label style="display: block; margin: 10px 0; cursor: pointer;"><input type="checkbox" id="f-2" onchange="toggleTask('f-2')"> Configurar tarjeta de transporte</label>
                                <label style="display: block; margin: 10px 0; cursor: pointer;"><input type="checkbox" id="f-3" onchange="toggleTask('f-3')"> Verificar comisiones cajeros</label>
                            </div>
                        </div>
                        
                        <div style="margin-top: 40px; padding: 25px; background: #f8fafc; border-radius: 15px; border: 1px solid #e2e8f0;">
                            <h4 style="margin-top:0; color: var(--primary-color);">💡 Consejos Específicos para ${globalCiudadData.nombre}</h4>
                            <p style="font-size: 0.95rem; line-height: 1.6;">${globalCiudadData.alojamiento || 'Busca alojamiento con al menos 2 meses de antelación. Los barrios universitarios suelen ser los primeros en llenarse.'}</p>
                        </div>
                    </div>
                </section>
            </div>
        `;
        contenedor.innerHTML = html;
        // Lanzar funciones de persistencia de guias-logic.js
        if (window.loadChecklistState) {
            loadChecklistState();
            updateGlobalProgress();
        }
    } else if (seccionId === 'opiniones') {
        html = `
            <div class="fade-in">
                <section class="seccion-destino" style="flex-direction: column; align-items: flex-start;">
                    <div class="seccion-text" style="width: 100%;">
                        <h2>📝 Opiniones de Estudiantes</h2>
                        <div id="opinionesCiudadContainer" style="margin-top: 20px; background: white; padding: 30px; border-radius: 20px; border: 1px solid #e2e8f0; width: 100%;">
                            <p>Cargando reseñas...</p>
                        </div>
                        <button class="btn-submit" style="width: auto; margin-top: 20px;" onclick="location.href='comunidad.html'">Añadir mi experiencia</button>
                    </div>
                </section>
            </div>
        `;
        contenedor.innerHTML = html;
        cargarOpiniones(id);
    }
}

async function cargarOpiniones(ciudadId) {
    const opDiv = document.getElementById('opinionesCiudadContainer');
    if (!opDiv) return;

    try {
        const res = await fetch(`${API_BASE}/api/opiniones/${ciudadId}`);
        const ops = await res.json();
        
        if (ops.length === 0) {
            opDiv.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">Aún no hay reseñas para esta ciudad. ¡Sé el primero en compartir tu experiencia!</p>';
        } else {
            opDiv.innerHTML = ops.map(o => `
                <div style="border-bottom: 1px solid #f1f5f9; padding: 20px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <strong style="color: var(--primary-color);">${o.id_usuario ? o.id_usuario.nombre : 'Estudiante'}</strong>
                        <span style="color: #fbbf24;">${"★".repeat(o.puntuacion)}${"☆".repeat(5-o.puntuacion)}</span>
                    </div>
                    <p style="color: var(--text-dark); line-height: 1.6;">"${o.texto_opinion}"</p>
                </div>
            `).join('');
        }
    } catch (e) {
        opDiv.innerHTML = '<p>No se pudieron cargar las opiniones.</p>';
    }
}

cargarDetalle();