(window.webpackJsonp=window.webpackJsonp||[]).push([[20],{377:function(e,t,o){"use strict";o.r(t);var n=o(44),r=Object(n.a)({},(function(){var e=this,t=e.$createElement,o=e._self._c||t;return o("ContentSlotsDistributor",{attrs:{"slot-key":e.$parent.slotKey}},[o("div",{staticClass:"custom-block warning"},[o("p",{staticClass:"custom-block-title"},[e._v("WARNING")]),e._v(" "),o("p",[e._v("You are looking at the documentation for version 1.x. For the documentation on the latest version see the "),o("RouterLink",{attrs:{to:"/guide/getting-started.html"}},[e._v("Guide")]),e._v(" or the "),o("RouterLink",{attrs:{to:"/api/"}},[e._v("API")]),e._v(".")],1)]),e._v(" "),o("h2",{attrs:{id:"openapienforcermiddleware"}},[o("a",{staticClass:"header-anchor",attrs:{href:"#openapienforcermiddleware"}},[e._v("#")]),e._v(" OpenApiEnforcerMiddleware")]),e._v(" "),o("p",[e._v("The constructor will create an instance of the OpenAPI enforcer middleware.")]),e._v(" "),o("p",[o("strong",[e._v("Signature")])]),e._v(" "),o("p",[o("code",[e._v("OpenApiEnforcerMiddleware (definition: string [, options: object ])")])]),e._v(" "),o("p",[o("strong",[e._v("Parameters")])]),e._v(" "),o("ul",[o("li",[o("p",[o("em",[e._v("definition")]),e._v(" - A "),o("code",[e._v("string")]),e._v(" indicating the path the the OpenAPI document definition or an "),o("code",[e._v("object")]),e._v(" that is the Open API definition. If a "),o("code",[e._v("string")]),e._v(" is specified then the document will be loaded and will resolve all "),o("code",[e._v("$ref")]),e._v(" properties.")])]),e._v(" "),o("li",[o("p",[o("em",[e._v("options")]),e._v(" - An optional "),o("code",[e._v("object")]),e._v(" with the following settings:")]),e._v(" "),o("ul",[o("li",[o("p",[o("em",[e._v("componentOptions")]),e._v(" - These options will passed directly on to the openapi-enforcer's components.")])]),e._v(" "),o("li",[o("p",[o("em",[e._v("fallthrough")]),e._v(" - When this middleware is run, if "),o("code",[e._v("fallthough")]),e._v(" is set to "),o("code",[e._v("true")]),e._v(" then the next middleware will be called, otherwise a "),o("code",[e._v("404")]),e._v(" response will be sent. Defaults to "),o("code",[e._v("true")]),e._v(".")])]),e._v(" "),o("li",[o("p",[o("em",[e._v("mockHeader")]),e._v(" - The name of the header to look for to specify an "),o("RouterLink",{attrs:{to:"/v1/guide/mocking.html#explicit-mocking"}},[e._v("explicit mock")]),e._v(" request. Defaults to "),o("code",[e._v('"x-mock"')]),e._v(".")],1)]),e._v(" "),o("li",[o("p",[o("em",[e._v("mockQuery")]),e._v(" - The name of the query parameter to look for to specify an "),o("RouterLink",{attrs:{to:"/v1/guide/mocking.html#explicit-mocking"}},[e._v("explicit mock")]),e._v(" request. This query parameter does not need to be defined in your OpenAPI document definition. Defaults to "),o("code",[e._v('"x-mock"')]),e._v(".")],1)]),e._v(" "),o("li",[o("p",[o("em",[e._v("reqMockStatusCodeProperty")]),e._v(" - The name of the property to attach the "),o("a",{attrs:{href:"https://byu-oit.github.io/openapi-enforcer/api/components/operation",target:"_blank",rel:"noopener noreferrer"}},[e._v("OpenAPI Enforcer's OpenAPI object"),o("OutboundLink")],1),e._v(" to on the request object. Defaults to "),o("code",[e._v('"openapi"')]),e._v(".")])]),e._v(" "),o("li",[o("p",[o("em",[e._v("reqOperationProperty")]),e._v(" - The name of the property to attach the "),o("a",{attrs:{href:"https://byu-oit.github.io/openapi-enforcer/api/components/operation",target:"_blank",rel:"noopener noreferrer"}},[e._v("OpenAPI Enforcer's Operation object"),o("OutboundLink")],1),e._v(" to on the request object. Defaults to "),o("code",[e._v('"operation"')]),e._v(".")])]),e._v(" "),o("li",[o("p",[o("em",[e._v("resSerialize")]),e._v(" - A boolean indicating whether to serialize responses. If you disable this response serialization you may need to serialize your own responses, depending on what data you are sending back to the client. Defaults to "),o("code",[e._v("true")]),e._v(".")])]),e._v(" "),o("li",[o("p",[o("em",[e._v("resValidate")]),e._v(" - A boolean indicating whether to validate responses. Responses that are invalid might not serialize. Defaults to "),o("code",[e._v("true")]),e._v(".")])]),e._v(" "),o("li",[o("p",[o("em",[e._v("xController")]),e._v(" - The name of the property to look for in your OpenAPI document to define the name of the controller associated with an operation. Defaults to "),o("code",[e._v('"x-controller"')]),e._v(".")])]),e._v(" "),o("li",[o("p",[o("em",[e._v("xOperation")]),e._v(" - The name of the property to look for in your OpenAPI document to define the name of the operation within the controller that is associated with the operation. Defaults to "),o("code",[e._v('"x-operation"')]),e._v(".")])])])])]),e._v(" "),o("p",[o("strong",[e._v("Returns")]),e._v(" an OpenAPI Enforcer Middleware instance")]),e._v(" "),o("h2",{attrs:{id:"controllers"}},[o("a",{staticClass:"header-anchor",attrs:{href:"#controllers"}},[e._v("#")]),e._v(" Controllers")]),e._v(" "),o("p",[e._v("The OpenApiEnforcerMiddleware has its own internal middleware runner. Calling this function will define a "),o("RouterLink",{attrs:{to:"/v1/guide/controllers.html"}},[e._v("controllers group")]),e._v(" that will handle requests and add it as an internal middleware.")],1),e._v(" "),o("p",[o("strong",[e._v("Signature")])]),e._v(" "),o("p",[o("code",[e._v("OpenAPIEnforcerMiddleware.prototype.controllers (controllers: string|object, ...dependencyInjection): Promise")])]),e._v(" "),o("p",[o("strong",[e._v("Parameters")])]),e._v(" "),o("ul",[o("li",[o("p",[o("em",[e._v("controllers")]),e._v(" - The path the the controllers directory or a controllers definition map. See the "),o("RouterLink",{attrs:{to:"/v1/guide/controllers.html"}},[e._v("controllers documentation")]),e._v(" for more information.")],1)]),e._v(" "),o("li",[o("p",[o("em",[e._v("dependencyInjection")]),e._v(" - You can add any number of parameters after the first parameter and these will be passed in to a controller that uses "),o("RouterLink",{attrs:{to:"/v1/guide/controllers.html#dependency-injection"}},[e._v("dependency injection")]),e._v(".")],1)])]),e._v(" "),o("p",[o("strong",[e._v("Returns")]),e._v(" a "),o("code",[e._v("Promise")]),e._v(" that resolves if successfully loaded.")]),e._v(" "),o("h2",{attrs:{id:"middleware"}},[o("a",{staticClass:"header-anchor",attrs:{href:"#middleware"}},[e._v("#")]),e._v(" Middleware")]),e._v(" "),o("p",[e._v("Call this function to return the middleware runner that will run the internal middlewares.")]),e._v(" "),o("p",[o("strong",[e._v("Signature")])]),e._v(" "),o("p",[o("code",[e._v("OpenAPIEnforcerMiddleware.prototype.middleware (): Function")])]),e._v(" "),o("p",[o("strong",[e._v("Parameters")]),e._v(" None")]),e._v(" "),o("p",[o("strong",[e._v("Returns")]),e._v(" an "),o("a",{attrs:{href:"https://www.npmjs.com/package/express",target:"_blank",rel:"noopener noreferrer"}},[e._v("express"),o("OutboundLink")],1),e._v(" middleware function.")]),e._v(" "),o("h2",{attrs:{id:"mocks"}},[o("a",{staticClass:"header-anchor",attrs:{href:"#mocks"}},[e._v("#")]),e._v(" Mocks")]),e._v(" "),o("p",[e._v("The OpenApiEnforcerMiddleware has its own internal middleware runner. Calling this function will define a mock controllers group that will handle requests and add it as an internal middleware.")]),e._v(" "),o("p",[o("strong",[e._v("Signature")])]),e._v(" "),o("p",[o("code",[e._v("OpenAPIEnforcerMiddleware.prototype.mocks (controllers: string|object, isFallback: boolean, ...dependencyInjection): Promise")])]),e._v(" "),o("p",[o("strong",[e._v("Parameters")])]),e._v(" "),o("ul",[o("li",[o("p",[o("em",[e._v("controllers")]),e._v(" - The path the the mock controllers directory or a controllers definition map. See the "),o("RouterLink",{attrs:{to:"/v1/guide/controllers.html"}},[e._v("controllers guide")]),e._v(" for more information. This value can be set to "),o("code",[e._v("null")]),e._v(" or "),o("code",[e._v("undefined")]),e._v(" if you do not have any mock controller functions to run.")],1)]),e._v(" "),o("li",[o("p",[o("em",[e._v("isFallback")]),e._v(" - A boolean indicating whether this is "),o("RouterLink",{attrs:{to:"/v1/guide/mocking.html#fallback-mocking"}},[e._v("fallback middleware")]),e._v(" or if it requires "),o("RouterLink",{attrs:{to:"/v1/guide/mocking.html#explicit-mocking"}},[e._v("explicit mock")]),e._v(" requests to run.")],1)]),e._v(" "),o("li",[o("p",[o("em",[e._v("dependencyInjection")]),e._v(" - You can add any number of parameters after the first parameter and these will be passed in to a controller that uses "),o("RouterLink",{attrs:{to:"/v1/guide/controllers.html#dependency-injection"}},[e._v("dependency injection")]),e._v(".")],1)])]),e._v(" "),o("p",[o("strong",[e._v("Returns")]),e._v(" A Promise that will resolve when the middleware loads correctly.")]),e._v(" "),o("h2",{attrs:{id:"use"}},[o("a",{staticClass:"header-anchor",attrs:{href:"#use"}},[e._v("#")]),e._v(" Use")]),e._v(" "),o("p",[e._v("The OpenApiEnforcerMiddleware has its own internal middleware runner. Calling this function will add an internal middleware.")]),e._v(" "),o("p",[o("strong",[e._v("Signature")])]),e._v(" "),o("p",[o("code",[e._v("OpenAPIEnforcerMiddleware.prototype.use (middleware: Function): undefined")])]),e._v(" "),o("p",[o("strong",[e._v("Parameters")])]),e._v(" "),o("ul",[o("li",[o("em",[e._v("middleware")]),e._v(" - The express middleware function to add to the internal enforcer's middleware. Any responses sent from within these middlewares will be validated against the OpenAPI document definition prior to sending.")])]),e._v(" "),o("p",[o("strong",[e._v("Returns")]),e._v(" nothing.")])])}),[],!1,null,null,null);t.default=r.exports}}]);