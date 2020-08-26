import { routeBuilder as fnRouteBuilder } from './route-builder'
import { init as fnInit } from "./init"
import { mockMiddleware } from "./mock"

export default {
    routeBuilder: fnRouteBuilder,
    init: fnInit,
    mock: mockMiddleware
}

export const routeBuilder = fnRouteBuilder

export const init = fnInit

export const mock = mockMiddleware