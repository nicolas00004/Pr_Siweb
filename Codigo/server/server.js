const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
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

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/bdd')
    .then(() => console.log('✅ Conectado a MongoDB (Modo Standalone)'))
    .catch(err => console.error('❌ Error de conexión:', err));

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
    info: String, // info/descripcion general
    valoracion: Number, // media calculada o info fija
    // Nuevas características editoriales detalladas:
    historia: String,
    alojamiento: String, // info sobre pisos/residencias
    transporte: String,
    barrios: String, // info sobre seguridad y distritos
    // Conservamos los anteriores por compatibilidad con el front que ya funciona:
    presupuesto: Number,
    ambiente: String,
    seguridad: Number,
    ocio: Number,
    conectividad: { type: Number, default: 4 }, // 1-5 (Wi-Fi, Coworking)
    turismo: { type: Number, default: 3 }, // 1-5 (Atracciones, Monumentos)
    descripcion: String, // backup de info para front
    paisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pais' },
    f_registro: { type: Date, default: Date.now }
});

const UsuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellidos: { type: String }, // No required para dar flexibilidad
    correo: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Contraseña añadida

    // R2: Relación del usuario con países
    paisesRelacionados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pais' }],
    // Favoritos: Relación de ciudades favoritas del usuario (R1 derivado)
    ciudadesFavoritas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad' }]
});

const OpinionSchema = new mongoose.Schema({
    texto: { type: String, required: true },
    valoracion: { type: Number, required: true, min: 1, max: 5 },
    // R1: Usuario TIENE opinión
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    // R3: Opinión es SOBRE ciudad
    ciudadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad', required: true },
    fecha: { type: Date, default: Date.now }
});

const Pais = mongoose.model('Pais', PaisSchema, 'paises');
const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'ciudades');
const Usuario = mongoose.model('Usuario', UsuarioSchema, 'usuarios');
const Opinion = mongoose.model('Opinion', OpinionSchema, 'opiniones');

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
        res.json(ciudad);
    } catch (err) { res.status(500).json(err); }
});

// --- RUTAS DE USUARIO Y LOGIN ---

app.post('/api/registro', async (req, res) => {
    try {
        const { nombre, apellidos, correo, password } = req.body;
        if (!nombre || !correo || !password) return res.status(400).json({ error: "Faltan campos obligatorios" });
        
        const existe = await Usuario.findOne({ correo });
        if (existe) return res.status(400).json({ error: "El correo ya está registrado" });

        const nuevoUsuario = new Usuario({ nombre, apellidos, correo, password });
        await nuevoUsuario.save();
        res.status(201).json({ mensaje: "Usuario registrado con éxito" });
    } catch (err) {
        res.status(500).json({ error: "Error interno al registrar." });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { correo, password } = req.body;
        if (!correo || !password) return res.status(400).json({ error: "Falta correo o contraseña" });
        
        const usuario = await Usuario.findOne({ correo: correo });
        if (!usuario) {
            return res.status(401).json({ error: "El correo no está registrado." });
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
        const usuario = await Usuario.findById(req.params.id).populate('ciudadesFavoritas');
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(usuario);
    } catch (err) { 
        res.status(500).json({ error: "Error de servidor al cargar perfil" }); 
    }
});

// He añadido esta ruta POST para que puedas probar el tiempo real
app.post('/api/ciudades', async (req, res) => {
    try {
        const nueva = new Ciudad(req.body);
        await nueva.save();
        res.status(201).json(nueva);
        notificarCambiosGlobal(); // <--- Notificamos manualmente
    } catch (err) { res.status(400).json(err); }
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
            .populate('usuarioId', 'nombre apellidos')
            .populate('ciudadId', 'nombre')
            .sort({ fecha: -1 })
            .limit(20);
        res.json(ops);
    } catch (err) { res.status(500).json({ error: 'Error cargando foro' }); }
});

// Obtener opiniones de una ciudad
app.get('/api/opiniones/:ciudadId', async (req, res) => {
    try {
        const ops = await Opinion.find({ ciudadId: req.params.ciudadId })
            .populate('usuarioId', 'nombre apellidos')
            .sort({ fecha: -1 })
            .limit(10);
        res.json(ops);
    } catch (err) { res.status(500).json({ error: 'Error cargando opiniones' }); }
});

// Crear nueva opinión
app.post('/api/opiniones', async (req, res) => {
    try {
        const { texto, valoracion, ciudadId, usuarioNombre } = req.body;
        
        if (!texto || !valoracion || !ciudadId) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        // Validación de IDs para evitar CastErrors
        if (!mongoose.Types.ObjectId.isValid(ciudadId)) {
            return res.status(400).json({ error: 'ID de ciudad no válido' });
        }

        let usuarioId = req.body.usuarioId;
        if (usuarioId && !mongoose.Types.ObjectId.isValid(usuarioId)) {
            usuarioId = null; // Ignorar ID inválido y forzar anónimo
        }

        if (!usuarioId) {
            const anonimo = await Usuario.findOne({ correo: 'comunidad@infuni.es' }) || 
                           await Usuario.create({ nombre: 'Comunidad INFUNI', correo: 'comunidad@infuni.es', password: '---' });
            usuarioId = anonimo._id;
        }

        const nuevaOpinion = new Opinion({ texto, valoracion: Number(valoracion), ciudadId, usuarioId });
        await nuevaOpinion.save();

        // Recalcular valoración media de la ciudad automáticamente
        const todasOps = await Opinion.find({ ciudadId });
        const media = todasOps.reduce((acc, op) => acc + op.valoracion, 0) / todasOps.length;
        await Ciudad.findByIdAndUpdate(ciudadId, { valoracion: Math.round(media * 10) / 10 });

        res.status(201).json({ mensaje: '¡Opinión publicada con éxito!', valoracionMedia: media.toFixed(1) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar la opinión' });
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
        const indice = usuario.ciudadesFavoritas.findIndex(c => c.toString() === ciudadId);
        
        if (indice !== -1) {
            usuario.ciudadesFavoritas.splice(indice, 1);
        } else {
            usuario.ciudadesFavoritas.push(ciudadId);
        }
        await usuario.save();

        res.json({
            mensaje: indice !== -1 ? 'Ciudad eliminada' : 'Ciudad añadida',
            esFavorito: indice === -1,
            favoritos: usuario.ciudadesFavoritas
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