# Implementation Tasks

## Project Overview
Lychee Redmine MCP Serverの実装タスクです。TypeScript + Node.js 20+で、MCP標準プロトコルに準拠したサーバーを構築し、Lychee Redmine REST APIと統合します。

## Task Breakdown

- [ ] 1. プロジェクト基盤とセットアップ
- [x] 1.1 (P) プロジェクト初期化と依存関係のセットアップ
  - package.jsonを作成し、Node.js 22.18.0以上、TypeScript 5.x (strict mode) を指定
  - MCP SDK (@modelcontextprotocol/sdk@1.25.1)、zod@3.25+、axios@1.x、vitest、ESLint、Prettierを依存関係に追加
  - TypeScript strict mode設定（tsconfig.json）、ESLint/Prettier設定を構成
  - _Requirements: 1.3, 1.4, 9.4, 9.6_

- [x] 1.2 (P) プロジェクト構造とディレクトリレイアウトの作成
  - /src/server/（MCP Server Core）、/src/redmine/（Redmine Integration）、/src/config/（Configuration）、/src/utils/（Utilities）ディレクトリを作成
  - エントリーポイント (src/index.ts) を用意
  - ESモジュール形式（.js拡張子明記）のインポート規約を適用
  - _Requirements: 1.3, 1.4_

- [ ] 2. ユーティリティ基盤の構築
- [x] 2.1 (P) ロガー機能の実装
  - DEBUG/INFO/WARN/ERRORの4レベルログをサポート
  - JSON形式で構造化ログを出力（タイムスタンプ、レベル、メタデータ）
  - APIキー、passwordなどセンシティブフィールドの自動マスキング機能
  - LOG_LEVEL環境変数による出力レベル制御
  - レスポンスタイム計測機能（measureTime）の実装
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2.2 (P) エラーハンドラーの実装
  - HTTPエラーコード（4xx/5xx）からApiError型への変換機能
  - タイムスタンプ、エンドポイント、リクエストIDを含む標準化されたエラーレスポンス
  - エラーカテゴリの分類（validation、authentication、not_found、conflict、server、timeout、network、internal）
  - _Requirements: 7.2, 7.3, 7.4_

- [x] 2.3 (P) リトライハンドラーの実装
  - 5xxエラー時の指数バックオフリトライ（初回1秒、2回目2秒、3回目4秒、最大3回）
  - 429 Rate Limitエラー時のRetry-Afterヘッダー対応
  - リトライ対象エラーの判定ロジック（5xxはリトライ、4xxは即座返却）
  - リトライ回数とラストエラーを含むRetryExhaustedError
  - _Requirements: 7.1, 7.2, 7.5_

- [ ] 3. 設定管理とバリデーション
- [x] 3.1 環境変数バリデーターの実装
  - 必須設定項目（LYCHEE_REDMINE_URL、LYCHEE_REDMINE_API_KEY）の存在確認
  - URLのHTTPSフォーマット検証（要件2.4）
  - APIキーの非空文字列チェック
  - Zodスキーマによるバリデーション実装
  - _Requirements: 2.3, 10.3, 10.5_

- [ ] 3.2 設定ローダーの実装
  - 環境変数からの設定読み込み（優先度高）
  - 設定ファイル（JSON/YAML）からの読み込み（オプション、フォールバック）
  - デフォルト値の提供（logLevel: 'INFO', timeout: 30000, retryMaxAttempts: 3）
  - Environment Validatorを呼び出して設定を検証
  - 設定エラー時の適切なエラーメッセージとプロセス終了
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 4. Redmine API統合とデータモデル
- [ ] 4.1 (P) Redmine型定義の作成
  - Project、Issue、User、Member、Milestone、Scheduleなどのエンティティ型定義
  - PaginationParams、PaginatedResponse、Result<T, E>、ApiErrorなどの共通型定義
  - Zodスキーマによるランタイムバリデーション用スキーマ定義
  - すべてのAPI レスポンス型の包括的な定義（カスタムフィールド含む）
  - _Requirements: 9.1, 9.2, 9.4_

- [ ] 4.2 Redmine API Clientの実装
  - axiosインスタンス作成とX-Redmine-API-Keyヘッダーの自動付与（インターセプター）
  - HTTPS通信の強制、タイムアウト設定（30秒）
  - getProjects、getProject、searchIssues、createIssue、updateIssue、getUsers、getProjectMembersメソッド実装
  - getMilestones（Lychee固有API: /lychee/api/v1/projects/:id/milestones.json）の実装
  - ページネーション対応（デフォルト25件/ページ、最大100件/ページ）
  - Result<T, E>型によるエラーハンドリング
  - RetryHandlerでAPI呼び出しをラップ
  - レスポンスのZodバリデーションと型安全な変換
  - APIキーの平文ログ出力禁止の徹底
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3_

- [ ] 4.3 getScheduleメソッドの実装
  - プロジェクトのIssuesとMilestonesを集約してSchedule型を構築
  - 最早開始日、最遅終了日、進捗率（加重平均）、依存関係情報の算出
  - クリティカルパス分析（オプション機能）
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 5. MCPツール実装
- [ ] 5.1 (P) プロジェクト関連ツール（get_projects、get_project）の実装
  - Zodスキーマによるパラメータ定義（GetProjectsParamsSchema、GetProjectParamsSchema）
  - Redmine API ClientのgetProjectsとgetProjectを呼び出し
  - ページネーション対応、権限チェック、404エラーハンドリング
  - Result<T, E>型のMCPレスポンスへの変換
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.2, 9.3_

- [ ] 5.2 (P) チケット関連ツール（search_issues、create_issue、update_issue）の実装
  - SearchIssuesParamsSchema、CreateIssueParamsSchema、UpdateIssueParamsSchemaのZod定義
  - フィルタ条件（プロジェクト、ステータス、担当者、キーワード）による検索機能
  - チケット作成時の必須パラメータ（project_id、subject）バリデーション
  - カスタムフィールド対応、優先度・担当者・期日設定
  - 部分更新機能（指定フィールドのみ更新）
  - 409 Conflictエラーハンドリング
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.2, 9.3_

- [ ] 5.3 (P) リソース管理ツール（get_users、get_project_members）の実装
  - GetUsersParamsSchema、GetProjectMembersParamsSchemaのZod定義
  - ユーザー情報（ID、名前、メール、ロール、ステータス）の取得
  - プロジェクトメンバーとロール情報の取得
  - ページネーション対応
  - _Requirements: 5.1, 5.2, 5.3, 9.2, 9.3_

- [ ] 5.4 (P) スケジュール情報ツール（get_schedule）の実装
  - GetScheduleParamsSchemaのZod定義
  - Redmine API ClientのgetScheduleメソッドを呼び出し
  - スケジュール情報（開始日、終了日、進捗率、マイルストーン、依存関係）をJSON形式で返却
  - クリティカルパス情報の提供
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 9.2, 9.3_

- [ ] 6. MCP Server Coreの実装
- [ ] 6.1 ツールレジストリの実装
  - Map<string, MCPToolDefinition>によるツール管理
  - ツール登録機能（重複チェック含む）
  - listTools、getToolメソッドの実装
  - ツール一覧取得（tools/list）とハンドラーマッピング
  - _Requirements: 12.1, 12.2, 12.3_

- [ ] 6.2 MCPサーバー起動とプロトコル実装
  - @modelcontextprotocol/sdkのServerクラスとStdioServerTransportの使用
  - stdio経由でのJSON-RPC 2.0プロトコル実装
  - Config Loaderによる設定読み込みと起動時バリデーション
  - 設定エラー時の適切なエラーメッセージとプロセス終了
  - 8つのMCPツール（get_projects、get_project、search_issues、create_issue、update_issue、get_users、get_project_members、get_schedule）の登録
  - クライアント初期化リクエストの処理とサーバー機能（ツール、リソース、プロンプト）の返却
  - シャットダウン処理の実装
  - _Requirements: 1.1, 1.2, 1.5, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 7. テスト実装
- [ ] 7.1 (P) ユーティリティのユニットテスト
  - Logger: ログレベル制御、センシティブデータマスキング、JSON形式出力検証
  - Error Handler: HTTPエラー変換、タイムスタンプ付与、エラーカテゴリ分類検証
  - Retry Handler: 指数バックオフロジック、リトライ回数制限、429エラーRetry-After対応検証
  - _Requirements: 11.1, 11.2_

- [ ] 7.2 (P) 設定管理のユニットテスト
  - Environment Validator: 必須項目チェック、URLフォーマット、HTTPS検証、APIキー検証
  - Config Loader: 環境変数読み込み、デフォルト値適用、設定ファイルフォールバック、バリデーションエラー
  - _Requirements: 11.1, 11.2_

- [ ] 7.3 (P) MCPツールのユニットテスト
  - すべてのツールのZodバリデーション検証
  - パラメータエラー時のToolError (type: 'validation') 変換
  - Result<T, E>型の正しい生成
  - モック化されたRedmine API Clientとの統合テスト
  - _Requirements: 11.1, 11.2, 11.4_

- [ ] 7.4 Redmine API Clientのインテグレーションテスト
  - モックサーバー（msw等）を使用したAPI呼び出しテスト
  - 認証ヘッダー（X-Redmine-API-Key）の検証
  - ページネーション処理の検証
  - エラーレスポンス（401、403、404、500等）のハンドリング検証
  - リトライロジックの動作確認（5xxエラー、429エラー）
  - _Requirements: 11.2, 11.4_

- [ ] 7.5 MCP Server統合テスト
  - MCP Server起動、ツール登録、tools/listレスポンスの検証
  - クライアント→MCP Server→API Client→モックRedmine APIのEnd-to-Endフロー
  - 設定エラー時のプロセス終了動作確認
  - _Requirements: 11.2, 11.5_

- [ ] 7.6* テストカバレッジ80%以上の達成確認
  - vitestカバレッジレポート生成
  - 全モジュールのカバレッジ確認
  - 未カバー箇所の追加テスト実装
  - CI/CDパイプラインでの自動テスト実行設定
  - _Requirements: 11.3, 11.5_

- [ ] 8. 統合とデプロイ準備
- [ ] 8.1 全コンポーネント統合とエンドツーエンド動作確認
  - すべてのMCPツールがServer Core経由で呼び出し可能であることを確認
  - 実際のLychee Redmineインスタンスとの接続テスト（環境変数設定）
  - エラーハンドリング、リトライ、ログ出力の統合動作確認
  - パフォーマンス要件（p50 < 1s、p95 < 3s、p99 < 10s）の確認
  - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 2.4, 2.5, 2.6, 12.1, 12.2_

- [ ] 8.2 ESLint/Prettier静的解析と型チェック
  - TypeScript strict modeコンパイルエラーゼロ確認
  - ESLintルール違反ゼロ確認
  - Prettierフォーマット適用
  - `any`型使用の完全排除確認
  - _Requirements: 9.4, 9.6_

## Requirements Coverage

### 全要件のカバレッジマトリクス

| Requirement | 要件概要 | 対応タスク |
|-------------|---------|-----------|
| 1.1, 1.2 | JSON-RPC 2.0 over stdio、クライアント初期化 | 6.2, 8.1 |
| 1.3, 1.4 | Node.js 20+、TypeScript strict mode | 1.1, 1.2, 8.2 |
| 1.5 | 起動時設定エラー検出と終了 | 3.2, 6.2, 8.1 |
| 2.1, 2.2 | 環境変数読み込み、APIキー平文ログ禁止 | 4.2, 8.1 |
| 2.3 | APIキー未設定時起動エラー | 3.1 |
| 2.4 | HTTPS強制 | 3.1, 4.2 |
| 2.5, 2.6 | API認証失敗エラー、複数インスタンス対応 | 4.2, 8.1 |
| 3.1, 3.2, 3.3, 3.4, 3.5 | プロジェクト一覧・詳細取得、ページネーション、404エラー、権限チェック | 4.2, 5.1 |
| 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7 | チケット作成・更新・検索、バリデーション、カスタムフィールド、409エラー | 4.2, 5.2 |
| 5.1, 5.2, 5.3 | ユーザー・メンバー一覧取得、ロール情報 | 4.2, 5.3 |
| 5.4 | ワークロードデータ（Lychee固有） | 4.2（Phase 2対応） |
| 6.1, 6.2, 6.3, 6.4 | スケジュール情報、依存関係、クリティカルパス、ガントチャートJSON | 4.3, 5.4 |
| 7.1, 7.2 | 5xxエラーリトライ、3回失敗後エラー返却 | 2.3, 7.1 |
| 7.3, 7.4 | タイムアウト30秒、エラーログ詳細 | 2.2, 4.2 |
| 7.5 | レート制限対応 | 2.3, 7.1 |
| 8.1, 8.2, 8.3, 8.4, 8.5 | ログ4レベル、LOG_LEVEL環境変数、API呼び出しログ、レスポンスタイム、スタックトレース | 2.1, 7.1 |
| 9.1, 9.2, 9.3, 9.4, 9.5, 9.6 | TypeScript型定義、JSON Schema、バリデーションエラー、`any`禁止、入力サニタイゼーション、ESLint | 4.1, 5.1, 5.2, 5.3, 5.4, 8.2 |
| 10.1, 10.2, 10.3, 10.4, 10.5 | 環境変数・設定ファイル、環境変数優先、必須項目検証、デフォルト値、設定エラー | 3.1, 3.2, 7.2 |
| 11.1, 11.2, 11.3, 11.4, 11.5 | モック化可能設計、ユニット・統合テスト、カバレッジ80%、外部APIモック、CI/CD自動テスト | 7.1, 7.2, 7.3, 7.4, 7.5, 7.6 |
| 12.1, 12.2, 12.3, 12.4, 12.5 | 8ツール登録、tools/list、JSON Schema、リソース・プロンプト機能 | 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 8.1 |

## Task Summary

- **合計**: 8メジャータスク、26サブタスク
- **全12要件カバー済み**
- **平均タスクサイズ**: 1-3時間/サブタスク
- **並列実行可能タスク**: 12タスク（(P)マーク付き）

## Implementation Notes

### フェーズ1スコープ
- 標準Redmine API + Lychee固有マイルストーンAPI（/lychee/api/v1/projects/:id/milestones.json）
- 8つのMCPツール実装
- テストカバレッジ80%以上

### フェーズ2以降（本タスクリスト対象外）
- EVM指標取得 (/levm/api/...)
- コスト管理・経費情報 (/lychee_cost_expenses.json)
- プロジェクトレポート履歴 (/project_reports/histories.json)
- 実労働時間インポート (/lychee_time_management/api/...)
- ベースライン管理 (/baselines)

### 技術スタック確認
- Node.js 22.18.0+（型ストリッピング機能）
- TypeScript 5.x (strict mode)
- @modelcontextprotocol/sdk@1.25.1
- zod@3.25+
- axios@1.x
- vitest
- ESLint + Prettier
