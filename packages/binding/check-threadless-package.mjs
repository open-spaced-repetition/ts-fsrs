import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const rootDir = dirname(fileURLToPath(import.meta.url))
const threadedDir = join(rootDir, 'npm/wasm32-wasi')
const threadlessDir = join(rootDir, 'npm/wasm32-wasip1')

const rootExports = {
  './emnapi': ['browser', 'types', 'require', 'default'],
}
const threadlessSubpaths = ['./workerd', './wasm', './wasm.wasm']
const rootMetadata = new Set([
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'README_CN.md',
  'README_JA.md',
  'package.json',
])
const threadlessExports = ['.', ...threadlessSubpaths]
const nextStateRatings = ['again', 'hard', 'good', 'easy']
const threadlessLoaders = [
  'fsrs-binding.wasip1.cjs',
  'fsrs-binding.wasip1-browser.js',
  'fsrs-binding.wasip1-deferred.js',
]
const wasiDependencies = [
  '@open-spaced-repetition/binding-wasm32-wasi',
  '@open-spaced-repetition/binding-wasm32-wasip1',
]

function readPackageJson(packageDir) {
  return JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
}

function packFiles(packageDir) {
  const [{ files }] = JSON.parse(
    execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: packageDir,
      encoding: 'utf8',
    })
  )
  return new Set(files.map(({ path }) => path))
}

function assertPackageFiles(label, packageJson, tarballFiles) {
  assert(Array.isArray(packageJson.files), `${label} package has no files list`)
  for (const file of packageJson.files) {
    assert(tarballFiles.has(file), `${label} tarball is missing ${file}`)
  }
}

function assertRootPackage(packageJson, tarballFiles) {
  for (const subpath of threadlessSubpaths) {
    assert.equal(
      packageJson.exports?.[subpath],
      undefined,
      `Root package must not expose threadless entry ${subpath}`
    )
  }

  for (const [subpath, conditions] of Object.entries(rootExports)) {
    for (const condition of conditions) {
      const target = packageJson.exports?.[subpath]?.[condition]?.replace(
        /^\.\//,
        ''
      )
      assert(
        target?.startsWith('dist/') && tarballFiles.has(target),
        `Root package is missing ${subpath} ${condition} in dist: ${target}`
      )
    }
  }

  const misplacedFiles = [...tarballFiles].filter(
    (file) => !file.startsWith('dist/') && !rootMetadata.has(file)
  )
  assert.equal(
    misplacedFiles.length,
    0,
    `Root package contains files outside dist: ${misplacedFiles.join(', ')}`
  )

  const threadlessFiles = [...tarballFiles].filter(
    (file) =>
      file.startsWith('dist/fsrs-binding.wasip1') ||
      file.startsWith('dist/fsrs-binding.wasm32-wasip1')
  )
  assert.equal(
    threadlessFiles.length,
    0,
    `Root package contains threadless flavor files: ${threadlessFiles.join(', ')}`
  )

  const browserEntry = readFileSync(join(rootDir, 'dist/browser.js'), 'utf8')
  assert(
    browserEntry.includes('@open-spaced-repetition/binding-wasm32-wasi') &&
      !browserEntry.includes('@open-spaced-repetition/binding-wasm32-wasip1'),
    'Root browser entry must keep using the threaded WASI package'
  )

  for (const dependency of wasiDependencies) {
    assert(
      packageJson.optionalDependencies?.[dependency],
      `Root package is missing optional dependency ${dependency}`
    )
  }
}

function assertThreadlessPackage(packageJson, tarballFiles) {
  for (const subpath of threadlessExports) {
    assert(
      packageJson.exports?.[subpath],
      `Threadless package is missing export ${subpath}`
    )
  }
  assert(
    packageJson.cpu == null &&
      packageJson.os == null &&
      ![...tarballFiles].some((file) => file.includes('worker')),
    'Threadless package contains a platform or worker constraint'
  )
}

function assertThreadlessLoaders() {
  for (const file of threadlessLoaders) {
    const source = readFileSync(join(threadlessDir, file), 'utf8')
    assert(
      !/new\s+SharedArrayBuffer|new\s+Worker|shared:\s*true/.test(source),
      `Threadless loader contains a threaded path: ${file}`
    )
  }

  const workerdLoader = readFileSync(
    join(threadlessDir, 'fsrs-binding.wasip1-deferred.js'),
    'utf8'
  )
  assert(
    /new WebAssembly\.Memory\(\{\s*initial:\s*1024,/.test(workerdLoader) &&
      !/initial:\s*16384,/.test(workerdLoader),
    'Threadless workerd loader must use 1024 initial memory pages'
  )
}

function readWasm(path) {
  return new WebAssembly.Module(readFileSync(path))
}

function assertThreadlessWasm(label, wasmModule) {
  const threadedImports = WebAssembly.Module.imports(wasmModule).filter(
    ({ module: moduleName, name: importName }) =>
      importName.startsWith('pthread_') ||
      importName === '__wasi_init_tp' ||
      (moduleName === 'wasi' && importName === 'thread-spawn')
  )
  assert.equal(
    threadedImports.length,
    0,
    `${label} WASM contains threaded imports: ${threadedImports
      .map(({ name }) => name)
      .join(', ')}`
  )
}

/** Every flavor runs the same Rust, so every entry must agree bit for bit. */
function nextStatesSnapshot(label, FSRSBinding) {
  const states = new FSRSBinding().nextStates(null, 0.9, 0)
  return nextStateRatings.map((rating) => {
    const state = states[rating]
    assert(state != null, `${label} returned no ${rating} state`)
    return [
      rating,
      state.interval,
      state.memory.stability,
      state.memory.difficulty,
    ]
  })
}

function smokeTestThreadlessEntry() {
  const binding = require('@open-spaced-repetition/binding-wasm32-wasip1')
  return nextStatesSnapshot('Threadless default entry', binding.FSRSBinding)
}

function smokeTestThreadedEntry() {
  const binding = require('@open-spaced-repetition/binding-wasm32-wasi')
  return nextStatesSnapshot('Threaded default entry', binding.FSRSBinding)
}

async function smokeTestWorkerd(wasmModule) {
  const { createInstance } = await import(
    '@open-spaced-repetition/binding-wasm32-wasip1/workerd'
  )
  const instance = await createInstance(wasmModule)
  try {
    return nextStatesSnapshot(
      'Threadless workerd facade',
      instance.exports.FSRSBinding
    )
  } finally {
    await instance.dispose()
  }
}

const rootPackage = readPackageJson(rootDir)
const threadedPackage = readPackageJson(threadedDir)
const threadlessPackage = readPackageJson(threadlessDir)
const rootFiles = packFiles(rootDir)
const threadedFiles = packFiles(threadedDir)
const threadlessFiles = packFiles(threadlessDir)

assertRootPackage(rootPackage, rootFiles)
assertPackageFiles('Threaded', threadedPackage, threadedFiles)
assertPackageFiles('Threadless', threadlessPackage, threadlessFiles)
assertThreadlessPackage(threadlessPackage, threadlessFiles)
assertThreadlessLoaders()

const threadlessWasm = readWasm(
  join(threadlessDir, 'fsrs-binding.wasm32-wasip1.wasm')
)
assertThreadlessWasm('Threadless package', threadlessWasm)
const threadlessStates = smokeTestThreadlessEntry()
assert.deepEqual(
  await smokeTestWorkerd(threadlessWasm),
  threadlessStates,
  'Threadless workerd facade disagrees with the default entry'
)
assert.deepEqual(
  smokeTestThreadedEntry(),
  threadlessStates,
  'Threaded and threadless flavors disagree on nextStates'
)
