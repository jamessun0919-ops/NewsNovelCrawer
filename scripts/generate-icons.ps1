# One-off script: generates PWA icon PNGs (brand-blue background + glyph).
# Run manually if icons need regenerating; not part of the app runtime.
Add-Type -AssemblyName System.Drawing

function New-Icon {
    param([int]$Size, [string]$OutPath)

    # Format24bppRgb (no alpha channel): apple-touch-icon in particular renders
    # broken/blank on iOS Safari when the PNG carries an alpha channel.
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    $bg = [System.Drawing.ColorTranslator]::FromHtml('#2f6feb')
    $g.Clear($bg)

    $glyph = [string][char]0x95B1
    $fontSize = [int]($Size * 0.55)
    $font = New-Object System.Drawing.Font('Microsoft JhengHei', $fontSize, [System.Drawing.FontStyle]::Bold)
    $brush = [System.Drawing.Brushes]::White
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
    $g.DrawString($glyph, $font, $brush, $rect, $format)

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

New-Icon -Size 192 -OutPath "$PSScriptRoot\..\public\icons\icon-192.png"
New-Icon -Size 512 -OutPath "$PSScriptRoot\..\public\icons\icon-512.png"
New-Icon -Size 180 -OutPath "$PSScriptRoot\..\public\icons\apple-touch-icon.png"

Write-Output 'Icons generated.'
