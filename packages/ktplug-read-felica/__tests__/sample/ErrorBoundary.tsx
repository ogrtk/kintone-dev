import { Component, type ReactNode } from "react";

// Error Boudary Sample
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: true; error: Error } | { hasError: false; error: null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error("Error caught in ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{ color: "red" }}
        >{`Error: ${this.state.error.message}`}</div>
      );
    }
    return this.props.children;
  }
}
