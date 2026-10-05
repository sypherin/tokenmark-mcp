# Installing the TokenMark MCP server

TokenMark is a stdio MCP server published on npm as `@altronis/tokenmark-mcp`. It needs Node.js 18 or newer. There is no API key, no build step and nothing to clone: `npx` fetches and runs it.

## Cline CLI

Run:

```sh
cline mcp add tokenmark --yes -- npx -y @altronis/tokenmark-mcp
```

This writes the server into Cline's own `cline_mcp_settings.json`. Start a new Cline session to load it.

## Cline in VS Code

Read the existing `cline_mcp_settings.json` first and keep every server already in it. Add this entry under `mcpServers`:

```json
"tokenmark": {
  "command": "npx",
  "args": ["-y", "@altronis/tokenmark-mcp"],
  "disabled": false,
  "autoApprove": []
}
```

## Check it works

Call the `tokenmark_hardware` tool with no arguments. It returns the hardware platforms TokenMark tracks. If it fails, run `npx -y @altronis/tokenmark-mcp` in a terminal: it should start and wait for input on stdio, with no error.
