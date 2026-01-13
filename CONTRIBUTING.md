# Contributing to KubeLingoAssist

Thank you for your interest in contributing to KubeLingoAssist! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Branch Strategy](#branch-strategy)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)

## Branch Strategy

We use a simplified Git Flow strategy:

```
main ────────────────────────→  (stable releases only)
       \
        develop ─────────────→  (integration branch)
                 \       /
                  feature/xxx
```

### Branch Types

| Branch | Purpose | Base Branch | Merge Target |
|--------|---------|-------------|--------------|
| `main` | Stable releases, version tags | - | - |
| `develop` | Integration branch for features | `main` | `main` (on release) |
| `feature/*` | New features | `develop` | `develop` |
| `fix/*` | Bug fixes | `develop` | `develop` |
| `hotfix/*` | Urgent fixes for production | `main` | `main` and `develop` |

### Workflow

1. Create a feature branch from `develop`
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit

3. Push and create a Pull Request to `develop`
   ```bash
   git push origin feature/your-feature-name
   ```

4. After review and approval, your PR will be merged into `develop`

## Development Setup

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- VS Code (for testing the extension)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/k8s-kr/kubelingoassist.git
   cd kubelingoassist
   ```

2. Install dependencies (root and UI)
   ```bash
   npm install
   cd ui && npm install && cd ..
   ```

### Build

Build the entire project (extension + UI):
```bash
npm run build
```

This runs:
1. `build-ui` - Builds the React UI in `ui/` folder
2. `tsc` - Compiles TypeScript to JavaScript

### Running in Development

1. Open the project in VS Code
2. Press `F5` to launch the Extension Development Host
3. A new VS Code window will open with the extension loaded
4. Open a [kubernetes/website](https://github.com/kubernetes/website) repository to test

> **Tip:** After making changes, press `Ctrl+Shift+F5` (or `Cmd+Shift+F5` on Mac) to reload the extension.

### Running Tests

```bash
npm run test
```

### Packaging

To create a `.vsix` package for local installation:
```bash
npm run package
```

This generates `kubelingoassist-x.x.x.vsix` in the project root.

To install the package locally:
```bash
code --install-extension kubelingoassist-x.x.x.vsix
```

## Making Changes

1. Ensure your branch is up to date with `develop`
   ```bash
   git checkout develop
   git pull origin develop
   git checkout your-branch
   git rebase develop
   ```

2. Make focused, atomic changes
   - Each commit should represent a single logical change
   - Keep commits small and reviewable

3. Test your changes locally before pushing

## Commit Message Convention (Recommended)

We recommend using simple prefixes for commit messages. This is a guideline, not a strict requirement.

### Recommended Format

```
<type>: <subject>
```

### Common Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `refactor` | Code refactoring |
| `chore` | Maintenance tasks |

### Examples

```bash
feat: add scroll sync for split view
fix: handle empty links correctly
docs: update README
refactor: extract file utilities
chore: update dependencies
```

> **Note:** Don't worry too much about getting the type exactly right. Clear and descriptive commit messages are more important than strict convention compliance.

## Pull Request Process

### Before Submitting

- [ ] Ensure your code builds without errors (`npm run build`)
- [ ] Run tests and ensure they pass (`npm run test`)
- [ ] Update documentation if needed
- [ ] Rebase your branch on latest `develop`

### Creating a Pull Request

1. Push your branch to the repository
2. Create a PR targeting the `develop` branch
3. Fill out the PR template completely
4. Request review from maintainers

### Review Process

1. At least one maintainer approval is required
2. All CI checks must pass
3. Address all review comments
4. Squash commits if requested

### After Merge

- Delete your feature branch
- Pull the latest `develop` to keep your local branch updated

## Questions?

If you have questions, feel free to:
- Open an issue with the `question` label
- Reach out to the maintainers

Thank you for contributing!
