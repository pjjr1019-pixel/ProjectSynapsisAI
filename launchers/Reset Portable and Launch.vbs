Option Explicit

Dim shell, fso, launcherDir, scriptPath, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

launcherDir = fso.GetParentFolderName(WScript.ScriptFullName)
scriptPath = fso.BuildPath(launcherDir, "Reset Portable and Launch.ps1")

If Not fso.FileExists(scriptPath) Then
  MsgBox "Horizons Task Manager could not find its portable reset launcher:" & vbCrLf & vbCrLf & scriptPath, vbCritical, "Horizons Task Manager"
  WScript.Quit 1
End If

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & scriptPath & """"
shell.Run command, 0, False
