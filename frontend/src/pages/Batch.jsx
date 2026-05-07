import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { analyseBatch } from '../api'

const DEMO_REVIEWS = [
  "The pasta was heavenly but the service took forever and the wine selection was disappointing.",
  "Absolutely love the ambiance here, food quality is consistently excellent, prices are reasonable.",
  "Staff was rude and unhelpful, but the food made up for it — best pizza in the city.",
  "The steak was overcooked, the sides were cold, and the service was inattentive all evening.",
  "Fantastic location, stunning views, mediocre food, and the noise level was unbearable.",
  "Great cocktails, decent food, friendly staff — would definitely come back for drinks.",
  "The dessert menu is outstanding but the main courses lack creativity and the portions are small.",
  "Service was impeccable, every dish was perfectly executed, worth every penny.",
  "The soup was lukewarm, bread was stale, but the fish was cooked to perfection.",
  "Loud atmosphere, long waits, but the food quality genuinely justifies the experience.",
]

const POL_COLORS = { positive:'#2D9E6B', negative:'#C0392B', neutral:'#6B7280', conflict:'#7C5CBF' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null
  return (
    <div style={{
      background:'var(--bg-3)', border:'1px solid var(--border-2)',
      borderRadius:8, padding:'10px 14px',
      fontFamily:'var(--mono)', fontSize:'0.75rem',
    }}>
      <div style={{ color:'var(--text)', marginBottom:4, fontWeight:500 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color:p.fill, marginTop:2 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

export default function Batch() {
  const [text, setText]   = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleAnalyse() {
    const reviews = text.split('\n').map(r => r.trim()).filter(r => r.length > 5)
    if (!reviews.length) return
    setLoading(true); setError(null)
    try {
      const data = await analyseBatch(reviews)
      setResult(data)
    } catch(e) {
      setError('Batch analysis failed — is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  function loadDemo() {
    setText(DEMO_REVIEWS.join('\n'))
    setResult(null)
  }

  const chartData = result?.aspect_summary.slice(0, 12).map(a => ({
    name: a.term,
    positive: a.positive,
    negative: a.negative,
    neutral: a.neutral,
    score: a.sentiment_score,
  })) || []

  return (
    <main style={{ padding:'100px 2rem 6rem', maxWidth:960, margin:'0 auto' }}>
      <style>{`
        @keyframes floatUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ marginBottom:'2.5rem', animation:'floatUp 0.6s ease forwards' }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--amber)', letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:'0.75rem' }}>
          ◎ Batch Analysis
        </div>
        <h1 style={{ fontFamily:'var(--serif)', fontSize:'clamp(2rem,4vw,3rem)', marginBottom:'0.75rem' }}>
          Review Intelligence<br/><em style={{ color:'var(--amber)' }}>Dashboard</em>
        </h1>
        <p style={{ color:'var(--text-2)', fontSize:'0.9rem', maxWidth:500, lineHeight:1.7 }}>
          Paste multiple reviews — one per line. Get aggregated aspect sentiment analytics across all of them.
        </p>
      </div>

      {/* Input */}
      <div style={{
        background:'var(--bg-2)', border:'1px solid var(--border-2)',
        borderRadius:16, overflow:'hidden', marginBottom:'1.5rem',
        animation:'floatUp 0.6s 0.1s ease both', opacity:0,
      }}>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'12px 16px', borderBottom:'1px solid var(--border)',
          background:'var(--bg-3)',
        }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--text-3)', letterSpacing:'0.1em' }}>
            {text.split('\n').filter(r => r.trim().length > 5).length} reviews ready
          </span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={loadDemo} style={{
              background:'transparent', border:'1px solid var(--border)',
              color:'var(--text-3)', fontSize:'0.65rem', padding:'4px 12px',
              borderRadius:4, letterSpacing:'0.08em', textTransform:'uppercase',
              cursor:'pointer', transition:'all 0.2s',
            }}
            onMouseEnter={e=>{e.target.style.borderColor='var(--amber-dim)';e.target.style.color='var(--amber)'}}
            onMouseLeave={e=>{e.target.style.borderColor='var(--border)';e.target.style.color='var(--text-3)'}}
            >Load 10 demo reviews</button>
            <button onClick={handleAnalyse} disabled={loading} style={{
              background:'var(--amber)', border:'none', color:'#0C0C0F',
              fontSize:'0.65rem', padding:'4px 16px', borderRadius:4,
              letterSpacing:'0.08em', textTransform:'uppercase',
              cursor:'pointer', fontWeight:500, transition:'all 0.2s',
              opacity: loading ? 0.5 : 1,
            }}>
              {loading ? '◎ Analysing...' : '→ Run'}
            </button>
          </div>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={"Paste reviews here, one per line:\n\nThe food was great but service was slow.\nBattery life is amazing, camera is mediocre.\n..."}
          style={{
            width:'100%', height:180, padding:'1.25rem',
            background:'transparent', border:'none', outline:'none',
            color:'var(--text)', fontFamily:'var(--mono)', fontSize:'0.85rem',
            lineHeight:1.7, resize:'vertical',
          }}
        />
      </div>

      {error && <div style={{ color:'var(--neg)', fontFamily:'var(--mono)', fontSize:'0.8rem', marginBottom:'1rem' }}>{error}</div>}

      {/* Results */}
      {result && (
        <div style={{ animation:'floatUp 0.5s ease forwards' }}>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:'1.5rem' }}>
            {[
              ['Reviews', result.total_reviews, 'var(--amber)'],
              ['Aspects found', result.total_aspects, 'var(--text)'],
              ['Unique terms', result.aspect_summary.length, 'var(--text)'],
              ['Top positive', result.top_positive[0] || '—', 'var(--pos)'],
            ].map(([l, v, c]) => (
              <div key={l} style={{
                background:'var(--bg-2)', border:'1px solid var(--border)',
                borderRadius:10, padding:'1rem', textAlign:'center',
              }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:'1.4rem', color:c, fontWeight:500 }}>{v}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--text-3)', letterSpacing:'0.1em', marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Bar chart — aspect frequency */}
          <div style={{
            background:'var(--bg-2)', border:'1px solid var(--border)',
            borderRadius:14, padding:'1.5rem', marginBottom:'1.5rem',
          }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--text-3)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'1rem' }}>
              Aspect Frequency + Sentiment Breakdown
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top:4, right:8, bottom:4, left:0 }}>
                <XAxis dataKey="name" tick={{ fill:'var(--text-3)', fontSize:11, fontFamily:'var(--mono)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'var(--text-3)', fontSize:10, fontFamily:'var(--mono)' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="positive" stackId="a" fill="#2D9E6B" radius={[0,0,0,0]}/>
                <Bar dataKey="neutral"  stackId="a" fill="#6B7280"/>
                <Bar dataKey="negative" stackId="a" fill="#C0392B" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sentiment score table */}
          <div style={{
            background:'var(--bg-2)', border:'1px solid var(--border)',
            borderRadius:14, overflow:'hidden',
          }}>
            <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid var(--border)', fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--text-3)', letterSpacing:'0.12em', textTransform:'uppercase' }}>
              Aspect Sentiment Scores (−1 = all negative, +1 = all positive)
            </div>
            {result.aspect_summary.slice(0, 10).map((asp, i) => {
              const score = asp.sentiment_score
              const color = score > 0.2 ? 'var(--pos)' : score < -0.2 ? 'var(--neg)' : 'var(--neu)'
              return (
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'140px 1fr 60px',
                  alignItems:'center', gap:16,
                  padding:'10px 1.25rem',
                  borderBottom: i < result.aspect_summary.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:'0.85rem' }}>{asp.term}</div>
                  <div style={{ position:'relative', height:6, background:'var(--bg-4)', borderRadius:3 }}>
                    <div style={{
                      position:'absolute',
                      left: score >= 0 ? '50%' : `${50 + score*50}%`,
                      width: `${Math.abs(score)*50}%`,
                      height:'100%', borderRadius:3,
                      background: color,
                      transition:'all 0.8s ease',
                    }}/>
                    <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:1, background:'var(--border-2)' }}/>
                  </div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:'0.75rem', color, textAlign:'right' }}>
                    {score > 0 ? '+' : ''}{score.toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      )}
    </main>
  )
}
