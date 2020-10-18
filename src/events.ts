
export type types = 'error' | 'warning'

const handlers: { [key: string]: Array<Function> } = {}

export function emit (type: types, ...args: any) {
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
}