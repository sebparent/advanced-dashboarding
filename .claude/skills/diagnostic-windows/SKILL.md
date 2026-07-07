---
name: diagnostic-windows
description: >
  Use this skill when the user types "/diagnostic-windows", "$diagnostic-windows",
  "windows diagnostic", "diagnostic for windows", "run Windows diagnostic", or
  asks whether a work Windows computer is ready for the bootcamp: using
  PowerShell, reading and editing files, searching the web, downloading
  dependencies, running the app, and previewing the result.
---

# Diagnostic Windows

Run a technical readiness diagnostic for helpers, not for the participants themselves.

The goal is to verify that the participant's work Windows computer is not blocked by local restrictions and can perform the work needed during the Spacefill Bootcamp.

For this bootcamp, "ready to build" means Claude Code can do the practical loop a helper needs: understand a plain-language idea, inspect and change project files, search the web when current information is needed, download project dependencies, run checks, start the app, open the preview, and test visible behavior.

The final answer must be a copy-paste checklist that can be sent or shown to the the Spacefill organizers team.

Rules:
- Run the checks yourself and record real evidence.
- The output can be technical. It is for helpers and the Spacefill organizers, not for the participant.
- Return a checklist that can be copied as-is.
- This is a check/report only. Do not install missing tools, do not change settings, and do not fix the machine during `/diagnostic-windows`.
- It is allowed to test whether dependencies can be downloaded. Prefer a harmless registry check first. Only run `npm install`, `pnpm install`, or `yarn` if dependencies are missing or the helper explicitly asks for a full dependency-download test.
- Do not ask the builder to troubleshoot.
- Do not create git commits.
- Do not test external cloud services or ask for accounts.
- Do not claim that "all tools" work. State exactly what was tested and what is blocked.
- Prefer Windows PowerShell checks because participant computers are expected to run Windows.
- If PowerShell is unavailable, try Command Prompt checks and report that PowerShell must be allowed.
- Bash/Git Bash/WSL checks are optional. Do not mark the machine not ready only because Bash is unavailable, unless the session specifically requires Bash.
- Mark the system `READY` if Claude Code can read and edit project files, run Windows terminal commands, search the web when needed, reach the package registry or download dependencies, run the app, and load the local preview.
- Mark the system `NEEDS ATTENTION` if any core product-crafting ability is blocked: file access, file editing, PowerShell or terminal command execution, Node.js, npm, package download access, app startup, local preview, browser/in-app preview, or web search when the session requires current information.
- If something is missing or blocked, write what the Spacefill organizers should activate, install, allow, or whitelist. The report is meant to be sent or shown to the Spacefill organizers.

Check:
1. Correct project folder is open.
2. Project files can be read.
3. Claude Code can run PowerShell commands commonly needed while building, checking, and previewing the app.
4. Command Prompt is available as a fallback, if relevant.
5. Node.js is installed and available with `node -v`.
6. npm is installed and available with `npm -v`.
7. Optional package runners/managers can be checked if relevant: `npx --version`, `pnpm -v`, `yarn -v`.
8. npm scripts can run from the project folder.
9. Dependencies are already available, or dependency download access works. If dependencies are missing, report that `npm install`, `pnpm install`, or `yarn` must be allowed, and run the needed install command only if the helper explicitly asks.
10. Claude Code can write inside the project when needed.
11. Claude Code can edit an existing project file when needed. For the diagnostic itself, do not leave real project edits behind; use a temporary diagnostic file unless the helper asked to remake this skill.
12. The readiness check passes: `npm run preflight`.
13. The app can run with `npm run dev`.
14. The app can start with `npm start` after a successful production build if needed.
15. The local preview is reachable at `http://localhost:3000`, or at the alternate port chosen by the app if port 3000 is already busy.
16. Claude Code file tools can read and edit project files.
17. Claude Code terminal execution tool works for project commands.
18. A browser or in-app preview tool is available.
19. The browser or in-app preview tool can load the app page.
20. Web search / browser search is available when the app build needs up-to-date information.
21. If the app saves information, Claude Code can test save, refresh, and reload behavior.
22. Any permission, sandbox, network, browser, web search, command, Node.js, or npm restriction is clearly listed.

Windows command guidance:
- Prefer `powershell.exe -NoProfile -Command "<command>"` or `pwsh -NoProfile -Command "<command>"` when available.
- If PowerShell is blocked, use `cmd.exe /c "<command>"` only as a fallback and report the PowerShell restriction.
- Use PowerShell-safe commands in the report:
  - Current folder: `Get-Location`
  - Move folders: `Set-Location`
  - Date/time: `Get-Date`
  - List files: `Get-ChildItem`
  - Read file: `Get-Content`
  - Search text: `Select-String`
  - Find files: `Get-ChildItem -Recurse`
  - Create folder: `New-Item -ItemType Directory`
  - Create file: `New-Item -ItemType File`
  - Copy: `Copy-Item`
  - Move/rename: `Move-Item`
  - Remove temporary diagnostic files only: `Remove-Item`
  - Command lookup: `Get-Command`
  - Environment: `Get-ChildItem Env:`
  - Processes: `Get-Process`
  - Port check: `Get-NetTCPConnection -LocalPort 3000`, if available
  - Web request: `Invoke-WebRequest -Uri http://localhost:3000 -Method Head`, or `curl.exe -I http://localhost:3000`
- Use Command Prompt-safe fallback commands in the report:
  - Current folder: `cd`
  - List files: `dir`
  - Read file: `type`
  - Search text: `findstr`
  - Command lookup: `where`
  - Environment: `set`
  - Processes: `tasklist`
  - Port check: `netstat -ano`
  - Web request: `curl.exe -I http://localhost:3000`
- On Windows, use `curl.exe` when checking preview reachability. `curl` can be a PowerShell alias for `Invoke-WebRequest`.
- Use Bash commands only as optional evidence when Bash/Git Bash/WSL is expected for that session.

Use this output format exactly:

```text
SPACEFILL BOOTCAMP - WINDOWS TECHNICAL DIAGNOSTIC

Date/time:
Computer/user:
Operating system:
Shell tested:
Project folder:
Overall status: READY / NEEDS ATTENTION

[ ] Project folder opened correctly
Evidence:

[ ] Project files readable
Evidence:

[ ] Windows PowerShell commands needed for app development work
Commands tested:

Project/navigation:
- Get-Location
- Set-Location
- Get-Date
- Get-ChildItem
- Get-ChildItem -Recurse

File reading and search:
- Get-Content
- Claude Code Read/file inspection tool
- Select-String
- Measure-Object
- Sort-Object
- Get-Item
- Get-ItemProperty

File and folder operations:
- New-Item (temporary diagnostic files only)
- Copy-Item (temporary diagnostic files only)
- Move-Item (temporary diagnostic files only)
- Remove-Item (temporary diagnostic files only; never app/user files)

Environment and process checks:
- Get-Command
- Get-ChildItem Env:
- Get-Process
- Get-NetTCPConnection -LocalPort 3000, if available

Git inspection only:
- git status
- git diff

Node and npm:
- node -v
- npm -v
- npx --version
- pnpm -v
- yarn -v
- npm view next version, or equivalent harmless registry check
- npm install (run only if dependencies are missing or helper explicitly asks for a full dependency-download test)
- pnpm install (run only if dependencies are missing or helper explicitly asks for a full dependency-download test)
- yarn (run only if dependencies are missing or helper explicitly asks for a full dependency-download test)
- npm ls
- npm run lint
- npm run build
- npm run preflight
- npm run dev
- npm start

Preview/network checks:
- Invoke-WebRequest -Uri http://localhost:3000 -Method Head
- curl.exe -I http://localhost:3000
Evidence:

[ ] Command Prompt fallback works, if PowerShell is blocked or limited
Commands checked:
- cmd.exe /c cd
- cmd.exe /c dir
- cmd.exe /c type package.json
- cmd.exe /c where node
- cmd.exe /c where npm
- cmd.exe /c tasklist
- cmd.exe /c netstat -ano
- cmd.exe /c curl.exe -I http://localhost:3000
Evidence:

[ ] Bash/Git Bash/WSL availability, optional
Important: This is optional on participant Windows machines unless the session specifically requires Bash.
Commands checked only if relevant:
- bash --version
- wsl --status
- git --version
Evidence:

[ ] Core product-crafting abilities work
Capabilities tested:
- understand a plain-language app request
- search the web when current information is needed
- read project files
- edit project files
- create project files when needed
- run project commands
- download or verify access to dependencies
- start the app
- open and test the preview
Evidence:

[ ] Claude Code file tools work
Capabilities tested:
- read project files
- edit project files
- create project files when needed
Evidence:

[ ] Claude Code terminal tool works
Capabilities tested:
- run short PowerShell or terminal commands
- run npm scripts
- run a long-lived app preview command
Evidence:

[ ] Node.js is installed and available
Command tested:
- node -v
Evidence:

[ ] npm is installed and available
Command tested:
- npm -v
Evidence:

[ ] npm project commands are available
Commands tested:
- npm run lint
- npm run build
- npm run preflight
- npm run dev
- npm start, if the app has already been built and the preview port is free
Evidence:

[ ] Optional package runners/managers are available if needed
Commands checked:
- npx --version
- pnpm -v
- yarn -v
Evidence:

[ ] Project write access works
Check performed:
- create a temporary diagnostic file
- read it
- remove only that temporary diagnostic file
Evidence:

[ ] Dependencies are already available or can be downloaded
Check performed:
- node_modules present: yes/no
- package-lock present: yes/no
- package registry reachable: yes/no
Commands checked:
- npm view next version, or equivalent harmless registry check
- npm install, pnpm install, or yarn only if dependencies are missing or helper explicitly asks for a full dependency-download test
Evidence:

[ ] Readiness check passes
Command tested:
- npm run preflight
Evidence:

[ ] App can start
Command tested:
- npm run dev
Evidence:

[ ] Preview reachable
URL:
Evidence:

[ ] Browser or in-app preview tool is available
Evidence:

[ ] Browser or in-app preview tool can load the app page
Evidence:

[ ] Web search / browser search tool is available
Check performed:
- Run a simple web search test only if web search is expected for the session.
- Do not use external services that require accounts.
Evidence:

[ ] Save/reload testing possible when the app has saved information
Evidence:

Restrictions detected:
- None / list exact blockers

Activations or allowances needed from the Spacefill organizers:
- None / list exact activation needed, for example:
  - Install or allow Node.js
  - Install or allow npm
  - Allow npx if one-off project tools are needed
  - Allow pnpm and yarn only if a project requires them
  - Allow Windows PowerShell command execution
  - Allow Command Prompt as a fallback
  - Allow project/navigation commands: Get-Location, Set-Location, Get-Date, Get-ChildItem
  - Allow file reading and search commands: Get-Content, Claude Code Read/file inspection tool, Select-String, Measure-Object, Sort-Object, Get-Item
  - Allow file and folder operation commands: New-Item, Copy-Item, Move-Item, Remove-Item for temporary diagnostic cleanup only
  - Allow environment and process check commands: Get-Command, Get-ChildItem Env:, Get-Process, Get-NetTCPConnection
  - Allow git inspection commands only: git status, git diff
  - Allow preview/network check commands: Invoke-WebRequest and curl.exe
  - Allow reading and writing inside the project folder
  - Allow package registry access for dependency checks and downloads
  - Allow running npm scripts: npm run dev, npm run build, npm run lint, npm run preflight, npm start
  - Allow local preview on http://localhost:3000 and alternate local ports if 3000 is busy
  - Allow browser or in-app preview access
  - Allow Claude Code web search / browser search if up-to-date information is needed
  - Allow npm install, pnpm install, or yarn if dependencies are missing
  - Allow Bash/Git Bash/WSL only if a specific session requires it

Report recipient:
- the Spacefill organizers

Final result:
READY for the Spacefill Bootcamp / NOT READY yet
```
