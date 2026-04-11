import { mkdir } from "node:fs/promises";
import * as path from "node:path";
import { cloneSnapshot, buildFreshness } from "./shared";
import { runPowerShellJson } from "../windows/powershell";
const FOREGROUND_WINDOW_TIMEOUT_MS = 5_000;
const UI_TREE_TIMEOUT_MS = 8_000;
const toStringOrNull = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};
const toNumberOrNull = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};
const toBoolean = (value) => {
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "string") {
        return value.trim().toLowerCase() === "true";
    }
    return Boolean(value);
};
const toBounds = (value) => {
    if (!value || typeof value !== "object") {
        return null;
    }
    const record = value;
    const x = toNumberOrNull(record.x);
    const y = toNumberOrNull(record.y);
    const width = toNumberOrNull(record.width);
    const height = toNumberOrNull(record.height);
    if (x == null || y == null || width == null || height == null) {
        return null;
    }
    return { x, y, width, height };
};
const escapePowerShellSingleQuoted = (value) => value.replace(/'/g, "''");
const captureFrameScript = (screenshotPath) => `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing, System.Windows.Forms, System.Runtime.WindowsRuntime
try {
  $virtual = [System.Windows.Forms.SystemInformation]::VirtualScreen
  $bitmap = New-Object System.Drawing.Bitmap($virtual.Width, $virtual.Height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($virtual.Left, $virtual.Top, 0, 0, $bitmap.Size)
  $graphics.Dispose()
  $bitmap.Save('${escapePowerShellSingleQuoted(screenshotPath)}', [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()

  $monitors = @()
  foreach ($screen in [System.Windows.Forms.Screen]::AllScreens) {
    $monitors += [pscustomobject]@{
      id = [string]$screen.DeviceName
      name = [string]$screen.DeviceName
      primary = [bool]$screen.Primary
      bounds = [pscustomobject]@{
        x = [int]$screen.Bounds.X
        y = [int]$screen.Bounds.Y
        width = [int]$screen.Bounds.Width
        height = [int]$screen.Bounds.Height
      }
      workingArea = [pscustomobject]@{
        x = [int]$screen.WorkingArea.X
        y = [int]$screen.WorkingArea.Y
        width = [int]$screen.WorkingArea.Width
        height = [int]$screen.WorkingArea.Height
      }
    }
  }

  $ocrText = ""
  $ocrLines = @()
  try {
    $file = [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]::GetFileFromPathAsync('${escapePowerShellSingleQuoted(screenshotPath)}').GetAwaiter().GetResult()
    $stream = [Windows.Storage.FileAccessMode]::Read
    $ras = [Windows.Storage.Streams.RandomAccessStreamReference]::CreateFromFile($file).OpenReadAsync().GetAwaiter().GetResult()
    $decoder = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime]::CreateAsync($ras).GetAwaiter().GetResult()
    $software = $decoder.GetSoftwareBitmapAsync().GetAwaiter().GetResult()
    $engine = [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType=WindowsRuntime]::TryCreateFromUserProfileLanguages()
    if ($engine) {
      $result = $engine.RecognizeAsync($software).GetAwaiter().GetResult()
      $ocrText = [string]$result.Text
      foreach ($line in $result.Lines) {
        $words = @()
        $lineBounds = $null
        foreach ($word in $line.Words) {
          $wordBounds = $null
          try {
            $wordBounds = [pscustomobject]@{
              x = [int]$word.BoundingRect.X
              y = [int]$word.BoundingRect.Y
              width = [int]$word.BoundingRect.Width
              height = [int]$word.BoundingRect.Height
            }
          } catch {}
          if ($null -eq $lineBounds -and $wordBounds) {
            $lineBounds = $wordBounds
          }
          $words += [pscustomobject]@{
            text = [string]$word.Text
            bounds = $wordBounds
          }
        }
        $ocrLines += [pscustomobject]@{
          text = [string]$line.Text
          bounds = $lineBounds
          words = $words
        }
      }
    }
  } catch {}

  [pscustomobject]@{
    screenshotPath = '${escapePowerShellSingleQuoted(screenshotPath)}'
    virtualBounds = [pscustomobject]@{
      x = [int]$virtual.Left
      y = [int]$virtual.Top
      width = [int]$virtual.Width
      height = [int]$virtual.Height
    }
    monitorCount = [int]$monitors.Count
    monitors = $monitors
    ocrText = $ocrText
    ocrLines = $ocrLines
  } | ConvertTo-Json -Depth 8
} catch {
  $null
}
`;
const foregroundWindowScript = `
$ErrorActionPreference = 'Stop'
try {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class ScreenNative {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder className, int maxCount);
}
"@
  $hwnd = [ScreenNative]::GetForegroundWindow()
  if ($hwnd -eq [IntPtr]::Zero) {
    return $null
  }

  $titleBuilder = New-Object System.Text.StringBuilder 512
  [void][ScreenNative]::GetWindowText($hwnd, $titleBuilder, $titleBuilder.Capacity)
  $classBuilder = New-Object System.Text.StringBuilder 512
  [void][ScreenNative]::GetClassName($hwnd, $classBuilder, $classBuilder.Capacity)
  [uint32]$processId = 0
  [void][ScreenNative]::GetWindowThreadProcessId($hwnd, [ref]$processId)
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue | Select-Object -First 1
  $rect = New-Object ScreenNative+RECT
  $bounds = $null
  if ([ScreenNative]::GetWindowRect($hwnd, [ref]$rect)) {
    $bounds = [PSCustomObject]@{
      x = [int]$rect.Left
      y = [int]$rect.Top
      width = [int]($rect.Right - $rect.Left)
      height = [int]($rect.Bottom - $rect.Top)
    }
  }

  [PSCustomObject]@{
    windowHandle = ('0x{0:X}' -f $hwnd.ToInt64())
    title = if ($titleBuilder.Length -gt 0) { [string]$titleBuilder.ToString() } else { $null }
    processId = if ($processId -ne 0) { [int]$processId } else { $null }
    processName = if ($process -and $process.ProcessName) { [string]$process.ProcessName } else { $null }
    executablePath = if ($process -and $process.Path) { [string]$process.Path } else { $null }
    className = if ($classBuilder.Length -gt 0) { [string]$classBuilder.ToString() } else { $null }
    bounds = $bounds
    isForeground = $true
    isFocused = $true
    zOrder = $null
  } | ConvertTo-Json -Depth 4
} catch {
  $null
}
`;
const uiTreeScript = `
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
  Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class ScreenNative {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [StructLayout(LayoutKind.Sequential)]
  public struct POINT { public int X; public int Y; }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT point);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
"@
  $maxDepth = 4
  $maxNodes = 80
  $script:nodeCount = 0
  $script:redactedCount = 0
  function New-Bounds([System.Windows.Rect]$rect) {
    if ($rect.Width -le 0 -and $rect.Height -le 0) {
      return $null
    }

    return [PSCustomObject]@{
      x = [int]$rect.X
      y = [int]$rect.Y
      width = [int]$rect.Width
      height = [int]$rect.Height
    }
  }

  function Get-UiNode([System.Windows.Automation.AutomationElement]$element, [int]$depth) {
    if ($null -eq $element -or $script:nodeCount -ge $maxNodes -or $depth -gt $maxDepth) {
      return $null
    }

    $current = $element.Current
    $isPassword = $false
    try { $isPassword = [bool]$current.IsPassword } catch {}

    $name = $null
    if (-not $isPassword -and $current.Name) { $name = [string]$current.Name }

    $helpText = $null
    if (-not $isPassword -and $current.HelpText) { $helpText = [string]$current.HelpText }

    $controlType = if ($current.ControlType) { [string]$current.ControlType.ProgrammaticName } else { 'unknown' }
    $localizedControlType = if ($current.LocalizedControlType) { [string]$current.LocalizedControlType } else { $null }
    $automationId = if ($current.AutomationId) { [string]$current.AutomationId } else { $null }
    $className = if ($current.ClassName) { [string]$current.ClassName } else { $null }
    $bounds = New-Bounds $current.BoundingRectangle
    $enabled = $false
    try { $enabled = [bool]$current.IsEnabled } catch {}
    $focused = $false
    try { $focused = [bool]$current.HasKeyboardFocus } catch {}
    $selected = $false
    try {
      $pattern = $null
      if ($element.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$pattern)) {
        $selected = [bool]$pattern.Current.IsSelected
      }
    } catch {}
    $offscreen = $false
    try { $offscreen = [bool]$current.IsOffscreen } catch {}
    $visible = -not $offscreen
    $privacyScope = if ($isPassword) { 'protected/system-sensitive surfaces' } elseif (
      ($name -and $name -match '(?i)(password|passcode|pin|token|secret|credential|login|sign in|auth|otp)') -or
      ($helpText -and $helpText -match '(?i)(password|passcode|pin|token|secret|credential|login|sign in|auth|otp)')
    ) {
      'sensitive local content'
    } else {
      'user-visible local content'
    }

    if ($isPassword) {
      $name = $null
      $helpText = $null
      $script:redactedCount++
    }

    $script:nodeCount++
    $children = @()
    if ($depth -lt $maxDepth -and $script:nodeCount -lt $maxNodes) {
      $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
      $child = $walker.GetFirstChild($element)
      while ($null -ne $child -and $script:nodeCount -lt $maxNodes) {
        $node = Get-UiNode -element $child -depth ($depth + 1)
        if ($null -ne $node) {
          $children += $node
        }
        $child = $walker.GetNextSibling($child)
      }
    }

    [PSCustomObject]@{
      id = [guid]::NewGuid().ToString()
      automationId = $automationId
      controlType = $controlType
      localizedControlType = $localizedControlType
      name = $name
      value = $null
      className = $className
      helpText = $helpText
      bounds = $bounds
      enabled = $enabled
      focused = $focused
      selected = $selected
      offscreen = $offscreen
      visible = $visible
      isPassword = $isPassword
      privacyScope = $privacyScope
      children = $children
    }
  }

  $hwnd = [ScreenNative]::GetForegroundWindow()
  if ($hwnd -eq [IntPtr]::Zero) {
    return $null
  }

  $root = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd)
  if ($null -eq $root) {
    return $null
  }

  $titleBuilder = New-Object System.Text.StringBuilder 512
  [void][ScreenNative]::GetWindowText($hwnd, $titleBuilder, $titleBuilder.Capacity)

  $point = New-Object ScreenNative+POINT
  $cursorPosition = $null
  if ([ScreenNative]::GetCursorPos([ref]$point)) {
    $cursorPosition = [PSCustomObject]@{
      x = [int]$point.X
      y = [int]$point.Y
    }
  }

  $cursorElement = $null
  try {
    if ($cursorPosition) {
      $pointObject = New-Object System.Windows.Point($cursorPosition.x, $cursorPosition.y)
      $cursorElementRaw = [System.Windows.Automation.AutomationElement]::FromPoint($pointObject)
      if ($cursorElementRaw) {
        $cursorElement = Get-UiNode -element $cursorElementRaw -depth 0
      }
    }
  } catch {}

  $focusedElement = $null
  try {
    $focusedElementRaw = [System.Windows.Automation.AutomationElement]::FocusedElement
    if ($focusedElementRaw) {
      $focusedElement = Get-UiNode -element $focusedElementRaw -depth 0
    }
  } catch {}

  [PSCustomObject]@{
    rootWindowHandle = ('0x{0:X}' -f $hwnd.ToInt64())
    rootWindowTitle = if ($titleBuilder.Length -gt 0) { [string]$titleBuilder.ToString() } else { $null }
    cursorPosition = $cursorPosition
    elementUnderCursor = $cursorElement
    focusedElement = $focusedElement
    root = Get-UiNode -element $root -depth 0
    totalCount = $script:nodeCount
    isTruncated = $script:nodeCount -ge $maxNodes
    redactedCount = $script:redactedCount
  } | ConvertTo-Json -Depth 12
} catch {
  $null
}
`;
const parseForegroundWindow = (raw) => {
    if (!raw) {
        return null;
    }
    const now = new Date().toISOString();
    return {
        capturedAt: now,
        freshness: buildFreshness(now),
        windowHandle: toStringOrNull(raw.windowHandle),
        title: toStringOrNull(raw.title),
        processId: raw.processId == null ? null : Number(raw.processId),
        processName: toStringOrNull(raw.processName),
        executablePath: toStringOrNull(raw.executablePath),
        className: toStringOrNull(raw.className),
        bounds: raw.bounds == null
            ? null
            : {
                x: toNumberOrNull(raw.bounds.x) ?? 0,
                y: toNumberOrNull(raw.bounds.y) ?? 0,
                width: toNumberOrNull(raw.bounds.width) ?? 0,
                height: toNumberOrNull(raw.bounds.height) ?? 0
            },
        isForeground: toBoolean(raw.isForeground ?? true),
        isFocused: toBoolean(raw.isFocused ?? true),
        zOrder: raw.zOrder == null ? null : Number(raw.zOrder)
    };
};
const parseUiTree = (raw) => {
    if (!raw) {
        return null;
    }
    const now = new Date().toISOString();
    return {
        capturedAt: now,
        freshness: buildFreshness(now),
        scope: null,
        targetLabel: null,
        rootWindowHandle: toStringOrNull(raw.rootWindowHandle),
        rootWindowTitle: toStringOrNull(raw.rootWindowTitle),
        cursorPosition: raw.cursorPosition == null
            ? null
            : {
                x: toNumberOrNull(raw.cursorPosition.x) ?? 0,
                y: toNumberOrNull(raw.cursorPosition.y) ?? 0
            },
        elementUnderCursor: raw.elementUnderCursor ? cloneSnapshot(raw.elementUnderCursor) : null,
        focusedElement: raw.focusedElement ? cloneSnapshot(raw.focusedElement) : null,
        root: raw.root ? cloneSnapshot(raw.root) : null,
        totalCount: raw.totalCount == null ? 0 : Number(raw.totalCount),
        isTruncated: toBoolean(raw.isTruncated),
        redactedCount: raw.redactedCount == null ? 0 : Number(raw.redactedCount)
    };
};
const parseFrame = (raw) => {
    if (!raw) {
        return null;
    }
    const now = new Date().toISOString();
    const monitors = Array.isArray(raw.monitors)
        ? raw.monitors.map((monitor, index) => ({
            id: toStringOrNull(monitor.id) ?? `monitor-${index + 1}`,
            name: toStringOrNull(monitor.name),
            primary: toBoolean(monitor.primary),
            bounds: toBounds(monitor.bounds) ?? { x: 0, y: 0, width: 0, height: 0 },
            workingArea: toBounds(monitor.workingArea)
        }))
        : null;
    const ocrLines = Array.isArray(raw.ocrLines)
        ? raw.ocrLines.map((line) => ({
            text: toStringOrNull(line.text) ?? "",
            bounds: toBounds(line.bounds),
            words: Array.isArray(line.words)
                ? line.words.map((word) => ({
                    text: toStringOrNull(word.text) ?? "",
                    bounds: toBounds(word.bounds)
                }))
                : []
        }))
        : null;
    return {
        capturedAt: now,
        freshness: buildFreshness(now),
        scope: null,
        targetLabel: null,
        captureMode: "on-demand",
        windowHandle: null,
        windowTitle: null,
        virtualBounds: toBounds(raw.virtualBounds),
        monitorCount: raw.monitorCount == null ? monitors?.length ?? null : Number(raw.monitorCount),
        monitors,
        redactions: [],
        uiElementCount: 0,
        screenshotPath: toStringOrNull(raw.screenshotPath),
        ocrText: toStringOrNull(raw.ocrText),
        ocrLines
    };
};
export const createWindowsScreenCaptureSource = (options) => ({
    captureForegroundWindow: async () => parseForegroundWindow(await runPowerShellJson(foregroundWindowScript, {
        timeoutMs: FOREGROUND_WINDOW_TIMEOUT_MS
    })),
    captureUiTree: async () => parseUiTree(await runPowerShellJson(uiTreeScript, {
        timeoutMs: UI_TREE_TIMEOUT_MS
    })),
    captureFrame: async () => {
        const screenshotPath = path.join(options.runtimeRoot, "screen", "captures", `${Date.now()}-${Math.random().toString(16).slice(2)}.png`);
        await mkdir(path.dirname(screenshotPath), { recursive: true });
        return parseFrame(await runPowerShellJson(captureFrameScript(screenshotPath), {
            timeoutMs: 12_000
        }));
    }
});
export const createFixtureScreenCaptureSource = (fixture) => {
    const resolve = async (value) => {
        if (typeof value === "function") {
            return cloneSnapshot((await value()));
        }
        if (value == null) {
            return null;
        }
        return cloneSnapshot(value);
    };
    return {
        captureForegroundWindow: async () => resolve(fixture.foregroundWindow ?? null),
        captureUiTree: async () => resolve(fixture.uiTree ?? null)
    };
};
