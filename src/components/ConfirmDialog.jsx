import { useState, useCallback, createContext, useContext, useEffect } from 'react'

const Ctx = createContext(null)

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)

  const confirm = useCallback((message, { title = 'Confirm', danger = false, confirmLabel } = {}) =>
    new Promise((resolve) => {
      setDialog({ message, title, danger, confirmLabel: confirmLabel ?? (danger ? 'Delete' : 'Confirm'), resolve })
    }), [])

  function handle(ok) {
    dialog?.resolve(ok)
    setDialog(null)
  }

  useEffect(() => {
    if (!dialog) return
    function onKey(e) {
      if (e.key === 'Escape') handle(false)
      if (e.key === 'Enter')  handle(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog])

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="modal-overlay" onClick={() => handle(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{dialog.title}</h3>
            <p className="modal-msg">{dialog.message}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost-light" onClick={() => handle(false)}>Cancel</button>
              <button
                className={`btn ${dialog.danger ? 'btn-danger-solid' : 'btn-primary'}`}
                onClick={() => handle(true)}
                autoFocus
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useConfirm() {
  return useContext(Ctx)
}
