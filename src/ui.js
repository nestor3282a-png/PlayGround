import * as THREE from '../vendor/three.module.js'
import { CHARACTER_DEFS, createPortrait } from './models.js'

const $ = (id) => document.getElementById(id)
const fmtTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—:—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export class UI {
  constructor(game) {
    this.game = game
    this.screens = {
      title: $('titleScreen'),
      how: $('howScreen'),
      roster: $('rosterScreen'),
      pause: $('pauseScreen'),
      end: $('endScreen'),
    }
    this.currentScreen = 'title'
    this.howReturn = 'title'
    this.portraits = new Map()
    for (const def of CHARACTER_DEFS) this.portraits.set(def.id, createPortrait(def))
    this.lastHud = {}
    this.labelEls = new Map()
    this._toastTimer = 0
    this._tapeTimer = 0
    this._dialogueTimer = 0
    this._bind()
    this._loadBest()
    window.addEventListener('pointerdown', () => { this.game.audio.init() }, { once: true })
  }

  _bind() {
    const g = this.game
    $('playBtn').addEventListener('click', () => { this.game.audio.ui(); g.startRun() })
    $('howBtn').addEventListener('click', () => { this.game.audio.ui(); this.openHow('title') })
    $('howCloseBtn').addEventListener('click', () => { this.game.audio.ui(); this.closeHow() })

    $('rosterBtn').addEventListener('click', () => { this.game.audio.ui(); g.openRoster(false) })
    $('pauseBtn').addEventListener('click', () => { this.game.audio.ui(); g.pause() })
    $('rosterCloseBtn').addEventListener('click', () => { this.game.audio.ui(); g.closeRoster() })
    $('rosterDoneBtn').addEventListener('click', () => { this.game.audio.ui(); g.closeRoster() })
    $('cancelAccuseBtn').addEventListener('click', () => { this.game.audio.ui(); g.cancelAccuse() })
    $('confirmAccuseBtn').addEventListener('click', () => { this.game.audio.ui(); g.confirmAccuse() })

    $('resumeBtn').addEventListener('click', () => { this.game.audio.ui(); g.resume() })
    $('pauseHowBtn').addEventListener('click', () => { this.game.audio.ui(); this.openHow('pause') })
    $('restartBtn').addEventListener('click', () => { this.game.audio.ui(); g.restart() })
    $('quitBtn').addEventListener('click', () => { this.game.audio.ui(); g.quitToMenu() })

    $('retryBtn').addEventListener('click', () => { this.game.audio.ui(); g.startRun() })
    $('menuBtn').addEventListener('click', () => { this.game.audio.ui(); g.quitToMenu() })

    $('confirmAccuseBtn').disabled = true

    $('suspectGrid').addEventListener('click', (event) => {
      const card = event.target.closest('.suspect-card')
      if (!card) return
      this.game.audio.ui()
      g.selectSuspect(Number(card.dataset.index))
    })

    const volume = $('volumeRange')
    const sens = $('sensRange')
    const quality = $('qualitySelect')
    volume.value = Math.round(this.game.settings.volume * 100)
    sens.value = Math.round(this.game.settings.sensitivity * 100)
    quality.value = this.game.settings.quality
    volume.addEventListener('input', () => g.setVolume(Number(volume.value) / 100))
    sens.addEventListener('input', () => g.setSensitivity(Number(sens.value) / 100))
    quality.addEventListener('change', () => g.setQuality(quality.value))

    $('boot').addEventListener('transitionend', () => { $('boot').style.display = 'none' })
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && this.currentScreen === 'how') {
        this.closeHow()
      }
    })
  }

  _loadBest() {
    try {
      const best = Number(localStorage.getItem('ghostface.best') || 0)
      if (best > 0) $('bestTime').textContent = `MEJOR HUIDA — ${fmtTime(best)}`
    } catch {}
  }

  _saveBest(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    try {
      const prev = Number(localStorage.getItem('ghostface.best') || 0)
      if (!prev || seconds < prev) {
        localStorage.setItem('ghostface.best', String(seconds))
        $('bestTime').textContent = `MEJOR HUIDA — ${fmtTime(seconds)}`
      }
    } catch {}
  }

  bootDone() {
    const boot = $('boot')
    boot.classList.add('done')
    setTimeout(() => { if (!boot.classList.contains('active')) boot.style.display = 'none' }, 900)
  }

  showScreen(name) {
    for (const [key, el] of Object.entries(this.screens)) {
      el.classList.toggle('active', key === name)
    }
    this.currentScreen = name
    if (name) document.body.dataset.screen = name
  }

  hideScreens() {
    for (const el of Object.values(this.screens)) el.classList.remove('active')
    this.currentScreen = null
    delete document.body.dataset.screen
  }

  openHow(from) {
    this.howReturn = from
    this.showScreen('how')
  }

  closeHow() {
    if (this.howReturn === 'pause') {
      this.showScreen('pause')
    } else if (this.howReturn === 'title') {
      this.showScreen('title')
    } else if (this.howReturn === 'game') {
      this.hideScreens()
      this.game.resumeToGame()
    } else {
      this.showScreen('title')
    }
  }

  setHUD(visible) {
    $('hud').classList.toggle('hidden', !visible)
  }

  setHudOut(out) {
    $('hud').classList.toggle('hud-out', out)
  }

  resetHUD() {
    this.lastHud = {}
    $('objectiveText').textContent = 'Encuentra 3 cintas de vídeo'
    $('compassDist').textContent = '— m'
    $('compass').querySelector('svg').style.transform = 'rotate(0deg)'
    document.querySelectorAll('.tape-slot').forEach(el => el.classList.remove('filled', 'pop'))
    $('staminaFill').style.width = '100%'
    $('staminaWrap').classList.remove('full')
    $('interactPrompt').classList.add('hidden')
    $('interactBtn').classList.remove('ready', 'charging')
    $('interactBtn').style.setProperty('--hold', 0)
    $('lightBtn').classList.remove('off')
    $('sprintBtn').classList.remove('on')
    $('alertBanner').classList.add('hidden')
    $('chaseBar').classList.add('hidden')
    $('stunBtn').classList.add('hidden')
    $('objectiveWrap').classList.remove('hidden')
    $('damage').style.opacity = 0
    this.hideTapeCard()
    this.hideDialogue()
    $('toast').classList.remove('show')
  }

  updateHUD(state) {
    if (state.objective && this.lastHud.objective !== state.objective) {
      $('objectiveText').textContent = state.objective
      this.lastHud.objective = state.objective
    }
    if (state.compassAngle !== undefined) {
      $('compass').querySelector('svg').style.transform = `rotate(${state.compassAngle}rad)`
    }
    if (state.compassDist !== undefined) {
      $('compassDist').textContent = state.compassDist > 0 ? `${Math.round(state.compassDist)} m` : 'AQUÍ'
    }
    if (this.lastHud.tapes !== state.tapes) {
      const slots = document.querySelectorAll('.tape-slot')
      slots.forEach((el, i) => {
        const was = el.classList.contains('filled')
        const on = i < state.tapes
        el.classList.toggle('filled', on)
        if (on && !was) {
          el.classList.remove('pop')
          void el.offsetWidth
          el.classList.add('pop')
        }
      })
      this.lastHud.tapes = state.tapes
    }
    if (state.stamina !== undefined) {
      const pct = Math.max(0, Math.min(100, state.stamina))
      $('staminaFill').style.width = `${pct}%`
      $('staminaFill').classList.toggle('low', pct < 30)
      $('staminaWrap').classList.toggle('full', pct > 99)
    }
    if (state.prompt !== this.lastHud.prompt) {
      const prompt = $('interactPrompt')
      prompt.classList.toggle('hidden', !state.prompt)
      if (state.prompt) $('interactLabel').textContent = state.prompt
      this.lastHud.prompt = state.prompt
    }
    const promptLabel = state.prompt || 'USAR'
    if (this.lastHud.interactLabel !== promptLabel) {
      $('interactBtnLabel').textContent = promptLabel
      this.lastHud.interactLabel = promptLabel
    }
    if (state.interactReady !== this.lastHud.interactReady) {
      $('interactBtn').classList.toggle('ready', !!state.interactReady)
      this.lastHud.interactReady = state.interactReady
    }
    if (state.charging !== undefined) {
      $('interactBtn').classList.toggle('charging', state.charging)
      $('interactBtn').style.setProperty('--hold', state.charging ? state.chargeProgress : 0)
    }
    if (state.flashlight !== this.lastHud.flashlight) {
      $('lightBtn').classList.toggle('off', !state.flashlight)
      this.lastHud.flashlight = state.flashlight
    }
    if (state.sprint !== this.lastHud.sprint) {
      $('sprintBtn').classList.toggle('on', !!state.sprint)
      this.lastHud.sprint = state.sprint
    }
    if (state.alert !== this.lastHud.alert) {
      $('alertBanner').classList.toggle('hidden', !state.alert)
      this.lastHud.alert = state.alert
    }
    if (state.chase !== this.lastHud.chase) {
      $('chaseBar').classList.toggle('hidden', !state.chase)
      $('stunBtn').classList.toggle('hidden', !state.chase)
      $('objectiveWrap').classList.toggle('hidden', !!state.chase)
      this.lastHud.chase = state.chase
    }
    if (state.chaseDist !== undefined) {
      $('chaseDist').textContent = Math.max(0, Math.round(state.chaseDist))
    }
    if (state.stunCool !== undefined) {
      const pct = Math.max(0, Math.min(1, state.stunCool))
      $('stunBtn').classList.toggle('cool', pct > 0)
      $('stunBtn').style.setProperty('--cool', pct)
    }
    if (state.damage !== undefined) {
      $('damage').style.opacity = state.damage
    }
  }

  initLabels(defs) {
    const root = $('labels')
    root.innerHTML = ''
    this.labelEls.clear()
    for (const def of defs) {
      const el = document.createElement('div')
      el.className = 'npc-label'
      el.innerHTML = `<b>${def.name.split(' ')[0]}</b><i></i>`
      root.appendChild(el)
      this.labelEls.set(def.id, el)
    }
  }

  updateLabels(items, camera) {
    const v = new THREE.Vector3()
    const w = window.innerWidth
    const h = window.innerHeight
    for (const item of items) {
      const el = this.labelEls.get(item.id)
      if (!el) continue
      if (!item.alive || !item.visible || item.distance > 24) {
        el.style.opacity = '0'
        continue
      }
      v.copy(item.position)
      v.y += 2.05
      v.project(camera)
      if (v.z > 1 || v.z < -1) {
        el.style.opacity = '0'
        continue
      }
      const x = (v.x * 0.5 + 0.5) * w
      const y = (-v.y * 0.5 + 0.5) * h
      const cx = Math.max(32, Math.min(w - 32, x))
      const fade = Math.min(1, Math.max(0, (24 - item.distance) / 8))
      el.style.opacity = String(fade)
      el.style.left = `${cx}px`
      el.style.top = `${y}px`
      el.classList.toggle('talk', !!item.talking)
      el.classList.toggle('dead', !item.alive)
    }
  }

  hideLabels() {
    for (const el of this.labelEls.values()) el.style.opacity = '0'
  }

  toast(text, duration = 2600) {
    const el = $('toast')
    $('toastText').textContent = text
    el.classList.add('show')
    clearTimeout(this._toastTimer)
    this._toastTimer = setTimeout(() => el.classList.remove('show'), duration)
  }

  showDialogue(name, text, duration = 4200) {
    if (!name) {
      $('dialogue').classList.add('hidden')
      return
    }
    $('dialogueName').textContent = name
    $('dialogueText').textContent = text
    $('dialogue').classList.remove('hidden')
    clearTimeout(this._dialogueTimer)
    this._dialogueTimer = setTimeout(() => $('dialogue').classList.add('hidden'), duration)
  }

  hideDialogue() {
    $('dialogue').classList.add('hidden')
    clearTimeout(this._dialogueTimer)
  }

  showTapeCard({ num, title, text, trait }) {
    $('tapeCardNum').textContent = String(num).padStart(2, '0')
    $('tapeCardTitle').textContent = title
    $('tapeCardText').textContent = text
    $('tapeCardTrait').textContent = trait
    const el = $('tapeCard')
    el.classList.remove('hidden', 'out')
    clearTimeout(this._tapeTimer)
    this._tapeTimer = setTimeout(() => this.hideTapeCard(), 7600)
  }

  hideTapeCard() {
    const el = $('tapeCard')
    if (el.classList.contains('hidden')) return
    el.classList.add('out')
    clearTimeout(this._tapeTimer)
    this._tapeTimer = setTimeout(() => {
      el.classList.add('hidden')
      el.classList.remove('out')
    }, 360)
  }

  renderRoster({ suspects, knownTraits, mode }) {
    const grid = $('suspectGrid')
    const labels = {
      height: { tall: 'MÁS DE 1,75 m', short: 'MENOS DE 1,75 m' },
      hand: { izquierda: 'ZURDO/A', derecha: 'DIESTRO/A' },
      mark: { cicatriz: 'CICATRIZ EN LA MUÑECA', tatuaje: 'TATUAJE EN EL CUELLO' },
    }
    const knownCount = ['height', 'hand', 'mark'].filter(k => knownTraits[k]).length
    $('dossierCount').textContent = `${knownCount}/3`
    for (const key of ['height', 'hand', 'mark']) {
      const el = document.querySelector(`.trait[data-trait="${key}"]`)
      const known = !!knownTraits[key]
      el.classList.toggle('known', known)
      el.classList.toggle('locked', !known)
      el.querySelector('span').textContent = known ? labels[key][this.game.killerTraits[key]] : '???'
    }
    $('dossierNote').textContent = knownCount === 3
      ? 'Perfil completo. Compara los rasgos con cada sospechoso. Solo uno encaja en los tres.'
      : knownCount === 0
        ? 'Las cintas VHS contienen tres rasgos del asesino. Recógelas todas para completar el perfil.'
        : `Faltan ${3 - knownCount} rasgo${knownCount === 2 ? '' : 's'} por descubrir. Vuelve al campamento y busca más cintas.`

    grid.innerHTML = suspects.map((s, i) => {
      const def = CHARACTER_DEFS[i]
      const missing = !s.alive
      return `
      <button class="suspect-card ${missing ? 'missing' : ''}" data-index="${i}" aria-label="Sospechoso ${def.name}">
        <div class="suspect-portrait" style="background-image:url('${this.portraits.get(def.id)}')"></div>
        <div class="suspect-status ${missing ? 'missing' : ''}">${missing ? 'DESAPARECIDO' : 'PRESENTE'}</div>
        <div class="suspect-info">
          <div class="suspect-name">${def.name}</div>
          <div class="suspect-role">${def.role}</div>
          <div class="suspect-traits">
            <span><b>ALTURA</b>${def.heightLabel}</span>
            <span><b>MANO</b>${def.handLabel}</span>
            <span><b>MARCA</b>${def.markLabel}</span>
          </div>
        </div>
        <div class="mark-hit">ACUSADO</div>
      </button>`
    }).join('')

    const isAccuse = mode === 'accuse'
    $('rosterScreen').classList.toggle('accuse', isAccuse)
    $('rosterKicker').textContent = isAccuse ? 'ACUSACIÓN FINAL · SOLO UNA OPORTUNIDAD' : 'EXPEDIENTE · SOSPECHOSOS'
    $('rosterTitle').textContent = isAccuse ? '¿QUIÉN ES GHOSTFACE?' : 'LOS QUE QUEDAN'
    $('accuseHint').classList.toggle('hidden', !isAccuse)
    $('confirmAccuseBtn').classList.toggle('hidden', !isAccuse)
    $('cancelAccuseBtn').classList.toggle('hidden', !isAccuse)
    $('rosterDoneBtn').classList.toggle('hidden', isAccuse)
    $('confirmAccuseBtn').disabled = this.game.selectedSuspect == null
    this._highlightSelected()
    this.showScreen('roster')
  }

  _highlightSelected() {
    document.querySelectorAll('.suspect-card').forEach((el) => {
      el.classList.toggle('selected', Number(el.dataset.index) === this.game.selectedSuspect)
    })
    $('confirmAccuseBtn').disabled = this.game.selectedSuspect == null
  }

  selectSuspect(index) {
    this.game.selectSuspect(index)
    this._highlightSelected()
  }

  closeRosterUI() {
    if (this.currentScreen === 'roster') this.hideScreens()
  }

  showPause() {
    $('volumeRange').value = Math.round(this.game.settings.volume * 100)
    $('sensRange').value = Math.round(this.game.settings.sensitivity * 100)
    $('qualitySelect').value = this.game.settings.quality
    this.showScreen('pause')
  }

  showEnd({ win, killer, reason, time, tapes, guess }) {
    const end = $('endScreen')
    end.classList.toggle('win', win)
    end.classList.toggle('lose', !win)
    $('endKicker').textContent = win ? 'AMANECER · 05:12' : 'FIN DE LA NOCHE'
    $('endTitle').textContent = win ? 'ESCAPASTE' : 'TE ENCONTRÓ'
    $('endVerdict').textContent = win ? 'GHOSTFACE SE QUEDÓ EN EL BOSQUE' : reason
    const killerName = CHARACTER_DEFS[killer]?.name || 'DESCONOCIDO'
    const text = win
      ? `La camioneta arranca con un golpe de motor. En el retrovisor, la máscara blanca se queda quieta entre los árboles. ${killerName} no volvió a aparecer en ningún registro.`
      : `${killerName} era Ghostface. La máscara no era un disfraz: era una advertencia. Blackwood vuelve a cerrar sus puertas hasta el próximo verano.`
    $('endText').textContent = text
    const guessed = guess != null ? CHARACTER_DEFS[guess]?.name : null
    $('endStats').innerHTML = `
      <div><b>${fmtTime(time)}</b>DURACIÓN</div>
      <div><b>${tapes}/3</b>CINTAS</div>
      <div><b>${killerName.split(' ')[0]}</b>ASESINO</div>
      ${guessed ? `<div><b>${guessed.split(' ')[0]}</b>ACUSADO</div>` : ''}
    `
    if (win) this._saveBest(time)
    this.showScreen('end')
  }

  playIntro(onDone) {
    const cine = $('cinematic')
    cine.classList.remove('hidden', 'out')
    // force reflow so animation restarts
    void cine.offsetWidth
    clearTimeout(this._introTimer)
    this._introTimer = setTimeout(() => {
      cine.classList.add('out')
      setTimeout(() => {
        cine.classList.add('hidden')
        cine.classList.remove('out')
        onDone?.()
      }, 800)
    }, 4600)
  }

  fade(on, duration = 650) {
    const el = $('fade')
    el.style.transitionDuration = `${duration}ms`
    el.classList.toggle('on', on)
  }

  jumpscare(onDone, duration = 2400) {
    const el = $('jumpscare')
    el.classList.add('on')
    $('flashRed').style.transition = 'none'
    $('flashRed').style.opacity = '0.85'
    requestAnimationFrame(() => {
      $('flashRed').style.transition = 'opacity .7s ease'
      $('flashRed').style.opacity = '0'
    })
    clearTimeout(this._jumpTimer)
    this._jumpTimer = setTimeout(() => {
      el.classList.remove('on')
      onDone?.()
    }, duration)
  }

  flashRed() {
    const el = $('flashRed')
    el.style.transition = 'none'
    el.style.opacity = '0.6'
    requestAnimationFrame(() => {
      el.style.transition = 'opacity .55s ease'
      el.style.opacity = '0'
    })
  }

  flashWhite() {
    const el = $('flashWhite')
    el.style.transition = 'none'
    el.style.opacity = '0.92'
    requestAnimationFrame(() => {
      el.style.transition = 'opacity .5s ease'
      el.style.opacity = '0'
    })
  }
}
