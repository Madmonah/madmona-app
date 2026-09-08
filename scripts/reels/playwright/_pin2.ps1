param([string]$mode='pin',[int]$procId=9748)
Add-Type @"
using System;using System.Runtime.InteropServices;using System.Text;
public class W{
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr l);
 public delegate bool EnumWindowsProc(IntPtr h, IntPtr l);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);
 [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x,int y,int cx,int cy,uint f);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
}
"@
$targets=New-Object System.Collections.ArrayList
$cb=[W+EnumWindowsProc]{ param($h,$l)
  $pid2=0; [void][W]::GetWindowThreadProcessId($h,[ref]$pid2)
  if($pid2 -eq $procId -and [W]::GetWindowTextLength($h) -gt 0){ [void]$targets.Add($h) }
  return $true }
[void][W]::EnumWindows($cb,[IntPtr]::Zero)
$TOP=[IntPtr]-1; $NOTOP=[IntPtr]-2; $F=0x0002 -bor 0x0001
foreach($h in $targets){
  if($mode -eq 'pin'){ [void][W]::ShowWindow($h,9); [void][W]::SetWindowPos($h,$TOP,0,0,0,0,$F); [void][W]::SetForegroundWindow($h) }
  else { [void][W]::SetWindowPos($h,$NOTOP,0,0,0,0,$F) }
}
"windows: $($targets.Count) mode: $mode pid: $procId"
