'use client'

import type {
  SupportWidgetScriptAttributeValue,
  SupportWidgetScriptConfig,
} from '@/lib/support-widget-scripts'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'
import {
  isSupportWidgetScriptEnabledOnPathname,
  parseSupportWidgetScriptTags,
} from '@/lib/support-widget-scripts'

interface SiteSupportWidgetScriptsProps {
  locale: string
  scripts: SupportWidgetScriptConfig[]
}

interface SupportWidgetWindow extends Window {
  __supportWidgetExecutedSnippets?: Set<string>
}

function stripLocalePrefix(pathname: string | null, locale: string) {
  if (!pathname) {
    return pathname
  }

  const localePrefix = `/${locale}`
  if (pathname === localePrefix) {
    return '/'
  }

  if (pathname.startsWith(`${localePrefix}/`)) {
    return pathname.slice(localePrefix.length)
  }

  return pathname
}

function resolveDomAttributeName(attributeName: string) {
  switch (attributeName) {
    case 'crossOrigin':
      return 'crossorigin'
    case 'fetchPriority':
      return 'fetchpriority'
    case 'noModule':
      return 'nomodule'
    case 'referrerPolicy':
      return 'referrerpolicy'
    default:
      return attributeName
  }
}

function applyScriptAttribute(
  scriptElement: HTMLScriptElement,
  attributeName: string,
  attributeValue: SupportWidgetScriptAttributeValue,
) {
  const domAttributeName = resolveDomAttributeName(attributeName)

  if (attributeValue === true) {
    scriptElement.setAttribute(domAttributeName, '')

    if (attributeName === 'async') {
      scriptElement.async = true
    }
    else if (attributeName === 'defer') {
      scriptElement.defer = true
    }
    else if (attributeName === 'noModule') {
      scriptElement.noModule = true
    }

    return
  }

  scriptElement.setAttribute(domAttributeName, attributeValue)

  if (attributeName === 'src') {
    scriptElement.src = attributeValue
  }
  else if (attributeName === 'crossOrigin') {
    scriptElement.crossOrigin = attributeValue
  }
  else if (attributeName === 'referrerPolicy') {
    scriptElement.referrerPolicy = attributeValue
  }
  else if (attributeName === 'fetchPriority') {
    scriptElement.fetchPriority = attributeValue as HTMLScriptElement['fetchPriority']
  }
  else if (attributeName === 'type') {
    scriptElement.type = attributeValue
  }
}

function getSupportWidgetExecutionRegistry() {
  const supportWidgetWindow = window as SupportWidgetWindow

  if (!supportWidgetWindow.__supportWidgetExecutedSnippets) {
    supportWidgetWindow.__supportWidgetExecutedSnippets = new Set<string>()
  }

  return supportWidgetWindow.__supportWidgetExecutedSnippets
}

export default function SiteSupportWidgetScripts({ locale, scripts }: SiteSupportWidgetScriptsProps) {
  const pathname = usePathname()
  const localizedPathname = useMemo(() => stripLocalePrefix(pathname, locale), [locale, pathname])
  const activeScripts = useMemo(
    () => scripts.filter(script => isSupportWidgetScriptEnabledOnPathname(script, localizedPathname)),
    [localizedPathname, scripts],
  )
  const activeScriptSignature = useMemo(
    () => activeScripts.map(script => `${script.name}\u0000${script.snippet}`).sort().join('\u0001'),
    [activeScripts],
  )
  const previousActiveScriptSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    const previousActiveScriptSignature = previousActiveScriptSignatureRef.current
    previousActiveScriptSignatureRef.current = activeScriptSignature

    if (previousActiveScriptSignature === null) {
      return
    }

    if (previousActiveScriptSignature === activeScriptSignature) {
      return
    }

    window.location.reload()
  }, [activeScriptSignature])

  useEffect(() => {
    if (activeScripts.length === 0) {
      return
    }

    // Third-party widgets are not reliably reversible, so treat each snippet as a one-time bootstrap.
    const executionRegistry = getSupportWidgetExecutionRegistry()

    for (const script of activeScripts) {
      const executionKey = script.snippet.trim()
      if (executionRegistry.has(executionKey)) {
        continue
      }

      const parsedTags = parseSupportWidgetScriptTags(script.snippet)
      const appendedScriptElements: HTMLScriptElement[] = []

      try {
        for (const parsedTag of parsedTags) {
          const scriptElement = document.createElement('script')
          scriptElement.setAttribute('data-support-widget-script', script.name)

          let hasAsyncAttribute = false
          let hasDeferAttribute = false
          let hasSrcAttribute = false

          for (const [attributeName, attributeValue] of Object.entries(parsedTag.attributes)) {
            if (attributeName === 'async') {
              hasAsyncAttribute = true
            }
            else if (attributeName === 'defer') {
              hasDeferAttribute = true
            }
            else if (attributeName === 'src') {
              hasSrcAttribute = true
            }

            applyScriptAttribute(scriptElement, attributeName, attributeValue)
          }

          if (parsedTag.content) {
            scriptElement.text = parsedTag.content
          }

          if (hasSrcAttribute && !hasAsyncAttribute && !hasDeferAttribute) {
            scriptElement.async = false
          }

          document.body.appendChild(scriptElement)
          appendedScriptElements.push(scriptElement)
        }
      }
      catch (error) {
        for (const scriptElement of appendedScriptElements) {
          scriptElement.remove()
        }

        throw error
      }

      executionRegistry.add(executionKey)
    }
  }, [activeScripts])

  return null
}
