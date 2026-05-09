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
    // Default 4096 (was 2048) — most Madmona agents return JSON >2k tokens.
    // Bump explicitly via opts.maxTokens for very large outputs (8k max safe).
    max_tokens: opts.maxTokens ?? 4096,
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
 * Parse a JSON response from Claude, handling code fences if present.
 * Falls back to extracting the largest valid JSON object if the response
 * is wrapped in extra text or got truncated mid-string.
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

  try {
    return JSON.parse(cleaned) as T
  } catch (err) {
    // Try to repair common issues: trailing commas, truncated strings
    try {
      // Remove trailing commas before } or ]
      const repaired = cleaned
        .replace(/,(\s*[}\]])/g, '$1')
        // If truncated mid-string, close the last open string
        .replace(/("[^"\\]*(?:\\.[^"\\]*)*?)$/, '$1"')
      return JSON.parse(repaired) as T
    } catch {
      throw new Error(
        `Failed to parse Claude response as JSON: ${(err as Error).message}\n\nResponse:\n${text.slice(0, 500)}...`
      )
    }
  }
}
