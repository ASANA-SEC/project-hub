# Speak each line of a JSON list [{id, text}] into <outdir>\<id>.wav with the Windows English voice.
param([string]$Json, [string]$OutDir, [string]$Voice = 'Microsoft Zira Desktop', [int]$Rate = 0)
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice($Voice)
$s.Rate = $Rate
$items = Get-Content -Raw -Encoding UTF8 $Json | ConvertFrom-Json
foreach ($it in $items) {
  $s.SetOutputToWaveFile((Join-Path $OutDir ($it.id + '.wav')))
  $s.Speak($it.text)
}
$s.SetOutputToNull()
$s.Dispose()
