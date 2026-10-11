import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './style.css';
import './locality.css';

class BootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('NIGERIA 2027 failed to render:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <main className="fatal-screen" role="alert">
        <div className="fatal-card">
          <span className="fatal-kicker">NIGERIA 2027 · PRE-ALPHA</span>
          <h1>The game could not start.</h1>
          <p>Refresh the page and try again. If it keeps happening, send the browser’s first console error to the developer.</p>
          <button onClick={() => window.location.reload()}>RELOAD THE GAME</button>
        </div>
      </main>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BootErrorBoundary>
      <App />
    </BootErrorBoundary>
  </React.StrictMode>,
);
