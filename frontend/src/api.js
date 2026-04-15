const BASE_URL = ''

/**
 * Upload a file to POST /api/upload
 * Returns { filename, s3_key, chunk_count, message }
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

/**
 * GET /api/history?session_id={id}
 * Backend may not expose this endpoint — callers should handle gracefully.
 * Returns { history: Array<{human, ai}> } or throws.
 */
export async function getHistory(sessionId) {
  const res = await fetch(`${BASE_URL}/api/history?session_id=${encodeURIComponent(sessionId)}`)

  if (!res.ok) {
    throw new Error(`History unavailable: ${res.status}`)
  }

  return res.json()
}

/**
 * Format a file's byte size into a human-readable string (e.g. "2.4 MB")
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
