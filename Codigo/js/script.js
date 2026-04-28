const contenedor = document.getElementById('contenedorCiudades');
const slider = document.getElementById('rangoPresupuesto');
const etiquetaPrecio = document.getElementById('valorPresupuesto');
const selectorAmbiente = document.getElementById('selectAmbiente');
const rankingBody = document.getElementById('rankingBody');

const weightsGrid = document.getElementById('weightsGrid');
const ahpControls = document.getElementById('ahpControls');
const btnGuardar = document.getElementById('btnGuardarBusqueda');
const selectBusqueda = document.getElementById('selectBusqueda');
const selectRol = document.getElementById('selectRol');
const savedSearchesContainer = document.getElementById('savedSearchesContainer');

// Mapa global
let map = null;
let markers = [];

const API_BASE = 'http://localhost:3000';
let ciudades = [];
let userFull = null;
let userFavoritasIds = [];
let currentWeights = {
    transporte: 1,
    ocio: 1,
    ocioNocturno: 1,
    seguridad: 1,
    calidadAcademica: 1
};
let seleccionParaComparar = [];
let rankingDataGlobal = [];

const ORIGIN = [40.4168, -3.7038]; // Madrid

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function cargarDatos() {
    try {
        const res = await fetch(`${API_BASE}/api/ciudades`);
        ciudades = await res.json();
        renderizarSliders();
        aplicarFiltros(); 
        inicializarMapa();
        
        // Ajuste Leaflet para layout Dashboard
        setTimeout(() => { if(window.map) window.map.invalidateSize(); }, 1000);
        
        const userInfo = JSON.parse(localStorage.getItem('usuarioInfo'));

        // 2. Si hay usuario, cargar sus datos completos
        if (userInfo) {
            const userId = getUserId();
            const resU = await fetch(`${API_BASE}/api/usuarios/${userId}`);
            userFull = await resU.json();
            userFavoritasIds = (userFull.ciudadesFavoritas || []).map(f => f._id || f);
            
            // Mostrar controles extendidos
            ahpControls.style.display = 'block';
            btnGuardar.style.display = 'block';
            
            if (userFull.busquedas && userFull.busquedas.length > 0) {
                renderizarSelectBusquedas();
            }

            // Mostrar bienvenida personalizada
            const heroH2 = document.querySelector('#hero h2');
            if (heroH2) heroH2.innerText = `👋 ¡Hola ${userFull.nombre}! Personaliza tu búsqueda`;
        }

        renderizarSliders();
        
        // Cargar búsqueda temporal si viene del perfil
        const temp = localStorage.getItem('tempBusqueda');
        if (temp) {
            const b = JSON.parse(temp);
            currentWeights = { ...b.pesos };
            if (selectRol) selectRol.value = b.rol;
            localStorage.removeItem('tempBusqueda');
            renderizarSliders();
            showToast(`📂 Cargada búsqueda: ${b.nombre}`, "success");
        }

        aplicarFiltros();
    } catch (e) {
        console.error('Error cargando ciudades:', e);
        if (contenedor) {
            contenedor.innerHTML = '<p style="text-align:center;padding:40px;">Error al cargar datos. Asegúrate de que el servidor está encendido (<code>node server.js</code>).</p>';
        }
    }
}

function obtenerImagenCiudad(ciudad) {
    if (ciudad.imagenes && ciudad.imagenes.length > 0) {
        return ciudad.imagenes[0];
    }
    return ciudad.imagen || `https://source.unsplash.com/400x300/?${encodeURIComponent(ciudad.nombre)},city`;
}

function renderizarCiudades(datos) {
    if (!contenedor) return;

    if (datos.length === 0) {
        contenedor.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <h3 style="color: var(--text-muted);">No se encontraron ciudades con estos filtros.</h3>
            </div>`;
        return;
    }

    contenedor.innerHTML = datos.map(c => {
        const isFav = userFavoritasIds.includes(c._id);
        return `
            <article class="card" style="cursor: pointer;" onclick="window.location.href='detalle.html?id=${c._id}'">
                <button class="fav-btn ${isFav ? 'active' : ''}" 
                        onclick="event.stopPropagation(); toggleFavoritoRapido('${c._id}')" 
                        title="${isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
                    ${isFav ? '❤️' : '🤍'}
                </button>
                <div class="card-img-placeholder" style="background-image: url('${obtenerImagenCiudad(c)}')"></div>
                <div class="card-content">
                    <h3>${c.nombre}</h3>
                    <div class="card-info">
                        <span class="pill">💶 ${c.presupuesto}€ / mes</span>
                        <span class="pill">🎭 Ambiente: ${c.tipoAmbiente || 'N/A'}</span>
                        <span class="pill">🛡️ Seguridad: ${"⭐".repeat(Math.round(c.metricas ? c.metricas.seguridad / 2 : 0))}</span>
                    </div>
                    <a href="detalle.html?id=${c._id}" class="btn-ver" onclick="event.stopPropagation()">Ver detalles completos</a>
                </div>
            </article>
        `;
    }).join('');
}

async function toggleFavoritoRapido(ciudadId) {
    const user = JSON.parse(localStorage.getItem('usuarioInfo'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/usuarios/${getUserId()}/favorito`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ciudadId })
        });
        
        // 1. Verificar si el ID de usuario sigue existiendo
        const sesionExpirada = await verificarSesion(res);
        if (sesionExpirada) return;

        if (res.ok) {
            const data = await res.json();
            
            // 2. Feedback visual (Toast)
            showToast(data.esFavorito ? "❤️ ¡Añadido a favoritos!" : "🤍 Eliminado de favoritos", data.esFavorito ? "success" : "default");

            // 3. Actualizar lista local y volver a renderizar
            if (data.esFavorito) {
                userFavoritasIds.push(ciudadId);
            } else {
                userFavoritasIds = userFavoritasIds.filter(id => id !== ciudadId);
            }
            aplicarFiltros(); 
        } else {
            showToast("⚠️ Error al guardar favorito", "error");
        }
    } catch (e) {
        console.error("Error favoritos:", e);
        showToast("🔌 Error de conexión con el servidor", "error");
    }
}

function aplicarFiltros() {
    const maxPresupuesto = slider ? parseInt(slider.value) : Infinity;
    const ambienteFilter = selectorAmbiente ? selectorAmbiente.value : 'todos';

    const filtradas = ciudades.filter(c => {
        const entraPresupuesto = c.presupuesto <= maxPresupuesto;
        const entraAmbiente = ambienteFilter === 'todos' || c.tipoAmbiente === ambienteFilter;
        return entraPresupuesto && entraAmbiente;
    });

    renderizarCiudades(filtradas);
    const ranking = calcularRanking();
    renderizarMapa(filtradas, ranking);
}

function renderizarMapa(datos, rankingData = []) {
    if (!map) {
        // Inicializar mapa centrado en España
        map = L.map('mapa-destinos').setView([40.4168, -3.7038], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    }

    // Limpiar markers y flechas antiguos
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    
    // Función para obtener icono coloreado
    const getMarkerIcon = (color) => {
        return L.divIcon({
            className: 'custom-div-icon',
            html: `<div style='background-color:${color}; width:30px; height:30px; border-radius:50% 50% 50% 0; transform: rotate(-45deg); border:2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);'></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
    };
    
    // Añadir nuevos markers
    datos.forEach(c => {
        if (c.coordenadas && c.coordenadas.coordinates) {
            const [lng, lat] = c.coordenadas.coordinates;
            
            // Determinar color basado en ranking
            let color = '#3b82f6'; // Azul por defecto
            const rankIndex = rankingData.findIndex(rc => rc._id === c._id);
            if (rankIndex === 0) color = '#fbbf24'; // Oro
            else if (rankIndex === 1) color = '#10b981'; // Esmeralda
            else if (rankIndex === 2) color = '#8b5cf6'; // Violeta (para diferenciar del azul)

            const marker = L.marker([lat, lng], {
                icon: rankIndex >= 0 && rankIndex < 3 ? getMarkerIcon(color) : new L.Icon.Default()
            }).addTo(map);

            marker.bindPopup(`
                <div style="font-family: inherit;">
                    <strong style="color:var(--primary-color);">${c.nombre}</strong><br>
                    ${rankIndex >= 0 ? `<span class="pill" style="background:${color}; color:white; font-size:0.7rem; padding:2px 6px;">${rankIndex + 1}º en Ranking</span><br>` : ''}
                    <span>Presupuesto: ${c.presupuesto}€</span><br>
                    <a href="detalle.html?id=${c._id}" style="color:var(--accent-color); font-weight:bold; text-decoration:none;">Ver Detalles →</a>
                </div>
            `);
            markers.push(marker);
        }
    });
}

const CATEGORIAS_AHP = [
    { name: '🌟 Destino de Élite', min: 4.5, color: '#fbbf24' },
    { name: '✅ Muy Recomendado', min: 3.8, color: '#10b981' },
    { name: '🆗 Aceptable', min: 2.5, color: '#3b82f6' },
    { name: '⚠️ No Recomendado', min: 0, color: '#ef4444' }
];

function calcularRanking() {
    if (!rankingBody) return;
    const seleccionados = Object.keys(currentWeights);

    const rankingData = ciudades.map(c => {
        let scoreTotal = 0;
        let pesoTotal = 0;

        seleccionados.forEach(crit => {
            const mapCrit = { 
                'ocioNocturno': 'ambienteNocturno', 
                'transporte': 'calidadTransporte',
                'ocio': 'turismo'
            };
            const critKey = mapCrit[crit] || crit;
            const metricValue = (c.metricas ? c.metricas[critKey] : null);
            
            // --- MANEJO DE DATOS FALTANTES ---
            // Solo sumamos el peso si la ciudad tiene la métrica
            if (metricValue !== null && metricValue !== undefined) {
                const peso = currentWeights[crit] || 1;
                scoreTotal += metricValue * peso;
                pesoTotal += peso;
            }
        });

        const scoreFinal = scoreTotal / (pesoTotal || 1);
        const categoria = AHPEngine.classify(scoreFinal, CATEGORIAS_AHP);
        const catInfo = CATEGORIAS_AHP.find(cat => cat.name === categoria) || { color: '#64748b', min: 0 };

        // --- SENSIBILIDAD DE UMBRALES ---
        // Detectar si está cerca del borde superior de la siguiente categoría o del borde inferior de la actual
        const proximaCat = CATEGORIAS_AHP[CATEGORIAS_AHP.indexOf(catInfo) - 1];
        const estaCercaDeSubir = proximaCat && (proximaCat.min - scoreFinal < 0.15);
        const estaCercaDeBajar = (scoreFinal - catInfo.min < 0.1) && catInfo.min > 0;

        return { 
            ...c, 
            globalScore: scoreFinal, 
            categoria, 
            catColor: catInfo.color,
            alertaUmbral: estaCercaDeSubir ? 'Subir' : (estaCercaDeBajar ? 'Bajar' : null)
        };
    });

    rankingData.sort((a, b) => b.globalScore - a.globalScore);
    rankingDataGlobal = rankingData; // Guardar para el comparador
    
    rankingBody.innerHTML = rankingData.map((c, i) => `
        <tr class="ranking-row" onclick="window.location.href='detalle.html?id=${c._id}'">
            <td onclick="event.stopPropagation()" style="width:30px; text-align:center;">
                <input type="checkbox" class="compare-checkbox" value="${c._id}" 
                       ${seleccionParaComparar.includes(c._id) ? 'checked' : ''}
                       onchange="toggleSeleccionComparar('${c._id}')" 
                       style="width:18px; height:18px; cursor:pointer;">
            </td>
            <td data-label="POS"><span class="rank-number">${i + 1}º</span></td>
            <td data-label="CIUDAD">
                <div class="rank-city">
                    <img src="${obtenerImagenCiudad(c)}" alt="${c.nombre}">
                    <span>${c.nombre} ${c.rol === 'trabajador' ? '💼' : ''}</span>
                </div>
            </td>
            <td data-label="CLASIFICACIÓN">
                <span class="pill" style="background: ${c.catColor}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 700;">
                    ${c.categoria}
                </span>
                ${c.alertaUmbral === 'Subir' ? '<span class="near-threshold">✨ Casi en cat. superior</span>' : ''}
                ${c.alertaUmbral === 'Bajar' ? '<span class="near-threshold">⚠️ Al límite inferior</span>' : ''}
            </td>
            <td data-label="PUNTUACIÓN" class="rank-score">
                <div style="display:flex; flex-direction:column; align-items:flex-end;">
                    <span>${c.globalScore.toFixed(2)} / 5</span>
                    <span style="font-size:0.65rem; color:var(--text-muted); font-weight:normal;">Métricas: ${Object.keys(c.metricas || {}).length}</span>
                </div>
            </td>
        </tr>
    `).join('');

    actualizarBotonComparar();
    return rankingData;
}

function toggleSeleccionComparar(id) {
    const index = seleccionParaComparar.indexOf(id);
    if (index === -1) {
        if (seleccionParaComparar.length >= 4) {
            showToast("⚠️ Máximo 4 ciudades para comparar", "error");
            renderizarMatrizAHP(); // Refrescar para desmarcar el checkbox
            return;
        }
        seleccionParaComparar.push(id);
    } else {
        seleccionParaComparar.splice(index, 1);
    }
    actualizarBotonComparar();
}

function actualizarBotonComparar() {
    const btn = document.getElementById('btnComparar');
    const count = document.getElementById('compareCount');
    if (btn && count) {
        const n = seleccionParaComparar.length;
        btn.style.display = n >= 2 ? 'block' : 'none';
        count.innerText = n;
    }
}

function abrirComparador() {
    const modal = document.getElementById('modalComparador');
    const body = document.getElementById('comparadorBody');
    if (!modal || !body) return;

    const seleccionadas = ciudades.filter(c => seleccionParaComparar.includes(c._id));
    
    // Calcular los mejores valores para resaltar
    const mejoresValores = {};
    const criterios = Object.keys(currentWeights);
    
    criterios.forEach(key => {
        const mapCrit = { 'ocioNocturno': 'ambienteNocturno', 'transporte': 'calidadTransporte', 'ocio': 'turismo' };
        const critKey = mapCrit[key] || key;
        mejoresValores[key] = Math.max(...seleccionadas.map(c => (c.metricas ? c.metricas[critKey] : 0) || 0));
    });

    body.innerHTML = seleccionadas.map(c => {
        const scoreAHP = rankingDataGlobal.find(r => r._id === c._id)?.globalScore || 0;
        
        // Calcular distancia si hay coordenadas
        let distanciaTexto = "Distancia no disp.";
        if (c.coordenadas && c.coordenadas.coordinates) {
            const [lng, lat] = c.coordenadas.coordinates;
            const dist = calcularDistancia(ORIGIN[0], ORIGIN[1], lat, lng);
            distanciaTexto = `📍 a ${dist.toFixed(0)} km de ti`;
        }
        
        // --- GENERAR VEREDICTO ---
        const metricasOrdenadas = criterios
            .map(key => {
                const mapCrit = { 'ocioNocturno': 'ambienteNocturno', 'transporte': 'calidadTransporte', 'ocio': 'turismo' };
                const critKey = mapCrit[key] || key;
                return { key, val: (c.metricas ? c.metricas[critKey] : 0) || 0 };
            })
            .sort((a, b) => b.val - a.val);

        const fortalezas = metricasOrdenadas.slice(0, 2).map(m => m.key);
        const esMasBarata = c.presupuesto === Math.min(...seleccionadas.map(s => s.presupuesto));
        
        let veredicto = `✨ Destaca en <strong>${fortalezas[0]}</strong> y <strong>${fortalezas[1]}</strong>.`;
        if (esMasBarata && seleccionadas.length > 1) veredicto += ` Es la opción más <strong>económica</strong>.`;

        return `
            <div class="comp-card premium-card" onclick="window.location.href='detalle.html?id=${c._id}'" style="cursor:pointer; transition: transform 0.2s;">
                <div class="comp-city-header">
                    <div style="position: relative; display: inline-block;">
                        <img src="${obtenerImagenCiudad(c)}" alt="${c.nombre}" style="width:100px; height:100px; border-radius:20px; object-fit:cover;">
                        <div style="position:absolute; bottom:-10px; right:-10px; background:var(--primary-color); color:white; width:35px; height:35px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; border:3px solid white; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                            ${scoreAHP.toFixed(1)}
                        </div>
                    </div>
                    <h4 style="margin: 15px 0 2px 0; font-size:1.4rem;">${c.nombre}</h4>
                    <p style="font-size:0.7rem; color:var(--text-muted); margin-bottom:8px;">${distanciaTexto}</p>
                    <div style="display:flex; justify-content:center; gap:5px;">
                        <span class="pill" style="background:#e0f2fe; color:#0369a1; font-weight:600; font-size:0.7rem;">${c.presupuesto}€/mes</span>
                        <span class="pill" style="background:#fef3c7; color:#92400e; font-weight:600; font-size:0.7rem;">🎓 ${c.universidades ? c.universidades.length : 0} Univ.</span>
                    </div>
                </div>

                <div style="background:rgba(59, 130, 246, 0.05); padding:10px; border-radius:12px; margin-top:15px; font-size:0.75rem; border:1px dashed var(--accent-color);">
                    <p style="margin:0; color:var(--primary-color);">${veredicto}</p>
                </div>
                
                <div class="comp-metrics-list" style="margin-top:15px; background:white; padding:15px; border-radius:15px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
                    ${criterios.map(key => {
                        const mapCrit = { 'ocioNocturno': 'ambienteNocturno', 'transporte': 'calidadTransporte', 'ocio': 'turismo' };
                        const critKey = mapCrit[key] || key;
                        const val = (c.metricas ? c.metricas[critKey] : 0) || 0;
                        const esMejor = val === mejoresValores[key] && val > 0;
                        
                        return `
                            <div style="margin-bottom:12px;">
                                <div class="comp-metric" style="margin-bottom:4px;">
                                    <span style="text-transform:capitalize; font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:5px; font-weight:500;">
                                        ${key} ${esMejor ? '⭐' : ''}
                                    </span>
                                    <span style="font-size:0.8rem; font-weight:700; color:${esMejor ? 'var(--accent-color)' : '#1e293b'}">${val}/5</span>
                                </div>
                                <div class="comp-metric-bar" style="height:6px; background:#f1f5f9;">
                                    <div class="comp-metric-fill" style="width: ${(val/5)*100}%; background: ${esMejor ? 'var(--accent-color)' : 'var(--primary-color)'}; border-radius:4px;"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div style="margin-top:20px; text-align:center;">
                    <button class="btn-ver" style="width:100%; padding:12px; border-radius:12px; background:var(--primary-color); color:white; border:none; font-weight:600; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <span>Ver Perfil Completo</span>
                        <i class="fas fa-arrow-right" style="font-size:0.8rem;"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    modal.style.display = 'flex';
}

function cerrarComparador() {
    document.getElementById('modalComparador').style.display = 'none';
}

const btnCompararGlobal = document.getElementById('btnComparar');
if (btnCompararGlobal) {
    btnCompararGlobal.onclick = abrirComparador;
}

function renderizarSliders() {
    if (!weightsGrid) return;
    weightsGrid.innerHTML = Object.keys(currentWeights).map(key => {
        const val = currentWeights[key];
        const percentage = (val / 5) * 100;
        return `
        <div class="weight-control">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <label style="font-size:0.85rem; font-weight:600; text-transform:capitalize;">${key}</label>
                <span style="font-size:0.75rem; color:var(--primary-color); font-weight:bold;">${val.toFixed(1)}</span>
            </div>
            <input type="range" min="1" max="5" step="0.1" value="${val}" 
                   class="weight-slider" data-crit="${key}" 
                   style="width: 100%;">
            <div class="ahp-weight-bar-container">
                <div class="ahp-weight-bar-fill" style="width: ${percentage}%;"></div>
            </div>
        </div>
    `}).join('');

    document.querySelectorAll('.weight-slider').forEach(s => {
        s.oninput = (e) => {
            currentWeights[e.target.dataset.crit] = parseInt(e.target.value);
            aplicarFiltros();
        };
    });
}

function renderizarSelectBusquedas() {
    savedSearchesContainer.style.display = 'flex';
    selectBusqueda.innerHTML = '<option value="">-- Seleccionar --</option>' + 
        userFull.busquedas.map((b, idx) => `<option value="${idx}">${b.nombre} (${b.rol})</option>`).join('');
}

if (selectBusqueda) {
    selectBusqueda.onchange = (e) => {
        const idx = e.target.value;
        if (idx === "") return;
        
        const b = userFull.busquedas[idx];
        currentWeights = { ...b.pesos };
        if (selectRol) selectRol.value = b.rol;
        
        // Sincronizar sliders y chips
        renderizarSliders();
        aplicarFiltros();
    };
}

if (btnGuardar) {
    btnGuardar.onclick = async () => {
        const nombre = prompt("¿Qué nombre quieres ponerle a esta configuración?");
        if (!nombre) return;

        try {
            const res = await fetch(`${API_BASE}/api/usuarios/${userFull._id}/busquedas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre,
                    rol: selectRol ? selectRol.value : 'estudiante',
                    pesos: currentWeights
                })
            });

            if (res.ok) {
                userFull.busquedas = await res.json();
                renderizarSelectBusquedas();
                showToast("✅ Búsqueda guardada con éxito", "success");
            }
        } catch (e) { console.error(e); }
    };
}

const btnResetAHP = document.getElementById('btnResetAHP');
if (btnResetAHP) {
    btnResetAHP.onclick = () => {
        Object.keys(currentWeights).forEach(k => currentWeights[k] = 1);
        if (selectRol) selectRol.value = 'estudiante';
        renderizarSliders();
        aplicarFiltros();
    };
}

// --- LÓGICA MODO EXPERTO (MATRIZ AHP) ---
const btnExpert = document.getElementById('btnExpertAHP');
const panelMatrix = document.getElementById('ahpMatrixPanel');
const tableMatrix = document.getElementById('ahpMatrixTable');
const consistencyInfo = document.getElementById('ahpConsistencyInfo');

if (btnExpert && panelMatrix) {
    btnExpert.onclick = () => {
        const isVisible = panelMatrix.style.display === 'block';
        panelMatrix.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) renderizarMatrizAHP();
    };
}

function renderizarMatrizAHP() {
    const criteria = Object.keys(currentWeights);
    const n = criteria.length;
    
    // Crear matriz de identidad si no existe o sincronizar
    let html = '<thead><tr><th></th>' + criteria.map(c => `<th style="text-transform:capitalize;">${c}</th>`).join('') + '</tr></thead><tbody>';
    
    criteria.forEach((rowCrit, i) => {
        html += `<tr><td style="font-weight:700; text-transform:capitalize; padding:8px;">${rowCrit}</td>`;
        criteria.forEach((colCrit, j) => {
            if (i === j) {
                html += `<td style="background:#f1f5f9; text-align:center; font-weight:bold; border:1px solid #e2e8f0;">1</td>`;
            } else if (i < j) {
                // Input para comparar row vs col
                html += `<td style="padding:4px; border:1px solid #e2e8f0;">
                          <input type="number" step="1" min="1" max="9" value="1" 
                          onchange="actualizarMatrizAHP(${i}, ${j}, this.value)" 
                          style="width:100%; border:none; background:transparent; text-align:center; font-weight:600; color:var(--accent-color);"></td>`;
            } else {
                // Recíproco (se calcula auto)
                html += `<td id="ahp_${i}_${j}" style="color:var(--text-muted); text-align:center; border:1px solid #e2e8f0; background:#f8fafc;">1</td>`;
            }
        });
        html += '</tr>';
    });
    
    html += '</tbody>';
    tableMatrix.innerHTML = html;
    recalcularPrioridadesAHP();
}

let ahpMatrixInternal = [];

function actualizarMatrizAHP(row, col, val) {
    const v = parseFloat(val);
    if (isNaN(v) || v <= 0) return;
    
    document.getElementById(`ahp_${col}_${row}`).innerText = (1/v).toFixed(2);
    recalcularPrioridadesAHP();
}

function recalcularPrioridadesAHP() {
    const criteria = Object.keys(currentWeights);
    const n = criteria.length;
    const matrix = Array.from({ length: n }, () => Array(n).fill(1));
    
    // Leer valores de la tabla
    criteria.forEach((_, i) => {
        criteria.forEach((_, j) => {
            if (i < j) {
                const input = tableMatrix.querySelector(`tr:nth-child(${i+1}) td:nth-child(${j+2}) input`);
                const val = parseFloat(input.value) || 1;
                matrix[i][j] = val;
                matrix[j][i] = 1/val;
            }
        });
    });

    const newWeights = AHPEngine.calculateWeights(matrix);
    const consistency = AHPEngine.checkConsistency(matrix, newWeights);

    // Actualizar currentWeights (normalizados a escala 1-5 para compatibilidad con sliders)
    const maxW = Math.max(...newWeights);
    criteria.forEach((key, idx) => {
        currentWeights[key] = (newWeights[idx] / maxW) * 5;
    });

    // Actualizar UI
    renderizarSliders();
    aplicarFiltros();

    consistencyInfo.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px; background:${consistency.consistent ? '#ecfdf5' : '#fef2f2'}; padding:12px; border-radius:8px; border:1px solid ${consistency.consistent ? '#10b981' : '#ef4444'};">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; color:${consistency.consistent ? '#10b981' : '#ef4444'}">
                    ${consistency.consistent ? '✅ Matriz Consistente' : '⚠️ Revisar Consistencia'}
                </span>
                <span style="font-size:0.8rem; font-family:monospace; color:${consistency.consistent ? '#065f46' : '#991b1b'}">
                    CR: ${consistency.cr}
                </span>
            </div>
            ${!consistency.consistent && consistency.worstCell ? `
                <div style="font-size:0.75rem; color:#991b1b; padding-top:5px; border-top:1px dashed #fca5a5;">
                    💡 Revisa la comparación entre <strong>${criteria[consistency.worstCell.row]}</strong> y <strong>${criteria[consistency.worstCell.col]}</strong> (celda resaltada).
                </div>
            ` : ''}
        </div>
        <div style="margin-top:15px;">
            <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">UMBRALES AHP-SORT II:</p>
            <div style="display:flex; flex-direction:column; gap:5px;">
                ${CATEGORIAS_AHP.map(cat => `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:10px; height:10px; border-radius:2px; background:${cat.color};"></div>
                        <span style="font-size:0.7rem; flex:1;">${cat.name}</span>
                        <span style="font-size:0.7rem; color:var(--text-muted);">> ${cat.min}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // --- VISUALIZACIÓN DE INCONSISTENCIA EN TABLA ---
    tableMatrix.querySelectorAll('td').forEach(td => td.classList.remove('inconsistent-cell'));
    if (!consistency.consistent && consistency.worstCell) {
        const { row, col } = consistency.worstCell;
        // Encontrar la celda visual. row+1 (thead), col+1 (primera col con nombres)
        // Pero j > i son inputs, j < i son celdas con id ahp_j_i
        if (row < col) {
            const input = tableMatrix.querySelector(`tr:nth-child(${row+1}) td:nth-child(${col+2})`);
            if (input) input.classList.add('inconsistent-cell');
        } else {
            const cell = document.getElementById(`ahp_${row}_${col}`);
            if (cell) cell.parentElement.classList.add('inconsistent-cell');
        }
    }
}
// La función showToast está definida globalmente en auth.js
// No se redefine aquí para evitar conflictos

const _animStyle = document.createElement('style');
_animStyle.innerHTML = `
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;
document.head.appendChild(_animStyle);

function iniciarSSE() {
    const ev = new EventSource('http://localhost:3000/api/ciudades/stream');
    ev.onmessage = (e) => {
        ciudades = JSON.parse(e.data);
        aplicarFiltros(); 
    };
}

// Event Listeners
if (slider) {
    slider.addEventListener('input', () => {
        if (etiquetaPrecio) etiquetaPrecio.textContent = `${slider.value}€`;
        aplicarFiltros();
    });
}

if (selectorAmbiente) {
    selectorAmbiente.addEventListener('change', aplicarFiltros);
}

// Inicialización
cargarDatos().then(() => iniciarSSE());

// --- LÓGICA DEL FORMULARIO DE COMUNIDAD ---
const formNuevaCiudad = document.getElementById('formNuevaCiudad');
const formFeedback = document.getElementById('form-feedback');

if (formNuevaCiudad) {
    formNuevaCiudad.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Construir objeto con datos adaptados al schema actual de CiudadSchema
        const alquiler = Number(document.getElementById('f_presupuesto').value) * 0.7; // aprox. 70% alquiler
        const ocio     = Number(document.getElementById('f_presupuesto').value) * 0.3; // aprox. 30% ocio
        const lat = Number(document.getElementById('f_lat').value) || 40.4168;
        const lng = Number(document.getElementById('f_lng').value) || -3.7038;

        const nuevaCiudad = {
            nombre:       document.getElementById('f_nombre').value,
            tipoAmbiente: document.getElementById('f_ambiente').value,
            historia:     document.getElementById('f_historia').value,
            alojamiento:  document.getElementById('f_alojamiento').value,
            metricas: {
                seguridad:          Number(document.getElementById('f_seguridad').value),
                costeAlquilerMedio: Math.round(alquiler),
                costeOcioMedio:     Math.round(ocio),
                ambienteNocturno:   Number(document.getElementById('f_ocio').value),
                calidadTransporte:  3,
                calidadAcademica:   3,
                conectividad:       3,
                turismo:            3
            },
            coordenadas: {
                type: 'Point',
                coordinates: [lng, lat]
            }
        };
        
        try {
            const respuesta = await fetch('http://localhost:3000/api/ciudades', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(nuevaCiudad)
            });
            
            if (respuesta.ok) {
                if (formFeedback) {
                    formFeedback.textContent = "¡Ciudad añadida con éxito! Gracias por tu aportación.";
                    formFeedback.className = "feedback-msg feedback-success";
                }
                formNuevaCiudad.reset(); // Limpiar el formulario
                
                // Ocultar mensaje después de unos segundos
                setTimeout(() => {
                    if (formFeedback) formFeedback.textContent = "";
                }, 5000);
            } else {
                throw new Error("Error en la respuesta del servidor");
            }
        } catch (error) {
            console.error("Error enviando nueva ciudad:", error);
            if (formFeedback) {
                formFeedback.textContent = "Hubo un problema al añadir la ciudad. Revisa tu conexión.";
                formFeedback.className = "feedback-msg feedback-error";
            }
        }
    });
}