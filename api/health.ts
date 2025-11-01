// api/health.ts  (Nodeサーバレス関数)
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.status(200).json({
    ok: true,
    method: req.method,
    ts: new Date().toISOString()
  })
}
