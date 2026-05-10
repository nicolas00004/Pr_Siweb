const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Conexión a MongoDB
const MONGO_URI = 'mongodb://localhost:27017/bdd';

// Definición de Schemas (coincidiendo con server.js)
const CiudadSchema = new mongoose.Schema({
    nombre: String,
    historia: String,
    alojamiento: String,
    barrios: String,
    lat: Number,
    lng: Number,
    imagenes: [String],
    etiquetas: { type: Map, of: String }
}, { strict: false });

const UniversidadSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    descripcion: String,
    ciudadId: { type: mongoose.Schema.Types.ObjectId, required: true }
});

const SitioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    categoria: String,
    descripcion: String,
    ciudadId: { type: mongoose.Schema.Types.ObjectId, required: true }
});

const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'ciudades');
const Universidad = mongoose.model('Universidad', UniversidadSchema, 'universidades');
const Sitio = mongoose.model('Sitio', SitioSchema, 'sitios');

async function migrate() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado a MongoDB para la migración');

        const infoDir = path.join(__dirname, '../info');
        const files = fs.readdirSync(infoDir).filter(f => f.endsWith('.json'));

        for (const file of files) {
            const data = JSON.parse(fs.readFileSync(path.join(infoDir, file), 'utf8'));
            console.log(`\n📂 Procesando ${file}...`);

            // 1. Buscar ciudad por nombre
            const ciudad = await Ciudad.findOne({ nombre: new RegExp(`^${data.nombre}$`, 'i') });
            
            if (!ciudad) {
                console.warn(`⚠️ Ciudad "${data.nombre}" no encontrada en la DB. Saltando...`);
                continue;
            }

            console.log(`📍 Actualizando ciudad: ${ciudad.nombre} (${ciudad._id})`);

            // 2. Normalizar rutas de imágenes
            const imagenesNormalizadas = (data.imagenes || []).map(img => 
                img.replace(/^\.\.\/img\//, '/img/')
            );

            // 3. Actualizar campos de la ciudad
            await Ciudad.findByIdAndUpdate(ciudad._id, {
                historia: data.historia || ciudad.historia,
                alojamiento: data.alojamiento || ciudad.alojamiento,
                barrios: data.barrios || ciudad.barrios,
                lat: data.lat || ciudad.lat,
                lng: data.lng || ciudad.lng,
                imagenes: imagenesNormalizadas,
                etiquetas: data.etiquetas || {}
            });

            // 4. Limpiar datos antiguos de esta ciudad
            await Universidad.deleteMany({ ciudadId: ciudad._id });
            await Sitio.deleteMany({ ciudadId: ciudad._id });

            // 5. Insertar Universidades
            if (data.universidades && data.universidades.length > 0) {
                const unis = data.universidades.map(u => ({
                    ...u,
                    ciudadId: ciudad._id
                }));
                await Universidad.insertMany(unis);
                console.log(`🎓 Insertadas ${unis.length} universidades.`);
            }

            // 6. Insertar Sitios
            if (data.sitios && data.sitios.length > 0) {
                const sites = data.sitios.map(s => ({
                    ...s,
                    ciudadId: ciudad._id
                }));
                await Sitio.insertMany(sites);
                console.log(`📍 Insertados ${sites.length} sitios.`);
            }
        }

        console.log('\n✨ Migración completada con éxito.');
    } catch (err) {
        console.error('❌ Error durante la migración:', err);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
