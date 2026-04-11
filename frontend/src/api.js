const BASE_URL = ''

/**
 * Upload a file to POST /api/upload
 * Returns { filename, chunk_count, message }
 */
export async function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(err.detail ?? `Upload failed: ${res.status}`)
  }

  return res.json()
}

/**
 * Send a chat message to POST /api/chat
 * Returns { answer, sources }
 */
export async function sendChat(query, sessionId, topK = 4) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, session_id: sessionId, top_k: topK }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Chat request failed' }))
    throw new Error(err.detail ?? `Chat failed: ${res.status}`)
  }

  return res.json()
}
