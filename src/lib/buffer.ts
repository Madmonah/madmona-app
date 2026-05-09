// src/lib/buffer.ts
// Buffer Publishing API v2 (GraphQL) client
// Migration: Classic API v1 -> GraphQL API v2 (2026-05-08)
// API endpoint: https://api.buffer.com/graphql
//
// Setup:
//   1. Get token from https://login.buffer.com/developers
//   2. Set env vars in Vercel:
//      - BUFFER_ACCESS_TOKEN=<your token>
//      - BUFFER_ORGANIZATION_ID=69fdaa0b62b7b2a67ceb40c6
//      - BUFFER_INSTAGRAM_CHANNEL_ID=69fdaa9d5c4c051afa22bbad
//      - BUFFER_FACEBOOK_PAGE_CHANNEL_ID=69fdaaca5c4c051afa22bc45
//      - BUFFER_FACEBOOK_GROUP_CHANNEL_ID=69fdab9a5c4c051afa22bf1f

const BUFFER_TOKEN = process.env.BUFFER_ACCESS_TOKEN
const BUFFER_GRAPHQL = 'https://api.buffer.com/graphql'

export function isBufferConfigured(): boolean {
  return !!BUFFER_TOKEN
}

export interface BufferChannel {
  id: string
  service: string  // 'instagram' | 'facebook' | 'twitter' | ...
  serviceId: string
  name: string
  displayName: string
  type: string  // 'business' | 'page' | 'group' | ...
  isDisconnected: boolean
}

export interface BufferPostResult {
  ok: boolean
  post_id?: string
  error?: string
}

/**
 * Run a GraphQL query/mutation against Buffer's API.
 */
async function bufferGraphQL<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<{ ok: boolean; data?: T; error?: string }> {
  if (!BUFFER_TOKEN) {
    return { ok: false, error: 'BUFFER_ACCESS_TOKEN missing' }
  }

  try {
    const res = await fetch(BUFFER_GRAPHQL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BUFFER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: variables ?? {} }),
    })

    const json = await res.json() as {
      data?: T
      errors?: Array<{ message: string }>
    }

    if (json.errors && json.errors.length > 0) {
      return { ok: false, error: json.errors.map(e => e.message).join('; ') }
    }

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` }
    }

    return { ok: true, data: json.data }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' }
  }
}

/**
 * Get the Buffer account info + organizations.
 * Useful for first-time setup to find the organization ID.
 */
export async function getBufferAccount(): Promise<{
  ok: boolean
  account?: {
    id: string
    email: string
    name: string | null
    organizations: Array<{ id: string; name: string }>
  }
  error?: string
}> {
  const result = await bufferGraphQL<{
    account: {
      id: string
      email: string
      name: string | null
      organizations: Array<{ id: string; name: string }>
    }
  }>(`
    query {
      account {
        id
        email
        name
        organizations { id name }
      }
    }
  `)

  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, account: result.data?.account }
}

/**
 * List all connected social channels for an organization.
 * Returns channel IDs needed for posting.
 */
export async function getBufferChannels(organizationId: string): Promise<{
  ok: boolean
  channels?: BufferChannel[]
  error?: string
}> {
  const result = await bufferGraphQL<{ channels: BufferChannel[] }>(
    `
    query GetChannels($organizationId: OrganizationId!) {
      channels(input: { organizationId: $organizationId }) {
        id
        service
        serviceId
        name
        displayName
        type
        isDisconnected
      }
    }
    `,
    { organizationId }
  )

  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, channels: result.data?.channels ?? [] }
}

/**
 * Create a post on Buffer.
 * - status='draft' = save as draft (not published)
 * - status='scheduled' + scheduledAt = scheduled post
 * - status='queued' = added to queue (auto-publishes at optimal time)
 * - status='posting' = post immediately (sent to social channel right away)
 *
 * Returns post ID. Buffer creates ONE post per channel.
 */
export async function createBufferPost(args: {
  channelIds: string[]
  text: string
  imageUrl?: string
  scheduledAt?: Date  // if not provided + status='scheduled', goes to queue
  status?: 'draft' | 'scheduled' | 'queued' | 'posting'
}): Promise<BufferPostResult> {
  if (!BUFFER_TOKEN) {
    return { ok: false, error: 'Buffer not configured' }
  }
  if (args.channelIds.length === 0) {
    return { ok: false, error: 'No channel IDs provided' }
  }

  const status = args.status ?? 'queued'

  // Build the input for createPost
  const input: Record<string, unknown> = {
    organizationId: process.env.BUFFER_ORGANIZATION_ID,
    channelIds: args.channelIds,
    text: args.text,
    status,
  }

  if (args.imageUrl) {
    input.media = {
      photos: [{ url: args.imageUrl, altText: '' }],
    }
  }

  if (args.scheduledAt && status === 'scheduled') {
    input.scheduledAt = Math.floor(args.scheduledAt.getTime() / 1000)
  }

  const result = await bufferGraphQL<{
    createPost: {
      __typename: string
      message?: string
      post?: { id: string }
    }
  }>(
    `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        __typename
        ... on CreatePostSuccess {
          post { id }
        }
        ... on CreatePostError {
          message
        }
      }
    }
    `,
    { input }
  )

  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  const data = result.data?.createPost
  if (data?.__typename === 'CreatePostError') {
    return { ok: false, error: data.message ?? 'Buffer rejected the post' }
  }

  if (!data?.post?.id) {
    return { ok: false, error: 'No post ID returned from Buffer' }
  }

  return { ok: true, post_id: data.post.id }
}

/**
 * Legacy adapter for old buffer-publisher.ts API.
 * Maps profileIds -> channelIds and routes to GraphQL.
 */
export async function postToBuffer(args: {
  profileIds: string[]  // legacy name; now treated as channelIds
  text: string
  imageUrl?: string
  scheduledAt?: Date
  postNow?: boolean
}): Promise<{
  ok: boolean
  update_id?: string
  buffer_count?: number
  error?: string
}> {
  const result = await createBufferPost({
    channelIds: args.profileIds,
    text: args.text,
    imageUrl: args.imageUrl,
    scheduledAt: args.scheduledAt,
    status: args.postNow ? 'posting' : 'queued',
  })

  return {
    ok: result.ok,
    update_id: result.post_id,
    error: result.error,
  }
}
