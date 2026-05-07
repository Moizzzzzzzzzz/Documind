const BASE_URL = ''

/**
 * Upload a file to POST /api/upload
 * Namespace is derived server-side from the Clerk userId in the JWT.
 */
export async function uploadFile(file, token) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
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
 * Namespace is derived server-side from the Clerk userId in the JWT.
 */
export async function sendChat(query, token, topK = 4) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ query, top_k: topK }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Chat request failed' }))
    throw new Error(err.detail ?? `Chat failed: ${res.status}`)
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
