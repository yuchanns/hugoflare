+++
title = '[Copy] How to Use Clangd Lsp in Any Project'
date = 2025-09-22T13:11:27+08:00
draft = false
+++

> Source: [Strus/clangd.md](https://gist.github.com/Strus/042a92a00070a943053006bf46912ae9)

**tl;dr:** If you want to just know the method, skip to `How to` section

<!--more-->

Clangd is a state-of-the-art C/C++ LSP that can be used in every popular text editors like Neovim, Emacs or VS Code. Even CLion uses clangd under the hood. Unfortunately, clangd requires `compile_commands.json` to work, and the easiest way to painlessly generate it is to use CMake.

For simple projects you can try to use [Bear](https://github.com/rizsotto/Bear) - it will capture compile commands and generate `compile_commands.json`. Although I could never make it work in big projects with custom or complicated build systems.

But what if I tell you you can quickly hack your way around that, and generate `compile_commands.json` for any project, no matter how compilcated? I have used that way at work for years, originaly because I used CLion which supported only CMake projects - but now I use that method succesfully with clangd and Neovim.

## Method summary
Basically what we need to achieve is to create a CMake file that will generate a `compile_commands.json` file with information about:

1. All source files
2. All include directories
3. External libraries
4. Precompiler definitions

We can do that easily without really caring about if the CMake-generate result will compile at all - we don't need to rewrite our existing build system, just hack a CMake file that will generate enough information for Clangd to work.

## Prerequisities

1. [CMake](https://cmake.org/)
2. [clangd](https://clangd.llvm.org/)

## How to

First, create a CMakeLists.txt file in the root folder of your projects, with content similar to this:
```cmake
cmake_minimum_required(VERSION 3.8)
project(my_project)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Change path from /src if needed, or add more directories
file(GLOB_RECURSE sources
        "${CMAKE_SOURCE_DIR}/src/*.c"
        "${CMAKE_SOURCE_DIR}/src/*.cpp"
        )
# Add precompiler definitions like that:
add_definitions(-DSOME_DEFINITION)

add_executable(my_app ${sources})

# Add more include directories if needed
target_include_directories(my_app PUBLIC "${CMAKE_SOURCE_DIR}/include")

# If you have precompiled headers you can add them like this
target_precompiled_headers(my_app PRIVATE "${CMAKE_SOURCE_DIR}/src/pch.h")
```

(If your project already uses CMake, then you just need to add `set(CMAKE_EXPORT_COMPILE_COMMANDS ON)` to your main `CMakeLists.txt` file.)

Modify hacky `CMakeLists.txt` according to your project structure, and run:
```shell
cmake -S . -G "Unix Makefiles" -B cmake
```
which will generate the CMake output inside `cmake` directory. Check if `compile_commands.json` is there.

**NOTE: You need to run that command every time you add/remove a source file in your project.**

If you need more (ex. include external libraries like Boost), check out [CMake documentation](https://cmake.org/documentation/)

Now you have two options:
1. Symlink `compile_commands.json` to your root project folder:
```shell
ln -s cmake/compile_commands.json .
```
OR

2. Create `.clangd` file in your root project folder, with the following contents:
```
CompileFlags:
  CompilationDatabase: "cmake"
```

Now open the project in you editor and everything should work (assuming `clangd` LSP is started).
