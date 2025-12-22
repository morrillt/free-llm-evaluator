# PRODUCT REQUIREMENTS DOCUMENT (PRD) — freellmfunny

## Meta: Ownership & Context
- **Title:** freellmfunny
- **Product Area:** LLM Tooling / Benchmarking
- **Owner:** User
- **Stakeholders:** User (PM/Eng)
- **Status:** Draft
- **Last Updated:** 2025-12-22

---

## 1. High-Level Description
A standalone Next.js application designed to evaluate and compare multiple free LLM models available via OpenRouter. The app allows users to select up to 5 models from the "free" tier, configure global and per-model system prompts and "thinking" parameters, and view real-time profiling (TPS, duration) in a Catppuccin-themed UI. All settings and conversations are persisted to local flat files on the server for a seamless multi-session experience.

### Supporting Details
- **Primary Persona:** Developer/Researcher evaluating LLM performance/cost-efficiency.
- **Core Journey:** Select models → Configure Prompts/Knobs → Send Prompt → Compare Profiling & Responses → Copy aggregated JSON.
- **Business Value:** Rapid iteration and quality check across the latest free LLM offerings without manual API calls.
- **Out-of-Scope:** User authentication, multiple concurrent users, complex database integrations, paid model tier management.
- **Constraints:** OpenRouter API limits for free models; limited to Next.js server-side file persistence.

---

## 2. Goals and Non-Goals

### Goals
- Provide a unified UI to prompt multiple free LLMs simultaneously.
- Persist all configurations (System Prompts, Model Selection, Knobs) to a local JSON file.
- Expose per-model profiling metrics: Tokens Per Second (TPS) and Total Duration.
- Allow fine-grained model overrides for "Thinking" budget and temperature.

### Non-Goals
- No database requirement (PostgreSQL, MongoDB, etc.).
- No multi-user support or session isolation (single-user design).
- No support for paid OpenRouter models in the initial scope.

---

## 3. Functional Requirements

| ID | User Story | Acceptance Criteria | Priority |
| :--- | :--- | :--- | :--- |
| **FR-1** | As a user, I want the app to discover all models on OpenRouter with "free" in the name. | • Fetches model list from OpenRouter API.<br>• Filters for models containing "free". | P0 |
| **FR-2** | As a user, I want to select up to 5 free models for evaluation. | • UI allows selection/deselection.<br>• Cap at 5 active models.<br>• Selection persists to `data/settings.json`. | P0 |
| **FR-3** | As a user, I want to configure global defaults and model-specific overrides. | • Global settings for System Prompt, Temp, Thinking.<br>• Per-model overrides via gear icon.<br>• Persists to `data/settings.json`. | P0 |
| **FR-4** | As a user, I want to send a prompt and see streamed responses from all 5 models. | • Separate containers for each model.<br>• Parallel API calls to OpenRouter.<br>• Real-time streaming visualization. | P0 |
| **FR-5** | As a user, I want to see performance profiling for each response. | • Display TPS (Tokens Per Second).<br>• Display Total Duration.<br>• Display Total response size. | P1 |
| **FR-6** | As a user, I want to export results as JSON. | • Aggregated JSON object of responses + metrics.<br>• Toggle between "Cleaned" and "Raw" data.<br>• Copy-to-clipboard functionality. | P1 |

---

## 4. User Flows

### UF-1: Model Selection and Configuration
- **Goal:** Configure the evaluator environment.
- **Entry Point:** Homepage.
1. User opens app; models are fetched and filtered.
2. User selects up to 5 models.
3. User sets a global default system prompt.
4. User overrides settings for a specific model (e.g., Thinking budget).
- **Exit State:** Settings saved to server-side JSON.

### UF-2: Multi-Model Evaluation
- **Goal:** Compare responses across selected models.
- **Entry Point:** Chat Interface.
1. User enters prompt in shared input.
2. User hits "Send".
3. Model containers stream text simultaneously.
4. Metrics (TPS, Time) appear as each finishes.
5. User copies session JSON for evaluation.

---

## 5. Architecture and Tech Options

- **Frontend:** Next.js (App Router), Tailwind CSS + Catppuccin Theme Palette.
- **Persistence:** Local file storage (`data/settings.json`, `data/conversations.json`).
- **API Integration:** OpenRouter API (Server-side proxy to protect keys).

---

## 6. Metrics and Instrumentation
- **TPS (Tokens Per Second):** Total tokens / duration. Measured during streaming.
- **Total Duration:** Start-to-finish time for each model response.

---

## 7. Risks, Dependencies, Open Questions

### Risks
- **Rate Limits:** Concurrent calls to 5 free models may trigger 429 errors.
- **Compatibility:** Not all models support "Thinking" or specific budget params.

### Dependencies
- OpenRouter API Key in `.env`.
- Next.js 14/15 runtime.

### Open Questions
- Should we implement a queue if concurrent requests are rejected?
- Should conversation history have a cleanup/size limit?

---

## Next Steps: Ticket Generation
- One ticket per FR row.
- Separate ticket for Catppuccin UI theme application.
- Prioritize Streaming logic (P0).

