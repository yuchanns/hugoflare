+++
title = '目录 - 用 Soluna 制作吃豆人游戏'
date = 2025-11-10T15:09:53+08:00
draft = false
+++

本文是系列文章《用 Soluna 制作吃豆人游戏》的序篇.

这个系列将通过制作经典的吃豆人游戏来向初体验用户(特别是游戏新手)逐步揭示
Soluna 游戏引擎的基本用法和功能.
因此无论你是想要了解引擎的游戏开发专家或者从未有任何游戏开发经验的新手, 都可以看看.

当然, 你首先得是个程序员, 且对 Lua 语言有一定了解.

你可以访问 [https://yuchanns.github.io/pacman.lua](https://yuchanns.github.io/pacman.lua) 在线体验系列文章最终完成的吃豆人游戏.

<!--more-->

> 特别注意: 在撰写本文时, 笔者本人也是游戏开发新手, 因此本文中难免会存在一些谬误, 欢迎各位读者批评指正.

## 什么是 Soluna?

Soluna 是一个由[云风](https://github.com/cloudwu)开源、我参与制作的 2D 游戏引擎,
它的一个特色是允许用户通过 Lua 这一脚本语言轻松地进行多线程开发. 同时凭借 [Sokol](https://github.com/floooh/sokol) 的良好设计实现了
Windows, macOS, Linux 和 Web 平台的跨平台支持.

你可以通过[每日构建](https://github.com/cloudwu/soluna/releases/tag/nightly)页面下载对应平台最新版本的
Soluna 引擎, 或者使用 luamake 自己进行编译.

本文在开发过程中使用对应平台的 Soluna 每日构建版本, 最终在部署到 Web 平台时则使用了 GitHub Actions
进行自动化构建和部署到 GitHub Pages. 理论上, 全程不需要用户进行任何手动编译.

## 吃豆人游戏简介

吃豆人(Pac-Man)是 1980 年代由南梦宫(Namco)公司开发的一款街机游戏, 由岩谷彻设计.
游戏的主角是一个黄色的圆形角色, 玩家需要控制它在迷宫中吃掉所有的小豆子, 同时躲避四个鬼魂的追捕.

本系列文章在开发过程中参考了 [pacman.c](https://github.com/floooh/pacman.c) 这一 Sokol 演示程序,
但并非完全照搬, 而是根据 Soluna 引擎的特点进行了重新实现.


## 目录

- 1 - [你好, 世界]({{< ref "make-pacman-with-soluna-01.md" >}})
- 2 - 动起来的鬼魂
- 3 - 布局与迷宫
- 4 - ... (待续)
