import { desc, eq, inArray, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export interface Text {
  text: string
}

export interface Code {
  code: string
  language?: string
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
  is_draft: integer("is_draft", { mode: "boolean" }).default(true).notNull(),
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

export const getPosts = async (DB: D1Database, page: number, size: number, includeDraft: boolean) => {
  const db = drizzle(DB)
  const isDraft = [false]
  if (includeDraft) {
    isDraft.push(true)
  }
  const q = db.select().from(tblPost).
    where(inArray(tblPost.is_draft, isDraft)).orderBy(desc(tblPost.created_at))
  if (page > 0) {
    q.offset((page - 1) * size).limit(size)
  }
  return await q
}

export const getPost = async (DB: D1Database, id: string, includeDraft: boolean) => {
  const db = drizzle(DB)
  const isDraft = [false]
  if (includeDraft) {
    isDraft.push(true)
  }
  return await db.select().from(tblPost).
    where(and(eq(tblPost.id, id), inArray(tblPost.is_draft, isDraft))).get()
}

export const deletePost = async (DB: D1Database, id: string) => {
  const db = drizzle(DB)
  await db.delete(tblPost).where(eq(tblPost.id, id))
}

const buildList = (item: Item, indent: number, index: number): string => {
  const contents = []
  if (index > 0) {
    contents.push("\t".repeat(indent) + `${index}. ` + item.content + "\n")
  } else {
    contents.push("\t".repeat(indent) + "* " + item.content + "\n")

  }
  for (let [idx, it] of item.items.entries()) {
    if (index == 0) {
      idx = 0
    }
    contents.push(buildList(it, indent + 1, idx + 1))
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
          for (let [index, item] of data.items.entries()) {
            if (data.style == "unordered") {
              index = 0
            }
            contents.push(buildList(item, 0, index + 1))
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
          contents.push(`![${data.caption}](${data.file.url})\r\n`)
        }
        break
      case "code":
        {
          const data = block.data as Code
          const lang = data.language ?? "plain"
          contents.push(`\`\`\`${lang}\n${data.code}\n\`\`\`\r\n`)
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

export const savePost = async (DB: D1Database, post: { title: string, blocks: Block[], is_draft: boolean }, id?: string) => {
  const db = drizzle(DB)
  const timestamp = String(Date.now())
  const { title, blocks, is_draft } = post
  const content = buildContent(blocks)
  if (id) {
    await db.update(tblPost).
      set({ title, blocks, content, is_draft }).
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
    is_draft,
    created_at: timestamp,
    updated_at: timestamp,
  }
  await db.insert(tblPost).values(post_data)
  return id
}
