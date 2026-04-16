"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Sentry can be initialized here (NFR-02/DevOps)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/app";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10" />
          </div>
          
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">
            Đã có lỗi xảy ra
          </h2>
          <p className="text-zinc-500 max-w-md mb-8">
            Chúng tôi rất tiếc về sự cố này. Vui lòng thử tải lại trang hoặc quay về trang chủ.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-all shadow-sm"
            >
              <RefreshCcw className="w-4 h-4" />
              Thử lại ngay
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-zinc-600 font-medium border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all shadow-sm"
            >
              <Home className="w-4 h-4" />
              Về trang chủ
            </button>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-12 p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-left max-w-2xl overflow-auto">
              <p className="text-xs font-mono text-red-600 whitespace-pre-wrap">
                {this.state.error?.stack}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
