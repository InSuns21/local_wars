# AGENTS.md

## File operation policy

MCPのfilesystemが利用可能な場合はそれを使用する。

できない場合は以下のポリシーで読み書きする。

### 独自IOコマンドの利用

Use the shared file wrapper for file operations instead of direct ad-hoc file edits.

Base command:

`node C:\tools\codex-fswrap\bin\cfs.mjs`

- Do not use `powershell -Command "cfs ..."` wrappers.
- Do not invoke bare `cfs` if the execution form is ambiguous.
- Always call the wrapper directly as:

`node C:\tools\codex-fswrap\bin\cfs.mjs <subcommand> ...`

#### Read

- `node C:\tools\codex-fswrap\bin\cfs.mjs read --path <file>`
- `node C:\tools\codex-fswrap\bin\cfs.mjs read-lines --path <file> --start <n> --end <m>`

#### Search

- `node C:\tools\codex-fswrap\bin\cfs.mjs search --root <dir> --glob "<glob1>,<glob2>" --pattern "<text>"`
- `node C:\tools\codex-fswrap\bin\cfs.mjs search-read --root <dir> --glob "<glob1>,<glob2>" --pattern "<text>" --context 2`

#### Write / edit

- send JSON to `node C:\tools\codex-fswrap\bin\cfs.mjs write-batch`
- send JSON to `node C:\tools\codex-fswrap\bin\cfs.mjs patch`
- send JSON to `node C:\tools\codex-fswrap\bin\cfs.mjs apply-edits`

#### Delete / file ops

- `node C:\tools\codex-fswrap\bin\cfs.mjs delete --path <file>`
- `node C:\tools\codex-fswrap\bin\cfs.mjs mkdir --path <dir>`
- `node C:\tools\codex-fswrap\bin\cfs.mjs move --from <src> --to <dst>`
- `node C:\tools\codex-fswrap\bin\cfs.mjs copy --from <src> --to <dst>`
- `node C:\tools\codex-fswrap\bin\cfs.mjs stat --path <path>`
- `node C:\tools\codex-fswrap\bin\cfs.mjs list --path <dir>`

#### cfs JSON input rules

For `patch`, `apply-edits`, and `write-batch`:

- Prefer `--stdin-file <file>` over inline shell JSON when JSON includes non-ASCII text.
- Prefer `--stdin-file <file>` when inline arguments may hit shell or command-length limits.
- Prefer temporary JSON input files under `.codex/tmp/` when the environment allows creating files there.
- If direct temp-file creation under `.codex/tmp/` fails in this environment, use repo-root fallback filenames that start with `.codex_tmp_`.
- Prefer stable fallback filenames such as `.codex_tmp_apply-edits.json`, `.codex_tmp_patch.json`, or `.codex_tmp_write-batch.json`.
- 編集用の一時 JSON は、PowerShell + -Encoding UTF8 で .codex_tmp_apply-edits.json に書き出して使うのがよい
- Reuse or overwrite existing temp files when safe instead of creating scattered one-off temp files.
- Always check `node C:\tools\codex-fswrap\bin\cfs.mjs <command> --help` before constructing JSON input.
- Use `--dry-run` before broad edits when possible.


## Rules

- Prefer repo-relative paths only.
- Never write outside the current repository root.
- Only operate inside the current workspace and approved writable roots.
- Read the minimum required range before editing.
- Prefer `read-lines` before editing an existing file.
- Prefer one batch edit when practical, but avoid oversized inline commands that may exceed shell or command-length limits.
- If needed, use `--stdin-file <file>` or split the change into a small number of coherent batches.
- Prefer `apply-edits` or `patch` over full-file overwrite.
- Do not rewrite whole files unless explicitly necessary.
- Preserve existing line endings unless explicitly asked to normalize them.
- Search before broad replacement.
- Do not change unrelated lines.
- Do not touch generated files, build outputs, vendored dependencies, or lockfiles unless the task explicitly requires it.