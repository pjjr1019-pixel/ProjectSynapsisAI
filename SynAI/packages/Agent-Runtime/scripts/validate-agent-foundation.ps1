$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$synaiRoot = (Resolve-Path (Join-Path $packageRoot '..\..')).Path
$repoRoot = (Resolve-Path (Join-Path $synaiRoot '..')).Path
Set-Location $synaiRoot

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [scriptblock]$Action
  )

  Write-Host "==> $Name"
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE."
  }
}

function Assert-FileContainsAllPatterns {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string[]]$Patterns
  )

  if (-not (Test-Path $Path)) {
    throw "Missing required hygiene file: $Path"
  }

  $content = Get-Content $Path -Raw
  $missing = @(
    $Patterns | Where-Object { $content -notmatch [regex]::Escape($_) }
  )

  if ($missing.Count -gt 0) {
    throw "Missing required ignore patterns in ${Path}: $($missing -join ', ')"
  }
}

function Assert-NoTrackedGeneratedArtifacts {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Pathspecs
  )

  $matches = @(
    foreach ($pathspec in $Pathspecs) {
    $tracked = @(git ls-files -- $pathspec)
    if ($tracked.Count -gt 0) {
      [pscustomobject]@{
        Pathspec = $pathspec
        Count    = $tracked.Count
        Sample   = $tracked | Select-Object -First 10
      }
    }
    }
  )

  if ($matches.Count -gt 0) {
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('Tracked generated artifacts are still present in git:')
    foreach ($match in $matches) {
      $lines.Add(("- {0}: {1} tracked file(s)" -f $match.Pathspec, $match.Count))
      foreach ($sample in $match.Sample) {
        $lines.Add(("  {0}" -f $sample))
      }
    }

    throw ($lines -join [Environment]::NewLine)
  }
}

Assert-FileContainsAllPatterns -Path (Join-Path $repoRoot '.gitignore') -Patterns @(
  '/node_modules/'
  '/SynAI/node_modules/'
  '/.runtime/'
  '/SynAI/.runtime/'
  '/dist/'
  '/SynAI/dist/'
  '/coverage/'
  '/SynAI/coverage/'
  '/.vite/'
  '/SynAI/.vite/'
  '/.vitest/'
  '/SynAI/.vitest/'
  '/.cache/'
  '/SynAI/.cache/'
  '/tmp/'
  '/SynAI/tmp/'
  '/temp/'
  '/SynAI/temp/'
  '/.claude/settings.json'
)

Assert-NoTrackedGeneratedArtifacts -Pathspecs @(
  'node_modules/'
  'SynAI/node_modules/'
  '.runtime/'
  'SynAI/.runtime/'
  'dist/'
  'SynAI/dist/'
  'coverage/'
  'SynAI/coverage/'
  '.vite/'
  'SynAI/.vite/'
  '.vitest/'
  'SynAI/.vitest/'
  '.cache/'
  'SynAI/.cache/'
  '.claude/settings.json'
)

Invoke-Step -Name 'Typecheck canonical agent runtime package' -Action {
  npx tsc -p tsconfig.agent-runtime.json --noEmit
}

Invoke-Step -Name 'Run canonical agent runtime package tests' -Action {
  npx jest --runInBand --config jest.agent-runtime.config.cjs packages/Agent-Runtime/tests
}

Invoke-Step -Name 'Run SynAI agent shim tests' -Action {
  npx vitest run packages/Agent-Runtime/vitest/agent/contracts/agent-runtime.contracts.test.ts packages/Agent-Runtime/vitest/agent/runtime/runtime-shim.test.ts
}

Invoke-Step -Name 'Run SynAI agent runtime bridge tests' -Action {
  npx vitest run tests/capability/agent-runtime-approval.test.ts tests/capability/governance-audit-query.test.ts tests/smoke/grounding-ui.smoke.test.tsx
}

Write-Host 'Agent foundation validation passed.'
