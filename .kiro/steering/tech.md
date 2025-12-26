# Technology Stack

## Architecture

- **プロトコル**: Model Context Protocol (MCP) - JSON-RPC 2.0ベースの標準プロトコル
- **通信方式**: stdio経由の双方向通信
- **統合パターン**: REST API経由での外部システム統合（Lychee Redmine）

## Core Technologies

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 20+
- **Protocol**: MCP (Model Context Protocol)

## Key Libraries

- **MCP SDK**: MCPプロトコル実装用の公式SDK
- **HTTP Client**: Lychee Redmine REST API通信用（axios/node-fetch）
- **Validation**: JSON Schemaベースのパラメータバリデーション

## Development Standards

### Type Safety
- TypeScript strict mode必須
- `any`の使用禁止
- Lychee/Redmine APIレスポンスの包括的な型定義を提供

### Code Quality
- ESLintとPrettierによる自動フォーマット
- 一貫したコーディング規約の適用

### Testing
- ユニットテストとインテグレーションテストの両方を実装
- 外部API呼び出しのモック化

## Development Environment

### Required Tools
- Node.js 20以上
- TypeScript 5.x
- ESLint + Prettier

### Common Commands
```bash
# Dev: npm run dev
# Build: npm run build
# Test: npm run test
```

## Key Technical Decisions

### エラーハンドリング戦略
- API呼び出し失敗時は指数バックオフでリトライ（最大3回）
- エラーは分かりやすい形式でクライアントに返す
- 詳細なログ（DEBUG/INFO/WARN/ERROR）を記録

### セキュリティ原則
- APIキーは環境変数または暗号化ストレージで管理（平文保存禁止）
- HTTPS経由でのAPI通信
- 入力パラメータのサニタイゼーション必須

### パフォーマンス最適化
- 大量データ取得時はページネーション使用
- 並行処理の適切な実装

### 設定管理
- 環境変数と設定ファイル（JSON/YAML）の両方をサポート
- 複数インスタンス対応（Lychee Redmine）

---
_Document standards and patterns, not every dependency_
