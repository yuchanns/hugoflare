import { Hono } from 'hono'
import { back, renderer } from './components'
import { Block, deletePost, getHomepageMetadata, getPost, getPosts, savePost } from './db'
import { marked } from 'marked'
import { HTTPException } from 'hono/http-exception'
import { jwt, sign, verify } from 'hono/jwt'
import { Bindings, ellipsisText } from './utils'
import { getCookie } from 'hono/cookie'

const auth = "token"

const mdrender = new marked.Renderer()

mdrender.blockquote = ({ tokens }) => {
  const contents = []
  for (const token of tokens) {
    if (token.type == "paragraph") {
      contents.push(`<p><em>${token.raw}</em></p>`)
    } else {
      contents.push(marked.parseInline(token.raw))
    }
  }
  return `<blockquote>${contents.join()}</blockquote>`
}

mdrender.code = ({ text, lang }) => {
  return `<div class="code ${lang}"><pre><code>${text}</code></pre></div>`
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(async (c, next) => {
  const token = getCookie(c, "token") ?? ''
  c.env.isLogin = await verify(token, c.env.JWT_SECRET).
    then(() => true).catch(() => false)
  await next()
}).use(renderer)

app.notFound((_c) => {
  throw new HTTPException(404, { message: "NotFound" })
})

app.onError((err, c) => {
  if (err instanceof HTTPException && err.status == 401) {
    return c.redirect('/console-login')
  }
  return c.render(<>
    <header>
      <h1 dangerouslySetInnerHTML={{ __html: (err instanceof HTTPException) ? `${err.status} ${err.message} ` : `500 ${err.message} ` }} />
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
    "Set-Cookie": `${auth}=${token}; Max - Age=${exp}; Secure; HttpOnly; SameSite = strict; Path = /`,
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

app.post('/console/post/:id?', async (c) => {
  let id = c.req.param("id")
  const body = await c.req.formData()
  const title = body.get("title") ?? ''
  const formBlocks = body.getAll("blocks")
  const blocks: Block[] = []
  for (const formBlock of formBlocks) {
    const block = JSON.parse(formBlock) as Block
    blocks.push(block)
  }
  id = await savePost(c.env.DATABASE, { title, blocks: blocks }, id)
  return c.json({}, 200, {
    "HX-Location": JSON.stringify({ path: `/post/${id}`, target: "body", swap: "innerHTML" }),
  })
})

app.get('/console/post/:id?', async (c) => {
  const id = c.req.param("id")
  const post = id ? await getPost(c.env.DATABASE, id) : ""
  return c.render(<>
    <form
      hx-post="/"
      hx-swap="none"
      hx-on--config-request={`
        event.preventDefault()
        const save = async () => {
          const data = await editor.save()
          await htmx.ajax('POST', '/console/post/${id ?? ""}', {
            swap: 'none',
            values: {
              blocks: data.blocks,
              title: htmx.find('#title').value
            }
          })
        }
        Promise.all([save()])
      `}
      hx-on--after-request={`
        if (event.detail.xhr.status != 200) {
          alert('Save failed!')
        }
      `}>
      <header>
        <h1><input id="title" type="text" name="title" required placeholder="Title" value={post ? post.title : ""} /></h1>
      </header>
      <div id="editor" />
      <div style="text-align: center">
        <input type="submit" value="Save" />
      </div>
    </form>
    <div id="script">
      <div id="data" data-vals={post ? JSON.stringify(post.blocks).replace(/"/g, '\\"') : ""} />
    </div>
    <script src="/static/editor.js" />
    <hr />
    {back()}
  </>)
})

app.delete('/console/post/:id', async (c) => {
  const id = c.req.param('id')
  await deletePost(c.env.DATABASE, id)
  return c.json({}, 200, {
    "HX-Location": JSON.stringify({ path: `/`, target: "body", swap: "innerHTML" })
  })
})

app.get('/post/:id', async (c) => {
  const id = c.req.param('id')
  const post = await getPost(c.env.DATABASE, id)
  if (!post) {
    return c.notFound()
  }
  const isLogin = c.env.isLogin
  const date = new Date(post.created_at)
  return c.render(<>
    <header>
      <h1 dangerouslySetInnerHTML={{ __html: post.title }} />
      <p dangerouslySetInnerHTML={{ __html: `${date.getDate()} ${date.toLocaleString('en-US', { month: "short" })} ${date.getFullYear()}` }} />
    </header>
    <div dangerouslySetInnerHTML={{ __html: await marked.parse(post.content, { renderer: mdrender }) }} />
    <div vals={`${JSON.stringify(post.blocks).replace(/"/g, '\\"')}`} />
    <hr />
    {isLogin && <>
      <a class="action"
        hx-trigger="click"
        hx-swap="innerHTML"
        hx-target="body"
        hx-push-url="true"
        hx-get={`/console/post/${id}`}>edit</a>
      <a class="action"
        hx-trigger="click"
        hx-delete={`/console/post/${id}`}
        hx-swap="none"
        hx-push-url="true"
        hx-confirm="Are you sure?"> - delete</a>
    </>}
    {back()}
  </>, { title: post.title })
})

app.get('/', async (c) => {
  const isLogin = c.env.isLogin
  const entryPath = isLogin ? "/console/post" : "/console-login"

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
      <div dangerouslySetInnerHTML={{ __html: `${await marked.parse(meta["blog_desc"], { renderer: mdrender })}` }} />
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
            {isLogin && <>
              <a class="action"
                hx-trigger="click"
                hx-swap="innerHTML"
                hx-target="body"
                hx-push-url="true"
                hx-get={`/console/post/${id}`}> - edit</a>
              <a class="action"
                hx-trigger="click"
                hx-delete={`/console/post/${id}`}
                hx-swap="none"
                hx-push-url="true"
                hx-confirm="Are you sure?"> - delete</a>
            </>}
          </p >
          <div dangerouslySetInnerHTML={{ __html: `${await marked.parse(ellipsisText(content, 200), { renderer: mdrender })}` }} />
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
