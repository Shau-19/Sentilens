import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Home from './pages/Home'
import Batch from './pages/Batch'
import Model from './pages/Model'

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/batch" element={<Batch />} />
        <Route path="/model" element={<Model />} />
      </Routes>
    </>
  )
}
