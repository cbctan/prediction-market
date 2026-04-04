import { describe, expect, it } from 'vitest'
import {
  isSupportWidgetScriptEnabledOnPathname,
  parseSupportWidgetScriptTags,
  resolveSupportWidgetPageBucket,
  validateSupportWidgetScriptsJson,
} from '@/lib/support-widget-scripts'

describe('support widget scripts helpers', () => {
  it('parses raw JavaScript into a single inline script tag entry', () => {
    const scripts = parseSupportWidgetScriptTags('window.CRISP_WEBSITE_ID = "site_123"')

    expect(scripts).toEqual([
      {
        id: 'support-widget-script-tag-0',
        attributes: {},
        content: 'window.CRISP_WEBSITE_ID = "site_123"',
      },
    ])
  })

  it('parses multiple script tags and preserves key attributes', () => {
    const scripts = parseSupportWidgetScriptTags(`
      <script>window.$crisp = [];</script>
      <script async src="https://client.crisp.chat/l.js" crossorigin="anonymous"></script>
    `)

    expect(scripts).toEqual([
      {
        id: 'support-widget-script-tag-0',
        attributes: {},
        content: 'window.$crisp = [];',
      },
      {
        id: 'support-widget-script-tag-1',
        attributes: {
          async: true,
          crossOrigin: 'anonymous',
          src: 'https://client.crisp.chat/l.js',
        },
        content: null,
      },
    ])
  })

  it('validates support widget scripts json and keeps disable rules', () => {
    const result = validateSupportWidgetScriptsJson(JSON.stringify([
      {
        name: 'Crisp',
        snippet: '<script>window.$crisp = [];</script>',
        disabledOn: ['admin', 'portfolio'],
      },
    ]), 'Custom javascript code')

    expect(result.error).toBeNull()
    expect(result.value).toEqual([
      {
        name: 'Crisp',
        snippet: '<script>window.$crisp = [];</script>',
        disabledOn: ['admin', 'portfolio'],
      },
    ])
  })

  it('rejects markup that is not raw JavaScript or a script snippet', () => {
    const result = validateSupportWidgetScriptsJson(JSON.stringify([
      {
        name: 'Broken',
        snippet: '<div>bad</div>',
        disabledOn: [],
      },
    ]), 'Custom javascript code')

    expect(result).toEqual({
      value: null,
      valueJson: '',
      error: 'Support widget script 1 snippet must be raw JavaScript or a provider <script> snippet.',
    })
  })

  it('maps pathname buckets and enables scripts only on allowed pages', () => {
    expect(resolveSupportWidgetPageBucket('/')).toBe('home')
    expect(resolveSupportWidgetPageBucket('/portfolio')).toBe('portfolio')
    expect(resolveSupportWidgetPageBucket('/admin/theme')).toBe('admin')
    expect(resolveSupportWidgetPageBucket('/event')).toBe('other')
    expect(resolveSupportWidgetPageBucket('/event/will-btc-rise')).toBe('event')

    expect(isSupportWidgetScriptEnabledOnPathname({
      disabledOn: ['admin'],
    }, '/admin')).toBe(false)
    expect(isSupportWidgetScriptEnabledOnPathname({
      disabledOn: ['event'],
    }, '/event/will-btc-rise')).toBe(false)
    expect(isSupportWidgetScriptEnabledOnPathname({
      disabledOn: ['portfolio'],
    }, '/')).toBe(true)
  })
})
