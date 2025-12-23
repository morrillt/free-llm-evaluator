# PostHog post-wizard report

The wizard has completed a deep integration of your project. PostHog has been configured with client-side event tracking using `posthog-js` and server-side tracking using `posthog-node`. The integration includes:

- **Client-side initialization** via `instrumentation-client.ts` (Next.js 15.3+ pattern)
- **Reverse proxy configuration** in `next.config.ts` for improved reliability and to avoid ad blockers
- **Server-side PostHog client** in `src/lib/posthog-server.ts` for API route tracking
- **Error tracking** enabled via `capture_exceptions: true`
- **Environment variables** configured in `.env` and `.env.local`

## Events Implemented

| Event Name | Description | File Path |
|------------|-------------|-----------|
| `model_selected` | User selected an AI model for evaluation - conversion event for starting evaluation flow | `src/components/ModelSelector.tsx` |
| `model_deselected` | User deselected an AI model - helps understand model preference patterns | `src/components/ModelSelector.tsx` |
| `evaluation_started` | User started an evaluation session by sending a prompt to models - key conversion event | `src/components/ChatInterface.tsx` |
| `evaluation_completed` | Evaluation finished with all model responses - measures successful evaluation completions | `src/components/ChatInterface.tsx` |
| `results_exported` | User exported evaluation results - conversion event showing high value engagement | `src/components/ChatInterface.tsx` |
| `joke_generation_started` | User triggered joke generation in joke mode - key conversion for humor feature | `src/components/JokeInterface.tsx` |
| `joke_rated` | User rated a joke as funny or not funny - critical engagement metric | `src/components/JokeInterface.tsx` |
| `model_randomized` | User clicked to swap to a random different model - engagement metric | `src/components/ModelContainer.tsx` |
| `joke_wall_vote` | User voted on a joke in the joke wall - community engagement metric | `src/components/JokeWall.tsx` |
| `joke_wall_comment` | User commented on a joke - high engagement conversion event | `src/components/JokeWall.tsx` |
| `settings_updated` | User changed global settings like system prompt or temperature - power user engagement | `src/components/SettingsPanel.tsx` |
| `view_changed` | User navigated between different views (models, evaluation, joke, funny_index) - navigation tracking | `src/components/ClientApp.tsx` |
| `server_evaluation_started` | Server-side tracking when evaluation API is called | `src/app/api/evaluate/route.ts` |

## Configuration Files

| File | Purpose |
|------|---------|
| `instrumentation-client.ts` | PostHog client-side initialization |
| `next.config.ts` | Reverse proxy rewrites for `/ingest/*` |
| `src/lib/posthog-server.ts` | Server-side PostHog Node.js client |
| `.env` | Environment variables (NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST) |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://us.posthog.com/project/271009/dashboard/933613) - Core analytics dashboard tracking user engagement, model usage, and feature adoption

### Insights
- [Model Selection Funnel](https://us.posthog.com/project/271009/insights/LtR2XXbI) - Tracks users from model selection through evaluation completion
- [Joke Engagement Funnel](https://us.posthog.com/project/271009/insights/ffI4Hsf6) - Tracks users from joke generation through rating - key conversion metric
- [Daily Active Events](https://us.posthog.com/project/271009/insights/ppt2GAKx) - Overview of key user actions over time
- [Community Engagement](https://us.posthog.com/project/271009/insights/Cgp4lK6k) - Joke wall votes and comments - measuring community interaction
- [Feature Usage by View](https://us.posthog.com/project/271009/insights/5uX0Zsow) - Distribution of user navigation across different app views

## Additional Recommendations

1. **User Identification**: Consider adding `posthog.identify()` calls when users log in or create accounts to link anonymous sessions to identified users.

2. **Session Replay**: PostHog session replay is automatically enabled. Review recordings in PostHog to understand user behavior.

3. **Feature Flags**: Use PostHog feature flags to safely roll out new features and run A/B tests.

4. **Error Monitoring**: Exceptions are automatically captured. Monitor the Errors tab in PostHog for issues.
