import { writeFileSync } from "node:fs"
import postgres from "postgres"
import { fixtureChecksum, fixtureSeedSql } from "./animal-listado.js"
import { assertS02OrderedCompositeIndexPlan } from "./run-animal-listado.js"
const S02 = `WITH pagina AS (SELECT a.id FROM animales a WHERE a.finca_id = $1 AND a.activo = 1  ORDER BY a.codigo ASC LIMIT $2 OFFSET $3) SELECT a.*, raza.nombre AS raza_nombre, color.nombre AS color_nombre, madre.nombre AS madre_nombre, padre.nombre AS padre_nombre, propietario.nombre AS propietario_nombre, hierro.nombre AS hierro_nombre, calidad.nombre AS calidad_nombre, potrero.nombre AS potrero_nombre, sector.nombre AS sector_nombre, lote.nombre AS lote_nombre, grupo.nombre AS grupo_nombre, tipo_explotacion.nombre AS tipo_explotacion_nombre, origen.value AS origen_label, ultimo_peso.peso_kg, ultimo_peso.fecha AS peso_fecha FROM pagina p JOIN animales a ON a.id = p.id 
  LEFT JOIN config_razas raza ON raza.id = a.raza_id
  LEFT JOIN config_colores color ON color.id = a.color_id
  LEFT JOIN animales madre ON madre.id = a.madre_id
  LEFT JOIN animales padre ON padre.id = a.padre_id
  LEFT JOIN propietarios propietario ON propietario.id = a.propietario_id
  LEFT JOIN hierros hierro ON hierro.id = a.hierro_id
  LEFT JOIN config_calidad_animal calidad ON calidad.id = a.calidad_animal_id
  LEFT JOIN potreros potrero ON potrero.id = a.potrero_id
  LEFT JOIN sectores sector ON sector.id = a.sector_id
  LEFT JOIN lotes lote ON lote.id = a.lote_id
  LEFT JOIN grupos grupo ON grupo.id = a.grupo_id
  LEFT JOIN config_tipos_explotacion tipo_explotacion ON tipo_explotacion.id = a.tipo_explotacion_id
  LEFT JOIN config_key_values origen ON origen.opcion = 'tipo_ingreso' AND origen.key = a.tipo_ingreso_id::text
  LEFT JOIN LATERAL (SELECT peso_kg, fecha FROM pesos WHERE animal_id = a.id ORDER BY fecha DESC, id DESC LIMIT 1) ultimo_peso ON true
 ORDER BY a.codigo ASC, a.id ASC`
const P = ["finca-A", 100, 800] as const
const PHYS = `SELECT json_build_object('tz',current_setting('TimeZone'),'ts',now()::text,'db',current_database(),'daticu',(SELECT datlocale FROM pg_database WHERE datname=current_database()),'cls',(SELECT json_build_object('rfn',relfilenode,'rp',relpages,'rt',reltuples,'rav',relallvisible,'sz',pg_relation_size(oid)) FROM pg_class WHERE oid='animales'::regclass),'vm',(SELECT json_build_object('av',all_visible,'af',all_frozen) FROM pg_visibility_map_summary('animales'::regclass)),'ixc',(SELECT json_build_object('rp',relpages,'sz',pg_relation_size(oid)) FROM pg_class WHERE oid='idx_animales_finca_activo_codigo'::regclass),'ixb',(SELECT json_build_object('rp',relpages,'sz',pg_relation_size(oid)) FROM pg_class WHERE oid='idx_animales_finca_activo'::regclass),'us',(SELECT json_build_object('nlt',n_live_tup,'ndt',n_dead_tup,'lv',last_vacuum::text,'lav',last_autovacuum::text,'la',last_analyze::text,'laa',last_autoanalyze::text) FROM pg_stat_user_tables WHERE relname='animales'),'ui',(SELECT json_agg(x) FROM (SELECT json_build_object('i',indexrelname,'s',idx_scan,'r',idx_tup_read,'f',idx_tup_fetch) AS x FROM pg_stat_user_indexes WHERE relname='animales') sub),'ps',(SELECT json_agg(x) FROM (SELECT json_build_object('a',attname,'nf',null_frac,'nd',n_distinct,'c',correlation) AS x FROM pg_stats WHERE tablename='animales' ORDER BY attname) sub),'pss','"unavailable"'::json) AS data`
async function cap(label: string, pre: (s: postgres.Sql) => Promise<unknown>) {
  const s = postgres(process.env.BENCHMARK_DATABASE_URL ?? "", { max: 1 })
  try {
    const t0 = Date.now()
    const preResult: unknown = await pre(s)
    const preMs = Date.now() - t0
    const pp = await s.unsafe<unknown[][]>(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${S02}`, [...P])
    const lit = S02.replace("$1", "'finca-A'").replace("$2", "100").replace("$3", "800")
    const pl = await s.unsafe<unknown[][]>(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${lit}`)
    const ph = ((await s.unsafe<unknown[][]>(PHYS))[0] as { data: unknown } | undefined)?.data
    let a = "pass"
    try {
      assertS02OrderedCompositeIndexPlan(pp)
    } catch (e: unknown) {
      a = e instanceof Error ? e.message : String(e)
    }
    let pss: unknown = "unavailable"
    try {
      pss = await s.unsafe(
        "SELECT json_agg(json_build_object('q',left(query,120),'c',calls,'m',mean_exec_time)) FROM pg_stat_statements WHERE query LIKE '%pagina%' LIMIT 5",
      )
    } catch {}
    writeFileSync(
      `s02-diag-${label}.json`,
      JSON.stringify(
        {
          label,
          paramTypes: ["text", "integer", "integer"],
          checksum: fixtureChecksum(),
          planPrepared: pp,
          planLiteral: pl,
          physical: ph,
          pgStatStatements: pss,
          assertion: a,
          preMs,
          preResult,
          captureMs: Date.now() - t0,
        },
        null,
        2,
      ),
    )
    // biome-ignore lint/suspicious/noConsole: diagnostic script output
    console.log(`[${label}] assertion=${a} preMs=${preMs} totalMs=${Date.now() - t0}`)
  } finally {
    await s.end({ timeout: 5 })
  }
}
const noAn = fixtureSeedSql().replace(/\nANALYZE;\s*$/mu, "")
async function main() {
  await cap("no-analyze", async (s) => {
    await s.unsafe(noAn)
    return { analyzed: false }
  })
  await cap("with-analyze", async (s) => {
    await s.unsafe(fixtureSeedSql())
    const t = Date.now()
    await s.unsafe("ANALYZE animales, pesos")
    return { analyzed: true, analyzeMs: Date.now() - t }
  })
  await cap("vacuum-prime", async (s) => {
    await s.unsafe(fixtureSeedSql())
    const tv = Date.now()
    await s.unsafe("VACUUM ANALYZE animales, pesos")
    const vacuumMs = Date.now() - tv
    for (let i = 0; i < 6; i++) await s.unsafe(S02, [...P])
    return { vacuumed: true, vacuumMs, primed: 6 }
  })
}
main().catch((e) => {
  // biome-ignore lint/suspicious/noConsole: diagnostic script error path
  console.error(e)
  process.exitCode = 1
})
