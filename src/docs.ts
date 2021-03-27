import Debug from 'debug'
import Express from 'express'
import path from 'path'

const debug = Debug('openapi-enforcer-middleware:docs')

export interface DocsOptions {
    padding?: string // Set to empty string to use default HTML padding, otherwise set padding value. Defaults to '0'
    preRedocInitScripts: string[] // The path to JavaScript files that should be run prior to redoc init
    postRedocInitScripts: string[] // The path to JavaScript files that should be run after redoc init
    redoc: {
        cdnVersion?: string // If omitted or empty string then will check node_modules for installed redoc, otherwise will default to 'next'.
        options?: Record<string, unknown> // Options to pass to redoc during init
    }
    styleSheets: string[] // The path to CSS files that should be added to the head.
    title: string // The title to use for the page. Defaults to OpenAPI spec title.
}

export function docsMiddleware (enforcerPromise: Promise<any>, options?: Partial<DocsOptions>) {
    const redocPath = getRedocModulePath()

    if (options === undefined) options = {}
    if (!('padding' in options)) options.padding = '0'
    if (!('title' in options)) options.title = ''
    if (!('redoc' in options)) {
        options.redoc = {
            cdnVersion: redocPath ? '' : 'next',
            options: {}
        }
    }
    if (!('options' in options.redoc!)) options.redoc!.options = {}
    if (!('cdnVersion' in options.redoc!)) options.redoc!.cdnVersion = redocPath ? '' : 'next'
    if (!('styleSheets' in options)) options.styleSheets = []
    if (!('preRedocInitScripts' in options)) options.preRedocInitScripts = []
    if (!('postRedocInitScripts' in options)) options.postRedocInitScripts = []

    let indexHTML = ''
    
    debug('Docs middleware initialized')

    // @ts-ignore
    return function (req: Express.Request, res: Express.Response, next: Express.NextFunction) {
        // Docs don't require initialization
        enforcerPromise
            .then(async openapi => {
                switch (req.path) {
                    case '/':
                        res.set('content-type', 'text/html')
                        res.status(200)
                        if (!indexHTML) indexHTML = getIndexHtml(openapi, req.baseUrl, options as DocsOptions)
                        res.send(indexHTML)
                        break
                    case '/openapi.json':
                        res.set('content-type', 'application/json')
                        res.status(200)
                        res.send(await openapi.getBundledDefinition())
                        break
                    case '/redoc.js':
                        const filePath = path.resolve(path.dirname(redocPath), 'redoc.standalone.js')
                        res.sendFile(filePath)
                        break
                    default:
                        res.sendStatus(404)
                }
            })
            .catch(next)
    }
}

function getIndexHtml (openapi: any, basePath: string, options: DocsOptions): string {
    const title = options.title || openapi.info.title || 'API Documentation'

    let paddingStyle = ''
    if (options.padding) {
        paddingStyle = `<style>
      body {
        margin: 0;
        padding: ${options.padding};
      }
    </style>
    `
    }

    const styleSheets = options.styleSheets.map(path => "<link rel='stylesheet' href='" + path + "'>")
    const preScripts = options.preRedocInitScripts.map(path => "<script src='" + path + "'></script>")
    const postScripts = options.postRedocInitScripts.map(path => "<script src='" + path + "'></script>")

    const redocUrl = options.redoc.cdnVersion === ''
        ? basePath + '/redoc.js'
        : 'https://cdn.jsdelivr.net/npm/redoc@' + options.redoc.cdnVersion + '/bundles/redoc.standalone.js'

    const openapiPath = basePath + '/openapi.json'

    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>${title}</title>
    <!-- needed for adaptive design -->
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    
    ${styleSheets.join('\n    ')}
    ${paddingStyle}
  </head>
  <body>
    <div id="redoc"></div>
    <script src="${redocUrl}"></script>
    ${preScripts.join('\n    ')}
    <script>
      Redoc.init('${openapiPath}', ${JSON.stringify(options.redoc.options)}, document.getElementById('redoc'))
    </script>
    ${postScripts.join('\n    ')}
  </body>
</html>
      `
}

function getRedocModulePath (): string {
    try {
        return require.resolve('redoc')
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') throw e
        return ''
    }
}