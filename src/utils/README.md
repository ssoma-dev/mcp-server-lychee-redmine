# Utilities Domain

**Domain**: Shared Utilities
**Purpose**: ログ、エラーハンドリング、リトライロジック

## Responsibilities

- 構造化ログ出力（JSON形式）
- センシティブデータのマスキング
- エラーの標準化と変換
- 指数バックオフリトライロジック

## Components

- Logger: 4レベルログ（DEBUG, INFO, WARN, ERROR）、レスポンスタイム計測
- Error Handler: HTTPエラーコードからApiErrorへの変換
- Retry Handler: 5xxエラー時の自動リトライ（最大3回）、429 Rate Limit対応

## Usage

```typescript
import { logger } from './utils/logger.js';
import { withRetry } from './utils/retry.js';
import { fromHttpError } from './utils/error-handler.js';

// Logger with sensitive data masking
logger.info('API call', { url, apiKey: '***' });

// Retry with exponential backoff
const result = await withRetry(async () => {
  return await apiClient.get('/projects.json');
});
```
