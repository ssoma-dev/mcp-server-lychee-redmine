# MCP Server for Lychee Redmine

Model Context Protocol (MCP) server for integrating Lychee Redmine project management with AI assistants like Claude.

## Requirements

- Node.js 22.18.0 or higher
- Lychee Redmine instance with API access

## Installation

```bash
npm install
```

## Configuration

Set the following environment variables:

- `LYCHEE_REDMINE_URL`: Your Lychee Redmine instance URL (HTTPS required)
- `LYCHEE_REDMINE_API_KEY`: Your Redmine API key
- `LOG_LEVEL`: (Optional) Log level: DEBUG, INFO, WARN, ERROR (default: INFO)

## Setup for Claude Code

### CLI で追加する場合

```bash
claude mcp add lychee-redmine \
  -e LYCHEE_REDMINE_URL=https://your-redmine-instance.example.com \
  -e LYCHEE_REDMINE_API_KEY=your-api-key \
  -- npx -y github:ssoma-dev/mcp-server-lychee-redmine
```

### 設定ファイルを直接編集する場合

グローバル設定 (`~/.claude/settings.json`) またはプロジェクト設定 (`.claude/settings.json`) に以下を追加してください:

```json
{
  "mcpServers": {
    "lychee-redmine": {
      "command": "npx",
      "args": ["-y", "github:ssoma-dev/mcp-server-lychee-redmine"],
      "env": {
        "LYCHEE_REDMINE_URL": "https://your-redmine-instance.example.com",
        "LYCHEE_REDMINE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 動作確認

```bash
claude mcp list
```

一覧に `lychee-redmine` が表示されれば設定完了です。Claude Code からプロジェクト・チケット・スケジュール・ユーザー管理のツールが利用可能になります。

## Development

```bash
# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Lint
npm run lint

# Format code
npm run format
```

## Architecture

This MCP server follows Domain-Driven Design principles with clear separation:

- `/src/server/` - MCP Server Core
- `/src/redmine/` - Redmine Integration
- `/src/config/` - Configuration Management
- `/src/utils/` - Utilities (Logger, Error Handler, Retry Handler)

## License

MIT
