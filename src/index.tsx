import { Hono } from 'hono'
import { back, renderer } from './components'
import { getHomepageMetadata, getPost, getPosts } from './db'
import { marked } from 'marked'
import { HTTPException } from 'hono/http-exception'
import { jwt, sign, verify } from 'hono/jwt'
import { Bindings, ellipsisText } from './utils'
import { getCookie } from 'hono/cookie'

const auth = "token"

const app = new Hono<{ Bindings: Bindings }>()

app.use(renderer)

app.notFound((_c) => {
  throw new HTTPException(404, { message: "NotFound" })
})

app.onError((err, c) => {
  if (err instanceof HTTPException && err.status == 401) {
    return c.redirect('/console-login')
  }
  return c.render(<>
    <header>
      <h1 dangerouslySetInnerHTML={{ __html: (err instanceof HTTPException) ? `${err.status} ${err.message}` : `500 ${err.message}` }} />
    </header>
    {back()}
  </>, { title: err.message })
})

app.post('/console-login', async (c) => {
  const body = await c.req.formData()
  const account = body.get('account')
  const password = body.get('password')
  if (account != c.env.ADMIN || password != c.env.PASSWD) {
    return c.json({}, 401)
  }
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24
  const token = await sign({ exp }, c.env.JWT_SECRET)
  return c.json({}, 200, {
    "HX-Location": JSON.stringify({ path: "/", target: "body", swap: "innerHTML" }),
    "Set-Cookie": `${auth}=${token}; Max-Age=${exp}; Secure; HttpOnly; SameSite=strict; Path=/`,
  })
})

app.get('/console-login', (c) => {
  return c.render(<>
    <header><h1>Console</h1></header>
    <form hx-post="/console-login"
      hx-swap="none"
      hx-on--after-request={`
        if (event.detail.xhr.status != 200) {
          alert('Login failed!')
        }
      `}>
      <table>
        <tr>
          <td><input type="text" name="account" required placeholder="account" /></td>
        </tr>
        <tr>
          <td><input type="password" name="password" required placeholder="password" /></td>
        </tr>
        <tr>
          <td style="text-align: center;">
            <input type="submit" value="Submit" />
          </td>
        </tr>
      </table>
    </form >
    <hr />
    {back()}
  </>, { title: "console-login" })
})

app.use('/console/*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    cookie: auth,
  })
  return await jwtMiddleware(c, next)
})

app.get('/post/:id', async (c) => {
  const id = c.req.param('id')
  const post = await getPost(c.env.DATABASE, id)
  if (!post) {
    return c.notFound()
  }
  const date = new Date(post.created_at)
  return c.render(<>
    <header>
      <h1 dangerouslySetInnerHTML={{ __html: post.title }} />
      <p dangerouslySetInnerHTML={{ __html: `${date.getDate()} ${date.toLocaleString('en-US', { month: "short" })} ${date.getFullYear()}` }} />
    </header>
    <div dangerouslySetInnerHTML={{ __html: await marked.parse(post.content) }} />
    <hr />
    {back()}
  </>, { title: post.title })
})

app.get('/', async (c) => {
  const token = getCookie(c, "token") ?? ''
  const entryPath = await verify(token, c.env.JWT_SECRET).
    then(() => '/console/new-post').catch(() => '/console-login')

  const page = parseInt(c.req.query("page") ?? "1")
  const meta = await getHomepageMetadata(c.env.DATABASE)
  const size = 5
  const posts = await getPosts(c.env.DATABASE, page, size)
  return c.render(<>
    <header>
      <h1 dangerouslySetInnerHTML={{ __html: meta["blog_name"] }} />
    </header>
    <p>
      <img
        hx-trigger="click"
        hx-get={entryPath}
        hx-target="body"
        hx-push-url="true"
        style="float: right; width: 9em; margin-left: 1em; border-radius: 15px; cursor: pointer"
        src={meta["blog_avatar"]}
        alt={`Photo of ${meta["blog_name"]}`} />
      <div dangerouslySetInnerHTML={{ __html: `${await marked.parse(meta["blog_desc"])}` }} />
    </p >
    <hr />
    <div class="posts">
      {posts.map(async ({ id, title, content }) => {
        return <div class="post">
          <p><a class="title"
            hx-trigger="click"
            hx-get={`/post/${id}`}
            hx-swap="innerHTML"
            hx-target="body"
            hx-push-url="true"
            dangerouslySetInnerHTML={{ __html: title }} />
          </p >
          <div dangerouslySetInnerHTML={{ __html: `${await marked.parse(ellipsisText(content, 200))}` }} />
        </div>
      })}
    </div>
    {posts.length == size && <div id="page"
      hx-get={`/?page=${page + 1}`}
      hx-trigger="revealed"
      hx-target=".posts"
      hx-swap="beforeend"
      hx-select=".post"
      hx-select-oob="#page"
      dangerouslySetInnerHTML={{ __html: "Loading..." }} /> ||
      <div id="page" />
    }
  </>
    , { title: "Home" })
})

export default app
