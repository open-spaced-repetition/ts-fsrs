extern crate napi_build;

// Three mutually exclusive build flavours:
//   * native (default)  : std threads, progress poller spawned inside the task
//   * `threaded_wasm`   : wasm32-wasip1-threads, threads via wasi-threads
//   * `threadless_wasm` : wasm32-wasip1, no threads at all
fn main() {
  println!("cargo:rustc-check-cfg=cfg(threaded_wasm)");
  println!("cargo:rustc-check-cfg=cfg(threadless_wasm)");
  match std::env::var("TARGET").as_deref() {
    Ok("wasm32-wasip1") => println!("cargo:rustc-cfg=threadless_wasm"),
    Ok(target) if target.starts_with("wasm32") => println!("cargo:rustc-cfg=threaded_wasm"),
    _ => {}
  }
  napi_build::setup();
}
