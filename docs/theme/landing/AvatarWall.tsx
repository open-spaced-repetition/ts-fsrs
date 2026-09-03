import { cn } from '@/utils/cn'

export type AvatarWallEntry = {
  readonly login: string
  readonly avatarUrl: string
  readonly linkUrl: string
  readonly title: string
}

type Props = {
  readonly entries: readonly AvatarWallEntry[]
}

const AVATAR_SIZE = 56

// Request a 2x image without discarding existing query parameters.
function sizedAvatar(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set('s', String(AVATAR_SIZE * 2))
    return parsed.toString()
  } catch {
    return url
  }
}

export function AvatarWall({ entries }: Props) {
  return (
    <ul className="m-0 flex list-none flex-wrap justify-center gap-2.5 p-0">
      {entries.map((entry) => (
        <li key={entry.login}>
          <a
            className={cn(
              'block rounded-full opacity-100 transition-opacity',
              'duration-200 hover:opacity-70',
              'focus-visible:outline-2 focus-visible:outline-offset-2',
              'focus-visible:outline-ring motion-reduce:transition-none'
            )}
            href={entry.linkUrl}
            rel="noreferrer"
            target="_blank"
            title={entry.title}
          >
            <img
              alt={entry.login}
              className="block size-14 rounded-full"
              height={AVATAR_SIZE}
              loading="lazy"
              src={sizedAvatar(entry.avatarUrl)}
              width={AVATAR_SIZE}
            />
          </a>
        </li>
      ))}
    </ul>
  )
}
