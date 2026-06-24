# My Blog — Markdown to Blog Converter

## Project Overview

A static blog website that reads Markdown files and renders them as a clean, readable blog. Built with plain HTML, CSS, and JavaScript — no frameworks, no build tools, no dependencies.

## Goals

- Parse and render Markdown files directly in the browser
- Clean, readable typography optimized for long-form content
- Dark mode support (respects system preference, toggleable by user)
- Fully responsive — works well on mobile, tablet, and desktop
- Fast and lightweight — no bundlers, no npm, no frameworks

## Tech Stack

- **HTML5** — semantic markup
- **CSS3** — custom properties for theming, flexbox/grid for layout
- **Vanilla JavaScript (ES modules)** — no jQuery, no React, no Vue
- **No build step** — open `index.html` directly in a browser or serve with any static file server

## File Structure

```
my-blog/
├── CLAUDE.md
├── index.html          # Blog listing page
├── post.html           # Single post reader page
├── css/
│   ├── base.css        # Reset, typography, CSS variables
│   ├── layout.css      # Header, footer, page structure
│   ├── components.css  # Cards, buttons, tags, nav
│   └── post.css        # Markdown-rendered post styles
├── js/
│   ├── main.js         # Blog index — loads and lists posts
│   ├── post.js         # Post page — loads and renders a single post
│   ├── markdown.js     # Markdown parser (vanilla JS)
│   └── theme.js        # Dark/light mode toggle + persistence
└── posts/
    ├── index.json      # Manifest of all posts (title, date, slug, tags)
    └── *.md            # Markdown post files
```

## Design Principles

- **Readable first** — comfortable line length (~70ch), generous line height (1.7), good contrast
- **Minimal chrome** — content is the focus; UI is understated
- **CSS custom properties** for all colors so dark/light mode is a single class toggle on `<html>`
- **System font stack** — no web font loading delay
- **No layout shift** — reserve space before content loads

## Color Scheme

Use CSS custom properties on `:root` and `[data-theme="dark"]`:

- Light: white background, near-black text, muted grays for metadata
- Dark: `#0f1117` background, `#e2e8f0` text, subtle surface colors
- Accent: a single accent color (e.g. indigo `#6366f1`) used for links and highlights

## Markdown Features to Support

- Headings (h1–h6)
- Bold, italic, inline code
- Fenced code blocks (with language label)
- Blockquotes
- Ordered and unordered lists
- Horizontal rules
- Images (responsive)
- Links (external links open in new tab)
- Tables (basic)

## Posts Manifest (`posts/index.json`)

```json
[
  {
    "slug": "hello-world",
    "title": "Hello, World",
    "date": "2026-06-24",
    "tags": ["intro"],
    "excerpt": "My first post."
  }
]
```

## Key Behaviors

- **Index page** — fetches `posts/index.json`, renders a card list sorted by date descending
- **Post page** — reads `?slug=hello-world` from the URL, fetches `posts/hello-world.md`, parses and renders it
- **Dark mode** — defaults to `prefers-color-scheme`, toggled by a button, persisted in `localStorage`
- **No 404 on direct URL** — post.html handles missing slugs gracefully with an error message

## Commands

Since there's no build step, just serve the directory:

```bash
# Python
python -m http.server 8080

# Node (npx)
npx serve .

# Or open index.html directly in a browser (file:// works for most features)
```

## Coding Conventions

- ES modules (`type="module"` on script tags)
- `async/await` for all fetch calls
- CSS custom properties named `--color-*`, `--font-*`, `--space-*`
- No inline styles — all styling via CSS classes
- Semantic HTML — use `<article>`, `<header>`, `<nav>`, `<main>`, `<footer>`, `<time>`
- `aria-label` on icon-only buttons (e.g. theme toggle)
