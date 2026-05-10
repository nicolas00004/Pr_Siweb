// =============================================================
//  benchmark.js — INFUNI Sharded Cluster STRESS TEST v11 (Ramp-Up)
//  Estrategia: Carga progresiva hasta el colapso (Punto de quiebre)
// =============================================================

// ─────────────────────────────────────────────────────────────
//  CONFIGURACIÓN DEL UMBRAL CRÍTICO
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  pesos: { find: 0.15, aggregate: 0.35, insert: 0.35, update: 0.10, delete: 0.05 },
  
  // Parámetros de la prueba escalonada
  faseDuracionMs: 3000,   // Fases más cortas para mayor dinamismo
  maxNiveles: 50,         // Probamos hasta 50 niveles si el clúster aguanta
  
  // CONDICIONES DE COLAPSO (Más relajadas inicialmente)
  umbralCriticoP95Ms: 4000, 
  umbralCriticoErrorPct: 20, // 20% de errores permitidos antes de detener
};

// ESTADO DINÁMICO (Aumentará cada nivel)
let ESTADO = {
  nivelActual: 1,
  batchSize: 5,           // Empezamos con 5 docs por lote
  payloadSize: 128,       // 128 bytes (muy ligero)
  payloadStr: "X".repeat(128)
};

// ─────────────────────────────────────────────────────────────
//  UTILIDADES
// ─────────────────────────────────────────────────────────────
function randInt(a, b)   { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randFloat(a, b) { return +(a + Math.random() * (b - a)).toFixed(2); }
function pick(arr)       { return arr[Math.floor(Math.random() * arr.length)]; }

let outputBuffer = "";
function log(msg) {
  print(msg);
  outputBuffer += msg + "\n";
}

function stats(arr) {
  if (arr.length === 0) return { avg: 0, min: 0, max: 0, p50: 0, p75: 0, p95: 0, p99: 0, sum: 0, n: 0 };
  const s = [...arr].sort((a, b) => a - b);
  const pct = p => s[Math.max(0, Math.ceil(s.length * p) - 1)];
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round(sum / s.length),
    min: s[0], max: s[s.length - 1],
    p50: pct(0.50), p75: pct(0.75), p95: pct(0.95), p99: pct(0.99),
    sum, n: s.length
  };
}

function bar(value, max, width = 20) {
  const filled = max > 0 ? Math.round((value / max) * width) : 0;
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function elegirTipo() {
  const r = Math.random(); let acc = 0;
  for (const [tipo, p] of Object.entries(CONFIG.pesos)) {
    acc += p; if (r < acc) return tipo;
  }
  return "find";
}

// ─────────────────────────────────────────────────────────────
//  GENERADORES Y BANCO DE OPERACIONES (DINÁMICOS)
// ─────────────────────────────────────────────────────────────
const PAISES = ["España", "Francia", "Alemania", "Italia", "Portugal"];

function documentoPesado() {
  return {
    nombre: "STRESS_" + randInt(10000, 99999),
    pais: pick(PAISES),
    carga: ESTADO.payloadStr, // Toma la carga del nivel actual
    metricas: { seg: Math.random(), coste: Math.random() },
    _benchmark: true,
    timestamp: new Date()
  };
}

function buildOpsBank() {
  return {
    find: [{
      nombre: "find-muestreo-rapido",
      fn: () => ({ count: db.ciudades.find({_benchmark: true, pais: pick(PAISES)}).limit(5).toArray().length })
    }],
    aggregate: [{
      nombre: "agg-cruce-shards-pesado",
      fn: () => ({ count: db.ciudades.aggregate([
        { $match: { _benchmark: true } },
        { $group: { _id: "$pais", payload: { $push: "$carga" } } },
        { $limit: 10 }
      ], { allowDiskUse: true }).toArray().length })
    }],
    insert: [{
      nombre: "insert-inundacion-nivel",
      fn: () => {
        let batch = [];
        for(let i=0; i<ESTADO.batchSize; i++) batch.push(documentoPesado());
        return { affected: db.ciudades.insertMany(batch, {ordered: false}).insertedCount };
      }
    }],
    update: [{
      nombre: "update-muestreo-ligero",
      fn: () => ({ affected: db.ciudades.find({_benchmark:true, pais: pick(PAISES)}).limit(10).toArray().map(d => {
          db.ciudades.updateOne({_id: d._id}, {$set: {mod: new Date()}});
          return 1;
      }).length })
    }],
    delete: [{
      nombre: "delete-muestreo-ligero",
      fn: () => ({ affected: db.ciudades.deleteMany({_benchmark:true, pais: pick(PAISES)}).deletedCount })
    }]
  };
}

function medirUna(op) {
  try {
    const t0 = Date.now();
    const res = op.fn();
    const duracion = Date.now() - t0;
    // Capturamos el volumen de datos impactado (count o affected)
    const volumen = res.count || res.affected || 0;
    return { ok: true, ms: duracion, volumen: volumen };
  } catch (e) {
    return { ok: false, ms: 0, err: e.message, volumen: 0 };
  }
}

// ─────────────────────────────────────────────────────────────
//  EJECUCIÓN PRINCIPAL: RAMP-UP TEST
// ─────────────────────────────────────────────────────────────
log(`\n🚀 PREPARACIÓN: Limpiando datos de benchmarks anteriores...`);
db.ciudades.deleteMany({_benchmark: true});

log(`\n🚀 INICIANDO BÚSQUEDA DEL PUNTO DE QUIEBRE (RAMP-UP TEST)...`);
log(`Se aumentará la carga progresivamente hasta colapsar el clúster.\n`);

const opsLog = [];
const logPorNivel = [];
const opsBank = buildOpsBank();
let estadoCritico = false;
let razonColapso = "Prueba completada sin colapso (Límite máximo alcanzado).";
const inicioGlobal = Date.now();

while (ESTADO.nivelActual <= CONFIG.maxNiveles && !estadoCritico) {
  log(`--- [ NIVEL ${ESTADO.nivelActual} ] ---`);
  log(`↳ Batch de Inserción: ${ESTADO.batchSize} docs | Peso Doc: ${Math.round(ESTADO.payloadSize/1024)} KB`);
  
  let faseInicio = Date.now();
  let opsFase = [];
  
  // Ejecutar operaciones durante los 5 segundos de la fase
  while (Date.now() - faseInicio < CONFIG.faseDuracionMs) {
    const tipo = elegirTipo();
    const op = opsBank[tipo][0];
    const ts = Date.now() - inicioGlobal;
    
    const res = medirUna(op);
    const registro = { nivel: ESTADO.nivelActual, tipo, nombre: op.nombre, ts, ...res };
    opsFase.push(registro);
    opsLog.push(registro);
  }

  // ── ANÁLISIS DE SALUD DE LA FASE ──
  const erroresNivel = opsFase.filter(o => !o.ok).length;
  const tasaError = (erroresNivel / (opsFase.length || 1)) * 100;
  const p95Fase = stats(opsFase.filter(o => o.ok).map(o => o.ms)).p95;
  const tpsFase = (opsFase.length / (CONFIG.faseDuracionMs / 1000)).toFixed(1);

  log(`↳ TPS: ${tpsFase} | P95: ${p95Fase}ms | Errores: ${tasaError.toFixed(1)}%\n`);

  logPorNivel.push({
    nivel: ESTADO.nivelActual, batch: ESTADO.batchSize, payloadKB: Math.round(ESTADO.payloadSize/1024),
    tps: tpsFase, p95: p95Fase, errores: tasaError.toFixed(1)
  });

  // ── DETECCIÓN DE COLAPSO ──
  if (p95Fase >= CONFIG.umbralCriticoP95Ms) {
    estadoCritico = true;
    razonColapso = `COLAPSO POR LATENCIA: En el nivel ${ESTADO.nivelActual}, el P95 alcanzó ${p95Fase}ms (Umbral: ${CONFIG.umbralCriticoP95Ms}ms). La arquitectura se atascó.`;
  } else if (tasaError >= CONFIG.umbralCriticoErrorPct) {
    estadoCritico = true;
    razonColapso = `COLAPSO POR SATURACIÓN: En el nivel ${ESTADO.nivelActual}, los nodos empezaron a fallar o rechazar conexiones (Tasa de error: ${tasaError.toFixed(1)}%).`;
  }

  // ── ESCALAR DIFICULTAD (RAMP-UP) ──
  if (!estadoCritico) {
    ESTADO.nivelActual++;
    ESTADO.batchSize = Math.floor(ESTADO.batchSize * 1.50); // Escalado agresivo (50%)
    ESTADO.payloadSize = Math.floor(ESTADO.payloadSize * 1.25); 
    ESTADO.payloadStr = "X".repeat(ESTADO.payloadSize);
  }
}

const finGlobal = Date.now();

// ─────────────────────────────────────────────────────────────
//  GENERACIÓN DEL INFORME FINAL (ENRIQUECIDO)
// ─────────────────────────────────────────────────────────────
const duracionTotal = (finGlobal - inicioGlobal) / 1000;
const okOps = opsLog.filter(o => o.ok);
const globalSt = stats(okOps.map(o => o.ms));

log(`\n======================================================`);
log(`# 🚀 INFORME DE RENDIMIENTO Y ESTADO DE LA ARQUITECTURA`);
log(`======================================================\n`);

log(`## 🏗️ DIAGNÓSTICO DE ARQUITECTURA (NÚCLEO MONGODB)`);
try {
  const isMongos = db.adminCommand({ isMaster: 1 }).msg === "isdbgrid";
  log(`> **Plano de Control:** ${isMongos ? "Clúster Enrutado Distribuido (mongos)" : "Acceso Directo (mongod)"}`);

  const shardsResult = db.adminCommand({ listShards: 1 });
  const hasShards = shardsResult.shards && shardsResult.shards.length > 0;

  if (hasShards) {
    log(`\n### 🧩 Topología de los Shards (${shardsResult.shards.length} nodos activos):`);
    shardsResult.shards.forEach(s => {
      log(`- 🖥️ **${s._id}**: Conectado a \`${s.host}\``);
    });
    
    try {
      const balancerState = db.adminCommand({ balancerStatus: 1 });
      if (balancerState) log(`\n> **Estado del Balanceador (Autosharding):** \`${balancerState.mode}\``);
    } catch(e) {}
  } else {
    log(`\n*No se detectó fragmentación. La base de datos opera como nodo monolítico o Replica Set único.*`);
  }

  // --- NUEVA SECCIÓN DE VALIDACIÓN DE REPARTO ---
  try {
    const configDB = db.getSiblingDB("config");
    const dbInfo = configDB.databases.findOne({ _id: db.getName() });
    const collInfo = configDB.collections.findOne({ _id: db.getName() + ".ciudades" });

    log(`\n### ⚖️ Estado de Particionado (Scalability Check):`);
    if (dbInfo && dbInfo.partitioned) {
      log(`- ✅ Base de datos \`${db.getName()}\` tiene el sharding **habilitado**.`);
    } else {
      log(`- ⚠️ Base de datos \`${db.getName()}\` **NO** tiene el sharding habilitado. Los datos no se moverán automáticamente.`);
    }

    if (collInfo) {
      log(`- ✅ Colección \`ciudades\` está **FRAGMENTADA** (Sharded).`);
      log(`  - Clave de fragmentación: \`${JSON.stringify(collInfo.key)}\``);
      const chunksCount = configDB.chunks.countDocuments({ ns: db.getName() + ".ciudades" });
      log(`  - Distribución: \`${chunksCount}\` chunks en total.`);
    } else {
      log(`- ❌ Colección \`ciudades\` **NO** está fragmentada. Reside íntegramente en el Primary Shard.`);
    }
  } catch (e) {
     log(`\n*Nota: No se pudo verificar el estado de particionado fino (requiere permisos en config db).*`);
  }

  try {
    const collStats = db.ciudades.aggregate([{ $collStats: { storageStats: {} } }]).toArray();
    log(`\n### 📦 Distribución Física de Datos de Carga (\`infuni.ciudades\`):`);
    log(`| Componente Resolutor | Vol. Documentos | Datos (MB) | Peso de Índices (MB) | Avg Doc Size (KB) |`);
    log(`|:---|---:|---:|---:|---:|`);
    
    let totalDocsDB = 0;
    collStats.forEach(st => {
      const s = st.storageStats;
      const shardName = (st.shard) || "Nodo Único / Primario";
      const docs = s.count || 0;
      totalDocsDB += docs;
      const dataMB = s.size ? (s.size / (1024 * 1024)).toFixed(2) : "0.00";
      const idxMB = s.totalIndexSize ? (s.totalIndexSize / (1024 * 1024)).toFixed(2) : "0.00";
      const avgSize = s.avgObjSize ? (s.avgObjSize / 1024).toFixed(2) : "0.00";
      
      log(`| **${shardName}** | ${docs.toLocaleString()} docs | ${dataMB} MB | ${idxMB} MB | ${avgSize} KB |`);
    });

    if (collStats.length === 1 && hasShards) {
        log(`\n> 💡 **Explicación:** Se detectaron shards pero los datos están en uno solo. Tu arquitectura tiene el "esqueleto" distribuido pero los datos de esta colección aún son monolíticos.`);
    } else if (collStats.length > 1) {
        log(`\n> 💡 **Explicación:** ¡Éxito! Los datos están balanceados entre ${collStats.length} shards. Esto permite que el CPU y la RAM de varios servidores trabajen en paralelo.`);
    }
  } catch (e) {
    log(`\n⚠️ No se pudieron mapear los datos físicos: ${e.message}`);
  }

  try {
    log(`\n### 🔑 Optimización y Estructuras de Acceso (Índices):`);
    const indexes = db.ciudades.getIndexes();
    indexes.forEach(idx => {
      log(`- \`${idx.name}\` ➔ Atributos cubiertos: ${JSON.stringify(idx.key)}`);
    });
  } catch(e) {}
  
} catch(err) {
  log(`⚠️ **No se pudo extraer métricas profundas de la arquitectura:** ${err.message}`);
}


log(`\n## 🚨 DESEMPEÑO DEL ESTRÉS (PUNTO DE QUIEBRE)`);
log(`> **Duración del ataque:** ${duracionTotal.toFixed(2)} segundos`);
log(`> **Volumen de operaciones despachadas:** ${opsLog.length.toLocaleString()}`);
log(`> **Colapso alcanzado en Nivel:** ${ESTADO.nivelActual - 1} (de ${CONFIG.maxNiveles})`);

log(`\n**Razonamiento Causal del Colapso:**`);
log(`> ${razonColapso}`);

log(`\n### 📈 Evolución Dinámica de la Carga por Fases`);
log(`| Etapa | Payload (Tráfico/Doc) | Bloque de Inserciones | Rendimiento (TPS) | P95 Latencia | Degradación (Errores) | Integridad |`);
log(`|:---:|---:|---:|---:|---:|---:|:---:|`);
logPorNivel.forEach(n => {
  let icono = n.p95 >= CONFIG.umbralCriticoP95Ms || parseFloat(n.errores) > 0 ? "❌ ROTA" : "✅ ESTABLE";
  log(`| **Fase ${n.nivel}** | ${n.payloadKB} KB / pet. | ${n.batch} docs / hilo | ${n.tps} ops/s | **${n.p95} ms** | ${n.errores}% | ${icono} |`);
});

log(`\n### 🧪 Detalles del Workload (¿Qué estamos probando?)`);
log(`| Operación | Intención Técnica |`);
log(`|:---|:---|`);
log(`| **FIND** | Búsqueda de documentos pesados con escaneo de colección. |`);
log(`| **AGGREGATE** | Cruce de datos entre shards y agrupación por país (uso de RAM/Disco). |`);
log(`| **INSERT** | Inundación masiva de documentos en ráfagas crecientes (escritura en paralelo). |`);
log(`| **UPDATE** | Modificación masiva de marcas de tiempo en documentos existentes. |`);
log(`| **DELETE** | Eliminación selectiva para forzar la reorganización de índices. |`);

log(`\n### ⏱️ Telemetría de Latencia Histórica`);
log(`| Modelo de Operación | Cargas (Hits) | Vol. Docs Impactado | Promedio (ms) | P95 Crítico (ms) | Pico Máx (ms) |`);
log(`|:---|---:|---:|---:|---:|---:|`);
const tipos = ["find", "aggregate", "insert", "update", "delete"];
tipos.forEach(t => {
  const opsTipo = okOps.filter(o => o.tipo === t);
  const latencias = opsTipo.map(o => o.ms);
  const totalVolumen = opsTipo.reduce((acc, o) => acc + (o.volumen || 0), 0);
  const s = stats(latencias);
  if(s.n > 0) log(`| \`${t.toUpperCase()}\` | ${s.n.toLocaleString()} | ${totalVolumen.toLocaleString()} | ${s.avg} | **${s.p95}** | ${s.max} |`);
});

log(`\n### 📉 Saturación y Cuellos de Botella (Espectro Global)`);
log(`| Franja de Latencia | Volumen Acumulado (Hits) |`);
log(`|:---|---|`);
const bucketsDef = [[0, 100], [100, 500], [500, 1500], [1500, 3000], [3000, Infinity]];
bucketsDef.forEach(([a, b]) => {
  const count = okOps.filter(o => o.ms >= a && (b === Infinity ? true : o.ms < b)).length;
  const label = b === Infinity ? `> ${a}ms (Atasco total)` : `${a}-${b}ms`;
  log(`| \`${label}\` | ${bar(count, okOps.length, 30)} (${count}) |`);
});

// --- SECCIÓN DE RECOMENDACIONES FINALES ---
log(`\n## 💡 Hoja de Ruta de Optimización Recomendada`);
const configDB = db.getSiblingDB("config");
const isPartitioned = configDB.databases.findOne({ _id: db.getName(), partitioned: true });
const isSharded = configDB.collections.findOne({ _id: db.getName() + ".ciudades" });

if (!isPartitioned) {
    log(`1. **Habilitar Sharding:** La base de datos no está preparada para distribuir carga. Ejecuta:`);
    log(`   \`sh.enableSharding("${db.getName()}")\``);
}
if (!isSharded) {
    log(`${isPartitioned ? "1" : "2"}. **Fragmentar Colección:** Para usar todos los nodos, fragmenta la colección \`ciudades\`:`);
    log(`   \`sh.shardCollection("${db.getName()}.ciudades", { "pais": 1, "_id": 1 })\``);
}
if (isPartitioned && isSharded) {
    log(`✅ **Arquitectura Correctamente Implementada:** Tu clúster ya está distribuyendo datos de forma nativa.`);
    log(`- Monitorea el balanceador para asegurar una distribución uniforme de chunks.`);
}

log(`\n---\n*Escaneo profundo procesado por INFUNI Benchmark System - ${new Date().toLocaleString()}*`);

// --- GUARDAR EN ARCHIVO ---
try {
  const filename = "informe_benchmark.md";
  fs.writeFileSync(filename, outputBuffer);
  print(`\n💾 Informe guardado con éxito en: ${filename}`);
} catch (e) {
  print(`\n⚠️ No se pudo guardar el archivo automáticamente: ${e.message}`);
  print(`> Tip: Puedes redirigir la salida manualmente: mongosh ... < benchmark.js > resultado.md`);
}
