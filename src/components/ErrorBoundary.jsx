import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 text-text">
          <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-danger/15 border border-danger/25 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-danger" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">Något gick fel</h1>
            <p className="text-muted mb-6">Ett oväntat fel uppstod i applikationen.</p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-glow bg-[linear-gradient(135deg,rgb(var(--primary)/0.95),rgb(var(--accent)/0.55),rgb(var(--primary-2)/0.75))] hover:brightness-110 transition"
            >
              <RefreshCw size={18} />
              Ladda om sidan
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;