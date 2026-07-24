# Lightweight static server with live-reload for Rosenfeld Ranch preview
$root = $PSScriptRoot
$port = 5502
$prefix = "http://127.0.0.1:$port/"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".webp" = "image/webp"
  ".json" = "application/json"
  ".txt"  = "text/plain; charset=utf-8"
}

$reloadScript = '<script>(function(){var last=null;function check(){fetch("/__reload?t="+Date.now(),{cache:"no-store"}).then(function(r){return r.text()}).then(function(t){if(last===null)last=t;else if(t!==last)location.reload()}).catch(function(){})}setInterval(check,800)})();</script>'

function Get-TreeStamp {
  $files = Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne "preview-server.ps1" }
  $stamp = ($files | ForEach-Object { $_.FullName + $_.LastWriteTimeUtc.Ticks }) -join "|"
  return [string]$stamp.GetHashCode()
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  Write-Host "Could not start server on $prefix"
  Write-Host $_.Exception.Message
  exit 1
}

Write-Host "Rosenfeld Ranch preview: $prefix"
Write-Host "Live-reload is on. Press Ctrl+C to stop."

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)

  try {
    if ($path -eq "/__reload") {
      $bytes = [Text.Encoding]::UTF8.GetBytes((Get-TreeStamp))
      $res.ContentType = "text/plain; charset=utf-8"
      $res.Headers["Cache-Control"] = "no-store"
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
      continue
    }

    if ($path -eq "/") { $path = "/index.html" }

    $relative = $path.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar)
    $full = [IO.Path]::GetFullPath((Join-Path $root $relative))

    if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
      $res.StatusCode = 404
      $msg = [Text.Encoding]::UTF8.GetBytes("Not found")
      $res.ContentLength64 = $msg.Length
      $res.OutputStream.Write($msg, 0, $msg.Length)
      $res.Close()
      continue
    }

    $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
    $contentType = $mime[$ext]
    if (-not $contentType) { $contentType = "application/octet-stream" }

    if ($ext -eq ".html") {
      $html = [IO.File]::ReadAllText($full)
      if ($html -match "</body>") {
        $html = $html.Replace("</body>", ($reloadScript + "</body>"))
      } else {
        $html = $html + $reloadScript
      }
      $bytes = [Text.Encoding]::UTF8.GetBytes($html)
    } else {
      $bytes = [IO.File]::ReadAllBytes($full)
    }

    $res.ContentType = $contentType
    $res.Headers["Cache-Control"] = "no-cache"
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.Close()
  } catch {
    try {
      $res.StatusCode = 500
      $res.Close()
    } catch {}
  }
}
