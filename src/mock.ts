// @ts-ignore
import Enforcer from 'openapi-enforcer'
import Express from "express";
import * as I from './interfaces'
import path from 'path'
import { copy, errorFromException, initialized } from "./util2";

const enforcerVersion = require(path.resolve(path.dirname(require.resolve('openapi-enforcer')), 'package.json')).version
const ENFORCER_HEADER = 'x-openapi-enforcer'

export function getMockMode (req: Express.Request): I.MockMode | void {
    const { operation, options } = req.enforcer!
    const responseCodes = Object.keys(operation.responses)
    const mockHeaderKey = options.mockHeader!
    const mockQueryKey = options.mockQuery!
    if (req.query.hasOwnProperty(mockQueryKey)) {
        let value = req.query[mockQueryKey]
        if (Array.isArray(value)) value = value[0]
        return parseMockValue('query', responseCodes, String(value).toString())
    } else if (req.headers.hasOwnProperty(mockHeaderKey)) {
        let value = req.headers[mockHeaderKey]
        if (Array.isArray(value)) value = value[0]
        return parseMockValue('header', responseCodes, String(value).toString())
    }
}

// fallback mocking middleware - supports specifying response code, example, or schema derived value
export function mockHandler (req: Express.Request, res: Express.Response, next: Express.NextFunction, mock: I.MockMode) {
    const { accepts, openapi, operation, options } = req.enforcer!

    const version: number = openapi.swagger ? 2 : +/^(\d+)/.exec(openapi.openapi)![0]
    const exception = new Enforcer.Exception('Unable to generate mock response')
    exception.statusCode = 400

    let response
    if (operation.responses.hasOwnProperty(mock.statusCode)) response = operation.responses[mock.statusCode]

    function unableToMock (message: string, status: number) {
        if (options.handleBadRequest) {
            res.status(status)
            res.set('content-type', 'text/plain')
            res.send(message)
        } else {
            exception.message(message)
            exception.statusCode = status
            const err = errorFromException(exception)
            next(err)
        }
    }

    // if unable to make a mocked response then exit
    // if (!response) {
    //     unableToMock('Unable to generate mock response for status code: ' + mock.statusCode, 400)
    //     return
    // }

    // determine acceptable response content-types
    const [ contentTypes, acceptsError ] = accepts(mock.statusCode)
    if (acceptsError || contentTypes.length === 0) {
        if (acceptsError) {
            switch (acceptsError.code) {
                case 'NO_CODE': return unableToMock('Unable to mock response code. The spec does not define this response code: ' + mock.statusCode, 422)
                case 'NO_MATCH': return unableToMock('Not acceptable', 406)
                case 'NO_TYPES_SPECIFIED': return unableToMock('Unable to mock response. No content types are specified for response code: ' + mock.statusCode, 422)
            }
        }
        return unableToMock('Not acceptable', 406)
    }

    // version 2
    if (version === 2) {
        if (!mock.source || mock.source === 'example') {
            // to use content type specified example the produces must have example key
            if (response.hasOwnProperty('examples')) {
                const type = contentTypes[0]
                if (response.examples.hasOwnProperty(type)) {
                    res.status(+mock.statusCode)
                    return deserializeExample(
                        exception.nest('Unable to deserialize example'),
                        response.examples[type],
                        response.schema,
                        unableToMock,
                        example => {
                            res.set(ENFORCER_HEADER, 'mock: response example')
                            res.set('content-type', type)
                            res.enforcer!.send(example)
                        }
                    )
                }
            }

            // use schema example if set
            if (response.schema && response.schema.hasOwnProperty('example')) {
                res.status(+mock.statusCode)
                res.set(ENFORCER_HEADER, 'mock: schema example')
                res.set('content-type', contentTypes[0])
                return res.enforcer!.send(copy(response.schema.example))
            }

            if (mock.source) {
                return unableToMock('Cannot mock from example because no example exists for status code ' + mock.statusCode, 422)
            }
        }

        if (!mock.source || mock.source === 'random') {
            const schema = response.schema
            if (schema) {
                const [value, err, warning] = schema.random()
                if (err) {
                    return unableToMock(err.toString(), 422)
                }

                if (warning) {
                    return unableToMock(warning.toString(), 422)
                }

                res.status(+mock.statusCode)
                res.set(ENFORCER_HEADER, 'mock: schema example')
                res.set('content-type', contentTypes[0])

                return res.enforcer!.send(value)
            } else {
                return unableToMock('Unable to generate a random value when no schema associated with response', 422)
            }
        }

        // version 3
    } else if (version === 3) {
        const type = contentTypes[0]
        const content = response.content[type]

        if (!mock.source || mock.source === 'example') {
            // named example requested
            if (mock.name) {
                if (content.examples && content.examples.hasOwnProperty(mock.name) && content.examples[mock.name].hasOwnProperty('value')) {
                    res.status(+mock.statusCode)
                    return deserializeExample(
                        exception.nest('Unable to deserialize example: ' + mock.name),
                        content.examples[mock.name].value,
                        content.schema,
                        unableToMock,
                        example => {
                            res.set(ENFORCER_HEADER, 'mock: response example')
                            res.enforcer!.send(example)
                        }
                    )

                } else {
                    return unableToMock('There is no example value with the name specified: ' + mock.name, 422)
                }
            }

            // select from a named example
            const exampleNames = content.examples
                ? Object.keys(content.examples).filter(name => content.examples[name].hasOwnProperty('value'))
                : []
            if (content.examples && exampleNames.length > 0) {
                const index = Math.floor(Math.random() * exampleNames.length)
                res.status(+mock.statusCode)
                return deserializeExample(
                    exception.nest('Unable to deserialize example: ' + exampleNames[index]),
                    content.examples[exampleNames[index]].value,
                    content.schema,
                    unableToMock,
                    example => {
                        res.set(ENFORCER_HEADER, 'mock: response example')
                        return res.enforcer!.send(example)
                    }
                )
            }

            // select the example
            if (content.hasOwnProperty('example')) {
                res.status(+mock.statusCode)
                res.set(ENFORCER_HEADER, 'mock: response example')
                return res.enforcer!.send(copy(content.example))
            }

            // select schema example
            if (content.schema && content.schema.hasOwnProperty('example')) {
                res.status(+mock.statusCode)
                res.set(ENFORCER_HEADER, 'mock: response example')
                return res.enforcer!.send(copy(content.schema.example))
            }

            // unable to mock with requested source
            if (mock.source) {
                return unableToMock('A mock example is not defined for status code ' + mock.statusCode + '.', 422)
            }
        }

        if (!mock.source || mock.source === 'random') {
            const schema = response.content[type].schema
            if (schema) {
                const [ value, err, warning ] = schema.random()
                if (err) return unableToMock(err.toString(), 422)

                if (warning) return unableToMock(warning.toString(), 422)

                res.set('Content-Type', type)
                if (mock.statusCode !== 'default') res.status(+mock.statusCode)
                res.set(ENFORCER_HEADER, 'mock: random value')
                return res.enforcer!.send(value)
            } else {
                return unableToMock('Unable to generate a random value when no schema associated with response', 422)
            }
        }
    }
}

export function mockMiddleware (req: Express.Request, res: Express.Response, next: Express.NextFunction) {
    if (initialized(req, next)) {
        const {operation} = req.enforcer!
        const responseCodes = Object.keys(operation.responses)

        // call the mock handler
        mockHandler(req, res, next, {
            origin: 'fallback',
            source: '',
            specified: false,
            statusCode: responseCodes[0] || ''
        })
    }
}

function deserializeExample (exception: Enforcer.Exception, example: any, schema: any, unableToMock: (message: string, status: number) => void, callback: (example: any) => void): void {
    if (isWithinVersion('', '1.1.4')) {
        example = copy(example)
        if (schema) {
            const [ value, error ] = schema.deserialize(example)
            if (error) {
                exception.push(error)
                unableToMock(error.toString(), 422)
            } else {
                callback(value)
            }
        } else {
            callback(example)
        }
    } else if (isWithinVersion('1.1.5', '')) {
        callback(example)
    } else {
        throw Error('Unplanned enforcer version encountered')
    }
}

function isWithinVersion (versionLow: string, versionHigh: string): boolean {
    const [c1, c2, c3] = enforcerVersion.split('.').map((v: string): number => +v)
    if (versionLow) {
        const [l1, l2, l3] = versionLow.split('.').map(v => +v)
        if (c1 < l1) return false
        if (c1 === l1 && c2 < l2) return false
        if (c1 === l1 && c2 === l2 && c3 < l3) return false
    }
    if (versionHigh) {
        const [h1, h2, h3] = versionHigh.split('.').map(v => +v)
        if (c1 > h1) return false
        if (c1 === h1 && c2 > h2) return false
        if (c1 === h1 && c2 === h2 && c3 > h3) return false
    }
    return true
}

function parseMockValue (origin: 'fallback' | 'query' | 'header', responseCodes: Array<string>, value: string): I.MockMode {
    value = value.trim()
    const result: I.MockMode = {
        origin,
        source: '',
        specified: value !== '',
        statusCode: responseCodes[0] || ''
    }
    if (value.length) {
        const ar = value.split(',')
        if (ar.length > 0) result.statusCode = ar[0]
        if (ar.length > 1) result.source = <'implemented' | 'example' | 'random' | ''>ar[1]
        if (result.source === 'example' && ar.length > 2) result.name = ar[2]
    }
    return result
}