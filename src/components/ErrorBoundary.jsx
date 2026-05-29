import { Component } from 'react'

/**
 * Catches any render-time error in the subtree and shows a friendly
 * recovery screen instead of a blank white page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  reset() {
    this.setState({ error: null, info: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-icon">⚠</div>
          <h2 className="error-boundary-title">Something went wrong</h2>
          <p className="error-boundary-msg">{this.state.error.message}</p>
          {this.state.info && (
            <details className="error-boundary-stack">
              <summary>Stack trace</summary>
              <pre>{this.state.info.componentStack}</pre>
            </details>
          )}
          <button className="btn btn-primary" onClick={() => this.reset()}>
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
