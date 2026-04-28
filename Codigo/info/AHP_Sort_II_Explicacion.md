# Metodología AHP Sort II en INFUNI

Este documento detalla el proceso algorítmico utilizado para la clasificación de destinos mediante el método **AHP Sort II**. El motor de cálculo se encuentra implementado en `ahp-engine.js` y se integra en la lógica principal de `script.js`.

## 1. Fase AHP: Cálculo de Pesos de los Criterios

El primer paso es determinar la importancia relativa de cada criterio (Seguridad, Transporte, Ocio, etc.).

### Matriz de Comparación (Modo Experto)
Se utiliza una matriz de Saaty $A$ de tamaño $n \times n$, donde el usuario indica la importancia de un criterio $i$ frente a un criterio $j$.

### Cálculo del Vector de Prioridades
Para obtener los pesos ($w$), el motor utiliza la **Media Geométrica Normalizada** (una aproximación precisa del autovector principal):

1.  Se calcula la media geométrica de cada fila $i$:
    $$GM_i = \sqrt[n]{\prod_{j=1}^{n} a_{ij}}$$
2.  Se normalizan estos valores para que sumen 1:
    $$w_i = \frac{GM_i}{\sum_{k=1}^{n} GM_k}$$

### Verificación de Consistencia
Se calcula el Índice de Consistencia ($CI$) y la Razón de Consistencia ($CR$):
$$CI = \frac{\lambda_{max} - n}{n - 1}$$
$$CR = \frac{CI}{RI}$$
Donde $RI$ es el índice aleatorio correspondiente al tamaño $n$. Si $CR < 0.1$, la matriz se considera consistente.

---

## 2. Fase de Puntuación: Evaluación de Alternativas

Cada ciudad (alternativa) recibe una puntuación global basada en sus métricas almacenadas en la base de datos y los pesos calculados.

$$PuntuacionGlobal = \frac{\sum_{i=1}^{n} (Métrica_{i} \times w_i)}{\sum_{i=1}^{n} w_i}$$

*   **Métricas**: Valores de 1 a 5 (Seguridad, Coste, Ambiente, etc.).
*   **Pesos ($w$):** Importancia asignada en la fase AHP.

---

## 3. Fase Sort II: Clasificación por Perfiles Límite

AHP Sort II clasifica las alternativas en categorías predefinidas comparando su prioridad global frente a **Perfiles Límite** (thresholds).

### Definición de Categorías
En el sistema INFUNI, definimos 4 categorías con sus respectivos umbrales mínimos:

| Categoría | Umbral Mínimo ($p_j$) |
| :--- | :--- |
| **🌟 Destino de Élite** | $\ge 4.5$ |
| **✅ Muy Recomendado** | $\ge 3.8$ |
| **🆗 Aceptable** | $\ge 2.5$ |
| **⚠️ No Recomendado** | $\ge 0.0$ |

### Algoritmo de Clasificación
Para una alternativa con puntuación $S$, el algoritmo busca la categoría más alta que cumpla la condición:

```javascript
for (const cat of categories) {
    if (score >= cat.min) return cat.name;
}
```

Este proceso asegura que las ciudades no solo se ordenen (ranking), sino que se agrupen en niveles de recomendación cualitativos basados en la exigencia del usuario.

---

## Resumen del Flujo de Datos
1. **Entrada:** Matriz de Saaty o Sliders (Usuario).
2. **Procesamiento AHP:** Cálculo de Pesos + Test de Consistencia.
3. **Agregación:** Suma ponderada de métricas de ciudades.
4. **Clasificación Sort II:** Comparación con perfiles límite y asignación de categoría.
5. **Salida:** Ranking visual y mapa interactivo con código de colores.
