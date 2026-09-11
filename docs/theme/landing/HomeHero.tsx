import {
  type HomeHeroProps,
  HomeHero as OriginalHomeHero,
} from '@rspress/core/theme-original'
import { SchedulerWorkbench } from './SchedulerWorkbench'

export function HomeHero({ image: _image, ...props }: HomeHeroProps) {
  return <OriginalHomeHero {...props} image={<SchedulerWorkbench />} />
}
