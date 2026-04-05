Option Explicit

Dim shell, fso, launcherDir, root, scriptPath, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

launcherDir = fso.GetParentFolderName(WScript.ScriptFullName)
root = fso.GetParentFolderName(launcherDir)
scriptPath = fso.BuildPath(launcherDir, "Launch Mode Chooser.ps1")

If Not fso.FileExists(scriptPath) Then
  MsgBox "Horizons could not find the launch chooser script:" & vbCrLf & vbCrLf & scriptPath, vbCritical, "Horizons Launch Chooser"
  WScript.Quit 1
End If

shell.CurrentDirectory = root
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptPath & """"
shell.Run command, 0, False
