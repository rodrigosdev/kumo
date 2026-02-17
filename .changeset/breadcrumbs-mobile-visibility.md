---
"@cloudflare/kumo": patch
---

fix(breadcrumbs): show breadcrumbs on mobile viewports

removed `hidden sm:flex` from breadcrumbs container so they are visible on all screen sizes. previously the component was completely hidden below the `sm` breakpoint, preventing evaluation and use in mobile layouts. see https://github.com/cloudflare/kumo/issues/38
