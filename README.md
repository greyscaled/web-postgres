# web-postgres

A WebSocket-based `pg` client for the web.

This project is in an early experimental state and not yet ready for use or
release/deployment.

## Usage

See the `example` directory. This section will be improved at a later time.
For now, know that this project depends upon a DIY WebSocket-TCP Proxy (see
`example/main.go`).

```text

| Browser | <-- WebSocket --> | Proxy | <-- TCP --> | Postgres server |
```

## Trying it out

In one shell:

```console
cd example
go run main.gop
```

In another:

```console
make dist
cd example
yarn && yarn start
```

Then visit the URL `vite` spits out, and fill in the details. Currently traffic
is only visible in the `console` and `network` developer tools. In time, the
example will have a query/results interface.

> **Note** You'll want to change the hard-coded query in `App.tsx`.

## Inspiration

- [`node-postgres`]
- [`serverless`]

`node-postgres` is the defacto library for connecting to Postgres from Node.js
environments. `serverless` expanded upon it by shimming `node-postgres` for
serverless environments.  

This approach attempts to re-create a `node-postgres` inspired client from
scratch without shims or polyfills. It is primarly designed to work in standard
web environments. Therefore it is limited to use cases whereby a browser client
can safely access and use database credentials.

[`node-postgres`]: https://github.com/brianc/node-postgres
[`serverless`]: https://github.com/neondatabase/serverless
