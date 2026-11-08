# Atualização semanal dos dados (roda pelo Agendador de Tarefas do Windows).
# Precisa rodar no Brasil: as APIs do IBGE e o FTP do CAGED recusam conexões de fora,
# por isso não roda no GitHub Actions.
#
# Usa uma worktree separada (_atualizacao/, no commit atual de origin/main) para não
# interferir no que estiver aberto na pasta principal. Se os JSONs mudarem, commita e
# faz push em main; a Vercel publica sozinha.

$repo = Split-Path -Parent $PSScriptRoot
$wt = Join-Path $repo "_atualizacao"
$uv = Join-Path $env:USERPROFILE ".local\bin\uv.exe"
$log = Join-Path $repo "_scratch\atualizacao.log"
New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null

function Rodar($descricao, [scriptblock]$comando) {
    & $comando
    if ($LASTEXITCODE -ne 0) { throw "$descricao falhou (código $LASTEXITCODE)" }
}

Start-Transcript -Path $log -Append | Out-Null
$codigo = 0
try {
    Write-Output "=== $(Get-Date -Format s) início ==="
    Rodar "git fetch" { git -C $repo fetch origin main }
    if (Test-Path $wt) {
        Rodar "checkout" { git -C $wt checkout --detach --force origin/main }
        Rodar "limpeza" { git -C $wt clean -fd -- web/public/dados }
    } else {
        Rodar "worktree" { git -C $repo worktree add --detach $wt origin/main }
    }

    Push-Location (Join-Path $wt "pipeline")
    try {
        Rodar "uv sync" { & $uv sync --frozen }
        Rodar "pipeline" { & $uv run observatorio atualizar }
    } finally { Pop-Location }

    Rodar "git add" { git -C $wt add web/public/dados }
    git -C $wt diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Output "Sem mudanças nos dados."
    } else {
        Rodar "git commit" { git -C $wt commit -m "dados: atualização semanal" }
        Rodar "git push" { git -C $wt push origin HEAD:main }
        Write-Output "Dados atualizados e enviados."
    }
} catch {
    Write-Output "ERRO: $_"
    $codigo = 1
} finally {
    Write-Output "=== $(Get-Date -Format s) fim ==="
    Stop-Transcript | Out-Null
}
exit $codigo
