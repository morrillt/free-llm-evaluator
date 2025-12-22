# Free LLM Evaluator

A standalone Next.js application designed to evaluate and compare multiple free LLM models available via [OpenRouter](https://openrouter.ai/). 

## Genesis

This project was built as part of a test comparing various open-source models against **Gemini 3 Flash (flash3)** to "one-shot" create this entire application.

The design was guided by a dual-format PRD approach—a neat style inspired by **BMAD**:
- [**MD Version (Human Readable)**](./plans/LLM_Evaluator_PRD.md): Created for personal review and readability.
- [**XML Version (AI Optimized)**](./plans/LLM_Evaluator_PRD.xml): Structured specifically for the AI to ingest and execute against.

## Features

- **Multi-Model Comparison**: Select up to 5 free models and prompt them simultaneously.
- **Real-time Streaming**: View parallel streaming responses from all active models.
- **Performance Profiling**: Automatic tracking of Tokens Per Second (TPS), Total Duration, and response size.
- **Catppuccin Theme**: Beautiful UI based on the Catppuccin Mocha palette.
- **Persistence**: All settings and conversations are persisted to local flat files.
- **Quick Filters**: Easily filter models by provider (Qwen, Google, NVIDIA, DeepSeek, etc.).
- **Smart Data Policy Detection**: Clear guidance on enabling OpenRouter's free model training policies.

## Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Theming**: Catppuccin
- **API**: OpenRouter Chat Completions

## Getting Started

### Prerequisites

- Node.js 18+
- An [OpenRouter](https://openrouter.ai/) API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/morrillt/free-llm-evaluator.git
   cd free-llm-evaluator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory:
   ```bash
   OPENROUTER_API_KEY=your_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Privacy Note

Many free models on OpenRouter require you to enable "Free model publication" in your [privacy settings](https://openrouter.ai/settings/privacy). The app will notify you if a model fails due to this policy.

## License

MIT
