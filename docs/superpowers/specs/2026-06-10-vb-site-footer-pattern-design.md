# VB ecosystem footer pattern

**Date:** 2026-06-10
**Status:** Approved (brainstorm) — implemented in this repo; portable to other
ecosystem sites (border-wc, vb-project-planning, …)
**Author:** brainstormed with ProfPowell

## Motivation

Every vanilla-breeze-ecosystem component site needs the same footer: a repeat
of the component brand, a tagline, copyright, the MIT license, a GitHub link
with icon, and a "part of the Vanilla Breeze ecosystem" mention linking to
https://vanilla-breeze.com. vanilla-breeze.com's own `footer.minimal` is the
model; vb-project-planning has the right content but builds it from generic
layout primitives with inline styles. This spec fixes the pattern once, in
bg-wc, so it can be pasted into the other sites.

## The canonical pattern

Pure vanilla-breeze recipes — `footer.minimal`, `brand-mark[data-stack]`,
`site-legal`, `icon-wc` — all shipped in VB ≥ 0.1.3. **Zero custom CSS.**
Four per-site fill-ins, marked ①–④:

```html
<footer class="minimal">
  <a href="./">                                                 <!-- ① site home -->
    <brand-mark data-stack>
      &lt;bg-wc&gt;                                              <!-- ② component name -->
      <em>Theme-aware animated backgrounds for any element</em>  <!-- ③ tagline -->
    </brand-mark>
  </a>
  <site-legal>
    <span>&copy; 2026 Thomas A. Powell</span>
    <span>MIT License</span>
    <span>Part of the <a href="https://vanilla-breeze.com">Vanilla Breeze</a> ecosystem</span>
  </site-legal>
  <nav aria-label="Footer links">
    <a href="https://github.com/ProfPowell/bg-wc">              <!-- ④ repo -->
      <icon-wc name="github" size="sm"></icon-wc> GitHub
    </a>
  </nav>
</footer>
```

What each VB piece contributes:

- `footer.minimal` — the stacked, centered footer chrome (spacing, border,
  muted tone). No site CSS needed.
- `brand-mark data-stack` — wordmark with the `<em>` rendered as a muted
  tagline subline. Mirrors the `<brand-mark>` in the site header.
- `site-legal` — small-print row; automatically inserts `·` separators
  between `<span>`s; links inherit color (colophon, not navigation).
- `icon-wc name="github"` — the icon for the repo link.

## Porting checklist (border-wc and friends)

1. Page must load the **full vanilla-breeze bundle** (`import 'vanilla-breeze'`
   + `import 'vanilla-breeze/css'`) so `brand-mark`/`site-legal`/`icon-wc`
   register. All current ecosystem doc sites already do.
2. Paste the pattern; fill ① home href, ② component name, ③ tagline, ④ repo URL.
3. **Delete any unlayered `footer { … }` / `footer a { … }` site CSS** (and
   inline page styles). Unlayered rules override VB's layered recipes — the
   same trap that once put hover underlines on the nav pills (see
   `docs/site.css` history, 2026-06-10).
4. Keep full-bleed showcase/demo art pages footer-less; the pattern is for
   doc-site pages (gallery, API, demo hub, …).

## Applied in this repo

- `docs/index.html`, `docs/api.html`, `demos/index.html` — pattern replaces
  the old one-line `MIT · repo` footers. (api.html's old Gallery/Demos
  footer cross-links drop; the header nav already provides them.)
- `docs/site.css` — generic `footer`/`footer a` rules removed.
- `demos/index.html` — inline `footer`/`footer a` styles removed.

## Out of scope

- A shared `<vb-site-footer>` web component — YAGNI until ≥3 sites carry the
  pattern and it drifts.
- Upstreaming to vanilla-breeze docs as an official recipe — natural follow-up
  once proven here.
