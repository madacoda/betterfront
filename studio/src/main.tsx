import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { TooltipProvider } from './components/ui/tooltip';
import './index.css';

class StudioErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || String(error) };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-50 text-zinc-950 p-10 font-sans">
          <div className="max-w-xl mx-auto rounded-xl border border-red-200 bg-white p-6 space-y-3 shadow-sm">
            <h1 className="text-base font-bold text-red-700">
              BetterFront Studio UI Encountered an Error
            </h1>
            <pre className="text-xs font-mono text-zinc-800 bg-zinc-50 p-3 rounded-lg border border-zinc-200 overflow-auto">
              {this.state.errorMessage}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold cursor-pointer"
            >
              Reload Studio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StudioErrorBoundary>
      <TooltipProvider delayDuration={150}>
        <App />
      </TooltipProvider>
    </StudioErrorBoundary>
  </React.StrictMode>
);
