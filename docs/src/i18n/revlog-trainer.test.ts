import { describe, expect, it } from 'vitest'
import { adaptI18nSource, I18N_LOCALES, messagesByLocale } from './index'

const englishMessages = messagesByLocale['en-US']
type MessageKey = keyof typeof englishMessages
const messageKeys = Object.keys(englishMessages) as MessageKey[]

function placeholders(message: string): string[] {
  return Array.from(
    message.matchAll(/\{\{(\w+)\}\}/g),
    ([, name]) => name
  ).sort()
}

describe('RevlogTrainer i18n messages', () => {
  it('provides the same complete, non-empty key set for every locale', () => {
    expect(Object.keys(messagesByLocale)).toEqual(I18N_LOCALES)

    for (const locale of I18N_LOCALES) {
      const messages = messagesByLocale[locale]
      expect(Object.keys(messages).sort(), locale).toEqual(
        [...messageKeys].sort()
      )
      for (const key of messageKeys) {
        expect(messages[key], `${key}/${locale}`).toEqual(expect.any(String))
        expect(messages[key].trim(), `${key}/${locale}`).not.toBe('')
      }
    }
  })

  it('declares the same parameter placeholders for every locale', () => {
    for (const key of messageKeys) {
      const expected = placeholders(englishMessages[key])
      for (const locale of I18N_LOCALES) {
        expect(
          placeholders(messagesByLocale[locale][key]),
          `${key}/${locale}`
        ).toEqual(expected)
      }
    }
  })

  it('adapts Rspress built-ins and custom messages to full BCP 47 locales', () => {
    const source = adaptI18nSource({
      menuTitle: {
        en: 'Menu',
        zh: '菜单',
        ja: 'メニュー',
      },
    })

    expect(source.menuTitle).toEqual({
      'en-US': 'Menu',
      'zh-CN': '菜单',
      'ja-JP': 'メニュー',
    })
    expect(source.menuTitle).not.toHaveProperty('en')
    expect(source.menuTitle).not.toHaveProperty('zh')
    expect(source.menuTitle).not.toHaveProperty('ja')

    for (const locale of I18N_LOCALES) {
      for (const key of messageKeys) {
        expect(source[key]?.[locale], `${key}/${locale}`).toBe(
          messagesByLocale[locale][key]
        )
      }
    }
  })

  it('rejects an incomplete Rspress source instead of falling back', () => {
    expect(() =>
      adaptI18nSource({
        menuTitle: {
          en: 'Menu',
          zh: '菜单',
        },
      })
    ).toThrow('i18n key "menuTitle" has no text for locale "ja-JP"')
  })
})
