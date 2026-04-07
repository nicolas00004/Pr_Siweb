const contenedor = document.getElementById('contenedorCiudades');
const slider = document.getElementById('rangoPresupuesto');
const etiquetaPrecio = document.getElementById('valorPresupuesto');
const selectorAmbiente = document.getElementById('selectAmbiente');
// ... (resto de tus selectores: inputBusqueda, btnBuscar)

let ciudades = [];

async function cargarDatos() {
    const r = await fetch('http://localhost:3000/api/ciudades');
    ciudades = await r.json();
    renderizarCiudades(ciudades);
}

function renderizarCiudades(datos) {
    contenedor.innerHTML = datos.map(c => `
        <article class="card">
            <h3>${c.nombre}</h3>
            <p>Presupuesto: ${c.presupuesto}€</p>
            <p>Seguridad: ${"⭐".repeat(c.seguridad || 0)}</p>
            <a href="detalle.html?id=${c._id}">Ver detalles</a>
        </article>
    `).join('');
}

function iniciarSSE() {
    const ev = new EventSource('http://localhost:3000/api/ciudades/stream');
    ev.onmessage = (e) => {
        ciudades = JSON.parse(e.data);
        renderizarCiudades(ciudades); // Se actualiza solo al cambiar Compass
    };
}

// Eventos de los filtros (slider, select, etc.) aquí...

cargarDatos().then(() => iniciarSSE());