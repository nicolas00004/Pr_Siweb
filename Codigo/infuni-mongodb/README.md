# INFUNI — MongoDB Sharded Cluster con Docker

Guía completa para levantar la arquitectura distribuida del proyecto
**Jóvenes por el Mundo** usando Docker Compose.

---

## Arquitectura

```
                         ┌─────────────────┐
                         │  mongorouter1   │  ← punto de entrada (puerto 27017)
                         │    (mongos)     │
                         └────────┬────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
   ┌──────────▼──────────┐ ┌──────▼──────────┐ ┌─────▼───────────┐
   │  replicasetbdd      │ │ replicasetshard1│ │ replicasetshard2│ ...
   │  (config servers)   │ │   Shard 1       │ │   Shard 2       │
   │  mongoserver1–3     │ │  nodo1/2/3      │ │  nodo1/2/3      │
   └─────────────────────┘ └─────────────────┘ └─────────────────┘
```

| Componente | Contenedores | Puerto | Función |
|---|---|---|---|
| Config Servers | mongoserver1–3 | 27019 | Metadatos del cluster |
| Shard 1 | mongoshard1nodo1–3 | 27018 | Primer tercio de resenas + colecciones no fragmentadas |
| Shard 2 | mongoshard2nodo1–3 | 27018 | Segundo tercio de resenas |
| Shard 3 | mongoshard3nodo1–3 | 27018 | Tercer tercio de resenas |
| Router (mongos) | mongorouter1 | **27017** | Punto de entrada para la app |

---

## Requisitos previos

- Docker Desktop (o Docker Engine + Compose plugin)
- ~4 GB de RAM disponible para los 13 contenedores
- Puertos libres: **27017** (router), 27018 (shards), 27019 (config)

```bash
# Verificar versiones
docker --version          # >= 24.x recomendado
docker compose version    # >= 2.x
```

---

## Paso 1 — Levantar los contenedores

```bash
# Clona o copia los ficheros en un directorio y entra en él
cd infuni-mongodb

# Levantar todos los contenedores en segundo plano
docker compose up -d

# Verificar que los 13 contenedores están corriendo
docker compose ps
```

Deberías ver los 13 servicios con estado **running**:
`mongoserver1/2/3`, `mongoshard1/2/3nodo1/2/3`, `mongorouter1`.

---

## Paso 2 — Inicializar el cluster (una sola vez)

```bash
# Dar permisos de ejecución al script
chmod +x init-cluster.sh

# Ejecutar (tarda ~1 minuto)
./init-cluster.sh
```

El script realiza estos 5 pasos automáticamente:
1. Inicia el replica set de Config Servers (`replicasetbdd`)
2. Inicia los 3 replica sets de shards
3. Registra los 3 shards en el router
4. Crea la BD `infuni`, colecciones e índices
5. Activa el sharding sobre la colección `resenas`

---

## Paso 3 — Cargar datos de ejemplo (opcional)

```bash
docker exec -i mongorouter1 mongosh --port 27017 infuni < seed.js
```

Inserta ciudades (Granada, Sevilla, París), 2 usuarios, búsquedas AHP y reseñas de ejemplo.

---

## Paso 4 — Conectarse y verificar

### Desde mongosh (dentro del router)
```bash
docker exec -it mongorouter1 mongosh --port 27017
```

### Comandos de verificación útiles
```javascript
// Estado general del cluster
sh.status()

// Ver shards registrados
use admin
db.adminCommand({ listShards: 1 })

// Ver distribución de chunks en resenas
use infuni
db.resenas.getShardDistribution()

// Contar documentos por colección
db.ciudades.countDocuments()
db.usuarios.countDocuments()
db.resenas.countDocuments()
db.busquedas.countDocuments()
```

### Desde una aplicación externa
```
mongodb://localhost:27017/infuni
```

---

## Comandos de gestión del cluster

### Detener y reiniciar
```bash
# Detener todos los contenedores (conserva datos)
docker compose stop

# Volver a arrancar
docker compose start

# Reiniciar un contenedor concreto
docker compose restart mongoshard1nodo1
```

### Eliminar todo (incluyendo datos)
```bash
# Elimina contenedores, redes y volúmenes
docker compose down -v
```

### Ver logs
```bash
# Logs del router
docker logs mongorouter1 -f

# Logs de un shard
docker logs mongoshard1nodo1 --tail 50
```

### Estado de un replica set
```bash
# Estado del Shard 1
docker exec -it mongoshard1nodo1 mongosh --port 27018 \
  --eval "rs.status()" --quiet

# Estado de Config Servers
docker exec -it mongoserver1 mongosh --port 27019 \
  --eval "rs.status()" --quiet
```

---

## Ejecutar las consultas del trabajo (C1–C4)

Conectarse al router y ejecutar:

```bash
docker exec -it mongorouter1 mongosh --port 27017 infuni
```

```javascript
// C1 — Ciudades seguras y asequibles
db.ciudades.find(
  { "metricas.seguridad": { $gt: 7 }, "metricas.costeAlquilerMedio": { $lt: 400 } },
  { nombre: 1, pais: 1, metricas: 1, _id: 0 }
).sort({ "metricas.seguridad": -1 })

// C2 — Reseñas de una ciudad por categoría
db.resenas.find(
  { id_ciudad: db.ciudades.findOne({ nombre: "Granada" })._id, categoria: "alojamiento" },
  { texto_opinion: 1, puntuacion: 1, fecha_publicacion: 1 }
).sort({ fecha_publicacion: -1 }).limit(20)

// C3 — Ranking AHP personalizado
db.ciudades.aggregate([
  { $addFields: { scoreAhp: {
    $add: [
      { $multiply: ["$metricas.seguridad",         0.35] },
      { $multiply: ["$metricas.ambienteNocturno",  0.25] },
      { $multiply: ["$metricas.calidadTransporte", 0.20] },
      { $multiply: ["$metricas.calidadAcademica",  0.20] }
    ]
  }}},
  { $sort: { scoreAhp: -1 } },
  { $limit: 10 }
])

// C4 — Media de pesos AHP de un usuario
db.busquedas.aggregate([
  { $match: { usuarioId: db.usuarios.findOne({ email: "nrct0001@red.ujaen.es" })._id } },
  { $group: {
    _id: "$usuarioId",
    avgSeguridad:  { $avg: "$seguridad" },
    avgOcio:       { $avg: "$ocio" },
    avgTransporte: { $avg: "$transporte" }
  }}
])
```

---

## Benchmark y Pruebas de Estrés

El proyecto incluye un script de benchmark especializado (`benchmark.js`) diseñado para auditar la arquitectura distribuida y medir la resiliencia del clúster bajo condiciones de carga extrema.

### Metodología: Ramp-Up Test (Prueba Progresiva)
A diferencia de un test de carga estático, este script utiliza una técnica de **escalado dinámico**:
- **Ciclo de Carga**: Comienza con una carga mínima (documentos pequeños, ráfagas cortas).
- **Progresión**: En cada nuevo nivel (hasta 50 fases), el script aumenta un **20% el volumen de inserción** y el **peso de red** de cada mensaje.
- **Punto de Quiebre**: El test se detiene automáticamente si la latencia **P95 supera los 4 segundos** o si la tasa de **errores supera el 20%**, identificando así el límite real de tu hardware actual.

### Componentes del Análisis

#### 1. 🏗️ Diagnóstico de Arquitectura (Núcleo MongoDB)
El script consulta el catálogo de configuración para reportar en tiempo real:
- **Plano de Control**: Confirma si la conexión es vía `mongos` (router distribuido) o directa.
- **Topología**: Detalla los Shards activos y sus Replica Sets asociados.
- **Balanceador**: Estado del *Autosharding* (Full/Off) y actividad de migración de chunks.

#### 2. ⚖️ Scalability & Physical Check
Analiza la colección `infuni.ciudades` para detectar fallos de diseño:
- **Estado de Particionado**: Identifica si el sharding está correctamente habilitado en la DB y en la colección específica.
- **Distribución de Carga**: Una tabla desglosa por shard el **Número de documentos**, **MB de datos**, y **MB de índices**.
- **Interpretación**: Determina si los datos están balanceados entre todos los servidores o si existe un "embotellamiento" monolítico.

#### 3. 🧪 Workload (Tipos de Operaciones)
El benchmark simula una mezcla de tráfico real de la aplicación:
- **FIND**: Búsquedas selectivas de documentos pesados entre diferentes shards.
- **AGGREGATE**: Cruces de datos distribuidos y agrupaciones complejas (uso intensivo de CPU/RAM).
- **INSERT**: Inundación masiva de documentos con payloads dinámicos para probar el paralelismo de escritura.
- **UPDATE/DELETE**: Modificaciones y borrados quirúrgicos para forzar la actualización de índices distribuidos.

### Ejecución y Resultados

Para ejecutar el test completo y generar el informe:
```bash
docker exec -i mongorouter1 mongosh mongodb://localhost:27017/infuni < benchmark.js
```

> [!IMPORTANT]
> **¿Dónde está el informe?** El archivo `informe_benchmark.md` se crea **DENTRO** del contenedor. Para verlo en tu máquina local, debes extraerlo con este comando:
> ```bash
> docker exec -i mongorouter1 cat /informe_benchmark.md > informe_final.md
> ```

### ¿Qué analiza este informe?
La salida concluye con una **Hoja de Ruta de Optimización**. Si el sistema detecta que no estás aprovechando la capacidad distribuida, te sugerirá los comandos exactos (ej: `sh.shardCollection(...)`) para fragmentar tus datos y duplicar o triplicar el rendimiento del clúster.

---

## Estructura de ficheros

```
infuni-mongodb/
├── docker-compose.yml   ← definición de los 13 contenedores
├── init-cluster.sh      ← inicialización automática del cluster
├── seed.js              ← datos de ejemplo
└── README.md            ← esta guía
```
