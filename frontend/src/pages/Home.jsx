import React, { useState, useRef } from 'react'
import { analyseText } from '../api'

const POLARITY_META = {
  positive: { color: 'var(--pos)', bg: 'var(--pos-bg)', label: 'Positive', symbol: '+' },
  negative: { color: 'var(--neg)', bg: 'var(--neg-bg)', label: 'Negative', symbol: '−' },
  neutral:  { color: 'var(--neu)', bg: 'var(--neu-bg)', label: 'Neutral',  symbol: '○' },
  conflict: { color: 'var(--con)', bg: 'var(--con-bg)', label: 'Conflict', symbol: '±' },
}

const DEMOS = [
  "The food was absolutely delicious but the service was incredibly slow and the waitstaff seemed indifferent.",
  "Battery life is outstanding, camera quality is mediocre at best, and the price feels justified overall.",
  "The hotel room was spotless and the view was breathtaking, but the breakfast was disappointing and overpriced.",
  "Screen resolution is stunning, build quality feels premium, though the software experience is quite buggy.",
]

function HighlightedText({ text, aspects }) {
  if (!aspects || aspects.length === 0) return (
    <span style={{ color: 'var(--text-2)', fontFamily: 'var(--mono)', fontSize: '0.95rem', lineHeight: 1.8 }}>{text}</span>
  )

  const sorted = [...aspects].sort((a, b) => a.start - b.start)
  const segs = []
  let cursor = 0

  for (const asp of sorted) {
    if (asp.start > cursor) segs.push({ type: 'plain', text: text.slice(cursor, asp.start) })
    segs.push({ type: 'aspect', text: text.slice(asp.start, asp.end), asp })
    cursor = asp.end
  }
  if (cursor < text.length) segs.push({ type: 'plain', text: text.slice(cursor) })

  return (
    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.95rem', lineHeight: 2.0 }}>
      {segs.map((seg, i) => {
        if (seg.type === 'plain') return (
          <span key={i} style={{ color: 'var(--text-2)' }}>{seg.text}</span>
        )
        const m = POLARITY_META[seg.asp.polarity]
        return (
          <span key={i} style={{
            color: m.color, background: m.bg,
            borderRadius: 4, padding: '2px 6px', margin: '0 1px',
            border: `1px solid ${m.color}30`, fontWeight: 500,
            position: 'relative', display: 'inline-block',
            animation: 'fadeInAsp 0.4s ease forwards',
            animationDelay: `${i * 0.08}s`, opacity: 0,
          }}
          title={`${m.label} · ${(seg.asp.confidence * 100).toFixed(0)}% confidence`}
          >
            {seg.text}
            <span style={{
              position: 'absolute', top: -8, right: -2,
              fontSize: '0.55rem', fontWeight: 700,
              background: m.color, color: '#0C0C0F',
              borderRadius: '50%', width: 12, height: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{m.symbol}</span>
          </span>
        )
      })}
    </span>
  )
}

export default function Home() {
  const [text, setText]       = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [scanning, setScanning] = useState(false)
  const resultRef = useRef(null)

  async function handleAnalyse() {
    if (!text.trim() || loading) return
    setLoading(true); setError(null); setResult(null)
    setScanning(true)
    setTimeout(() => setScanning(false), 800)
    try {
      const data = await analyseText(text)
      setResult(data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError('Analysis failed — is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  function loadDemo() {
    setText(DEMOS[Math.floor(Math.random() * DEMOS.length)])
    setResult(null)
  }

  return (
    <main>
      <style>{`
        @keyframes fadeInAsp { from { opacity:0; transform:translateY(3px) } to { opacity:1; transform:translateY(0) } }
        @keyframes scanLine { 0%{top:0} 100%{top:100%} }
        @keyframes floatUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .analyse-btn:hover { background: #E8A84A !important; transform: translateY(-1px); }
        .demo-btn:hover { border-color: var(--amber-dim) !important; color: var(--amber) !important; }
      `}</style>

      {/* HERO */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 2rem 4rem', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(212,148,58,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}/>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: '1.5rem', animation: 'floatUp 0.6s ease forwards',
        }}>
          <div style={{ width: 40, height: 1, background: 'var(--amber-dim)', opacity: 0.5 }}/>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--amber-dim)' }}>
            Aspect-Based Sentiment Intelligence
          </span>
          <div style={{ width: 40, height: 1, background: 'var(--amber-dim)', opacity: 0.5 }}/>
        </div>

        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 'clamp(2.8rem, 6vw, 5rem)',
          fontWeight: 700, lineHeight: 1.05, textAlign: 'center',
          marginBottom: '1.2rem', maxWidth: 700,
          animation: 'floatUp 0.7s 0.1s ease both',
        }}>
          What does your text<br/><em style={{ color: 'var(--amber)', fontStyle: 'italic' }}>really</em> feel?
        </h1>

        <p style={{
          fontFamily: 'var(--sans)', fontSize: '1rem', color: 'var(--text-2)',
          textAlign: 'center', maxWidth: 480, lineHeight: 1.7,
          marginBottom: '3rem', animation: 'floatUp 0.7s 0.2s ease both',
        }}>
          Not just "positive" or "negative" — but which specific aspects carry which sentiment.
          Granularity that actually matters.
        </p>

        <div style={{
          display: 'flex', gap: '2.5rem', marginBottom: '3.5rem',
          animation: 'floatUp 0.7s 0.3s ease both',
        }}>
          {[['0.687', 'Aspect F1'], ['10M', 'Parameters'], ['+0.12', 'vs DistilBERT'], ['SemEval', 'Benchmark']].map(([v, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '1.3rem', color: 'var(--amber)', fontWeight: 500 }}>{v}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* INPUT CARD */}
        <div style={{
          width: '100%', maxWidth: 720,
          background: 'var(--bg-2)', border: '1px solid var(--border-2)',
          borderRadius: 16, overflow: 'hidden',
          animation: 'floatUp 0.7s 0.35s ease both',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          position: 'relative',
        }}>
          {scanning && (
            <div style={{
              position: 'absolute', left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent, var(--amber), transparent)',
              animation: 'scanLine 0.8s ease-in-out', zIndex: 10, pointerEvents: 'none',
            }}/>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            background: 'var(--bg-3)',
          }}>
            <div style={{ display:'flex', gap:6 }}>
              {['#C0392B','#F39C12','#27AE60'].map((c,i) => (
                <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:c, opacity:0.7 }}/>
              ))}
            </div>
            <span style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--text-3)', letterSpacing:'0.1em' }}>
              sentilens.analyse
            </span>
            <button className="demo-btn" onClick={loadDemo} style={{
              background:'transparent', border:'1px solid var(--border)',
              color:'var(--text-3)', fontSize:'0.65rem', padding:'3px 10px',
              borderRadius:4, letterSpacing:'0.08em', textTransform:'uppercase',
              transition:'all 0.2s',
            }}>Load demo</button>
          </div>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyse() }}
            placeholder="Paste any review or text here... (⌘+Enter to analyse)"
            style={{
              width:'100%', minHeight:120, padding:'1.25rem',
              background:'transparent', border:'none', outline:'none',
              color:'var(--text)', fontFamily:'var(--mono)', fontSize:'0.9rem',
              lineHeight:1.7, resize:'vertical',
            }}
          />

          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--text-3)' }}>
              {text.length}/2000 chars
            </span>
            <button className="analyse-btn" onClick={handleAnalyse} disabled={!text.trim() || loading}
              style={{
                background: loading ? 'var(--bg-4)' : 'var(--amber)',
                border:'none', color: loading ? 'var(--text-3)' : '#0C0C0F',
                padding:'8px 24px', borderRadius:8,
                fontFamily:'var(--mono)', fontSize:'0.75rem',
                fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase',
                transition:'all 0.2s', opacity: !text.trim() ? 0.4 : 1,
              }}>
              {loading ? '◎ Analysing...' : '→ Analyse'}
            </button>
          </div>

          {/* Limitation note */}
          <div style={{
            padding: '8px 16px',
            background: 'var(--bg-3)',
            fontFamily: 'var(--mono)', fontSize: '0.6rem',
            color: 'var(--text-3)', lineHeight: 1.5,
          }}>
            ◎ Works best on direct sentiment. Contrastive clauses ("great but slow") are a known open problem in ABSA research.
          </div>
        </div>

        {error && (
          <div style={{ marginTop:'1rem', color:'var(--neg)', fontFamily:'var(--mono)', fontSize:'0.8rem' }}>{error}</div>
        )}
      </section>

      {/* RESULTS */}
      {result && (
        <section ref={resultRef} style={{ padding:'0 2rem 6rem', maxWidth:720, margin:'0 auto' }}>

          <div style={{
            background:'var(--bg-2)', border:'1px solid var(--border)',
            borderRadius:16, padding:'1.75rem', marginBottom:'1.5rem',
          }}>
            <div style={{
              fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--text-3)',
              letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'1rem',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--amber)', display:'inline-block' }}/>
              Aspect Analysis
              <span style={{ marginLeft:'auto' }}>{result.latency_ms}ms</span>
            </div>
            <HighlightedText text={result.text} aspects={result.aspects} />
          </div>

          {result.aspects.length > 0 ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10, marginBottom:'1.5rem' }}>
              {result.aspects.map((asp, i) => {
                const m = POLARITY_META[asp.polarity]
                return (
                  <div key={i} style={{
                    background:'var(--bg-2)', border:`1px solid ${m.color}25`,
                    borderRadius:10, padding:'1rem',
                    animation:`fadeInAsp 0.4s ${i*0.07}s ease both`, opacity:0,
                  }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:m.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
                      {m.symbol} {m.label}
                    </div>
                    <div style={{ fontSize:'1.1rem', fontWeight:500, marginBottom:4 }}>{asp.term}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--text-3)' }}>
                      {(asp.confidence * 100).toFixed(0)}% confidence
                    </div>
                    <div style={{ marginTop:8, height:3, background:'var(--bg-4)', borderRadius:2 }}>
                      <div style={{ width:`${asp.confidence*100}%`, height:'100%', background:m.color, borderRadius:2 }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{
              textAlign:'center', padding:'2rem',
              background:'var(--bg-2)', border:'1px solid var(--border)',
              borderRadius:12, marginBottom:'1.5rem',
              fontFamily:'var(--mono)', fontSize:'0.8rem', color:'var(--text-3)',
            }}>
              No aspect terms detected in this text.
            </div>
          )}

          <div style={{
            display:'flex', gap:0,
            background:'var(--bg-2)', border:'1px solid var(--border)',
            borderRadius:10, overflow:'hidden',
          }}>
            {Object.entries(result.summary).filter(([,v]) => v > 0).map(([pol, count]) => {
              const m = POLARITY_META[pol]
              return (
                <div key={pol} style={{ flex:1, padding:'12px 16px', textAlign:'center', borderRight:'1px solid var(--border)' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:'1.2rem', color:m.color, fontWeight:500 }}>{count}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--text-3)', letterSpacing:'0.1em', marginTop:2 }}>{m.label}</div>
                </div>
              )
            })}
            <div style={{ flex:1, padding:'12px 16px', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:'1.2rem', color:'var(--amber)', fontWeight:500 }}>{result.aspects.length}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--text-3)', letterSpacing:'0.1em', marginTop:2 }}>Total Aspects</div>
            </div>
          </div>

        </section>
      )}

      {/* HOW IT WORKS */}
      {!result && (
        <section style={{ padding:'0 2rem 8rem', maxWidth:900, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {[
              ['01', 'Tokenise', 'WordPiece tokenisation preserves subword structure. Character offsets tracked for pixel-perfect highlighting.'],
              ['02', 'Encode', '4-layer custom Transformer encoder. 8-head attention. Sinusoidal positional encoding. Written from scratch.'],
              ['03', 'Decode', 'BIO span extraction finds aspect terms. Polarity classified from mean-pooled span representations.'],
            ].map(([n, title, desc]) => (
              <div key={n} style={{
                background:'var(--bg-2)', border:'1px solid var(--border)',
                borderRadius:12, padding:'1.25rem',
              }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--amber)', marginBottom:8 }}>{n}</div>
                <div style={{ fontWeight:500, marginBottom:6, fontSize:'0.95rem' }}>{title}</div>
                <div style={{ fontSize:'0.8rem', color:'var(--text-2)', lineHeight:1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}