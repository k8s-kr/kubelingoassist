# Release Guide

## Versioning Policy

This project follows [Semantic Versioning](https://semver.org/).

| Version | Criteria |
|---------|----------|
| `0.0.x` | Feature additions, bug fixes |
| `0.1.0` | Stabilization + major features complete |
| `1.0.0` | TBD |

## Release Trigger

- Maintainer discretion
- When meaningful features are ready

## Release Checklist

1. [ ] Create PR: `develop` → `main`
2. [ ] Update `CHANGELOG.md`
   - Move items from `[Unreleased]` to new version section
   - Add release date: `[x.x.x] - YYYY-MM-DD`
3. [ ] Update `package.json` version
4. [ ] Merge PR
5. [ ] Create git tag: `vx.x.x`
   ```bash
   git tag v0.0.x
   git push origin v0.0.x
   ```
6. [ ] Build and publish (optional)
   ```bash
   npm run package
   ```

## Changelog Guidelines

When adding to CHANGELOG.md:

- **Added**: New features
- **Changed**: Changes to existing features
- **Fixed**: Bug fixes
- **Removed**: Removed features

Only record user-facing changes. Internal refactoring can be omitted.
