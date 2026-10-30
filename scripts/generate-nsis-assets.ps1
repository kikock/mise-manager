Add-Type -AssemblyName System.Drawing

$srcIconPath = Join-Path $PSScriptRoot "..\build\icon.png"
$iconsDir = Join-Path $PSScriptRoot "..\src-tauri\icons"

if (!(Test-Path $srcIconPath)) {
    Write-Error "找不到源图标: $srcIconPath"
    exit 1
}

$origImg = [System.Drawing.Image]::FromFile($srcIconPath)

# -------------------------------------------------------------
# 1. 生成 installer-sidebar.bmp (164 x 314, 24-bit RGB)
# -------------------------------------------------------------
$sidebarWidth = 164
$sidebarHeight = 314
$sidebarBmp = New-Object System.Drawing.Bitmap($sidebarWidth, $sidebarHeight, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gSidebar = [System.Drawing.Graphics]::FromImage($sidebarBmp)
$gSidebar.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gSidebar.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gSidebar.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gSidebar.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# 绘制 Windows 11 深邃雅致渐变背景
$rectSidebar = New-Object System.Drawing.Rectangle(0, 0, $sidebarWidth, $sidebarHeight)
$brushSidebar = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rectSidebar,
    [System.Drawing.Color]::FromArgb(14, 30, 54),   # 顶部深邃湛蓝
    [System.Drawing.Color]::FromArgb(7, 15, 30),    # 底部幽深黑蓝
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$gSidebar.FillRectangle($brushSidebar, $rectSidebar)
$brushSidebar.Dispose()

# 绘制背景柔和装饰圆弧与光晕
$glowBrush1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(25, 0, 120, 215))
$gSidebar.FillEllipse($glowBrush1, -40, -40, 240, 240)
$glowBrush1.Dispose()

$glowBrush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 0, 200, 160))
$gSidebar.FillEllipse($glowBrush2, 20, 180, 200, 200)
$glowBrush2.Dispose()

# 在上部居中绘制 Mise Manager Logo (72x72)
$logoSize = 72
$logoX = [int](($sidebarWidth - $logoSize) / 2)
$logoY = 48
$gSidebar.DrawImage($origImg, $logoX, $logoY, $logoSize, $logoSize)

# 绘制品牌标题
$fontTitle = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$brushTitle = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 248, 255))
$sfCenter = New-Object System.Drawing.StringFormat
$sfCenter.Alignment = [System.Drawing.StringAlignment]::Center
$sfCenter.LineAlignment = [System.Drawing.StringAlignment]::Center

$gSidebar.DrawString("Mise Manager", $fontTitle, $brushTitle, ($sidebarWidth / 2), 140, $sfCenter)

# 绘制副标题说明
$fontSub = New-Object System.Drawing.Font("Microsoft YaHei", 8, [System.Drawing.FontStyle]::Regular)
$brushSub = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(160, 180, 205))
$gSidebar.DrawString("多语言开发环境管理", $fontSub, $brushSub, ($sidebarWidth / 2), 162, $sfCenter)

# 绘制底部 Fluent 装饰线条与小标识
$penLine = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(40, 255, 255, 255), 1)
$gSidebar.DrawLine($penLine, 24, 260, ($sidebarWidth - 24), 260)
$penLine.Dispose()

$fontFooter = New-Object System.Drawing.Font("Segoe UI", 7, [System.Drawing.FontStyle]::Regular)
$brushFooter = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(100, 130, 160))
$gSidebar.DrawString("Powered by Tauri 2.x", $fontFooter, $brushFooter, ($sidebarWidth / 2), 278, $sfCenter)

$sidebarPath = Join-Path $iconsDir "installer-sidebar.bmp"
$sidebarBmp.Save($sidebarPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
Write-Host "✅ 已生成: $sidebarPath ($sidebarWidth x $sidebarHeight BMP)"

$gSidebar.Dispose()
$sidebarBmp.Dispose()
$fontTitle.Dispose()
$brushTitle.Dispose()
$fontSub.Dispose()
$brushSub.Dispose()
$fontFooter.Dispose()
$brushFooter.Dispose()
$sfCenter.Dispose()

# -------------------------------------------------------------
# 2. 生成 installer-header.bmp (150 x 57, 24-bit RGB)
# -------------------------------------------------------------
$headerWidth = 150
$headerHeight = 57
$headerBmp = New-Object System.Drawing.Bitmap($headerWidth, $headerHeight, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gHeader = [System.Drawing.Graphics]::FromImage($headerBmp)
$gHeader.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gHeader.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gHeader.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# NSIS Header 页面标准为纯白或浅灰色背景
$rectHeader = New-Object System.Drawing.Rectangle(0, 0, $headerWidth, $headerHeight)
$brushHeaderBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$gHeader.FillRectangle($brushHeaderBg, $rectHeader)
$brushHeaderBg.Dispose()

# 在右侧绘制精巧的 Logo (44x44)
$headerIconSize = 44
$headerIconX = $headerWidth - $headerIconSize - 8
$headerIconY = [int](($headerHeight - $headerIconSize) / 2)
$gHeader.DrawImage($origImg, $headerIconX, $headerIconY, $headerIconSize, $headerIconSize)

$headerPath = Join-Path $iconsDir "installer-header.bmp"
$headerBmp.Save($headerPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
Write-Host "✅ 已生成: $headerPath ($headerWidth x $headerHeight BMP)"

$gHeader.Dispose()
$headerBmp.Dispose()

# -------------------------------------------------------------
# 3. 增强生成全分辨率标准的 icon.ico (含 16, 24, 32, 48, 64, 128, 256)
# -------------------------------------------------------------
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$pngBytesList = @()

foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($origImg, 0, 0, $sz, $sz)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $pngBytesList += ,@($sz, $ms.ToArray())
    $ms.Dispose()
}

$origImg.Dispose()

# 组装 Windows 多尺寸 ICO 二进制结构
$icoStream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($icoStream)

# ICONDIR header: idReserved (0), idType (1), idCount (N)
$writer.Write([uint16]0)
$writer.Write([uint16]1)
$writer.Write([uint16]$sizes.Count)

$offset = 6 + ($sizes.Count * 16)

# 写入各分辨率条目描述 ICONDIRENTRY
foreach ($item in $pngBytesList) {
    $sz = $item[0]
    $data = $item[1]

    $w = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $h = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $writer.Write([byte]$w)            # bWidth
    $writer.Write([byte]$h)            # bHeight
    $writer.Write([byte]0)             # bColorCount
    $writer.Write([byte]0)             # bReserved
    $writer.Write([uint16]1)           # wPlanes
    $writer.Write([uint16]32)          # wBitCount
    $writer.Write([uint32]$data.Length) # dwBytesInRes
    $writer.Write([uint32]$offset)     # dwImageOffset

    $offset += $data.Length
}

# 写入各尺寸实际 PNG 图像数据
foreach ($item in $pngBytesList) {
    $data = $item[1]
    $writer.Write($data)
}

$writer.Flush()

$icoPath = Join-Path $iconsDir "icon.ico"
[System.IO.File]::WriteAllBytes($icoPath, $icoStream.ToArray())
Write-Host "✅ 已更新全分辨率标准 ICO: $icoPath (共 $($sizes.Count) 个尺寸条目: $($sizes -join ', '))"

# 同步复制到 build 目录保持统一
$buildIcoPath = Join-Path $PSScriptRoot "..\build\icon.ico"
[System.IO.File]::WriteAllBytes($buildIcoPath, $icoStream.ToArray())

$writer.Dispose()
$icoStream.Dispose()
