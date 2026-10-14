# 🔒 Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in **BetterFront**, please report it responsibly:

1. **Do not open a public GitHub issue** for security vulnerabilities.
2. Open a private GitHub Security Advisory in the repository's **Security** tab, or contact the maintainers directly with a minimal reproduction.
3. Include details of the affected component (e.g., `EXECUTE_SCRIPT` sandboxing, VLM API key handling, or artifact path traversal) and steps to reproduce.

## Security Best Practices When Running BetterFront

- **API Keys**: Store `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` in environment variables (`.env`), never committed to source control or `betterfront.config.json`.
- **Untrusted Scenarios**: The `EXECUTE_SCRIPT` UAT action executes JavaScript inside the target Playwright browser context. Only run UAT scenario JSON files from trusted sources.
