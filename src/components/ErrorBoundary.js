import React from 'react'

// Top-level safety net: if any render throws, show a recoverable screen
// instead of a blank white page. Styles are inline so it works even if the
// stylesheet failed to load.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Log for debugging; a real error-reporting service can hook in here later.
    console.error('Unhandled UI error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#06091a', color: '#e4e6f0', padding: 24,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif", textAlign: 'center'
      }}>
        <div style={{
          maxWidth: 440, background: '#0d1628', border: '1px solid #1a2540',
          borderRadius: 14, padding: '32px 28px'
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: '#9bafd4', margin: '0 0 22px' }}>
            The page hit an unexpected error. Your data is safe — reloading usually fixes it.
            If it keeps happening, email us at <a href="mailto:hello@its-vaulted.com" style={{ color: '#f59e0b' }}>hello@its-vaulted.com</a>.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#f59e0b', color: '#0b0e18', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 15, padding: '11px 22px', borderRadius: 10
            }}
          >
            Reload the page
          </button>
          <div style={{ marginTop: 14 }}>
            <a href="/" style={{ color: '#8890b5', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>← Back to home</a>
          </div>
        </div>
      </div>
    )
  }
}
