-- NOTA DE INTEGRACIÓN (RENOMBRES v3): estas queries se escribieron
-- contra el esquema v2. Al usarlas sobre schema_v3_corregido.sql
-- aplicar: registrado_por -> usuario_creado_por · diagnosticos ->
-- diagnosticos_veterinarios · la tabla fincas reemplaza a predios.
-- El resto de tablas y columnas coincide.

-- =====================================================================
-- KPIs GANADEROS - Queries para el módulo "Reportes - Gráficos"
-- Compatible con el esquema v2 (esquema_ficha_animal_v2.sql)
-- Todas las queries filtran por finca ($1 = finca_id) para multi-tenancy
-- =====================================================================

-- ---------------------------------------------------------------------
-- KPI 1: TASA DE CONCEPCIÓN por toro / pajuela
-- servicios efectivos / servicios totales, por reproductor
-- Gráfico sugerido: barras horizontales ordenadas
-- ---------------------------------------------------------------------
SELECT
    COALESCE(rep.codigo_animal, 'Sin reproductor') AS reproductor,
    rep.sexo                                        AS tipo,        -- macho=monta, pajuela=IA
    COUNT(*)                                        AS servicios_totales,
    COUNT(*) FILTER (WHERE s.efectivo IS TRUE)      AS servicios_efectivos,
    ROUND(100.0 * COUNT(*) FILTER (WHERE s.efectivo IS TRUE)
          / NULLIF(COUNT(*) FILTER (WHERE s.efectivo IS NOT NULL), 0), 1)
                                                    AS tasa_concepcion_pct
FROM servicios s
JOIN animales a   ON a.id = s.animal_id AND a.finca_id = $1
LEFT JOIN animales rep ON rep.id = COALESCE(s.pajuela_id, s.padre_id)
WHERE s.fecha BETWEEN $2 AND $3                      -- rango de fechas del reporte
GROUP BY rep.codigo_animal, rep.sexo
ORDER BY tasa_concepcion_pct DESC NULLS LAST;

-- ---------------------------------------------------------------------
-- KPI 2: EFECTIVIDAD POR INSEMINADOR
-- Mismo cálculo pero agrupado por técnico (solo IA)
-- ---------------------------------------------------------------------
SELECT
    i.nombre                                        AS inseminador,
    COUNT(*)                                        AS servicios,
    COUNT(*) FILTER (WHERE s.efectivo IS TRUE)      AS efectivos,
    ROUND(100.0 * COUNT(*) FILTER (WHERE s.efectivo IS TRUE)
          / NULLIF(COUNT(*) FILTER (WHERE s.efectivo IS NOT NULL), 0), 1)
                                                    AS tasa_pct
FROM servicios s
JOIN animales a ON a.id = s.animal_id AND a.finca_id = $1
JOIN inseminadores i ON i.id = s.inseminador_id
WHERE s.tipo = 'inseminacion'
  AND s.fecha BETWEEN $2 AND $3
GROUP BY i.nombre
ORDER BY tasa_pct DESC;

-- ---------------------------------------------------------------------
-- KPI 3: INTERVALO ENTRE PARTOS (IEP) por vaca
-- Días entre partos consecutivos. Meta típica: 365-400 días.
-- Gráfico sugerido: histograma de distribución + promedio del hato
-- ---------------------------------------------------------------------
WITH partos_ordenados AS (
    SELECT
        p.animal_id,
        p.fecha,
        LAG(p.fecha) OVER (PARTITION BY p.animal_id ORDER BY p.fecha) AS parto_anterior
    FROM partos p
    JOIN animales a ON a.id = p.animal_id AND a.finca_id = $1
    WHERE p.tipo_parto <> 'aborto'
)
SELECT
    a.codigo_animal,
    po.fecha                              AS ultimo_parto,
    po.parto_anterior,
    (po.fecha - po.parto_anterior)        AS intervalo_dias
FROM partos_ordenados po
JOIN animales a ON a.id = po.animal_id
WHERE po.parto_anterior IS NOT NULL
ORDER BY intervalo_dias DESC;

-- Promedio del hato (una sola cifra para el dashboard):
WITH intervalos AS (
    SELECT (p.fecha - LAG(p.fecha) OVER (PARTITION BY p.animal_id ORDER BY p.fecha)) AS dias
    FROM partos p
    JOIN animales a ON a.id = p.animal_id AND a.finca_id = $1
    WHERE p.tipo_parto <> 'aborto'
)
SELECT ROUND(AVG(dias), 0) AS iep_promedio_dias FROM intervalos WHERE dias IS NOT NULL;

-- ---------------------------------------------------------------------
-- KPI 4: DÍAS ABIERTOS por vaca
-- Días desde el último parto hasta el siguiente servicio efectivo
-- (o hasta hoy si sigue vacía). Meta típica: < 110 días.
-- ---------------------------------------------------------------------
WITH ultimo_parto AS (
    SELECT p.animal_id, MAX(p.fecha) AS fecha_parto
    FROM partos p
    JOIN animales a ON a.id = p.animal_id AND a.finca_id = $1
    GROUP BY p.animal_id
),
servicio_efectivo_post AS (
    SELECT s.animal_id, MIN(s.fecha) AS fecha_concepcion
    FROM servicios s
    JOIN ultimo_parto up ON up.animal_id = s.animal_id AND s.fecha > up.fecha_parto
    WHERE s.efectivo IS TRUE
    GROUP BY s.animal_id
)
SELECT
    a.codigo_animal,
    up.fecha_parto,
    sep.fecha_concepcion,
    COALESCE(sep.fecha_concepcion, CURRENT_DATE) - up.fecha_parto AS dias_abiertos,
    CASE WHEN sep.fecha_concepcion IS NULL THEN 'abierta' ELSE 'concebida' END AS estado
FROM ultimo_parto up
JOIN animales a ON a.id = up.animal_id AND a.estado_actual = 'activo'
LEFT JOIN servicio_efectivo_post sep ON sep.animal_id = up.animal_id
ORDER BY dias_abiertos DESC;

-- ---------------------------------------------------------------------
-- KPI 5: PRODUCCIÓN LÁCTEA por potrero / lote / día
-- Usa el snapshot de ubicación guardado en cada registro.
-- Gráfico sugerido: serie de tiempo con una línea por potrero
-- ---------------------------------------------------------------------
SELECT
    pl.fecha,
    pot.nombre                                   AS potrero,
    COUNT(DISTINCT pl.animal_id)                 AS vacas_ordenadas,
    SUM(pl.cantidad_am + pl.cantidad_pm)         AS litros_total,
    ROUND(SUM(pl.cantidad_am + pl.cantidad_pm)
          / NULLIF(COUNT(DISTINCT pl.animal_id), 0), 2)
                                                 AS litros_por_vaca
FROM producciones_lacteas pl
JOIN animales a ON a.id = pl.animal_id AND a.finca_id = $1
LEFT JOIN potreros pot ON pot.id = pl.potrero_id
WHERE pl.fecha BETWEEN $2 AND $3
GROUP BY pl.fecha, pot.nombre
ORDER BY pl.fecha, pot.nombre;

-- Top / bottom 10 vacas por producción promedio del período:
SELECT
    a.codigo_animal,
    ROUND(AVG(pl.cantidad_am + pl.cantidad_pm), 2) AS litros_dia_promedio,
    COUNT(*)                                       AS dias_registrados
FROM producciones_lacteas pl
JOIN animales a ON a.id = pl.animal_id AND a.finca_id = $1
WHERE pl.fecha BETWEEN $2 AND $3
GROUP BY a.codigo_animal
HAVING COUNT(*) >= 5                               -- mínimo de datos para ser comparable
ORDER BY litros_dia_promedio DESC
LIMIT 10;

-- ---------------------------------------------------------------------
-- KPI 6: GANANCIA DIARIA DE PESO (GDP)
-- Entre el primer y último pesaje del período, por animal.
-- Clave para ceba/levante. Gráfico sugerido: dispersión GDP vs edad
-- ---------------------------------------------------------------------
WITH pesos_extremos AS (
    SELECT
        pe.animal_id,
        FIRST_VALUE(pe.peso_kg) OVER w  AS peso_inicial,
        FIRST_VALUE(pe.fecha)   OVER w  AS fecha_inicial,
        LAST_VALUE(pe.peso_kg)  OVER (PARTITION BY pe.animal_id ORDER BY pe.fecha
                                      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
                                        AS peso_final,
        LAST_VALUE(pe.fecha)    OVER (PARTITION BY pe.animal_id ORDER BY pe.fecha
                                      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
                                        AS fecha_final
    FROM pesos pe
    JOIN animales a ON a.id = pe.animal_id AND a.finca_id = $1
    WHERE pe.fecha BETWEEN $2 AND $3
    WINDOW w AS (PARTITION BY pe.animal_id ORDER BY pe.fecha)
)
SELECT DISTINCT
    a.codigo_animal,
    px.peso_inicial, px.peso_final,
    (px.fecha_final - px.fecha_inicial)                        AS dias,
    ROUND((px.peso_final - px.peso_inicial)
          / NULLIF((px.fecha_final - px.fecha_inicial), 0), 3) AS gdp_kg_dia
FROM pesos_extremos px
JOIN animales a ON a.id = px.animal_id
WHERE px.fecha_final > px.fecha_inicial
ORDER BY gdp_kg_dia DESC;

-- ---------------------------------------------------------------------
-- KPI 7: PESO AL DESTETE AJUSTADO (a 205 o 240 días según práctica)
-- Usa tipo_peso = 'destete' y 'nacimiento'
-- ---------------------------------------------------------------------
SELECT
    a.codigo_animal,
    pn.peso_kg                                    AS peso_nacimiento,
    pd.peso_kg                                    AS peso_destete,
    (pd.fecha - a.fecha_nacimiento)               AS edad_destete_dias,
    ROUND(pn.peso_kg + ((pd.peso_kg - pn.peso_kg)
          / NULLIF((pd.fecha - a.fecha_nacimiento), 0)) * 205, 1)
                                                  AS peso_ajustado_205d
FROM animales a
JOIN pesos pn ON pn.animal_id = a.id AND pn.tipo_peso = 'nacimiento'
JOIN pesos pd ON pd.animal_id = a.id AND pd.tipo_peso = 'destete'
WHERE a.finca_id = $1 AND a.fecha_nacimiento IS NOT NULL;

-- ---------------------------------------------------------------------
-- KPI 8: COSTO SANITARIO por animal en el período
-- Usa el snapshot precio_dosis de cada aplicación
-- ---------------------------------------------------------------------
SELECT
    a.codigo_animal,
    COUNT(*)                                       AS aplicaciones,
    SUM(ap.dosis * COALESCE(ap.precio_dosis, 0))   AS costo_total
FROM aplicaciones_sanitarias ap
JOIN animales a ON a.id = ap.animal_id AND a.finca_id = $1
WHERE ap.fecha BETWEEN $2 AND $3
GROUP BY a.codigo_animal
ORDER BY costo_total DESC;

-- Costo sanitario por potrero (dónde se está gastando):
SELECT
    pot.nombre                                     AS potrero,
    SUM(ap.dosis * COALESCE(ap.precio_dosis, 0))   AS costo_total,
    COUNT(DISTINCT ap.animal_id)                   AS animales_tratados
FROM aplicaciones_sanitarias ap
JOIN animales a ON a.id = ap.animal_id AND a.finca_id = $1
LEFT JOIN potreros pot ON pot.id = a.potrero_id
WHERE ap.fecha BETWEEN $2 AND $3
GROUP BY pot.nombre
ORDER BY costo_total DESC;

-- ---------------------------------------------------------------------
-- KPI 9: VACUNAS PRÓXIMAS A VENCER (refuerzos pendientes)
-- Alimenta el "Programador de Tareas" / notificaciones
-- ---------------------------------------------------------------------
SELECT
    a.codigo_animal,
    ps.descripcion                    AS producto,
    ap.proxima_dosis,
    ap.proxima_dosis - CURRENT_DATE   AS dias_restantes
FROM aplicaciones_sanitarias ap
JOIN animales a ON a.id = ap.animal_id AND a.finca_id = $1
                AND a.estado_actual = 'activo'
JOIN productos_sanitarios ps ON ps.id = ap.producto_id
WHERE ap.proxima_dosis IS NOT NULL
  AND ap.proxima_dosis <= CURRENT_DATE + INTERVAL '30 days'
  AND NOT EXISTS (                     -- que no exista ya una aplicación posterior
      SELECT 1 FROM aplicaciones_sanitarias ap2
      WHERE ap2.animal_id = ap.animal_id
        AND ap2.producto_id = ap.producto_id
        AND ap2.fecha > ap.fecha
  )
ORDER BY ap.proxima_dosis;

-- ---------------------------------------------------------------------
-- KPI 10: INVENTARIO SANITARIO con alerta de stock bajo
-- ---------------------------------------------------------------------
SELECT
    codigo, descripcion, dosis_disponibles,
    CASE WHEN dosis_disponibles <= 0  THEN 'agotado'
         WHEN dosis_disponibles < 20  THEN 'bajo'
         ELSE 'ok' END AS estado_stock
FROM inventario_sanitario
WHERE finca_id = $1
ORDER BY dosis_disponibles ASC;

-- ---------------------------------------------------------------------
-- KPI 11: COMPOSICIÓN DEL HATO (dashboard principal)
-- Distribución por categoría reproductiva, sexo y estado
-- Gráfico sugerido: donas / tarjetas de métrica
-- ---------------------------------------------------------------------
SELECT
    COUNT(*)                                                        AS total_activos,
    COUNT(*) FILTER (WHERE sexo = 'hembra')                         AS hembras,
    COUNT(*) FILTER (WHERE sexo = 'macho')                          AS machos,
    COUNT(*) FILTER (WHERE categoria_reproductiva = 'prenada')      AS prenadas,
    COUNT(*) FILTER (WHERE categoria_reproductiva = 'vacia')        AS vacias,
    COUNT(*) FILTER (WHERE salud = 'enfermo')                       AS enfermos,
    COUNT(*) FILTER (WHERE seleccionado_descarte)                   AS para_descarte
FROM animales
WHERE finca_id = $1 AND estado_actual = 'activo' AND eliminado_en IS NULL;

-- ---------------------------------------------------------------------
-- NOTAS DE IMPLEMENTACIÓN
-- ---------------------------------------------------------------------
-- 1. $1 = finca_id, $2/$3 = rango de fechas. En TanStack Start, cada
--    query vive en una server function con su schema Zod de parámetros.
-- 2. Los KPIs 1-4 dependen de que servicios.efectivo se actualice al
--    registrar la palpación (trigger o lógica en la server function que
--    inserta palpaciones: resultado='prenada' -> efectivo=TRUE del
--    último servicio; 'vacia' -> FALSE).
-- 3. Para dashboards con muchos usuarios simultáneos, materializar los
--    KPIs pesados (5, 6) como vistas materializadas con REFRESH nocturno
--    o al cierre de cada sync.
-- 4. Ninguna de estas queries corre en el SQLite del dispositivo: los
--    reportes son una funcionalidad online contra Postgres. En campo
--    solo se captura; el análisis se hace conectado.
-- =====================================================================
