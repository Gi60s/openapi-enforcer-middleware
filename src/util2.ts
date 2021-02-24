// @ts-ignore
import Enforcer from 'openapi-enforcer'
import Express from 'express'
import * as I from './interfaces'

interface OptionTemplate {
    defaults: {
        [key: string]: any
    }
    required: Array<string>
    validators: {
        [key: string]: (v: any) => string
    }
}

const extractValue = Enforcer.v3_0.Schema.extractValue // v2 and v3 extractValue is the same

export function copy (value: any): any {
    return copy2(value, new Map())
}

export function errorFromException (exception: any): I.StatusError {
    const err = <I.StatusError>Error(exception.toString())
    err.exception = exception
    if (exception.hasOwnProperty('statusCode')) err.statusCode = exception.statusCode
    return err
}

export function findEnforcerParentComponent(current: any, name: string): any {
    let data = current.enforcerData
    while (data) {
        data = data.parent
        if (data.result.constructor.name === name) return data.result
    }
}

export function handleRequestError (opts: I.MiddlewareOptions, error: I.StatusError, res: Express.Response, next: Express.NextFunction) {
    const statusCode = error.statusCode
    if (statusCode === 404) {
        if (opts.handleNotFound) {
            res.status(404)
            res.set('content-type', 'text/plain')
            res.send(error.toString())
        } else {
            next()
        }
    } else if (statusCode === 405) {
        if (opts.handleMethodNotAllowed) {
            res.status(405)
            res.set('content-type', 'text/plain')
            res.send(error.toString())
        } else {
            next()
        }
    } else if (!statusCode || statusCode < 500) {
        if (opts.handleBadRequest) {
            res.status(statusCode || 400)
            res.set('content-type', 'text/plain')
            res.send(error.toString())
        } else {
            next()
        }
    } else {
        next(errorFromException(error))
    }
}

export function initialized (req: Express.Request, next?: Express.NextFunction): boolean {
    if (!req.enforcer) {
        if (next) {
            next(new Error('Unable to perform operation. Remember to initialize the openapi-enforcer-middleware.'))
        }
        return false
    }
    return true
}

export function normalizeOptions<T> (options:T, template: OptionTemplate): T {
    // merge defaults, required, and validators
    const defaults = Object.assign({}, template.defaults)
    const required:string[] = template.required
    const validators = Object.assign({}, template.validators)

    // build value from passed in data
    const result: { [key: string]: any } = Object.assign({}, defaults, options || {})

    // check that all required properties are present
    required.forEach(key => {
        if (!(key in result)) throw Error('Missing required option: ' + key)
    })

    // run all validators
    Object.keys(validators).forEach(key => {
        if (result.hasOwnProperty(key)) {
            const error = validators![key](result[key])
            if (error) throw Error('Invalid option "' + key + '". ' + error + '. Received: ' + result[key])
        }
    })

    return <T>result
}

export function reqHasBody (req: any) {
    if (!req.hasOwnProperty('body')) return false
    return req.headers['transfer-encoding'] !== undefined ||
        (!isNaN(req.headers['content-length']) && req.headers['content-length'] > 0)
}

export function sender (opts: I.MiddlewareOptions, req: Express.Request, res: Express.Response, next: Express.NextFunction) {
    return function (this: I.MiddlewareRequestData, body: any) {
        const { openapi, operation } = req.enforcer!

        const code = res.statusCode || 200
        const headers = res.getHeaders()
        const v2 = openapi.hasOwnProperty('swagger')

        // if content type is not specified for openapi version >= 3 then derive it
        if (!headers['content-type'] && !v2) {
            const [ types ] = operation.getResponseContentTypeMatches(code, req.headers.accept || '*/*')
            if (types) {
                const type = types[0]
                res.set('content-type', type)
                headers['content-type'] = type
            }
        }

        const bodyValue = openapi.enforcerData.context.Schema.Value(body)
        const [ response, exception ] = operation.response(code, bodyValue, Object.assign({}, headers))
        if (exception) {
            res.status(500)
            if (opts.handleBadResponse) {
                const err = Error(exception.toString())
                console.error(err.stack)
                res.set('content-type', 'text/plain')
                res.send('Internal server error')
            } else {
                next(errorFromException(exception))
            }
            return
        }

        Object.keys(response.headers).forEach(header => res.set(header, extractValue(response.headers[header])))
        if (response.hasOwnProperty('body')) {
            const sendObject = response.schema && response.schema.type
                ? ['array', 'object'].indexOf(response.schema.type) !== -1
                : typeof response.body === 'object'
            const body = response.body === undefined ? '' : response.body
            res.send(sendObject ? body : String(body))
        } else {
            res.send()
        }
    }
}

export const optionValidators = {
    validatorQueryParams,
    validatorBoolean,
    validatorNonEmptyString,
    validatorString
}

function copy2 (value: any, map: Map<any, any>): any {
    const exists = map.get(value)
    if (exists) return exists

    if (Array.isArray(value)) {
        const result: any = []
        map.set(value, result)
        value.forEach(v => {
            result.push(copy2(v, map))
        })
        return result
    } else if (value && typeof value === 'object' && value.constructor.name === 'Object') {
        const result: any = {}
        map.set(value, result)
        Object.keys(value).forEach(key => {
            result[key] = copy2(value, map)
        })
        return result
    } else {
        return value
    }
}

function isArrayOf (value: any, type: string) {
    if (!Array.isArray(value)) return false
    const length = value.length
    for (let i = 0; i < length; i++) {
        const t = typeof value[i]
        if (t !== type) return false
    }
    return true
}

function validatorQueryParams (v: any): string {
    if (typeof v === 'boolean' || isArrayOf(v, 'string')) return ''
    return 'Expected a boolean or an array of strings.'
}

function validatorBoolean (v: any): string {
    return typeof v !== 'boolean' ? 'Expected a boolean' : ''
}

function validatorNonEmptyString (v: any): string {
    return (!v || typeof v !== 'string') ? 'Expected a non-empty string' : ''
}

function validatorString (v: any): string {
    return typeof v !== 'string' ? 'Expected a string' : ''
}