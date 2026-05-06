import React from 'react';
import { Button, Result } from 'antd';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#f4f5f9' 
        }}>
          <Result
            status="error"
            title="Something went wrong"
            subTitle="Sorry, something went wrong while rendering this page. Please try refreshing or go back to home."
            extra={[
              <Button type="primary" key="home" onClick={() => window.location.href = '/'}>
                Go to Home
              </Button>,
              <Button key="refresh" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
