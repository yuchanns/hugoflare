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
