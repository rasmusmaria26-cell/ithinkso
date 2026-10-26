# Spike Report

Generated: 2026-10-26T06:49:45.451Z

Idea: `an app that explains why a houseplant is dying`  
Query: `houseplant care reminder`  
Env source: C:\Users\lumaa\OneDrive\Desktop\projects\itr\ithinkso\.env

## Results

| Probe | Kind | Status | Latency | Results | Quota / notes |
|---|---|---|---|---|---|
| GitHub | source | ok | 878ms | 6 | {"x-ratelimit-limit":"30","x-ratelimit-remaining":"29","x-ratelimit-reset":"1792997491"} |
| npm | source | ok | 62ms | 4 | {} |
| iTunes (App Store) | source | ok | 51ms | 3 | {} |
| Tavily (web) | source | ok | 3101ms | 5 | {} |
| Brave (web) | source | skipped | — | — | BRAVE_API_KEY not set |
| Gemini | llm | ok | 5563ms | 3 | {"model":"gemini-3.5-flash-lite","shape":"responseFormat.text","tokens":"{\"promptTokenCount\":51,\"candidatesTokenCount\":166,\"totalTokenCount\":217,\"promptTokensDetails\":[{\"modality\":\"TEXT\",\"tokenCount\":51}],\"serviceTier\":\"standard\"}"} |
| Groq | llm | skipped | — | — | GROQ_API_KEY not set |

## Headroom

- Slowest source (bounds the parallel search phase): **Tavily (web)** at **3101ms**.
- Slowest LLM call: **5563ms**.
- Estimated full pipeline: **~3101ms search + 11126ms for two LLM calls = ~14227ms** (ignores LLM stream overhead).
- Failed probes: **0**.
- Skipped probes: **2** (Brave (web), Groq).

## Go / no-go

A source may only get an adapter after its row above carries a real latency and a quota signal. If a quota header is absent, the free-tier limit must be found in its docs and recorded here before building.
