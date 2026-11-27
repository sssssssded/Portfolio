# 켜져 있는 serve.ps1 서버를 모두 종료하고 포트를 비웁니다.
# 실행: powershell -ExecutionPolicy Bypass -File stop-server.ps1
$found = Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" |
  Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -match 'serve\.ps1' }

if (-not $found) {
  Write-Host "No running server."
  exit 0
}
foreach ($p in $found) {
  try {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
    Write-Host "Stopped server (PID $($p.ProcessId))"
  } catch {
    Write-Host "Could not stop PID $($p.ProcessId): $($_.Exception.Message)"
  }
}
Write-Host "Done. Port released."
