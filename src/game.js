import * as THREE from '../vendor/three.module.js'
import {
  CHARACTER_DEFS, createCharacter, animateCharacter, createGhostface, animateGhost,
  createTape, createBody, createGlowSprite,
} from './models.js'
import { NavGrid } from './nav.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}
const distance2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
const fmtTime = (s) => {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

const KILL_TIMES = [58, 116, 174]
const TRAIT_TEXT = {
  height: {
    tall: 'La figura llena el marco de la puerta. Mide más de 1,75 m.',
    short: 'La figura se agacha para pasar bajo el marco. No llega a 1,75 m.',
  },
  hand: {
    izquierda: 'Sujeta el cuchillo con la mano izquierda. La derecha le tiembla.',
    derecha: 'Cambia el cuchillo a la derecha antes de mirar a la cámara.',
  },
  mark: {
    cicatriz: 'En el reflejo se ve una cicatriz vieja cruzando la muñeca.',
    tatuaje: 'Un tatuaje de pájaro asoma por el cuello de la sudadera.',
  },
}
const TRAIT_LABEL = {
  height: { tall: 'ALTURA · MÁS DE 1,75 m', short: 'ALTURA · MENOS DE 1,75 m' },
  hand: { izquierda: 'MANO · ZURDO/A', derecha: 'MANO · DIESTRO/A' },
  mark: { cicatriz: 'MARCA · CICATRIZ EN LA MUÑECA', tatuaje: 'MARCA · TATUAJE EN EL CUELLO' },
}
const TALK = {
  mara: [
    'No pienso quedarme sola. Si ves a alguien sin linterna, corre.',
    'Anoche alguien llamó a la puerta. Cuando abrí, solo había barro en el porche.',
    'La radio lleva horas soltando estática. A veces parece que respira.',
  ],
  diego: [
    'He oído pasos en la torre. Pero nadie sube desde hace horas.',
    'Si encontramos las cintas, podemos salir de aquí antes del amanecer.',
    'No me mires así. Yo estaba en la cabaña cuando empezó todo.',
  ],
  luna: [
    'En las fotos de anoche hay una figura de más. La revelé dos veces.',
    'La máscara no estaba en el cobertizo esta mañana. Ahora sí.',
    'No te fíes de las sonrisas. La gente sonríe cuando miente.',
  ],
  rulo: [
    'La radio solo suelta estática. Y a veces... una voz.',
    'La camioneta no arranca. Alguien se llevó la llave. O la escondió.',
    'Si oyes un cuchillo raspando madera, no te gires. Corre.',
  ],
}
const BODY_LINES = [
  'La herida es limpia. Demasiado limpia.',
  'Huele a gasolina y a hierro. Y a algo más dulce.',
  'Le han arrancado la insignia del campamento.',
  'Los ojos siguen abiertos. Apuntan hacia el pozo.',
]

function loadSettings() {
  const defaults = { volume: 0.8, sensitivity: 1, quality: 'auto' }
  try {
    const raw = localStorage.getItem('ghostface.settings.v1')
    if (!raw) return defaults
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return defaults
  }
}

function saveSettings(settings) {
  try { localStorage.setItem('ghostface.settings.v1', JSON.stringify(settings)) } catch {}
}

function shuffle(array) {
  const a = array.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export class Game {
  constructor({ scene, camera, renderer, world, input, audio }) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.world = world
    this.input = input
    this.audio = audio
    this.settings = loadSettings()
    this.ui = null
    this.mode = 'title'
    this.prePauseMode = 'playing'
    this.time = 0
    this.titleTime = 0
    this.runTime = 0
    this.nav = new NavGrid({ min: -46, max: 46, cell: 1, colliders: world.colliders })
    this.mode = 'title'

    this.player = {
      pos: new THREE.Vector3(0, 0, 7.2),
      facing: Math.PI,
      stamina: 100,
      flashOn: true,
      walkPhase: 0,
      footAcc: 0,
      moving: false,
      speed: 0,
    }
    this.camYaw = 0
    this.camPitch = 0.24
    this.camDist = 4.7
    this.camTarget = new THREE.Vector3()
    this.shake = 0
    this.targetFov = 62

    this.npcs = CHARACTER_DEFS.map((def, index) => {
      const group = createCharacter(def)
      group.position.set(0, 0, 0)
      scene.add(group)
      return {
        index, def, group, alive: true, pos: new THREE.Vector3(),
        path: null, pathIndex: 0, idle: Math.random() * 2, speed: 1.2,
        facing: 0, talkingT: 0, spawn: new THREE.Vector3(),
      }
    })

    this.playerGroup = createCharacter({
      height: 1.76, jacket: 0x344148, pants: 0x242a2c, skin: 0xc79c7f,
      hair: 0x17130f, hairStyle: 'short',
    }, true)
    scene.add(this.playerGroup)

    this.flashlight = new THREE.SpotLight(0xffdfae, 58, 32, 0.4, 0.55, 1.45)
    this.flashlight.castShadow = false
    scene.add(this.flashlight)
    this.flashlight.target = new THREE.Object3D()
    scene.add(this.flashlight.target)
    this.flashlight.visible = false
    this.flashFlickerT = 0

    this.ghost = createGhostface()
    this.ghost.visible = false
    scene.add(this.ghost)

    this.scareGhost = createGhostface()
    this.scareGhost.visible = false
    scene.add(this.scareGhost)

    this.tapes = []
    this.beacons = []
    this.bodies = []
    this.knownTraits = { height: false, hand: false, mark: false }
    this.killerTraits = { height: 'tall', hand: 'izquierda', mark: 'cicatriz' }
    this.killer = 0
    this.selectedSuspect = null
    this.rosterMode = 'info'
    this.tapesCollected = 0
    this.activeEvidence = []
    this.channel = null
    this.stunCool = 0
    this.killIndex = 0
    this.nextKill = KILL_TIMES[0]
    this.nextScare = 22
    this.scareT = 0
    this.scareActive = false
    this.revealT = 0
    this.chase = { active: false, time: 0, ghostStun: 0, repath: 0, dist: 0 }
    this.lastInteract = null
    this.forceScareT = -1
    this._timeouts = []
    this._buildProps()
    this._resetForTitle()
  }

  attachUI(ui) {
    this.ui = ui
    ui.initLabels(CHARACTER_DEFS)
    this._syncSettings()
  }

  // ------------------------------------------------------------ props
  _buildProps() {
    for (const spot of this.world.evidenceSpots) {
      const tape = createTape()
      tape.scale.setScalar(1.15)
      tape.position.copy(spot.pos)
      tape.visible = false
      this.scene.add(tape)
      const glow = createGlowSprite(0xffb35e, 1.7, 0.32)
      glow.position.set(0, 0.22, 0)
      tape.add(glow)
      const beacon = this._makeBeacon(0xff5a4a)
      beacon.position.set(spot.pos.x, 0.03, spot.pos.z)
      beacon.visible = false
      this.scene.add(beacon)
      this.tapes.push({ spot, group: tape, glow, beacon, baseY: spot.pos.y })
    }
    this.radioBeacon = this._makeBeacon(0xff3b4c)
    this.radioBeacon.position.set(this.world.radioPos.x, 0.03, this.world.radioPos.z)
    this.radioBeacon.visible = false
    this.scene.add(this.radioBeacon)
    this.exitBeacon = this._makeBeacon(0xbfe0ff)
    this.exitBeacon.position.set(this.world.exitPos.x, 0.03, this.world.exitPos.z)
    this.exitBeacon.visible = false
    this.scene.add(this.exitBeacon)
  }

  _makeBeacon(color) {
    const group = new THREE.Group()
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.025, 6, 28), ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.03
    group.add(ring)
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.012, 5, 28), ringMat.clone())
    ring2.material.opacity = 0.25
    ring2.rotation.x = Math.PI / 2
    ring2.position.y = 0.035
    group.add(ring2)
    const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.055, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.52, 12, 12, 1, true), beamMat)
    beam.position.y = 6
    group.add(beam)
    const glow = createGlowSprite(color, 2.2, 0.2)
    glow.position.y = 0.5
    group.add(glow)
    group.userData = { ring, ring2, beam, glow, color }
    return group
  }

  // ------------------------------------------------------------ setup / resets
  _resetForTitle() {
    this.mode = 'title'
    this.titleTime = 0
    this.player.pos.set(0, 0, 7.2)
    this.player.facing = Math.PI
    this.playerGroup.position.copy(this.player.pos)
    this.playerGroup.rotation.y = Math.PI
    this.playerGroup.visible = true
    this.flashlight.visible = false
    const titleSpawns = [
      new THREE.Vector3(-3.4, 0, 3.4),
      new THREE.Vector3(3.4, 0, 3.5),
      new THREE.Vector3(-3.6, 0, -2.8),
      new THREE.Vector3(3.7, 0, -2.6),
    ]
    this.npcs.forEach((npc, i) => {
      npc.alive = true
      npc.group.visible = true
      npc.pos.copy(titleSpawns[i])
      npc.spawn.copy(titleSpawns[i])
      npc.group.position.copy(npc.pos)
      npc.group.rotation.y = Math.atan2(-npc.pos.x, -npc.pos.z)
      npc.path = null
      npc.talkingT = 0
      npc.idle = Math.random() * 3
    })
    for (const t of this.tapes) {
      t.group.visible = false
      t.beacon.visible = false
    }
    this.radioBeacon.visible = false
    this.exitBeacon.visible = false
    this.ghost.visible = false
    this.scareGhost.visible = false
    this.scareActive = false
    this._clearBodies()
    this.chase.active = false
    this.audio.setChase(false)
    this.world.setRadioActive(false)
    this.world.setExitActive(false)
    this.camYaw = 0.4
    this.camPitch = 0.26
    if (this.ui) {
      this.ui.setHUD(false)
      this.ui.hideLabels()
    }
  }

  resetRun() {
    this._clearTimeouts()
    this.chase.active = false
    this.audio.setChase(false)
    this.audio.setTension(0)
    this.world.setRadioActive(false)
    this.world.setExitActive(false)
    this.world.flickerT = 0
    this.world.flickerStrength = 1

    this.runTime = 0
    this.tapesCollected = 0
    this.knownTraits = { height: false, hand: false, mark: false }
    this.selectedSuspect = null
    this.channel = null
    this.stunCool = 0
    this.killIndex = 0
    this.nextKill = KILL_TIMES[0]
    this.nextScare = 22
    this.scareT = 0
    this.scareActive = false
    this.forceScareT = -1
    this.shake = 0
    this.revealT = 0
    this.chase = { active: false, time: 0, ghostStun: 0, repath: 0, dist: 0 }
    this.lastInteract = null

    this.killer = Math.floor(Math.random() * CHARACTER_DEFS.length)
    const kd = CHARACTER_DEFS[this.killer]
    this.killerTraits = {
      height: kd.height > 1.75 ? 'tall' : 'short',
      hand: kd.hand,
      mark: kd.mark,
    }
    this.traitOrder = shuffle(['height', 'hand', 'mark'])

    this.activeEvidence = shuffle(this.world.evidenceSpots).slice(0, 3)
    for (const t of this.tapes) {
      t.group.visible = this.activeEvidence.includes(t.spot)
      t.group.position.copy(t.spot.pos)
      t.group.rotation.set(0, Math.random() * 6, 0)
      t.beacon.visible = false
      t.spot.taken = false
    }
    this.radioBeacon.visible = false
    this.exitBeacon.visible = false

    this._clearBodies()

    const spawns = [
      new THREE.Vector3(-3.4, 0, 3.5),
      new THREE.Vector3(3.5, 0, 3.6),
      new THREE.Vector3(-3.7, 0, -2.9),
      new THREE.Vector3(3.8, 0, -2.7),
    ]
    this.npcs.forEach((npc, i) => {
      npc.alive = true
      npc.group.visible = true
      npc.pos.copy(spawns[i])
      npc.spawn.copy(spawns[i])
      npc.group.position.copy(npc.pos)
      npc.group.rotation.y = Math.atan2(-npc.pos.x, -npc.pos.z)
      npc.path = null
      npc.pathIndex = 0
      npc.idle = 0.8 + Math.random() * 2.5
      npc.speed = 1.15 + Math.random() * 0.45
      npc.talkingT = 0
    })

    this.player.pos.set(0, 0, 7.4)
    this.player.facing = Math.PI
    this.player.stamina = 100
    this.player.flashOn = true
    this.player.moving = false
    this.player.speed = 0
    this.player.footAcc = 0
    this.playerGroup.position.copy(this.player.pos)
    this.playerGroup.rotation.y = Math.PI
    this.playerGroup.visible = true
    this.flashlight.visible = true
    this.flashlight.intensity = 58
    this.camYaw = 0
    this.camPitch = 0.22

    this.ghost.visible = false
    this.scareGhost.visible = false
    this.scareActive = false

    this.ui?.resetHUD()
    this.ui?.setHUD(false)
    this.ui?.hideScreens()
    this.ui?.hideLabels()
    this.ui?.hideDialogue()
    this._snapCamera()
  }

  _clearTimeouts() {
    for (const id of this._timeouts) clearTimeout(id)
    this._timeouts = []
  }

  _later(fn, ms) {
    const id = setTimeout(fn, ms)
    this._timeouts.push(id)
    return id
  }

  startRun() {
    this.audio.init()
    this.audio.ui()
    clearTimeout(this._startTimer)
    this.ui.fade(true, 320)
    this.mode = 'transition'
    this._startTimer = setTimeout(() => {
      this.resetRun()
      this.ui.fade(false, 520)
      this.ui.showScreen(null)
      this.mode = 'intro'
      this.ui.playIntro(() => {
        if (this.mode !== 'intro') return
        this.mode = 'playing'
        this.input.setEnabled(true)
        this.ui.setHUD(true)
        this.ui.setHudOut(false)
        this.ui.toast('Encuentra las 3 cintas VHS', 3200)
        this.audio.whisper()
      })
    }, 360)
  }

  restart() {
    this.ui.hideScreens()
    this.startRun()
  }

  quitToMenu() {
    this._clearTimeouts()
    clearTimeout(this._startTimer)
    this.input.setEnabled(false)
    this._resetForTitle()
    this.ui.showScreen('title')
    this.ui.fade(false, 300)
    this.ui.setHUD(false)
    this.audio.setTension(0)
    this.audio.setChase(false)
  }

  // ------------------------------------------------------------ settings
  _syncSettings() {
    this.audio.setVolume(this.settings.volume)
    window.dispatchEvent(new CustomEvent('gf-quality', { detail: this.settings.quality }))
    const vol = document.getElementById('volumeRange')
    const sens = document.getElementById('sensRange')
    const quality = document.getElementById('qualitySelect')
    if (vol) vol.value = Math.round(this.settings.volume * 100)
    if (sens) sens.value = Math.round(this.settings.sensitivity * 100)
    if (quality) quality.value = this.settings.quality
  }

  setVolume(v) {
    this.settings.volume = clamp(v, 0, 1)
    this.audio.setVolume(this.settings.volume)
    saveSettings(this.settings)
  }

  setSensitivity(v) {
    this.settings.sensitivity = clamp(v, 0.4, 2)
    saveSettings(this.settings)
  }

  setQuality(q) {
    this.settings.quality = q
    saveSettings(this.settings)
    window.dispatchEvent(new CustomEvent('gf-quality', { detail: q }))
  }

  // ------------------------------------------------------------ pause / roster
  pause() {
    if (this.mode !== 'playing' && this.mode !== 'chase') return
    this.prePauseMode = this.mode
    this.mode = 'paused'
    this.input.setEnabled(false)
    this.ui.setHUD(false)
    this.ui.showPause()
    this.audio.setTension(0.2)
  }

  resume() {
    if (this.mode !== 'paused') return
    this.mode = this.prePauseMode
    this.input.setEnabled(true)
    this.ui.hideScreens()
    this.ui.setHUD(true)
    this.audio.setChase(this.mode === 'chase')
  }

  resumeToGame() {
    if (this.mode === 'paused') return this.resume()
    this.mode = this.prePauseMode || 'playing'
    this.input.setEnabled(true)
    this.ui.hideScreens()
    this.ui.setHUD(true)
  }

  openRoster(accuse = false) {
    if (this.mode !== 'playing') return
    if (accuse && this.tapesCollected < 3) {
      this.ui.toast('Necesitas las 3 cintas para acusar')
      return
    }
    this.rosterMode = accuse ? 'accuse' : 'info'
    this.selectedSuspect = null
    this.mode = 'roster'
    this.input.setEnabled(false)
    this.ui.setHUD(false)
    this.ui.renderRoster({
      suspects: this.npcs,
      knownTraits: this.knownTraits,
      mode: this.rosterMode,
    })
    if (accuse) this.audio.radioStatic(1.1)
  }

  closeRoster() {
    if (this.mode !== 'roster') return
    this.mode = 'playing'
    this.input.setEnabled(true)
    this.ui.hideScreens()
    this.ui.setHUD(true)
    this.selectedSuspect = null
    this.rosterMode = 'info'
  }

  cancelAccuse() {
    if (this.mode !== 'roster' || this.rosterMode !== 'accuse') return
    this.selectedSuspect = null
    this.closeRoster()
  }

  selectSuspect(index) {
    if (this.mode !== 'roster' || this.rosterMode !== 'accuse') return
    this.selectedSuspect = this.selectedSuspect === index ? null : index
    this.ui._highlightSelected()
  }

  confirmAccuse() {
    if (this.mode !== 'roster' || this.rosterMode !== 'accuse') return
    if (this.selectedSuspect == null) return
    const guess = this.selectedSuspect
    this.ui.hideScreens()
    this.input.setEnabled(false)
    if (guess === this.killer) {
      this._startReveal()
    } else {
      this._wrongAccusation(guess)
    }
  }

  // ------------------------------------------------------------ input actions
  toggleFlashlight() {
    if (this.mode !== 'playing' && this.mode !== 'chase') return
    this.player.flashOn = !this.player.flashOn
    this.flashlight.visible = this.player.flashOn
    this.audio.ui()
    this.ui.toast(this.player.flashOn ? 'Linterna encendida' : 'Linterna apagada', 1300)
  }

  interact() {
    if (this.mode !== 'playing' || this.channel) return
    const target = this.getInteractTarget()
    if (!target) return
    if (target.type === 'tape') {
      this.audio.tapeStart()
      this.channel = { type: 'tape', elapsed: 0, duration: 1.45, index: target.index }
      this.ui.showDialogue(null)
    } else if (target.type === 'radio') {
      this.audio.radioStatic(1.2)
      this.openRoster(true)
    } else if (target.type === 'npc') {
      const npc = target.npc
      npc.talkingT = 3.2
      npc.path = null
      const lines = TALK[npc.def.id] || ['...']
      let line = lines[Math.floor(Math.random() * lines.length)]
      if (!npc.alive) line = '...'
      this.ui.showDialogue(npc.def.name, line, 4400)
      this.audio.whisper()
    } else if (target.type === 'body') {
      const body = target.body
      this.ui.showDialogue(`CUERPO DE ${body.name.split(' ')[0]}`, body.line, 5000)
      this.audio.stinger()
      this.ui.flashRed()
      this.world.flicker(0.7, 1)
    }
  }

  stun() {
    if (this.mode !== 'chase') return
    if (this.stunCool > 0) return
    if (!this.player.flashOn) {
      this.ui.toast('Enciende la linterna para el destello', 1500)
      return
    }
    this.stunCool = 5.5
    this.audio.flash()
    this.ui.flashWhite()
    const dx = this.ghost.position.x - this.player.pos.x
    const dz = this.ghost.position.z - this.player.pos.z
    const dist = Math.hypot(dx, dz)
    const forward = new THREE.Vector2(-Math.sin(this.camYaw), -Math.cos(this.camYaw))
    const toGhost = new THREE.Vector2(dx / (dist || 1), dz / (dist || 1))
    const aim = forward.dot(toGhost)
    if (dist < 18 && aim > 0.72) {
      this.chase.ghostStun = 2.3
      this.audio.stunHit()
      this.ui.toast('¡La luz lo detiene!', 1500)
      this.shake = 0.4
      this.world.flicker(0.4, 1)
    } else {
      this.ui.toast('El destello se pierde en la niebla', 1300)
    }
  }

  getInteractTarget() {
    if (this.mode !== 'playing') return null
    let best = null
    let bestDist = Infinity
    for (let i = 0; i < this.tapes.length; i++) {
      const t = this.tapes[i]
      if (!t.group.visible || t.spot.taken) continue
      const d = distance2D(this.player.pos, t.spot.pos)
      if (d < 2.35 && d < bestDist) {
        best = { type: 'tape', index: i, label: 'RECOGER', dist: d }
        bestDist = d
      }
    }
    if (this.tapesCollected >= 3) {
      const d = distance2D(this.player.pos, this.world.radioPos)
      if (d < 2.9 && d < bestDist) {
        best = { type: 'radio', label: 'ANALIZAR', dist: d }
        bestDist = d
      }
    }
    for (const npc of this.npcs) {
      if (!npc.alive) continue
      const d = distance2D(this.player.pos, npc.pos)
      if (d < 2.6 && d < bestDist) {
        best = { type: 'npc', npc, label: 'HABLAR', dist: d }
        bestDist = d
      }
    }
    for (const body of this.bodies) {
      const d = distance2D(this.player.pos, body.pos)
      if (d < 2.3 && d < bestDist) {
        best = { type: 'body', body, label: 'MIRAR', dist: d }
        bestDist = d
      }
    }
    return best
  }

  // ------------------------------------------------------------ evidence
  collectTape(index) {
    const tape = this.tapes[index]
    if (!tape || tape.spot.taken) return
    tape.spot.taken = true
    tape.group.visible = false
    tape.beacon.visible = false
    this.tapesCollected++
    this.audio.tapeReveal()
    this.audio.collect()
    this.ui.updateHUD({ tapes: this.tapesCollected, stamina: this.player.stamina })
    const trait = this.traitOrder[this.tapesCollected - 1]
    this.knownTraits[trait] = true
    const value = this.killerTraits[trait]
    const text = TRAIT_TEXT[trait][value]
    this.ui.showTapeCard({
      num: this.tapesCollected,
      title: tape.spot.title,
      text: `${tape.spot.detail} ${text}`,
      trait: `PISTA · ${TRAIT_LABEL[trait][value]}`,
    })
    this.ui.toast(`Cinta ${this.tapesCollected}/3 recuperada`, 2200)
    this._addShake(0.25)
    this.forceScareT = 4 + Math.random() * 3
    if (this.tapesCollected >= 3) {
      this.world.setRadioActive(true)
      this.radioBeacon.visible = true
      this.ui.toast('Perfil completo. Vuelve a la radio del campamento.', 4000)
    }
  }

  // ------------------------------------------------------------ kill / scare
  _killOne() {
    const candidates = this.npcs.filter(n => n.alive && n.index !== this.killer)
    if (!candidates.length) return
    let victim = candidates[0]
    let bestDist = -1
    for (const n of candidates) {
      const d = distance2D(this.player.pos, n.pos)
      if (d > bestDist) { bestDist = d; victim = n }
    }
    victim.alive = false
    victim.group.visible = false
    victim.path = null
    const body = createBody(victim.def)
    body.position.copy(victim.pos)
    body.rotation.y = Math.random() * Math.PI * 2
    this.scene.add(body)
    const line = BODY_LINES[this.killIndex % BODY_LINES.length]
    this.bodies.push({ group: body, pos: victim.pos.clone(), name: victim.def.name, line, npcIndex: victim.index })
    this.killIndex++
    this.audio.scream()
    this.audio.stinger()
    this.world.flicker(2.2, 1)
    this._addShake(0.6)
    this.ui.flashRed()
    this.ui.toast('Un grito atraviesa el bosque...', 3200)
    if (this.ui.currentScreen === 'roster') {
      this.ui.renderRoster({ suspects: this.npcs, knownTraits: this.knownTraits, mode: this.rosterMode })
    }
    if (this.killIndex >= 3) {
      this._later(() => {
        if (this.mode === 'playing') this.ui.toast('Solo queda uno de ellos. Y tú.', 4200)
      }, 5000)
    }
  }

  _showScare() {
    if (this.mode !== 'playing') return
    const forward = new THREE.Vector2(-Math.sin(this.camYaw), -Math.cos(this.camYaw))
    let pos = null
    for (let tries = 0; tries < 10; tries++) {
      const angle = Math.atan2(forward.y, forward.x) + (Math.random() - 0.5) * 1.5
      const dist = 15 + Math.random() * 6
      const x = this.player.pos.x + Math.cos(angle) * dist
      const z = this.player.pos.z + Math.sin(angle) * dist
      if (Math.hypot(x, z) > 41) continue
      const cell = this.nav.toCell(x, z)
      if (this.nav.isBlocked(cell.ix, cell.iz)) continue
      pos = new THREE.Vector3(x, 0, z)
      break
    }
    if (!pos) return
    this.scareGhost.position.copy(pos)
    this.scareGhost.rotation.y = Math.atan2(this.player.pos.x - pos.x, this.player.pos.z - pos.z)
    this.scareGhost.visible = true
    this.scareActive = true
    this.scareT = 2.6
    this.audio.stinger()
    this.world.flicker(1.4, 1)
    this._addShake(0.7)
    this.ui.flashRed()
    this.audio.whisper()
  }

  _hideScare(instant = false) {
    if (!this.scareActive) return
    this.scareActive = false
    this.scareGhost.visible = false
    if (!instant) {
      this.audio.stinger()
      this.world.flicker(0.7, 1)
    }
  }

  _clearBodies() {
    for (const b of this.bodies) {
      this.scene.remove(b.group)
      b.group.traverse(o => {
        if (o.isMesh) {
          o.geometry?.dispose?.()
          if (Array.isArray(o.material)) o.material.forEach(m => m.dispose?.())
          else o.material?.dispose?.()
        }
      })
    }
    this.bodies = []
  }

  // ------------------------------------------------------------ endings
  _startReveal() {
    this.mode = 'reveal'
    this.revealT = 0
    this.input.setEnabled(false)
    this.ui.setHUD(true)
    this.ui.setHudOut(false)
    this.ui.hideDialogue()
    const npc = this.npcs[this.killer]
    const pos = npc.pos.clone()
    npc.group.visible = false
    this.ghost.position.copy(pos)
    this.ghost.visible = true
    this.ghost.rotation.y = Math.atan2(this.player.pos.x - pos.x, this.player.pos.z - pos.z)
    this.radioBeacon.visible = false
    this.exitBeacon.visible = false
    this.audio.setChase(false)
    this.audio.scream()
    this.audio.stinger()
    this.world.flicker(4, 1)
    this._addShake(1.2)
    this.ui.flashRed()
    this.ui.showDialogue('LA MÁSCARA CAE', `${npc.def.name} era Ghostface. Corre hacia la camioneta.`, 4200)
    const dir = npc.pos.clone().sub(this.player.pos)
    this.camYaw = Math.atan2(-dir.x, -dir.z)
    this._later(() => {
      if (this.mode !== 'reveal') return
      this._beginChase()
    }, 2500)
  }

  _wrongAccusation(guess) {
    this.mode = 'dead'
    this.input.setEnabled(false)
    this.ui.setHUD(false)
    this._hideScare(true)
    this.audio.jumpscare()
    this.world.flicker(3, 1)
    this.ui.flashRed()
    this._addShake(1.4)
    const killerDef = CHARACTER_DEFS[this.killer]
    const guessDef = CHARACTER_DEFS[guess]
    this.ui.jumpscare(() => {
      this.ui.showEnd({
        win: false,
        killer: this.killer,
        guess,
        reason: 'ACUSASTE A UN INOCENTE',
        time: this.runTime,
        tapes: this.tapesCollected,
      })
      this.ui.showDialogue(null)
    }, 2350)
    this._later(() => {
      if (this.mode !== 'dead') return
      this.ui.toast(`No era ${guessDef.name}. Era ${killerDef.name}.`, 3000)
    }, 1300)
  }

  _beginChase() {
    this.mode = 'chase'
    this.input.setEnabled(true)
    this.ui.setHUD(true)
    this.ui.hideDialogue()
    this.chase = { active: true, time: 0, ghostStun: 2.4, repath: 0, dist: 0 }
    this.player.stamina = 100
    this.stunCool = 0
    this.world.setExitActive(true)
    this.world.setRadioActive(false)
    this.radioBeacon.visible = false
    this.exitBeacon.visible = true
    this.audio.setChase(true)
    this.audio.stinger()
    this.shake = 0.8
    this.ghost.visible = true
    this.ghost.userData.animPhase = 0
    this.camDist = 4.4
    this.targetFov = 70
    this.chasePath = this.nav.findPath(this.ghost.position, this.player.pos) || null
    this.chasePathIndex = 0
  }

  _caught() {
    if (this.mode !== 'chase') return
    this.mode = 'dead'
    this.input.setEnabled(false)
    this.ui.setHUD(false)
    this.audio.jumpscare()
    this.ui.flashRed()
    this._addShake(1.2)
    this.audio.setChase(false)
    this.world.flicker(2.5, 1)
    this.ui.jumpscare(() => {
      this.ui.showEnd({
        win: false,
        killer: this.killer,
        reason: 'GHOSTFACE TE ENCONTRÓ',
        time: this.runTime,
        tapes: this.tapesCollected,
      })
    }, 2350)
  }

  _win() {
    if (this.mode !== 'chase') return
    this.mode = 'won'
    this.input.setEnabled(false)
    this.audio.setChase(false)
    this.audio.win()
    this.world.setExitActive(true)
    this.ui.setHUD(false)
    this.ui.flashWhite()
    this.ui.fade(true, 650)
    this._later(() => {
      this.ui.showEnd({
        win: true,
        killer: this.killer,
        time: this.runTime,
        tapes: this.tapesCollected,
      })
      this.ui.fade(false, 700)
    }, 850)
  }

  // ------------------------------------------------------------ update
  update(dt, time) {
    this.time = time
    if (this.mode === 'title') {
      this.titleTime += dt
      this.world.update(dt, time, this.player.pos)
      this._updateTitleCamera(dt)
      for (const npc of this.npcs) animateCharacter(npc.group, dt, 0, true)
      animateCharacter(this.playerGroup, dt, 0, true)
      this.playerGroup.position.copy(this.player.pos)
      return
    }

    this.world.update(dt, time, this.player.pos)
    this._updateTapeProps(dt, time)
    this._updateBeacons(dt, time)

    if (this.mode === 'intro') {
      this._updateCamera(dt)
      for (const npc of this.npcs) animateCharacter(npc.group, dt, 0, true)
      if (this.ui) this.ui.hideLabels()
      return
    }

    if (this.mode === 'playing') {
      this.runTime += dt
      this._updatePlayer(dt)
      this._updateChannel(dt)
      this._updateNPCs(dt)
      this._updateScares(dt)
      this._updateKills()
      this._updateFlashlight(dt)
      this._updateCamera(dt)
      this._updateHeart(dt)
      this._updateHud()
      return
    }

    if (this.mode === 'chase') {
      this._updatePlayer(dt)
      this._updateFlashlight(dt)
      this._updateChase(dt)
      this._updateCamera(dt)
      this._updateHud()
      return
    }

    if (this.mode === 'reveal') {
      this.revealT += dt
      animateGhost(this.ghost, dt, 0, 'idle')
      this._updateFlashlight(dt)
      this._updateRevealCamera(dt)
      this._updateHud()
      return
    }

    if (this.mode === 'roster' || this.mode === 'paused' || this.mode === 'transition') {
      this._updateFlashlight(dt)
      if (this.mode === 'roster') this._updateCamera(dt)
      if (this.ui) this.ui.hideLabels()
      return
    }

    if (this.mode === 'dead' || this.mode === 'won') {
      this._updateCamera(dt)
      this._updateFlashlight(dt)
      return
    }
  }

  _updateTitleCamera(dt) {
    const t = this.titleTime * 0.055
    const r = 11.5
    const target = new THREE.Vector3(0, 1.45, 0)
    const desired = new THREE.Vector3(Math.sin(t) * r, 3.4 + Math.sin(t * 1.7) * 0.5, Math.cos(t) * r)
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 1.4))
    this.camera.lookAt(target)
    if (Math.abs(this.camera.fov - 54) > 0.1) {
      this.camera.fov = lerp(this.camera.fov, 54, 1 - Math.exp(-dt * 3))
      this.camera.updateProjectionMatrix()
    }
  }

  _updatePlayer(dt) {
    const [lookX, lookY] = this.input.consumeLook()
    const sens = this.settings.sensitivity
    this.camYaw -= lookX * 0.0031 * sens
    this.camPitch = clamp(this.camPitch + lookY * 0.0026 * sens, -0.22, 0.82)

    const move = this.input.movement
    const moving = Math.abs(move.x) + Math.abs(move.y) > 0.08
    const wantsSprint = this.input.sprinting && moving && this.player.stamina > 0.5 && !this.channel
    const maxSpeed = wantsSprint ? 6.15 : 3.35
    const canMove = !this.channel
    const forward = new THREE.Vector2(-Math.sin(this.camYaw), -Math.cos(this.camYaw))
    const right = new THREE.Vector2(Math.cos(this.camYaw), -Math.sin(this.camYaw))
    let dirX = forward.x * move.y + right.x * move.x
    let dirZ = forward.y * move.y + right.y * move.x
    const len = Math.hypot(dirX, dirZ)
    if (len > 1) { dirX /= len; dirZ /= len }
    const targetSpeed = moving && canMove ? maxSpeed : 0
    this.player.speed = lerp(this.player.speed, targetSpeed, 1 - Math.exp(-dt * 10))
    if (moving && canMove) {
      const nx = this.player.pos.x + dirX * this.player.speed * dt
      const nz = this.player.pos.z + dirZ * this.player.speed * dt
      this.player.pos.x = nx
      this.player.pos.z = nz
      this._resolveCollision(this.player.pos, 0.38)
      const targetFacing = Math.atan2(dirX, dirZ)
      this.player.facing = lerpAngle(this.player.facing, targetFacing, 1 - Math.exp(-dt * 13))
    } else if (this.channel) {
      this.player.speed = lerp(this.player.speed, 0, 1 - Math.exp(-dt * 12))
    }
    this.player.moving = moving && canMove

    if (wantsSprint) {
      this.player.stamina = Math.max(0, this.player.stamina - 16 * dt)
    } else {
      this.player.stamina = Math.min(100, this.player.stamina + 12.5 * dt)
    }

    this.playerGroup.position.set(this.player.pos.x, 0, this.player.pos.z)
    this.playerGroup.rotation.y = this.player.facing
    animateCharacter(this.playerGroup, dt, this.player.speed, !this.player.moving)

    if (this.player.moving) {
      this.player.footAcc += this.player.speed * dt
      const stride = wantsSprint ? 1.25 : 1.7
      if (this.player.footAcc > stride) {
        this.player.footAcc = 0
        this.audio.footstep(wantsSprint)
      }
    }

    const target = this.getInteractTarget()
    this.lastInteract = target
    if (this.channel) this.channel.elapsed += dt
  }

  _updateChannel(dt) {
    if (!this.channel) return
    if (this.channel.elapsed >= this.channel.duration) {
      const index = this.channel.index
      this.channel = null
      this.collectTape(index)
    }
  }

  _updateFlashlight(dt) {
    const on = this.player.flashOn && (this.mode === 'playing' || this.mode === 'chase' || this.mode === 'reveal')
    this.flashlight.visible = on
    if (!on) return
    this.flashFlickerT = Math.max(0, this.flashFlickerT - dt)
    let flick = 1
    if (this.flashFlickerT > 0) flick = Math.random() < 0.35 ? 0.15 : 0.85
    if (this.world.flickerT > 0 && Math.random() < 0.22) flick *= 0.35
    this.flashlight.intensity = 58 * flick
    const cosP = Math.cos(this.camPitch)
    const dir = new THREE.Vector3(
      -Math.sin(this.camYaw) * cosP,
      -Math.sin(this.camPitch),
      -Math.cos(this.camYaw) * cosP
    )
    this.flashlight.position.set(
      this.player.pos.x - Math.sin(this.player.facing) * 0.16,
      1.45,
      this.player.pos.z - Math.cos(this.player.facing) * 0.16
    )
    this.flashlight.target.position.copy(this.player.pos).addScaledVector(dir, 12)
    this.flashlight.target.position.y += 1.45
  }

  _updateCamera(dt) {
    const target = new THREE.Vector3(this.player.pos.x, 1.5, this.player.pos.z)
    if (this.mode === 'roster' || this.mode === 'paused' || this.mode === 'dead' || this.mode === 'won') {
      // keep current framing but do not drift
    }
    this._updateCameraTo(target, dt)
  }

  _updateRevealCamera(dt) {
    const target = this.ghost.position.clone()
    target.y = 1.62
    const dir = this.ghost.position.clone().sub(this.player.pos)
    const desiredYaw = Math.atan2(-dir.x, -dir.z)
    this.camYaw = lerpAngle(this.camYaw, desiredYaw, 1 - Math.exp(-dt * 4))
    this.camPitch = lerp(this.camPitch, 0.12, 1 - Math.exp(-dt * 4))
    this.camDist = lerp(this.camDist, 3.2, 1 - Math.exp(-dt * 3))
    const around = new THREE.Vector3(
      this.player.pos.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist,
      2.2 + Math.sin(this.camPitch) * this.camDist,
      this.player.pos.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist
    )
    around.y = Math.max(0.8, around.y)
    this.camera.position.lerp(around, 1 - Math.exp(-dt * 7))
    this.camTarget.lerp(target, 1 - Math.exp(-dt * 10))
    this.camera.lookAt(this.camTarget)
    this.shake = Math.max(0, this.shake - dt * 1.4)
    if (this.shake > 0.01) {
      const s = this.shake * 0.08
      this.camera.position.x += (Math.random() - 0.5) * s
      this.camera.position.y += (Math.random() - 0.5) * s
    }
    if (Math.abs(this.camera.fov - 58) > 0.05) {
      this.camera.fov = lerp(this.camera.fov, 58, 1 - Math.exp(-dt * 4))
      this.camera.updateProjectionMatrix()
    }
  }

  _updateCameraTo(target, dt, freeTarget = false) {
    const cosP = Math.cos(this.camPitch)
    const desired = new THREE.Vector3(
      target.x + Math.sin(this.camYaw) * cosP * this.camDist,
      target.y + Math.sin(this.camPitch) * this.camDist + 0.5,
      target.z + Math.cos(this.camYaw) * cosP * this.camDist
    )
    desired.y = Math.max(0.6, desired.y)
    if (!freeTarget && (this.mode === 'paused' || this.mode === 'roster')) {
      return
    }
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 11))
    this.camTarget.lerp(target, 1 - Math.exp(-dt * 15))
    this.camera.lookAt(this.camTarget)
    this.shake = Math.max(0, this.shake - dt * 1.8)
    if (this.shake > 0.01) {
      const s = this.shake * 0.09
      this.camera.position.x += (Math.random() - 0.5) * s
      this.camera.position.y += (Math.random() - 0.5) * s
      this.camera.rotation.z += (Math.random() - 0.5) * this.shake * 0.012
    }
    this.targetFov = this.mode === 'chase' ? 70 : 62
    if (Math.abs(this.camera.fov - this.targetFov) > 0.05) {
      this.camera.fov = lerp(this.camera.fov, this.targetFov, 1 - Math.exp(-dt * 5))
      this.camera.updateProjectionMatrix()
    }
  }

  _snapCamera() {
    const target = new THREE.Vector3(this.player.pos.x, 1.5, this.player.pos.z)
    const cosP = Math.cos(this.camPitch)
    this.camTarget.copy(target)
    this.camera.position.set(
      target.x + Math.sin(this.camYaw) * cosP * this.camDist,
      target.y + Math.sin(this.camPitch) * this.camDist + 0.5,
      target.z + Math.cos(this.camYaw) * cosP * this.camDist
    )
    this.camera.lookAt(target)
    this.camera.fov = 62
    this.camera.updateProjectionMatrix()
  }

  _addShake(amount) {
    this.shake = Math.max(this.shake, amount)
  }

  _resolveCollision(pos, radius) {
    const colliders = this.world.colliders
    for (let iter = 0; iter < 2; iter++) {
      for (const c of colliders) {
        if (c.type === 'circle') {
          const dx = pos.x - c.x
          const dz = pos.z - c.z
          const rr = c.r + radius
          const d2 = dx * dx + dz * dz
          if (d2 < rr * rr) {
            const d = Math.sqrt(d2) || 0.0001
            pos.x = c.x + (dx / d) * rr
            pos.z = c.z + (dz / d) * rr
          }
        } else {
          const cx = clamp(pos.x, c.minX, c.maxX)
          const cz = clamp(pos.z, c.minZ, c.maxZ)
          let dx = pos.x - cx
          let dz = pos.z - cz
          let d2 = dx * dx + dz * dz
          if (d2 < radius * radius) {
            if (d2 > 0.00001) {
              const d = Math.sqrt(d2)
              pos.x = cx + (dx / d) * radius
              pos.z = cz + (dz / d) * radius
            } else {
              const dl = pos.x - c.minX
              const dr = c.maxX - pos.x
              const dt = pos.z - c.minZ
              const db = c.maxZ - pos.z
              const m = Math.min(dl, dr, dt, db)
              if (m === dl) pos.x = c.minX - radius
              else if (m === dr) pos.x = c.maxX + radius
              else if (m === dt) pos.z = c.minZ - radius
              else pos.z = c.maxZ + radius
            }
          }
        }
      }
    }
    const r = Math.hypot(pos.x, pos.z)
    if (r > 43) {
      pos.x = (pos.x / r) * 43
      pos.z = (pos.z / r) * 43
    }
    pos.y = 0
  }

  _moveActor(actor, dirX, dirZ, speed, dt, radius = 0.32) {
    actor.pos.x += dirX * speed * dt
    actor.pos.z += dirZ * speed * dt
    this._resolveCollision(actor.pos, radius)
  }

  _followPath(actor, speed, dt, radius = 0.32) {
    if (!actor.path || actor.pathIndex >= actor.path.length) return false
    const target = actor.path[actor.pathIndex]
    const dx = target.x - actor.pos.x
    const dz = target.z - actor.pos.z
    const dist = Math.hypot(dx, dz)
    if (dist < 0.28) {
      actor.pathIndex++
      if (actor.pathIndex >= actor.path.length) {
        actor.path = null
        return false
      }
      return true
    }
    const nx = dx / (dist || 1)
    const nz = dz / (dist || 1)
    this._moveActor(actor, nx, nz, speed, dt, radius)
    const targetFacing = Math.atan2(nx, nz)
    actor.facing = lerpAngle(actor.facing, targetFacing, 1 - Math.exp(-dt * 9))
    actor.group.rotation.y = actor.facing
    actor.currentSpeed = speed
    return true
  }

  _updateNPCs(dt) {
    for (const npc of this.npcs) {
      if (!npc.alive) continue
      const dPlayer = distance2D(this.player.pos, npc.pos)
      if (npc.talkingT > 0) {
        npc.talkingT -= dt
        npc.facing = lerpAngle(npc.facing, Math.atan2(this.player.pos.x - npc.pos.x, this.player.pos.z - npc.pos.z), 1 - Math.exp(-dt * 6))
        npc.group.rotation.y = npc.facing
        npc.currentSpeed = 0
        animateCharacter(npc.group, dt, 0, true)
        continue
      }
      if (dPlayer < 2.4) {
        const face = Math.atan2(this.player.pos.x - npc.pos.x, this.player.pos.z - npc.pos.z)
        npc.facing = lerpAngle(npc.facing, face, 1 - Math.exp(-dt * 5))
        npc.group.rotation.y = npc.facing
        npc.currentSpeed = 0
        animateCharacter(npc.group, dt, 0, true)
        continue
      }
      if (npc.path) {
        const moved = this._followPath(npc, npc.speed, dt)
        if (!moved) {
          npc.path = null
          npc.idle = 1.5 + Math.random() * 3.5
        }
      } else {
        npc.idle -= dt
        if (npc.idle <= 0) {
          const target = this.world.waypoints[Math.floor(Math.random() * this.world.waypoints.length)]
          const path = this.nav.findPath(npc.pos, target)
          if (path && path.length) {
            npc.path = path
            npc.pathIndex = 0
          }
          npc.idle = 1 + Math.random() * 3
        }
      }
      const speed = npc.path ? npc.speed : 0
      animateCharacter(npc.group, dt, speed, speed < 0.1)
      npc.group.position.set(npc.pos.x, 0, npc.pos.z)
    }
  }

  _updateScares(dt) {
    if (this.forceScareT >= 0) {
      this.forceScareT -= dt
      if (this.forceScareT <= 0) {
        this.forceScareT = -1
        this._showScare()
      }
    }
    this.nextScare -= dt
    if (this.nextScare <= 0) {
      this.nextScare = 42 + Math.random() * 26
      this._showScare()
    }
    if (this.scareActive) {
      this.scareT -= dt
      animateGhost(this.scareGhost, dt, 0, 'idle')
      this.scareGhost.rotation.y = Math.atan2(this.player.pos.x - this.scareGhost.position.x, this.player.pos.z - this.scareGhost.position.z)
      const d = distance2D(this.player.pos, this.scareGhost.position)
      if (d < 7 || this.scareT <= 0) this._hideScare()
    }
  }

  _updateKills() {
    if (this.killIndex >= 3) return
    if (this.runTime >= this.nextKill) {
      this.nextKill = this.runTime + 56
      this._killOne()
    }
  }

  _updateHeart(dt) {
    let prox = 0
    if (this.scareActive) prox = Math.max(prox, clamp(1 - distance2D(this.player.pos, this.scareGhost.position) / 20, 0, 1))
    this.audio.update(dt, prox * 0.8)
  }

  _updateChase(dt) {
    const c = this.chase
    if (!c.active) return
    c.time += dt
    this.stunCool = Math.max(0, this.stunCool - dt)
    const ghost = this.ghost
    ghost.visible = true
    const dist = distance2D(this.player.pos, ghost.position)
    c.dist = dist
    if (c.ghostStun > 0) {
      c.ghostStun -= dt
      animateGhost(ghost, dt, 0, 'idle')
      ghost.rotation.y = Math.atan2(this.player.pos.x - ghost.position.x, this.player.pos.z - ghost.position.z)
    } else {
      c.repath -= dt
      if (c.repath <= 0 || !this.chasePath) {
        c.repath = 0.45
        this.chasePath = this.nav.findPath(ghost.position, this.player.pos) || null
        this.chasePathIndex = 0
      }
      let moved = false
      if (this.chasePath && this.chasePathIndex < this.chasePath.length) {
        const target = this.chasePath[this.chasePathIndex]
        const dx = target.x - ghost.position.x
        const dz = target.z - ghost.position.z
        const dd = Math.hypot(dx, dz)
        if (dd < 0.3) {
          this.chasePathIndex++
        } else {
          const nx = dx / (dd || 1)
          const nz = dz / (dd || 1)
          ghost.position.x += nx * 5.15 * dt
          ghost.position.z += nz * 5.15 * dt
          const facing = Math.atan2(nx, nz)
          ghost.rotation.y = lerpAngle(ghost.rotation.y, facing, 1 - Math.exp(-dt * 9))
          moved = true
        }
      }
      if (!moved) {
        const dx = this.player.pos.x - ghost.position.x
        const dz = this.player.pos.z - ghost.position.z
        const dd = Math.hypot(dx, dz) || 1
        ghost.position.x += (dx / dd) * 5.15 * dt
        ghost.position.z += (dz / dd) * 5.15 * dt
        ghost.rotation.y = lerpAngle(ghost.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-dt * 9))
      }
      this._resolveCollision(ghost.position, 0.42)
      ghost.position.y = 0
      animateGhost(ghost, dt, 5.15, 'walk')
    }

    const prox = clamp(1 - dist / 22, 0, 1)
    this.audio.update(dt, prox)
    this.shake = Math.max(this.shake, prox > 0.8 ? 0.25 : 0)
    if (dist < 1.35) {
      this._caught()
      return
    }
    if (distance2D(this.player.pos, this.world.exitPos) < 3.3) {
      this._win()
    }
  }

  _updateHud() {
    if (!this.ui) return
    const target = this._objectiveTarget()
    let objective = ''
    if (this.mode === 'chase') objective = '¡CORRE HACIA LA SALIDA!'
    else if (this.tapesCollected < 3) objective = `Encuentra las 3 cintas VHS · ${this.tapesCollected}/3`
    else objective = 'Vuelve a la radio del campamento'
    let angle = 0
    let dist = 0
    if (target) {
      const dx = target.x - this.player.pos.x
      const dz = target.z - this.player.pos.z
      dist = Math.hypot(dx, dz)
      const forward = new THREE.Vector2(-Math.sin(this.camYaw), -Math.cos(this.camYaw))
      const right = new THREE.Vector2(Math.cos(this.camYaw), -Math.sin(this.camYaw))
      const tn = new THREE.Vector2(dx / (dist || 1), dz / (dist || 1))
      angle = Math.atan2(tn.dot(right), tn.dot(forward))
    }
    const targetInteract = this.mode === 'playing' ? this.lastInteract : null
    const prompt = this.channel ? null : targetInteract?.label || null
    const ghostDist = this.mode === 'chase' ? distance2D(this.player.pos, this.ghost.position) : 999
    const alert = this.mode === 'chase' && ghostDist < 13
    const damage = this.mode === 'chase' ? clamp((1 - ghostDist / 8) * 0.9, 0, 0.9) : 0
    this.ui.updateHUD({
      objective,
      tapes: this.tapesCollected,
      compassAngle: angle,
      compassDist: dist,
      stamina: this.player.stamina,
      flashlight: this.player.flashOn,
      sprint: this.input.sprinting && this.player.moving,
      prompt,
      interactReady: !!targetInteract && !this.channel,
      charging: !!this.channel,
      chargeProgress: this.channel ? clamp(this.channel.elapsed / this.channel.duration, 0, 1) : 0,
      alert,
      chase: this.mode === 'chase',
      chaseDist: this.mode === 'chase' ? distance2D(this.player.pos, this.world.exitPos) : 0,
      stunCool: clamp(this.stunCool / 5.5, 0, 1),
      damage,
    })
    const items = this.npcs.map(n => ({
      id: n.def.id,
      name: n.def.name,
      position: n.group.position,
      alive: n.alive,
      visible: n.alive,
      distance: distance2D(this.player.pos, n.pos),
      talking: n.talkingT > 0 || distance2D(this.player.pos, n.pos) < 2.6,
    }))
    if (this.mode === 'playing') this.ui.updateLabels(items, this.camera)
    else this.ui.hideLabels()
  }

  _objectiveTarget() {
    if (this.mode === 'chase') return this.world.exitPos
    if (this.tapesCollected >= 3) return this.world.radioPos
    let best = null
    let bestD = Infinity
    for (const t of this.tapes) {
      if (!t.group.visible || t.spot.taken) continue
      const d = distance2D(this.player.pos, t.spot.pos)
      if (d < bestD) { bestD = d; best = t.spot.pos }
    }
    return best
  }

  _updateTapeProps(dt, time) {
    for (const t of this.tapes) {
      if (!t.group.visible) continue
      t.group.rotation.y += dt * 0.9
      t.group.position.y = t.baseY + Math.sin(time * 1.8 + t.spot.pos.x) * 0.07
      t.glow.material.opacity = 0.2 + Math.sin(time * 2.3) * 0.08
    }
  }

  _updateBeacons(dt, time) {
    const all = this.beacons
    const pulse = 0.7 + Math.sin(time * 2.2) * 0.25
    const showTapeBeacons = this.mode !== 'reveal' && this.mode !== 'chase'
    for (const t of this.tapes) {
      const active = showTapeBeacons && t.group.visible && !t.spot.taken
      t.beacon.visible = active
      if (active) this._animateBeacon(t.beacon, dt, pulse)
    }
    if (this.radioBeacon.visible) this._animateBeacon(this.radioBeacon, dt, pulse)
    if (this.exitBeacon.visible) this._animateBeacon(this.exitBeacon, dt, pulse)
  }

  _animateBeacon(beacon, dt, pulse) {
    const d = beacon.userData
    d.ring.rotation.z += dt * 0.8
    d.ring2.rotation.z -= dt * 0.5
    d.beam.material.opacity = 0.035 + pulse * 0.025
    d.glow.material.opacity = 0.1 + pulse * 0.14
    const s = 0.96 + Math.sin(this.time * 2 + beacon.position.x) * 0.07
    d.ring.scale.setScalar(s)
  }

  // ------------------------------------------------------------ debug
  debug(opts = {}) {
    return {
      collectAll: () => {
        for (const t of this.tapes) {
          if (t.group.visible) {
            this.collectTape(this.tapes.indexOf(t))
          }
        }
      },
      teleport: (x, z) => {
        this.player.pos.set(x, 0, z)
        this.playerGroup.position.set(x, 0, z)
        this._snapCamera()
      },
      scare: () => this._showScare(),
      openRoster: (accuse = false) => this.openRoster(accuse),
      accuseCorrect: () => {
        this.selectedSuspect = this.killer
        this.rosterMode = 'accuse'
        this.mode = 'roster'
        this.confirmAccuse()
      },
      forceChase: () => {
        this.mode = 'reveal'
        this.rosterMode = 'accuse'
        this._startReveal()
      },
      setKiller: (i) => { this.killer = i; const d = CHARACTER_DEFS[i]; this.killerTraits = { height: d.height > 1.75 ? 'tall' : 'short', hand: d.hand, mark: d.mark } },
      killer: () => this.killer,
      mode: () => this.mode,
      start: () => this.startRun(),
      settings: this.settings,
    }
  }
}
