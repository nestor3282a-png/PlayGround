import * as THREE from '../vendor/three.module.js'
import { World } from './world.js'
import { Game } from './game.js'
import { UI } from './ui.js'
import { Input } from './input.js'
import { AudioEngine } from './audio.js'

const canvas = document.getElementById('scene')
const params = new URLSearchParams(location.search)

let renderer
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance',
  })
} catch (error) {
  document.getElementById('boot').innerHTML = '<div style="font-family:monospace;color:#e9e3d5;text-align:center;padding:24px;line-height:1.8">TU NAVEGADOR NO PUEDE EJECUTAR WEBGL.<br>Prueba con Chrome o Safari actualizado.</div>'
  throw error
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.34
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x05080e)
scene.fog = new THREE.FogExp2(0x0a1119, 0.028)

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 170)
camera.position.set(0, 4.2, 16)
camera.lookAt(0, 1.2, 0)

const audio = new AudioEngine()
let game = null
let ui = null

function applyQuality(quality) {
  const isTouch = matchMedia('(pointer:coarse)').matches || window.innerWidth < 820
  let ratio = Math.min(window.devicePixelRatio || 1, 2)
  let shadows = true
  if (quality === 'low') {
    ratio = 1
    shadows = false
  } else if (quality === 'high') {
    ratio = Math.min(window.devicePixelRatio || 1, 2)
    shadows = true
  } else {
    ratio = Math.min(window.devicePixelRatio || 1, isTouch ? 1.55 : 1.9)
    shadows = !isTouch || window.devicePixelRatio <= 1.5
  }
  renderer.setPixelRatio(ratio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  if (renderer.shadowMap.enabled !== shadows) {
    renderer.shadowMap.enabled = shadows
    scene.traverse(o => {
      if (o.isMesh) {
        if (Array.isArray(o.material)) o.material.forEach(m => { m.needsUpdate = true })
        else if (o.material) o.material.needsUpdate = true
      }
    })
  }
}

window.addEventListener('gf-quality', (event) => applyQuality(event.detail))

async function boot() {
  try { await document.fonts.ready } catch {}
  if (params.get('quality')) {
    try {
      const raw = localStorage.getItem('ghostface.settings.v1')
      const s = raw ? JSON.parse(raw) : {}
      s.quality = params.get('quality')
      localStorage.setItem('ghostface.settings.v1', JSON.stringify(s))
    } catch {}
  }

  const world = new World(scene)
  const input = new Input(canvas, {
    onAction: (action) => {
      if (!game) return
      if (action === 'light') game.toggleFlashlight()
      else if (action === 'interact') game.interact()
      else if (action === 'stun') game.stun()
    },
    onPause: () => {
      if (!game) return
      if (game.mode === 'playing' || game.mode === 'chase') game.pause()
      else if (game.mode === 'paused') game.resume()
      else if (game.mode === 'roster') game.closeRoster()
    },
    onRoster: () => {
      if (!game) return
      if (game.mode === 'roster') game.closeRoster()
      else if (game.mode === 'playing') game.openRoster(false)
    },
  })

  game = new Game({ scene, camera, renderer, world, input, audio })
  ui = new UI(game)
  game.attachUI(ui)

  if (params.get('mute') === '1') {
    game.settings.volume = 0
    game.audio.setMuted(true)
  }

  applyQuality(game.settings.quality)
  ui.bootDone()

  window.__ghostface = { game, ui, world, camera, scene, renderer, input, audio, THREE }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (game.mode === 'playing' || game.mode === 'chase')) game.pause()
  })

  if (params.get('autostart') === '1') {
    setTimeout(() => game.startRun(), 500)
  }

  let last = performance.now()
  let firstFrame = true
  function animate(now) {
    requestAnimationFrame(animate)
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    game.update(dt, now / 1000)
    renderer.render(scene, camera)
    if (firstFrame) {
      firstFrame = false
      window.__gfReady = true
    }
  }
  requestAnimationFrame(animate)
}

boot().catch((error) => {
  console.error(error)
  const bootEl = document.getElementById('boot')
  if (bootEl) bootEl.innerHTML = '<div style="font-family:monospace;color:#e9e3d5;text-align:center;padding:24px;line-height:1.8">ERROR AL CARGAR EL CAMPAMENTO.<br>Recarga la página.</div>'
})
