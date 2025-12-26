# Requirements Document

## Project Description (Input)
lychee-redmine-mcp-server

## Introduction
本仕様書は、Lychee Redmineプロジェクト管理ツールとAIアシスタント（Claude等）を統合するためのModel Context Protocol (MCP)サーバーの要件を定義します。MCPサーバーは、stdio経由でJSON-RPC 2.0プロトコルを使用し、Lychee RedmineのREST APIを介してプロジェクト情報の取得、チケット操作、リソース管理などの機能を提供します。

## Requirements

### Requirement 1: MCPサーバー基盤
**Objective:** As an AI assistant, I want MCP標準プロトコルに準拠したサーバー基盤, so that Claudeやその他のMCPクライアントと通信できる

#### Acceptance Criteria
1. The MCP Server shall implement JSON-RPC 2.0 protocol over stdio
2. When クライアントから初期化リクエストを受信, the MCP Server shall サーバー機能（ツール、リソース、プロンプト）を返す
3. The MCP Server shall Node.js 20以上で動作する
4. The MCP Server shall TypeScript strict modeで実装される
5. When サーバー起動時に設定エラーを検出, the MCP Server shall 適切なエラーメッセージを出力して終了する

### Requirement 2: Lychee Redmine API認証
**Objective:** As a system administrator, I want セキュアなAPI認証機能, so that Lychee Redmineへの安全なアクセスが可能になる

#### Acceptance Criteria
1. The Authentication Module shall 環境変数からLychee RedmineのURL、APIキーを読み込む
2. The Authentication Module shall APIキーを平文でログに出力してはならない
3. When APIキーが環境変数に存在しない, the Authentication Module shall 起動エラーを発生させる
4. The Authentication Module shall HTTPS経由でのAPI通信を強制する
5. If API認証が失敗, then the Authentication Module shall エラーコードと詳細メッセージをクライアントに返す
6. The Authentication Module shall 複数のLychee Redmineインスタンス設定に対応する

### Requirement 3: プロジェクト情報取得
**Objective:** As an AI assistant, I want プロジェクト一覧と詳細情報を取得できる, so that ユーザーにプロジェクト状況を報告できる

#### Acceptance Criteria
1. When ユーザーがプロジェクト一覧を要求, the MCP Server shall すべてのアクセス可能なプロジェクトを返す
2. When 特定のプロジェクトIDを指定, the MCP Server shall プロジェクト詳細（名前、説明、ステータス、メンバー）を返す
3. The MCP Server shall ページネーションをサポートし、デフォルトで25件/ページを返す
4. If プロジェクトが存在しない, then the MCP Server shall 404エラーを返す
5. The MCP Server shall プロジェクト情報にアクセス権限をチェックする

### Requirement 4: チケット操作
**Objective:** As an AI assistant, I want チケットの作成・更新・検索ができる, so that ユーザーのタスク管理を支援できる

#### Acceptance Criteria
1. When チケット作成リクエストを受信, the MCP Server shall プロジェクトID、件名、説明を含むチケットを作成する
2. When チケット作成時に必須パラメータが欠損, the MCP Server shall バリデーションエラーを返す
3. The MCP Server shall チケットの優先度、担当者、期日の設定をサポートする
4. When チケット検索リクエストを受信, the MCP Server shall フィルタ条件（プロジェクト、ステータス、担当者、キーワード）に基づいて検索する
5. When チケット更新リクエストを受信, the MCP Server shall 指定されたフィールドのみを更新する
6. The MCP Server shall チケット情報にカスタムフィールドを含める
7. If チケット更新時にコンフリクトを検出, then the MCP Server shall 409エラーを返す

### Requirement 5: リソース管理機能
**Objective:** As an AI assistant, I want リソース（ユーザー、メンバー）情報を取得できる, so that タスク割り当てやワークロード分析ができる

#### Acceptance Criteria
1. When ユーザー一覧を要求, the MCP Server shall すべてのアクティブユーザーを返す
2. When プロジェクトメンバー一覧を要求, the MCP Server shall 指定プロジェクトのメンバーとロールを返す
3. The MCP Server shall ユーザー情報（ID、名前、メールアドレス、ロール）を含める
4. The MCP Server shall ユーザーの稼働状況やワークロードデータを提供する（Lychee Redmine固有機能）

### Requirement 6: ガントチャートとスケジュール情報
**Objective:** As an AI assistant, I want プロジェクトスケジュール情報を取得できる, so that タイムライン分析や遅延警告を提供できる

#### Acceptance Criteria
1. When スケジュール情報を要求, the MCP Server shall プロジェクトの開始日、終了日、進捗率を返す
2. The MCP Server shall チケット間の依存関係情報を提供する
3. When クリティカルパスを要求, the MCP Server shall ボトルネックとなるチケットを特定する
4. The MCP Server shall ガントチャートデータをJSON形式で返す

### Requirement 7: エラーハンドリングとリトライ
**Objective:** As a system operator, I want 信頼性の高いエラーハンドリング, so that 一時的なネットワークエラーでも運用が継続できる

#### Acceptance Criteria
1. If Lychee Redmine APIが5xx エラーを返す, then the MCP Server shall 指数バックオフで最大3回リトライする
2. If 3回のリトライ後も失敗, then the MCP Server shall エラー詳細をクライアントに返す
3. When ネットワークタイムアウトが発生, the MCP Server shall 30秒でタイムアウトし、エラーを返す
4. The MCP Server shall エラーログにタイムスタンプ、エラーコード、APIエンドポイント、リクエストIDを含める
5. If レート制限に達する, then the MCP Server shall 適切な待機時間後にリトライする

### Requirement 8: ログと監視
**Objective:** As a system operator, I want 詳細なログ機能, so that トラブルシューティングと監視が可能になる

#### Acceptance Criteria
1. The MCP Server shall DEBUG、INFO、WARN、ERRORの4レベルのログをサポートする
2. When 環境変数LOG_LEVELが設定されている, the MCP Server shall 指定されたレベル以上のログを出力する
3. The MCP Server shall すべてのAPI呼び出しをログに記録する（APIキーを除く）
4. The MCP Server shall レスポンスタイムを計測し、パフォーマンスログを出力する
5. When エラーが発生, the MCP Server shall スタックトレースを含むエラーログを出力する

### Requirement 9: 型安全性とバリデーション
**Objective:** As a developer, I want 厳密な型定義とバリデーション, so that ランタイムエラーを防げる

#### Acceptance Criteria
1. The MCP Server shall すべてのLychee Redmine APIレスポンスにTypeScript型定義を提供する
2. The MCP Server shall MCPツールパラメータをJSON Schemaで定義する
3. When 不正なパラメータを受信, the MCP Server shall バリデーションエラーをクライアントに返す
4. The MCP Server shall `any`型の使用を禁止する（TypeScript strict mode）
5. The MCP Server shall すべての外部入力をサニタイズする
6. The MCP Server shall　ESLint による静的解析

### Requirement 10: 設定管理
**Objective:** As a system administrator, I want 柔軟な設定管理, so that 複数環境で容易にデプロイできる

#### Acceptance Criteria
1. The MCP Server shall 環境変数と設定ファイル（JSON/YAML）の両方をサポートする
2. When 環境変数と設定ファイルの両方が存在, the MCP Server shall 環境変数を優先する
3. The MCP Server shall 必須設定項目（LYCHEE_REDMINE_URL、LYCHEE_REDMINE_API_KEY）を起動時に検証する
4. The MCP Server shall オプション設定項目（タイムアウト、リトライ回数、ログレベル）にデフォルト値を提供する
5. If 設定ファイルのフォーマットが不正, then the MCP Server shall 詳細なエラーメッセージを出力して終了する

### Requirement 11: テスト可能性
**Objective:** As a developer, I want テスト可能な設計, so that 高品質なコードを維持できる

#### Acceptance Criteria
1. The MCP Server shall API クライアントがモック化可能な設計を採用する
2. The MCP Server shall ユニットテストとインテグレーションテストの両方を提供する
3. The MCP Server shall テストカバレッジ80%以上を維持する
4. The MCP Server shall 外部API呼び出しをモック化したテストを実装する
5. The MCP Server shall CI/CD パイプラインで自動テストを実行する

### Requirement 12: MCPプロトコル機能
**Objective:** As an AI assistant, I want MCP標準機能（ツール、リソース、プロンプト）を実装する, so that クライアントが機能を発見して利用できる

#### Acceptance Criteria
1. The MCP Server shall 以下のツールを登録する: `get_projects`, `get_project`, `search_issues`, `create_issue`, `update_issue`, `get_users`, `get_project_members`, `get_schedule`
2. When クライアントがtools/listをリクエスト, the MCP Server shall すべての利用可能なツールとそのスキーマを返す
3. The MCP Server shall 各ツールにJSON Schemaで定義されたパラメータ仕様を提供する
4. The MCP Server shall リソース機能を使用してプロジェクト情報を公開する（オプション）
5. The MCP Server shall プロンプトテンプレート機能をサポートする（オプション）

