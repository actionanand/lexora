# Cloudflare Pages Deployment

Use Cloudflare Pages when deploying Lexora at the root URL:

```text
https://ar-lexora.pages.dev/
```

## Build Settings

- Framework preset: `Next.js`
- Build command: `npm run build:cloudflare`
- Build output directory: `out`
- Node version: `22.23.1`

Use `out` as the Cloudflare Pages output directory. Lexora uses Next.js static export
(`output: "export"`), and `next build` writes the final deployable HTML, CSS, JS, images,
`search-index.json`, and `sitemap.xml` into `out`.

Do not use `.next` as the Cloudflare Pages output directory. The `.next` folder is an
intermediate Next.js build folder/cache, not the static site folder Cloudflare should publish
for this project.

## Environment Variables

Set:

```text
NEXT_PUBLIC_BASE_PATH=
```

Leave `NEXT_PUBLIC_BASE_PATH` empty for Cloudflare root-path deployment.

## Notes

Lexora uses `output: "export"`, so the deployed site is static and can be served directly from
the `out` folder.
