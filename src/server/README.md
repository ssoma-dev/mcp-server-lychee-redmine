# MCP Server Core

**Domain**: MCP Server Core
**Purpose**: MCPプロトコル実装とクライアント通信管理

## Responsibilities

- stdio経由のJSON-RPC 2.0プロトコル実装
- ツール/リソース/プロンプトの登録と公開
- クライアント初期化リクエストの処理
- 設定エラー時の適切な終了処理

## Components

- Server Core: MCPサーバー起動とシャットダウン
- Tool Registry: ツール定義の管理とハンドラーマッピング

## Dependencies

- @modelcontextprotocol/sdk - MCP protocol implementation
- Config Domain - Configuration loading and validation
- Redmine Integration Domain - MCP tools
