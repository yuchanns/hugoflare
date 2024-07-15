/** @typedef {import("./editorjs/editorjs@2.30.2.umd.min.js")} EditorJS **/

var editor

var loadScript = (url) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = url
    script.onload = () => resolve(script)
    script.onerror = () => reject(new Error(`Script load error for ${url}`))
    htmx.find('#script').appendChild(script)
  })
}

var loadEditorJS = async () => {
  await Promise.all([
    loadScript('/static/editorjs/editorjs@2.30.2.umd.min.js'),
    loadScript('/static/editorjs/header@2.8.7.umd.min.js'),
    loadScript('/static/editorjs/checklist@1.6.0.umd.min.js'),
    loadScript('/static/editorjs/nested-list@1.4.2.umd.min.js'),
    loadScript('/static/editorjs/quote@2.6.0.umd.min.js'),
    loadScript('/static/editorjs/image@2.9.1.umd.min.js'),
    loadScript('/static/editorjs/code@2.9.0.umd.min.js'),
    loadScript('/static/editorjs/inline-code@1.5.0.umd.min.js'),
  ])

  const data = htmx.find("#data").getAttribute("data-vals")
  const blocks = data.length > 0 ? JSON.parse(decodeURIComponent(atob(data))) : []
  /** @type {EditorJS} **/
  editor = new EditorJS({
    autofocus: true,
    holder: 'editor',
    tools: {
      header: Header,
      checklist: Checklist,
      list: NestedList,
      quote: Quote,
      image: {
        class: ImageTool,
        config: {
          byFile: '/console/upload-image',
          byUrl: '/console/fetch-image'
        }
      },
      code: CodeTool,
      inlineCode: InlineCode,
    },
    data: {
      blocks,
    },
    onChange: async (api, _) => {
      const index = api.blocks.getCurrentBlockIndex()
      const block = api.blocks.getBlockByIndex(index)
      if (block.name == "paragraph") {
        const { data: { text } } = await block.save()
        const headerMatch = text.match(/^(#{1,6})\s+(.+)/)
        if (headerMatch) {
          const { id } = await api.blocks.convert(block.id, 'header')
          await api.blocks.update(id, {
            text: text.substring(headerMatch[1].length),
            level: headerMatch[1].length,
          })
        }
      }
    }
  })
}

Promise.all([
  loadEditorJS()
])
