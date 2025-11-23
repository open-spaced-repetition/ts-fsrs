import ClientTraining from './components/ClientTraining'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            FSRS Parameter Optimization
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Train FSRS parameters using client-side processing
          </p>
        </header>

        {/* Content Area */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
          <ClientTraining />
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Powered by{' '}
            <a
              href="https://github.com/open-spaced-repetition/ts-fsrs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              TS-FSRS
            </a>{' '}
            and{' '}
            <a
              href="https://github.com/open-spaced-repetition/fsrs-rs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              FSRS-RS
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App
