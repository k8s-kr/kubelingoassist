# KubeLingoAssist

A VS Code extension for Kubernetes documentation translation workflows with AI-powered translation and Korean language validation.

## 🚀 Installation & Usage

### Installation
1. Download the latest VSIX file from [Releases](https://github.com/eundms/kubelingoassist/releases)
2. Install in VS Code: `code --install-extension kubelingoassist-x.x.x.vsix`

### Core Features
- **Split View Translation**: `Cmd+Shift+T` (Mac) / `Ctrl+Shift+T` (Windows/Linux)
- **Scroll Synchronization**: `Cmd+Shift+S` (Mac) / `Ctrl+Shift+S` (Windows/Linux)
- **Activity Bar Panel**: Click 🌐 icon for control panel

### 🤖 AI Translation Features (New!)
- **AI-Powered Translation**: `Ctrl+Alt+K` - Translate selected text to Korean
- **Korean Term Validation**: `Ctrl+Alt+V` - Validate Korean terms using National Institute of Korean Language API
- **Translation Quality Analysis**: Analyze translated Korean text for accuracy
- **Multi-Provider Support**: OpenAI GPT, Anthropic Claude, Google Gemini

> 📖 **Detailed AI Features Guide**: See [AI Features Documentation](./docs/AI_FEATURES.md) for comprehensive usage instructions.

### Quick Start with AI Translation
1. Set up AI provider: `Ctrl+Shift+P` → "Configure AI"
2. Select text to translate
3. Use `Ctrl+Alt+K` for Korean translation with automatic validation
4. Check translation quality with built-in analysis tools

## Development

### Prerequisites
- Node.js 18+
- VS Code 1.74.0+

### Setup
```bash
npm install
cd ui && npm install && cd ..
npm run compile
```

### Commands
```bash
npm test          # Run tests
npm run package   # Build VSIX package
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Create a pull request

## 📝 License

MIT