import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 2rem',
      height: '60px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: scrolled ? 'rgba(12,12,15,0.92)' : 'transparent',
      borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      transition: 'all 0.3s ease',
    }}>
      <NavLink to="/" style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{
          width: 28, height: 28,
          background: 'var(--amber)', borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#0C0C0F',
          fontFamily: 'var(--mono)',
        }}>SL</div>
        <span style={{ fontFamily:'var(--serif)', fontSize:'1.1rem', color:'var(--text)' }}>
          SentiLens
        </span>
      </NavLink>

      <div style={{ display:'flex', gap:'2rem', alignItems:'center' }}>
        {[['/', 'Analyser'], ['/batch', 'Dashboard'], ['/model', 'Model']].map(([to, label]) => (
          <NavLink key={to} to={to} end={to==='/'} style={({ isActive }) => ({
            fontSize: '0.8rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isActive ? 'var(--amber)' : 'var(--text-2)',
            transition: 'color 0.2s',
            fontWeight: 500,
          })}>
            {label}
          </NavLink>
        ))}
        <a href="https://github.com/shauryajain/sentilens" target="_blank"
          style={{
            fontSize:'0.7rem', letterSpacing:'0.1em', textTransform:'uppercase',
            color:'var(--text-3)', border:'1px solid var(--border)',
            padding:'5px 12px', borderRadius:6, transition:'all 0.2s',
          }}
          onMouseEnter={e => { e.target.style.borderColor='var(--amber-dim)'; e.target.style.color='var(--amber)' }}
          onMouseLeave={e => { e.target.style.borderColor='var(--border)'; e.target.style.color='var(--text-3)' }}
        >GitHub ↗</a>
      </div>
    </nav>
  )
}
