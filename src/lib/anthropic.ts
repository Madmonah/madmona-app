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
    max_tokens: opts.maxTokens ?? 2048,
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
 */
export function parseJsonResponse<T = unknown>(text: string): T {
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned) as T
  } catch (err) {
    throw new Error(
      `Failed to parse Claude response as JSON: ${(err as Error).message}\n\nResponse:\n${text}`
    )
  }
}
