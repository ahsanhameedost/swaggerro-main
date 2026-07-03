Swaggeroo — Home Page (static build for design handoff)
========================================================

WHAT THIS IS
------------
A fully static export of the Swaggeroo home page, generated from the Next.js 16
prototype (`next build` with `output: "export"`). It contains the rendered HTML,
all CSS/JS, and every image the page uses — no server, database, or Node runtime
required to view it.

The React interactivity is preserved: hero carousel, category hover-expand,
scroll animations, the cart drawer, and the search box all hydrate and run
client-side.

HOW TO VIEW IT
--------------
The page uses absolute asset paths (/_next/..., /products/...), so it must be
served over HTTP — double-clicking index.html via file:// will NOT load the
assets. Serve the folder with any static server, for example:

    # Option A — Node (npx, no install)
    npx serve .

    # Option B — Python 3 (built in on macOS/Linux)
    python3 -m http.server 8080

Then open the printed URL (e.g. http://localhost:8080/). Or drop this folder
onto any static host (Netlify, Vercel, S3, Nginx, GitHub Pages, etc.).

WHAT'S INCLUDED
---------------
    index.html            The home page
    _next/                Compiled CSS + JS chunks (hashed)
    products/             Product & branded hero imagery (.webp)
    banner/  slider/      Category / showcase / carousel imagery
    swaggeroo-logo.png    Brand logo
    icon.*  apple-icon.*  Favicons / app icons
    404.html              Not-found page

KNOWN LIMITATIONS (home-page-only scope)
----------------------------------------
This build is intentionally scoped to the HOME PAGE only, with no backend:

  * Nav/footer links (Shop, Login, About, etc.) point at routes that are NOT
    included in this export — they will 404. That's expected.
  * The search box has no backing API in a static build, so typeahead
    suggestions won't return results (the input still renders/behaves).
  * "Add to cart" / cart drawer work in-memory (client state) but there is no
    real checkout.

These are all live in the full application — this bundle is a faithful visual +
markup reference of the home page for the front-end team to build against.

Design tokens (colors, fonts, spacing) live in the compiled CSS under _next/,
and the source component structure is available in the main repo if needed.
