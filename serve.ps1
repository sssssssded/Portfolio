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
  ".mp4" = "video/mp4"; ".m4v" = "video/mp4"; ".webm" = "video/webm"; ".pdf" = "application/pdf"
  ".md" = "text/markdown; charset=utf-8"; ".txt" = "text/plain; charset=utf-8"
}

# 관리자 페이지가 건드릴 수 있는 경로 (이 외에는 거부)
$writable  = '^(data/(profile|projects|posts)\.js|posts/[A-Za-z0-9_-]+\.md)$'
$deletable = '^(posts/[A-Za-z0-9_-]+\.md|assets/uploads/[A-Za-z0-9_.-]+)$'
$uploadExt = @(".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif", ".mp4", ".m4v", ".webm", ".pdf", ".html", ".htm")

function Send-Bytes($res, [byte[]]$bytes, [string]$type, [int]$code = 200) {
  $res.StatusCode = $code
  $res.ContentType = $type
  $res.Headers["Cache-Control"] = "no-store"
  $res.ContentLength64 = $bytes.Length
  try { $res.OutputStream.Write($bytes, 0, $bytes.Length) } catch { }
}

# 파일 전송 — 큰 영상도 Range 요청으로 조금씩(최대 4MB) 보내서 서버가 멈추지 않게
function Send-File($ctx, [string]$file, [string]$type) {
  $res = $ctx.Response
  $fs = [System.IO.File]::OpenRead($file)
  try {
    $len = $fs.Length
    $start = [int64]0
    $end = $len - 1
    $range = $ctx.Request.Headers["Range"]
    $res.Headers["Accept-Ranges"] = "bytes"
    $res.Headers["Cache-Control"] = "no-store"
    $res.ContentType = $type
    if ($range -and $len -gt 0 -and $range -match '^bytes=(\d*)-(\d*)$') {
      if ($matches[1] -ne "") {
        $start = [int64]$matches[1]
        if ($matches[2] -ne "") { $end = [int64]$matches[2] }
      } elseif ($matches[2] -ne "") {
        $start = [Math]::Max([int64]0, $len - [int64]$matches[2])
      }
      if ($start -ge $len) {
        $res.StatusCode = 416
        $res.Headers["Content-Range"] = "bytes */$len"
        return
      }
      $end = [Math]::Min([Math]::Min($end, $len - 1), $start + 4MB - 1)
      $res.StatusCode = 206
      $res.Headers["Content-Range"] = "bytes $start-$end/$len"
    } else {
      $res.StatusCode = 200
    }
    $count = $end - $start + 1
    $res.ContentLength64 = $count
    if ($ctx.Request.HttpMethod -eq "HEAD" -or $count -le 0) { return }
    [void]$fs.Seek($start, [System.IO.SeekOrigin]::Begin)
    $buf = New-Object byte[] 65536
    $left = $count
    while ($left -gt 0) {
      $n = $fs.Read($buf, 0, [int][Math]::Min($buf.Length, $left))
      if ($n -le 0) { break }
      $res.OutputStream.Write($buf, 0, $n)
      $left -= $n
    }
  } catch {
    # 브라우저가 중간에 끊은 경우 등은 무시
  } finally {
    $fs.Close()
  }
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

# 이전에 켜 둔 serve.ps1 (강제로 닫혀 남은 것 포함) 을 찾아 종료 → 포트 비우기
function Stop-OldServers {
  $others = Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" |
    Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -match 'serve\.ps1' }
  foreach ($p in $others) {
    try {
      Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
      Write-Host "Stopped old server (PID $($p.ProcessId))"
    } catch { }
  }
  if ($others) { Start-Sleep -Milliseconds 700 }
}

function Start-Listener {
  $l = New-Object System.Net.HttpListener
  $l.Prefixes.Add("http://localhost:$Port/")
  $l.Start()
  return $l
}

try {
  $listener = Start-Listener
} catch {
  Write-Host "Port $Port is busy - stopping the old server and retrying..."
  Stop-OldServers
  try {
    $listener = Start-Listener
  } catch {
    Write-Host "Port $Port is still in use by another program. Try:  `$env:PORT=8001; powershell -ExecutionPolicy Bypass -File serve.ps1"
    exit 1
  }
}
Write-Host "Serving $root at http://localhost:$Port/"
Write-Host "Admin:  http://localhost:$Port/Managers/Managers.html"
Write-Host "Stop:   Ctrl+C (or close this window)"

try {
  while ($listener.IsListening) {
    # 짧게 나눠 기다려야 Ctrl+C 가 바로 먹힘
    $task = $listener.GetContextAsync()
    while (-not $task.AsyncWaitHandle.WaitOne(250)) { }
    $ctx = $task.GetAwaiter().GetResult()
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
          Send-File $ctx $file $type
        } else {
          Send-Bytes $res ($utf8.GetBytes("Not Found")) "text/plain; charset=utf-8" 404
        }
      }
    } catch {
      try { Send-Json $res @{ ok = $false; error = $_.Exception.Message } 500 } catch { }
    }
    try { $res.Close() } catch { }
  }
} catch {
  # Ctrl+C 등으로 멈출 때 나는 오류는 무시
} finally {
  try { $listener.Stop() } catch { }
  try { $listener.Close() } catch { }
  Write-Host "Server stopped. Port $Port released."
}
