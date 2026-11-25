# Installs the official Windows Russian Text-to-Speech capability for Apocalypse.
# Run this script from the game folder. Windows may request administrator approval.
$ErrorActionPreference = "Stop"
$capabilityName = "Language.TextToSpeech~~~ru-RU~0.0.1.0"

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    $args = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $args
    exit
}

Write-Host "Проверяю русский голосовой пакет Windows..." -ForegroundColor Cyan
try {
    $capability = Get-WindowsCapability -Online -Name $capabilityName
    if ($capability.State -ne "Installed") {
        Write-Host "Устанавливаю русский синтез речи (ru-RU). Это может занять несколько минут."
        Add-WindowsCapability -Online -Name $capabilityName | Out-Null
    } else {
        Write-Host "Русский компонент синтеза речи уже установлен."
    }
    Write-Host "Готово. Перезапустите Apocalypse и проверьте голос диспетчера." -ForegroundColor Green
} catch {
    Write-Warning "Не удалось установить компонент через Windows Optional Features: $($_.Exception.Message)"
    Write-Host "Откройте Параметры > Время и язык > Речь > Управление голосами и добавьте русский голос."
    Start-Process "ms-settings:speech"
}
Read-Host "Нажмите Enter для выхода"
