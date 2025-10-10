#!/usr/bin/env node

import { createRequire } from 'module'
import { dirname, resolve } from 'path'

const require = createRequire(import.meta.url)

function resolveDependency(packageName, subPath = '', optional = false) {
  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`, {
      paths: [process.cwd()],
    })
    const packageDir = dirname(packageJsonPath)
    return subPath ? resolve(packageDir, subPath) : packageDir
  } catch (error) {
    if (optional) {
      return null
    }
    console.error(`Error resolving ${packageName}:`, error.message)
    process.exit(1)
  }
}

const emnapiPath = resolveDependency('emnapi', 'lib/wasm32-wasi-threads')
const wasmSjljPath = resolveDependency('wasm-sjlj', 'lib', true)

console.log(`export EMNAPI_LINK_DIR="${emnapiPath}"`)
if (wasmSjljPath) {
  console.log(`export SETJMP_LINK_DIR="${wasmSjljPath}"`)
}
