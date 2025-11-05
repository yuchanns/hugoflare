+++
title = 'Soluna 快速入门'
date = 2025-10-11T13:22:19+08:00
draft = false
+++

虽然我最近给 soluna 贡献了不少提交，但我实际上还不懂得如何使用它。

所以我简单写了一个快速入门指南，总结我自己基于 deepfuture 项目学习到的用法。

<!--more-->

> 注意: soluna 目前还处于快速迭代阶段, APIs 随时可能发生重大变化，本文内容可能很快就会过时。
>
> 本文截止 commit **a673013**

等真正熟悉后，我会考虑同步到 soluna 的官方文档中，并维护更新。

## 快速入门

- 构建/下载 soluna 对应平台的可执行文件。
- 新建同目录下 quickstart.lua，内容如下（示例假设系统里有常见字体，如 Windows 的“微软雅黑”、macOS 的“PingFang SC”、Linux 可换成 Wenquanyi Micro Hei，请按实际字体名替换 FONT_FAMILY）: 

```lua
local soluna = require("soluna")
local matquad = require("soluna.material.quad")
local mattext = require("soluna.material.text")
local font = require("soluna.font")
local sysfont = require("soluna.font.system")
local math = math

-- soluna 引擎传入的参数, 这是一个 table
-- 包括 width, height, 和 batch 字段
-- 以及其他外部传给 soluna 的字段
args = ...

local FONT_FAMILY = "Wenquanyi Micro Hei" -- 请替换为本机存在的字体
local PANEL_W, PANEL_H = 320, 160

-- 设置窗口标题
soluna.set_window_title("Soluna Quick Start")

-- 获取批渲染 API
local batch = args.batch

-- 创建字体
font.import(assert(sysfont.ttfdata(FONT_FAMILY)))
local font_id = font.name("")
local font_ctx = font.cobj()
-- 创建文字材质
local text_block = mattext.block(font_ctx, font_id, 28, 0xff202020, "CT")
-- 创建提示文字材质
local tip_block = mattext.block(font_ctx, font_id, 20, 0xff405060, "CT")
-- 创建文字对象
local hello_label = text_block("你好，Soluna！", PANEL_W, 64)
-- 创建提示对象
local hint_label = tip_block("把鼠标移到面板上试试", PANEL_W, 32)
-- 创建悬停提示对象
local hover_label = tip_block("鼠标在这里！", PANEL_W, 32)

-- 创建面板和旋转小块材质
local panel_bg = matquad.quad(PANEL_W, PANEL_H, 0xfff2f6ff)
local panel_hover = matquad.quad(PANEL_W, PANEL_H, 0x8033ff66)
local spinner_quad = matquad.quad(48, 48, 0xff3366ff)

-- 状态
local state = { hover = false, t = 0 }
-- 计算面板位置
local panel_x = (args.width - PANEL_W) * 0.5
local panel_y = (args.height - PANEL_H) * 0.5
-- 计算面板中心位置
local panel_cx = panel_x + PANEL_W * 0.5
local panel_cy = panel_y + PANEL_H * 0.5

-- 回调函数, 由引擎调用
local callback = {}

-- 引擎每帧调用
function callback.frame(count)
	state.t = state.t + 1
	-- pulse 表示缩放系数
	-- math.sin 的参数单位是弧度, 0.05 约等于 2π/125
	-- 0.05 的周期约为 125 帧, 约 2 秒
	-- pulse 在 [0.75, 0.95] 之间变化
	local pulse = 0.85 + math.sin(state.t * 0.05) * 0.1

	-- 将面板平移并添加到屏幕中央
	batch:add(panel_bg, panel_x, panel_y)
	-- 如果悬停则叠加悬停背景
	if state.hover then
		batch:add(panel_hover, panel_x, panel_y)
	end
	-- 添加文字和提示到面板上, 位置相对于面板左上角
	batch:add(hello_label, panel_x, panel_y + 32)
	-- 根据悬停状态选择提示文字
	batch:add(state.hover and hover_label or hint_label, panel_x, panel_y + 96)

	-- 下面的代码展示 layer 的嵌套用法
	-- 先平移到面板中心
	batch:layer(panel_cx, panel_cy) -- translate
	do -- do-end 只是为了在视觉上区分层次, 没有实际作用
		batch:layer(pulse, state.t * 0.03, 0, 0) -- scale + rotate
		do
			-- 最后缩放并添加旋转小块
			-- 因为 spinner_quad 的尺寸是 48x48, 所以这里平移 -24, -24 让它中心对齐
			batch:add(spinner_quad, -24, -24)
		end
		-- 弹出旋转层
		batch:layer()
	end
	-- 弹出平移层
	batch:layer()
end

-- 鼠标移动时调用
function callback.mouse_move(mx, my)
	-- 计算鼠标在面板内的局部坐标
	batch:layer(panel_x, panel_y)
	do
		-- point 会把屏幕坐标逆变换成局部坐标
		-- 这里的 mx, my 是屏幕坐标
		-- 返回的 lx, ly 是面板内的局部坐标
		local lx, ly = batch:point(mx, my)
		-- 判断鼠标是否在面板内
		state.hover = lx >= 0 and lx <= PANEL_W and ly >= 0 and ly <= PANEL_H
	end
	-- 弹出平移层
	batch:layer()
end

callback.window_resize = function() end
callback.mouse_button = function() end
callback.mouse_scroll = function() end
callback.key = function() end

return callback
```

- 运行步骤: `./soluna entry=quickstart.lua。`

### 材质模块说明

• 目前 soluna 可直接使用的材质模块只有四种: 

  - 精灵材质: 通过 `soluna.load_sprites` 载入 sprites 资源, 然后直接使用 `batch:add(sprite_id, x, y)` 载入指定的 sprite id 。框架会把同一纹理的实例自动批处理，适合普通贴图渲染。
  - 纯色矩形材质 `soluna.material.quad`: `matquad.quad(w, h, color)` 返回一段可以 `batch:add` 的 userdata，用来画 UI 面板、遮罩等。Alpha 通道可控，支持在 `batch:layer` 变换下缩放、旋转。
  - 文本网格材质 `soluna.material.text`: `mattext.block(...)`/`mattext.char(...)` 生成排版后的文本或字符，常见用法是 `mattext.block(font.cobj(), font_id, size, color, align)` 得到闭包再渲染整段文字。
  - 蒙版/着色材质 `soluna.material.mask`: `mask.mask(sprite_id, color)` 会把给定精灵按指定颜色（含透明度）渲染，常用于高亮、灰度等效果。和 `matquad` 一样返回可直接 `batch:add` 的 userdata。

### 文字材质 API 速查

• `mattext.block(font_mgr, font_id [, font_size [, color [, align_string]]]) -> draw_fn, cursor_fn`

  - font_mgr: `font.cobj()` 返回的指针（light userdata），用于访问字体管理器。
  - font_id: 通过 `font.name(...)` 或其它接口取得的字体编号（整数）。
  - font_size（可选，默认 24）: 字号，单位是像素。
  - color（可选，默认 0xff000000）: ARGB 颜色，若未提供 alpha 会自动补成不透明。
  - align_string（可选）: 对齐组合，支持 L/R/C（水平左/右/居中）和 T/B/V（垂直上/下/居中），可任意拼写，例如 "CV" 全居中、"LT" 左上。

  返回值: 

  1. `draw_fn(text, width, height) -> userdata`
     将字符串排版到给定宽高区域，生成可直接 `batch:add` 的材质对象。
  2. `cursor_fn(text, cursor_index, width, height) -> x, y, w, h, next_index, descent`
     计算插入光标位置（用于文本编辑），同时返回下一个合法的字符索引和当前行的 descent；若无需光标，可忽略此函数。

### BATCH API 速查

- `batch:add(obj [, x [, y]])`
    - obj 可以是: 正整数 sprite id；材质模块返回的 userdata（例如 matquad.quad、mattext.block(...) 的结果）；或已经打包好的二进制流。附带坐标则先平移后提交。
- `batch:layer(...)` （入栈；不带参数表示出栈）
    - `batch:layer()`: 弹出一层（必须与之前的 push 成对）。
    - `batch:layer(rot)`: 仅附加旋转（弧度），围绕当前原点。
    - `batch:layer(x, y)`: 平移。
    - `batch:layer(scale, x, y)`: 缩放 + 平移。
    - `batch:layer(scale, rot, x, y)`: 缩放 + 旋转 + 平移。
      调用顺序即执行顺序；多次 layer 可嵌套，最终作用于之后的每个 batch:add。
- `batch:point(mx, my)`: 把屏幕坐标逆变换成当前层的局部坐标，适合命中测试。

### 交互说明

- 面板完全由 matquad 生成的矩形构成；旋转小块展示 layer 的缩放+旋转组合；文字由系统字体即时生成。
- 将鼠标移入面板，背景会叠加绿色半透明层，提示文字也会切换为“鼠标在这里！”——这就是 batch:point 辅助的 hover 效果。


## 经典 TODO 开局

soluna 还提供了一个基于 yoga 的 layout 模块，这意味着我们可以用来排版。

----

TODO
