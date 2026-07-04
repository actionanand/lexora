# Cloudflare Pages Deployment

Use Cloudflare Pages when deploying Lexora at the root URL:

```text
https://ar-lexora.pages.dev/
```

## Build Settings

- Framework preset: `Next.js`
- Build command: `npm run build:cloudflare`
- Output directory: `out`
- Node version: use the current LTS available in Cloudflare Pages

## Environment Variables

Set:

```text
NEXT_PUBLIC_BASE_PATH=
```

Leave `NEXT_PUBLIC_BASE_PATH` empty for Cloudflare root-path deployment.

## Notes

Lexora uses `output: "export"`, so the deployed site is static.
