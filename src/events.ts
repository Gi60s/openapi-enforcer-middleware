import Debug from 'debug'

export type types = 'error' | 'warning'

const debug = Debug('openapi-enforcer-middleware:events')
const handlers: { [key: string]: Array<Function> } = {}

export function emit (type: types, ...args: Array<any>) {
    debug('Event emitted: ' + type, ...args)
    if (handlers[type]) {
        process.nextTick(() => {
            handlers[type].forEach(f => {
                f(...args)
            })
        })
    }
}

export function on (type: types, handler: Function) {
    if (!handlers[type]) handlers[type] = []
    handlers[type].push(handler)
    debug('Subscribed to event: ' + type + ' ' + handler.toString())
}