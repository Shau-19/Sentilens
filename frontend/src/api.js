const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function analyseText(text) {
  const r = await fetch(`${BASE}/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function analyseBatch(reviews) {
  const r = await fetch(`${BASE}/analyse/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviews }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getModelInfo() {
  const r = await fetch(`${BASE}/model/info`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getHealth() {
  const r = await fetch(`${BASE}/health`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
