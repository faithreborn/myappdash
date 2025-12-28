import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Capacitor plugins (optional - only load if available)
const initCapacitor = async () => {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const { SplashScreen } = await import('@capacitor/splash-screen');
    
    // Set status bar style
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#09090b' });
    
    // Hide splash screen after app loads
    await SplashScreen.hide();
  } catch {
    // Running in browser, not native app
    console.log('Running in browser mode');
  }
};

// Initialize Capacitor when DOM is ready
document.addEventListener('DOMContentLoaded', initCapacitor);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
