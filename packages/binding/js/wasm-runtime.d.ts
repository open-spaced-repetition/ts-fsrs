// wasm-runtime re-exports these APIs but does not ship declarations.
declare module '@napi-rs/wasm-runtime' {
  export { instantiateNapiModule } from '@emnapi/core'
  export const emnapiAsyncWorkPlugin: import('@emnapi/core').PluginFactory
  export const emnapiTSFNPlugin: import('@emnapi/core').PluginFactory
  export const WASI: new (options: {
    version: 'preview1'
  }) => import('@emnapi/core').WASIInstance
}
