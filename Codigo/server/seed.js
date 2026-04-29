// seed.js - Ejecuta con: node seed.js
// Pobla la base de datos 'infuni' con datos coherentes con el schema de server.js
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/infuni')
    .then(() => console.log('✅ Conectado a MongoDB para el sembrado (Base de datos: infuni)'))
    .catch(err => {
        console.error('❌ Error de conexión:', err);
        process.exit(1);
    });

// --- MODELOS MONGODB (deben coincidir exactamente con server.js) ---

const PaisSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    codigoISO: String,
    moneda: String,
    idiomaOficial: String,
    transporte: { type: Number, min: 1, max: 5 },
    ocio: { type: Number, min: 1, max: 5 },
    ocioNocturno: { type: Number, min: 1, max: 5 },
    seguridad: { type: Number, min: 1, max: 5 },
    calidadAcademica: { type: Number, min: 1, max: 5 },
    costeVidaMedio: Number,
    climaMedio: String
});

const CiudadSchema = new mongoose.Schema({
    nombre: String,
    pais: String,
    c_postal: String,
    metricas: {
        seguridad: Number,
        costeAlquilerMedio: Number,
        costeOcioMedio: Number,
        ambienteNocturno: Number,
        calidadTransporte: Number,
        calidadAcademica: Number,
        conectividad: Number,
        turismo: Number
    },
    etiquetas: [String],
    tipoAmbiente: String,
    coordenadas: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
    },
    valoracionMedia: { type: Number, default: 0 },
    jsonRef: String,
    paisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pais' },
    // Campos compatibilidad SIWEB (texto estático)
    historia: String,
    alojamiento: String,
    barrios: String,
    imagenes: [String]
});

CiudadSchema.index({ coordenadas: '2dsphere' });

const UniversidadSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    descripcion: String,
    ciudadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad', required: true }
});

const SitioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    categoria: { type: String, enum: ['ocio', 'ocioNocturno', 'cultura', 'seguridad', 'academica', 'transporte'], default: 'ocio' },
    descripcion: String,
    ciudadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad', required: true }
});

const UsuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellidos: { type: String },
    email: { type: String, required: true, unique: true },  // campo: email (no correo)
    password: { type: String, required: true },
    tipoPerfil: String,
    nacionalidad: String,
    idioma: String,
    ciudadesGuardadas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad' }],  // no ciudadesFavoritas
    paisesRelacionados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pais' }],
    fechaRegistro: { type: Date, default: Date.now }
});

const BusquedaSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    nombre: { type: String, required: true },
    rol: { type: String, enum: ['estudiante', 'trabajador'], required: true },
    transporte: { type: Number, default: 1 },
    ocio: { type: Number, default: 1 },
    ocioNocturno: { type: Number, default: 1 },
    seguridad: { type: Number, default: 1 },
    calidadAcademica: { type: Number, default: 1 },
    fecha: { type: Date, default: Date.now }
});

const OpinionSchema = new mongoose.Schema({
    categoria: { type: String, default: 'general' },
    puntuacion: { type: Number, required: true, min: 1, max: 5 },  // no 'valoracion'
    texto_opinion: { type: String, required: true },               // no 'texto'
    id_usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },  // no 'usuarioId'
    id_ciudad: { type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad', required: true },    // no 'ciudadId'
    fecha_publicacion: { type: Date, default: Date.now },           // no 'fecha'
    pesos: {
        transporte: { type: Number, default: 5 },
        ocio: { type: Number, default: 5 },
        ocioNocturno: { type: Number, default: 5 },
        seguridad: { type: Number, default: 5 },
        calidadAcademica: { type: Number, default: 5 }
    }
});

// Colecciones: deben coincidir exactamente con server.js
const Pais       = mongoose.model('Pais',       PaisSchema,       'paises');
const Ciudad     = mongoose.model('Ciudad',     CiudadSchema,     'ciudades');
const Universidad= mongoose.model('Universidad',UniversidadSchema,'universidades');
const Sitio      = mongoose.model('Sitio',      SitioSchema,      'sitios');
const Usuario    = mongoose.model('Usuario',    UsuarioSchema,    'usuarios');
const Busqueda   = mongoose.model('Busqueda',   BusquedaSchema,   'busquedas');
const Opinion    = mongoose.model('Opinion',    OpinionSchema,    'resenas'); // colección: 'resenas' (igual que server.js)

// --- DATOS DE CIUDADES (esquema nuevo con metricas anidadas) ---
const ciudadesData = [
    {
        nombre: 'Granada',
        pais: 'España',
        c_postal: '18001',
        tipoAmbiente: 'fiesta',
        jsonRef: 'granada',
        metricas: {
            seguridad: 5,
            costeAlquilerMedio: 250,
            costeOcioMedio: 150,
            ambienteNocturno: 5,
            calidadTransporte: 3,
            calidadAcademica: 5,
            conectividad: 4,
            turismo: 5
        },
        coordenadas: { type: 'Point', coordinates: [-3.7003, 37.1773] },
        historia: 'Granada fue la capital del antiguo reino nazarí y el último bastión musulmán en la península ibérica hasta 1492. Su universidad, fundada en 1531 por Carlos V, es una de las más prestigiosas e históricas de Europa.',
        alojamiento: 'Es una ciudad muy asequible para estudiantes. El precio medio de una habitación ronda los 220€ al mes. Las zonas más demandadas son Pedro Antonio (mucha fiesta), Cartuja (cerca de las facultades de Humanidades) y el Realejo.',
        barrios: 'Pedro Antonio de Alarcón es el núcleo estudiantil y seguro, pero ruidoso. El Albaicín es precioso e histórico, pero a veces menos accesible. Plaza de Toros está muy bien para medicina e informática.',
        imagenes: ['../img/granada_1.jpg', '../img/granada_2.jpg'],
        universidades: [
            { nombre: 'Universidad de Granada (UGR) - Facultad de Ciencias', descripcion: 'Uno de los campus más activos y modernos de la universidad.' },
            { nombre: 'UGR - Facultad de Derecho', descripcion: 'Ubicada en un edificio del siglo XVI en pleno centro de la ciudad.' },
            { nombre: 'Campus de Cartuja', descripcion: 'Zona que agrupa facultades de humanidades y ciencias sociales con vistas a la Sierra.' }
        ],
        sitios: [
            { nombre: 'La Alhambra', categoria: 'cultura', descripcion: 'Palacio y fortaleza nazarí, Patrimonio de la Humanidad.' },
            { nombre: 'Mirador de San Nicolás', categoria: 'cultura', descripcion: 'Vistas inigualables a la Alhambra con el atardecer.' },
            { nombre: 'Calle Elvira', categoria: 'ocio', descripcion: 'Famosa por sus bares de tapas tradicionales y ambiente bohemio.' },
            { nombre: 'Mae West', categoria: 'ocioNocturno', descripcion: 'Discoteca emblemática en el centro comercial Neptuno.' }
        ]
    },
    {
        nombre: 'Sevilla',
        pais: 'España',
        c_postal: '41001',
        tipoAmbiente: 'fiesta',
        jsonRef: 'sevilla',
        metricas: {
            seguridad: 4,
            costeAlquilerMedio: 350,
            costeOcioMedio: 200,
            ambienteNocturno: 5,
            calidadTransporte: 4,
            calidadAcademica: 4,
            conectividad: 4,
            turismo: 5
        },
        coordenadas: { type: 'Point', coordinates: [-5.9845, 37.3891] },
        historia: 'Ciudad bañada por el Guadalquivir con un patrimonio abrumador (la Giralda, el Alcázar). Ciudad icónica con influencias romanas, visigodas y árabes.',
        alojamiento: 'Algo más cara que Granada (rondando los 300-350€ por habitación). Los barrios de Viapol, Triana o la Macarena son muy codiciados por la comunidad erasmus.',
        barrios: 'Triana tiene un alma castiza inigualable. Reina Mercedes es el campus principal y por ende hay un ambiente puramente universitario y económico.',
        imagenes: ['../img/sevilla_1.jpg', '../img/sevilla_2.jpg'],
        universidades: [
            { nombre: 'Universidad de Sevilla (US)', descripcion: 'Una de las universidades más grandes de España con más de 60.000 estudiantes.' },
            { nombre: 'Universidad Pablo de Olavide', descripcion: 'Campus moderno en Montequinto, enfocado en ciencias sociales y empresariales.' }
        ],
        sitios: [
            { nombre: 'La Giralda', categoria: 'cultura', descripcion: 'Antiguo minarete almohade, símbolo de Sevilla.' },
            { nombre: 'Barrio de Triana', categoria: 'ocio', descripcion: 'Famoso por el flamenco y sus tabernas a orillas del Guadalquivir.' },
            { nombre: 'El Betis', categoria: 'ocioNocturno', descripcion: 'La calle de ocio nocturno más famosa de Sevilla.' }
        ]
    },
    {
        nombre: 'Madrid',
        pais: 'España',
        c_postal: '28001',
        tipoAmbiente: 'fiesta',
        jsonRef: 'madrid',
        metricas: {
            seguridad: 4,
            costeAlquilerMedio: 700,
            costeOcioMedio: 250,
            ambienteNocturno: 5,
            calidadTransporte: 5,
            calidadAcademica: 5,
            conectividad: 5,
            turismo: 5
        },
        coordenadas: { type: 'Point', coordinates: [-3.7038, 40.4168] },
        historia: 'Convertida en capital por Felipe II en 1561, Madrid es el corazón político y cultural de España. Es una ciudad que nunca duerme, conocida por sus museos de clase mundial y su vibrante vida callejera.',
        alojamiento: 'El mercado de vivienda es altamente competitivo. Las habitaciones en pisos compartidos oscilan entre 500€ y 800€. Moncloa y Argüelles son los barrios universitarios por excelencia.',
        barrios: 'Malasaña es el barrio hipster y creativo. Lavapiés destaca por su multiculturalidad. Salamanca es la zona más exclusiva y elegante.',
        imagenes: ['../img/madrid_1.jpg', '../img/madrid_2.jpg'],
        universidades: [
            { nombre: 'Universidad Complutense de Madrid (UCM)', descripcion: 'Una de las universidades más antiguas y grandes del mundo, situada en Ciudad Universitaria.' },
            { nombre: 'Universidad Autónoma de Madrid (UAM)', descripcion: 'Destacada por su nivel de investigación y un campus verde fuera del centro.' },
            { nombre: 'Universidad Politécnica de Madrid (UPM)', descripcion: 'Referencia nacional en ingenierías y arquitectura.' }
        ],
        sitios: [
            { nombre: 'Museo del Prado', categoria: 'cultura', descripcion: 'Uno de los museos más importantes del mundo con obras de Velázquez y Goya.' },
            { nombre: 'Parque del Retiro', categoria: 'ocio', descripcion: 'El pulmón verde de la ciudad, ideal para remar en su estanque.' },
            { nombre: 'Plaza Mayor', categoria: 'cultura', descripcion: 'Centro neurálgico del Madrid de los Austrias.' },
            { nombre: 'Teatro Kapital', categoria: 'ocioNocturno', descripcion: 'Famosa discoteca de 7 plantas en una antigua sala de cine.' }
        ]
    },
    {
        nombre: 'Salamanca',
        pais: 'España',
        c_postal: '37001',
        tipoAmbiente: 'tranquilo',
        jsonRef: 'salamanca',
        metricas: {
            seguridad: 5,
            costeAlquilerMedio: 280,
            costeOcioMedio: 150,
            ambienteNocturno: 4,
            calidadTransporte: 2,
            calidadAcademica: 5,
            conectividad: 3,
            turismo: 4
        },
        coordenadas: { type: 'Point', coordinates: [-5.6700, 40.9701] },
        historia: 'Su universidad es la más antigua de España y una de las más antiguas de Europa, fundada en 1218. La ciudad es un referente cultural y académico con una arquitectura de arenisca dorada única.',
        alojamiento: 'Precios muy asequibles. Por 250-280€ puedes tener una buena habitación muy cerca de tu facultad. La oferta de pisos compartidos es amplia.',
        barrios: 'El centro histórico lo es todo. Barrio del Oeste ofrece algo más urbano y bohemio con arte callejero. Gran Vía es el eje comercial principal.',
        imagenes: ['../img/salamanca_1.jpg', '../img/salamanca_2.jpg'],
        universidades: [
            { nombre: 'Universidad de Salamanca (USAL)', descripcion: 'Fundada en 1218, es la universidad más antigua de España y de las más antiguas del mundo.' },
            { nombre: 'Universidad Pontificia de Salamanca', descripcion: 'Especializada en teología, derecho canónico y humanidades.' }
        ],
        sitios: [
            { nombre: 'Plaza Mayor', categoria: 'cultura', descripcion: 'Una de las plazas más bellas de España, corazón de la vida salmantina.' },
            { nombre: 'Casa de las Conchas', categoria: 'cultura', descripcion: 'Edificio renacentista decorado con más de 300 conchas de vieira.' },
            { nombre: 'Café Novelty', categoria: 'ocio', descripcion: 'El café más antiguo de Salamanca, frecuentado por Unamuno.' }
        ]
    },
    {
        nombre: 'Valencia',
        pais: 'España',
        c_postal: '46001',
        tipoAmbiente: 'fiesta',
        jsonRef: 'valencia',
        metricas: {
            seguridad: 4,
            costeAlquilerMedio: 380,
            costeOcioMedio: 200,
            ambienteNocturno: 4,
            calidadTransporte: 4,
            calidadAcademica: 4,
            conectividad: 4,
            turismo: 4
        },
        coordenadas: { type: 'Point', coordinates: [-0.3763, 39.4699] },
        historia: 'Fundada por los romanos en el año 138 a.C., Valencia es la tercera ciudad de España y famosa internacionalmente por las Fallas y la Ciudad de las Artes y las Ciencias.',
        alojamiento: 'Zona de Benimaclet (muy universitaria) o Blasco Ibáñez. Habitaciones alrededor de 300-400€. Ciudad en auge con mucha demanda de alquiler.',
        barrios: 'Benimaclet y Ruzafa son muy populares (uno más estudiante, otro más hipster/ocio). El Cabañal está cerca de la playa y está en proceso de renovación.',
        imagenes: ['../img/valencia_1.jpg', '../img/valencia_2.jpg'],
        universidades: [
            { nombre: 'Universitat de València (UV)', descripcion: 'Universidad pública con más de 500 años de historia y gran variedad de titulaciones.' },
            { nombre: 'Universitat Politècnica de València (UPV)', descripcion: 'Referente en ingeniería y tecnología, con campus en Vera y Gandia.' }
        ],
        sitios: [
            { nombre: 'Ciudad de las Artes y las Ciencias', categoria: 'cultura', descripcion: 'Complejo arquitectónico futurista de Calatrava, icono de la ciudad.' },
            { nombre: 'Playa de la Malvarrosa', categoria: 'ocio', descripcion: 'La playa urbana más famosa de la ciudad, a 20 minutos en tranvía.' },
            { nombre: 'Mercado Central', categoria: 'cultura', descripcion: 'Uno de los mercados cubiertos más grandes de Europa, con más de 1.200 puestos.' },
            { nombre: 'Distrito Ruzafa', categoria: 'ocioNocturno', descripcion: 'El barrio más trendy de Valencia con bares, galerías y vida nocturna.' }
        ]
    },
    {
        nombre: 'Barcelona',
        pais: 'España',
        c_postal: '08001',
        tipoAmbiente: 'fiesta',
        jsonRef: 'barcelona',
        metricas: {
            seguridad: 3,
            costeAlquilerMedio: 800,
            costeOcioMedio: 300,
            ambienteNocturno: 5,
            calidadTransporte: 5,
            calidadAcademica: 5,
            conectividad: 5,
            turismo: 5
        },
        coordenadas: { type: 'Point', coordinates: [2.1734, 41.3851] },
        historia: 'Ciudad condal con más de 2.000 años de historia. Capital del modernismo catalán gracias a Gaudí, Barcelona es hoy uno de los hubs de innovación más importantes de Europa.',
        alojamiento: 'El mercado más caro y competitivo de España. Las habitaciones raramente bajan de 700-900€. Gràcia y Eixample son los barrios más demandados por estudiantes internacionales.',
        barrios: 'Gràcia tiene un ambiente bohemio y muy local. El Poblenou es el districto tecnológico (@22). El Eixample es el centro elegante y bien comunicado.',
        imagenes: ['../img/barcelona_1.jpg', '../img/barcelona_2.jpg'],
        universidades: [
            { nombre: 'Universitat de Barcelona (UB)', descripcion: 'La principal universidad pública de Cataluña con gran tradición investigadora.' },
            { nombre: 'Universitat Autònoma de Barcelona (UAB)', descripcion: 'Campus en Bellaterra con fuerte perfil de investigación y vida universitaria propia.' },
            { nombre: 'Universitat Pompeu Fabra (UPF)', descripcion: 'Joven y altamente valorada en ciencias sociales, humanidades y comunicación.' }
        ],
        sitios: [
            { nombre: 'La Sagrada Família', categoria: 'cultura', descripcion: 'La obra maestra inacabada de Gaudí, el monumento más visitado de España.' },
            { nombre: 'Barceloneta', categoria: 'ocio', descripcion: 'El barrio marinero con la playa más famosa de Barcelona.' },
            { nombre: 'Rambla del Poblenou', categoria: 'ocioNocturno', descripcion: 'El eje de la vida nocturna y los bares del barrio tecnológico.' },
            { nombre: 'Mercado de La Boqueria', categoria: 'cultura', descripcion: 'El mercado cubierto más famoso de España, en plena Rambla.' }
        ]
    }
];

async function poblarBD() {
    try {
        console.log('🧹 Limpiando colecciones...');
        await Promise.all([
            Pais.deleteMany({}),
            Ciudad.deleteMany({}),
            Universidad.deleteMany({}),
            Sitio.deleteMany({}),
            Usuario.deleteMany({}),
            Busqueda.deleteMany({}),
            Opinion.deleteMany({})
        ]);
        console.log('✅ Colecciones limpiadas.');

        // 1. Crear País
        const paisEspana = await Pais.create({
            nombre: 'España',
            codigoISO: 'ES',
            moneda: 'EUR',
            idiomaOficial: 'Español',
            transporte: 4,
            ocio: 5,
            ocioNocturno: 5,
            seguridad: 4,
            calidadAcademica: 4,
            costeVidaMedio: 750,
            climaMedio: 'Mediterráneo'
        });
        console.log('✅ País España creado.');

        // 2. Crear Ciudades (sin universidades y sitios que van a parte)
        const ciudadesInsertadas = [];
        for (const datos of ciudadesData) {
            const { universidades, sitios, ...dataCiudad } = datos;
            const ciudad = await Ciudad.create({ ...dataCiudad, paisId: paisEspana._id });
            ciudadesInsertadas.push({ ciudad, universidades, sitios });
        }
        console.log(`✅ ${ciudadesInsertadas.length} ciudades creadas.`);

        // 3. Crear Universidades y Sitios vinculados a cada ciudad
        for (const { ciudad, universidades, sitios } of ciudadesInsertadas) {
            for (const u of universidades) {
                await Universidad.create({ ...u, ciudadId: ciudad._id });
            }
            for (const s of sitios) {
                await Sitio.create({ ...s, ciudadId: ciudad._id });
            }
        }
        console.log('✅ Universidades y sitios creados.');

        // 4. Crear Usuarios de prueba
        const [ciudadGranada, ciudadMadrid] = ciudadesInsertadas.map(c => c.ciudad);

        const usuario1 = await Usuario.create({
            nombre: 'María',
            apellidos: 'Pérez',
            email: 'maria@universidad.es',   // campo 'email', no 'correo'
            password: '123456',
            tipoPerfil: 'estudiante',
            paisesRelacionados: [paisEspana._id],
            ciudadesGuardadas: [ciudadGranada._id, ciudadMadrid._id]  // ciudadesGuardadas, no ciudadesFavoritas
        });

        await Usuario.create({
            nombre: 'Carlos',
            apellidos: 'López',
            email: 'carlos@universidad.es',
            password: '123456',
            tipoPerfil: 'estudiante',
            ciudadesGuardadas: []
        });

        console.log('✅ Usuarios creados: maria@universidad.es / 123456, carlos@universidad.es / 123456');

        // 5. Crear Búsquedas guardadas de prueba
        await Busqueda.create({
            usuarioId: usuario1._id,
            nombre: 'Mi búsqueda: Erasmus perfecto',
            rol: 'estudiante',
            transporte: 3,
            ocio: 4,
            ocioNocturno: 2,
            seguridad: 5,
            calidadAcademica: 5
        });
        console.log('✅ Búsqueda guardada de ejemplo creada.');

        // 6. Crear Opiniones de prueba (campos del schema de server.js)
        await Opinion.create({
            texto_opinion: '¡Granada es increíble y súper barata! El ambiente estudiantil es inmejorable.',
            puntuacion: 5,
            id_usuario: usuario1._id,
            id_ciudad: ciudadGranada._id,
            pesos: { transporte: 3, ocio: 5, ocioNocturno: 5, seguridad: 4, calidadAcademica: 4 }
        });

        await Opinion.create({
            texto_opinion: 'Madrid tiene todo pero el precio del alquiler es una locura. Si puedes permitírtelo, merece cada euro.',
            puntuacion: 4,
            id_usuario: usuario1._id,
            id_ciudad: ciudadMadrid._id,
            pesos: { transporte: 5, ocio: 4, ocioNocturno: 5, seguridad: 4, calidadAcademica: 5 }
        });

        // Actualizar valoracionMedia de las ciudades con opinión
        const opsGranada = await Opinion.find({ id_ciudad: ciudadGranada._id });
        const mediaGranada = opsGranada.reduce((a, o) => a + o.puntuacion, 0) / opsGranada.length;
        await Ciudad.findByIdAndUpdate(ciudadGranada._id, { valoracionMedia: Math.round(mediaGranada * 10) / 10 });

        const opsMadrid = await Opinion.find({ id_ciudad: ciudadMadrid._id });
        const mediaMadrid = opsMadrid.reduce((a, o) => a + o.puntuacion, 0) / opsMadrid.length;
        await Ciudad.findByIdAndUpdate(ciudadMadrid._id, { valoracionMedia: Math.round(mediaMadrid * 10) / 10 });

        console.log('✅ Opiniones de prueba creadas y valoracionMedia actualizada.');

        console.log('\n🎉 ¡Seed completado con éxito!');
        console.log('📋 Resumen:');
        console.log(`   - ${ciudadesInsertadas.length} ciudades en colección 'ciudades'`);
        console.log(`   - Universidades y sitios en sus colecciones respectivas`);
        console.log(`   - 2 usuarios: maria@universidad.es y carlos@universidad.es (contraseña: 123456)`);
        console.log(`   - 2 opiniones de prueba en colección 'resenas'`);

    } catch (err) {
        console.error('❌ Error durante el proceso de seed:', err);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada.');
        process.exit(0);
    }
}

poblarBD();