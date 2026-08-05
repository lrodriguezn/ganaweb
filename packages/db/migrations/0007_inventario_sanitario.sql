-- RF-SANIDAD v0.2 (Issue #208, RN-041/KPI-10): vista de inventario sanitario.
-- Stock SIEMPRE calculado: Σ almacen_entradas.dosis − Σ aplicaciones.dosis
-- por producto; nunca un campo mutable.
--
-- Desviación deliberada de la definición literal de schema_v3_corregido.sql
-- (precedencia: arquitectura funcional > esquema): RN-051 exige que las filas
-- de registros grupales ANULADOS se excluyan del stock y de los KPIs, y la
-- vista v3 no lo hace. Se filtra por tanto toda aplicación cuya cabecera
-- registros_grupales tenga anulado_en marcado (las aplicaciones individuales
-- tienen registro_grupal_id NULL y nunca se ven afectadas).
--
-- aplicaciones_sanitarias.dosis es NUMERIC(10,2), por lo que la resta queda
-- en numeric; los consumidores convierten a número.
CREATE VIEW "inventario_sanitario" AS
SELECT p.id AS producto_id, p.finca_id, p.codigo, p.descripcion,
       COALESCE(e.total_entradas, 0) - COALESCE(a.total_aplicado, 0) AS dosis_disponibles
FROM productos_sanitarios p
LEFT JOIN (SELECT producto_id, SUM(dosis) AS total_entradas
           FROM almacen_entradas GROUP BY producto_id) e ON e.producto_id = p.id
LEFT JOIN (SELECT app.producto_id, SUM(app.dosis) AS total_aplicado
           FROM aplicaciones_sanitarias app
           LEFT JOIN registros_grupales rg ON rg.id = app.registro_grupal_id
           WHERE rg.anulado_en IS NULL
           GROUP BY app.producto_id) a ON a.producto_id = p.id;
-- ROLLBACK (reversibilidad):
-- DROP VIEW "inventario_sanitario";
