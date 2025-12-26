# Project Structure

## Organization Philosophy

**機能ドメイン分離**: Lychee統合、Redmine統合、MCPサーバー基盤を明確に分離し、各ドメインの独立性を保つ設計を採用します。

## Directory Patterns

### MCP Server Core (`/src/server/`)
**Purpose**: MCPプロトコル実装とクライアント通信の管理
**Example**: 初期化処理、ツール/リソース登録、JSON-RPCハンドリング

### Redmine Integration (`/src/redmine/`)
**Purpose**: Lychee Redmine APIとの統合機能
**Example**:
- `api.ts` - Redmine REST API クライアント
- `types.ts` - Redmine APIレスポンス型定義
- `tools.ts` - MCPツール定義（チケット作成、検索など）

### Configuration (`/src/config/`)
**Purpose**: 設定管理とバリデーション
**Example**: 環境変数読み込み、設定ファイルパース、URLバリデーション

### Utilities (`/src/utils/`)
**Purpose**: 共通ユーティリティ
**Example**: ログ機能、エラーハンドリング、リトライロジック

## Naming Conventions

- **Files**: kebab-case (`lychee-client.ts`, `mcp-server.ts`)
- **Classes**: PascalCase (`LycheeClient`, `RedmineClient`)
- **Functions**: camelCase (`getAlbums`, `createTicket`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`, `MAX_RETRIES`)

## Import Organization

```typescript
// 外部ライブラリ
import { Server } from '@modelcontextprotocol/sdk/server/index.js'

// 内部モジュール（機能ドメイン）
import { RedmineClient } from './redmine/api.js'

// 型定義
import type { Project } from './redmine/types.js'

// ユーティリティ
import { logger } from './utils/logger.js'
```

**Import Rules**:
- 外部ライブラリ → 内部モジュール → 型定義 → ユーティリティの順
- 相対パスは同一ドメイン内のみ使用
- ESモジュール形式（`.js`拡張子を明記）

## Code Organization Principles

### 型安全性
- すべてのAPI レスポンスに型定義を提供
- ツールパラメータはJSON Schemaで定義

### テスト可能性
- API クライアントはモック化可能な設計
- 依存性注入パターンの使用を推奨

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
