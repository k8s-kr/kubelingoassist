# KubeLingoAssist

A VS Code extension for Kubernetes documentation translation workflows.

## Installation & Usage

### Installation
1. Download the latest VSIX file from Releases
- First, download the ZIP file from the [release page](https://github.com/eundms/kubelingoassist/releases).
- Extract the `.vsix file` from the ZIP.
2. Install in VS Code
- Run the following command in VsCode from the location of the .vsix file for the corresponding release version:
```md
code --install-extension kubelingoassist-x.x.x.vsix
```

### Key Features
- **Open Translation Files**: `Cmd+Shift+T` (Mac) / `Ctrl+Shift+T` (Windows/Linux)
- **Scroll Synchronization**: `Cmd+Shift+S` (Mac) / `Ctrl+Shift+S` (Windows/Linux)
- **Activity Bar Panel**: Click 🌐 icon for control panel

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
