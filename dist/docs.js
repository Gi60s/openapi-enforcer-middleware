"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.docsMiddleware = void 0;
const debug_1 = __importDefault(require("debug"));
const path_1 = __importDefault(require("path"));
const debug = debug_1.default('openapi-enforcer-middleware:docs');
function docsMiddleware(openapi, options) {
    const redocPath = getRedocModulePath();
    if (options === undefined)
        options = {};
    if (!('padding' in options))
        options.padding = '0';
    if (!('title' in options))
        options.title = '';
    if (!('redoc' in options)) {
        options.redoc = {
            cdnVersion: redocPath ? '' : 'next',
            options: {}
        };
    }
    if (!('options' in options.redoc))
        options.redoc.options = {};
    if (!('cdnVersion' in options.redoc))
        options.redoc.cdnVersion = redocPath ? '' : 'next';
    if (!('styleSheets' in options))
        options.styleSheets = [];
    if (!('preRedocInitScripts' in options))
        options.preRedocInitScripts = [];
    if (!('postRedocInitScripts' in options))
        options.postRedocInitScripts = [];
    let indexHTML = '';
    debug('Docs middleware initialized');
    return async function (req, res) {
        switch (req.path) {
            case '/':
                res.set('content-type', 'text/html');
                res.status(200);
                if (!indexHTML)
                    indexHTML = getIndexHtml(openapi, req.baseUrl, options);
                res.send(indexHTML);
                break;
            case '/openapi.json':
                res.set('content-type', 'application/json');
                res.status(200);
                res.send(await openapi.getBundledDefinition());
                break;
            case '/redoc.js':
                const filePath = path_1.default.resolve(path_1.default.dirname(redocPath), 'redoc.standalone.js');
                res.sendFile(filePath);
                break;
            default:
                res.sendStatus(404);
        }
    };
}
exports.docsMiddleware = docsMiddleware;
function getIndexHtml(openapi, basePath, options) {
    const title = options.title || openapi.info.title || 'API Documentation';
    let paddingStyle = '';
    if (options.padding) {
        paddingStyle = `<style>
      body {
        margin: 0;
        padding: ${options.padding};
      }
    </style>
    `;
    }
    const styleSheets = options.styleSheets.map(path => "<link rel='stylesheet' href='" + path + "'>");
    const preScripts = options.preRedocInitScripts.map(path => "<script src='" + path + "'></script>");
    const postScripts = options.postRedocInitScripts.map(path => "<script src='" + path + "'></script>");
    const redocUrl = options.redoc.cdnVersion === ''
        ? basePath + '/redoc.js'
        : 'https://cdn.jsdelivr.net/npm/redoc@' + options.redoc.cdnVersion + '/bundles/redoc.standalone.js';
    const openapiPath = basePath + '/openapi.json';
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
      `;
}
function getRedocModulePath() {
    try {
        return require.resolve('redoc');
    }
    catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND')
            throw e;
        return '';
    }
}
//# sourceMappingURL=docs.js.map