/**
 * Creates a mock Response object suitable for returning from jest.fn() mocking of global.fetch.
 */
export function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: () => mockJsonResponse(body, status),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as Response;
}

/**
 * Creates a mock fetch function that responds to specific URL patterns.
 */
export function createRoutedFetch(
  routes: Record<string, (url: string, init?: RequestInit) => Response>
): jest.Mock {
  return jest.fn((url: string, init?: RequestInit) => {
    for (const [pattern, handler] of Object.entries(routes)) {
      if (url.includes(pattern)) {
        return Promise.resolve(handler(url, init));
      }
    }
    return Promise.resolve(mockJsonResponse({ error: 'Not found' }, 404));
  });
}
