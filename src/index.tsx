import { Hono } from 'hono'
import { renderer } from './components'

const app = new Hono()

app.use(renderer)

app.get('/', (c) => {
  const time = new Date().toISOString()
  return c.render(<div>
    <h1
      hx-target=".time"
      hx-trigger="every 10s"
      hx-get="/"
      hx-swap="innerHTML"
      hx-select=".time">Hello! Loaded time {time}</h1>
    <p
      class="time">Current time is {time} (update every 10 seconds)</p>
  </div>
    , { title: "Home" })
})

export default app
