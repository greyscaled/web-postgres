import { serialize } from "pg-protocol"
import { Parser } from "pg-protocol/dist/parser"
import { Query } from "./query"
import wsaddr from "./wsaddr"
import { BackendMessage } from "pg-protocol/dist/messages"

export interface WebPgClient {
    connected: boolean
    connecting: boolean
    connect(): Promise<void>
    end(): Promise<void>
    query(q: string): Promise<void>
}

interface ClientOptions {
    host: string
    port: string
    user: string
    password: string
    database: string
    wsProxyAddr: string
}

export class Client implements WebPgClient {
    private host: string
    private port: string
    private user: string
    private password: string
    private database: string

    private _connected: boolean
    private _connecting: boolean
    private ws: WebSocket | null
    private wsProxyAddr: string

    private activeQuery: Query | undefined
    private readyForQuery: boolean
    private queryQueue: Query[]

    constructor(options: ClientOptions) {
        this.host = options.host
        this.port = options.port
        this.user = options.user
        this.password = options.password
        this.database = options.database

        this._connected = false
        this._connecting = false
        this.ws = null
        this.wsProxyAddr = options.wsProxyAddr

        this.activeQuery = undefined
        this.readyForQuery = false
        this.queryQueue = []
    }

    get connected(): boolean {
        return this._connected
    }

    get connecting(): boolean {
        return this._connecting
    }

    async connect(): Promise<void> {
        if (this._connecting || this._connected) {
            throw new Error("connect: Client is already connecting or connected")
        }
        this._connecting = true

        this.ws = await this.openWebSocket()

        this.ws.addEventListener("error", (err) => {
            console.error(err)
            // TODO
        })

        this.ws.addEventListener("close", () => {
            console.info("close websocket")
            // TODO
        })

        const parser = new Parser()

        this.ws.addEventListener("message", (message) => {
            const buffer = Buffer.from(message.data as ArrayBuffer)
            parser.parse(buffer, (msg) => {
                // TODO: debug
                console.info(msg)
                this.handleMessage(msg)
            })
        })

        await this.awaitAuthenticationOk()
    }

    private async openWebSocket(): Promise<WebSocket> {
        return new Promise<WebSocket>(async (resolve) => {
            try {
                const ws = new WebSocket(wsaddr(this.wsProxyAddr, this.host, this.port))
                ws.binaryType = "arraybuffer"

                ws.addEventListener("open", () => {
                    console.info("open websocket")
                    ws.send(
                        serialize.startup({
                            user: this.user,
                            database: this.database,
                        })
                    )
                    ws.send(serialize.password(this.password))
                    resolve(ws)
                })
            } catch (err) {
                console.error(err)
                throw new Error("connect: Client failed to create WebSocket")
            }
        })
    }

    private async awaitAuthenticationOk(): Promise<void> {
        if (this.connected) {
            return
        }

        return new Promise((resolve, reject) => {
            const maxTicks = 20

            let tick = 0

            const processTick = () => {
                tick++

                if (tick > maxTicks) {
                    window.clearInterval(interval)
                    reject()
                }

                if (this.connected) {
                    window.clearInterval(interval)
                    resolve()
                }
            }

            const interval = window.setInterval(processTick, 100)
        })
    }

    private handleMessage(msg: BackendMessage) {
        switch (msg.name) {
            case "authenticationCleartextPassword":
            case "authenticationMD5Password":
            case "authenticationSASL":
            case "authenticationSASLContinue":
            case "authenticationSASLFinal":
            case "backendKeyData":
            case "bindComplete":
            case "closeComplete":
            case "commandComplete":
            case "copyData":
            case "copyDone":
            case "copyInResponse":
            case "copyOutResponse":
            case "emptyQuery":
            case "error":
            case "noData":
            case "notice":
            case "notification":
            case "parameterDescription":
            case "parameterStatus":
            case "parseComplete":
            case "portalSuspended":
            case "replicationStart":
                // TODO
                break
            case "authenticationOk":
                this.handleAuthenticationOk()
                break
            case "readyForQuery":
                this.handleReadyForQuery()
                return
            case "dataRow":
                // TODO
                break
            case "rowDescription":
                // TODO
                break
            default:
                console.error("default reached")
        }
    }

    private handleAuthenticationOk() {
        this._connected = true
        this._connecting = false
    }

    private handleReadyForQuery() {
        this.readyForQuery = true
        this.pulseQueryQueue()
    }

    async query(text: string): Promise<void> {
        const q = new Query(text)
        this.queryQueue.push(q)
        this.pulseQueryQueue()
        await this.awaitReadyForQuery() // still need to process results
        return
    }

    private async awaitReadyForQuery(): Promise<void> {
        if (this.readyForQuery) {
            return
        }

        return new Promise((resolve, reject) => {
            const maxTicks = 20

            let tick = 0

            const processTick = () => {
                tick++

                if (tick > maxTicks) {
                    window.clearInterval(interval)
                    reject()
                }

                if (this.readyForQuery) {
                    window.clearInterval(interval)
                    resolve()
                }
            }

            const interval = window.setInterval(processTick, 100)
        })
    }

    pulseQueryQueue() {
        if (this.readyForQuery && this.ws) {
            this.activeQuery = this.queryQueue.shift()

            if (this.activeQuery) {
                this.readyForQuery = false
                this.activeQuery.send(this.ws)
            }
        }
    }

    async end(): Promise<void> {
        // TODO
        return
    }
}
