const SCRIPT_TAG_PATTERN = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
const SCRIPT_ATTRIBUTE_PATTERN = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
const SUPPORT_WIDGET_SCRIPT_TAG_PATTERN = /<script\b/i
export const MAX_SUPPORT_WIDGET_SCRIPTS = 12
export const MAX_SUPPORT_WIDGET_SCRIPT_NAME_LENGTH = 80
export const MAX_SUPPORT_WIDGET_SCRIPT_SNIPPET_LENGTH = 20_000

export const SUPPORT_WIDGET_DISABLE_PAGE_OPTIONS = ['home', 'event', 'portfolio', 'admin'] as const
export type SupportWidgetDisablePage = typeof SUPPORT_WIDGET_DISABLE_PAGE_OPTIONS[number]
export type SupportWidgetPageBucket = SupportWidgetDisablePage | 'other'
export type SupportWidgetScriptAttributeValue = string | true

const SUPPORT_WIDGET_DISABLE_PAGE_SET = new Set<string>(SUPPORT_WIDGET_DISABLE_PAGE_OPTIONS)

export interface SupportWidgetScriptConfig {
  name: string
  snippet: string
  disabledOn: SupportWidgetDisablePage[]
}

export interface ParsedSupportWidgetScriptTag {
  id: string
  attributes: Record<string, SupportWidgetScriptAttributeValue>
  content: string | null
}

function normalizeAttributeName(name: string) {
  switch (name.toLowerCase()) {
    case 'crossorigin':
      return 'crossOrigin'
    case 'fetchpriority':
      return 'fetchPriority'
    case 'nomodule':
      return 'noModule'
    case 'referrerpolicy':
      return 'referrerPolicy'
    default:
      return name
  }
}

function parseScriptAttributes(rawAttributes: string) {
  const attributes: Record<string, SupportWidgetScriptAttributeValue> = {}
  SCRIPT_ATTRIBUTE_PATTERN.lastIndex = 0

  for (let match = SCRIPT_ATTRIBUTE_PATTERN.exec(rawAttributes); match; match = SCRIPT_ATTRIBUTE_PATTERN.exec(rawAttributes)) {
    const rawName = match[1]
    if (!rawName || rawName === '/') {
      continue
    }

    const value = match[2] ?? match[3] ?? match[4]
    attributes[normalizeAttributeName(rawName)] = value === undefined ? true : value
  }

  return attributes
}

function validateSupportWidgetSnippet(value: unknown, sourceLabel: string) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized) {
    return { value: null as string | null, error: `${sourceLabel} is required.` }
  }

  if (normalized.length > MAX_SUPPORT_WIDGET_SCRIPT_SNIPPET_LENGTH) {
    return {
      value: null as string | null,
      error: `${sourceLabel} must be at most ${MAX_SUPPORT_WIDGET_SCRIPT_SNIPPET_LENGTH.toLocaleString()} characters.`,
    }
  }

  if (normalized.includes('<') && !SUPPORT_WIDGET_SCRIPT_TAG_PATTERN.test(normalized)) {
    return {
      value: null as string | null,
      error: `${sourceLabel} must be raw JavaScript or a provider <script> snippet.`,
    }
  }

  return { value: normalized, error: null as string | null }
}

function normalizeSupportWidgetScriptName(value: unknown, sourceLabel: string) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized) {
    return { value: null as string | null, error: `${sourceLabel} is required.` }
  }

  if (normalized.length > MAX_SUPPORT_WIDGET_SCRIPT_NAME_LENGTH) {
    return {
      value: null as string | null,
      error: `${sourceLabel} must be at most ${MAX_SUPPORT_WIDGET_SCRIPT_NAME_LENGTH} characters.`,
    }
  }

  return { value: normalized, error: null as string | null }
}

function normalizeSupportWidgetDisabledOn(value: unknown, sourceLabel: string) {
  if (value === undefined || value === null) {
    return { value: [] as SupportWidgetDisablePage[], error: null as string | null }
  }

  if (!Array.isArray(value)) {
    return { value: [] as SupportWidgetDisablePage[], error: `${sourceLabel} is invalid.` }
  }

  const deduped: SupportWidgetDisablePage[] = []
  const seen = new Set<SupportWidgetDisablePage>()

  for (const entry of value) {
    if (typeof entry !== 'string') {
      return { value: [] as SupportWidgetDisablePage[], error: `${sourceLabel} is invalid.` }
    }

    if (!SUPPORT_WIDGET_DISABLE_PAGE_SET.has(entry)) {
      return { value: [] as SupportWidgetDisablePage[], error: `${sourceLabel} is invalid.` }
    }

    const normalizedEntry = entry as SupportWidgetDisablePage

    if (seen.has(normalizedEntry)) {
      continue
    }

    seen.add(normalizedEntry)
    deduped.push(normalizedEntry)
  }

  return { value: deduped, error: null as string | null }
}

function normalizeSupportWidgetScriptEntry(value: unknown, index: number) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { value: null as SupportWidgetScriptConfig | null, error: `Support widget script ${index + 1} is invalid.` }
  }

  const rawEntry = value as Record<string, unknown>
  const nameValidated = normalizeSupportWidgetScriptName(rawEntry.name, `Support widget script ${index + 1} name`)
  if (nameValidated.error) {
    return { value: null as SupportWidgetScriptConfig | null, error: nameValidated.error }
  }

  const snippetValidated = validateSupportWidgetSnippet(rawEntry.snippet, `Support widget script ${index + 1} snippet`)
  if (snippetValidated.error) {
    return { value: null as SupportWidgetScriptConfig | null, error: snippetValidated.error }
  }

  const disabledOnValidated = normalizeSupportWidgetDisabledOn(
    rawEntry.disabledOn,
    `Support widget script ${index + 1} disabled pages`,
  )
  if (disabledOnValidated.error) {
    return { value: null as SupportWidgetScriptConfig | null, error: disabledOnValidated.error }
  }

  return {
    value: {
      name: nameValidated.value!,
      snippet: snippetValidated.value!,
      disabledOn: disabledOnValidated.value,
    },
    error: null as string | null,
  }
}

export function serializeSupportWidgetScripts(scripts: SupportWidgetScriptConfig[]) {
  return scripts.length > 0 ? JSON.stringify(scripts) : ''
}

export function validateSupportWidgetScriptsJson(
  value: string | null | undefined,
  sourceLabel: string,
) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized) {
    return {
      value: [] as SupportWidgetScriptConfig[],
      valueJson: '',
      error: null as string | null,
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(normalized)
  }
  catch {
    return {
      value: null as SupportWidgetScriptConfig[] | null,
      valueJson: '',
      error: `${sourceLabel} must be valid JSON.`,
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      value: null as SupportWidgetScriptConfig[] | null,
      valueJson: '',
      error: `${sourceLabel} must be a list of scripts.`,
    }
  }

  if (parsed.length > MAX_SUPPORT_WIDGET_SCRIPTS) {
    return {
      value: null as SupportWidgetScriptConfig[] | null,
      valueJson: '',
      error: `${sourceLabel} must contain at most ${MAX_SUPPORT_WIDGET_SCRIPTS} scripts.`,
    }
  }

  const normalizedScripts: SupportWidgetScriptConfig[] = []
  const seenNames = new Set<string>()

  for (const [index, entry] of parsed.entries()) {
    const normalizedEntry = normalizeSupportWidgetScriptEntry(entry, index)
    if (normalizedEntry.error || !normalizedEntry.value) {
      return {
        value: null as SupportWidgetScriptConfig[] | null,
        valueJson: '',
        error: normalizedEntry.error ?? `${sourceLabel} is invalid.`,
      }
    }

    const nameKey = normalizedEntry.value.name.toLowerCase()
    if (seenNames.has(nameKey)) {
      return {
        value: null as SupportWidgetScriptConfig[] | null,
        valueJson: '',
        error: `${sourceLabel} contains duplicate script names.`,
      }
    }

    seenNames.add(nameKey)
    normalizedScripts.push(normalizedEntry.value)
  }

  return {
    value: normalizedScripts,
    valueJson: serializeSupportWidgetScripts(normalizedScripts),
    error: null as string | null,
  }
}

function normalizePathname(pathname: string | null | undefined) {
  if (!pathname) {
    return '/'
  }

  const normalized = pathname.trim()
  if (!normalized || normalized === '/') {
    return '/'
  }

  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}

export function resolveSupportWidgetPageBucket(pathname: string | null | undefined): SupportWidgetPageBucket {
  const normalizedPathname = normalizePathname(pathname)

  if (normalizedPathname === '/') {
    return 'home'
  }

  if (normalizedPathname === '/portfolio' || normalizedPathname.startsWith('/portfolio/')) {
    return 'portfolio'
  }

  if (normalizedPathname === '/admin' || normalizedPathname.startsWith('/admin/')) {
    return 'admin'
  }

  if (normalizedPathname.startsWith('/event/')) {
    return 'event'
  }

  return 'other'
}

export function isSupportWidgetScriptEnabledOnPathname(
  script: Pick<SupportWidgetScriptConfig, 'disabledOn'>,
  pathname: string | null | undefined,
) {
  const pageBucket = resolveSupportWidgetPageBucket(pathname)
  if (pageBucket === 'other') {
    return true
  }

  return !script.disabledOn.includes(pageBucket)
}

export function parseSupportWidgetScriptTags(snippet: string | null | undefined): ParsedSupportWidgetScriptTag[] {
  const normalized = typeof snippet === 'string' ? snippet.trim() : ''
  if (!normalized) {
    return []
  }

  if (!SUPPORT_WIDGET_SCRIPT_TAG_PATTERN.test(normalized)) {
    return [{
      id: 'support-widget-script-tag-0',
      attributes: {},
      content: normalized,
    }]
  }

  const scripts: ParsedSupportWidgetScriptTag[] = []
  SCRIPT_TAG_PATTERN.lastIndex = 0

  for (let match = SCRIPT_TAG_PATTERN.exec(normalized); match; match = SCRIPT_TAG_PATTERN.exec(normalized)) {
    const content = (match[2] ?? '').trim()
    scripts.push({
      id: `support-widget-script-tag-${scripts.length}`,
      attributes: parseScriptAttributes(match[1] ?? ''),
      content: content || null,
    })
  }

  return scripts
}
