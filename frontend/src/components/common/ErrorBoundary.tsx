import React, { Component, type ReactNode } from "react";
import { Button } from "@/components/common/ui";
import { TriangleAlert, RotateCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger mb-4">
            <TriangleAlert className="h-6 w-6" />
          </div>
          <h2 className="font-display text-lg font-bold text-forest-deep mb-2">
            {this.props.fallbackTitle || "Something went wrong loading this screen"}
          </h2>
          <p className="max-w-md text-sm text-muted mb-6">
            {this.state.error?.message || "An unexpected error occurred while rendering this component."}
          </p>
          <Button size="sm" variant="secondary" onClick={this.handleReload}>
            <RotateCw className="h-3.5 w-3.5 mr-1" />
            Reload Screen
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
