+++
title = 'Python Web 框架中的后台任务'
date = 2025-04-08T18:22:20+08:00
draft = false
+++

几个月前在开发一个 Python Web 项目时，我希望能像 Go 项目那样，在 Web 服务启动时就能同时运行一些后台任务。这让我开始寻找 Python 中的最佳实践方案。

<!--more-->

### 初次尝试：FastAPI 的 BackgroundTask

最初，有推友建议使用 FastAPI 的 BackgroundTask 特性。但研究后发现，这个特性主要是用于在 HTTP 请求结束后执行一些清理或后续处理工作：

```python
from fastapi import FastAPI, BackgroundTasks

app = FastAPI()

async def after_request():
    # 做一些清理工作
    pass

@app.get("/")
async def root(background_tasks: BackgroundTasks):
    background_tasks.add_task(after_request)
    return {"message": "Hello World"}
```

这与我想要的持续运行的消费者模式不太匹配。我需要的是服务启动就开始运行，并且持续执行的后台任务。

### 中期方案：Twisted + 多线程

后来尝试了 Twisted，但这个方案存在几个明显的问题：

1. 需要依赖线程或进程。线程会带来额外的复杂性，而进程则太重了，与我期望的轻量级后台任务（类似 Go 的 goroutine）相去甚远
2. Twisted 与现代的 async/await 生态不太兼容，而我更希望使用现代的异步框架
3. 代码组织结构不够清晰，特别是在需要多个后台任务时

```python
from twisted.internet import reactor, threads
from twisted.web.server import Site
from twisted.web.resource import Resource

class BackgroundWorker:
    def run(self):
        while True:
            # 执行后台任务
            time.sleep(1)

class WebServer(Resource):
    isLeaf = True
    
    def render_GET(self, request):
        return b"Hello, world!"

def start_background_tasks():
    worker = BackgroundWorker()
    # 在新线程中运行后台任务
    threads.deferToThread(worker.run)
```

### 现在的方案：FastAPI + asyncio

最近在开发个人项目时重新使用 FastAPI，经过深入研究后，找到了一个比较满意的解决方案：

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
import asyncio
import logging

logger = logging.getLogger(__name__)

async def background_task():
    while True:
        try:
            # 执行具体的后台任务
            await process_messages()
        except Exception as e:
            logger.error(f"Background task error: {e}")
        await asyncio.sleep(1)

async def process_messages():
    # 具体的业务逻辑
    pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动后台任务
    task = asyncio.create_task(background_task())
    yield
    # 清理工作
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(lifespan=lifespan)
```

这个方案有以下优点：
1. 完全基于协程，轻量级且高效，更接近 Go 的 goroutine 体验
2. 充分利用了现代 Python 的 async/await 特性
3. 使用 FastAPI 的 lifespan 来管理任务的生命周期，代码结构清晰
4. 错误处理和优雅关闭都得到了很好的支持
5. 便于调试和监控
6. 可以轻松扩展为多个后台任务

最终选择的这个方案不仅实现了最初的需求，而且符合 Python 的异步编程理念，是一个比较理想的解决方案。

