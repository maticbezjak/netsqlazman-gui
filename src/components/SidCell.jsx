import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { formatSid } from '../utils/sid'

export default function SidCell({ hex }) {
  const [copied, setCopied] = useState(false)

  if (!hex) return <span className="muted">—</span>

  function copy(e) {
    e.stopPropagation()
    navigator.clipboard.writeText(hex)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <span className="sid-cell-wrap" onClick={copy} title="Click to copy">
      <span className="sid-cell">{formatSid(hex)}</span>
      <span className="sid-copy">
        {copied ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
      </span>
    </span>
  )
}
