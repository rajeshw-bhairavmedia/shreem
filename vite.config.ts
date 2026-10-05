import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Runs the Vercel functions in api/ inside the Vite dev server, so
 * `npm run dev` serves the whole store (site + checkout API) locally.
 */
function localApi(): Plugin {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const name = url.pathname.match(/^\/api\/([a-z-]+)\/?$/)?.[1]
        if (!name) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`)
          const handler = mod[req.method ?? 'GET'] as ((r: Request) => Promise<Response>) | undefined
          if (!handler) {
            res.statusCode = 405
            return res.end()
          }
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const response = await handler(
            new Request(url, {
              method: req.method,
              headers,
              body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
            }),
          )
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Make .env values (including server secrets) available to the api/ functions.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), localApi()],
  }
})
