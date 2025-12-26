# Research & Design Decisions

## Summary
- **Feature**: `lychee-redmine-mcp-server`
- **Discovery Scope**: Complex Integration (新規MCP Server + 外部REST API統合)
- **Key Findings**:
  - MCP TypeScript SDK 1.25.1がstdio/Streamable HTTPトランスポートとZodバリデーションを提供
  - Redmine REST APIは`X-Redmine-API-Key`ヘッダー認証を標準サポート
  - Node.js 22.18.0+の型ストリッピング機能により開発時のビルド不要

## Research Log

### MCP TypeScript SDK実装パターン
- **Context**: MCP Serverの標準的な実装方法とベストプラクティスの調査
- **Sources Consulted**:
  - [MCP TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
  - [MCP Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18)
  - [How to build MCP servers with TypeScript SDK](https://dev.to/shadid12/how-to-build-mcp-servers-with-typescript-sdk-1c28)
- **Findings**:
  - SDK v1.25.1が最新バージョン（2025年時点）
  - トランスポート: stdio（推奨）、Streamable HTTP（リモートサーバー用）、SSE（非推奨）
  - Zod v3.25+が必須ピア依存関係（JSON Schemaバリデーション用）
  - 公式examplesディレクトリに実装サンプル (`examples/server/`)
  - Node.js 22.18.0+のビルトイン型ストリッピングにより即時リロード可能
- **Implications**:
  - stdioトランスポートを採用（ローカル統合用途）
  - Zodによるツールパラメータバリデーション実装必須
  - `@modelcontextprotocol/sdk`と`zod`を依存関係に追加

### Redmine REST API仕様
- **Context**: Lychee RedmineのベースとなるRedmine REST APIの認証方式とエンドポイント調査
- **Sources Consulted**:
  - [Redmine REST API Documentation](https://www.redmine.org/projects/redmine/wiki/rest_api)
  - [REST API Authentication](https://www.redmineup.com/pages/blog/rest-api-in-redmine-definition-principles-authentication)
  - [Planio Redmine API](https://plan.io/api/)
- **Findings**:
  - 認証方式:
    - `X-Redmine-API-Key`ヘッダー（推奨）
    - HTTP Basic認証（互換性用）
    - URLパラメータ`?key=xxx`（非推奨）
  - 主要エンドポイント:
    - `/projects` (Stable, v1.0+) - プロジェクト一覧・詳細
    - `/issues` (Stable, v1.0+) - チケットCRUD操作
    - `/users` (Stable, v1.1+) - ユーザー情報
    - `/issue_relations` (Alpha) - チケット依存関係
  - レスポンス形式: JSON/XML（Content-Typeで指定）
  - ページネーション: `total_count`, `limit`, `offset`属性
  - デフォルトlimit: 25件/ページ
- **Implications**:
  - `X-Redmine-API-Key`ヘッダーを使用した認証実装
  - 環境変数`LYCHEE_REDMINE_API_KEY`から読み込み
  - ページネーション対応のAPIクライアント設計
  - JSON形式のレスポンス処理（`Accept: application/json`）

### MCP Tools/Resources/Prompts実装
- **Context**: MCPプロトコルの3つの主要機能の実装詳細調査
- **Sources Consulted**:
  - [MCP Tools Documentation](https://modelcontextprotocol.info/docs/concepts/tools/)
  - [@modelcontextprotocol/sdk npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- **Findings**:
  - **Tools**: LLMがサーバーにアクション実行を要求（計算、副作用、ネットワーク呼び出し）
  - **Resources**: 読み取り専用データの公開（ユーザーやモデルへの情報提供）
  - **Prompts**: 再利用可能なテンプレート（一貫したLLM対話）
  - ツール定義にはJSON Schema必須
  - Server.setRequestHandler()でツール登録
- **Implications**:
  - 8つのツール実装: `get_projects`, `get_project`, `search_issues`, `create_issue`, `update_issue`, `get_users`, `get_project_members`, `get_schedule`
  - Resources機能はオプション（フェーズ1では未実装）
  - Prompts機能はオプション（フェーズ1では未実装）

### エラーハンドリング戦略
- **Context**: REST APIとの通信における信頼性確保の調査
- **Sources Consulted**:
  - [Implementing MCP: Tips, tricks and pitfalls](https://nearform.com/digital-community/implementing-model-context-protocol-mcp-tips-tricks-and-pitfalls/)
- **Findings**:
  - 指数バックオフリトライパターンが標準的
  - タイムアウト設定推奨（通常30秒）
  - レート制限対応（429エラーハンドリング）
  - 詳細ログによる監視可能性確保
- **Implications**:
  - 指数バックオフで最大3回リトライ（5xxエラー時）
  - 30秒タイムアウト
  - エラーログにタイムスタンプ、エラーコード、APIエンドポイント、リクエストIDを記録

### TypeScript型安全性
- **Context**: Strict modeでの型定義とバリデーション戦略
- **Sources Consulted**: Steering context (tech.md)
- **Findings**:
  - `any`型の使用禁止がプロジェクト標準
  - Zodによるランタイムバリデーション
  - ESLintによる静的解析
- **Implications**:
  - Redmine APIレスポンスの完全な型定義作成
  - Zodスキーマによるツールパラメータバリデーション
  - Result<T, E>型によるエラーハンドリング

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Domain-Driven Design (DDD) | Lychee/Redmine統合を独立ドメインとして分離 | 明確なドメイン境界、独立したテスト、並行開発可能 | 初期設計コスト | ✅ 選択 - Steeringガイドラインに準拠 |
| Layered Architecture | MCP層、API Client層、ドメイン層の3層構造 | シンプルな依存関係、理解しやすい | ドメインロジックの配置が曖昧 | 部分採用（MCP Serverコアは独立レイヤー） |
| Hexagonal (Ports & Adapters) | MCPをポート、Redmine APIをアダプターとして抽象化 | 高い柔軟性、テスト容易性 | 過剰設計のリスク | 不採用 - 現時点でのオーバーエンジニアリング |

## Design Decisions

### Decision: `ドメイン分離アーキテクチャの採用`
- **Context**: Lychee RedmineとMCPサーバー基盤の統合設計
- **Alternatives Considered**:
  1. モノリシックな単一モジュール構造 — すべての機能を1つのディレクトリに集約
  2. ドメイン分離構造 — MCP Server、Redmine統合、設定管理を独立ドメインとして分離
- **Selected Approach**: ドメイン分離構造を採用
  - `/src/server/` - MCP Server基盤（プロトコル実装、ツール登録）
  - `/src/redmine/` - Redmine統合ドメイン（APIクライアント、型定義、ツール実装）
  - `/src/config/` - 設定管理ドメイン
  - `/src/utils/` - 共通ユーティリティ
- **Rationale**:
  - Steeringガイドライン（structure.md）の「機能ドメイン分離」原則に準拠
  - 各ドメインが独立してテスト・開発可能
  - 将来的な拡張（他システム統合）が容易
- **Trade-offs**:
  - **Benefits**: 明確なドメイン境界、高いテスト可能性、並行開発の容易さ
  - **Compromises**: 初期ディレクトリ構造の設計コスト
- **Follow-up**: 実装時にドメイン間の循環依存が発生しないよう依存関係グラフを監視

### Decision: `stdioトランスポートの採用`
- **Context**: MCPクライアントとの通信方式選択
- **Alternatives Considered**:
  1. stdio - 標準入出力経由のローカル通信
  2. Streamable HTTP - リモートサーバー向けHTTPトランスポート
  3. SSE (Server-Sent Events) - 非推奨のトランスポート
- **Selected Approach**: stdioトランスポート
- **Rationale**:
  - Claudeデスクトップアプリとの統合がユースケース
  - ローカル実行が前提（リモートデプロイ不要）
  - stdio実装がSDKで最もシンプル
- **Trade-offs**:
  - **Benefits**: 実装の簡潔性、デプロイ不要、認証レイヤー不要
  - **Compromises**: リモートアクセス不可（現時点で要件外）
- **Follow-up**: 将来的なリモートアクセス要件が発生した場合はStreamable HTTPへの移行検討

### Decision: `Zodによるパラメータバリデーション`
- **Context**: MCPツールパラメータの検証方式
- **Alternatives Considered**:
  1. Zod - TypeScript型安全なスキーマバリデーション
  2. JSON Schema（生のスキーマ定義） - 型安全性なし
  3. 手動バリデーション - コード内での条件分岐
- **Selected Approach**: Zodスキーマ定義
- **Rationale**:
  - MCP SDK公式の推奨アプローチ（必須ピア依存関係）
  - TypeScript型定義とランタイムバリデーションの一元化
  - MCP仕様のJSON Schemaへの自動変換可能
- **Trade-offs**:
  - **Benefits**: 型安全性、DRY原則、エラーメッセージ自動生成
  - **Compromises**: Zod依存関係の追加
- **Follow-up**: なし（SDK標準のため）

### Decision: `Result<T, E>型によるエラーハンドリング`
- **Context**: API呼び出しとエラー処理の型安全性確保
- **Alternatives Considered**:
  1. Result<T, E>型 - 関数型エラーハンドリング
  2. try-catchによる例外処理 - 従来の命令型アプローチ
  3. エラーコールバック - Node.jsスタイル
- **Selected Approach**: Result<T, E>型の導入
- **Rationale**:
  - 明示的なエラーハンドリング強制
  - 型システムによるエラーケースの追跡
  - Discriminated Unionによる型安全なエラー処理
- **Trade-offs**:
  - **Benefits**: 型安全性、エラー処理の明示化、ランタイムエラー削減
  - **Compromises**: 学習曲線、既存のtry-catchパターンとの乖離
- **Follow-up**: 実装時にResult型ヘルパー関数（ok, err, isOk, isErr）を提供

### Lychee Redmine固有API仕様
- **Context**: Lychee Redmine独自の拡張機能APIエンドポイントの調査
- **Sources Consulted**:
  - Lychee Redmine API仕様書 (lychee_api_specs .pdf)
- **Findings**:
  - **認証方式**: Redmine標準と同じ（`X-Redmine-API-Key`ヘッダー、HTTP Basic認証、URLパラメータ`key`）
  - **Lychee固有APIカテゴリ**:
    1. **ライセンス管理** - `GET /lychee_users.json` - ライセンス数とユーザー情報
    2. **ワークデイズ** - `GET /rest_days.json`, `POST /rest_days/api.json` - 会社休日設定
    3. **ガントチャート** - `/lychee/api/v1/projects/:project_id/milestones.json` - マイルストーンCRUD操作
    4. **ベースライン** - `POST /lychee/api/v1/projects/:project_id/baselines` - プロジェクトベースライン作成
    5. **タイムマネジメント** - `POST /lychee_time_management/api/v1/working_hours.json` - 実労働時間インポート
    6. **EVM** - `GET /levm/api/projects/:project_id/csv_data/line_chart.json` - EVM指標（PV, AC, EV, SPI, CPI, BAC）
    7. **カスタムフィールド** - `/projects/:project_id/custom_fields/:custom_field_id.json` - プロジェクトごとのリスト管理
    8. **コスト管理** - `/projects/:project_id/lychee_cost_expenses.json` - 経費情報CRUD
    9. **プロジェクトレポート** - `/projects/:project_id/project_reports/histories.json` - 指標値履歴
    10. **チェックリスト** - Redmine標準`/issues.json`の拡張（`checklist_items`フィールド追加）
- **Implications**:
  - フェーズ1では基本的なRedmine API統合を優先
  - Lychee固有機能はフェーズ2以降で段階的に追加（特にEVM、ガントチャート、プロジェクトレポート）
  - マイルストーン取得は`get_schedule`ツールの実装に活用可能
  - チェックリスト機能は`create_issue`/`update_issue`で対応可能（オプションパラメータ）

## Risks & Mitigations
- **Risk 1: Lychee Redmine固有API仕様の不明確性** — ✅ 解決済み（API仕様書を確認）
  - **Update**: Lychee固有APIエンドポイントが10カテゴリ存在することを確認
  - **Mitigation**: フェーズ1では標準Redmine API + マイルストーン取得のみ実装、高度な機能（EVM、コスト管理）は後続フェーズ
- **Risk 2: APIレート制限の詳細不明** — Lychee Redmineのレート制限ポリシーが未調査
  - **Mitigation**: 指数バックオフリトライ実装、429エラーハンドリング、Retry-Afterヘッダー対応
- **Risk 3: Node.js 22.18.0+の型ストリッピング機能の安定性** — 新機能のため本番環境での実績が限定的
  - **Mitigation**: 開発時のみ使用、本番ビルドは従来のtsc/tsupを使用
- **Risk 4: Lychee固有機能の複雑性** — EVM、プロジェクトレポートなど高度な機能の統合難易度が不明
  - **Mitigation**: 段階的実装アプローチ採用、フェーズ1は標準API+基本Lychee機能のみ

## References
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — 公式SDK実装
- [MCP Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18) — プロトコル仕様
- [Redmine REST API](https://www.redmine.org/projects/redmine/wiki/rest_api) — API仕様
- [Redmine REST API Authentication](https://www.redmineup.com/pages/blog/rest-api-in-redmine-definition-principles-authentication) — 認証方式
- [How to build MCP servers with TypeScript SDK](https://dev.to/shadid12/how-to-build-mcp-servers-with-typescript-sdk-1c28) — 実装ガイド
