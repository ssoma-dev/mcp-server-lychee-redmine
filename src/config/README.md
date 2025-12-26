# Configuration Domain

**Domain**: Configuration Management
**Purpose**: 環境変数読み込み、設定バリデーション

## Responsibilities

- 環境変数からの設定読み込み（優先度高）
- 設定ファイル（JSON/YAML）からの読み込み（オプション）
- デフォルト値の提供
- 必須設定項目の検証（LYCHEE_REDMINE_URL、LYCHEE_REDMINE_API_KEY）

## Components

- Config Loader: 設定読み込みとバリデーション
- Environment Validator: 設定値のバリデーション（HTTPS検証、APIキー形式チェック）

## Configuration Schema

```typescript
interface AppConfig {
  lycheeRedmine: {
    url: string;        // HTTPS required
    apiKey: string;     // Non-empty string
  };
  server: {
    logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    timeout: number;           // default: 30000
    retryMaxAttempts: number; // default: 3
  };
}
```
