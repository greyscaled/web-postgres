import { serialize } from "pg-protocol"

export class Query {
    private text: string

    constructor(text: string) {
        this.text = text
    }

    send(ws: WebSocket) {
        ws.send(serialize.query(this.text))
    }
}
