# Redmine Integration

**Domain**: Redmine Integration
**Purpose**: Lychee Redmine REST APIとの統合機能

## Responsibilities

- Redmine REST API通信とレスポンス処理
- 型定義（Project, Issue, User, Member, Milestone, Schedule）
- MCPツール実装（8つのツール）
- Zodによるパラメータバリデーション

## Components

- API Client: REST API通信、認証、ページネーション
- Type Definitions: TypeScript型定義とZodスキーマ
- MCP Tools: get_projects, get_project, search_issues, create_issue, update_issue, get_users, get_project_members, get_schedule

## API Integration

- Standard Redmine API: /projects.json, /issues.json, /users.json
- Lychee-specific API: /lychee/api/v1/projects/:id/milestones.json
