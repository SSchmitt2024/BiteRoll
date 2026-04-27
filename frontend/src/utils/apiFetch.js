import { logInfo, logWarn } from './logger.js'

const PRIMARY = import.meta.env.VITE_API_BASE_URL || ''
const FAILOVER = import.meta.env.VITE_API_FAILOVER_URL || ''
const TIMEOUT_MS = 8000

async function timedFetch(url, options) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        return await fetch(url, { ...options, signal: controller.signal })
    } finally {
        clearTimeout(id)
    }
}

export async function apiFetch(path, options = {}) {
    let primaryResponse
    try {
        primaryResponse = await timedFetch(PRIMARY + path, options)
        if (primaryResponse.status < 500) return primaryResponse
        logWarn('api_primary_5xx', { path, status: primaryResponse.status })
    } catch (err) {
        logWarn('api_primary_failed', { path, error: err.message })
        if (!FAILOVER) throw err
    }

    if (!FAILOVER) return primaryResponse

    logInfo('api_failover_attempt', { path, failoverRegion: 'us-west-2' })
    return timedFetch(FAILOVER + path, options)
}
