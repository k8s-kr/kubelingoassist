# 🔤 What Is KubeLingoAssist?

KubeLingoAssist is a `VS Code extension` designed to make Kubernetes documentation translation and review faster⚡, smoother🌊, and easier️🏃🏻
It provides two core modes — **Translation Mode** and **Review Mode** — offering an efficient workflow whether you're creating new translations or reviewing existing pull requests.

## Translation Mode

- First, open the English document you want to translate.
- Click the `Open Translation File` button to load the translation file for your selected language.
  - If the translation file doesn't exist, you can create it automatically.
- The English source document and the translation file are displayed side-by-side in split view.
- Opening a your language document instead will automatically open the corresponding English document.
- Scroll synchronization is supported for seamless comparison.

## Review Mode

- Requires `GitHub CLI (gh)` to be installed beforehand.
- Enter a pull request number and click `Fetch PR` to load files that were changed or newly added in the PR. (Supports multiple files.)
- If you're viewing a translation file and click `Open Review File`, the extension automatically finds and opens the corresponding English document in split view.

<br><br>

# ✏️ How to install

- You can install KubeLingoAssist via the link below or by searching for it in VS Code.
  - Open the [KubeLingoAssist page on the Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=KubeLingoAssist.kubelingoassist) and Install.
  - Alternatively, open VS Code, go to the Extensions panel and search for `KubeLingoAssist`, then click Install.

<br><br>

# 🤝 Contributing

Anyone involved in Kubernetes documentation localization—or anyone interested in improving this extension—is welcome to contribute🎉

Whether it's adding new features, fixing bugs, suggesting improvements, or adding support for your native language, feel free to open an issue and let us know! Pull requests are always appreciated.🚀

## Contribution Step

1. Fork the repository
2. Create a Issue & feature branch
4. Make your changes with tests
5. Create a pull request

## Prerequisites
- Node.js 18+
  - Required to run and build the extension.
  - If you don’t have it installed, download it from the official Node.js website.
- VS Code 1.74.0+
  - The extension runs inside VS Code, so you’ll need a recent enough version.
 
## Setup
```bash
npm install
# Installs all dependencies for the main project.

cd ui && npm install && cd ..
# The UI has its own set of dependencies, so this installs everything required for the UI portion.
```

## Commands
```bash
npm test
# Runs the test suite to ensure your changes work correctly.
npm run package   
# Creates a .vsix file, which you can install directly in VS Code for local testing.
```

<br><br>

# 🧪 Local Test
```bash
npm run compile
```
- This command performs two steps:
  - `npm run build-ui` : Builds the UI assets.
  - `npx tsc -p ./` : Compiles TypeScript into JavaScript for the main extension code.

- After compiling, you can create a local build of the extension and test it in your own VS Code environment.

To install a locally built version, run the following command in your terminal from the directory where the generated `.vsix` file exists:
```bash
code --install-extension kubelingoassist-x.x.x.vsix
```
- This allows you to test your modified or newly added features on your local VS Code instance before submitting changes.

<br><br>

# 📝 License

MIT
