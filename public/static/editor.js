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

var convertBlock = async (api, block) => {
  const { data: { text } } = await block.save()

  const headerMatch = text.match(/^(#{1,6})\s+(?!<br>)(.+)/)
  if (headerMatch) {
    const { id } = await api.blocks.convert(block.id, 'header')
    await api.blocks.update(id, {
      text: text.substring(headerMatch[1].length),
      level: headerMatch[1].length,
    })
    return
  }

  const quoteMatch = text.match(/^&gt;\s+(?!<br>)(.+)/)
  if (quoteMatch) {
    const { id } = await api.blocks.convert(block.id, 'quote')
    await api.blocks.update(id, {
      text: quoteMatch[1].trim()
    })
    return
  }

  const uolistMatch = text.match(/^[*-]\s+(?!<br>)(.+)/)
  if (uolistMatch) {
    const { id } = await api.blocks.convert(block.id, 'list')
    await api.blocks.update(id, {
      style: 'unordered',
      items: [
        { content: uolistMatch[1].trim() }
      ]
    })
    return
  }

  const olistMatch = text.match(/^(\d+)\.\s+(?!<br>)(.+)/)
  if (olistMatch) {
    const { id } = await api.blocks.convert(block.id, 'list')
    await api.blocks.update(id, {
      style: 'ordered',
      items: [
        { content: olistMatch[2].trim() }
      ]
    })
    return
  }
}

var debounce = (fn, wait) => {
  let timeout

  return function(...args) {
    const context = this

    return new Promise((resolve, reject) => {
      const later = () => {
        timeout = null
        try {
          const result = fn.apply(context, args)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }

      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    })
  }
}

var save = debounce(async (api) => {
  const { blocks } = await api.saver.save()
  try {
    await htmx.ajax('POST', `/console/post/${htmx.find('#id').getAttribute("data-vals")}`, {
      swap: 'none',
      values: {
        blocks,
        title: htmx.find('#title').value,
        relocate: false,
        is_publish: htmx.find('input[name=is_publish]:checked').value,
      }
    })
    htmx.find('#save-point').innerHTML = new Date().toLocaleString()
  } catch (e) { }
}, 5000)


var loadEditorJS = async () => {
  await Promise.all([
    loadScript('/static/editorjs/editorjs@2.30.2.umd.min.js'),
    loadScript('/static/editorjs/header@2.8.7.umd.min.js'),
    loadScript('/static/editorjs/checklist@1.6.0.umd.min.js'),
    loadScript('/static/editorjs/nested-list@1.4.2.umd.min.js'),
    loadScript('/static/editorjs/quote@2.6.0.umd.min.js'),
    loadScript('/static/editorjs/image@2.9.1.umd.min.js'),
    loadScript('/static/editorjs/codecup@1.1.1.bundle.min.js'),
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
          uploader: {
            /**@param {File} file **/
            uploadByFile: async (file) => {
              const encoded = await new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.readAsDataURL(file)
                reader.onload = () => resolve(reader.result)
                reader.onerror = error => reject(error)
              })
              const result = await fetch("/console/upload-image", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  image: encoded,
                  name: file.name,
                  type: file.type,
                })
              })
              if (!result.ok) {
                throw new Exception(result.statusText)
              }
              return await result.json()
            }
          }
        }
      },
      code: editorJsCodeCup,
      inlineCode: InlineCode,
    },
    data: {
      blocks,
    },
    onChange: async (api, _) => {
      const index = api.blocks.getCurrentBlockIndex()
      const block = api.blocks.getBlockByIndex(index)
      if (block.name == "paragraph") {
        await convertBlock(api, block)
      }

      await save(api)
    }
  })
}

Promise.all([
  loadEditorJS()
])
