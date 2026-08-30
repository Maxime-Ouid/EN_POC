<#
  Environnement de dev du POC en une commande.

  Le backend (runserver_plus) et le frontend (vite) bloquent chacun leur
  terminal : lancés à la main, ils en occupent deux, et il faut se souvenir des
  deux Ctrl+C. Ce script les démarre détachés, note leurs PID dans .dev/, et
  sait les arrêter tous les deux d'un coup.

  Les processus enfants comptent : `npm run dev` engendre node, runserver_plus
  engendre un second python (autoreload). D'où `taskkill /T` à l'arrêt plutôt
  qu'un Stop-Process, qui laisserait les enfants tourner et le port occupé.

  Usage :
    .\dev.ps1              # démarre les deux, attend que les ports répondent
    .\dev.ps1 stop         # arrête les deux (enfants compris)
    .\dev.ps1 status       # qui tourne, sur quels ports
    .\dev.ps1 restart
    .\dev.ps1 logs         # dernières lignes des sorties
    .\dev.ps1 totp         # code TOTP de carla, valable 30s

  Si Windows refuse d'exécuter le script :
    powershell -ExecutionPolicy Bypass -File .\dev.ps1

  ENCODAGE - ce fichier doit rester en UTF-8 AVEC BOM, et sans tiret cadratin,
  guillemet courbe ni apostrophe typographique. PowerShell 5.1 lit un .ps1 sans
  BOM en ANSI (CP1252) : le tiret cadratin devient alors trois octets dont le
  dernier vaut un guillemet fermant, qui termine la chaîne en cours et fait
  échouer le parseur trente lignes plus loin, sur des accolades parfaitement
  équilibrées. Constaté, pas théorique.
#>

param(
  [ValidateSet('start', 'stop', 'restart', 'status', 'logs', 'totp')]
  [string]$Action = 'start'
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$stateDir = Join-Path $root '.dev'
$pidFile = Join-Path $stateDir 'pids.json'
$backendOut = Join-Path $stateDir 'backend.out.log'
$backendErr = Join-Path $stateDir 'backend.err.log'
$frontendOut = Join-Path $stateDir 'frontend.out.log'
$frontendErr = Join-Path $stateDir 'frontend.err.log'
$venvPython = Join-Path $root 'backend\.venv\Scripts\python.exe'

$BackendPort = 8000
$FrontendPort = 5173

# --- Outils -----------------------------------------------------------------

function Test-Port([int]$Port) {
  $client = New-Object Net.Sockets.TcpClient
  try {
    $client.Connect('127.0.0.1', $Port)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Test-Alive($ProcessId) {
  if (-not $ProcessId) { return $false }
  return $null -ne (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

function Read-State {
  if (Test-Path $pidFile) {
    return Get-Content $pidFile -Raw | ConvertFrom-Json
  }
  return $null
}

# Arrête le processus ET sa descendance : sans /T, node et le python d'autoreload
# survivent et gardent le port.
function Stop-Tree($ProcessId, [string]$Label) {
  if (Test-Alive $ProcessId) {
    taskkill /PID $ProcessId /T /F 2>&1 | Out-Null
    Write-Host "  $Label arrêté (PID $ProcessId)" -ForegroundColor DarkGray
  } else {
    Write-Host "  $Label n'était pas en cours" -ForegroundColor DarkGray
  }
}

# Attend qu'un service ouvre son port, MAIS surveille aussi son processus : un
# serveur qui meurt au démarrage (dépendance manquante, migration en retard) ne
# répondra jamais, et attendre le délai complet pour dire "pas répondu" cache la
# seule chose utile, la trace dans le log.
function Wait-Service([int]$Port, [string]$Label, $ProcessId, [string]$ErrorLog, [int]$TimeoutSeconds = 60) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Port $Port) {
      Write-Host "  $Label prêt sur le port $Port" -ForegroundColor Green
      return $true
    }
    if (-not (Test-Alive $ProcessId)) {
      Write-Host "  $Label s'est arrêté au démarrage :" -ForegroundColor Red
      if (Test-Path $ErrorLog) {
        Get-Content $ErrorLog -Tail 6 | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
      }
      Write-Host "    (trace complète : .\dev.ps1 logs)" -ForegroundColor DarkGray
      return $false
    }
    Start-Sleep -Milliseconds 500
  }
  Write-Host "  $Label n'a pas répondu en $TimeoutSeconds s - voir .\dev.ps1 logs" -ForegroundColor Yellow
  return $false
}

# --- Actions ----------------------------------------------------------------

function Start-Dev {
  $state = Read-State
  if ($state -and ((Test-Alive $state.backend) -or (Test-Alive $state.frontend))) {
    Write-Host "Déjà démarré. '.\dev.ps1 status' pour l'état, '.\dev.ps1 stop' pour arrêter." -ForegroundColor Yellow
    return
  }
  if (-not (Test-Path $venvPython)) {
    throw "Venv backend introuvable : $venvPython (voir SETUP.md)"
  }
  if (-not (Test-Path (Join-Path $root 'localhost+5.pem'))) {
    throw "Certificat localhost+5.pem absent à la racine - les deux serveurs tournent en HTTPS (voir CLAUDE.md, Commandes)"
  }
  # Un port déjà pris signifie presque toujours un serveur oublié d'une session
  # précédente : le dire plutôt que d'échouer obscurément au démarrage.
  foreach ($port in @($BackendPort, $FrontendPort)) {
    if (Test-Port $port) {
      throw "Le port $port est déjà occupé - un serveur tourne encore (.\dev.ps1 stop, ou fermer le terminal concerné)"
    }
  }

  New-Item -ItemType Directory -Force -Path $stateDir | Out-Null

  Write-Host "Démarrage..." -ForegroundColor Cyan

  $backend = Start-Process -FilePath $venvPython `
    -ArgumentList 'manage.py', 'runserver_plus', '--cert-file', '../localhost+5.pem', '--key-file', '../localhost+5-key.pem' `
    -WorkingDirectory (Join-Path $root 'backend') `
    -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr `
    -WindowStyle Hidden -PassThru

  # npm est un .cmd : passer par cmd.exe évite les surprises de résolution, et
  # donne un parent unique à tuer avec toute sa descendance.
  $frontend = Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/c', 'npm run dev' `
    -WorkingDirectory (Join-Path $root 'frontend') `
    -RedirectStandardOutput $frontendOut -RedirectStandardError $frontendErr `
    -WindowStyle Hidden -PassThru

  [pscustomobject]@{
    backend  = $backend.Id
    frontend = $frontend.Id
    started  = (Get-Date).ToString('s')
  } | ConvertTo-Json | Set-Content $pidFile

  $backendOk = Wait-Service $BackendPort 'Backend' $backend.Id $backendErr
  $frontendOk = Wait-Service $FrontendPort 'Frontend' $frontend.Id $frontendErr

  if (-not $backendOk) {
    Write-Host ""
    Write-Host "  Dépendance Python manquante ? Le venv se remet à jour avec :" -ForegroundColor Yellow
    Write-Host "    backend\.venv\Scripts\python.exe -m pip install -r requirements.txt" -ForegroundColor Yellow
  }
  if (-not ($backendOk -and $frontendOk)) {
    Write-Host "  Puis : .\dev.ps1 stop, et relancer." -ForegroundColor DarkGray
    return
  }

  Write-Host ""
  Write-Host "  Office A : https://officea.localhost:$FrontendPort" -ForegroundColor Cyan
  Write-Host "  Office B : https://officeb.localhost:$FrontendPort" -ForegroundColor Cyan
  Write-Host "  Comptes  : carla / demo1234 (superadmin, MFA déjà confirmée - .\dev.ps1 totp)" -ForegroundColor DarkGray
  Write-Host "             alice / demo1234 (admin office A, enrôlement MFA au 1er login)" -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "  Arrêter : .\dev.ps1 stop" -ForegroundColor DarkGray
}

function Stop-Dev {
  $state = Read-State
  if (-not $state) {
    Write-Host "Rien à arrêter (aucun PID enregistré)." -ForegroundColor Yellow
    return
  }
  Write-Host "Arrêt..." -ForegroundColor Cyan
  Stop-Tree $state.frontend 'Frontend'
  Stop-Tree $state.backend 'Backend'
  Remove-Item $pidFile -ErrorAction SilentlyContinue
}

function Show-Status {
  $state = Read-State
  if (-not $state) {
    Write-Host "Aucun démarrage enregistré." -ForegroundColor Yellow
  } else {
    Write-Host "Démarré le $($state.started)" -ForegroundColor DarkGray
    foreach ($item in @(
        @{ Label = 'Backend'; Id = $state.backend; Port = $BackendPort },
        @{ Label = 'Frontend'; Id = $state.frontend; Port = $FrontendPort })) {
      $alive = Test-Alive $item.Id
      $listening = Test-Port $item.Port
      $color = 'Red'
      if ($alive -and $listening) { $color = 'Green' }
      elseif ($alive) { $color = 'Yellow' }
      Write-Host ("  {0,-9} PID {1,-7} processus:{2,-6} port {3}:{4}" -f `
          $item.Label, $item.Id, $alive, $item.Port, $listening) -ForegroundColor $color
    }
  }
}

function Show-Logs {
  foreach ($log in @($backendErr, $backendOut, $frontendErr, $frontendOut)) {
    if (Test-Path $log) {
      $lines = Get-Content $log -Tail 20
      if ($lines) {
        Write-Host "--- $(Split-Path $log -Leaf) ---" -ForegroundColor Cyan
        $lines | ForEach-Object { Write-Host $_ }
        Write-Host ""
      }
    }
  }
  Write-Host "Suivre en direct : Get-Content '$frontendErr' -Wait -Tail 20" -ForegroundColor DarkGray
}

function Show-Totp {
  if (-not (Test-Path $venvPython)) { throw "Venv backend introuvable : $venvPython" }
  # Secret fixe posé par seed_demo (vecteur de test RFC 6238) : le calcul ne
  # touche pas la base, inutile de démarrer Django.
  $code = & $venvPython -c "from django_otp.oath import totp; from binascii import unhexlify; print('%06d' % totp(unhexlify('3132333435363738393031323334353637383930')))"
  Write-Host "Code TOTP de carla : $code" -ForegroundColor Green
  Write-Host "Valable 30 secondes - relancer si l'écran le refuse." -ForegroundColor DarkGray
}

switch ($Action) {
  'start' { Start-Dev }
  'stop' { Stop-Dev }
  'restart' { Stop-Dev; Start-Sleep -Seconds 1; Start-Dev }
  'status' { Show-Status }
  'logs' { Show-Logs }
  'totp' { Show-Totp }
}
