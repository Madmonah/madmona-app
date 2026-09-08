param([string]$dir, [int]$secs=240, [int]$every=4)
Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class DpiA { [DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); }'
[DpiA]::SetProcessDPIAware() | Out-Null
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$end = (Get-Date).AddSeconds($secs)
while ((Get-Date) -lt $end) {
  $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
  $ms = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $bmp.Save("$dir/$ms.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Start-Sleep -Seconds $every
}
"done"
