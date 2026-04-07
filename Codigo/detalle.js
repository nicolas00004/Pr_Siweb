const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const contenedor = document.getElementById('detalle-contenido');

async function cargarDetalle() {
    if (!id) return;
    try {
        const respuesta = await fetch(`http://localhost:3000/api/ciudades/${id}`);
        const ciudad = await respuesta.json();

        contenedor.innerHTML = `
            <div class="ficha">
                <h1>${ciudad.nombre}</h1>
                <div class="grid-info">
                    <p><strong>💶 Presupuesto:</strong> ${ciudad.presupuesto}€</p>
                    <p><strong>🛡️ Seguridad:</strong> ${"⭐".repeat(ciudad.seguridad || 0)}</p>
                    <p><strong>🎉 Ocio:</strong> ${"⭐".repeat(ciudad.ocio || 0)}</p>
                </div>
                <hr>
                <h3>Descripción y Guía:</h3>
                <p class="texto-largo">${ciudad.descripcion || "No hay detalles adicionales todavía."}</p>
            </div>
        `;
    } catch (error) {
        contenedor.innerHTML = "<h2>Error al cargar la ciudad</h2>";
    }
}

cargarDetalle();