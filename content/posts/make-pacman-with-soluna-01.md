+++
title = '你好,世界 - 用 Soluna 制作吃豆人游戏'
date = 2025-11-10T15:43:48+08:00
draft = false
+++

本文是系列文章《用 Soluna 制作吃豆人游戏》的第一篇.

<!--more-->

[目录]({{< ref "make-pacman-with-soluna-00.md" >}})

## 你好, 世界

在阅读这篇文章时, 我对你的期望是已经下载好对应平台的 Soluna 引擎, 并且把引擎放到一个叫作 `pacman.lua` 的文件夹. 后续, 所有的描述中路径都是相对于 `pacman.lua` 这个文件夹的.

首先我们创建一个 `./main.game` 文件和一个 `./src/main.lua` 文件.

`./main.game` 是 Soluna 引擎的游戏配置文件, 引擎首先会在当前目录下查找这个文件, 读取其中的配置.

这个文件使用的是一种类似于 yaml 的配置格式, 键和值之间使用空格和冒号进行分隔. 对于一个对象,
    需要使用一个 tab 缩进来表示层级关系. 内容如下:

```
version : 0.1.0
width : 448
height : 576
high_dpi : true
soluna : 3
background : 0x000000
entry : src/main.lua
```

原版的吃豆人游戏由28x36个格子组成, 每个格子是8x8像素, 因此游戏窗口的大小是 224x288 像素.
但是为了适应现代屏幕, 我们将窗口大小放大了两倍,即 448x576 像素. 当然,
    你也可以根据自己的喜好调整窗口大小. 这里我们使用 `width` 和 `height` 来指定窗口的宽度和高度.

在配置中, `version` 是游戏的版本号, 这里我们随便给个 0.1.0 作为初始版本号. `soluna` 是我们期望的
Soluna 引擎的主版本号. 现在没什么用, 后面可以用来校验引擎版本是否符合要求.

`high_dpi` 表示是否启用高分辨率支持, `background` 是窗口的背景颜色(使用十六进制表示),
`entry` 是游戏的入口脚本路径.

这样当我们在项目根目录中执行 `./soluna` 命令时, 引擎就会读取这个配置文件, 寻找入口脚本
`./src/main.lua` 并加载和执行它.

接下来我们来编写入口脚本 `./src/main.lua` 的内容:

```lua
---@type Callback
local callback = {}

function callback.frame(_count)
    print("Hello, world!")
end

return callback
```

在这个脚本中, 我们定义了一个 `callback` 对象, 它的类型是 `Callback`. 这个类型的定义你可以在 Soluna
的 [API 文档](https://github.com/cloudwu/soluna/blob/master/docs/callback.lua)中找到.
它要求我们提供几个方法, 以便于引擎在运行时根据需要进行调用.

这里我们首先实现一个 `frame` 方法, 它会在每一帧被引擎调用. 目前我们只是简单的打印一句 "Hello,
    world!".

现在我们可以在项目根目录下打开终端, 执行 `./soluna` 命令来运行游戏了. 你应该会在终端中看到:
```bash
$ ./soluna
[2025-11-10 16:00:43.89][INFO ]( root ) startup 1
[2025-11-10 16:00:43.89][INFO ]( timer ) startup 2
[2025-11-10 16:00:43.90][INFO ]( log ) startup 3
[2025-11-10 16:00:43.90][INFO ]( loader ) startup 4
[2025-11-10 16:00:43.90][INFO ]( start ) startup 5
[2025-11-10 16:00:43.91][INFO ]( gamepad ) startup 6
[2025-11-10 16:00:43.91][INFO ]( settings ) startup 7
[2025-11-10 16:00:43.91][INFO ]( render ) startup 8
[2025-11-10 16:00:43.93][INFO ]( start ) Hello, world!
[2025-11-10 16:00:43.94][INFO ]( start ) Hello, world!
... (more lines)
```
这表示引擎已经成功启动, 并且每一帧都调用了我们的 `frame` 方法, 打印出了 "Hello, world!".

同时还有一个 448x576 的窗口被打开, 但目前它是黑色的, 因为我们还没有绘制任何内容.

> 题外话: 我们可以看到日志的格式是 `[时间戳][日志级别]( 模块名 ) 日志内容`, 这是 Soluna
引擎内置的日志系统. 其中不同的模块名背后都是一个独立运行的线程(Lua 虚拟机实例), 这也是 Soluna
引擎多线程架构的体现之一. 我们编写的游戏代码则运行在 `start` 模块中. 

## 固定时间步长

不知道你是否有过这样的经历, 有些古早的游戏在现代电脑上运行时会变得非常快, 以至于玩家根本无法控制角色.
这是因为这些游戏的逻辑更新是与渲染帧率绑定的, 当现代电脑设备硬件性能增强时渲染帧率也相应变高了, 逻辑更新也会变得更快.

为了避免这种情况, 我们需要使将逻辑帧率和渲染帧率区分开, 使用固定时间步长来更新游戏逻辑. 在原版的吃豆人游戏中, 逻辑更新
的频率是每秒 60 帧, 因此我们需要保证逻辑在每1/60秒才更新一次.

这里我们可以在代码中添加一个时间累计器 `accumulator`, 用于累计过去了多少时间.
每当累计的时间超过了固定的时间步长(1/60秒)时, 我们就进行一次逻辑更新, 并且将累计的时间减少相应的步长.

```lua
local ltask = require "ltask"

local TICK = 1 / 60
local MAX_DT = 0.25

local last_cs
local accumulator = 0.0

---@type Callback
local callback = {}

---@type fun()
local game_tick; do
    local tick_count = 0
    local elapsed = 0.0
    function game_tick()
        tick_count = tick_count + 1
        elapsed = elapsed + TICK
        if tick_count % 60 == 0 then
            print(string.format("ticks=%d, elapsed=%.2f", tick_count, elapsed))
        end
    end
end

function callback.frame(_count)
    local _, now_cs = ltask.now()
    if not last_cs then
        last_cs = now_cs
    end

    local dt = (now_cs - last_cs) / 100.0
    last_cs = now_cs

    if dt > MAX_DT then
        dt = MAX_DT
    end
    accumulator = accumulator + dt
    while accumulator >= TICK do
        game_tick()
        accumulator = accumulator - TICK
    end
end

return callback
```

这里我们使用了 `ltask` 库来获取当前的时间. [ltask](https://github.com/cloudwu/ltask) 是 Soluna 引擎底层依赖的一个轻量 Lua 多任务调度库, 是 Soluna 的多线程功能的基础. 通过调用 `ltask.now()` 方法, 我们可以获取当前的时间戳(单位是百分之一毫秒).

在 `callback.frame` 方法中, 我们首先获取当前时间戳, 并计算出自上次调用以来经过的时间 `dt`.
然后我们将 `dt` 累加到 `accumulator` 中. 如果 `accumulator` 超过了固定的时间步长 `TICK`, 我们就调用 `game_tick` 方法进行一次逻辑更新,
并将 `accumulator` 减去 `TICK`. 这个过程会一直持续到 `accumulator` 小于 `TICK`.

另外, 我们实现了一个简单的 `game_tick` 方法, 它会在每次逻辑更新时被调用.
目前这个方法在每经过 60 次调用时打印一次当前的逻辑更新次数和经过的时间.
现在, 当我们再次运行游戏时, 你应该会在终端中看到类似如下的输出:
```bash
$ ./soluna
[2025-11-10 16:15:06.82][INFO ]( root ) startup 1
[2025-11-10 16:15:06.82][INFO ]( timer ) startup 2
[2025-11-10 16:15:06.82][INFO ]( log ) startup 3
[2025-11-10 16:15:06.82][INFO ]( loader ) startup 4
[2025-11-10 16:15:06.82][INFO ]( start ) startup 5
[2025-11-10 16:15:06.83][INFO ]( gamepad ) startup 6
[2025-11-10 16:15:06.83][INFO ]( settings ) startup 7
[2025-11-10 16:15:06.83][INFO ]( render ) startup 8
[2025-11-10 16:15:07.86][INFO ]( start ) ticks=60, elapsed=1.00
[2025-11-10 16:15:08.86][INFO ]( start ) ticks=120, elapsed=2.00
[2025-11-10 16:15:09.86][INFO ]( start ) ticks=180, elapsed=3.00
[2025-11-10 16:15:10.86][INFO ]( start ) ticks=240, elapsed=4.00
[2025-11-10 16:15:11.87][INFO ]( start ) ticks=300, elapsed=5.00
[2025-11-10 16:15:12.88][INFO ]( start ) ticks=360, elapsed=6.00
... (more lines)
```
可以观察到, 逻辑更新的次数和经过的时间是同步的, 说明我们的固定时间步长机制工作正常.


细心的读者可能会注意到, 我们在计算 `dt` 时对其进行了一个最大值限制 `MAX_DT`.
这是为了防止在某些情况下(例如游戏被暂停)导致 `dt` 变得非常大, 从而引发逻辑更新的连锁反应, 影响游戏的正常运行.

到此为止, 我们已经成功地创建了一个基本的 Soluna 游戏框架, 并实现了固定时间步长的逻辑更新机制.
