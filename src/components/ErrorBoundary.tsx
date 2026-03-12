import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-medium mb-2">Something went wrong</h1>
            <p className="text-muted-foreground text-sm mb-4">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
            <Button
              onClick={() => window.location.href = '/'}
              className="bg-[hsl(300,100%,71%)] hover:bg-[hsl(300,100%,65%)] text-foreground"
            >
              Go to Home
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
