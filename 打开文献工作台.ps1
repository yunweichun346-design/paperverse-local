param([switch]$NoBrowser, [ValidateRange(0,65535)][int]$Port = 8767)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

function Find-SystemPython {
    $candidates = New-Object System.Collections.Generic.List[string]
    foreach ($name in @('python.exe', 'python3.exe')) {
        Get-Command $name -All -ErrorAction SilentlyContinue | ForEach-Object { $candidates.Add($_.Source) }
    }
    foreach ($registry in @('HKCU:\Software\Python\PythonCore', 'HKLM:\Software\Python\PythonCore', 'HKLM:\Software\WOW6432Node\Python\PythonCore')) {
        if (Test-Path $registry) {
            Get-ChildItem $registry | ForEach-Object {
                $install = Get-Item (Join-Path $_.PSPath 'InstallPath') -ErrorAction SilentlyContinue
                if ($install) { $candidates.Add((Join-Path $install.GetValue('') 'python.exe')) }
            }
        }
    }
    $launcher = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($launcher) { $candidates.Add($launcher.Source) }
    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        if ($candidate -match '(?i)\\(WindowsApps|\.codex)\\|codex-runtimes' -or -not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
        $probe = New-Object System.Diagnostics.ProcessStartInfo
        $probe.FileName = $candidate
        $prefix = if ([IO.Path]::GetFileName($candidate) -eq 'py.exe') { '-3 ' } else { '' }
        $probe.Arguments = $prefix + '-I -c "import sys; print(sys.executable) if sys.version_info >= (3,10) else sys.exit(2)"'
        $probe.UseShellExecute = $false
        $probe.CreateNoWindow = $true
        $probe.RedirectStandardOutput = $true
        $probe.RedirectStandardError = $true
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $probe
        try {
            [void]$process.Start()
            if (-not $process.WaitForExit(5000)) { $process.Kill(); continue }
            $resolved = $process.StandardOutput.ReadToEnd().Trim()
            if ($process.ExitCode -eq 0 -and $resolved -notmatch '(?i)\\\.codex\\|codex-runtimes' -and (Test-Path -LiteralPath $resolved -PathType Leaf)) { return $resolved }
        } catch { continue } finally { $process.Dispose() }
    }
    throw '未找到系统 Python 3.10+。请从 https://www.python.org/downloads/windows/ 安装 Python，然后重新双击 start.bat。本阶段需要系统 Python，不需要 Node 或 AI 工具。'
}

try {
    $localPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
    $python = if (Test-Path -LiteralPath $localPython -PathType Leaf) { $localPython } else { Find-SystemPython }
    Write-Host ('使用系统 Python：' + $python)
    $launchArguments = @('-I', '-B', '-X', 'utf8', (Join-Path $PSScriptRoot '启动工作台.py'), '--port', "$Port")
    if ($NoBrowser) { $launchArguments += '--no-browser' }
    & $python @launchArguments
    exit $LASTEXITCODE
} catch {
    Write-Host ('无法启动：' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
