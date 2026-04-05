Option Explicit

Dim shell, fso, launcherDir, root, launcherPath, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

launcherDir = fso.GetParentFolderName(WScript.ScriptFullName)
root = fso.GetParentFolderName(fso.GetParentFolderName(launcherDir))
launcherPath = fso.BuildPath(launcherDir, "Horizons Task Manager Portable.cmd")

If Not fso.FileExists(launcherPath) Then
  MsgBox "Horizons Task Manager Portable could not find its launcher:" & vbCrLf & vbCrLf & launcherPath, vbCritical, "Horizons Task Manager Portable"
  WScript.Quit 1
End If

shell.CurrentDirectory = root
command = "cmd.exe /c """ & launcherPath & """"
shell.Run command, 0, False
