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
    alojamiento: String,
    transporte_info: String,
    barrios: String,
    // Conservamos los anteriores por compatibilidad con el front que ya funciona:
    presupuesto: Number,
    ambiente: String,
    seguridad: Number,
    ocio: Number,
    transporte: { type: Number, default: 3 },
    ocioNocturno: { type: Number, default: 3 },
    calidadAcademica: { type: Number, default: 3 },
    conectividad: { type: Number, default: 4 }, 
    turismo: { type: Number, default: 3 },
    descripcion: String, // backup de info para front
    // Coordenadas para el mapa
    lat: { type: Number, default: 40.4168 },
    lng: { type: Number, default: -3.7038 },
    paisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pais' },
    f_registro: { type: Date, default: Date.now }
});

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
    correo: { type: String, required: true, unique: true },
    password: { type: String, required: true }, 
    ciudadesFavoritas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad' }]
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
const Busqueda = mongoose.model('Busqueda', BusquedaSchema, 'busquedas');
const Opinion = mongoose.model('Opinion', OpinionSchema, 'opiniones');
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
        
        // Buscar universidades y sitios asociados de forma paralela
        const [universidades, sitios] = await Promise.all([
            Universidad.find({ ciudadId: req.params.id }),
            Sitio.find({ ciudadId: req.params.id })
        ]);

        const resp = ciudad.toObject();
        resp.universidades = universidades;
        resp.sitios = sitios;
        
        res.json(resp);
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
        
        // Buscar búsquedas asociadas
        const busquedas = await Busqueda.find({ usuarioId: req.params.id }).sort({ fecha: -1 });
        
        // Transformar para mantener compatibilidad con el front (añadiendo el objeto .pesos virtualmente)
        const busquedasFormateadas = busquedas.map(b => {
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

        const userObj = usuario.toObject();
        userObj.busquedas = busquedasFormateadas;
        
        res.json(userObj);
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

        const usuarioId = req.body.usuarioId;
        
        if (!usuarioId || !mongoose.Types.ObjectId.isValid(usuarioId)) {
            return res.status(401).json({ error: 'Debes estar registrado para publicar una opinión.' });
        }

        const usuarioExiste = await Usuario.findById(usuarioId);
        if (!usuarioExiste) {
            return res.status(401).json({ error: 'Usuario no encontrado o sesión no válida.' });
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
            calidadAcademica: pesos.calidadAcademica
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