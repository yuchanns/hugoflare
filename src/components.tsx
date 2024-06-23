import { html } from 'hono/html'
import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ title, children }) => {
  return html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="/static/htmx.min.js"></script>
        <link rel="stylesheet" href="/static/style.css">
        <title>${title} | BlockFlare</title>
      </head>
      <body>
          ${children}
      </body>
    </html>
  `
})
