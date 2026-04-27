# search-bangs-worker

Cloudflare Worker that acts like DuckDuckGo bangs, with Google as the default search engine.

## Behavior

- `?q=normal query` -> Google search
- `?q=!w cloudflare` -> bang redirect (`!w` -> Wikipedia)
- `?q=! cloudflare` -> Google first result (lucky)
- `?q=cloudflare !` -> Google first result (lucky)
- `?q=ens.eth` -> ENS contenthash resolution
- `?q=!` -> `https://www.google.com/`

## Local development

```bash
bun install
bun run dev
```

## Checks

```bash
bun run format
bun run lint
bun run test
```

## Deploy

```bash
bun run deploy
```

Then attach your custom domain (for example `search.stupidtech.net`) in Cloudflare Worker routes/custom domains.
