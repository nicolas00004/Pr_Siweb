// =============================================================
//  seed.js  —  Datos de ejemplo para INFUNI (v2 — ampliado)
//  Ejecutar con:
//    docker exec -i mongorouter1 mongosh --port 27017 infuni < seed.js
// =============================================================

use infuni

// ── Limpiar colecciones ──────────────────────────────────────
db.ciudades.deleteMany({})
db.usuarios.deleteMany({})
db.resenas.deleteMany({})
db.busquedas.deleteMany({})
db.paises.deleteMany({})

print("Insertando datos de ejemplo ampliados...")

// ── PAÍSES ───────────────────────────────────────────────────
const paisEspania = db.paises.insertOne({
  nombre: "España",
  codigoISO: "ES",
  moneda: "EUR",
  idiomaOficial: "Español",
  transporte: 4.2,
  ocio: 4.5,
  ocioNocturno: 4.8,
  seguridad: 3.9,
  calidadAcademica: 3.8,
  costeVidaMedio: 3.2,
  climaMedio: "Mediterráneo"
}).insertedId

const paisFrancia = db.paises.insertOne({
  nombre: "Francia",
  codigoISO: "FR",
  moneda: "EUR",
  idiomaOficial: "Francés",
  transporte: 4.6,
  ocio: 4.3,
  ocioNocturno: 4.1,
  seguridad: 3.7,
  calidadAcademica: 4.4,
  costeVidaMedio: 4.1,
  climaMedio: "Oceánico"
}).insertedId

const paisAlemania = db.paises.insertOne({
  nombre: "Alemania",
  codigoISO: "DE",
  moneda: "EUR",
  idiomaOficial: "Alemán",
  transporte: 4.8,
  ocio: 4.0,
  ocioNocturno: 4.5,
  seguridad: 4.3,
  calidadAcademica: 4.7,
  costeVidaMedio: 3.9,
  climaMedio: "Continental"
}).insertedId

const paisItalia = db.paises.insertOne({
  nombre: "Italia",
  codigoISO: "IT",
  moneda: "EUR",
  idiomaOficial: "Italiano",
  transporte: 3.8,
  ocio: 4.6,
  ocioNocturno: 4.4,
  seguridad: 3.5,
  calidadAcademica: 4.0,
  costeVidaMedio: 3.5,
  climaMedio: "Mediterráneo"
}).insertedId

const paisPortugal = db.paises.insertOne({
  nombre: "Portugal",
  codigoISO: "PT",
  moneda: "EUR",
  idiomaOficial: "Portugués",
  transporte: 3.9,
  ocio: 4.2,
  ocioNocturno: 4.3,
  seguridad: 4.5,
  calidadAcademica: 3.6,
  costeVidaMedio: 2.8,
  climaMedio: "Mediterráneo"
}).insertedId

const paisPB = db.paises.insertOne({
  nombre: "Países Bajos",
  codigoISO: "NL",
  moneda: "EUR",
  idiomaOficial: "Neerlandés",
  transporte: 4.9,
  ocio: 4.1,
  ocioNocturno: 4.2,
  seguridad: 4.6,
  calidadAcademica: 4.5,
  costeVidaMedio: 4.3,
  climaMedio: "Oceánico"
}).insertedId

const paisRepCheca = db.paises.insertOne({
  nombre: "República Checa",
  codigoISO: "CZ",
  moneda: "CZK",
  idiomaOficial: "Checo",
  transporte: 4.3,
  ocio: 4.4,
  ocioNocturno: 4.6,
  seguridad: 4.4,
  calidadAcademica: 3.8,
  costeVidaMedio: 2.5,
  climaMedio: "Continental"
}).insertedId

const paisIrlanda = db.paises.insertOne({
  nombre: "Irlanda",
  codigoISO: "IE",
  moneda: "EUR",
  idiomaOficial: "Inglés",
  transporte: 3.7,
  ocio: 4.0,
  ocioNocturno: 4.3,
  seguridad: 4.2,
  calidadAcademica: 4.3,
  costeVidaMedio: 4.8,
  climaMedio: "Oceánico"
}).insertedId

// ── CIUDADES ─────────────────────────────────────────────────
// España
const ciudadGranada = db.ciudades.insertOne({
  nombre: "Granada",
  pais: "España",
  c_postal: "18001",
  metricas: {
    seguridad: 7.8,
    costeAlquilerMedio: 350,
    costeOcioMedio: 120,
    ambienteNocturno: 8.5,
    calidadTransporte: 6.5,
    calidadAcademica: 8.2,
    conectividad: 7.0,
    turismo: 9.0,
    gastronomia: 9.0
  },
  etiquetas: ["Erasmus", "Económica", "Fiesta", "Cultural", "Universitaria"],
  tipoAmbiente: "fiestera",
  coordenadas: { type: "Point", coordinates: [-3.5986, 37.1773] },
  valoracionMedia: 4.3,
  jsonRef: "/data/ciudades/granada.json",
  paisId: paisEspania
}).insertedId

const ciudadSevilla = db.ciudades.insertOne({
  nombre: "Sevilla",
  pais: "España",
  c_postal: "41001",
  metricas: {
    seguridad: 7.2,
    costeAlquilerMedio: 420,
    costeOcioMedio: 150,
    ambienteNocturno: 8.8,
    calidadTransporte: 7.2,
    calidadAcademica: 7.8,
    conectividad: 7.5,
    turismo: 9.3,
    gastronomia: 9.2
  },
  etiquetas: ["Erasmus", "Cultural", "Turística", "Universitaria"],
  tipoAmbiente: "cultural",
  coordenadas: { type: "Point", coordinates: [-5.9845, 37.3891] },
  valoracionMedia: 4.5,
  jsonRef: "/data/ciudades/sevilla.json",
  paisId: paisEspania
}).insertedId

const ciudadValencia = db.ciudades.insertOne({
  nombre: "Valencia",
  pais: "España",
  c_postal: "46001",
  metricas: {
    seguridad: 7.5,
    costeAlquilerMedio: 480,
    costeOcioMedio: 140,
    ambienteNocturno: 8.0,
    calidadTransporte: 7.8,
    calidadAcademica: 7.5,
    conectividad: 8.0,
    turismo: 8.8,
    gastronomia: 9.5
  },
  etiquetas: ["Erasmus", "Playa", "Cultural", "Económica", "Universitaria"],
  tipoAmbiente: "mixta",
  coordenadas: { type: "Point", coordinates: [-0.3763, 39.4699] },
  valoracionMedia: 4.4,
  jsonRef: "/data/ciudades/valencia.json",
  paisId: paisEspania
}).insertedId

const ciudadBarcelona = db.ciudades.insertOne({
  nombre: "Barcelona",
  pais: "España",
  c_postal: "08001",
  metricas: {
    seguridad: 6.5,
    costeAlquilerMedio: 850,
    costeOcioMedio: 220,
    ambienteNocturno: 9.2,
    calidadTransporte: 8.8,
    calidadAcademica: 8.5,
    conectividad: 9.0,
    turismo: 9.5,
    gastronomia: 9.0
  },
  etiquetas: ["Erasmus", "Premium", "Cosmopolita", "Playa", "Universitaria"],
  tipoAmbiente: "cosmopolita",
  coordenadas: { type: "Point", coordinates: [2.1734, 41.3851] },
  valoracionMedia: 4.2,
  jsonRef: "/data/ciudades/barcelona.json",
  paisId: paisEspania
}).insertedId

// Francia
const ciudadParis = db.ciudades.insertOne({
  nombre: "París",
  pais: "Francia",
  c_postal: "75001",
  metricas: {
    seguridad: 6.5,
    costeAlquilerMedio: 950,
    costeOcioMedio: 280,
    ambienteNocturno: 8.0,
    calidadTransporte: 9.2,
    calidadAcademica: 9.5,
    conectividad: 9.4,
    turismo: 9.8,
    gastronomia: 9.6
  },
  etiquetas: ["Erasmus", "Postgrado", "Cultural", "Premium"],
  tipoAmbiente: "cultural",
  coordenadas: { type: "Point", coordinates: [2.3522, 48.8566] },
  valoracionMedia: 4.1,
  jsonRef: "/data/ciudades/paris.json",
  paisId: paisFrancia
}).insertedId

const ciudadLyon = db.ciudades.insertOne({
  nombre: "Lyon",
  pais: "Francia",
  c_postal: "69001",
  metricas: {
    seguridad: 7.0,
    costeAlquilerMedio: 600,
    costeOcioMedio: 180,
    ambienteNocturno: 7.5,
    calidadTransporte: 8.5,
    calidadAcademica: 8.8,
    conectividad: 8.2,
    turismo: 7.8,
    gastronomia: 9.8
  },
  etiquetas: ["Erasmus", "Gastronomía", "Universitaria", "Económica"],
  tipoAmbiente: "cultural",
  coordenadas: { type: "Point", coordinates: [4.8357, 45.7640] },
  valoracionMedia: 4.0,
  jsonRef: "/data/ciudades/lyon.json",
  paisId: paisFrancia
}).insertedId

// Alemania
const ciudadBerlin = db.ciudades.insertOne({
  nombre: "Berlín",
  pais: "Alemania",
  c_postal: "10115",
  metricas: {
    seguridad: 7.0,
    costeAlquilerMedio: 750,
    costeOcioMedio: 160,
    ambienteNocturno: 9.5,
    calidadTransporte: 9.0,
    calidadAcademica: 8.9,
    conectividad: 9.2,
    turismo: 9.0,
    gastronomia: 7.0
  },
  etiquetas: ["Erasmus", "Postgrado", "Fiesta", "Cultural", "Cosmopolita"],
  tipoAmbiente: "fiestera",
  coordenadas: { type: "Point", coordinates: [13.4050, 52.5200] },
  valoracionMedia: 4.4,
  jsonRef: "/data/ciudades/berlin.json",
  paisId: paisAlemania
}).insertedId

const ciudadMunich = db.ciudades.insertOne({
  nombre: "Múnich",
  pais: "Alemania",
  c_postal: "80331",
  metricas: {
    seguridad: 8.5,
    costeAlquilerMedio: 1100,
    costeOcioMedio: 200,
    ambienteNocturno: 7.8,
    calidadTransporte: 9.2,
    calidadAcademica: 9.0,
    conectividad: 9.0,
    turismo: 8.5,
    gastronomia: 7.5
  },
  etiquetas: ["Postgrado", "Premium", "Segura", "Universitaria"],
  tipoAmbiente: "académica",
  coordenadas: { type: "Point", coordinates: [11.5820, 48.1351] },
  valoracionMedia: 4.0,
  jsonRef: "/data/ciudades/munich.json",
  paisId: paisAlemania
}).insertedId

// Italia
const ciudadRoma = db.ciudades.insertOne({
  nombre: "Roma",
  pais: "Italia",
  c_postal: "00100",
  metricas: {
    seguridad: 6.8,
    costeAlquilerMedio: 700,
    costeOcioMedio: 200,
    ambienteNocturno: 8.2,
    calidadTransporte: 7.0,
    calidadAcademica: 8.5,
    conectividad: 8.5,
    turismo: 9.9,
    gastronomia: 9.5
  },
  etiquetas: ["Erasmus", "Cultural", "Histórica", "Turística"],
  tipoAmbiente: "cultural",
  coordenadas: { type: "Point", coordinates: [12.4964, 41.9028] },
  valoracionMedia: 4.2,
  jsonRef: "/data/ciudades/roma.json",
  paisId: paisItalia
}).insertedId

const ciudadBolonia = db.ciudades.insertOne({
  nombre: "Bolonia",
  pais: "Italia",
  c_postal: "40121",
  metricas: {
    seguridad: 7.5,
    costeAlquilerMedio: 550,
    costeOcioMedio: 160,
    ambienteNocturno: 8.0,
    calidadTransporte: 7.5,
    calidadAcademica: 9.0,
    conectividad: 7.8,
    turismo: 8.0,
    gastronomia: 9.7
  },
  etiquetas: ["Erasmus", "Universitaria", "Gastronomía", "Cultural"],
  tipoAmbiente: "académica",
  coordenadas: { type: "Point", coordinates: [11.3426, 44.4949] },
  valoracionMedia: 4.3,
  jsonRef: "/data/ciudades/bolonia.json",
  paisId: paisItalia
}).insertedId

// Portugal
const ciudadLisboa = db.ciudades.insertOne({
  nombre: "Lisboa",
  pais: "Portugal",
  c_postal: "1100-001",
  metricas: {
    seguridad: 8.0,
    costeAlquilerMedio: 680,
    costeOcioMedio: 150,
    ambienteNocturno: 8.5,
    calidadTransporte: 7.5,
    calidadAcademica: 7.8,
    conectividad: 8.0,
    turismo: 9.2,
    gastronomia: 8.8
  },
  etiquetas: ["Erasmus", "Económica", "Cultural", "Universitaria", "Segura"],
  tipoAmbiente: "cultural",
  coordenadas: { type: "Point", coordinates: [-9.1393, 38.7223] },
  valoracionMedia: 4.6,
  jsonRef: "/data/ciudades/lisboa.json",
  paisId: paisPortugal
}).insertedId

// Países Bajos
const ciudadAmsterdam = db.ciudades.insertOne({
  nombre: "Ámsterdam",
  pais: "Países Bajos",
  c_postal: "1011",
  metricas: {
    seguridad: 7.8,
    costeAlquilerMedio: 1050,
    costeOcioMedio: 240,
    ambienteNocturno: 8.8,
    calidadTransporte: 9.5,
    calidadAcademica: 8.8,
    conectividad: 9.5,
    turismo: 9.3,
    gastronomia: 7.0
  },
  etiquetas: ["Postgrado", "Cosmopolita", "Cultural", "Premium"],
  tipoAmbiente: "cosmopolita",
  coordenadas: { type: "Point", coordinates: [4.9041, 52.3676] },
  valoracionMedia: 4.1,
  jsonRef: "/data/ciudades/amsterdam.json",
  paisId: paisPB
}).insertedId

// República Checa
const ciudadPraga = db.ciudades.insertOne({
  nombre: "Praga",
  pais: "República Checa",
  c_postal: "110 00",
  metricas: {
    seguridad: 8.2,
    costeAlquilerMedio: 450,
    costeOcioMedio: 100,
    ambienteNocturno: 8.8,
    calidadTransporte: 8.5,
    calidadAcademica: 8.0,
    conectividad: 8.0,
    turismo: 9.2,
    gastronomia: 7.5
  },
  etiquetas: ["Erasmus", "Económica", "Fiesta", "Cultural", "Segura"],
  tipoAmbiente: "fiestera",
  coordenadas: { type: "Point", coordinates: [14.4208, 50.0880] },
  valoracionMedia: 4.7,
  jsonRef: "/data/ciudades/praga.json",
  paisId: paisRepCheca
}).insertedId

// Irlanda
const ciudadDublin = db.ciudades.insertOne({
  nombre: "Dublín",
  pais: "Irlanda",
  c_postal: "D01",
  metricas: {
    seguridad: 7.5,
    costeAlquilerMedio: 1200,
    costeOcioMedio: 300,
    ambienteNocturno: 8.0,
    calidadTransporte: 7.0,
    calidadAcademica: 8.5,
    conectividad: 8.5,
    turismo: 8.5,
    gastronomia: 6.5
  },
  etiquetas: ["Erasmus", "Inglés", "Cultural", "Premium"],
  tipoAmbiente: "mixta",
  coordenadas: { type: "Point", coordinates: [-6.2603, 53.3498] },
  valoracionMedia: 3.9,
  jsonRef: "/data/ciudades/dublin.json",
  paisId: paisIrlanda
}).insertedId

// ── USUARIOS ─────────────────────────────────────────────────
const usuario1 = db.usuarios.insertOne({
  nombre: "Nicolás Rafael",
  apellidos: "Chelaru Tanase",
  email: "nrct0001@red.ujaen.es",
  password: "$2b$10$hashedPasswordExample1",
  tipoPerfil: "erasmus",
  nacionalidad: "Rumana",
  idioma: "es",
  ciudadesGuardadas: [ciudadGranada, ciudadSevilla, ciudadPraga],
  paisesRelacionados: [paisEspania, paisRepCheca],
  fechaRegistro: new Date("2024-09-01")
}).insertedId

const usuario2 = db.usuarios.insertOne({
  nombre: "David",
  apellidos: "Martínez Rodríguez",
  email: "mdmr00065@red.ujaen.es",
  password: "$2b$10$hashedPasswordExample2",
  tipoPerfil: "preuniversitario",
  nacionalidad: "Española",
  idioma: "es",
  ciudadesGuardadas: [ciudadGranada, ciudadParis, ciudadBarcelona],
  paisesRelacionados: [paisEspania, paisFrancia],
  fechaRegistro: new Date("2024-09-15")
}).insertedId

const usuario3 = db.usuarios.insertOne({
  nombre: "Marta",
  apellidos: "García Pérez",
  email: "mgp0022@red.ujaen.es",
  password: "$2b$10$hashedPasswordExample3",
  tipoPerfil: "erasmus",
  nacionalidad: "Española",
  idioma: "es",
  ciudadesGuardadas: [ciudadLisboa, ciudadBerlin, ciudadAmsterdam],
  paisesRelacionados: [paisPortugal, paisAlemania, paisPB],
  fechaRegistro: new Date("2024-10-01")
}).insertedId

const usuario4 = db.usuarios.insertOne({
  nombre: "Luca",
  apellidos: "Ferrari Rossi",
  email: "lfc0099@mail.unibo.it",
  password: "$2b$10$hashedPasswordExample4",
  tipoPerfil: "postgrado",
  nacionalidad: "Italiana",
  idioma: "it",
  ciudadesGuardadas: [ciudadBolonia, ciudadRoma, ciudadBerlin],
  paisesRelacionados: [paisItalia, paisAlemania],
  fechaRegistro: new Date("2024-10-10")
}).insertedId

const usuario5 = db.usuarios.insertOne({
  nombre: "Sophie",
  apellidos: "Müller Becker",
  email: "smb0045@uni-berlin.de",
  password: "$2b$10$hashedPasswordExample5",
  tipoPerfil: "postgrado",
  nacionalidad: "Alemana",
  idioma: "de",
  ciudadesGuardadas: [ciudadBerlin, ciudadMunich, ciudadAmsterdam],
  paisesRelacionados: [paisAlemania],
  fechaRegistro: new Date("2024-11-01")
}).insertedId

const usuario6 = db.usuarios.insertOne({
  nombre: "João",
  apellidos: "Silva Pereira",
  email: "jsp0077@uc.pt",
  password: "$2b$10$hashedPasswordExample6",
  tipoPerfil: "erasmus",
  nacionalidad: "Portuguesa",
  idioma: "pt",
  ciudadesGuardadas: [ciudadLisboa, ciudadSevilla, ciudadValencia],
  paisesRelacionados: [paisPortugal, paisEspania],
  fechaRegistro: new Date("2024-11-15")
}).insertedId

const usuario7 = db.usuarios.insertOne({
  nombre: "Anna",
  apellidos: "Kowalski",
  email: "akow0003@uw.edu.pl",
  password: "$2b$10$hashedPasswordExample7",
  tipoPerfil: "erasmus",
  nacionalidad: "Polaca",
  idioma: "en",
  ciudadesGuardadas: [ciudadPraga, ciudadBerlin, ciudadBolonia],
  paisesRelacionados: [paisRepCheca, paisAlemania, paisItalia],
  fechaRegistro: new Date("2025-01-10")
}).insertedId

const usuario8 = db.usuarios.insertOne({
  nombre: "Ciarán",
  apellidos: "O'Brien Murphy",
  email: "cobm0011@ucd.ie",
  password: "$2b$10$hashedPasswordExample8",
  tipoPerfil: "preuniversitario",
  nacionalidad: "Irlandesa",
  idioma: "en",
  ciudadesGuardadas: [ciudadDublin, ciudadAmsterdam, ciudadPraga],
  paisesRelacionados: [paisIrlanda, paisPB],
  fechaRegistro: new Date("2025-02-01")
}).insertedId

// ── BÚSQUEDAS AHP ────────────────────────────────────────────
db.busquedas.insertOne({
  usuarioId: usuario1,
  nombre: "Erasmus económico con vida nocturna",
  rol: "estudiante",
  transporte: 0.15,
  ocio: 0.20,
  ocioNocturno: 0.30,
  seguridad: 0.20,
  calidadAcademica: 0.15,
  ranking: [
    { idCiudad: ciudadGranada, posicion: 1, scoreAhp: 8.12 },
    { idCiudad: ciudadPraga, posicion: 2, scoreAhp: 8.05 },
    { idCiudad: ciudadSevilla, posicion: 3, scoreAhp: 7.95 },
    { idCiudad: ciudadLisboa, posicion: 4, scoreAhp: 7.80 },
    { idCiudad: ciudadParis, posicion: 5, scoreAhp: 6.80 }
  ],
  fecha: new Date("2025-01-15")
})

db.busquedas.insertOne({
  usuarioId: usuario2,
  nombre: "Ciudad para postgrado con alta calidad académica",
  rol: "postgrado",
  transporte: 0.10,
  ocio: 0.10,
  ocioNocturno: 0.05,
  seguridad: 0.25,
  calidadAcademica: 0.50,
  ranking: [
    { idCiudad: ciudadParis, posicion: 1, scoreAhp: 9.40 },
    { idCiudad: ciudadMunich, posicion: 2, scoreAhp: 9.10 },
    { idCiudad: ciudadBerlin, posicion: 3, scoreAhp: 8.95 },
    { idCiudad: ciudadAmsterdam, posicion: 4, scoreAhp: 8.80 },
    { idCiudad: ciudadBolonia, posicion: 5, scoreAhp: 8.70 }
  ],
  fecha: new Date("2025-02-01")
})

db.busquedas.insertOne({
  usuarioId: usuario3,
  nombre: "Destino seguro y bien conectado",
  rol: "estudiante",
  transporte: 0.30,
  ocio: 0.15,
  ocioNocturno: 0.10,
  seguridad: 0.35,
  calidadAcademica: 0.10,
  ranking: [
    { idCiudad: ciudadAmsterdam, posicion: 1, scoreAhp: 9.00 },
    { idCiudad: ciudadMunich, posicion: 2, scoreAhp: 8.90 },
    { idCiudad: ciudadLisboa, posicion: 3, scoreAhp: 8.50 },
    { idCiudad: ciudadPraga, posicion: 4, scoreAhp: 8.45 },
    { idCiudad: ciudadBerlin, posicion: 5, scoreAhp: 8.10 }
  ],
  fecha: new Date("2025-02-15")
})

db.busquedas.insertOne({
  usuarioId: usuario4,
  nombre: "Erasmus Italia con ambiente cultural",
  rol: "estudiante",
  transporte: 0.20,
  ocio: 0.30,
  ocioNocturno: 0.20,
  seguridad: 0.15,
  calidadAcademica: 0.15,
  ranking: [
    { idCiudad: ciudadBolonia, posicion: 1, scoreAhp: 8.60 },
    { idCiudad: ciudadRoma, posicion: 2, scoreAhp: 8.40 },
    { idCiudad: ciudadSevilla, posicion: 3, scoreAhp: 8.20 },
    { idCiudad: ciudadLyon, posicion: 4, scoreAhp: 7.90 },
    { idCiudad: ciudadValencia, posicion: 5, scoreAhp: 7.75 }
  ],
  fecha: new Date("2025-03-01")
})

db.busquedas.insertOne({
  usuarioId: usuario6,
  nombre: "Ciudades económicas para Erasmus en el sur",
  rol: "estudiante",
  transporte: 0.15,
  ocio: 0.25,
  ocioNocturno: 0.25,
  seguridad: 0.20,
  calidadAcademica: 0.15,
  ranking: [
    { idCiudad: ciudadGranada, posicion: 1, scoreAhp: 8.30 },
    { idCiudad: ciudadLisboa, posicion: 2, scoreAhp: 8.20 },
    { idCiudad: ciudadValencia, posicion: 3, scoreAhp: 8.00 },
    { idCiudad: ciudadSevilla, posicion: 4, scoreAhp: 7.90 },
    { idCiudad: ciudadBolonia, posicion: 5, scoreAhp: 7.60 }
  ],
  fecha: new Date("2025-03-20")
})

db.busquedas.insertOne({
  usuarioId: usuario7,
  nombre: "Destino fiesta y vida nocturna Europa central",
  rol: "estudiante",
  transporte: 0.10,
  ocio: 0.20,
  ocioNocturno: 0.50,
  seguridad: 0.10,
  calidadAcademica: 0.10,
  ranking: [
    { idCiudad: ciudadBerlin, posicion: 1, scoreAhp: 9.30 },
    { idCiudad: ciudadPraga, posicion: 2, scoreAhp: 9.10 },
    { idCiudad: ciudadBarcelona, posicion: 3, scoreAhp: 8.90 },
    { idCiudad: ciudadAmsterdam, posicion: 4, scoreAhp: 8.70 },
    { idCiudad: ciudadGranada, posicion: 5, scoreAhp: 8.40 }
  ],
  fecha: new Date("2025-04-01")
})

// ── RESEÑAS ──────────────────────────────────────────────────
db.resenas.insertMany([
  {
    id_ciudad: ciudadGranada,
    id_usuario: usuario1,
    categoria: "general",
    puntuacion: 5,
    texto_opinion: "Granada es perfecta para Erasmus: barata, con mucha vida y una universidad excelente. El transporte podría mejorar pero el centro es todo a pie.",
    fecha_publicacion: new Date("2025-01-20")
  },
  {
    id_ciudad: ciudadGranada,
    id_usuario: usuario2,
    categoria: "alojamiento",
    puntuacion: 4,
    texto_opinion: "Encontrar piso fue fácil y a buen precio. Zonas como el Realejo o Bib-Rambla son geniales para estudiantes.",
    fecha_publicacion: new Date("2025-01-25")
  },
  {
    id_ciudad: ciudadGranada,
    id_usuario: usuario6,
    categoria: "ocio",
    puntuacion: 5,
    texto_opinion: "Las tapas gratis con cada copa hacen que Granada sea imbatible. La calle Elvira es el epicentro de la movida.",
    fecha_publicacion: new Date("2025-02-10")
  },
  {
    id_ciudad: ciudadParis,
    id_usuario: usuario2,
    categoria: "transporte",
    puntuacion: 5,
    texto_opinion: "El metro de París es increíble, llega a todos lados. El coste de vida es alto pero la experiencia académica no tiene precio.",
    fecha_publicacion: new Date("2025-02-15")
  },
  {
    id_ciudad: ciudadParis,
    id_usuario: usuario5,
    categoria: "académico",
    puntuacion: 5,
    texto_opinion: "Estudiar en la Sorbona es un privilegio. Los recursos académicos y la red de contactos que se forma es inigualable en Europa.",
    fecha_publicacion: new Date("2025-02-20")
  },
  {
    id_ciudad: ciudadBerlin,
    id_usuario: usuario3,
    categoria: "general",
    puntuacion: 5,
    texto_opinion: "Berlín tiene una energía única. La escena artística, los clubs y la diversidad cultural hacen de ella una ciudad que nunca duerme.",
    fecha_publicacion: new Date("2025-03-01")
  },
  {
    id_ciudad: ciudadBerlin,
    id_usuario: usuario4,
    categoria: "ocio",
    puntuacion: 5,
    texto_opinion: "La vida nocturna de Berlín es legendaria. Berghain, Watergate... hay opciones para todos los gustos y el ambiente es muy tolerante.",
    fecha_publicacion: new Date("2025-03-05")
  },
  {
    id_ciudad: ciudadBerlin,
    id_usuario: usuario7,
    categoria: "alojamiento",
    puntuacion: 4,
    texto_opinion: "Encontrar piso en Berlín requiere paciencia pero los precios son razonables comparado con otras capitales. Barrios como Neukölln o Prenzlauer Berg son geniales.",
    fecha_publicacion: new Date("2025-03-10")
  },
  {
    id_ciudad: ciudadLisboa,
    id_usuario: usuario3,
    categoria: "general",
    puntuacion: 5,
    texto_opinion: "Lisboa me sorprendió gratamente. Ciudad acogedora, gente amable, comida espectacular y mucho más barata que otras capitales europeas.",
    fecha_publicacion: new Date("2025-03-15")
  },
  {
    id_ciudad: ciudadLisboa,
    id_usuario: usuario6,
    categoria: "seguridad",
    puntuacion: 5,
    texto_opinion: "De las ciudades más seguras en las que he estado. Se puede caminar de noche sin problema y el ambiente es muy tranquilo.",
    fecha_publicacion: new Date("2025-03-20")
  },
  {
    id_ciudad: ciudadPraga,
    id_usuario: usuario1,
    categoria: "general",
    puntuacion: 5,
    texto_opinion: "Praga es un descubrimiento. Bonita, musical, con mucha historia y los precios son una fracción de lo que pagas en Europa occidental.",
    fecha_publicacion: new Date("2025-03-25")
  },
  {
    id_ciudad: ciudadPraga,
    id_usuario: usuario7,
    categoria: "ocio",
    puntuacion: 5,
    texto_opinion: "La cerveza más buena y barata de Europa. Los estudiantes de Erasmus van a Praga y no quieren volver. La oferta cultural es enorme.",
    fecha_publicacion: new Date("2025-04-01")
  },
  {
    id_ciudad: ciudadBolonia,
    id_usuario: usuario4,
    categoria: "académico",
    puntuacion: 5,
    texto_opinion: "La Universidad de Bolonia es la más antigua del mundo occidental. Estudiar aquí es una experiencia única, los profesores son excelentes.",
    fecha_publicacion: new Date("2025-04-05")
  },
  {
    id_ciudad: ciudadValencia,
    id_usuario: usuario6,
    categoria: "playa",
    puntuacion: 4,
    texto_opinion: "Tener playa, buena universidad, tapas y un clima perfecto hace de Valencia una opción imbatible. La Ciudad de las Artes es espectacular.",
    fecha_publicacion: new Date("2025-04-08")
  },
  {
    id_ciudad: ciudadAmsterdam,
    id_usuario: usuario3,
    categoria: "transporte",
    puntuacion: 5,
    texto_opinion: "La bicicleta es el medio de transporte rey. Todo está a distancia de bike y el sistema de canales hace que moverte sea una experiencia en sí misma.",
    fecha_publicacion: new Date("2025-04-10")
  },
  {
    id_ciudad: ciudadAmsterdam,
    id_usuario: usuario8,
    categoria: "general",
    puntuacion: 3,
    texto_opinion: "Ámsterdam es fantástica pero muy cara. Los alquileres son prohibitivos y la búsqueda de alojamiento para estudiantes es una pesadilla.",
    fecha_publicacion: new Date("2025-04-12")
  },
  {
    id_ciudad: ciudadSevilla,
    id_usuario: usuario1,
    categoria: "cultural",
    puntuacion: 5,
    texto_opinion: "Sevilla tiene una vida cultural impresionante. La Semana Santa, la Feria de Abril... vivir aquí es una experiencia que te marca.",
    fecha_publicacion: new Date("2025-04-14")
  },
  {
    id_ciudad: ciudadRoma,
    id_usuario: usuario4,
    categoria: "turismo",
    puntuacion: 5,
    texto_opinion: "Roma es la ciudad eterna por algo. Historia en cada esquina, gastronomía increíble, aunque el transporte deja mucho que desear.",
    fecha_publicacion: new Date("2025-04-16")
  },
  {
    id_ciudad: ciudadMunich,
    id_usuario: usuario5,
    categoria: "seguridad",
    puntuacion: 5,
    texto_opinion: "Múnich es posiblemente la ciudad más segura y organizada de Europa. El transporte público es puntual al segundo. Ideal para concentrarse en el postgrado.",
    fecha_publicacion: new Date("2025-04-18")
  },
  {
    id_ciudad: ciudadDublin,
    id_usuario: usuario8,
    categoria: "académico",
    puntuacion: 4,
    texto_opinion: "Estudiar en anglófono y estar en la UE es una combinación perfecta. El coste de vida es altísimo pero la experiencia laboral posterior compensa.",
    fecha_publicacion: new Date("2025-04-20")
  }
])

print("✓ Datos de ejemplo insertados correctamente (v2 — ampliado).")
print("")
print("Resumen de colecciones:")
db.getCollectionNames().forEach(c => print("  - " + c + " (" + db[c].countDocuments() + " docs)"))
