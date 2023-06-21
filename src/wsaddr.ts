const wsaddr = (proxyAddr: string, host: string, port: string): string => {
    const p = window.location.protocol === "http:" ? "ws:" : "wss:"
    return `${p}//${proxyAddr}?address=${host}:${port}`
}

export default wsaddr
