import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './styles/globals.css';
import './styles/animations-new.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Always fetch fresh data on page load.
      // Prevents showing old products/settings after deployments.
      staleTime: 0,

      // Keep unused cache only briefly.
      gcTime: 5 * 60 * 1000,

      retry: 2,

      // Refresh whenever user returns to the site.
      refetchOnWindowFocus: true,

      // Refresh after network reconnect.
      refetchOnReconnect: true,

      // Always fetch when component mounts.
      refetchOnMount: 'always',
    },
  },
});

// ---------------------------------------------------------------------------
// Force refresh after long background periods
// ---------------------------------------------------------------------------
// Handles cases where the browser tab stayed open while the backend changed.

let hiddenAt = null;
const SLEEP_THRESHOLD_MS = 2 * 60 * 1000;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    hiddenAt = Date.now();
  } else if (document.visibilityState === 'visible') {
    const hiddenDuration = hiddenAt
      ? Date.now() - hiddenAt
      : 0;

    hiddenAt = null;

    if (hiddenDuration > SLEEP_THRESHOLD_MS) {
      queryClient.invalidateQueries();
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
