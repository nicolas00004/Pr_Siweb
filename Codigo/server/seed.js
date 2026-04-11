// seed.js - Ejecuta con: node seed.js
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/bdd')
    .then(() => console.log('✅ Conectado a MongoDB para el sembrado (Seed)'))
    .catch(err => { 
        console.error('❌ Error de conexión:', err); 
        process.exit(1); 
    });

// --- MODELOS MONGODB ---

const PaisSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    transporte: { type: Number, min: 1, max: 5 },
    ocio: { type: Number, min: 1, max: 5 },
    ocioNocturno: { type: Number, min: 1, max: 5 },
    seguridad: { type: Number, min: 1, max: 5 },
    calidadAcademica: { type: Number, min: 1, max: 5 }
});

const CiudadSchema = new mongoose.Schema({
    nombre: String,
    c_postal: String,
    info: String, 
    valoracion: Number, 
    presupuesto: Number,
    ambiente: String,
    seguridad: Number,
    ocio: Number,
    descripcion: String,
    paisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pais' },
    f_registro: { type: Date, default: Date.now }
});

const UsuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellidos: { type: String },
    correo: { type: String, required: true, unique: true },
    paisesRelacionados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pais' }],
    ciudadesFavoritas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad' }]
});

const OpinionSchema = new mongoose.Schema({
    texto: { type: String, required: true },
    valoracion: { type: Number, required: true, min: 1, max: 5 },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    ciudadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad', required: true },
    fecha: { type: Date, default: Date.now }
});

const Pais = mongoose.model('Pais', PaisSchema, 'paises');
const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'ciudades');
const Usuario = mongoose.model('Usuario', UsuarioSchema, 'usuarios');
const Opinion = mongoose.model('Opinion', OpinionSchema, 'opiniones');

const ciudadesBase = [
    { 
        nombre: "Granada", presupuesto: 400, ambiente: "fiesta", seguridad: 5, ocio: 5, 
        descripcion: "Famosa por sus tapas y la Alhambra.",
        historia: "Granada fue la capital del antiguo reino nazarí y el último bastión musulmán en la península ibérica hasta 1492. Su universidad, fundada en 1531 por Carlos V, es una de las más prestigiosas e históricas de Europa.",
        alojamiento: "Es una ciudad muy asequible para estudiantes. El precio medio de una habitación ronda los 200€ al mes. Las zonas más demandadas son Pedro Antonio (mucha fiesta), Cartuja (cerco de las facultades de Humanidades) y el Realejo.",
        transporte: "La ciudad se puede recorrer andando casi entera. Dispone de una línea de metro que cruza la ciudad en menos de 30 minutos y red de autobuses universitarios muy útil.",
        barrios: "Pedro Antonio de Alarcón es el núcleo estudiantil y seguro, pero ruidoso. El Albaicín es precioso e histórico, pero a veces menos accesible. Plaza de Toros está muy bien para medicina e informática."
    },
    { 
        nombre: "Sevilla", presupuesto: 600, ambiente: "fiesta", seguridad: 4, ocio: 5, 
        descripcion: "Cultura universitaria muy activa y calurosa.",
        historia: "Una ciudad bañada por el Guadalquivir con un patrimonio abrumador (la Giralda, el Alcázar). Ciudad icónica con influencias romanas, visigodas y árabes.",
        alojamiento: "Algo más cara que Granada (rondando los 300-350€ por habitación). Los barrios de Viapol, Triana o la Macarena son muy codiciados por la comunidad erasmus.",
        transporte: "Buena red de autobuses y carril bici por toda la ciudad, siendo una de las mejores ciudades de Europa para ir en bicicleta.",
        barrios: "Triana tiene un alma castiza inigualable. Reina Mercedes es el campus principal y por ende hay un ambiente puramente universitario y económico."
    },
    { 
        nombre: "Madrid", presupuesto: 900, ambiente: "fiesta", seguridad: 4, ocio: 5, c_postal: "28001", valoracion: 4.5, 
        descripcion: "La capital ofrece infinitas posibilidades.",
        historia: "Convertida en capital por Felipe II, Madrid es hoy una de las grandes metrópolis europeas, centro financiero, cultural y universitario.",
        alojamiento: "Altamente competitivo y costoso. Habitaciones rara vez bajan de los 500-600€. Zonas como Moncloa, Malasaña o Lavapiés son muy populares.",
        transporte: "Una de las mejores redes de metro del mundo. El abono joven es prácticamente obligatorio y súper rentable.",
        barrios: "Moncloa (Ciudad Universitaria) es ideal para no viajar mucho. Malasaña es para quienes buscan vida nocturna alternativa y constante."
    },
    { 
        nombre: "Salamanca", presupuesto: 500, ambiente: "fiesta", seguridad: 5, ocio: 4, 
        descripcion: "La ciudad universitaria por excelencia en España.",
        historia: "Su universidad es la más antigua de España y una de las más antiguas de Europa, fundada en 1218.",
        alojamiento: "Precios muy asequibles. Por 250€ puedes tener una buena habitación muy cerca de tu facultad.",
        transporte: "No necesitarás transporte público. Literalmente vas andando a cualquier lado en menos de 20 minutos.",
        barrios: "El centro histórico lo es todo. Barrio del Oeste ofrece algo más urbano y bohemio con su arte callejero."
    },
    { 
        nombre: "Valencia", presupuesto: 650, ambiente: "fiesta", seguridad: 4, ocio: 4, 
        descripcion: "Sol, playa y vida muy activa con su Universidad Politécnica.",
        historia: "Fundada por los romanos, Valencia es la tercera ciudad de España y famosa por las Fallas y la Ciudad de las Artes.",
        alojamiento: "Zona de Benimaclet (muy universitaria) o Blasco Ibáñez. Habitaciones alrededor de 300-400€.",
        transporte: "Excelente sistema de tranvía, metro y el popular Valenbisi. Ciudad 100% plana, ideal para bicis y patinetes.",
        barrios: "Benimaclet y Ruzafa son muy populares (uno más estudiante, otro más hipster/ocio). Cabañal está cerca de la playa."
    }
];

async function poblarBD() {
    try {
        console.log('🧹 Limpiando colecciones...');
        await Pais.deleteMany({});
        await Ciudad.deleteMany({});
        await Usuario.deleteMany({});
        await Opinion.deleteMany({});

        // 1. Crear Países
        const paisEspana = await Pais.create({
            nombre: "España", transporte: 4, ocio: 5, ocioNocturno: 5, seguridad: 4, calidadAcademica: 4
        });
        const paisItalia = await Pais.create({
            nombre: "Italia", transporte: 3, ocio: 5, ocioNocturno: 4, seguridad: 3, calidadAcademica: 4
        });
        
        console.log('✅ Países creados.');

        // 2. Crear Ciudades asociando a España
        const ciudadesConPais = ciudadesBase.map(c => ({...c, paisId: paisEspana._id}));
        const ciudadesInsertadas = await Ciudad.insertMany(ciudadesConPais);
        console.log(`✅ ${ciudadesInsertadas.length} ciudades creadas.`);

        // 3. Crear Usuarios
        const usuario1 = await Usuario.create({
            nombre: "María", apellidos: "Pérez", correo: "maria@universidad.es",
            paisesRelacionados: [paisEspana._id, paisItalia._id],
            ciudadesFavoritas: [ciudadesInsertadas[0]._id, ciudadesInsertadas[1]._id] // Granada y Sevilla
        });
        console.log('✅ Usuario María creado con ciudades favoritas.');

        // 4. Crear Opiniones
        await Opinion.create({
            texto: "¡Granada es increíble y súper barata!", valoracion: 5,
            usuarioId: usuario1._id, ciudadId: ciudadesInsertadas[0]._id // Sobre Granada
        });
        console.log('✅ Opiniones relacionales de prueba creadas.');

    } catch (err) {
        console.error('❌ Error durante el proceso de seed:', err);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada. ¡Seed completado con las relaciones de la nueva arquitectura!');
        process.exit(0);
    }
}

poblarBD();