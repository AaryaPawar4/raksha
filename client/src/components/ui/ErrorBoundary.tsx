import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Safe error logging without sensitive inputs
    console.error('[ErrorBoundary caught error]:', error.name, error.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error(errorInfo.componentStack);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex items-center justify-center p-6">
          <div className="bg-white border border-rose-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-800">
                {this.props.fallbackTitle || 'Something went wrong in this section'}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {this.props.fallbackMessage ||
                  'The application encountered an unexpected issue. Your session data and stored evidence are secure.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={this.handleReset}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Section
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={this.handleGoHome}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700"
              >
                <Home className="w-3.5 h-3.5" />
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
