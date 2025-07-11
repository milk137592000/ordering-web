import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from './common/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能夠顯示降級後的 UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ErrorBoundary 捕獲到錯誤:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="mb-4">
              <span className="text-4xl mb-4 block">💥</span>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">應用程式發生錯誤</h2>
              <p className="text-red-600 mb-4 text-sm">
                很抱歉，應用程式遇到了一個意外錯誤。
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={this.handleReset}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                🔄 重試
              </Button>
              
              <Button 
                onClick={this.handleReload}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white"
              >
                🔄 重新載入頁面
              </Button>
            </div>
            
            {this.state.error && (
              <details className="mt-4 p-3 bg-red-50 rounded-lg text-xs text-red-700">
                <summary className="font-semibold mb-1 cursor-pointer">🐛 錯誤詳情</summary>
                <div className="text-left space-y-2">
                  <div>
                    <strong>錯誤信息：</strong>
                    <pre className="whitespace-pre-wrap">{this.state.error.message}</pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>錯誤堆疊：</strong>
                      <pre className="whitespace-pre-wrap text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <p className="font-semibold mb-1">💡 解決建議：</p>
              <ul className="text-left space-y-1">
                <li>• 嘗試重新整理頁面</li>
                <li>• 檢查網路連接</li>
                <li>• 清除瀏覽器快取</li>
                <li>• 如果問題持續，請聯繫技術支援</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
