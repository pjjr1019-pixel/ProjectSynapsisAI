Option Explicit

Dim shell, fso, launcherDir, root, launcherPath, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

launcherDir = fso.GetParentFolderName(WScript.ScriptFullName)
root = fso.GetParentFolderName(launcherDir)
launcherPath = fso.BuildPath(launcherDir, "Launch Horizons Task Manager.cmd")

If Not fso.FileExists(launcherPath) Then
  MsgBox "Horizons Task Manager could not find its switchable launcher:" & vbCrLf & vbCrLf & launcherPath, vbCritical, "Horizons Task Manager"
  WScript.Quit 1
End If

shell.CurrentDirectory = root
command = "cmd.exe /c """ & launcherPath & """"
shell.Run command, 0, False
