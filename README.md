# chromectx

macOS CLI and MCP server that gives AI tools live context from your Chrome tabs.

Search, save, restore, and pipe your open browser tabs into Claude, Cursor, and other AI tools via the [Model Context Protocol](https://modelcontextprotocol.io).

## Install

```bash
npx chromectx install
```

This one command:

1. Checks your environment (macOS, Chrome, automation permissions)
2. Installs `chromectx` globally
3. Offers to configure the MCP server for your AI tools (Claude Desktop, Cursor, VS Code, etc.)

### Manual setup

If you prefer to set things up yourself:

```bash
npm i -g chromectx          # install the CLI globally
chromectx setup             # configure MCP for your AI tools
```

Or add the MCP server config directly:

```json
{
  "mcpServers": {
    "chromectx": {
      "command": "npx",
      "args": ["-y", "chromectx@latest", "mcp"]
    }
  }
}
```

## Requirements

- **macOS** (uses AppleScript/JXA to communicate with Chrome)
- **Google Chrome**
- **Node.js >= 18**
- Automation permission: your terminal must be allowed to control Chrome
  (System Settings > Privacy & Security > Automation)

## Commands

| Command | Description |
|---------|-------------|
| `chromectx install` | One-time guided setup (env check, global install, MCP config) |
| `chromectx setup` | Configure MCP server for AI tools |
| `chromectx doctor` | Check runtime environment and report readiness |
| `chromectx list` | List open Chrome windows and tabs, or saved sessions |
| `chromectx search <query>` | Search tab titles and URLs; `--deep` searches page content |
| `chromectx save` | Save a Chrome window as a session file |
| `chromectx restore` | Restore a saved session to Chrome |
| `chromectx rag <query>` | RAG search across open tabs (JSON output for agents/scripts) |
| `chromectx mcp` | Start the MCP server over stdin/stdout |

### Global flags

```
-h, --help     Show help
--version      Print version
--json         Structured JSON output (where supported)
-q, --quiet    Reduce output
-v, --verbose  Increase diagnostic output
```

## MCP tools

When running as an MCP server, chromectx exposes:

- **`rag_chrome_search`** -- Search the content of all open Chrome tabs using BM25 ranking. Fetches and indexes every open tab, then runs a keyword search. Supports chunk-level or full-page results.
- **`doctor`** -- Inspect the local macOS runtime and report whether chromectx is ready to run.

## Updating

The MCP server auto-updates: each restart fetches the latest version via `npx`.

For the global CLI, re-run:

```bash
npx chromectx install
```

chromectx will also notify you in the terminal when a new version is available.

## License

[Apache License 2.0](LICENSE)

Copyright 2025-2026 Anubhav Saha
