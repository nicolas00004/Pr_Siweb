// scripts/importPresupuesto.js
// Fase 1: Datos cuantitativos reales de costes de vida para ciudades españolas.
// Fuentes: Estadísticas Numbeo 2024, INE, informes de costes Erasmus.
// Ejecutar con: node scripts/importPresupuesto.js

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/bdd')
    .then(() => console.log('✅ Conectado a MongoDB'))
    .catch(err => { console.error(err); process.exit(1); });

const CiudadSchema = new mongoose.Schema({}, { strict: false });
const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'ciudades');

// Datos curados de fuentes públicas 2024
// Presupuesto = alquiler habitación + manutención media para estudiante
const DATOS_REALES = {
    'Granada': {
        presupuesto: 420,
        seguridad: 4,
        ocio: 5,
        valoracion: 4.8,
        c_postal: '18001',
        imagen: 'https://images.unsplash.com/photo-1570698473651-b2de99bae12f?auto=format&fit=crop&q=80&w=1200', // Alhambra
        alojamiento: 'Granada es una de las ciudades más baratas de España para vivir. El precio medio de una habitación en piso compartido ronda los 180-220€ al mes. Las zonas más populares para estudiantes son Pedro Antonio de Alarcón, Cartuja (cerca del campus de Ciencias) y el Zaidín. La Residencia Califa ofrece plazas universitarias con comedor incluido por unos 450€. Se recomienda buscar piso en grupos de Telegram de la Universidad de Granada antes de llegar, ya que los mejores pisos se agotan en julio.',
        transporte: 'Granada dispone de una línea de metro (L1) que cruza la ciudad en 30 minutos desde Albolote hasta Armilla. El bono universitario de autobús cuesta 17,50€/mes y permite viajes ilimitados en toda la red urb. La bicicleta es una opción muy viada ya que la ciudad es relativamente llana en el centro. Para desplazarte al campus de Ciencias de la Salud existe lanzadera gratuita desde el centro.',
        barrios: 'Pedro Antonio de Alarcón es el epicentro de la vida estudiantil: lleno de bares de tapas, librerías universitarias y locales de ocio nocturno. El Albaicín (declarado Patrimonio de la Humanidad) ofrece una experiencia única aunque con calles en cuesta. El Zaidín y Chana son alternativas más tranquilas y económicas, ideales para quienes prefieren un ambiente más residencial. Cartuja concentra muchas facultades de Ciencias.',
    },
    'Sevilla': {
        presupuesto: 580,
        seguridad: 4,
        ocio: 5,
        valoracion: 4.6,
        c_postal: '41001',
        imagen: 'https://images.unsplash.com/photo-1559131397-f94da353f565?auto=format&fit=crop&q=80&w=1200', // Plaza de España
        alojamiento: 'Sevilla tiene precios moderados para estudiantes. Una habitación en piso compartido oscila entre 280€ y 380€ al mes. Los barrios más demandados por universitarios son Reina Mercedes (junto al campus principal), Triana y Los Remedios. El portal Idealista tiene mucha oferta y se recomienda visitar los pisos en persona antes de firmar nada. Muchos caseros piden 2 meses de fianza.',
        transporte: 'Sevilla cuenta con una red de metro (4 líneas), autobuses urbanos (TUSSAM) y el famoso carril bici, siendo una de las ciudades europeas con más kilómetros de infraestructura ciclista. La tarjeta Multiviaje permite combinar todos los transportes. El abono joven universitario ronda los 20€/mes. Muchos estudiantes se desplazan en bicicleta gracias a la escasa diferencia de altitud de la ciudad.',
        barrios: 'Reina Mercedes es el barrio universitario por excelencia, con el campus principal de la Universidad de Sevilla. Triana mantiene el espíritu auténtico sevillano con tabernas y artesanía. El centro histórico (Santa Cruz, La Macarena) tiene mucha oferta de ocio pero precios más elevados. Los Remedios es un barrio residencial tranquilo muy bien comunicado.',
    },
    'Madrid': {
        presupuesto: 950,
        seguridad: 3,
        ocio: 5,
        valoracion: 4.3,
        c_postal: '28001',
        imagen: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&q=80&w=1200', // Gran Vía
        alojamiento: 'Madrid es la ciudad más cara para estudiantes en España. Una habitación en piso compartido raramente baja de 500-600€. En zonas como Moncloa (Ciudad Universitaria) o Malasaña puede llegar a 700-800€. Los estudiantes con beca Erasmus de importe estándar (~700€) suelen buscar pisos en Carabanchel, Vallecas o Leganés, aunque la opción más común es compartir piso entre 4-5 personas. Se recomienda buscar a través de Fotocasa y reservar con 2-3 meses de antelación.',
        transporte: 'Madrid tiene una de las mejores redes de metro del mundo con 13 líneas. El Abono Joven (hasta 26 años) cuesta solo 20€/mes e incluye transporte ilimitado en toda la Comunidad de Madrid (metro, autobús, cercanías). Sin duda la inversión más inteligente del mes. El servicio de préstamo de bicicletas BiciMAD ofrece tarifas anuales asequibles para universitarios con DNI.',
        barrios: 'Moncloa y Ciudad Universitaria es el barrio universitario del norte, con todas las facultades de la UCM. Malasaña es el centro de la escena alternativa y con mucha vida nocturna accesible. Lavapiés tiene mucha diversidad cultural y precios más bajos. Chueca y Sol son perfectos para el ocio aunque con alquileres elevados. Para el bolsillo universitario, Carabanchel y Vallecas son las mejores apuestas.',
    },
    'Salamanca': {
        presupuesto: 520,
        seguridad: 5,
        ocio: 4,
        valoracion: 4.7,
        c_postal: '37001',
        imagen: 'https://images.unsplash.com/photo-1628172915850-2fb5635031b9?auto=format&fit=crop&q=80&w=1200', // Salamanca Plaza
        alojamiento: 'Salamanca es una de las ciudades más asequibles y con mejor calidad de vida estudiantil. Una habitación en piso compartido se encuentra entre 220-300€ al mes en el centro histórico. La Residencia Universitaria Alfonso IX ofrece plazas con comedor. El centro histórico es pequeño y se puede ir andando a prácticamente todas las facultades en menos de 15 minutos, por lo que la ubicación es muy relevante.',
        transporte: 'Salamanca es tan compacta que prácticamente no necesitas transporte público. El 90% de los desplazamientos se hacen a pie. Para quienes quieran salir a municipios cercanos o al entorno natural de las Arribes del Duero, existe la red de autobuses municipal (AUSA) con tarjetas de abono. La bicicleta es también una opción muy popular dado que la ciudad es completamente llana.',
        barrios: 'La Plaza Mayor es el corazón de la vida social y está a menos de 10 minutos andando de cualquier facultad. El barrio de La Prosperidad tiene buena relación calidad-precio. La zona de Gran Vía concentra muchos pubs universitarios. El barrio del Oeste tiene mucha vida alternativa y callejera. Los alrededores de la Catedral son ideales para disfrutar del entorno histórico entre clases.',
    },
    'Valencia': {
        presupuesto: 670,
        seguridad: 4,
        ocio: 4,
        valoracion: 4.5,
        c_postal: '46001',
        imagen: 'https://images.unsplash.com/photo-1534307671554-9a6d81f4d629?auto=format&fit=crop&q=80&w=1200', // Ciudad Artes Ciencias
        alojamiento: 'Valencia tiene precios razonables para estudiantes. Habitaciones entre 280-380€ en las zonas universitarias. Benimaclet es el barrio universitario por excelencia (junto al campus de la UPV), con muchos pisos modernos y una comunidad estudiantil muy activa. Ruzafa es la opción más hipster aunque un poco más cara. El portal Uniplaces tiene mucha oferta específica para Erasmus.',
        transporte: 'Valencia tiene una red de metro (9 líneas), tranvía y autobuses muy eficiente. El abono joven mensual cuesta 25€ con acceso ilimitado a todos los medios de transporte. Destaca también el servicio de bicicletas públicas Valenbisi (suscripción anual ~25€) con más de 250 estaciones. La ciudad es completamente llana, por lo que la bici es el medio de transporte favorito de los universitarios.',
        barrios: 'Benimaclet concentra la mayor densidad de universitarios de Valencia, especialmente de la UPV. Ruzafa es el barrio más moderno y con mejor oferta gastronómica y de ocio nocturno. El Cabañal está en plena regeneración y queda muy cerca de la playa (10 minutos en bici). El centro histórico (Barrio del Carmen) tiene la oferta cultural más rica con museos, galerías y locales de moda.',
    },
};

async function importarPresupuestos() {
    console.log('\n💶 Iniciando importación de datos cuantitativos reales...\n');
    const ciudades = await Ciudad.find({});

    let actualizadas = 0;
    for (const ciudad of ciudades) {
        const datos = DATOS_REALES[ciudad.nombre];
        if (datos) {
            await Ciudad.findByIdAndUpdate(ciudad._id, datos);
            console.log(`  ✅ ${ciudad.nombre}: ${datos.presupuesto}€/mes, seguridad: ${datos.seguridad}/5, ocio: ${datos.ocio}/5`);
            actualizadas++;
        } else {
            console.log(`  ⚠️  ${ciudad.nombre}: sin datos curados, se mantiene lo existente`);
        }
    }

    console.log(`\n🏁 ${actualizadas}/${ciudades.length} ciudades actualizadas con datos cuantitativos.\n`);
    await mongoose.connection.close();
    process.exit(0);
}

importarPresupuestos();
