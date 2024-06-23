import { desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

const tblPost = sqliteTable("Post", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
  content: text("content").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
  deleted_at: text("deleted_at").notNull(),
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
