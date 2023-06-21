import { FC, useRef, useState } from "react"
import { Client } from "../dist/"

const App: FC = () => {
    const [host, setHost] = useState("localhost")
    const [port, setPort] = useState("5432")
    const [user, setUser] = useState("postgres")
    const [password, setPassword] = useState("postgres")
    const [database, setDatabase] = useState("postgres")
    const [address, setAddress] = useState("localhost:8080/proxy")

    const [messages, setMessages] = useState<string[]>([])

    const clientRef = useRef<Client | null>(null)

    return (
        <div
            style={{
                alignItems: "center",
                display: "flex",
                flexDirection: "column",
                margin: "0 auto",
                maxWidth: "800px",
                minWidth: "400px",
            }}
        >
            <h1>pg-web demo</h1>

            <p>
                Fill in the connection details for a postgres server as well as the address to a tcp
                proxy server. pg-web will open a WebSocket with the tcp proxy server, using it as a
                relay to communicate with the pg server.
            </p>

            <form
                onSubmit={async (e) => {
                    e.preventDefault()
                    if (clientRef.current) {
                        await clientRef.current.end()
                    }
                    clientRef.current = new Client({
                        host,
                        port,
                        user,
                        password,
                        database,
                        wsProxyAddr: address,
                    })
                    await clientRef.current.connect()
                    clientRef.current.query("select * from my_schema.my_table;")
                }}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    maxWidth: "600px",
                    minWidth: "350px",
                    width: "100%",
                }}
            >
                <fieldset
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        width: "100%",
                    }}
                >
                    <legend>Database connection details</legend>

                    <label style={{ display: "flex", flexDirection: "column" }}>
                        host
                        <input
                            onChange={(e) => {
                                setHost(e.target.value)
                            }}
                            placeholder="host"
                            type="text"
                            value={host}
                        />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column" }}>
                        port
                        <input
                            onChange={(e) => {
                                setPort(e.target.value)
                            }}
                            placeholder="port"
                            type="text"
                            value={port}
                        />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column" }}>
                        user
                        <input
                            onChange={(e) => {
                                setUser(e.target.value)
                            }}
                            placeholder="user"
                            type="text"
                            value={user}
                        />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column" }}>
                        password
                        <input
                            onChange={(e) => {
                                setPassword(e.target.value)
                            }}
                            placeholder="password"
                            type="text"
                            value={password}
                        />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column" }}>
                        database
                        <input
                            onChange={(e) => {
                                setDatabase(e.target.value)
                            }}
                            placeholder="database"
                            type="text"
                            value={database}
                        />
                    </label>
                </fieldset>

                <fieldset
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        width: "100%",
                    }}
                >
                    <legend>WebSocket-TCP Proxy</legend>

                    <label style={{ display: "flex", flexDirection: "column" }}>
                        address
                        <input
                            onChange={(e) => {
                                setAddress(e.target.value)
                            }}
                            placeholder="address"
                            type="text"
                            value={address}
                        />
                    </label>
                </fieldset>

                <button style={{ marginTop: "8px" }} type="submit">
                    Connect
                </button>
            </form>

            <div style={{ marginTop: "16px" }}>
                {messages.map((message) => (
                    <p>{message}</p>
                ))}
            </div>
        </div>
    )
}
export default App
