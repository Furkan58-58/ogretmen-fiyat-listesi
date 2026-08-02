$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms

$projectDir = Split-Path -Parent $PSScriptRoot
$workbook = Join-Path $projectDir "output\Fiyat-Listesi-Yonetim.xlsx"
$siteUrl = "https://furkan58-58.github.io/ogretmen-fiyat-listesi/"
$gitCandidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Git\cmd\git.exe"),
    "C:\Program Files\Git\cmd\git.exe",
    (Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe")
)

function Show-Message([string]$message, [string]$title, $icon) {
    [System.Windows.Forms.MessageBox]::Show(
        $message,
        $title,
        [System.Windows.Forms.MessageBoxButtons]::OK,
        $icon
    ) | Out-Null
}

function Find-Git {
    $command = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    foreach ($candidate in $gitCandidates) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    throw "Git programi bulunamadi. Codex ile GitHub baglantisini yeniden kurun."
}

function Run-Git([string[]]$arguments) {
    $oldErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & $script:gitExe -c "safe.directory=$($projectDir.Replace('\', '/'))" @arguments 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $oldErrorAction
    if ($exitCode -ne 0) {
        throw (($output | Out-String).Trim())
    }
    return ($output | Out-String).Trim()
}

try {
    if (-not (Test-Path -LiteralPath $workbook)) {
        throw "Guncellenecek Excel dosyasi bulunamadi:`n$workbook"
    }

    $script:gitExe = Find-Git
    Set-Location -LiteralPath $projectDir

    Run-Git @("add", "--", "output/Fiyat-Listesi-Yonetim.xlsx") | Out-Null
    & $script:gitExe -c "safe.directory=$($projectDir.Replace('\', '/'))" diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Show-Message "Excel dosyasinda gonderilecek yeni bir degisiklik bulunamadi.`n`nOnce Excel'i kaydedip tekrar deneyin." "Fiyat Listesi" ([System.Windows.Forms.MessageBoxIcon]::Information)
        exit 0
    }

    Run-Git @("commit", "-m", "Fiyat listesini guncelle") | Out-Null
    Run-Git @("pull", "--rebase", "origin", "main") | Out-Null
    Run-Git @("push", "origin", "main") | Out-Null

    $answer = [System.Windows.Forms.MessageBox]::Show(
        "Excel GitHub'a gonderildi.`n`nWeb sitesi ve PDF yaklasik 1-2 dakika icinde otomatik yenilenecek.`n`nSiteyi simdi acmak ister misiniz?",
        "Guncelleme basarili",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Information
    )
    if ($answer -eq [System.Windows.Forms.DialogResult]::Yes) {
        Start-Process $siteUrl
    }
}
catch {
    $detail = $_.Exception.Message
    if ($detail -match "index.lock|another git process") {
        $detail = "Baska bir guncelleme islemi calisiyor. Biraz bekleyip tekrar deneyin."
    } elseif ($detail -match "Authentication|credential|403|Permission denied") {
        $detail = "GitHub oturumu bulunamadi. Codex veya GitHub CLI ile yeniden giris yapin."
    } elseif ($detail -match "could not resolve|unable to access|timed out") {
        $detail = "Internet baglantisi kurulamadı. Baglantiyi kontrol edip tekrar deneyin."
    }
    Show-Message "Guncelleme tamamlanamadi.`n`n$detail" "Fiyat Listesi - Hata" ([System.Windows.Forms.MessageBoxIcon]::Error)
    exit 1
}

