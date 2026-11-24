param(
    [string]$BrowserPath = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
)

$ErrorActionPreference = 'Stop'
$sourceFile = Join-Path $PSScriptRoot 'page-states.html'
$imageDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) 'images'
if (-not (Test-Path -LiteralPath $BrowserPath)) {
    throw 'Specify a full Chrome or Edge path with -BrowserPath.'
}
New-Item -ItemType Directory -Force -Path $imageDirectory | Out-Null
$sourceUri = ([System.Uri]$sourceFile).AbsoluteUri
foreach ($page in @('detail', 'stats', 'login', 'maintenance', 'feedback', 'review', 'tasks')) {
    $profileDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ('member04-page-state-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $profileDirectory | Out-Null
    $imageFile = Join-Path $imageDirectory ('state-' + $page + '.png')
    $browserArguments = @(
        '--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--allow-file-access-from-files', '--force-device-scale-factor=2',
        '--window-size=1440,1000',
        ('--user-data-dir="' + $profileDirectory + '"'),
        ('--screenshot="' + $imageFile + '"'),
        ('"' + $sourceUri + '?page=' + $page + '"')
    )
    $process = Start-Process -FilePath $BrowserPath -ArgumentList $browserArguments -Wait -PassThru -WindowStyle Hidden
    if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $imageFile)) {
        throw "导出 $page 失败，浏览器退出码：$($process.ExitCode)"
    }
    Write-Output "Exported $imageFile"
}
