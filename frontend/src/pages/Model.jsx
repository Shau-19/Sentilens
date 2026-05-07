import React, { useEffect, useState } from 'react'
import { getModelInfo, getHealth } from '../api'

const PHASE_DATA = [
  { phase:'Phase 2', model:'DistilBERT (pretrained)', params:'66M', asp_f1:0.5697, color:'#C0392B' },
  { phase:'Phase 3', model:'Custom Transformer (scratch)', params:'10M', asp_f1:0.6874, color:'#D4943A' },
]

const ABLATION = [
  { condition:'DistilBERT fine-tune (baseline)', asp_f1:0.5697, pol_f1:0.2759 },
  { condition:'Stage 1 only (heads frozen)', asp_f1:0.0241, pol_f1:0.1688 },
  { condition:'Stage 2 (top 2 layers)', asp_f1:0.4042, pol_f1:0.2253 },
  { condition:'Stage 3 (full fine-tune)', asp_f1:0.5697, pol_f1:0.2759 },
  { condition:'Custom Transformer V1 (scratch)', asp_f1:0.6874, pol_f1:0.2759 },
  { condition:'+ Span pooling (V2)', asp_f1:0.6786, pol_f1:0.4877 },
]

export default function Model() {
  const [info, setInfo]     = useState(null)
  const [health, setHealth] = useState(null)

  useEffect(() => {
    getModelInfo().then(setInfo).catch(()=>{})
    getHealth().then(setHealth).catch(()=>{})
  }, [])

  return (
    <main style={{ padding:'100px 2rem 6rem', maxWidth:900, margin:'0 auto' }}>
      <style>{`
        @keyframes floatUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:'3rem', animation:'floatUp 0.6s ease forwards' }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--amber)', letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:'0.75rem' }}>
          ◎ Architecture + Training
        </div>
        <h1 style={{ fontFamily:'var(--serif)', fontSize:'clamp(2rem,4vw,3rem)', marginBottom:'0.75rem' }}>
          Inside <em style={{ color:'var(--amber)' }}>SentiLens</em>
        </h1>
        <p style={{ color:'var(--text-2)', fontSize:'0.9rem', maxWidth:540, lineHeight:1.7 }}>
          A 4-layer Transformer encoder written from scratch in PyTorch, with clause-aware inference
          and span-pooled polarity classification.
        </p>
      </div>

      {/* Live status */}
      <div style={{ display:'flex', gap:10, marginBottom:'2.5rem', flexWrap:'wrap', animation:'floatUp 0.6s 0.05s ease both', opacity:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 14px' }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background: health ? 'var(--pos)' : 'var(--text-3)', boxShadow: health ? '0 0 6px var(--pos)' : 'none' }}/>
          <span style={{ fontFamily:'var(--mono)', fontSize:'0.7rem', color:'var(--text-2)' }}>
            {health ? `API live · ${health.latency_ms}ms` : 'API offline'}
          </span>
        </div>
        {info && (
          <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 14px', fontFamily:'var(--mono)', fontSize:'0.7rem', color:'var(--text-2)' }}>
            {info.params_total.toLocaleString()} parameters
          </div>
        )}
        <a href="https://wandb.ai/shauryajain19052003-guru-gobind-singh-indraprastha-unive/sentilens"
          target="_blank" style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 14px', fontFamily:'var(--mono)', fontSize:'0.7rem', color:'var(--amber)', transition:'all 0.2s', display:'flex', alignItems:'center', gap:6 }}
          onMouseEnter={e=>e.currentTarget.style.borderColor='var(--amber-dim)'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
        >W&B Report ↗</a>
      </div>

      {/* Full inference pipeline */}
      <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:14, padding:'1.75rem', marginBottom:'1.5rem', animation:'floatUp 0.6s 0.08s ease both', opacity:0 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--text-3)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'1.5rem' }}>
          Full Inference Pipeline
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'center' }}>
          {[
            { label:'Input text', detail:'Raw review or sentence', color:'var(--text-3)', w:300 },
            { label:'Clause Splitter', detail:'Split on: but · however · although · yet · whereas · nevertheless', color:'var(--con)', w:480, highlight:'con' },
            { label:'WordPiece Tokeniser', detail:'char offsets tracked per clause for accurate highlighting', color:'var(--text-2)', w:420 },
            { label:'Custom Transformer Encoder × 4 layers', detail:'8-head attention · FFN 256→1024→256 · Pre-norm · GELU · written from scratch', color:'var(--amber)', w:520, highlight:'amber' },
            { label:'BIO Span Head · Linear(256→3)', detail:'O / B-ASP / I-ASP — finds aspect term boundaries', color:'var(--pos)', w:440 },
            { label:'Span Pooling', detail:'Mean-pool hidden states across all tokens in each aspect span', color:'var(--pos)', w:440, highlight:'pos' },
            { label:'Polarity Head · Linear(256→4)', detail:'pos / neg / neutral / conflict — classified from pooled span', color:'var(--neg)', w:440 },
            { label:'Offset Adjustment', detail:'Clause-relative offsets shifted back to original text positions', color:'var(--text-2)', w:380 },
            { label:'AspectResult[]', detail:'term · polarity · confidence · char offsets for highlighting', color:'var(--amber)', w:340 },
          ].map((layer, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ width:1, height:14, background:'var(--border-2)' }}/>}
              <div style={{
                width:layer.w, maxWidth:'100%', textAlign:'center',
                background: layer.highlight === 'amber' ? 'rgba(212,148,58,0.06)'
                          : layer.highlight === 'con'   ? 'rgba(124,92,191,0.06)'
                          : layer.highlight === 'pos'   ? 'rgba(45,158,107,0.06)'
                          : 'var(--bg-3)',
                border: `1px solid ${
                  layer.highlight === 'amber' ? 'rgba(212,148,58,0.25)'
                : layer.highlight === 'con'   ? 'rgba(124,92,191,0.25)'
                : layer.highlight === 'pos'   ? 'rgba(45,158,107,0.25)'
                : 'var(--border)'}`,
                borderRadius:8, padding:'10px 16px',
              }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:'0.8rem', color:layer.color, fontWeight:500 }}>{layer.label}</div>
                {layer.detail && <div style={{ fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--text-3)', marginTop:3 }}>{layer.detail}</div>}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Clause splitting explainer */}
      <div style={{ background:'var(--bg-2)', border:'1px solid rgba(124,92,191,0.3)', borderRadius:14, padding:'1.75rem', marginBottom:'1.5rem', animation:'floatUp 0.6s 0.1s ease both', opacity:0 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--con)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'1rem' }}>
          Clause Splitting — The Fix
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
          <div>
            <div style={{ fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--neg)', marginBottom:8 }}>✗ Without clause splitting</div>
            <div style={{ background:'var(--bg-3)', borderRadius:8, padding:'12px', fontFamily:'var(--mono)', fontSize:'0.8rem', lineHeight:1.8 }}>
              <div style={{ color:'var(--text-2)' }}>"Food was great <span style={{ color:'var(--con)' }}>but</span> service was slow."</div>
              <div style={{ marginTop:8, fontSize:'0.7rem' }}>
                <span style={{ color:'var(--pos)' }}>food → positive ✓</span><br/>
                <span style={{ color:'var(--neg)' }}>service → <span style={{ color:'var(--neg)', textDecoration:'line-through' }}>positive</span> ✗</span>
              </div>
              <div style={{ marginTop:6, fontSize:'0.65rem', color:'var(--text-3)' }}>
                Model sees mixed context — "great but slow" confuses polarity head
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--pos)', marginBottom:8 }}>✓ With clause splitting</div>
            <div style={{ background:'var(--bg-3)', borderRadius:8, padding:'12px', fontFamily:'var(--mono)', fontSize:'0.8rem', lineHeight:1.8 }}>
              <div style={{ color:'var(--text-2)' }}>Clause 1: <span style={{ color:'var(--pos)' }}>"Food was great"</span></div>
              <div style={{ color:'var(--text-2)' }}>Clause 2: <span style={{ color:'var(--neg)' }}>"service was slow"</span></div>
              <div style={{ marginTop:8, fontSize:'0.7rem' }}>
                <span style={{ color:'var(--pos)' }}>food → positive ✓</span><br/>
                <span style={{ color:'var(--neg)' }}>service → negative ✓</span>
              </div>
              <div style={{ marginTop:6, fontSize:'0.65rem', color:'var(--text-3)' }}>
                Each clause is unambiguous — model classifies correctly
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop:'1rem', padding:'10px 14px', background:'var(--bg-3)', borderRadius:8, fontFamily:'var(--mono)', fontSize:'0.7rem', color:'var(--text-2)', lineHeight:1.6 }}>
          <span style={{ color:'var(--con)' }}>Splits on:</span> but · however · although · though · yet · whereas · nevertheless · nonetheless · even though · despite · while
        </div>
      </div>

      {/* Phase comparison */}
      <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:14, padding:'1.75rem', marginBottom:'1.5rem', animation:'floatUp 0.6s 0.15s ease both', opacity:0 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--text-3)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'1.25rem' }}>
          Training Phases — Aspect F1
        </div>
        {PHASE_DATA.map(p => (
          <div key={p.phase} style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <div>
                <span style={{ fontFamily:'var(--mono)', fontSize:'0.8rem' }}>{p.phase}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--text-3)', marginLeft:8 }}>{p.model} · {p.params}</span>
              </div>
              <span style={{ fontFamily:'var(--mono)', fontSize:'0.85rem', color:p.color }}>{p.asp_f1}</span>
            </div>
            <div style={{ height:8, background:'var(--bg-4)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:4, background:p.color, width:`${p.asp_f1*100}%`, transition:'width 1.2s ease' }}/>
            </div>
          </div>
        ))}
        <div style={{ marginTop:'1.25rem', padding:'12px', background:'var(--bg-3)', borderRadius:8, fontFamily:'var(--mono)', fontSize:'0.72rem', color:'var(--text-2)', lineHeight:1.6, border:'1px solid var(--border)' }}>
          <span style={{ color:'var(--amber)' }}>Key result:</span> Custom 10M Transformer (scratch) beats fine-tuned DistilBERT (66M) by <span style={{ color:'var(--pos)' }}>+0.1177 F1</span>. Gradual unfreezing (Stage 1→2→3) visible in the jump at epochs 3 and 6.
        </div>
      </div>

      {/* Ablation table */}
      <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:'1.5rem', animation:'floatUp 0.6s 0.2s ease both', opacity:0 }}>
        <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid var(--border)', fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--text-3)', letterSpacing:'0.12em', textTransform:'uppercase' }}>
          Ablation Study
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px', padding:'8px 1.25rem', borderBottom:'1px solid var(--border)', background:'var(--bg-3)' }}>
          {['Condition','Asp F1','Pol F1'].map(h => (
            <div key={h} style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--text-3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>{h}</div>
          ))}
        </div>
        {ABLATION.map((row, i) => {
          const isNew = row.condition.includes('Span pooling')
          const isBest = row.condition.includes('scratch)')
          return (
            <div key={i} style={{
              display:'grid', gridTemplateColumns:'1fr 80px 80px',
              padding:'10px 1.25rem',
              borderBottom: i < ABLATION.length-1 ? '1px solid var(--border)' : 'none',
              background: isNew ? 'rgba(45,158,107,0.04)' : isBest ? 'rgba(212,148,58,0.04)' : 'transparent',
            }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:'0.8rem', color: isNew ? 'var(--pos)' : isBest ? 'var(--amber)' : 'var(--text)' }}>
                {isNew ? '▲ ' : isBest ? '★ ' : ''}{row.condition}
              </div>
              <div style={{ fontFamily:'var(--mono)', fontSize:'0.8rem', color: row.asp_f1 > 0.6 ? 'var(--pos)' : 'var(--text-2)' }}>{row.asp_f1}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:'0.8rem', color: row.pol_f1 > 0.4 ? 'var(--pos)' : 'var(--text-2)' }}>{row.pol_f1}</div>
            </div>
          )
        })}
      </div>

      {/* Tech stack */}
      <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:14, padding:'1.75rem', animation:'floatUp 0.6s 0.25s ease both', opacity:0 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--text-3)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'1.25rem' }}>Tech Stack</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:8 }}>
          {[
            ['ML','PyTorch 2.x'],['ML','TorchScript'],['NLP','HuggingFace tokenizers'],
            ['Data','SemEval-2014'],['Track','W&B'],['Backend','FastAPI'],
            ['Serve','Uvicorn'],['Schema','Pydantic v2'],['Frontend','React 18'],
            ['Frontend','Vite'],['Charts','Recharts'],['Inference','Clause Splitting'],
          ].map(([cat,name],i) => (
            <div key={i} style={{ background:'var(--bg-3)', borderRadius:8, padding:'8px 12px', border:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:'0.55rem', color:'var(--amber)', letterSpacing:'0.08em', marginBottom:3 }}>{cat}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:'0.75rem' }}>{name}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}