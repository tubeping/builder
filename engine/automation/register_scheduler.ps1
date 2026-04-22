# 셀러라이프 자동 수집 — Windows 작업 스케줄러 등록 (CDP 방식)
# 실행: PowerShell 관리자 권한 권장
#
# 스케줄: 매주 월요일 10:30 (사용자 활동 시간 10~18시 내)
# 전제: Chrome이 --remote-debugging-port=9222 플래그로 실행 중

$TaskName = "TubePing-SellerLife-Collect"
$PythonExe = (Get-Command python).Source
$ScriptPath = "C:\tubeping-sourcing\tubeping_builder\engine\automation\sellerlife_auto.py"
$WorkingDir = "C:\tubeping-sourcing\tubeping_builder\engine"

if (-not (Test-Path $ScriptPath)) {
    Write-Host "[오류] 스크립트 경로 없음: $ScriptPath" -ForegroundColor Red
    exit 1
}

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$Action = New-ScheduledTaskAction `
    -Execute $PythonExe `
    -Argument "`"$ScriptPath`"" `
    -WorkingDirectory $WorkingDir

# 매주 월요일 10:30 (사용자 활동시간 10~18 내)
$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 10:30am

# 노트북 배터리 보호 기본값 덮어쓰기
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 10) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

$Principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "TubePing 셀러라이프 자동 수집 (CDP, 주 1회 월 10:30)"

Write-Host ""
Write-Host "[완료] 등록됨: $TaskName" -ForegroundColor Green
Write-Host "  다음 실행: 매주 월요일 10:30"
Write-Host ""
Write-Host "즉시 테스트: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "상태 확인:   Get-ScheduledTask -TaskName '$TaskName' | Get-ScheduledTaskInfo"
Write-Host "삭제:        Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
