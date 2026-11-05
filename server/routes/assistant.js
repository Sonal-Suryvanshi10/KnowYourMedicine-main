import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { medicineAssistantRules } from '../assistant-rules.js'
import { asyncHandler } from '../middleware.js'

const router = Router()
const requestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many assistant requests. Please wait a few minutes and try again.' },
})

router.post('/', requestLimiter, asyncHandler(async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(503).json({ message: 'Gemini is not configured in the running API process. Add GEMINI_API_KEY to the backend .env file and restart the API server.' })

  const { messages } = req.body || {}
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 8) {
    return res.status(400).json({ message: 'Send between 1 and 8 recent chat messages.' })
  }

  const conversation = messages.map(message => {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string') return null
    const content = message.content.trim()
    return content && content.length <= 1000 ? { role: message.role, content } : null
  })
  if (conversation.some(message => !message) || conversation.at(-1)?.role !== 'user') {
    return res.status(400).json({ message: 'The chat message is invalid. Please try again.' })
  }
  if (conversation[0]?.role !== 'user') {
    return res.status(400).json({ message: 'The chat history must start with your question. Please send it again.' })
  }
  if (conversation.reduce((length, message) => length + message.content.length, 0) > 4000) {
    return res.status(400).json({ message: 'Please shorten the conversation and try again.' })
  }

  let upstream
  try {
    const model = encodeURIComponent(process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite')
    upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: medicineAssistantRules }] },
        contents: conversation.map(message => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
      }),
      signal: AbortSignal.timeout(30000),
    })
  } catch (error) {
    console.error('Medicine assistant provider request failed:', error.name || 'NetworkError')
    return res.status(502).json({ message: 'The medicine assistant could not connect right now. Please try again later.' })
  }

  if (!upstream.ok) {
    let providerMessage = ''
    try {
      const providerError = await upstream.json()
      providerMessage = typeof providerError.error?.message === 'string' ? providerError.error.message : ''
    } catch {
      providerMessage = ''
    }
    const safeProviderMessage = providerMessage
      .replaceAll(apiKey, '[redacted]')
      .replace(/[\r\n\t]+/g, ' ')
      .slice(0, 300)
    console.error(`Gemini request failed with HTTP ${upstream.status}${providerErrorCode(upstream.status)}.`)
    const message = upstream.status === 429
      ? 'Gemini rate limit or quota reached. Check the Google AI Studio project quota and billing, then try again.'
      : upstream.status === 400 || upstream.status === 403 || upstream.status === 404
        ? `Gemini rejected the request. Check that GEMINI_API_KEY is valid and GEMINI_MODEL is available to your project.${safeProviderMessage ? ` Details: ${safeProviderMessage}` : ''}`
        : 'Gemini is temporarily unavailable. Please try again later.'
    return res.status(502).json({ message })
  }

  let result
  try {
    result = await upstream.json()
  } catch (error) {
    console.error('Medicine assistant returned an invalid provider response:', error.name || 'ResponseError')
    return res.status(502).json({ message: 'The assistant returned an invalid response. Please try again later.' })
  }
  const reply = result.candidates?.[0]?.content?.parts
    ?.map(part => part.text || '')
    .join('')
    .trim()
  if (!reply) {
    console.error('Medicine assistant provider response did not contain a text candidate.')
    return res.status(502).json({ message: 'The assistant did not return a response. Please try again.' })
  }
  res.json({ reply })
}))

export default router

function providerErrorCode(status) {
  return status === 401 || status === 403 ? ' (check API key permissions)' : ''
}
