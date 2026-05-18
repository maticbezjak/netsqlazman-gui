import { useState, useCallback, createContext, useContext } from 'react'
import { X } from 'lucide-react'
import { IconCheck, IconWarn } from './Icon'

const Ctx = createContext(null)
let uid = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((msg, type) => {
    const id = ++uid
    setToasts((t) => [...t, { id, msg, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">
              {t.type === 'success' ? <IconCheck /> : <IconWarn />}
            </span>
            <span className="toast-msg">{t.msg}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const push = useContext(Ctx)
  return {
    success: (msg) => push(msg, 'success'),
    error:   (msg) => push(msg, 'error'),
  }
}
