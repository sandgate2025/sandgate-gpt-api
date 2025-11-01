import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const ALLOW = process.env.ALLOW_ORIGIN || '*'
const KEY = process.env.OPENAI_API_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Access-Control-Allow-Origin', ALLOW)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
    if (!KEY) return res.status(500).json({ error: 'missing_api_key' })

    const body = (req.body || {}) as any
    const {
      target, pain, tone, cta, brand, bookUrl,
      fixedTags = [], extraTags = [], lengthLimit = 0, count = 10
    } = body

    const client = new OpenAI({ apiKey: KEY })

    const system = `あなたはメンズ美容室（SANDGATE/福井）向けのSNSコピーライター。
スクロール停止フック→心理トリガー→好奇心ギャップ→強いCTA→適切なタグ、の順で
短く鋭い日本語コピーを作る。縦長サムネ文言は8〜16字で強ワード中心。
NG: 誇大広告/医療的断定/差別表現。`

    const prompt = `入力:
- ターゲット: ${target}
- 悩み/制約: ${pain}
- トーン: ${tone}
- CTA: ${cta}
- ブランド: ${brand}
- 予約URL(任意): ${bookUrl || 'なし'}
- 固定タグ: ${(fixedTags || []).join(' ')}
- 追加タグ: ${(extraTags || []).join(' ')}
- 文字数上限: ${lengthLimit || '制限なし'}
- 本数: ${count}

要件:
- 構文/語彙/語尾を十分にゆらし、重複を避ける
- thumb(8〜16字の強ワード) と body(60〜120字基準、上限があれば優先)
- body末尾にタグ1行（固定＋ローカル/フェード系を適度に）
- 予約URLがあればCTA行の末尾に "→ URL"
- 出力は JSON: { "items": [ { "body": "...", "thumb": "..." }, ... ] }`

    const rsp = await client.responses.create({
      model: MODEL,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ]
      // ← ここに response_format / text は入れない
    })

    const text =
      (rsp as any).output_text ||
      (rsp as any).choices?.[0]?.message?.content ||
      ''

    let out: any
    try { out = JSON.parse(text) }
    catch { out = { items: [{ body: String(text).slice(0, 300), thumb: '清潔感、正義' }] } }

    return res.status(200).json(out)
  } catch (e: any) {
    console.error('[generate] error:', e)
    return res.status(500).json({ error: 'generation_failed', detail: String(e?.message || e) })
  }
}
