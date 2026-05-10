/**
 * Motor AHP-Sort II para INFUNI
 * Gestiona el cálculo de pesos mediante matrices y la clasificación por perfiles
 */

const AHPEngine = (function() {
    // Escala de Saaty para el Índice Aleatorio (RI)
    const RI = [0, 0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45];

    return {
        /**
         * Calcula el vector de prioridades (pesos) a partir de una matriz de comparación
         * Utiliza el método de la media geométrica normalizada (aproximación de autovector)
         */
        calculateWeights: function(matrix) {
            const n = matrix.length;
            let geometricMeans = [];
            let sumTotal = 0;

            for (let i = 0; i < n; i++) {
                let prod = 1;
                for (let j = 0; j < n; j++) {
                    prod *= matrix[i][j];
                }
                const mean = Math.pow(prod, 1 / n);
                geometricMeans.push(mean);
                sumTotal += mean;
            }

            return geometricMeans.map(m => m / sumTotal);
        },

        /**
         * Verifica la consistencia de la matriz
         * Devuelve también la celda más inconsistente si CR > 0.1
         */
        checkConsistency: function(matrix, weights) {
            const n = matrix.length;
            if (n <= 2) return { consistent: true, cr: 0 };

            let lambdaMax = 0;
            const rowLambdas = [];

            for (let i = 0; i < n; i++) {
                let rowSum = 0;
                for (let j = 0; j < n; j++) {
                    rowSum += matrix[i][j] * weights[j];
                }
                const li = rowSum / weights[i];
                rowLambdas.push(li);
                lambdaMax += li;
            }
            lambdaMax = lambdaMax / n;

            const ci = (lambdaMax - n) / (n - 1);
            const cr = ci / RI[n];

            // Identificar la celda más inconsistente
            // La inconsistencia ocurre cuando a_ij no se aproxima a w_i / w_j
            let maxError = -1;
            let worstCell = null;

            if (cr > 0.1) {
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        if (i === j) continue;
                        // Error relativo entre el juicio dado y el juicio consistente ideal
                        const ideal = weights[i] / weights[j];
                        const error = Math.abs(Math.log(matrix[i][j] / ideal)); 
                        if (error > maxError) {
                            maxError = error;
                            worstCell = { row: i, col: j };
                        }
                    }
                }
            }

            return {
                consistent: cr < 0.1,
                cr: cr.toFixed(4),
                ci: ci.toFixed(4),
                worstCell: worstCell
            };
        },

        /**
         * Clasifica una alternativa en categorías (AHP-Sort II)
         * Se basa en la comparación de la prioridad global de la alternativa
         * frente a los perfiles límite (limiting profiles) definidos.
         */
        classify: function(score, categories) {
            for (const cat of categories) {
                if (score >= cat.min) return cat.name;
            }
            return categories[categories.length - 1].name;
        }
    };
})();
