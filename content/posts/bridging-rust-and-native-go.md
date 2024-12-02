+++
title = 'Bridging Rust and Native Go'
date = 2024-07-27T13:15:26+08:00
draft = false
aliases = ["/post/83397808-6849-4bc5-8a09-18765efdfa20"]
+++

Hello everyone, yuchanns here!<br>

I recently built something interesting and want to share it with you: introducing OpenDAL as a native Go binding.<br>

<b>TLDR;</b> I'll show you a feasible way to build native Go bindings from Rust and C components with the magic power of purego and libffi behinds.<br>

##  What is OpenDAL?

[Apache OpenDAL](https://opendal.apache.org/) is a Rust library that provides a unified data access layer. It offers a consistent API for accessing data across various storage services such as S3, Google Drive, and Dropbox.<br>

OpenDAL has a vision that helps users access data freely in <b>any language, any method, and any integration.</b> The vision has driven the community to build many other language bindings.<br>

We have already released bindings for Java, NodeJS, and Python. But we don't have a Go binding yet.<br>

## CGo is not Go

So what is the problem?<br>

[@Suyan](https://github.com/suyanhanx) told me that&nbsp;the Go binding is stalled because of the complexity involved in building and using it with CGo. 

Let's quickly review [9ef494d](https://github.com/apache/opendal/commit/9ef494d6df2e9a13c4e5b9b03bcb36ec30c0a7c0), the commit made before we updated the Go binding to fully support native functionality.

Since the Go binding is built on top of the C binding, let's build a C binding artifact first:<br>

```bash
cd bindings/c
make build
```

Then we need to add a file named <code class="inline-code">opendal_c.pc</code> with the content:<br>

```plaintext
libdir=/path/to/opendal/target/debug/
includedir=/path/to/opendal/bindings/c/include/

Name: opendal_c
Description: opendal c binding
Version:

Libs: -L${libdir} -lopendal_c
Cflags: -I${includedir}
```

After that, we could build the Go binding using:<br>

```bash
export PKG_CONFIG_PATH=/dir/of/opendal_c.pc
cd bindings/go
go build -tags dynamic .
```

Finally, we are here to run the tests with:<br>

```bash
expose LD_LIBRARY_PATH=/path/to/opendal/bindings/c/target/debug/
go test -tags dynamic .
```

As you can see, there are 4 tedious manual operations required before we can integrate with OpenDAL, which goes against Go's package management approach.

Making such a tradeoff is not worth it. There is no way to promote OpenDAL to the Go native community in this manner. No one is interested in maintaining it, and even if it is built, users can't <code class="inline-code">go get</code> the binding in actuality! After all, they've said:<br>

> CGo is not Go.

## Calling Rust without CGo

I started thinking: isn't there a way to call Rust purely and directly from Go?<br>

The answer is Yes. I did a lot of online searching and then picked up an interesting idea from this post [RustGo: Calling Rust from Go with near-zero overhead](https://words.filippo.io/rustgo/).<br>

In short, the idea is to link constrained Rust code and call it within a layer of glue from Go.<br>

It is brilliant, you can check it out if you like. The major concern is that it relies on some glue of assembly and it is too complicated to me. Imagine that you have to write a bunch of ASM for each method and multiply each platform, that is insanity:<br>

```plaintext
TEXT ·ScalarBaseMult(SB), 0, $16384-16
	MOVQ dst+0(FP), DI
	MOVQ in+8(FP), SI

	MOVQ SP, BX
	ADDQ $16384, SP
	ANDQ $~15, SP

	MOVQ ·_scalar_base_mult(SB), AX
	CALL AX

	MOVQ BX, SP
	RET
```

Forget it. 

The second idea is [purego](https://github.com/ebitengine/purego). It was created by Ebitengine and aims to support Linux, macOS, Windows, FreeBSD, and architectures including amd64 and arm64.<br>

It claims that we can call C functions from Go without CGo, which means that cross-compilation is deadly simple, and our users can easily fetch the binding with only one directive <code class="inline-code">go get</code>.<br>

Let's take a quick review of the example:<br>

```go
package main

import (
	"fmt"
	"runtime"

	"github.com/ebitengine/purego"
)

func getSystemLibrary() string {
	switch runtime.GOOS {
	case "darwin":
		return "/usr/lib/libSystem.B.dylib"
	case "linux":
		return "libc.so.6"
	default:
		panic(fmt.Errorf("GOOS=%s is not supported", runtime.GOOS))
	}
}

func main() {
	libc, err := purego.Dlopen(getSystemLibrary(), purego.RTLD_NOW|purego.RTLD_GLOBAL)
	if err != nil {
		panic(err)
	}
	var puts func(string)
	purego.RegisterLibFunc(&puts, libc, "puts")
	puts("Calling C from Go without Cgo!")
}
```

Well, it is not directly, but still purely. All we need is a shared object(<code class="inline-code">*.so</code>) based on our C-binding artifacts.

I can't wait to implement the binding right now!<br>

##  Trouble with structures

Soon I encountered problems.

The real world shows us that purego does not support structures as return values, while the primary C function I need to call is <code class="inline-code">opendal_operator_new</code>, which returns a structure <code class="inline-code">opendal_operator</code>.<br>

I reviewed the examples several times, including a slightly complicated window demo. The result shows that structure values are supported only by the Darwin platform and as an experimental feature.<br>

It looks like we're heading back into a stalemate.

Suddenly, a slightly less-than-sane idea flashed out of my mind.<br>

As well known, compilers for high-level languages generate code that follows certain calling conventions so that programs can call foreign functions by the bridge of interface. 

That is what [libffi](https://github.com/libffi/libffi) aims to provide.<br>

The libffi has been ported to many platforms and covers all we need.<br>

How about wrapping libffi with purego and calling our C-binding over the so-called purego-libffi?<br>

Yes, it is possible. And there is already someone who did it. 

Hello community, allow me to present you [JupiterRider/ffi](https://github.com/JupiterRider/ffi).<br>

##  Bridging Rust and Go worlds

I built a [POC](https://github.com/yuchanns/opendal) in less than half of a day. Later I submitted an [issue](https://github.com/apache/opendal/issues/4848) with the OpenDAL community.<br>

![](https://oss.yuchanns.xyz/images/image_c1c5e0f7-a989-474f-8997-3f111fa08cfc.png)

With the magic combination of purego + libbfi, we can easily outline calling methods based on the signature of C-binding functions. Take <code class="inline-code">opendal_operator_new&nbsp; </code>for example:<br>

```c
// C-binding signature
struct opendal_result_operator_new opendal_operator_new(const char *scheme,
                                                        const struct opendal_operator_options *options);
struct opendal_operator_options *opendal_operator_options_new(void);

typedef struct opendal_operator_options {
  struct HashMap_String__String *inner;
} opendal_operator_options;

typedef struct opendal_result_operator_new {
  struct opendal_operator *op;
  struct opendal_error *error;
} opendal_result_operator_new;

```

The function returns a structure named <code class="inline-code">opendal_result_operator_new</code>. So we can construct a Go variable to represent it with <code class="inline-code">ffi.Type</code>:<br>

```go
var (
	typeResultOperatorNew = ffi.Type{
		Type: ffi.Struct,
		Elements: &[]*ffi.Type{
			&ffi.TypePointer,
			&ffi.TypePointer,
			nil,
		}[0],
	}
)
```

You may notice that there are two fields inside the C structure, but we won't construct typed variables for them as they are just pointers.<br>

We are going to use the structure with the function:<br>

```go
func NewOperator(name string, opts *OperatorOptions) (*Operator, error) {
	var cif ffi.Cif
	if status := ffi.PrepCif(&cif, ffi.DefaultAbi, 2, &TypeResultOperatorNew, &ffi.TypePointer, &ffi.TypePointer); status != ffi.OK {
		return nil, errors.New(status.String())
	}
	sym, _ := purego.Dlsym(libopendal, "opendal_operator_new")
	fn := func(name string, opts OperatorOptions) (*ResultOperatorNew, error) {
		byteName, err := unix.BytePtrFromString(name)
		if err != nil {
			return nil, err
		}
		var result ResultOperatorNew
		ffi.Call(&cif, sym, unsafe.Pointer(&result), unsafe.Pointer(&byteName), unsafe.Pointer(&opts))
		return &result, nil
	}
	result, _ := fn(name, *opts)
	return result.op, nil
}

type ResultOperatorNew struct {
	op    *Operator
	error *Error
}

type Operator struct {
	ptr uintptr
}
```

Although we have ignored some error handling, this is roughly what it should be.

As long as we specify the variable correctly defined the respective C struct, we will fetch the return value with a similar Go structure <code class="inline-code">ResultOperatorNew</code>.

Now we are able to use it with <code class="inline-code">CGO_ENABLED=0</code>.<br>

That's all there is. The bridge between Rust and native Go has been established in this way. The rest of the work remains straightforward and simple. 

Soon, we'll have a fully functional Go-binding to leverage the power of OpenDAL to Go. Stay tuned!<br>

##  Distribution and benchmark

Things are not done yet.<br>

As far as I am concerned, distributing the shared object continues to be a significant challenge for maintainers. Although we can embed shared objects into Go files, the C-binding artifacts are too large for a Go library. The default features contain 15 services and are up to 12.4M after release!<br>

We managed to reduce the default services to only one and used zstd for compression. Now the size is minified to 400K~2M for each service.<br>

Besides, we created a [repo](https://github.com/apache/opendal-go-services) to serve these pre-build Go-binding services.<br>

Keep in mind that [apache/opendal-go-services](https://github.com/apache/opendal-go-services) is optional, users can build their own artifacts based on their conditions and features.<br>

Furthermore, I've created [a benchmark test](https://github.com/apache/opendal/blob/main/bindings/go/tests/behavior_tests/benchmark_test.go) to satisfy some curiosity. It compares native Go (<code class="inline-code">github.com/apache/opendal/bindings/go</code>) and CGo (<code class="inline-code">pkg: opendal.apache.org/go</code>) in reading and writing with memory service.<br>

```plaintext
benchstat old.txt new.txt
goos: linux
goarch: arm64
pkg: github.com/apache/opendal/bindings/go
               │   new.txt    │
               │    sec/op    │
Write4KiB-10     2.844µ ± ∞ ¹
Write256KiB-10   10.09µ ± ∞ ¹
Write4MiB-10     99.16µ ± ∞ ¹
Write16MiB-10    658.2µ ± ∞ ¹
Read4KiB-10      6.387µ ± ∞ ¹
Read256KiB-10    82.70µ ± ∞ ¹
Read4MiB-10      1.228m ± ∞ ¹
Read16MiB-10     3.617m ± ∞ ¹
geomean          90.23µ
¹ need >= 6 samples for confidence interval at level 0.95

pkg: opendal.apache.org/go
               │   old.txt    │
               │    sec/op    │
Write4KiB-10     4.240µ ± ∞ ¹
Write256KiB-10   10.11µ ± ∞ ¹
Write4MiB-10     89.58µ ± ∞ ¹
Write16MiB-10    646.2µ ± ∞ ¹
Read4KiB-10      20.94µ ± ∞ ¹
Read256KiB-10    132.7µ ± ∞ ¹
Read4MiB-10      1.847m ± ∞ ¹
Read16MiB-10     6.305m ± ∞ ¹
geomean          129.7µ
¹ need >= 6 samples for confidence interval at level 0.95
```

Wow, I have to say it's a pleasant surprise!<br>

##  What's next

I've created [a tracking issue](https://github.com/apache/opendal/issues/4892) for Go-binding and feel free to pick up one. Sooner we will release the first version for <b>opendal-go</b>. And even now, you can have a taste with <code class="inline-code">go get</code>!<br>

```bash
go get github.com/apache/opendal/bindings/go
go get github.com/apache/opendal-go-services/memory
```

The wrapping of libffi with purego now only supports Linux and BSD, but [@Xuanwo](https://github.com/Xuanwo) and I have [a discussion](https://github.com/JupiterRider/ffi/issues/3) about the support of Windows and macOS with the author [@JupiterRider](https://github.com/JupiterRider). 

This is the beauty of Open Source! By closely collaborating with both upstream and downstream, together we can make things happen!

