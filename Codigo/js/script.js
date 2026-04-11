const contenedor = document.getElementById('contenedorCiudades');
const slider = document.getElementById('rangoPresupuesto');
const etiquetaPrecio = document.getElementById('valorPresupuesto');
const selectorAmbiente = document.getElementById('selectAmbiente');
const inputBusqueda = document.getElementById('inputBusqueda');
const btnBuscar = document.getElementById('btnBuscar');

let ciudades = [];

async function cargarDatos() {
    try {
        const r = await fetch('http://localhost:3000/api/ciudades');
        ciudades = await r.json();
        aplicarFiltros();
    } catch (e) {
        console.error("Error cargando ciudades:", e);
        contenedor.innerHTML = "<p>Error al cargar los datos. Asegúrate de que el servidor está encendido.</p>";
    }
}

function obtenerImagenCiudad(nombre) {
    // Generar imagen aleatoria basada en el nombre usando Unsplash Source
    return `https://source.unsplash.com/400x300/?${encodeURIComponent(nombre)},city`;
}

function renderizarCiudades(datos) {
    if (datos.length === 0) {
        contenedor.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <h3 style="color: var(--text-muted);">No se encontraron ciudades con estos filtros.</h3>
            </div>`;
        return;
    }

    contenedor.innerHTML = datos.map(c => `
        <article class="card">
            <div class="card-img-placeholder" style="background-image: url('${obtenerImagenCiudad(c.nombre)}')"></div>
            <div class="card-content">
                <h3>${c.nombre}</h3>
                <div class="card-info">
                    <span class="pill">💶 ${c.presupuesto}€ / mes</span>
                    <span class="pill">🎭 Ambiente: ${c.ambiente || 'N/A'}</span>
                    <span class="pill">🛡️ Seguridad: ${"⭐".repeat(c.seguridad || 0)}</span>
                </div>
                <a href="detalle.html?id=${c._id}" class="btn-ver">Ver detalles completos</a>
            </div>
        </article>
    `).join('');
}

function aplicarFiltros() {
    const textoBusqueda = inputBusqueda.value.toLowerCase().trim();
    const maxPresupuesto = parseInt(slider.value);
    const ambienteFilter = selectorAmbiente.value;

    const filtradas = ciudades.filter(c => {
        const entraPresupuesto = c.presupuesto <= maxPresupuesto;
        const entraAmbiente = ambienteFilter === 'todos' || c.ambiente === ambienteFilter;
        const entraBusqueda = c.nombre.toLowerCase().includes(textoBusqueda);
        
        return entraPresupuesto && entraAmbiente && entraBusqueda;
    });

    renderizarCiudades(filtradas);
}

function iniciarSSE() {
    const ev = new EventSource('http://localhost:3000/api/ciudades/stream');
    ev.onmessage = (e) => {
        ciudades = JSON.parse(e.data);
        aplicarFiltros(); 
    };
}

// Event Listeners
slider.addEventListener('input', () => {
    etiquetaPrecio.textContent = `${slider.value}€`;
    aplicarFiltros();
});

selectorAmbiente.addEventListener('change', aplicarFiltros);
inputBusqueda.addEventListener('input', aplicarFiltros);
btnBuscar.addEventListener('click', aplicarFiltros);

// Inicialización
cargarDatos().then(() => iniciarSSE());

// --- LÓGICA DEL FORMULARIO DE COMUNIDAD ---
const formNuevaCiudad = document.getElementById('formNuevaCiudad');
const formFeedback = document.getElementById('form-feedback');

formNuevaCiudad.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Construir objeto con datos
    const nuevaCiudad = {
        nombre: document.getElementById('f_nombre').value,
        presupuesto: Number(document.getElementById('f_presupuesto').value),
        ambiente: document.getElementById('f_ambiente').value,
        seguridad: Number(document.getElementById('f_seguridad').value),
        ocio: Number(document.getElementById('f_ocio').value),
        descripcion: document.getElementById('f_descripcion').value
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
            formFeedback.textContent = "¡Ciudad añadida con éxito! Gracias por tu aportación.";
            formFeedback.className = "feedback-msg feedback-success";
            formNuevaCiudad.reset(); // Limpiar el formulario
            
            // Ocultar mensaje después de unos segundos
            setTimeout(() => {
                formFeedback.textContent = "";
            }, 5000);
        } else {
            throw new Error("Error en la respuesta del servidor");
        }
    } catch (error) {
        console.error("Error enviando nueva ciudad:", error);
        formFeedback.textContent = "Hubo un problema al añadir la ciudad. Revisa tu conexión.";
        formFeedback.className = "feedback-msg feedback-error";
    }
});