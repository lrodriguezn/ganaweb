#!/usr/bin/env node
/**
 * `apps/web/scripts/server.mjs` — Node.js runtime para el bundle de
 * producción de TanStack Start v1 (PR5).
 *
 * Contexto: `vite build` produce `dist/server/server.js` (default
 * entry de `@tanstack/react-start/server-entry`) que exporta un
 * objeto con un método `fetch(request)` estándar Web. El entry NO
 * arranca un servidor HTTP por sí mismo — está pensado para
 * runtimes tipo Cloudflare Workers / Deno Deploy / Bun, o para
 * un wrapper de Node. Este archivo es ese wrapper para Node.
 *
 * Para runtimes con streaming nativo (Bun, Deno, srvx), este
 * archivo no se usa; en Vercel/Netlify, el adaptador del provider
 * envuelve el `fetch` directamente.
 *
 * Variables de entorno:
 *   - `PORT`  (opcional) Puerto HTTP. Default 3000.
 *   - `HOST`  (opcional) Host de bind.    Default "0.0.0.0".
 *
 * Uso:
 *   pnpm --filter @ganaweb/web build   # genera dist/server/server.js
 *   pnpm --filter @ganaweb/web start   # corre este wrapper
 *
 * Limitaciones conocidas (se resuelven en un PR futuro):
 *   - No sirve los assets estáticos de `dist/client/`. El
 *     `fetch` del bundle hace 404 sobre GETs a `/assets/*`. En
 *     producción real, un reverse proxy (nginx/Caddy) o un
 *     adaptador Vercel sirve `dist/client/`. Para desarrollo
 *     local, `pnpm dev` corre Vite con HMR y no necesita este
 *     wrapper.
 */

import { createServer } from "node:http"
import { Readable } from "node:stream"
import server from "../dist/server/server.js"

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? "0.0.0.0"

const nodeToWebRequest = (req) => {
  const protocol = "http"
  const host = req.headers.host ?? `${HOST}:${PORT}`
  const url = `${protocol}://${host}${req.url}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value))
  }
  const init = { method: req.method, headers }
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Readable.toWeb(req)
    init.duplex = "half"
  }
  return new Request(url, init)
}

const sendWebResponse = async (webResponse, res) => {
  res.statusCode = webResponse.status
  res.statusMessage = webResponse.statusText
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  if (!webResponse.body) {
    res.end()
    return
  }
  const reader = webResponse.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    res.write(Buffer.from(value))
  }
  res.end()
}

const httpServer = createServer(async (req, res) => {
  try {
    const webRequest = nodeToWebRequest(req)
    const webResponse = await server.fetch(webRequest)
    await sendWebResponse(webResponse, res)
  } catch (err) {
    console.error("[server] unhandled error:", err)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader("content-type", "text/plain; charset=utf-8")
    }
    res.end("Internal Server Error")
  }
})

httpServer.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`)
})

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`[server] received ${sig}, shutting down`)
    httpServer.close(() => process.exit(0))
  })
}
