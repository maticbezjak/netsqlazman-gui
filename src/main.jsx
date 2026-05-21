import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'
import { installWebAdapter } from './webAdapter.js'

// In a browser (non-Electron) window.db won't exist — install the fetch adapter
if (!window.db) {
  installWebAdapter()
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App webMode={!window.__electronPreload} />
  </React.StrictMode>
)
