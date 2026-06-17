Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$outDir = Join-Path (Get-Location) "public\icons"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-AppIcon {
  param(
    [int]$Size,
    [string]$Path,
    [bool]$Maskable = $false
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $scale = $Size / 512
  function S([float]$value) { return [int][Math]::Round($value * $scale) }

  $rect = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.ColorTranslator]::FromHtml("#0B4A29")), ([System.Drawing.ColorTranslator]::FromHtml("#1B9E4B")), 135

  if ($Maskable) {
    $graphics.FillRectangle($brush, $rect)
  } else {
    $roundedPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $radius = S 112
    $diameter = $radius * 2
    $roundedPath.AddArc(0, 0, $diameter, $diameter, 180, 90)
    $roundedPath.AddArc($Size - $diameter, 0, $diameter, $diameter, 270, 90)
    $roundedPath.AddArc($Size - $diameter, $Size - $diameter, $diameter, $diameter, 0, 90)
    $roundedPath.AddArc(0, $Size - $diameter, $diameter, $diameter, 90, 90)
    $roundedPath.CloseFigure()
    $graphics.FillPath($brush, $roundedPath)
  }

  $linePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(16, 255, 255, 255)), (S 2)
  foreach ($x in @(80,176,272,368,464)) {
    $graphics.DrawLine($linePen, (S $x), 0, (S $x), $Size)
  }
  $midPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(32, 255, 255, 255)), (S 3)
  $graphics.DrawLine($midPen, 0, (S 256), $Size, (S 256))
  $graphics.DrawEllipse($midPen, (S 140), (S 140), (S 232), (S 232))

  $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(46, 6, 36, 20))
  $graphics.FillRectangle($shadowBrush, (S 158), (S 139), (S 220), (S 220))

  $badgePath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $badgeRect = New-Object System.Drawing.Rectangle (S 146), (S 118), (S 220), (S 220)
  $badgeRadius = S 56
  $badgeDiameter = $badgeRadius * 2
  $badgePath.AddArc($badgeRect.X, $badgeRect.Y, $badgeDiameter, $badgeDiameter, 180, 90)
  $badgePath.AddArc($badgeRect.Right - $badgeDiameter, $badgeRect.Y, $badgeDiameter, $badgeDiameter, 270, 90)
  $badgePath.AddArc($badgeRect.Right - $badgeDiameter, $badgeRect.Bottom - $badgeDiameter, $badgeDiameter, $badgeDiameter, 0, 90)
  $badgePath.AddArc($badgeRect.X, $badgeRect.Bottom - $badgeDiameter, $badgeDiameter, $badgeDiameter, 90, 90)
  $badgePath.CloseFigure()
  $badgeBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#F4A11A"))
  $graphics.FillPath($badgeBrush, $badgePath)

  $greenPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#0B4A29")), (S 18)
  $greenPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $greenPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawEllipse($greenPen, (S 186), (S 158), (S 140), (S 140))
  $graphics.DrawLine($greenPen, (S 188), (S 228), (S 324), (S 228))

  $whitePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(220, 255, 255, 255)), (S 18)
  $whitePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $whitePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($whitePen, (S 151), (S 386), (S 361), (S 386))

  $mintPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#9FE3B8")), (S 12)
  $mintPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $mintPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($mintPen, (S 187), (S 422), (S 325), (S 422))

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-AppIcon -Size 180 -Path (Join-Path $outDir "apple-touch-icon.png")
New-AppIcon -Size 192 -Path (Join-Path $outDir "icon-192.png")
New-AppIcon -Size 512 -Path (Join-Path $outDir "icon-512.png")
New-AppIcon -Size 192 -Path (Join-Path $outDir "maskable-192.png") -Maskable $true
New-AppIcon -Size 512 -Path (Join-Path $outDir "maskable-512.png") -Maskable $true

Write-Host "PWA icons generated in public/icons"
