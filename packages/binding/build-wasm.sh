# https://github.com/WebAssembly/wasi-sdk/releases
# tar -xvf wasi-sdk-27.0-arm64-macos.tar.gz -C $HOME
# mv $HOME/wasi-sdk-27.0-arm64-macos $HOME/.wasi-sdk

export WASI_SDK_PATH="$HOME/.wasi-sdk"
export EMNAPI_LINK_DIR=node_modules/.pnpm/emnapi@1.4.5/node_modules/emnapi/lib/wasm32-wasi-threads
export SETJMP_LINK_DIR=node_modules/.pnpm/wasm-sjlj@1.0.6/node_modules/wasm-sjlj/lib
export CARGO_TARGET_WASM32_WASI_PREVIEW1_THREADS_LINKER="$WASI_SDK_PATH/bin/wasm-ld"
export CARGO_TARGET_WASM32_WASIP1_THREADS_LINKER="$WASI_SDK_PATH/bin/wasm-ld"
export CARGO_TARGET_WASM32_WASIP2_LINKER="$WASI_SDK_PATH/bin/wasm-ld"
export TARGET_CC="$WASI_SDK_PATH/bin/clang"
export TARGET_CXX="$WASI_SDK_PATH/bin/clang++"
export TARGET_AR="$WASI_SDK_PATH/bin/ar"
export TARGET_RANLIB="$WASI_SDK_PATH/bin/ranlib"
export TARGET_LDFLAGS="$WASI_SDK_PATH/bin/wasm-ld --target=wasm32-wasi-threads"


export EMNAPI_RUNTIME=MT

export WASI_SYSROOT="$WASI_SDK_PATH/share/wasi-sysroot"


# export CRT1_REACTOR_O="$WASI_SYSROOT/lib/wasm32-wasip1-threads/crt1-reactor.o"

export CMAKE_BUILD_PARALLEL_LEVEL=2
export TARGET_CXXFLAGS="--target=wasm32-wasi-threads --sysroot=$WASI_SYSROOT -pthread -mllvm -wasm-enable-sjlj -lsetjmp"
export TARGET_CFLAGS="$TARGET_CXXFLAGS"


export NODE_NO_WARNINGS=1

# cargo build --target wasm32-wasip1-threads --release

pnpm run build:wasm