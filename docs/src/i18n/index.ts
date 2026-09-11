import { readFileSync } from 'node:fs'
import enUSMessages from './en-US.json'
import jaJPMessages from './ja-JP.json'
import zhCNMessages from './zh-CN.json'
import zhTWMessages from './zh-TW.json'

export const I18N_LOCALES = ['en-US', 'zh-CN', 'zh-TW', 'ja-JP'] as const

export type I18nLocale = (typeof I18N_LOCALES)[number]

type MessageCatalog = Record<string, string>
type KeyDifference<
  Reference extends MessageCatalog,
  Candidate extends MessageCatalog,
> =
  | Exclude<keyof Reference, keyof Candidate>
  | Exclude<keyof Candidate, keyof Reference>
type CatalogWithSameKeys<
  Reference extends MessageCatalog,
  Candidate extends MessageCatalog,
> = [KeyDifference<Reference, Candidate>] extends [never] ? Candidate : never

export const messagesByLocale = {
  'en-US': enUSMessages,
  'zh-CN': zhCNMessages,
  'zh-TW': zhTWMessages,
  'ja-JP': jaJPMessages,
} satisfies {
  'en-US': typeof enUSMessages
  'zh-CN': CatalogWithSameKeys<typeof enUSMessages, typeof zhCNMessages>
  'zh-TW': CatalogWithSameKeys<typeof enUSMessages, typeof zhTWMessages>
  'ja-JP': CatalogWithSameKeys<typeof enUSMessages, typeof jaJPMessages>
}

type I18nSource = Record<string, Record<string, string>>

// Rspress 2.0.19 ships its built-in catalog under base-language keys. The
// returned catalog contains only the site's full BCP 47 runtime locales.
const RSPRESS_BUILTIN_CATALOG_LOCALES = {
  'en-US': 'en',
  'zh-CN': 'zh',
  'zh-TW': 'en',
  'ja-JP': 'ja',
} as const satisfies Record<I18nLocale, string>

const ZH_TW_RSPRESS_MESSAGES: Readonly<Record<string, string>> = {
  languagesText: '語言',
  themeText: '主題',
  versionsText: '版本',
  menuTitle: '選單',
  outlineTitle: '目錄',
  scrollToTopText: '回到頂端',
  lastUpdatedText: '最後更新於',
  lastUpdatedAuthorText: '作者',
  prevPageText: '上一頁',
  nextPageText: '下一頁',
  sourceCodeText: '原始碼',
  searchPlaceholderText: '搜尋',
  searchPanelCancelText: '取消',
  searchNoResultsText: '找不到符合的結果',
  searchSuggestedQueryText: '請嘗試搜尋其他關鍵字',
  'overview.filterNameText': '篩選',
  'overview.filterPlaceholderText': '搜尋 API',
  'overview.filterNoResultText': '找不到符合的 API',
  openInText: '在 {{name}} 中開啟',
  copyMarkdownText: '複製 Markdown',
  copyMarkdownLinkText: '複製 Markdown 連結',
  editLinkText: '編輯此頁面',
  codeButtonGroupCopyButtonText: '複製程式碼',
  codeButtonGroupWrapButtonText: '切換程式碼換行',
  notFoundText: '找不到頁面',
  takeMeHomeText: '返回首頁',
  promptCopyText: '複製提示詞',
  promptCopiedText: '已複製',
  promptExpandText: '展開',
  promptCollapseText: '收合',
}

function requireMessage(
  key: string,
  locale: I18nLocale,
  messages: Record<string, string>
): string {
  const message =
    (locale === 'zh-TW' ? ZH_TW_RSPRESS_MESSAGES[key] : undefined) ??
    messages[locale] ??
    messages[RSPRESS_BUILTIN_CATALOG_LOCALES[locale]]
  if (typeof message !== 'string' || message.trim() === '') {
    throw new Error(`i18n key "${key}" has no text for locale "${locale}"`)
  }
  return message
}

// The dev server rebuilds virtual modules without re-evaluating this module, so
// the imported catalogs above would keep serving the text captured at startup.
// Reading from disk here makes every rebuild pick up edited messages; the
// imports remain the source of truth for the cross-locale key check.
function readCatalog(locale: I18nLocale): MessageCatalog {
  return JSON.parse(
    readFileSync(new URL(`./${locale}.json`, import.meta.url), 'utf8')
  ) as MessageCatalog
}

export function adaptI18nSource(source: I18nSource): I18nSource {
  const adapted: I18nSource = {}

  for (const [key, messages] of Object.entries(source)) {
    const translated: Record<string, string> = {}
    for (const locale of I18N_LOCALES) {
      translated[locale] = requireMessage(key, locale, messages)
    }
    adapted[key] = translated
  }

  for (const locale of I18N_LOCALES) {
    for (const [key, message] of Object.entries(readCatalog(locale))) {
      adapted[key] ??= {}
      const translated = adapted[key]
      translated[locale] = message
    }
  }

  return adapted
}
