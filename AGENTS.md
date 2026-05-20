# Repository Instructions

## API Changes

When adding, modifying, or debugging API-related code, always read `docs/api.md` first.

Use `docs/api.md` as the source of truth for:

- endpoint paths
- HTTP methods
- query/path parameters
- request bodies
- response shapes
- upload and multipart rules

Before editing API clients, service functions, API-calling hooks, or screens that call backend APIs, check `docs/api.md` and align the implementation with it.

Do not infer API contracts from existing frontend code if they conflict with `docs/api.md`.
