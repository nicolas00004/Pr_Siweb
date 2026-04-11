const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const contenedor = document.getElementById('detalle-contenido');

function obtenerImagenCiudad(nombre) {
    return `https://source.unsplash.com/800x400/?${encodeURIComponent(nombre)},cityscape`;
}

async function cargarDetalle() {
    if (!id) return;
    try {
        const respuesta = await fetch(`http://localhost:3000/api/ciudades/${id}`);
        const ciudad = await respuesta.json();

        contenedor.innerHTML = `
            <div class="ficha">
                <div class="ficha-img-header" style="background-image: url('${obtenerImagenCiudad(ciudad.nombre)}')"></div>
                <h1>${ciudad.nombre}</h1>
                <div class="grid-info">
                    <div class="info-item">
                        <span class="icon">💶</span>
                        <span class="label">Presupuesto</span>
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
                <hr>
                <h3>Información de la ciudad</h3>
                <p class="texto-largo">${ciudad.descripcion || "No hay detalles adicionales todavía."}</p>
            </div>
        `;
    } catch (error) {
        contenedor.innerHTML = "<h2>Error al cargar la ciudad</h2>";
    }
}

cargarDetalle();