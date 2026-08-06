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
      // Always consider data stale so it refetches immediately
      staleTime: 0,

      // React Query v5
      gcTime: 0,

      // Retry failed requests twice
      retry: 2,

      // Always fetch fresh data
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,

      // Don't automatically refetch every interval
      refetchInterval: false,

      // Don't keep showing old data while fetching
      placeholderData: undefined,
    },
    mutations: {
      retry: 1,
    },
  },
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
