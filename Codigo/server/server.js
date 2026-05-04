const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const app = express();

// CORS: Permitir todos los orígenes (incluido null de file://)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Servir archivos estáticos (html, css, js)
app.use(express.static(path.join(__dirname, '..')));
app.use('/info', express.static(path.join(__dirname, '../info')));
app.use('/img', express.static(path.join(__dirname, '../img')));

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/infuni')
    .then(() => console.log('✅ Conectado a MongoDB (Base de datos: infuni)'))
    .catch(err => console.error('❌ Error de conexión:', err));

// --- MODELOS MONGODB ---

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
        turismo: Number,
        gastronomia: Number
    },
    etiquetas: [String],
    tipoAmbiente: String,
    coordenadas: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
    },
    valoracionMedia: { type: Number, default: 0 },
    jsonRef: String,
    paisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pais' },
    // Campos extra de SIWEB (compatibilidad)
    historia: String,
    alojamiento: String,
    barrios: String,
    imagenes: [String]
});

// Índice geoespacial para búsquedas
CiudadSchema.index({ coordenadas: '2dsphere' });

// Virtual para presupuesto (suma de alquiler + ocio)
CiudadSchema.virtual('presupuesto').get(function() {
    if (!this.metricas) return 0;
    return (this.metricas.costeAlquilerMedio || 0) + (this.metricas.costeOcioMedio || 0);
});

CiudadSchema.set('toJSON', { virtuals: true });
CiudadSchema.set('toObject', { virtuals: true });

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
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, 
    tipoPerfil: String,
    nacionalidad: String,
    idioma: String,
    ciudadesGuardadas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad' }],
    paisesRelacionados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pais' }],
    fechaRegistro: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Relación virtual: Un usuario TIENE muchas búsquedas
UsuarioSchema.virtual('busquedas', {
    ref: 'Busqueda',
    localField: '_id',
    foreignField: 'usuarioId'
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
    conectividad: { type: Number, default: 1 },
    asequibilidad: { type: Number, default: 1 },
    fecha: { type: Date, default: Date.now }
});

const OpinionSchema = new mongoose.Schema({
    categoria: { type: String, default: 'general' },
    puntuacion: { type: Number, required: true, min: 1, max: 5 },
    texto_opinion: { type: String, required: true },
    id_usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    id_ciudad: { type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad', required: true },
    fecha_publicacion: { type: Date, default: Date.now },

    likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
    respuestas: [{
        texto_respuesta: { type: String, required: true },
        id_usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
        // null = respuesta de primer nivel (a la opinión); ObjectId = respuesta a otra respuesta
        parent_id: { type: mongoose.Schema.Types.ObjectId, default: null },
        fecha: { type: Date, default: Date.now },
        likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
        dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }]
    }]
});

const Pais = mongoose.model('Pais', PaisSchema, 'paises');
const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'ciudades');
const Usuario = mongoose.model('Usuario', UsuarioSchema, 'usuarios');
const Busqueda = mongoose.model('Busqueda', BusquedaSchema, 'busquedas');
const Opinion = mongoose.model('Opinion', OpinionSchema, 'resenas');
const Universidad = mongoose.model('Universidad', UniversidadSchema, 'universidades');
const Sitio = mongoose.model('Sitio', SitioSchema, 'sitios');

// --- LÓGICA DE TIEMPO REAL (SSE) ---
const clientesSSE = new Set();

app.get('/api/ciudades/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clientesSSE.add(res);

    // Enviar datos actuales al conectar
    enviarActualizacion(res);

    req.on('close', () => clientesSSE.delete(res));
});

async function enviarActualizacion(res) {
    const ciudades = await Ciudad.find();
    res.write(`data: ${JSON.stringify(ciudades)}\n\n`);
}

// Esta función sustituye al .watch()
async function notificarCambiosGlobal() {
    const ciudades = await Ciudad.find();
    const payload = `data: ${JSON.stringify(ciudades)}\n\n`;
    clientesSSE.forEach(c => c.write(payload));
}

// --- RUTAS API ---

// Ruta raiz -> index.html
app.get('/', (req, res) => {
    res.redirect('/html/index.html');
});

app.get('/api/ciudades', async (req, res) => {
    try {
        const lista = await Ciudad.find();
        res.json(lista);
    } catch (err) { res.status(500).json(err); }
});

app.get('/api/ciudades/:id', async (req, res) => {
    try {
        const ciudad = await Ciudad.findById(req.params.id).populate('paisId');
        if (!ciudad) return res.status(404).json({ error: "Ciudad no encontrada" });
        
        const resp = ciudad.toObject();

        // --- ESTRUCTURA RELACIONAL ---
        // Cargamos los datos vinculados desde sus colecciones
        const [universidades, sitios] = await Promise.all([
            Universidad.find({ ciudadId: req.params.id }),
            Sitio.find({ ciudadId: req.params.id })
        ]);

        resp.universidades = universidades;
        resp.sitios = sitios;

        // --- MERGE DE DATOS ESTÁTICOS DEL JSON DE INFO/ ---
        // Buscamos el JSON por jsonRef (nombre normalizado) o por nombre de ciudad
        const refKey = resp.jsonRef || resp.nombre?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const jsonPath = path.join(__dirname, '../info', `${refKey}.json`);

        if (refKey && fs.existsSync(jsonPath)) {
            try {
                const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

                // Enriquecer con campos del JSON si MongoDB no los tiene ya
                if (!resp.historia    && jsonData.historia)    resp.historia    = jsonData.historia;
                if (!resp.alojamiento && jsonData.alojamiento) resp.alojamiento = jsonData.alojamiento;
                if (!resp.barrios     && jsonData.barrios)     resp.barrios     = jsonData.barrios;
                if (!resp.imagenes?.length && jsonData.imagenes?.length) resp.imagenes = jsonData.imagenes;

                // Etiquetas: siempre las tomamos del JSON (más descriptivas)
                if (jsonData.etiquetas) resp.etiquetas = jsonData.etiquetas;

                // Universidades: si MongoDB no tiene, usar las del JSON
                if (resp.universidades.length === 0 && jsonData.universidades?.length) {
                    resp.universidades = jsonData.universidades;
                }

                // Sitios: si MongoDB no tiene, usar los del JSON
                if (resp.sitios.length === 0 && jsonData.sitios?.length) {
                    resp.sitios = jsonData.sitios;
                }
            } catch (jsonErr) {
                console.warn(`⚠️  No se pudo leer ${refKey}.json:`, jsonErr.message);
            }
        }

        res.json(resp);
    } catch (err) { res.status(500).json(err); }
});


// --- RUTAS DE USUARIO Y LOGIN ---

app.post('/api/registro', async (req, res) => {
    try {
        const { nombre, apellidos, email, password } = req.body;
        if (!nombre || !email || !password) return res.status(400).json({ error: "Faltan campos obligatorios" });
        
        const existe = await Usuario.findOne({ email });
        if (existe) return res.status(400).json({ error: "El email ya está registrado" });

        const nuevoUsuario = new Usuario({ nombre, apellidos, email, password });
        await nuevoUsuario.save();
        res.status(201).json({ mensaje: "Usuario registrado con éxito" });
    } catch (err) {
        res.status(500).json({ error: "Error interno al registrar." });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Falta email o contraseña" });
        
        const usuario = await Usuario.findOne({ email: email });
        if (!usuario) {
            return res.status(401).json({ error: "El email no está registrado." });
        }
        
        // Comprobación Mínima (Normalmente aquí va Bcrypt)
        if (usuario.password !== password) {
            return res.status(401).json({ error: "Contraseña incorrecta." });
        }

        res.json(usuario);
    } catch (err) { 
        res.status(500).json({ error: "Error en el servidor" }); 
    }
});

app.get('/api/usuarios/:id', async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.params.id)
            .populate('ciudadesGuardadas')
            .populate('busquedas')
            .populate('paisesRelacionados');
        
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
        
        // Transformar para mantener compatibilidad con el front (añadiendo el objeto .pesos virtualmente)
        const userObj = usuario.toObject();
        // Mapeamos ciudadesGuardadas a ciudadesFavoritas para el FRONT original
        userObj.ciudadesFavoritas = userObj.ciudadesGuardadas;
        if (userObj.busquedas) {
            userObj.busquedas = userObj.busquedas.map(b => ({
                ...b,
                pesos: {
                    transporte: b.transporte,
                    ocio: b.ocio,
                    ocioNocturno: b.ocioNocturno,
                    seguridad: b.seguridad,
                    calidadAcademica: b.calidadAcademica,
                    conectividad: b.conectividad ?? 1,
                    asequibilidad: b.asequibilidad ?? 1
                }
            }));
        }
        
        res.json(userObj);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Error de servidor al cargar perfil" }); 
    }
});

// Ruta para proponer una nueva ciudad (Verificación vía "email")
app.post('/api/ciudades', async (req, res) => {
    try {
        const ciudadPropuesta = req.body;
        
        // Simulación de envío de correo corporativo
        console.log("--------------------------------------------------");
        console.log("📧 NUEVA PROPUESTA DE CIUDAD RECIBIDA");
        console.log("Destinatario: verificacion@infuni.com");
        console.log("Asunto: Verificación de veracidad - " + ciudadPropuesta.nombre);
        console.log("Cuerpo del mensaje:");
        console.log(JSON.stringify(ciudadPropuesta, null, 2));
        console.log("--------------------------------------------------");

        res.status(202).json({ 
            mensaje: "Propuesta enviada correctamente al equipo de verificación corporativa.",
            estado: "Pendiente de revisión"
        });
    } catch (err) { 
        res.status(400).json({ error: "Error al procesar la propuesta de ciudad." }); 
    }
});

app.delete('/api/ciudades/:id', async (req, res) => {
    try {
        await Ciudad.findByIdAndDelete(req.params.id);
        res.json({ mensaje: "Eliminado" });
        notificarCambiosGlobal(); // <--- Notificamos manualmente
    } catch (err) { res.status(500).json(err); }
});

// --- RUTAS DE OPINIONES ---

// Obtener todas las opiniones (para el foro general)
app.get('/api/opiniones', async (req, res) => {
    try {
        const ops = await Opinion.find()
            .populate('id_usuario', 'nombre apellidos')
            .populate('id_ciudad', 'nombre pais')
            .populate('respuestas.id_usuario', 'nombre apellidos')
            .sort({ fecha_publicacion: -1 })
            .limit(20);
        res.json(ops);
    } catch (err) { res.status(500).json({ error: 'Error cargando foro' }); }
});

// Obtener opiniones de una ciudad
app.get('/api/opiniones/:ciudadId', async (req, res) => {
    try {
        const ops = await Opinion.find({ id_ciudad: req.params.ciudadId })
            .populate('id_usuario', 'nombre apellidos')
            .sort({ fecha_publicacion: -1 })
            .limit(10);
        res.json(ops);
    } catch (err) { res.status(500).json({ error: 'Error cargando opiniones' }); }
});

// Crear nueva opinión
app.post('/api/opiniones', async (req, res) => {
    try {
        const { texto, valoracion, ciudadId, usuarioId, categoria } = req.body;
        
        if (!texto || !valoracion || !ciudadId) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        // Validación de IDs para evitar CastErrors
        if (!mongoose.Types.ObjectId.isValid(ciudadId)) {
            return res.status(400).json({ error: 'ID de ciudad no válido' });
        }

        if (!usuarioId || !mongoose.Types.ObjectId.isValid(usuarioId)) {
            return res.status(401).json({ error: 'Debes estar registrado para publicar una opinión.' });
        }

        const usuarioExiste = await Usuario.findById(usuarioId);
        if (!usuarioExiste) {
            return res.status(401).json({ error: 'Usuario no encontrado o sesión no válida.' });
        }

        const nuevaOpinion = new Opinion({ 
            texto_opinion: texto, 
            puntuacion: Number(valoracion), 
            id_ciudad: ciudadId, 
            id_usuario: usuarioId,
            categoria: categoria || 'General'
        });
        await nuevaOpinion.save();

        // Recalcular valoración media de la ciudad automáticamente
        const todasOps = await Opinion.find({ id_ciudad: ciudadId });
        const media = todasOps.reduce((acc, op) => acc + op.puntuacion, 0) / todasOps.length;
        await Ciudad.findByIdAndUpdate(ciudadId, { valoracionMedia: Math.round(media * 10) / 10 });

        res.status(201).json({ mensaje: '¡Opinión publicada con éxito!', valoracionMedia: media.toFixed(1) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar la opinión' });
    }
});

// Añadir respuesta a una opinión (o a otra respuesta si se pasa parentId)
app.post('/api/opiniones/:id/respuestas', async (req, res) => {
    try {
        const { texto, usuarioId, parentId } = req.body;
        const opinionId = req.params.id;

        if (!texto || !usuarioId) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const opinion = await Opinion.findById(opinionId);
        if (!opinion) return res.status(404).json({ error: 'Opinión no encontrada' });

        // Si parentId viene, validar que esa respuesta exista en la opinión
        if (parentId) {
            if (!mongoose.Types.ObjectId.isValid(parentId)) {
                return res.status(400).json({ error: 'parentId no válido' });
            }
            const padre = opinion.respuestas.id(parentId);
            if (!padre) return res.status(404).json({ error: 'Respuesta padre no encontrada' });
        }

        opinion.respuestas.push({
            texto_respuesta: texto,
            id_usuario: usuarioId,
            parent_id: parentId || null
        });

        await opinion.save();
        res.status(201).json({ mensaje: 'Respuesta añadida con éxito' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al añadir respuesta' });
    }
});

// Like/dislike sobre una opinión o sobre una respuesta concreta.
// Body: { tipo: 'like' | 'dislike', usuarioId, respuestaId? }
// Comportamiento estilo YouTube: toggle del mismo voto, switch del contrario.
app.post('/api/opiniones/:id/voto', async (req, res) => {
    try {
        const { tipo, usuarioId, respuestaId } = req.body;
        const opinionId = req.params.id;

        if (!['like', 'dislike'].includes(tipo)) {
            return res.status(400).json({ error: 'Tipo de voto no válido' });
        }
        if (!usuarioId || !mongoose.Types.ObjectId.isValid(usuarioId)) {
            return res.status(401).json({ error: 'Debes iniciar sesión para votar.' });
        }

        const opinion = await Opinion.findById(opinionId);
        if (!opinion) return res.status(404).json({ error: 'Opinión no encontrada' });

        // Determinar el "objetivo": opinión o respuesta concreta dentro de respuestas[]
        let target = opinion;
        if (respuestaId) {
            if (!mongoose.Types.ObjectId.isValid(respuestaId)) {
                return res.status(400).json({ error: 'respuestaId no válido' });
            }
            target = opinion.respuestas.id(respuestaId);
            if (!target) return res.status(404).json({ error: 'Respuesta no encontrada' });
        }

        // Garantizar que existen los arrays incluso en datos legacy
        if (!Array.isArray(target.likes))    target.likes    = [];
        if (!Array.isArray(target.dislikes)) target.dislikes = [];

        const uid = String(usuarioId);
        const yaLike    = target.likes.some(u => String(u) === uid);
        const yaDislike = target.dislikes.some(u => String(u) === uid);

        // pull() mantiene el tracking de Mongoose para subdocumentos
        target.likes.pull(usuarioId);
        target.dislikes.pull(usuarioId);

        // Aplicar nuevo voto solo si no era el mismo (toggle)
        let miVoto = null;
        if (tipo === 'like' && !yaLike) {
            target.likes.push(usuarioId);
            miVoto = 'like';
        } else if (tipo === 'dislike' && !yaDislike) {
            target.dislikes.push(usuarioId);
            miVoto = 'dislike';
        }

        // Asegurar que el cambio en el subdocumento se persista
        if (respuestaId) opinion.markModified('respuestas');

        await opinion.save();

        res.json({
            likes:    target.likes.length,
            dislikes: target.dislikes.length,
            miVoto
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al registrar el voto' });
    }
});

// --- RUTAS DE BÚSQUEDAS GUARDADAS ---

// Guardar nueva búsqueda
app.post('/api/usuarios/:id/busquedas', async (req, res) => {
    try {
        const { nombre, rol, pesos } = req.body;
        const usuarioId = req.params.id;
        
        const nuevaBusqueda = new Busqueda({
            usuarioId,
            nombre,
            rol,
            transporte: pesos.transporte,
            ocio: pesos.ocio,
            ocioNocturno: pesos.ocioNocturno,
            seguridad: pesos.seguridad,
            calidadAcademica: pesos.calidadAcademica,
            conectividad: pesos.conectividad ?? 1,
            asequibilidad: pesos.asequibilidad ?? 1
        });

        await nuevaBusqueda.save();
        
        // Devolver todas las búsquedas del usuario actualizadas
        const todas = await Busqueda.find({ usuarioId }).sort({ fecha: -1 });
        const formateadas = todas.map(b => {
            const obj = b.toObject();
            return {
                ...obj,
                pesos: {
                    transporte: obj.transporte,
                    ocio: obj.ocio,
                    ocioNocturno: obj.ocioNocturno,
                    seguridad: obj.seguridad,
                    calidadAcademica: obj.calidadAcademica
                }
            };
        });
        
        res.status(201).json(formateadas);
    } catch (err) {
        res.status(500).json({ error: 'Error al guardar búsqueda' });
    }
});

// Eliminar búsqueda
app.delete('/api/usuarios/:id/busquedas/:busquedaId', async (req, res) => {
    try {
        await Busqueda.findByIdAndDelete(req.params.busquedaId);
        
        const todas = await Busqueda.find({ usuarioId: req.params.id }).sort({ fecha: -1 });
        const formateadas = todas.map(b => {
            const obj = b.toObject();
            return {
                ...obj,
                pesos: {
                    transporte: obj.transporte,
                    ocio: obj.ocio,
                    ocioNocturno: obj.ocioNocturno,
                    seguridad: obj.seguridad,
                    calidadAcademica: obj.calidadAcademica
                }
            };
        });

        res.json({ mensaje: 'Búsqueda eliminada', busquedas: formateadas });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar búsqueda' });
    }
});

// --- RUTA PARA AÑADIR/QUITAR FAVORITOS ---
app.post('/api/usuarios/:id/favorito', async (req, res) => {
    try {
        const { ciudadId } = req.body;
        const usuario = await Usuario.findById(req.params.id);
        
        if (!usuario) {
            console.warn(`⚠️ Intento de favorito fallido: Usuario ${req.params.id} no existe en la BD. Posible sesión huérfana.`);
            return res.status(404).json({ error: 'Usuario no encontrado. Por favor, reinicia sesión.' });
        }

        // SOLUCIÓN: Comparar como strings ya que MongoDB almacena ObjectIds
        const indice = usuario.ciudadesGuardadas.findIndex(c => c.toString() === ciudadId);
        
        if (indice !== -1) {
            usuario.ciudadesGuardadas.splice(indice, 1);
        } else {
            usuario.ciudadesGuardadas.push(ciudadId);
        }
        await usuario.save();

        res.json({
            mensaje: indice !== -1 ? 'Ciudad eliminada' : 'Ciudad añadida',
            esFavorito: indice === -1,
            favoritos: usuario.ciudadesGuardadas
        });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar favoritos' });
    }
});

// --- AQUÍ HEMOS BORRADO EL CIUDAD.WATCH() QUE DABA ERROR ---

app.listen(3000, () => {
    console.log('🚀 Servidor corriendo en http://localhost:3000');
    console.log('📂 Abriendo navegador automáticamente...');
    // Abrir el navegador con la URL del servidor (evita el problema file://)
    exec('xdg-open http://localhost:3000/html/index.html', (err) => {
        if (err) {
            console.log('ℹ️  Abre manualmente: http://localhost:3000/html/index.html');
        }
    });
});