'use client'

/* eslint-disable @next/next/no-css-tags -- Swagger CSS is an authenticated runtime asset. */

import Script from 'next/script'
import { useCallback, useEffect, useRef, useState } from 'react'

type SwaggerRequest = Record<string, unknown>
type SwaggerUIFactory = ((config: {
  deepLinking: boolean
  displayOperationId: boolean
  displayRequestDuration: boolean
  docExpansion: 'list'
  dom_id: string
  filter: boolean
  presets: unknown[]
  requestInterceptor: (request: SwaggerRequest) => SwaggerRequest
  supportedSubmitMethods: string[]
  url: string
  withCredentials: boolean
}) => unknown) & { presets: { apis: unknown } }

declare global {
  interface Window {
    SwaggerUIBundle?: SwaggerUIFactory
  }
}

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function csrfCookie() {
  const cookie = document.cookie
    .split('; ')
    .find(
      (entry) =>
        entry.startsWith('crm_csrf=') || entry.startsWith('__Host-crm_csrf='),
    )
  if (!cookie) return null
  const value = cookie.slice(cookie.indexOf('=') + 1)
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

function prepareRequest(request: SwaggerRequest) {
  if (typeof request.url !== 'string') {
    throw new Error('Swagger generated a request without a URL')
  }
  const target = new URL(request.url, window.location.origin)
  if (target.origin !== window.location.origin) {
    throw new Error('Swagger requests are restricted to the CRM origin')
  }

  request.credentials = 'same-origin'
  const method =
    typeof request.method === 'string' ? request.method.toUpperCase() : 'GET'
  if (unsafeMethods.has(method)) {
    const token = csrfCookie()
    if (token) {
      const headers =
        typeof request.headers === 'object' && request.headers
          ? request.headers
          : {}
      request.headers = { ...headers, 'X-CSRF-Token': token }
    }
  }
  return request
}

export function SwaggerDocs() {
  const root = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState(false)

  const initialize = useCallback(() => {
    if (!root.current || !window.SwaggerUIBundle) {
      setLoadError(true)
      return
    }

    root.current.replaceChildren()
    const SwaggerUIBundle = window.SwaggerUIBundle
    SwaggerUIBundle({
      deepLinking: true,
      displayOperationId: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      dom_id: '#swagger-ui',
      filter: true,
      presets: [SwaggerUIBundle.presets.apis],
      requestInterceptor: prepareRequest,
      supportedSubmitMethods: ['get', 'post'],
      url: '/api/v1/openapi.json',
      withCredentials: true,
    })
  }, [])

  useEffect(
    () => () => {
      root.current?.replaceChildren()
    },
    [],
  )

  return (
    <>
      <link href="/api/v1/swagger-assets/swagger-ui.css" rel="stylesheet" />
      <Script
        onError={() => setLoadError(true)}
        onReady={initialize}
        src="/api/v1/swagger-assets/swagger-ui-bundle.js"
        strategy="afterInteractive"
      />
      <div
        className="swagger-docs overflow-hidden rounded-xl border bg-white"
        id="swagger-ui"
        ref={root}
      >
        <p
          className="text-muted-foreground py-8 text-center text-sm"
          role="status"
        >
          {loadError
            ? 'API documentation could not be loaded.'
            : 'Loading API documentation…'}
        </p>
      </div>
    </>
  )
}
