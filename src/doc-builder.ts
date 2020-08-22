
interface OMap<T> {
    [key: string]: T
}

export default class OpenAPIObject {
    openapi: OpenAPIObject
    version: number
    paths: OMap<PathObject>

    constructor (version: 2 | 3) {
        this.openapi = this
        this.version = version
        this.paths = {}
    }

    addPath (path: string): PathObject {
        if (!this.paths[path]) this.paths[path] = new PathObject(this)
        return this.paths[path]
    }

    build (): any {
        const context = this.openapi

        const result: any = {
            info: { title: '', version: '' },
            paths: {}
        }
        if (this.version === 2) {
            result.swagger = '2.0'
        } else {
            result.openapi = '3.0.0'
        }

        const paths = context.paths
        Object.keys(paths).forEach(pathKey => {
            const path = paths[pathKey]
            result.paths[pathKey] = path._.builder()
        })

        return result
    }
}

class PathObject {
    build: Function
    openapi: OpenAPIObject
    _: {
        builder: Function
        operations: OMap<OperationObject>
        parameters: Array<ParameterObject>
    }
    
    constructor (openapi: OpenAPIObject) {
        const context = this

        function builder (): any {
            const { parameters, operations } = context._
            const result: any = {}
            parameters.forEach(param => {
                if (!result.parameters) result.parameters = []
                result.parameters.push(param._.builder())
            })
            Object.keys(operations).forEach(method => {
                result[method] = operations[method]._.builder()
            })
            return result
        }

        this.build = openapi.build
        this.openapi = openapi
        this._ = {
            builder,
            operations: {},
            parameters: []
        }
    }

    addOperation (method: string): OperationObject {
        const operations = this._.operations
        if (!operations[method]) {
            operations[method] = new OperationObject(this)
        }
        return operations[method]
    }

    addParameter (name: string, at: string, schema: any): PathObject {
        const parameters = this._.parameters
        const found = parameters.find((v: ParameterObject) => v.name === name && v.at === at)
        if (found) throw Error('Parameter already defined on path')

        const parameter = new ParameterObject(this, name, at, schema)
        parameters.push(parameter)
        return this
    }
}

class MediaTypeObject {
    build: Function
    openapi: OpenAPIObject
    operation: OperationObject
    path: PathObject
    response?: ResponseObject

    schema: any
    example?: any
    examples: OMap<any>

    _: {
        builder: Function
    }

    constructor(parent: OperationObject | ResponseObject, schema?: any) {
        this.build = parent.build
        this.openapi = parent.openapi
        this.path = parent.path
        if (parent instanceof OperationObject) {
            this.operation = parent
        } else {
            this.response = parent
            this.operation = parent.operation!
        }

        this.schema = schema
        this.examples = {}

        const context = this
        function builder () {
            const result: any = {}
            if (context.schema) result.schema = context.schema
            if (context.example) result.example = context.example

            const names = Object.keys(context.examples)
            if (names.length) {
                result.examples = {}
                names.forEach(name => {
                    result.examples[name] = context.examples[name]
                })
            }
            return result
        }

        this._ = {
            builder
        }
    }

    addSchema (schema: any) {
        this.schema = schema
    }

    addExample (example: any, name?: string) {
        if (name) {
            if (this.example) throw Error('Cannot have example and named examples')
            this.examples[name] = example
        } else {
            if (Object.keys(this.examples).length) throw Error('Cannot have example and named examples')
            this.example = example
        }
    }
}

class OperationObject {
    build: Function
    openapi: OpenAPIObject
    path: PathObject
    _: {
        body: OMap<any>
        builder: Function
        parameters: Array<ParameterObject>
        responses: OMap<ResponseObject>
    }

    constructor (path: PathObject) {

        this.build = path.build
        this.openapi = path.openapi
        this.path = path

        const context = this
        function builder (version: number): any {
            const result: any = { description: '' }

            const { body, parameters, responses } = context._

            if (parameters.length > 0) result.parameters = []
            parameters.forEach(parameter => {
                result.parameters.push(parameter._.builder(version))
            })

            const types = Object.keys(body)
            if (types.length) {
                if (version === 2) {
                    result.parameters.push({ name: 'body', in: 'body', schema: body[''] })
                } else {
                    result.requestBody = { content: {} }
                    types.forEach(type => {
                        result.requestBody.content[type] = body[type]._.builder()
                    })
                }
            }

            const codes = Object.keys(responses)
            result.responses = {}
            if (codes.length) {
                codes.forEach(code => {
                    result.responses[code] = responses[code]._.builder()
                })
            } else {
                result.responses[200] = { description: '' }
            }

            return result
        }

        this._ = {
            builder,
            body: {},
            parameters: [],
            responses: {}
        }
    }

    addBody (schema: any, contentType = 'application/json'): MediaTypeObject {
        const body = this._.body
        if (this.openapi.version === 2) {
            body[''] = new MediaTypeObject(this, schema)
            return body['']
        } else {
            body[contentType] = new MediaTypeObject(this, schema)
            return body[contentType]
        }
    }

    addParameter (name: string, at: string, schema: any): OperationObject {
        const parameters = this._.parameters
        const found = parameters.find((v: ParameterObject) => v.name === name && v.at === at)
        if (found) throw Error('Parameter already defined on operation')

        const parameter = new ParameterObject(this, name, at, schema)
        parameters.push(parameter)
        return this
    }

    addResponse (code: string): ResponseObject {
        const responses = this._.responses
        responses[code] = new ResponseObject(this)
        return responses[code]
    }
}

class ParameterObject {
    build: Function
    openapi: OpenAPIObject
    operation?: OperationObject
    path: PathObject
    name: string
    at: string
    schema: any
    _: {
        builder: Function
    }

    constructor(parent: PathObject | OperationObject, name: string, at: string, schema: any) {
        this.build = parent.build
        this.openapi = parent.openapi
        if (parent instanceof PathObject) {
            this.path = parent
        } else {
            this.operation = parent
            this.path = parent.path
        }

        this.name = name
        this.at = at
        this.schema = schema

        const context = this
        function builder (_version: string) {
            const result: any = {
                name: context.name,
                in: context.at
            }
            if (context.openapi.version === 2) {
                Object.assign(result, schema)
            } else {
                result.schema = schema
            }
            if (context.at === 'path') result.required = true
            return result
        }

        this._ = { builder }
    }
}

class ResponseObject {
    build: Function
    openapi: OpenAPIObject
    operation?: OperationObject
    path: PathObject

    content: OMap<MediaTypeObject>
    example?: any
    examples: OMap<any>
    headers: OMap<any>
    schema?: any
    _: {
        builder: Function
    }

    constructor (operation: OperationObject) {
        this.build = operation.build
        this.openapi = operation.openapi
        this.operation = operation
        this.path = operation.path

        this.content = {}
        this.examples = {}
        this.headers = {}

        const context = this
        function builder () {
            const version = context.openapi.version
            const result: any = { description: '' }

            Object.keys(context.headers).forEach(headerKey => {
                result.headers[headerKey] = context.headers[headerKey]
            })

            if (version === 2) {
                if (context.schema) result.schema = context.schema

                const exampleTypes = Object.keys(context.examples)
                if (exampleTypes.length) {
                    result.examples = {}
                    exampleTypes.forEach(type => {
                        result.examples[type] = context.examples[type]
                    })
                }

            } else {
                const contentTypes = Object.keys(context.content)
                if (contentTypes.length) {
                    result.content = {}
                    contentTypes.forEach(type => {
                        result.content[type] = context.content[type]._.builder()
                    })
                }
            }

            return result
        }

        this._ = { builder }
    }

    addContent (contentType: string, schema?: any): MediaTypeObject {
        if (this.openapi.version === 2) throw Error('Cannot add content to response object for OpenAPI v2')
        this.content[contentType] = schema ? new MediaTypeObject(this, schema) : new MediaTypeObject(this)
        return this.content[contentType]
    }

    addExample (example: any, contentType: string) {
        if (this.openapi.version === 3) throw Error('Cannot add example to response object for OpenAPI v3')
        this.examples[contentType] = example
        return this
    }

    addHeader (name: string, header: any) {
        this.headers[name] = header
        return this
    }

    addSchema (schema: any) {
        if (this.openapi.version === 3) throw Error('Cannot add schema to response object for OpenAPI v3')
        this.schema = schema
        return this
    }
}