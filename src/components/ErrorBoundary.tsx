import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error): void {
    console.error('Application ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      let parsedSummary = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed.error && parsed.operationType) {
          parsedSummary = `${parsed.operationType.toUpperCase()} on ${parsed.path || 'Firestore'} was rejected: ${parsed.error}`;
        }
      } catch {
        // Keep raw error message
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h1 className="font-display text-xl font-bold text-slate-900 mb-2">
              Workspace request interrupted
            </h1>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              A security rule check or network operation prevented this view from completing.
              Verify your account permissions or reload the workspace.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-700 break-words mb-6">
              {parsedSummary}
            </div>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.href = '/';
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Return to GreenYield Capital
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
