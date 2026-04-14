const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/bdd')
    .then(() => console.log('✅ Conectado a MongoDB para migración'))
    .catch(err => { console.error(err); process.exit(1); });

const CiudadSchema = new mongoose.Schema({}, { strict: false });
const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'ciudades');

const UsuarioSchema = new mongoose.Schema({}, { strict: false });
const Usuario = mongoose.model('Usuario', UsuarioSchema, 'usuarios');

const BusquedaSchema = new mongoose.Schema({
    usuarioId: mongoose.Schema.Types.ObjectId,
    nombre: String,
    rol: String,
    transporte: Number,
    ocio: Number,
    ocioNocturno: Number,
    seguridad: Number,
    calidadAcademica: Number,
    fecha: { type: Date, default: Date.now }
});
const Busqueda = mongoose.model('Busqueda', BusquedaSchema, 'busquedas');

async function migrar() {
    console.log('\n🎲 Iniciando aleatorización de datos para AHP...\n');

    // 1. Aleatorizar Ciudades
    const ciudades = await Ciudad.find({});
    for (const c of ciudades) {
        await Ciudad.findByIdAndUpdate(c._id, {
            seguridad: Math.floor(Math.random() * 5) + 1,
            ocio: Math.floor(Math.random() * 5) + 1,
            transporte: Math.floor(Math.random() * 5) + 1,
            ocioNocturno: Math.floor(Math.random() * 5) + 1,
            calidadAcademica: Math.floor(Math.random() * 5) + 1
        });
        console.log(`  🏙️  Ciudad ${c.nombre} actualizada.`);
    }

    // 2. Aleatorizar Usuarios (Crear una búsqueda por defecto en la nueva colección)
    const usuarios = await Usuario.find({});
    // Limpiar búsquedas previas para evitar duplicidad excesiva en semillas
    await Busqueda.deleteMany({});
    
    for (const u of usuarios) {
        const nuevaBusqueda = new Busqueda({
            usuarioId: u._id,
            nombre: "Mi búsqueda guardada",
            rol: Math.random() > 0.5 ? 'estudiante' : 'trabajador',
            transporte: Math.floor(Math.random() * 5) + 1,
            ocio: Math.floor(Math.random() * 5) + 1,
            ocioNocturno: Math.floor(Math.random() * 5) + 1,
            seguridad: Math.floor(Math.random() * 5) + 1,
            calidadAcademica: Math.floor(Math.random() * 5) + 1
        });
        await nuevaBusqueda.save();
        console.log(`  👤  Búsqueda creada para el usuario ${u.nombre}.`);
    }

    console.log('\n🏁 Migración de datos completada.\n');
    await mongoose.connection.close();
    process.exit(0);
}

migrar();
