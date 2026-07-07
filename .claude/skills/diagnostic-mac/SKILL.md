---
name: diagnostic-mac
description: >
  Use this skill when the user types "/diagnostic-mac", "$diagnostic-mac",
  "mac diagnostic", "diagnostic for mac", "run Mac diagnostic", or asks whether
  a work Mac is ready for the bootcamp: using zsh/Bash terminal
  commands, reading and editing files, searching the web, downloading
  dependencies, running the app, and previewing the result.
---

# Diagnostic Mac

Run a technical readiness diagnostic for helpers, not for the participants themselves.

The goal is to verify that the participant's work Mac is not blocked by local restrictions and can perform the work needed during the Spacefill Bootcamp.

For this bootcamp, "ready to build" means Claude Code can do the practical loop a helper needs: understand a plain-language idea, inspect and change project files, search the web when current information is needed, download project dependencies, run checks, start the app, open the preview, and test visible behavior.

The final answer must be a copy-paste checklist that can be sent or shown to the Spacefill organizers.

Rules:
- Run the checks yourself and record real evidence.
- The output can be technical. It is for helpers and the Spacefill organizers, not for the participant.
- Return a checklist that can be copied as-is.
- This is a check/report only. Do not install missing tools, do not change settings, and do not fix the machine during `/diagnostic-mac`.
- It is allowed to test whether dependencies can be downloaded. Prefer a harmless registry check first. Only run `npm install`, `pnpm install`, or `yarn` if dependencies are missing or the helper explicitly asks for a full dependency-download test.
- Do not ask the builder to troubleshoot.
- Do not create git commits.
- Do not test external cloud services or ask for accounts.
- Do not claim that "all tools" work. State exactly what was tested and what is blocked.
- Prefer macOS Terminal checks using zsh or Bash.
- Mark the system `READY` if Claude Code can read and edit project files, run terminal commands, search the web when needed, reach the package registry or download dependencies, run the app, and load the local preview.
- Mark the system `NEEDS ATTENTION` if any core product-crafting ability is blocked: file access, file editing, terminal command execution, Node.js, npm, package download access, app startup, local preview, browser/in-app preview, or web search when the session requires current information.
- If something is missing or blocked, write what the Spacefill organizers should activate, install, allow, or whitelist. The report is meant to be sent or shown to the Spacefill organizers.

Check:
1. Correct project folder is open.
2. Project files can be read.
3. Claude Code can run macOS terminal commands commonly needed while building, checking, and previewing the app.
4. Node.js is installed and available with `node -v`.
5. npm is installed and available with `npm -v`.
6. Optional package runners/managers can be checked if relevant: `npx --version`, `pnpm -v`, `yarn -v`.
7. npm scripts can run from the project folder.
8. Dependencies are already available, or dependency download access works. If dependencies are missing, report that `npm install`, `pnpm install`, or `yarn` must be allowed, and run the needed install command only if the helper explicitly asks.
9. Claude Code can write inside the project when needed.
10. Claude Code can edit an existing project file when needed. For the diagnostic itself, do not leave real project edits behind; use a temporary diagnostic file unless the helper asked to remake this skill.
11. The readiness check passes: `npm run preflight`.
12. The app can run with `npm run dev`.
13. The app can start with `npm start` after a successful production build if needed.
14. The local preview is reachable at `http://localhost:3000`, or at the alternate port chosen by the app if port 3000 is already busy.
15. Claude Code file tools can read and edit project files.
16. Claude Code terminal execution tool works for project commands.
17. A browser or in-app preview tool is available.
18. The browser or in-app preview tool can load the app page.
19. Web search / browser search is available when the app build needs up-to-date information.
20. If the app saves information, Claude Code can test save, refresh, and reload behavior.
21. Any permission, sandbox, network, browser, web search, command, Node.js, or npm restriction is clearly listed.

Mac command guidance:
- Prefer the current macOS shell (`zsh` by default, Bash if configured).
- Use safe, common macOS commands in the report:
  - Current folder: `pwd`
  - Move folders: `cd`
  - Date/time: `date`
  - List files: `ls`
  - Find files: `find`
  - Read files: `cat`, `sed`, `head`, `tail`
  - Search text: `rg`, `grep`
  - Count/sort/check files: `wc`, `sort`, `uniq`, `file`, `stat`
  - Create folder: `mkdir`
  - Create file: `touch`
  - Copy: `cp`
  - Move/rename: `mv`
  - Remove temporary diagnostic files only: `rm`
  - Command lookup: `which`, `command -v`
  - Environment: `env`, `printenv`
  - Processes: `ps`
  - Port check: `lsof -i :3000`
  - macOS info: `sw_vers`, `uname -a`
  - Web request: `curl -I http://localhost:3000`
- Use destructive commands only against temporary diagnostic files created for this report.

Use this output format exactly:

```text
SPACEFILL BOOTCAMP - MAC TECHNICAL DIAGNOSTIC

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

[ ] macOS terminal commands needed for app development work
Commands tested:

Project/navigation:
- pwd
- cd
- date
- ls
- find

File reading and search:
- cat
- Claude Code Read/file inspection tool
- sed
- rg
- grep
- head
- tail
- wc
- sort
- uniq
- file
- stat

File and folder operations:
- mkdir (temporary diagnostic folders only)
- touch (temporary diagnostic files only)
- cp (temporary diagnostic files only)
- mv (temporary diagnostic files only)
- rm (temporary diagnostic files only; never app/user files)

Environment and process checks:
- which
- command -v
- env
- printenv
- ps
- lsof -i :3000
- sw_vers
- uname -a

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
- curl -I http://localhost:3000
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
- run short zsh/Bash terminal commands
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
  - Allow macOS Terminal command execution with zsh or Bash
  - Allow project/navigation commands: pwd, cd, date, ls, find
  - Allow file reading and search commands: cat, Claude Code Read/file inspection tool, sed, rg, grep, head, tail, wc, sort, uniq, file, stat
  - Allow file and folder operation commands: mkdir, touch, cp, mv, rm for temporary diagnostic cleanup only
  - Allow environment and process check commands: which, command -v, env, printenv, ps, lsof, sw_vers, uname
  - Allow git inspection commands only: git status, git diff
  - Allow preview/network check command: curl
  - Allow reading and writing inside the project folder
  - Allow package registry access for dependency checks and downloads
  - Allow running npm scripts: npm run dev, npm run build, npm run lint, npm run preflight, npm start
  - Allow local preview on http://localhost:3000 and alternate local ports if 3000 is busy
  - Allow browser or in-app preview access
  - Allow Claude Code web search / browser search if up-to-date information is needed
  - Allow npm install, pnpm install, or yarn if dependencies are missing

Report recipient:
- the Spacefill organizers

Final result:
READY for the Spacefill Bootcamp / NOT READY yet
```
