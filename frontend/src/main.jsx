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
      // Short fresh-window: admin changes (products, homepage, settings)
      // should show up quickly instead of sitting "fresh" for minutes.
      staleTime: 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: true,
      // Always re-check on reconnect / on network coming back — this is
      // part of what catches the Render cold-start case.
      refetchOnReconnect: 'always',
      refetchOnMount: true,
    },
  },
});

// ---------------------------------------------------------------------------
// Stale-after-sleep fix
// ---------------------------------------------------------------------------
// The bug: the SPA doesn't unmount when a laptop sleeps or a phone
// backgrounds the tab for hours — it just pauses. React Query's in-memory
// cache survives that pause untouched. `refetchOnWindowFocus` alone isn't
// enough here because a long-hidden tab coming back is still just a normal
// focus event, and by default React Query only refetches focus events when
// staleTime has already elapsed — meanwhile whatever was last in memory
// keeps rendering instantly, and (since the Render backend has spun down)
// the eventual refetch can take 30-60s to resolve, which is exactly the
// "old data now, fresh data 30-60s later" symptom.
//
// Fix: track how long the tab was hidden, and if it was hidden long enough
// that the backend plausibly went to sleep, force-invalidate every query so
// the next render is guaranteed to re-fetch rather than trust stale memory.
let hiddenAt = null;
const SLEEP_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes hidden = treat as "gone long enough"

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    hiddenAt = Date.now();
  } else if (document.visibilityState === 'visible') {
    const wasHiddenMs = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = null;
    if (wasHiddenMs > SLEEP_THRESHOLD_MS) {
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
