export default function TrainingError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="mb-6 rounded border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
    >
      {message}
    </div>
  )
}
