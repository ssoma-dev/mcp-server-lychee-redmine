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
