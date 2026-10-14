/**
 * Calls to the SAP Business Accelerator Hub sandbox (S/4HANA Cloud Public
 * Edition, OData V4). The sandbox is read-only for this app: every call
 * here is a GET.
 */
const ROOT = 'https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata4/sap'

export const SERVICES = {
  salesOrder: `${ROOT}/api_salesorder/srvd_a2x/sap/salesorder/0001`,
}

/** Set in .env.local (see .env.example). */
const API_KEY: string = import.meta.env.VITE_SAP_API_KEY ?? ''

export function odataUrl(service: string, path: string, params: Record<string, string | number> = {}): string {
  const query = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
  return `${service}/${path}${query ? `?${query}` : ''}`
}

export interface ODataList<T> {
  value: T[]
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  if (!API_KEY) throw new Error('No SAP API key is configured. Add VITE_SAP_API_KEY to .env.local (see .env.example).')
  let response: Response
  try {
    response = await fetch(url, { headers: { APIKey: API_KEY, Accept: 'application/json' }, signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new Error('Could not reach the SAP sandbox. Check the internet connection.', { cause: err })
  }
  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      detail = body.error?.message ?? body.fault?.faultstring ?? detail
    } catch {
      // The body is not JSON; keep the status text.
    }
    throw new Error(`SAP returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
  }
  return response.json() as Promise<T>
}
