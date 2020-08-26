import Express from 'express'
import { IncomingHttpHeaders } from "http";

const store: AnyObject = {}
let cookieIndex = 0
let lastCookieTimeStamp = 0

interface AnyObject {
    [key: string]: any
}

export default function () {
    return {
        async getData (req: Express.Request, _res: Express.Response): Promise<AnyObject> {
            const id = getCookie(req.headers)
            if (!id) return {}

            const data = store[id]
            return JSON.parse(data)
        },

        async setData (req: Express.Request, res: Express.Response, data: AnyObject): Promise<void> {
            let id = getCookie(req.headers)

            // if no cookie created yet then generate the cookie id and set it
            if (!id) {
                const now = Date.now()
                if (now !== lastCookieTimeStamp) {
                    cookieIndex = 0
                    lastCookieTimeStamp = now
                }
                id = now + '-' + cookieIndex++
                res.cookie('enforcer-store', id)
            }

            store[id] = data
        }
    }
}

function getCookie(headers: IncomingHttpHeaders): string {
    const name = "enforcer-store="
    const decodedCookie = decodeURIComponent(headers.cookie || '')
    const ca = decodedCookie.split(';')
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1)
        if (c.indexOf(name) === 0) return c.substring(name.length, c.length)
    }
    return ""
}