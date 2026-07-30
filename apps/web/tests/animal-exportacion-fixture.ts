/**
 * Shared fixture for the #111 PR2 exportador tests. Builds a complete,
 * format-free `AnimalListadoRow` (the PR1 port row type) with sensible
 * defaults; each test overrides only the fields it cares about. Not a test
 * file (no `.test.` in the name) so vitest does not execute it.
 */
import type { AnimalListadoRow } from "@ganaweb/aplicacion"

export function filaAnimal(overrides: Partial<AnimalListadoRow> = {}): AnimalListadoRow {
  return {
    id: "animal-1",
    codigo: "A-001",
    nombre: "Estrella",
    sexo: { key: "hembra", label: "Hembra" },
    raza: { id: "raza-1", label: "Holstein" },
    fechaNacimiento: "2020-05-01",
    edadAnios: 5,
    color: { id: "color-1", label: "Blanco" },
    origen: { id: "origen-1", label: "Nacido en finca" },
    codigoMadre: "M-001",
    nombreMadre: "Luna",
    codigoPadre: "P-001",
    nombrePadre: "Toro",
    propietario: { id: "prop-1", label: "Finca La Esperanza" },
    hierro: { id: "hierro-1", label: "Hierro A" },
    numeroPezones: 4,
    calidad: { id: "calidad-1", label: "Primera" },
    codigoArete: "ARETE-001",
    fechaCompra: null,
    precioCompra: null,
    pesoCompraKg: null,
    tatuado: false,
    herrado: true,
    descornado: false,
    codigoRfid: "RFID-001",
    potrero: { id: "potrero-1", label: "Potrero Norte" },
    sector: { id: "sector-1", label: "Sector 1" },
    lote: { id: "lote-1", label: "Lote 2" },
    grupo: { id: "grupo-1", label: "Grupo de ordeño" },
    comentarios: null,
    salud: { key: "sana", label: "Sana" },
    categoriaReproductiva: { key: "gestante", label: "Gestante" },
    estado: { key: "activa", label: "Activa" },
    pesoUltimo: { pesoKg: 480, fecha: "2026-01-15" },
    codigoQr: "QR-001",
    esDeMonta: false,
    tipoExplotacion: { id: "tipo-1", label: "Leche" },
    ...overrides,
  }
}
