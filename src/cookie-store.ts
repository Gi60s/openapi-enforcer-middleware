import Debug from 'debug'
import Express from 'express'
import { IncomingHttpHeaders } from "http"
import { MockStore } from "./interfaces";

const debug = Debug('openapi-enforcer-middleware:cookie-store')
const store: AnyObject = {}
let cookieIndex = 0
let lastCookieTimeStamp = 0

interface AnyObject {
    [key: string]: any
}

export default function (): MockStore {
    return {
        async get (req: Express.Request, res: Express.Response, key: string): Promise<any> {
            const id = getCookie(req.headers)
            if (id) {
                debug('ID retrieved from cookie: ' + id)
                const data = store[id]
                if (!data) {
                    debug('Nothing in store for ID: ' + id)
                } else if (key in data) {
                    return data[key]
                } else {
                    debug('No data for ID ' + id + ' at key: ' + key)
                }
            } else {
                createStore(res)
            }
        },

        async set (req: Express.Request, res: Express.Response, key: string, value: any): Promise<void> {
            let id = getCookie(req.headers) || createStore(res)
            if (!store[id]) {
                store[id] = {}
                debug('Store initialized for ID: ' + id)
            }
            store[id][key] = value
            debug('Stored data for ID ' + id + ' at key: ' + key)
        }
    }
}

function createStore (res: Express.Response) {
    const now = Date.now()
    if (now !== lastCookieTimeStamp) {
        cookieIndex = 0
        lastCookieTimeStamp = now
    }
    const id = now + '-' + cookieIndex++
    res.cookie('enforcer-store', id)
    store[id] = {}
    debug('Store created for id: ' + id)
    return id
}

function getCookie(headers: IncomingHttpHeaders): string {
    const name = "enforcer-store="
    const decodedCookie = decodeURIComponent(headers.cookie || '')
    const ca = decodedCookie.split(';')
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1)
        if (c.indexOf(name) === 0) return c.substring(name.length, c.length)
    }
    return ""
}