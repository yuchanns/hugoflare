import { desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export interface Text {
  text: string
}

export interface Code {
  code: string
}

export interface Paragraph {
  text: string
}

export interface Header {
  text: string
  level: number
}

export interface CheckList {
  items: {
    text: string
    checked: boolean
  }[]
}

export interface Item {
  content: string
  items: Item[]
}

export interface NestedList {
  style: string
  items: Item[]
}

export interface Quote {
  text: string
  caption: string
  alignment: string
}

export interface Image {
  file: { url: string }
  caption: string
  withBorder: boolean
  withBackground: boolean
  stretched: boolean
}

export interface Block {
  id: string
  type: "header" | "checklist" | "list" | "quote" | "image" | "paragraph" | "code" | "text"
  data: Header | CheckList | NestedList | Quote | Image | Paragraph | Code | Text
}

const tblPost = sqliteTable("Post", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
  content: text("content").notNull(),
  blocks: text("blocks", { mode: "json" }).$type<Block[]>().notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
  deleted_at: text("deleted_at"),
})

const tblMetadata = sqliteTable("Metadata", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  value: text("value").notNull(),
})

export const getHomepageMetadata = async (DB: D1Database) => {
  const db = drizzle(DB)
  const records = await db.select().from(tblMetadata).
    where(inArray(tblMetadata.name, ["blog_name", "blog_desc", "blog_avatar"]))
  return Object.fromEntries(records.map(({ name, value }) => {
    return [name, value]
  }))
}

export const getPosts = async (DB: D1Database, page: number, size: number) => {
  const db = drizzle(DB)
  page = page <= 0 ? 1 : page
  return await db.select().from(tblPost).
    offset((page - 1) * size).limit(size).orderBy(desc(tblPost.created_at))
}

export const getPost = async (DB: D1Database, id: string) => {
  const db = drizzle(DB)
  return await db.select().from(tblPost).
    where(eq(tblPost.id, id)).get()
}

export const deletePost = async (DB: D1Database, id: string) => {
  const db = drizzle(DB)
  await db.delete(tblPost).where(eq(tblPost.id, id))
}

const buildList = (item: Item, indent: number): string => {
  const contents = []
  contents.push("\t".repeat(indent) + "* " + item.content + "\n")
  for (item of item.items) {
    contents.push(buildList(item, indent + 1))
  }
  return contents.join("\r\t")
}

const buildContent = (blocks: Block[]) => {
  const contents = []
  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        {
          const data = block.data as Paragraph
          contents.push(data.text + "\r\n")
        }
        break
      case "header":
        {
          const data = block.data as Header
          contents.push("#".repeat(data.level) + " " + data.text + "\r\n")
        }
        break
      case "quote":
        {
          const data = block.data as Quote
          contents.push("> " + data.text + "\r\n")
        }
        break
      case "list":
        {
          const data = block.data as NestedList
          for (const item of data.items) {
            // FIXME: respect the style
            contents.push(buildList(item, 0))
          }
        }
        break
      case "checklist":
        {
          const data = block.data as CheckList
          for (const item of data.items) {
            if (!item.checked) {
              contents.push("- [ ] " + item.text + "\n")
            } else {
              contents.push("- [x] " + item.text + "\n")
            }
          }
        }
        break
      case "image":
        {
          const data = block.data as Image
          contents.push(`[${data.caption}](${data.file.url})\r\n`)
        }
        break
      case "code":
        {
          const data = block.data as Code
          contents.push(`\`\`\`\n${data.code}\n\`\`\`\r\n`)
        }
        break
      case "text":
        {
          const data = block.data as Text
          contents.push(`\`${data.text}\``)
        }
        break
    }
  }
  return contents.join("\r\n")
}

export const savePost = async (DB: D1Database, post: { title: string, blocks: Block[] }, id?: string) => {
  const db = drizzle(DB)
  const timestamp = String(Date.now())
  const { title, blocks } = post
  const content = buildContent(blocks)
  if (id) {
    await db.update(tblPost).
      set({ title, blocks, content }).
      where(eq(tblPost.id, id))
    return id
  }
  id = crypto.randomUUID()
  const post_data = {
    id,
    title,
    tags: [],
    content,
    blocks,
    created_at: timestamp,
    updated_at: timestamp,
  }
  await db.insert(tblPost).values(post_data)
  return id
}
