// @ts-ignore
import Enforcer from 'openapi-enforcer'
import Express from "express";
import * as I from './interfaces'
import path from 'path'
import { errorFromException, initialized } from "./util2";

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

export function mockHandler (req: Express.Request, res: Express.Response, next: Express.NextFunction, mock: I.MockMode) {
    const { openapi, operation, options } = req.enforcer!

    const version: number = openapi.swagger ? 2 : +/^(\d+)/.exec(openapi.openapi)![0]
    const exception = new Enforcer.Exception('Unable to generate mock response')
    exception.statusCode = 400

    let response
    if (operation.responses.hasOwnProperty(mock.statusCode)) response = operation.responses[mock.statusCode]

    // if a controller is provided then call it
    // if (!mock.source || mock.source === 'controller') {
    //     if (controller) {
    //         res.set(ENFORCER_HEADER, 'mock:controller')
    //         debug.controllers('executing mock controller')
    //         try {
    //             controller(req, res, next)
    //         } catch (err) {
    //             next(err)
    //         }
    //         return
    //     } else if (mock.source) {
    //         exception.message('A mock controller is not defined')
    //         return unableToMock(exception, next)
    //     }
    // }

    // if unable to make a mocked response then exit
    if (!response) {
        if (options.handleBadRequest) {
            res.status(400)
            res.set('content-type', 'text/plain')
            res.send('Unable to generate mock response for status code: ' + mock.statusCode)
        } else {
            exception.message('Unable to generate mock response for status code: ' + mock.statusCode)
            next(errorFromException(exception))
        }
        return
    }

    // version 2
    if (version === 2) {
        if (!mock.source || mock.source === 'example') {
            // to use content type specified example the produces must have example key
            if (response.hasOwnProperty('examples')) {
                const [ types ] = operation.getResponseContentTypeMatches(mock.statusCode, req.headers.accept || '*/*')
                if (types) {
                    const type = types[0]
                    if (response.examples.hasOwnProperty(type)) {
                        res.status(+mock.statusCode)
                        const example = deserializeExample(
                            exception.nest('Unable to deserialize example'),
                            response.examples[type],
                            response.schema,
                            next
                        )
                        res.set(ENFORCER_HEADER, 'mock: response example')
                        return res.send(example)
                    }
                }
            }

            // use schema example if set
            if (response.schema && response.schema.hasOwnProperty('example')) {
                res.status(+mock.statusCode)
                res.set(ENFORCER_HEADER, 'mock: schema example')
                return res.send(copy(response.schema.example))
            }

            if (mock.source) {
                exception.message('Cannot mock from example')
                return unableToMock(exception, next)
            }
        }

        if (!mock.source || mock.source === 'random') {
            const schema = response.schema
            if (schema) {
                const [value, err, warning] = schema.random()
                if (err) {
                    exception.push(err)
                    return unableToMock(exception, next)
                }

                if (warning) {
                    exception.push(warning)
                    return unableToMock(exception, next)
                }

                res.status(+mock.statusCode)
                res.set(ENFORCER_HEADER, 'mock: schema example')
                return res.send(value)
            } else {
                exception.message('No schema associated with response')
                return unableToMock(exception, next)
            }
        }

        // version 3
    } else if (version === 3) {
        const [ types, err ] = operation.getResponseContentTypeMatches(mock.statusCode, req.headers.accept || '*/*')

        // if no content type matches then no possible mocked response
        if (err) {
            exception.push(err)
            return unableToMock(exception, next)
        }
        const type = types[0]
        const content = response.content[type]

        if (!mock.source || mock.source === 'example') {
            // named example requested
            if (mock.name) {
                if (content.examples && content.examples.hasOwnProperty(mock.name) && content.examples[mock.name].hasOwnProperty('value')) {
                    res.status(+mock.statusCode)
                    const example = deserializeExample(
                        exception.nest('Unable to deserialize example: ' + mock.name),
                        content.examples[mock.name].value,
                        content.schema,
                        next
                    )
                    res.set(ENFORCER_HEADER, 'mock: response example')
                    return res.send(example)
                } else {
                    exception.message('There is no example value with the name specified: ' + mock.name)
                    return unableToMock(exception, next)
                }
            }

            // select from a named example
            const exampleNames = content.examples
                ? Object.keys(content.examples).filter(name => content.examples[name].hasOwnProperty('value'))
                : []
            if (content.examples && exampleNames.length > 0) {
                const index = Math.floor(Math.random() * exampleNames.length)
                res.status(+mock.statusCode)
                const example = deserializeExample(
                    exception.nest('Unable to deserialize example: ' + exampleNames[index]),
                    content.examples[exampleNames[index]].value,
                    content.schema,
                    next
                )
                res.set(ENFORCER_HEADER, 'mock: response example')
                return res.send(example)
            }

            // select the example
            if (content.hasOwnProperty('example')) {
                res.status(+mock.statusCode)
                res.set(ENFORCER_HEADER, 'mock: response example')
                return res.send(copy(content.example))
            }

            // select schema example
            if (content.schema && content.schema.hasOwnProperty('example')) {
                res.status(+mock.statusCode)
                res.set(ENFORCER_HEADER, 'mock: response example')
                return res.send(copy(content.schema.example))
            }

            // unable to mock with requested source
            if (mock.source) {
                exception.message('A mock example is not defined')
                return unableToMock(exception, next)
            }
        }

        if (!mock.source || mock.source === 'random') {
            const schema = response.content[type].schema
            if (schema) {
                const [ value, err, warning ] = schema.random()
                if (err) {
                    exception.push(err)
                    return unableToMock(exception, next)
                }

                if (warning) {
                    exception.push(warning)
                    return unableToMock(exception, next)
                }

                res.set('Content-Type', type)
                if (mock.statusCode !== 'default') res.status(+mock.statusCode)
                res.set(ENFORCER_HEADER, 'mock: random value')
                return res.send(value)
            } else {
                exception.message('No schema associated with response')
                return unableToMock(exception, next)
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
            origin: 'automatic',
            source: '',
            specified: false,
            statusCode: responseCodes[0] || ''
        })
    }
}


function copy (value: any): any {
    if (Array.isArray(value)) {
        return value.map(copy)
    } else if (value && typeof value === 'object') {
        const result: { [key: string]: any } = {}
        Object.keys(value).forEach(key => {
            result[key] = copy(value[key])
        })
        return result
    } else {
        return value
    }
}

function deserializeExample (exception: Enforcer.Exception, example: any, schema: any, next: Express.NextFunction) {
    if (isWithinVersion('', '1.1.4')) {
        example = copy(example)
        if (schema) {
            const [ value, error ] = schema.deserialize(example)
            if (error) {
                exception.push(error)
                return unableToMock(exception, next)
            } else {
                example = value
            }
        }
        return example
    } else if (isWithinVersion('1.1.5', '')) {
        return example
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

function parseMockValue (origin: string, responseCodes: Array<string>, value: string): I.MockMode {
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
        if (ar.length > 1) result.source = ar[1]
        if (result.source === 'example' && ar.length > 2) result.name = ar[2]
    }
    return result
}

function unableToMock (exception: any, next: Express.NextFunction) {
    exception.statusCode = 501
    const err = errorFromException(exception)
    next(err)
}