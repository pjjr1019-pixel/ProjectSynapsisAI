---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: ".venv/Scripts/Activate.ps1"
source_name: "Activate.ps1"
top_level: ".venv"
surface: "other"
classification: "neutral"
kind: "powershell"
language: "powershell"
extension: ".ps1"
score: 4
selected_rank: 4507
content_hash: "260f79896f4ff3b967ab3c0f252c160649bff0668d6989267f2e3e5fa1202492"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "neutral"
  - "other"
  - "powershell"
  - "ps1"
headings:
  - "as `prompt`."
  - "Determine the containing directory of this script"
  - "First, get the location of the virtual environment, it might not be"
  - "just use the name of the virtual environment folder."
  - "Next, read the `pyvenv.cfg` file to determine any required value such"
  - "Next, set the prompt from the command line, or the config file, or"
  - "Set values required in priority: CmdLine, ConfigFile, Default"
  - "VenvExecDir if specified on the command line."
---

# .venv/Scripts/Activate.ps1

> Text asset; headings as `prompt`. / Determine the containing directory of this script / First, get the location of the virtual environment, it might not be

## Key Signals

- Source path: .venv/Scripts/Activate.ps1
- Surface: other
- Classification: neutral
- Kind: powershell
- Language: powershell
- Top level: .venv
- Score: 4
- Tags: neutral, other, powershell, ps1
- Headings: as `prompt`. | Determine the containing directory of this script | First, get the location of the virtual environment, it might not be | just use the name of the virtual environment folder. | Next, read the `pyvenv.cfg` file to determine any required value such | Next, set the prompt from the command line, or the config file, or

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: .venv, neutral, other, powershell, ps1
- Source link target: .venv/Scripts/Activate.ps1

## Excerpt

~~~powershell
<#
.Synopsis
Activate a Python virtual environment for the current PowerShell session.

.Description
Pushes the python executable for a virtual environment to the front of the
$Env:PATH environment variable and sets the prompt to signify that you are
in a Python virtual environment. Makes use of the command line switches as
well as the `pyvenv.cfg` file values present in the virtual environment.

.Parameter VenvDir
Path to the directory that contains the virtual environment to activate. The
default value for this is the parent of the directory that the Activate.ps1
script is located within.

.Parameter Prompt
The prompt prefix to display when this virtual environment is activated. By
default, this prompt is the name of the virtual environment folder (VenvDir)
surrounded by parentheses and followed by a single space (ie. '(.venv) ').

.Example
Activate.ps1
Activates the Python virtual environment that contains the Activate.ps1 script.

.Example
Activate.ps1 -Verbose
Activates the Python virtual environment that contains the Activate.ps1 script,
and shows extra information about the activation as it executes.
~~~