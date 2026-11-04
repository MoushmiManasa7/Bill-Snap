import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  message: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: Error): State {
    return { message: error.message || "Something went wrong." };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (this.state.message) {
      return (
        <main className="mx-auto max-w-lg px-4 py-10">
          <h1 className="text-xl font-semibold text-navy">Bill Snap hit a problem</h1>
          <p className="mt-2 text-sm text-slate-600">{this.state.message}</p>
          <button
            type="button"
            className="mt-4 min-h-12 rounded-2xl bg-navy px-4 text-sm font-semibold text-white"
            onClick={() => this.setState({ message: null })}
          >
            Try again
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
