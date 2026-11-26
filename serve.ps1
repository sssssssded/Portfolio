# 로컬 미리보기 + 관리자 페이지 저장용 웹 서버 (Python/Node 없이 사용)
# 실행: powershell -ExecutionPolicy Bypass -File serve.ps1
# 사이트:   http://localhost:8000
# 관리자:   http://localhost:8000/Managers/Managers.html
# 종료: Ctrl+C
#
# 관리자 페이지가 쓰는 API (이 서버에서만 동작, GitHub Pages 에서는 없음)
#   GET  /api/ping
#   POST /api/write?path=...   본문 그대로 파일에 저장 (data/*.js, posts/*.md 만 허용)
#   POST /api/delete?path=...  파일 삭제 (posts/*.md, assets/uploads/* 만 허용)
#   POST /api/upload?name=...  업로드 파일을 assets/uploads/ 에 저장하고 경로 반환
param([int]$Port = 8000)
if ($env:PORT) { $Port = [int]$env:PORT }

$root = (Resolve-Path $PSScriptRoot).Path
$utf8 = New-Object System.Text.UTF8Encoding($false)
$types = @{
  ".html" = "text/html; charset=utf-8"; ".htm" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"
  ".js" = "application/javascript; charset=utf-8"; ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"; ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"; ".gif" = "image/gif"
  ".svg" = "image/svg+xml"; ".webp" = "image/webp"; ".avif" = "image/avif"; ".ico" = "image/x-icon"
  ".mp4" = "video/mp4"; ".webm" = "video/webm"; ".pdf" = "application/pdf"
  ".md" = "text/markdown; charset=utf-8"; ".txt" = "text/plain; charset=utf-8"
}

# 관리자 페이지가 건드릴 수 있는 경로 (이 외에는 거부)
$writable  = '^(data/(profile|projects|posts)\.js|posts/[A-Za-z0-9_-]+\.md)$'
$deletable = '^(posts/[A-Za-z0-9_-]+\.md|assets/uploads/[A-Za-z0-9_.-]+)$'
$uploadExt = @(".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif", ".mp4", ".webm", ".pdf", ".html", ".htm")

function Send-Bytes($res, [byte[]]$bytes, [string]$type, [int]$code = 200) {
  $res.StatusCode = $code
  $res.ContentType = $type
  $res.Headers["Cache-Control"] = "no-store"
  $res.ContentLength64 = $bytes.Length
  try { $res.OutputStream.Write($bytes, 0, $bytes.Length) } catch { }
}

function Send-Json($res, $obj, [int]$code = 200) {
  $json = $obj | ConvertTo-Json -Compress
  Send-Bytes $res ($utf8.GetBytes($json)) "application/json; charset=utf-8" $code
}

function Read-Body($req) {
  $ms = New-Object System.IO.MemoryStream
  $req.InputStream.CopyTo($ms)
  return , $ms.ToArray()
}

function Get-SafePath([string]$rel) {
  $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
  if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) { throw "path outside site root" }
  return $full
}

function Invoke-Api($ctx, [string]$path) {
  $req = $ctx.Request
  $res = $ctx.Response

  # 다른 웹사이트에서 몰래 보내는 요청 차단 (관리자 페이지는 X-Admin 헤더를 붙임)
  if ($req.Headers["X-Admin"] -ne "1") { Send-Json $res @{ ok = $false; error = "forbidden" } 403; return }

  switch ($path) {
    "api/ping" {
      Send-Json $res @{ ok = $true }
      return
    }
    "api/write" {
      $rel = [string]$req.QueryString["path"]
      if ($req.HttpMethod -ne "POST" -or $rel -notmatch $writable) { Send-Json $res @{ ok = $false; error = "not allowed: $rel" } 403; return }
      $full = Get-SafePath $rel
      $dir = Split-Path $full
      if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
      [System.IO.File]::WriteAllBytes($full, (Read-Body $req))
      Write-Host "saved  $rel"
      Send-Json $res @{ ok = $true; path = $rel }
      return
    }
    "api/delete" {
      $rel = [string]$req.QueryString["path"]
      if ($req.HttpMethod -ne "POST" -or $rel -notmatch $deletable) { Send-Json $res @{ ok = $false; error = "not allowed: $rel" } 403; return }
      $full = Get-SafePath $rel
      if (Test-Path $full -PathType Leaf) { Remove-Item $full -Force }
      Write-Host "delete $rel"
      Send-Json $res @{ ok = $true }
      return
    }
    "api/upload" {
      $name = [string]$req.QueryString["name"]
      $ext = [System.IO.Path]::GetExtension($name).ToLower()
      if ($req.HttpMethod -ne "POST" -or $uploadExt -notcontains $ext) { Send-Json $res @{ ok = $false; error = "file type not allowed: $ext" } 403; return }
      $dir = Join-Path $root "assets\uploads"
      if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
      $file = (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + [guid]::NewGuid().ToString("N").Substring(0, 6) + $ext
      [System.IO.File]::WriteAllBytes((Join-Path $dir $file), (Read-Body $req))
      Write-Host "upload assets/uploads/$file"
      Send-Json $res @{ ok = $true; path = "assets/uploads/$file" }
      return
    }
  }
  Send-Json $res @{ ok = $false; error = "unknown api" } 404
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/"
Write-Host "Admin:  http://localhost:$Port/Managers/Managers.html"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
      if ($path.StartsWith("api/")) {
        Invoke-Api $ctx $path
      } else {
        if ($path -eq "") { $path = "index.html" }
        $file = Get-SafePath $path
        if (Test-Path $file -PathType Container) { $file = Join-Path $file "index.html" }
        if (Test-Path $file -PathType Leaf) {
          $ext = [System.IO.Path]::GetExtension($file).ToLower()
          $type = if ($types[$ext]) { $types[$ext] } else { "application/octet-stream" }
          Send-Bytes $res ([System.IO.File]::ReadAllBytes($file)) $type
        } else {
          Send-Bytes $res ($utf8.GetBytes("Not Found")) "text/plain; charset=utf-8" 404
        }
      }
    } catch {
      try { Send-Json $res @{ ok = $false; error = $_.Exception.Message } 500 } catch { }
    }
    try { $res.Close() } catch { }
  }
} finally {
  $listener.Stop()
}
