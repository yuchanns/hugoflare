import { Hono } from 'hono'
import { renderer } from './components'
import { getHomepageMetadata, getPost, getPosts } from './db'
import { marked } from 'marked'
import { HTTPException } from 'hono/http-exception'

type Bindings = {
  DATABASE: D1Database
}

const ellipsisText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }

  let truncatedText = text.substring(0, maxLength);

  let spaceIndex = truncatedText.lastIndexOf(' ');

  if (spaceIndex !== -1) {
    truncatedText = truncatedText.substring(0, spaceIndex);
  }

  return `${truncatedText.trim()}...`;
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(renderer)

app.notFound((_c) => {
  throw new HTTPException(404, { message: "NotFound" })
})

app.onError((err, c) => {
  return c.render(<>
    <header>
      <h1>{(err instanceof HTTPException) ? `${err.status} ${err.message}` : `500 ${err.message}`}</h1>
    </header>
    <p><a class="button"
      hx-trigger="click"
      hx-get="/"
      hx-swap="innerHTML"
      hx-target="body"
      hx-push-url="true">Back to home</a></p>
  </>, { title: err.message })
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
      <h1>{post.title}</h1>
      <p>{`${date.getDate()} ${date.toLocaleString('en-US', { month: "short" })} ${date.getFullYear()}`}</p>
    </header>
    <div dangerouslySetInnerHTML={{ __html: await marked.parse(post.content) }} />
    <hr />
    <p><a class="button"
      hx-trigger="click"
      hx-get="/"
      hx-swap="innerHTML"
      hx-target="body"
      hx-push-url="true">Back to home</a></p>
  </>, { title: post.title })
})

app.get('/', async (c) => {
  const page = parseInt(c.req.query("page") ?? "1")
  const meta = await getHomepageMetadata(c.env.DATABASE)
  const size = 5
  const posts = await getPosts(c.env.DATABASE, page, size)
  return c.render(<>
    <header>
      <h1>{meta["blog_name"]}</h1>
    </header>
    <p>
      <img
        style="float: right; width: 9em; margin-left: 1em; border-radius: 15px;"
        src={meta["blog_avatar"]}
        alt={`Photo of ${meta["blog_name"]}`}>
      </img>
      <div dangerouslySetInnerHTML={{ __html: `${await marked.parse(meta["blog_desc"])}` }}></div>
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
            hx-push-url="true">{title}</a></p >
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
      hx-select-oob="#page">Loading ...</div> ||
      <div id="page" />
    }
  </>
    , { title: "Home" })
})

export default app
