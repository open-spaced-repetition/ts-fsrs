# FSRS Cloudflare Worker

Minimal Cloudflare Workers smoke test for the threadless
`@open-spaced-repetition/binding-wasm32-wasip1` package.

The package is pinned to the PR 3 build published by pkg.pr.new. It imports the
workerd loader and precompiled WASM module directly, initializes lazily, and
reuses the initialized binding across requests.

## Test locally

```bash
pnpm install
pnpm check
pnpm dry-run
pnpm smoke
```

Download the repository's
[sample revlog.csv](https://github.com/open-spaced-repetition/fsrs-rs/files/15046782/revlog.csv)
to `packages/binding-test/src/revlog.csv` first. The smoke check starts local
workerd, uploads the real CSV, verifies conversion into 88,158 FSRS items, and
asserts that optimization returns 21 finite parameters. The dry-run also
rejects native addon loading, Worker construction, and dynamic WASM
compilation. Use `pnpm dev` only for manual requests.

For a manually running Worker:

```bash
curl --fail-with-body \
  --request POST \
  --header 'Content-Type: text/csv' \
  --data-binary @packages/binding-test/src/revlog.csv \
  'http://127.0.0.1:8787/compute?nextDayStartsAt=4&timezone=Asia%2FShanghai'
```

## Deploy

Authenticate Wrangler, deploy, and run the same smoke check against the
deployment URL:

```bash
pnpm deploy
WORKER_URL=https://<worker>.<account>.workers.dev pnpm smoke
pnpm exec wrangler deployments list
pnpm exec wrangler tail
```

Record the deployment URL/version, bundle size, CPU time, and peak memory from
the command output and Cloudflare observability.

## Validation evidence

Validated on 2026-07-30 with preview package `0.0.0-preview-49a4d90`:

- URL: <https://ts-fsrs-cloudflare-worker.ishiko732.workers.dev>
- Version: `9de02d59-7855-466e-92f3-fc16467e6c73`
- Upload: 1,428.26 KiB raw, 383.55 KiB gzip
- Local workerd converted the 4,626,708-byte CSV into 88,158 FSRS items in
  532 ms and trained 21 finite parameters in 1,105 ms
- Deployed `/compute` returns Cloudflare error `1102` because the account's Free
  plan CPU limit is too low for the real CSV
- Pages deployment: <https://ts-fsrs-cloudflare-pages.pages.dev>; `/health`
  succeeds, but the same real CSV also returns `1102`
- Wrangler rejected a 30-second CPU limit with API error `100328`; repeat the
  deployed smoke check after switching the account to the Workers Paid plan
