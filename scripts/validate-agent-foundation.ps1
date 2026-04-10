$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

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

Invoke-Step -Name 'Typecheck agent foundation' -Action {
  npx tsc -p tsconfig.agent-foundation.json --noEmit
}

Invoke-Step -Name 'Run root agent tests' -Action {
  npx jest --runInBand --config jest.config.js tests/agent
}

Push-Location (Join-Path $repoRoot 'SynAI')
try {
  Invoke-Step -Name 'Run SynAI agent contract shim test' -Action {
    npx vitest run tests/agent/contracts/agent-runtime.contracts.test.ts
  }

  Invoke-Step -Name 'Run SynAI agent runtime shim test' -Action {
    npx vitest run tests/agent/runtime/runtime-shim.test.ts
  }
}
finally {
  Pop-Location
}

Write-Host 'Agent foundation validation passed.'
