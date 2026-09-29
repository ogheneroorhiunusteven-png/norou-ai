# Norou Model Hub

Norou can route AI requests through a server-side model provider without putting provider API keys in the mobile/web app.

## Client profiles

- **Norou Auto** — chooses the first configured provider.
- **Gemini Fast / Vision** — Gemini through `GEMINI_API_KEY`.
- **OpenAI Compatible** — `OPENAI_API_KEY`, optional `OPENAI_BASE_URL`, `OPENAI_MODEL`.
- **OpenRouter** — `OPENROUTER_API_KEY`, optional `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`.
- **Ollama Local** — set `OLLAMA_ENABLED=true`, plus optional `OLLAMA_BASE_URL` and `OLLAMA_MODEL`.

## Routing

- Auto: select an available configured provider.
- Manual: use the selected profile only.
- Fallback: prefer the selected provider, with safe fallback when the preferred provider is not configured.

Never put provider API keys in `NEXT_PUBLIC_*` variables or the Norou client app.

## Free-only mode
Norou now defaults to **Free-only mode**. In this mode the app does not intentionally route to paid Gemini/OpenAI providers. Local Norou commands remain available with no API key. For full AI without API charges, configure a local Ollama server; free cloud models may still impose their own rate limits.
