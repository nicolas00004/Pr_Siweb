// scripts/importWikipedia.js
// Fase 2: Rellena los campos historia, descripcion de cada ciudad usando la API gratuita de Wikipedia.
// Ejecutar con: node scripts/importWikipedia.js

const mongoose = require('mongoose');
const axios = require('axios');

mongoose.connect('mongodb://localhost:27017/infuni')
    .then(() => console.log('✅ Conectado a MongoDB'))
    .catch(err => { console.error(err); process.exit(1); });

const CiudadSchema = new mongoose.Schema({ nombre: String, historia: String, descripcion: String }, { strict: false });
const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'ciudades');

// Mapa nombre ciudad → título exacto en Wikipedia
const TITULOS_WIKI = {
    'Granada':   'Granada',
    'Sevilla':   'Sevilla',
    'Madrid':    'Madrid',
    'Salamanca': 'Salamanca',
    'Valencia':  'Valencia',
    'Barcelona': 'Barcelona',
    'Málaga':    'Málaga',
    'Bilbao':    'Bilbao',
    'Zaragoza':  'Zaragoza',
    'Murcia':    'Murcia',
};

async function obtenerResumenWiki(titulo) {
    try {
        const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo)}`;
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'INFUNI-Student-Portal/1.0 (proyecto universitario SIWEB)' },
            timeout: 8000
        });
        return data.extract || null;
    } catch (err) {
        console.warn(`⚠️  No se pudo obtener Wikipedia para "${titulo}": ${err.message}`);
        return null;
    }
}

async function importarDesdeWikipedia() {
    console.log('\n🌐 Iniciando importación desde Wikipedia...\n');
    const ciudades = await Ciudad.find({});

    let actualizadas = 0;
    for (const ciudad of ciudades) {
        const titulo = TITULOS_WIKI[ciudad.nombre] || ciudad.nombre;
        console.log(`  📖 Procesando: ${ciudad.nombre} → Wikipedia: "${titulo}"`);
        
        const extracto = await obtenerResumenWiki(titulo);
        
        if (extracto) {
            // Guardar el último párrafo largo de Wikipedia como historia enciclopédica
            // Separamos en frases y nos quedamos con las primeras 5 para la historia
            const frases = extracto.split('. ');
            const historia = frases.slice(0, 5).join('. ') + '.';
            const descripcion = frases[0] + '.';

            await Ciudad.findByIdAndUpdate(ciudad._id, {
                historia: historia,
                descripcion: ciudad.descripcion || descripcion
            });
            
            console.log(`  ✅ Actualizada: historia (${historia.length} chars)`);
            actualizadas++;
        } else {
            console.log(`  ⚠️  Saltando: sin datos de Wikipedia`);
        }

        // Pausa entre requests para no saturar Wikipedia
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n🏁 Importación completada. ${actualizadas}/${ciudades.length} ciudades actualizadas.\n`);
    await mongoose.connection.close();
    process.exit(0);
}

importarDesdeWikipedia();
