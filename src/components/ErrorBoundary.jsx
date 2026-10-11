import { Component } from 'react'

/** Evita "tela branca": mostra o erro e um botão para recarregar/limpar dados */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Festify] erro de renderização:', error, info)
  }

  resetData = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('festify:'))
        .forEach((k) => localStorage.removeItem(k))
    } catch {
      /* ignore */
    }
    window.location.href = window.location.pathname
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', background: '#faf7ff', color: '#1e1b2e' }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>😕</div>
          <h1 style={{ fontSize: 22, margin: '12px 0 6px' }}>Algo deu errado</h1>
          <p style={{ color: '#6b6390', fontSize: 14 }}>Recarregue a página. Se continuar, limpe os dados locais do Festify.</p>
          <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 12, fontSize: 12, color: '#b4234a', marginTop: 16 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 16px', borderRadius: 12, border: 0, background: 'var(--brand, #1E88E5)', color: '#fff', fontWeight: 600 }}>
              Recarregar
            </button>
            <button onClick={this.resetData} style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #ddd', background: '#fff', fontWeight: 600 }}>
              Limpar dados
            </button>
          </div>
        </div>
      </div>
    )
  }
}
