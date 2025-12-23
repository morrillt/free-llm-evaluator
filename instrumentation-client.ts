import posthog from 'posthog-js'

if (typeof window !== 'undefined') {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  
  // Use a full URL for api_host during development if /ingest is causing issues
  // otherwise default to the /ingest reverse proxy
  const host = (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_POSTHOG_HOST) 
    ? process.env.NEXT_PUBLIC_POSTHOG_HOST 
    : '/ingest';

  if (key) {
    try {
      // Use a timeout to move initialization out of the immediate module evaluation
      // phase, which can sometimes cause issues with fetch in certain environments.
      setTimeout(() => {
        try {
          if (posthog && typeof posthog.init === 'function' && !posthog.__loaded) {
            posthog.init(key, {
              api_host: host,
              ui_host: 'https://us.posthog.com',
              // Enables capturing unhandled exceptions via Error Tracking
              capture_exceptions: true,
              // Turn on debug in development mode
              debug: process.env.NODE_ENV === 'development',
              // Disable feature flags if not needed to avoid initial fetch
              advanced_disable_feature_flags: true,
              // Don't capture pageviews automatically to avoid initial fetch issues
              capture_pageview: false,
              persistence: 'localStorage+cookie',
              loaded: (ph) => {
                if (process.env.NODE_ENV === 'development') {
                  console.log('PostHog successfully initialized');
                }
              }
            });
          }
        } catch (err) {
          console.error('PostHog init error:', err);
        }
      }, 1);
    } catch (e) {
      console.warn('PostHog initialization setup failed:', e);
    }
  }
}
