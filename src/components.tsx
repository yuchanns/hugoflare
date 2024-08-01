import { Context } from 'hono'
import { html } from 'hono/html'
import { jsxRenderer } from 'hono/jsx-renderer'
import { Bindings } from './utils'

export const renderer = jsxRenderer(({ title, children }, c: Context<{ Bindings: Bindings }>) => {
  const meta = c.env.meta
  return html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:image" content="${meta['blog_avatar']}" />
        <meta name="twitter:site" content="@_yuchanns_" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${meta['blog_desc']}" />
        <meta name="og:image" content="${meta['blog_avatar']}" />
        <meta name="og:title" content="${title}" />
        <meta name="og:description" content="${meta['blog_desc']}" />
        <meta name="description" content="${meta['blog_desc']}" />
        <script src="/static/htmx.min.js"></script>
        <link rel="stylesheet" href="/static/style.css">
        <link rel="stylesheet" href="/static/theme.css">
        <title>${title} | BlockFlare</title>
      </head>
      <body>
          ${children}
      </body>
    </html>
  `
})

export const back = () => {
  return <p><a class="button"
    hx-trigger="click"
    hx-get="/"
    hx-swap="innerHTML show:window:top"
    hx-target="body"
    hx-push-url="true"
    dangerouslySetInnerHTML={{ __html: "Back to home" }}
  /></p>
}
