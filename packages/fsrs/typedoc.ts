import { Application, JSX } from 'typedoc'

const generator = async () => {
  // Application.bootstrap also exists, which will not load plugins
  // Also accepts an array of option readers if you want to disable
  // TypeDoc's tsconfig.json/package.json/typedoc.json option readers
  const app = await Application.bootstrapWithPlugins({
    name: 'TS-FSRS',
    titleLink: 'https://open-spaced-repetition.github.io/ts-fsrs/',
    entryPoints: ['./src/index.ts'],
    plugin: ['typedoc-plugin-extras'],
    out: '../../docs',
    navigationLinks: {
      Docs: 'https://open-spaced-repetition.github.io/ts-fsrs/',
      GitHub: 'https://github.com/open-spaced-repetition/ts-fsrs',
    },
    visibilityFilters: {
      protected: false,
      private: false,
      inherited: false,
      external: false,
    },
    exclude: ['__tests__', 'dist'],
  })
  const project = await app.convert()

  // https://github.com/TypeStrong/typedoc/issues/1799
  app.renderer.hooks.on('head.end', () => {
    return JSX.createElement(
      JSX.Fragment,
      null,
      JSX.createElement(
        'link',
        {
          rel: 'stylesheet',
          href: 'https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.min.css',
          integrity:
            'sha384-R4558gYOUz8mP9YWpZJjofhk+zx0AS11p36HnD2ZKj/6JR5z27gSSULCNHIRReVs',
          crossorigin: 'anonymous',
        },
        JSX.createElement('script', {
          defer: true,
          src: 'https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.min.js',
          integrity:
            'sha384-z1fJDqw8ZApjGO3/unPWUPsIymfsJmyrDVWC8Tv/a1HeOtGmkwNd/7xUS0Xcnvsx',
          crossorigin: 'anonymous',
        }),
        JSX.createElement('script', {
          defer: true,
          src: 'https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/contrib/auto-render.min.js',
          integrity:
            'sha384-+XBljXPPiv+OzfbB3cVmLHf4hdUFHlWNZN5spNQ7rmHTXpd7WvJum6fIACpNNfIR',
          crossorigin: 'anonymous',
          onload: 'renderMathInElement(document.body);',
        })
      )
    )
  })

  if (project) {
    const outputDir = '../../docs'
    // Generate HTML rendered docs
    await app.generateDocs(project, outputDir)
  }
  process.exit(0)
}

generator()
