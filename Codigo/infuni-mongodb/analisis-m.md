// =============================================================
//  benchmark_death.js — INFUNI Sharded Cluster KAMIKAZE
//  Objetivo: Agotar la RAM y la cola de I/O hasta colgar el nodo
//  ADVERTENCIA: Este script colapsará los contenedores Docker.
// =============================================================

// Generamos un string colosal (Aprox 5 MB de peso por documento)
const monstruoStr = "X".repeat(1024 * 1024 * 5); 

print("🔥 INICIANDO PROTOCOLO KAMIKAZE...");
print("⚠️ ADVERTENCIA: El script no se detendrá. No habrá informe.");
print("⚠️ Observa 'docker stats'. El contenedor morirá por OOM (Out Of Memory) o CPU Lock.");
print("---------------------------------------------------------");

let iteracion = 0;

// BUCLE INFINITO: Sin límite de tiempo, sin parada.
while (true) {
    iteracion++;
    
    if (iteracion % 10 === 0) {
        print(`[+] Inyectando bomba de carga masiva #${iteracion}... (Agotando RAM)`);
    }

    try {
        // 1. INUNDACIÓN DE RED (FIRE AND FORGET)
        // Generamos un batch pesado
        let batch = [];
        for (let i = 0; i < 20; i++) {
            batch.push({
                nombre: "BOMBA_" + Math.random(),
                carga: monstruoStr,
                fecha: new Date(),
                _benchmark: true
            });
        }
        
        // writeConcern: { w: 0 } obliga al driver a enviar los datos sin esperar 
        // a que MongoDB confirme. Esto satura el buffer de red al instante.
        db.ciudades.insertMany(batch, { ordered: false, writeConcern: { w: 0 } });

        // 2. EXPLOSIÓN DE MEMORIA (PRODUCTO CARTESIANO)
        // Hacemos un $lookup (JOIN) de la colección consigo misma sin filtros.
        // Esto crea un array gigantesco en la memoria del Router/Shard.
        db.ciudades.aggregate([
            { $sample: { size: 100 } },
            // Hacemos que cada uno de los 100 documentos se cruce con otros 100 documentos masivos
            { $lookup: { 
                from: "ciudades", 
                pipeline: [ { $sample: { size: 100 } } ], 
                as: "multiplicador" 
            }},
            { $unwind: "$multiplicador" },
            // Forzamos a que intente meter todo ese cruce en un solo documento en RAM
            { $group: { _id: null, ram_killer: { $push: "$multiplicador.carga" } } }
        ], { allowDiskUse: false }); // allowDiskUse false fuerza el OOM en la RAM

    } catch (e) {
        // Ignoramos los timeouts. Si el router tarda en responder, no paramos,
        // seguimos bombardeando el puerto 27017 con más peticiones.
        if (iteracion % 25 === 0) {
            print("   [!] El clúster está ahogándose (Timeouts detectados), forzando más carga...");
        }
    }
}
