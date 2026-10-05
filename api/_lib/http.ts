export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

/** An error whose message is safe to show to the customer. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      return await fn(req)
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status)
      console.error(err)
      return json({ error: 'Something went wrong. Please try again.' }, 500)
    }
  }
}

export function env(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}
