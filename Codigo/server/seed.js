// seed.js - Ejecuta con: node seed.js
const mongoose = require('mongoose');

// Conexión a MongoDB (Standalone compatible)
mongoose.connect('mongodb://localhost:27017/bdd')
    .then(() => console.log('✅ Conectado a MongoDB para el sembrado (Seed)'))
    .catch(err => { 
        console.error('❌ Error de conexión:', err); 
        process.exit(1); 
    });

const CiudadSchema = new mongoose.Schema({
    nombre: String,
    presupuesto: Number,
    ambiente: String,
    seguridad: Number,
    ocio: Number,
    descripcion: String,
    f_registro: { type: Date, default: Date.now }
});

const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'ciudades');

const ciudades = [
    { nombre: "Granada", presupuesto: 400, ambiente: "fiesta", seguridad: 5, ocio: 5, descripcion: "Famosa por sus tapas y la Alhambra.", f_registro: new Date("2024-03-20") },
    { nombre: "Sevilla", presupuesto: 600, ambiente: "fiesta", seguridad: 4, ocio: 5, descripcion: "Cultura universitaria muy activa.", f_registro: new Date("2024-03-20") },
    { nombre: "Madrid", presupuesto: 900, ambiente: "fiesta", seguridad: 4, ocio: 5, descripcion: "La capital ofrece infinitas posibilidades.", f_registro: new Date("2024-03-20") },
    { nombre: "Salamanca", presupuesto: 500, ambiente: "fiesta", seguridad: 5, ocio: 4, descripcion: "La ciudad universitaria por excelencia.", f_registro: new Date("2024-03-20") },
    { nombre: "Valencia", presupuesto: 650, ambiente: "fiesta", seguridad: 4, ocio: 4, descripcion: "Sol, playa y vida muy activa.", f_registro: new Date("2024-03-20") },
    { nombre: "Bilbao", presupuesto: 750, ambiente: "tranquilo", seguridad: 5, ocio: 3, descripcion: "Ciudad moderna y muy segura.", f_registro: new Date("2024-03-20") },
    { nombre: "Barcelona", presupuesto: 950, ambiente: "fiesta", seguridad: 3, ocio: 5, descripcion: "Cosmopolita e internacional.", f_registro: new Date("2024-03-20") },
    { nombre: "Jaén", presupuesto: 350, ambiente: "tranquilo", seguridad: 5, ocio: 3, descripcion: "Barata y perfecta para estudiar.", f_registro: new Date("2024-03-20") },
    { nombre: "Zaragoza", presupuesto: 550, ambiente: "tranquilo", seguridad: 5, ocio: 3, descripcion: "Equilibrada entre calidad y coste.", f_registro: new Date("2024-03-20") },
    { nombre: "Málaga", presupuesto: 700, ambiente: "fiesta", seguridad: 4, ocio: 4, descripcion: "Clima excepcional todo el año.", f_registro: new Date("2024-03-20") }
];

async function poblarBD() {
    try {
        const existentes = await Ciudad.countDocuments();
        console.log(`📊 Documentos actuales: ${existentes}`);

        console.log('🧹 Limpiando colección...');
        await Ciudad.deleteMany({});

        const resultado = await Ciudad.insertMany(ciudades);
        console.log(`✅ Éxito: ${resultado.length} ciudades insertadas.`);
        
        const listaNombres = resultado.map(c => c.nombre).join(', ');
        console.log(`📍 Ciudades listas: ${listaNombres}`);

    } catch (err) {
        console.error('❌ Error durante el proceso de seed:', err);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada. ¡Seed completado!');
        process.exit(0);
    }
}

poblarBD();