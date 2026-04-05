---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: ".venv/Scripts/activate"
source_name: "activate"
top_level: ".venv"
surface: "other"
classification: "neutral"
kind: "text"
language: "text"
extension: ""
score: 4
selected_rank: 4506
content_hash: "71c0a0a496e6ca5fd2379b69b2feba0a2cda6513db213cb3b563b7568fcd65b1"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "neutral"
  - "no-ext"
  - "other"
  - "text"
exports:
  - "PATH"
  - "PS1"
  - "PYTHONHOME"
  - "VIRTUAL_ENV"
  - "VIRTUAL_ENV_PROMPT"
headings:
  - "Call hash to forget past commands. Without forgetting"
  - "could use `if (set -u; : $PYTHONHOME) ;` in bash"
  - "on Windows, a path can contain colons and backslashes and has to be converted:"
  - "This file must be used with \"source bin/activate\" *from bash*"
  - "this will fail if PYTHONHOME is set to the empty string (which is bad anyway)"
  - "unset irrelevant variables"
  - "unset PYTHONHOME if set"
  - "You cannot run it directly"
---

# .venv/Scripts/activate

> Text asset; exports PATH, PS1, PYTHONHOME, VIRTUAL_ENV; headings Call hash to forget past commands. Without forgetting / could use `if (set -u; : $PYTHONHOME) ;` in bash / on Windows, a path can contain colons and backslashes and has to be converted:

## Key Signals

- Source path: .venv/Scripts/activate
- Surface: other
- Classification: neutral
- Kind: text
- Language: text
- Top level: .venv
- Score: 4
- Tags: neutral, no-ext, other, text
- Exports: PATH, PS1, PYTHONHOME, VIRTUAL_ENV, VIRTUAL_ENV_PROMPT
- Headings: Call hash to forget past commands. Without forgetting | could use `if (set -u; : $PYTHONHOME) ;` in bash | on Windows, a path can contain colons and backslashes and has to be converted: | This file must be used with "source bin/activate" *from bash* | this will fail if PYTHONHOME is set to the empty string (which is bad anyway) | unset irrelevant variables

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: .venv, neutral, no-ext, other, text
- Source link target: .venv/Scripts/activate

## Excerpt

~~~
# This file must be used with "source bin/activate" *from bash*
# You cannot run it directly

deactivate () {
    # reset old environment variables
    if [ -n "${_OLD_VIRTUAL_PATH:-}" ] ; then
        PATH="${_OLD_VIRTUAL_PATH:-}"
        export PATH
        unset _OLD_VIRTUAL_PATH
    fi
    if [ -n "${_OLD_VIRTUAL_PYTHONHOME:-}" ] ; then
        PYTHONHOME="${_OLD_VIRTUAL_PYTHONHOME:-}"
        export PYTHONHOME
        unset _OLD_VIRTUAL_PYTHONHOME
    fi

    # Call hash to forget past locations. Without forgetting
    # past locations the $PATH changes we made may not be respected.
    # See "man bash" for more details. hash is usually a builtin of your shell
    hash -r 2> /dev/null

    if [ -n "${_OLD_VIRTUAL_PS1:-}" ] ; then
        PS1="${_OLD_VIRTUAL_PS1:-}"
        export PS1
        unset _OLD_VIRTUAL_PS1
    fi

    unset VIRTUAL_ENV
~~~