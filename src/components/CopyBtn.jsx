import { useState } from 'react'

/**
 * Small inline button that copies `text` to the clipboard.
 * Shows a ✓ confirmation for 1.5 s after copying.
 */
export default function CopyBtn({ text, className = '' }) {
  const [copied, setCopied] = useState(false)

  function copy(e) {
    e.stopPropagation()
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button className={`copy-btn ${className}`} onClick={copy} title={`Copy "${text}"`}>
      {copied ? '✓' : '⎘'}
    </button>
  )
}
