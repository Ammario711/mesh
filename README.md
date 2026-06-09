# Mesh

Mesh is a one-shot MVP for a decentralized B2B manufacturing marketplace. The demo connects mechanical engineering students and startups with nearby 3D printer and CNC operators.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Lucide React

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Checks

```bash
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=moderate
```

The app is fully frontend-only. Mock CAD parsing, quote calculation, and local maker matching are handled with hardcoded data and React state in `app/page.tsx`.

## Deploy

Production is currently deployed at:

[https://mesh-marketplace-mvp.vercel.app](https://mesh-marketplace-mvp.vercel.app)

The fastest path is Vercel:

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Use the defaults:
   - Framework: Next.js
   - Build command: `npm run build`
   - Install command: `npm install`
   - Output directory: `.next`
4. Deploy.

No environment variables are required for this MVP.

You can also deploy directly with the Vercel CLI:

```bash
npx vercel link --yes --project mesh-marketplace-mvp
npx vercel --prod --yes
```
