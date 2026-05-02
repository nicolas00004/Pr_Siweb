#!/usr/bin/env bash
# =============================================================
#  init-cluster.sh
#  Inicializa el cluster MongoDB de INFUNI paso a paso.
#  Ejecutar UNA SOLA VEZ después de "docker compose up -d"
# =============================================================
set -e

WAIT=8   # segundos de espera entre pasos

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   INFUNI — Inicialización del Sharded Cluster    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Esperar a que los contenedores arranquen ─────────────────
echo "▸ Esperando ${WAIT}s a que los contenedores estén listos..."
sleep $WAIT

# ══════════════════════════════════════════════════════════════
#  PASO 1 — Replica set de Config Servers (replicasetbdd)
# ══════════════════════════════════════════════════════════════
echo ""
echo "[ 1/5 ] Iniciando replica set de Config Servers..."
docker exec -i mongoserver1 mongosh --port 27019 --quiet <<'EOF'
rs.initiate({
  _id: "replicasetbdd",
  configsvr: true,
  members: [
    { _id: 0, host: "mongoserver1:27019" },
    { _id: 1, host: "mongoserver2:27019" },
    { _id: 2, host: "mongoserver3:27019" }
  ]
})
EOF
echo "   ✓ Config Servers iniciados."
sleep $WAIT

# ══════════════════════════════════════════════════════════════
#  PASO 2 — Replica sets de los 3 Shards
# ══════════════════════════════════════════════════════════════
echo ""
echo "[ 2/5 ] Iniciando replica set Shard 1 (replicasetshard1)..."
docker exec -i mongoshard1nodo1 mongosh --port 27018 --quiet <<'EOF'
rs.initiate({
  _id: "replicasetshard1",
  members: [
    { _id: 0, host: "mongoshard1nodo1:27018" },
    { _id: 1, host: "mongoshard1nodo2:27018" },
    { _id: 2, host: "mongoshard1nodo3:27018" }
  ]
})
EOF
echo "   ✓ Shard 1 iniciado."

echo ""
echo "[ 2/5 ] Iniciando replica set Shard 2 (replicasetshard2)..."
docker exec -i mongoshard2nodo1 mongosh --port 27018 --quiet <<'EOF'
rs.initiate({
  _id: "replicasetshard2",
  members: [
    { _id: 0, host: "mongoshard2nodo1:27018" },
    { _id: 1, host: "mongoshard2nodo2:27018" },
    { _id: 2, host: "mongoshard2nodo3:27018" }
  ]
})
EOF
echo "   ✓ Shard 2 iniciado."

echo ""
echo "[ 2/5 ] Iniciando replica set Shard 3 (replicasetshard3)..."
docker exec -i mongoshard3nodo1 mongosh --port 27018 --quiet <<'EOF'
rs.initiate({
  _id: "replicasetshard3",
  members: [
    { _id: 0, host: "mongoshard3nodo1:27018" },
    { _id: 1, host: "mongoshard3nodo2:27018" },
    { _id: 2, host: "mongoshard3nodo3:27018" }
  ]
})
EOF
echo "   ✓ Shard 3 iniciado."
sleep $WAIT

# ══════════════════════════════════════════════════════════════
#  PASO 3 — Registrar los shards en el router (mongos)
# ══════════════════════════════════════════════════════════════
echo ""
echo "[ 3/5 ] Añadiendo shards al router..."
docker exec -i mongorouter1 mongosh --port 27017 --quiet <<'EOF'
sh.addShard("replicasetshard1/mongoshard1nodo1:27018,mongoshard1nodo2:27018,mongoshard1nodo3:27018")
sh.addShard("replicasetshard2/mongoshard2nodo1:27018,mongoshard2nodo2:27018,mongoshard2nodo3:27018")
sh.addShard("replicasetshard3/mongoshard3nodo1:27018,mongoshard3nodo2:27018,mongoshard3nodo3:27018")
EOF
echo "   ✓ Shards registrados."
sleep $WAIT

# ══════════════════════════════════════════════════════════════
#  PASO 4 — Crear base de datos, colecciones e índices
# ══════════════════════════════════════════════════════════════
echo ""
echo "[ 4/5 ] Creando BD infuni, colecciones e índices..."
docker exec -i mongorouter1 mongosh --port 27017 --quiet <<'EOF'
use infuni

// ── Habilitar sharding en la base de datos ──────────────────
sh.enableSharding("infuni")

// ── Colección: ciudades ─────────────────────────────────────
db.createCollection("ciudades")
db.ciudades.createIndex({ "metricas.seguridad": 1, "metricas.costeAlquilerMedio": 1 })
db.ciudades.createIndex({ etiquetas: 1 })                        // multikey
db.ciudades.createIndex({ coordenadas: "2dsphere" })             // geoespacial
db.ciudades.createIndex({ nombre: "text", pais: "text" })        // texto libre

// ── Colección: usuarios ─────────────────────────────────────
db.createCollection("usuarios")
db.usuarios.createIndex({ email: 1 }, { unique: true })

// ── Colección: resenas ──────────────────────────────────────
db.createCollection("resenas")
db.resenas.createIndex({ id_ciudad: 1, _id: 1 })                 // clave de shard
db.resenas.createIndex({ id_ciudad: 1, categoria: 1, fecha_publicacion: -1 })
db.resenas.createIndex({ id_usuario: 1, fecha_publicacion: -1 })

// ── Colección: busquedas ────────────────────────────────────
db.createCollection("busquedas")
db.busquedas.createIndex({ usuarioId: 1, fecha: -1 })

// ── Colección auxiliar: paises ──────────────────────────────
db.createCollection("paises")

print("Colecciones e índices creados.")
EOF
echo "   ✓ Esquema creado."

# ══════════════════════════════════════════════════════════════
#  PASO 5 — Activar sharding sobre la colección resenas
# ══════════════════════════════════════════════════════════════
echo ""
echo "[ 5/5 ] Activando sharding en colección resenas..."
docker exec -i mongorouter1 mongosh --port 27017 --quiet <<'EOF'
sh.shardCollection("infuni.resenas", { id_ciudad: 1, _id: 1 })
print("Sharding activado en infuni.resenas")
EOF
echo "   ✓ Sharding configurado."

# ══════════════════════════════════════════════════════════════
#  RESUMEN FINAL
# ══════════════════════════════════════════════════════════════
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║          Cluster listo  ✓                        ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Conexión:  mongodb://localhost:27017/infuni      ║"
echo "║  Router:    mongorouter1:27017                   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Verifica el estado con:"
echo "    docker exec -it mongorouter1 mongosh --eval 'sh.status()'"
echo ""
