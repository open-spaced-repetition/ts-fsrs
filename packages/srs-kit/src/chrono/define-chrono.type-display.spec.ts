import path from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const packageRoot = path.resolve(import.meta.dirname, '../..')
const configPath = path.join(packageRoot, 'tsconfig.json')
const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  packageRoot
)

function createService() {
  const files = new Map(
    parsedConfig.fileNames.map((file) => [path.resolve(file), { version: '0' }])
  )

  return ts.createLanguageService({
    getScriptFileNames: () => Array.from(files.keys()),
    getScriptVersion: (file) => files.get(path.resolve(file))?.version ?? '0',
    getScriptSnapshot: (file) =>
      ts.sys.fileExists(file)
        ? ts.ScriptSnapshot.fromString(ts.sys.readFile(file) ?? '')
        : undefined,
    getCurrentDirectory: () => packageRoot,
    getCompilationSettings: () => parsedConfig.options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  })
}

function quickInfoAt(service: ts.LanguageService, rel: string, marker: string) {
  const fileName = path.join(packageRoot, rel)
  const source = ts.sys.readFile(fileName)

  if (!source) {
    throw new Error(`Missing source file: ${rel}`)
  }

  const markerStart = source.indexOf(marker)
  if (markerStart === -1) {
    throw new Error(`Missing marker "${marker}" in ${rel}`)
  }

  const info = service.getQuickInfoAtPosition(
    fileName,
    markerStart + marker.length - 1
  )

  if (!info) {
    throw new Error(`Missing quick info for "${marker}" in ${rel}`)
  }

  return ts.displayPartsToString(info.displayParts)
}

describe('defineChrono type display', () => {
  it('keeps chrono preset hovers readable', () => {
    const service = createService()
    const numeric = quickInfoAt(
      service,
      'src/chrono/presets/numeric/chrono.ts',
      'numericChrono'
    )
    const date = quickInfoAt(
      service,
      'src/chrono/presets/date/chrono.ts',
      'dateChrono'
    )
    const temporalInstant = quickInfoAt(
      service,
      'src/chrono/presets/temporal-instant/chrono.ts',
      'temporalInstantChrono'
    )

    expect(numeric).toBe(`const numericChrono: Chrono<{
    readonly time: SRSSchema<{
        input: unknown;
        output: number;
    }>;
    readonly fields: {};
}>`)

    expect(date).toBe(`const dateChrono: Chrono<{
    readonly time: SRSSchema<{
        input: Date;
        output: Date;
    }>;
    readonly fields: {
        readonly card: SRSSchema<{
            input: DateCardFields;
            output: DateRevlogFields;
        }>;
        readonly revlog: SRSSchema<{
            input: DateRevlogFields;
            output: DateRevlogFields;
        }>;
    };
}>`)

    expect(temporalInstant).toBe(`const temporalInstantChrono: Chrono<{
    readonly time: SRSSchema<{
        input: Temporal.Instant;
        output: Temporal.Instant;
    }>;
    readonly config: SRSSchema<{
        input: Partial<TemporalInstantConfig>;
        output: TemporalInstantConfig;
    }>;
    readonly fields: {
        readonly card: SRSSchema<{
            input: TemporalInstantCardFields;
            output: TemporalInstantRevlogFields;
        }>;
        readonly revlog: SRSSchema<{
            input: TemporalInstantRevlogFields;
            output: TemporalInstantRevlogFields;
        }>;
    };
}>`)
  }, 20_000)
})
