// lib/anthropic.ts
// Shared Anthropic client for all Madmona agents

import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929'

/**
 * Call Claude with a system prompt and user message.
 * Returns the text content of the response.
 */
export async function callClaude(opts: {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  temperature?: number
}): Promise<string> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    // Bumped to 8192 (was 4096) to prevent JSON truncation across all agents.
    max_tokens: opts.maxTokens ?? 8192,
    temperature: opts.temperature ?? 0.7,
    system: opts.systemPrompt,
    messages: [
      {
        role: 'user',
        content: opts.userMessage,
      },
    ],
  })

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text content')
  }

  return textBlock.text
}

/**
 * Parse a JSON response from Claude. Robust against:
 *   - Markdown code fences
 *   - Leading/trailing prose
 *   - Truncated responses (closes unclosed strings/objects/arrays)
 *   - Trailing commas
 *   - Mid-JSON truncation (extracts last complete top-level object)
 */
export function parseJsonResponse<T = unknown>(text: string): T {
  // Strip markdown code fences
  let cleaned = text
    .replace(/^[\s\S]*?```json\s*/i, '')
    .replace(/^[\s\S]*?```\s*/i, '')
    .replace(/\s*```[\s\S]*$/i, '')
    .trim()

  // If still doesn't start with { or [, try to extract the JSON object
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const objMatch = cleaned.match(/\{[\s\S]*\}/)
    const arrMatch = cleaned.match(/\[[\s\S]*\]/)
    if (objMatch && (!arrMatch || objMatch[0].length > arrMatch[0].length)) {
      cleaned = objMatch[0]
    } else if (arrMatch) {
      cleaned = arrMatch[0]
    }
  }

  // First attempt: parse as-is
  try {
    return JSON.parse(cleaned) as T
  } catch {}

  // Repair strategy 1: Remove trailing commas
  try {
    return JSON.parse(cleaned.replace(/,(\s*[}\]])/g, '$1')) as T
  } catch {}

  // Repair strategy 2: Close truncated strings + unclosed brackets
  try {
    let s = cleaned
    // Count unescaped quotes; if odd, close the open string
    const quotes = (s.match(/(?<!\\)"/g) || []).length
    if (quotes % 2 === 1) s += '"'
    // Close unclosed objects/arrays by tracking depth
    const stack: string[] = []
    let inString = false
    let escape = false
    for (let i = 0; i < s.length; i++) {
      const c = s[i]
      if (escape) { escape = false; continue }
      if (c === '\\') { escape = true; continue }
      if (c === '"') { inString = !inString; continue }
      if (inString) continue
      if (c === '{') stack.push('}')
      else if (c === '[') stack.push(']')
      else if (c === '}' || c === ']') stack.pop()
    }
    // Strip trailing comma before adding closers
    s = s.replace(/,\s*$/, '')
    while (stack.length > 0) s += stack.pop()
    return JSON.parse(s) as T
  } catch {}

  // Repair strategy 3: Find last complete top-level object
  try {
    let depth = 0
    let lastValid = -1
    let inString = false
    let escape = false
    for (let i = 0; i < cleaned.length; i++) {
      const c = cleaned[i]
      if (escape) { escape = false; continue }
      if (c === '\\') { escape = true; continue }
      if (c === '"') { inString = !inString; continue }
      if (inString) continue
      if (c === '{' || c === '[') depth++
      if (c === '}' || c === ']') {
        depth--
        if (depth === 0) lastValid = i
      }
    }
    if (lastValid > 0) {
      return JSON.parse(cleaned.slice(0, lastValid + 1)) as T
    }
  } catch {}

  throw new Error(
    `Failed to parse Claude response as JSON after all repair attempts.\n\nFirst 500 chars:\n${text.slice(0, 500)}\n\nLast 200 chars:\n${text.slice(-200)}`
  )
}
