const APP_LOG_PREFIX = 'BiteRoll'

function write(level, event, fields = {}) {
    const payload = {
        event,
        timestamp: new Date().toISOString(),
        ...fields,
    }

    console[level](`[${APP_LOG_PREFIX}]`, payload)
}

export function logInfo(event, fields) {
    write('info', event, fields)
}

export function logWarn(event, fields) {
    write('warn', event, fields)
}

export function logError(event, fields) {
    write('error', event, fields)
}
