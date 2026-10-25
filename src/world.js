import * as THREE from '../vendor/three.module.js'
import { createGlowSprite } from './models.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function canvasTexture(canvas, { repeat = null, srgb = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas)
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeat[0], repeat[1])
  }
  return tex
}

function makeGroundTexture() {
  const size = 1024
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const worldToPx = v => ((v + 48) / 96) * size
  const px = (x, z) => [worldToPx(x), worldToPx(z)]

  g.fillStyle = '#0a100c'
  g.fillRect(0, 0, size, size)

  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * size, y = Math.random() * size
    const shade = Math.random()
    g.fillStyle = shade < 0.52
      ? `rgba(${18 + Math.random() * 20},${30 + Math.random() * 27},${20 + Math.random() * 18},${0.16 + Math.random() * 0.3})`
      : `rgba(${30 + Math.random() * 26},${24 + Math.random() * 18},${15 + Math.random() * 12},${0.1 + Math.random() * 0.22})`
    const w = 1 + Math.random() * 3
    g.fillRect(x, y, w, w * (0.4 + Math.random() * 2.2))
  }

  for (let i = 0; i < 260; i++) {
    const x = Math.random() * size, y = Math.random() * size
    const r = 12 + Math.random() * 62
    const grd = g.createRadialGradient(x, y, 0, x, y, r)
    if (Math.random() < 0.55) {
      grd.addColorStop(0, 'rgba(34,48,28,.22)')
      grd.addColorStop(1, 'rgba(34,48,28,0)')
    } else {
      grd.addColorStop(0, 'rgba(48,35,20,.16)')
      grd.addColorStop(1, 'rgba(48,35,20,0)')
    }
    g.fillStyle = grd
    g.beginPath()
    g.ellipse(x, y, r, r * (0.45 + Math.random() * 0.7), Math.random() * Math.PI, 0, Math.PI * 2)
    g.fill()
  }

  // clearing at the fire
  const cx = worldToPx(0), cy = worldToPx(0)
  const clear = g.createRadialGradient(cx, cy, 10, cx, cy, 150)
  clear.addColorStop(0, 'rgba(61,47,31,.88)')
  clear.addColorStop(0.55, 'rgba(48,39,27,.62)')
  clear.addColorStop(1, 'rgba(35,32,22,0)')
  g.fillStyle = clear
  g.beginPath()
  g.arc(cx, cy, 150, 0, Math.PI * 2)
  g.fill()

  const drawPath = (points, width) => {
    const pts = points.map(([x, z]) => px(x, z))
    for (let pass = 0; pass < 3; pass++) {
      g.beginPath()
      g.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1]
        const [x1, y1] = pts[i]
        const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 18
        const my = (y0 + y1) / 2 + (Math.random() - 0.5) * 18
        g.quadraticCurveTo(mx, my, x1, y1)
      }
      const w = width + (pass === 0 ? 16 : 0) - pass * 6
      g.strokeStyle = pass === 0 ? 'rgba(72,57,37,.34)' : pass === 1 ? 'rgba(47,36,24,.62)' : 'rgba(35,27,18,.55)'
      g.lineWidth = w
      g.lineCap = 'round'
      g.lineJoin = 'round'
      g.stroke()
    }
  }

  drawPath([[0, 0], [-4, -2], [-9, -4.5], [-13, -5.5], [-16, -6]], 52)
  drawPath([[0, 0], [4, 1], [8, 2.5], [12, 3.5], [16, 4]], 52)
  drawPath([[0, 0], [-1, 5], [-2, 10], [-3.4, 14], [-4, 17]], 46)
  drawPath([[0, 0], [2, -5], [5, -10], [7.5, -14], [9, -17]], 42)
  drawPath([[0, 0], [-5, 4], [-10, 8], [-15, 11], [-19, 13]], 38)
  drawPath([[0, 0], [0, -5], [0, -13], [0, -22], [0, -31], [0, -36]], 56)
  drawPath([[-9, -4.5], [-12, 2], [-7, 9]], 28)
  drawPath([[8, 2.5], [12, -5], [8, -14]], 26)

  // scattered tracks and twigs
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * size, y = Math.random() * size
    g.strokeStyle = `rgba(${60 + Math.random() * 20},${48 + Math.random() * 15},${30 + Math.random() * 10},${Math.random() * 0.24})`
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (Math.random() - 0.5) * 18, y + (Math.random() - 0.5) * 18)
    g.stroke()
  }

  return canvasTexture(c)
}

function makeLightPoolTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,255,255,.9)')
  grd.addColorStop(0.4, 'rgba(255,255,255,.32)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  return canvasTexture(c)
}

function makeSignTexture(line1, line2, line3 = '') {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const g = c.getContext('2d')
  g.fillStyle = '#1a1712'
  g.fillRect(0, 0, 512, 256)
  g.strokeStyle = '#3a3126'
  g.lineWidth = 10
  g.strokeRect(8, 8, 496, 240)
  g.fillStyle = '#d8cfb8'
  g.textAlign = 'center'
  g.font = '58px "Special Elite", monospace'
  g.fillText(line1, 256, 105)
  g.font = '38px "Special Elite", monospace'
  g.fillStyle = '#b23335'
  g.fillText(line2, 256, 165)
  if (line3) {
    g.font = '24px "Special Elite", monospace'
    g.fillStyle = 'rgba(216,207,184,.55)'
    g.fillText(line3, 256, 208)
  }
  for (let i = 0; i < 800; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.16})`
    g.fillRect(Math.random() * 512, Math.random() * 256, 2, 2)
  }
  return canvasTexture(c)
}

export class World {
  constructor(scene) {
    this.scene = scene
    this.colliders = []
    this.windowMats = []
    this.waypoints = []
    this.evidenceSpots = []
    this.npcSpawns = []
    this.time = 0
    this.flickerT = 0
    this.flickerStrength = 1
    this.radioActive = false
    this.exitActive = false
    this.fireflies = null
    this.embers = null
    this.flameMeshes = []
    this.radioPulse = 0
    this.root = new THREE.Group()
    scene.add(this.root)
    this._lightPoolTex = makeLightPoolTexture()
    this._build()
  }

  _addCollider(c) {
    this.colliders.push(c)
    return c
  }

  _circleCollider(x, z, r, nav = true) {
    return this._addCollider({ type: 'circle', x, z, r, nav })
  }

  _boxCollider(minX, maxX, minZ, maxZ, nav = true) {
    return this._addCollider({ type: 'box', minX, maxX, minZ, maxZ, nav })
  }

  _build() {
    this._buildSky()
    this._buildLights()
    this._buildGround()
    this._buildCampfire()
    this._buildCabins()
    this._buildTower()
    this._buildWell()
    this._buildShed()
    this._buildGate()
    this._buildWaypoints()
    this._buildEvidence()
    this._buildForest()
    this._buildDetails()
  }

  _buildSky() {
    const geo = new THREE.BufferGeometry()
    const count = 750
    const pos = new Float32Array(count * 3)
    const color = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 80 + Math.random() * 40
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.48
      pos[i * 3] = Math.cos(theta) * Math.cos(phi) * r
      pos[i * 3 + 1] = Math.sin(phi) * r + 4
      pos[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r
      const c = 0.55 + Math.random() * 0.45
      color[i * 3] = c * 0.8
      color[i * 3 + 1] = c * 0.88
      color[i * 3 + 2] = c
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(color, 3))
    const mat = new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false, fog: false })
    this.stars = new THREE.Points(geo, mat)
    this.root.add(this.stars)

    const moonTex = (() => {
      const c = document.createElement('canvas')
      c.width = c.height = 256
      const g = c.getContext('2d')
      const grd = g.createRadialGradient(128, 128, 30, 128, 128, 128)
      grd.addColorStop(0, 'rgba(245,248,255,1)')
      grd.addColorStop(0.4, 'rgba(220,231,250,.92)')
      grd.addColorStop(0.65, 'rgba(170,190,225,.3)')
      grd.addColorStop(1, 'rgba(120,150,210,0)')
      g.fillStyle = grd
      g.beginPath()
      g.arc(128, 128, 128, 0, Math.PI * 2)
      g.fill()
      return canvasTexture(c)
    })()
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, color: 0xdce8ff, transparent: true, opacity: 0.86, depthWrite: false, fog: false }))
    moon.position.set(-48, 52, -78)
    moon.scale.set(18, 18, 1)
    this.root.add(moon)
    this.moonSprite = moon

    const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, color: 0x9db8dd, transparent: true, opacity: 0.16, depthWrite: false, fog: false }))
    moonGlow.position.copy(moon.position)
    moonGlow.scale.set(44, 44, 1)
    this.root.add(moonGlow)

    const bg = new THREE.Mesh(
      new THREE.SphereGeometry(130, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x070c14, side: THREE.BackSide, fog: false })
    )
    this.root.add(bg)
  }

  _buildLights() {
    this.hemi = new THREE.HemisphereLight(0x405677, 0x0c100c, 1.05)
    this.scene.add(this.hemi)

    const moonLight = new THREE.DirectionalLight(0xb4c8ea, 1.15)
    moonLight.position.set(-32, 42, -46)
    moonLight.castShadow = true
    moonLight.shadow.mapSize.set(1024, 1024)
    moonLight.shadow.camera.near = 1
    moonLight.shadow.camera.far = 110
    moonLight.shadow.camera.left = -32
    moonLight.shadow.camera.right = 32
    moonLight.shadow.camera.top = 32
    moonLight.shadow.camera.bottom = -32
    moonLight.shadow.bias = -0.0012
    moonLight.shadow.normalBias = 0.02
    this.scene.add(moonLight)
    this.scene.add(moonLight.target)
    this.moonLight = moonLight

    this.fireLight = new THREE.PointLight(0xff7d2a, 38, 32, 1.8)
    this.fireLight.position.set(0, 1.5, 0)
    this.fireLight.castShadow = false
    this.scene.add(this.fireLight)
    this.fireBaseIntensity = 38

    this.radioLight = new THREE.PointLight(0x8fe2b0, 0, 5, 2)
    this.radioLight.position.set(2.6, 0.9, 0.9)
    this.scene.add(this.radioLight)

    this.exitLight = new THREE.PointLight(0xffdf9d, 0, 22, 2)
    this.exitLight.position.set(5.5, 2.2, -34)
    this.scene.add(this.exitLight)
  }

  _buildGround() {
    const tex = makeGroundTexture()
    const geo = new THREE.PlaneGeometry(96, 96, 1, 1)
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.96, metalness: 0.02, color: 0xffffff })
    const ground = new THREE.Mesh(geo, mat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.root.add(ground)

    const outer = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220),
      new THREE.MeshStandardMaterial({ color: 0x060a07, roughness: 1 })
    )
    outer.rotation.x = -Math.PI / 2
    outer.position.y = -0.02
    this.root.add(outer)

    // fake light pools
    this._addLightPool(-11.8, -4.4, 6.2, 0xffb063, 0.16)
    this._addLightPool(11.8, 2.6, 5.2, 0xffb063, 0.13)
    this._addLightPool(-4, 16.6, 4.4, 0xff9b4a, 0.09)
    this._addLightPool(0, 0, 10, 0xff8e3d, 0.2)
    this._addLightPool(-18.4, 12.6, 3.4, 0xffb063, 0.06)
  }

  _addLightPool(x, z, size, color, opacity) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: this._lightPoolTex, color, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    )
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, 0.028, z)
    this.root.add(mesh)
    return mesh
  }

  _buildCampfire() {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4741, roughness: 0.95 })
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.1, 0), stoneMat)
      stone.position.set(Math.cos(a) * 1.12, 0.13, Math.sin(a) * 1.12)
      stone.rotation.set(Math.random(), Math.random(), Math.random())
      stone.castShadow = true
      stone.receiveShadow = true
      this.root.add(stone)
    }
    const logMat = new THREE.MeshStandardMaterial({ color: 0x2d2117, roughness: 0.98 })
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.4, 7), logMat)
      log.rotation.z = Math.PI / 2
      log.rotation.y = (i / 4) * Math.PI + 0.2
      log.position.set(Math.cos(i) * 0.12, 0.18 + i * 0.04, Math.sin(i) * 0.12)
      log.castShadow = true
      this.root.add(log)
    }

    const flameGroup = new THREE.Group()
    flameGroup.position.y = 0.28
    const flameMats = [
      new THREE.MeshBasicMaterial({ color: 0xff5a12, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false }),
      new THREE.MeshBasicMaterial({ color: 0xffa329, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false }),
      new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.94, blending: THREE.AdditiveBlending, depthWrite: false }),
    ]
    for (let i = 0; i < 3; i++) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42 - i * 0.1, 1.1 + i * 0.2, 7), flameMats[i])
      flame.position.set(0, 0.5 + i * 0.12, 0)
      flame.rotation.y = i * 1.4
      flame.userData.base = 1
      flameGroup.add(flame)
      this.flameMeshes.push(flame)
    }
    const fireGlow = createGlowSprite(0xff8c3c, 5.2, 0.42)
    fireGlow.position.set(0, 1.1, 0)
    flameGroup.add(fireGlow)
    this.fireGlow = fireGlow
    this.root.add(flameGroup)

    // embers
    const emberCount = 48
    const emberPos = new Float32Array(emberCount * 3)
    const emberData = []
    for (let i = 0; i < emberCount; i++) {
      emberData.push({
        x: (Math.random() - 0.5) * 0.7,
        y: Math.random() * 2.6,
        z: (Math.random() - 0.5) * 0.7,
        speed: 0.35 + Math.random() * 0.85,
        drift: (Math.random() - 0.5) * 0.28,
      })
      emberPos[i * 3] = emberData[i].x
      emberPos[i * 3 + 1] = emberData[i].y
      emberPos[i * 3 + 2] = emberData[i].z
    }
    const emberGeo = new THREE.BufferGeometry()
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3))
    const emberMat = new THREE.PointsMaterial({
      color: 0xff9a44, size: 0.075, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    this.embers = new THREE.Points(emberGeo, emberMat)
    this.embers.userData.data = emberData
    this.root.add(this.embers)

    // seats
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.95 })
    for (let i = 0; i < 3; i++) {
      const a = 0.5 + (i / 3) * Math.PI * 2
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 1.5, 8), seatMat)
      seat.rotation.z = Math.PI / 2
      seat.position.set(Math.cos(a) * 2.8, 0.3, Math.sin(a) * 2.8)
      seat.rotation.y = -a
      seat.castShadow = true
      seat.receiveShadow = true
      this.root.add(seat)
    }

    this._circleCollider(0, 0, 1.3)

    // radio on a crate
    const radio = new THREE.Group()
    radio.position.set(2.7, 0.42, 0.9)
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 0.7), new THREE.MeshStandardMaterial({ color: 0x2a231a, roughness: 0.92 }))
    crate.position.y = -0.24
    crate.castShadow = true
    crate.receiveShadow = true
    radio.add(crate)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.3, 0.34), new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: 0.62, metalness: 0.25 }))
    body.position.y = 0.04
    body.castShadow = true
    radio.add(body)
    const grille = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.17), new THREE.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.9 }))
    grille.position.set(-0.1, 0.05, 0.172)
    radio.add(grille)
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 10), new THREE.MeshStandardMaterial({ color: 0x16181b, metalness: 0.5, roughness: 0.4 }))
    knob.rotation.x = Math.PI / 2
    knob.position.set(0.17, 0.03, 0.18)
    radio.add(knob)
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x2a0607, emissive: 0x4d080c, emissiveIntensity: 1.2 })
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), ledMat)
    led.position.set(0.18, 0.14, 0.17)
    radio.add(led)
    this.radioLed = ledMat
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.65, 5), new THREE.MeshStandardMaterial({ color: 0x8e8e8e, metalness: 0.8, roughness: 0.3 }))
    antenna.position.set(0.2, 0.5, 0)
    antenna.rotation.z = -0.13
    radio.add(antenna)
    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), new THREE.MeshStandardMaterial({ color: 0x9d9d9d, metalness: 0.7 }))
    antennaTip.position.set(0.242, 0.83, 0)
    radio.add(antennaTip)
    const radioGlow = createGlowSprite(0xff3d4a, 1.6, 0.0)
    radioGlow.position.set(0.18, 0.14, 0.17)
    radio.add(radioGlow)
    this.radioGlow = radioGlow
    this.radio = radio
    this.radioPos = new THREE.Vector3(2.7, 0, 1.6)
    this.root.add(radio)
  }

  _windowMaterial() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3a2a16, emissive: 0xffa54d, emissiveIntensity: 2.5, roughness: 0.5,
    })
    this.windowMats.push(mat)
    return mat
  }

  _buildCabin({ x, z, w = 6, d = 5, h = 2.9, face = 'east', tint = 0x2b2119 }) {
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    const wood = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.95 })
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x17130f, roughness: 0.98 })
    const stone = new THREE.MeshStandardMaterial({ color: 0x3c3a35, roughness: 0.96 })

    const foundation = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.35, d + 0.4), stone)
    foundation.position.y = 0.17
    foundation.castShadow = true
    foundation.receiveShadow = true
    g.add(foundation)

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood)
    body.position.y = 0.34 + h / 2
    body.castShadow = true
    body.receiveShadow = true
    g.add(body)

    // log slats
    for (let i = 0; i < 8; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.075, d + 0.04), darkWood)
      slat.position.y = 0.45 + i * 0.34
      g.add(slat)
    }

    // roof
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 0.98 })
    for (const side of [-1, 1]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 1.1, 0.16, d * 0.72), roofMat)
      slab.position.set(0, h + 0.75, side * d * 0.23)
      slab.rotation.x = side * 0.35
      slab.castShadow = true
      g.add(slab)
    }
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.14, 0.18), darkWood)
    ridge.position.set(0, h + 0.98, 0)
    g.add(ridge)

    // gable triangles (simple planes)
    for (const side of [-1, 1]) {
      const triShape = new THREE.Shape()
      triShape.moveTo(-w / 2, 0)
      triShape.lineTo(w / 2, 0)
      triShape.lineTo(0, 0.62)
      triShape.closePath()
      const tri = new THREE.Mesh(new THREE.ShapeGeometry(triShape), wood)
      tri.position.set(0, h + 0.47, side * (d / 2 + 0.015))
      tri.rotation.y = side < 0 ? Math.PI : 0
      g.add(tri)
    }

    const faceInfo = {
      east: { nx: 1, nz: 0, rot: Math.PI / 2, ox: w / 2 + 0.015, oz: 0 },
      west: { nx: -1, nz: 0, rot: -Math.PI / 2, ox: -w / 2 - 0.015, oz: 0 },
      north: { nx: 0, nz: -1, rot: Math.PI, ox: 0, oz: -d / 2 - 0.015 },
      south: { nx: 0, nz: 1, rot: 0, ox: 0, oz: d / 2 + 0.015 },
    }[face]

    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 2.05),
      new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 0.95 })
    )
    door.position.set(faceInfo.ox, 1.4, faceInfo.oz)
    door.rotation.y = faceInfo.rot
    g.add(door)
    const lightSeam = new THREE.Mesh(
      new THREE.PlaneGeometry(0.035, 1.95),
      new THREE.MeshStandardMaterial({ color: 0xffb25b, emissive: 0xff9440, emissiveIntensity: 1.8 })
    )
    lightSeam.position.set(faceInfo.ox + faceInfo.nx * 0.012, 1.4, faceInfo.oz + faceInfo.nz * 0.012)
    lightSeam.rotation.y = faceInfo.rot
    g.add(lightSeam)

    const winMat = this._windowMaterial()
    const windowSpots = face === 'east' || face === 'west'
      ? [[0.28 * d, 0.95], [-0.28 * d, 0.95]]
      : [[0.3 * w, 0.95], [-0.3 * w, 0.95]]
    for (const [offset, ww] of windowSpots) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(ww, 0.82), winMat)
      if (face === 'east' || face === 'west') {
        win.position.set(faceInfo.ox, 1.95, offset)
        win.rotation.y = faceInfo.rot
      } else {
        win.position.set(offset, 1.95, faceInfo.oz)
        win.rotation.y = faceInfo.rot
      }
      g.add(win)
      const bars = new THREE.Group()
      for (let i = 0; i < 2; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.9, 0.03), darkWood)
        bar.position.set((i ? 1 : -1) * ww * 0.22, 0, 0)
        bars.add(bar)
      }
      const barH = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.035, 0.03), darkWood)
      bars.add(barH)
      if (face === 'east' || face === 'west') {
        bars.position.set(faceInfo.ox + faceInfo.nx * 0.015, 1.95, offset)
        bars.rotation.y = faceInfo.rot
      } else {
        bars.position.set(offset, 1.95, faceInfo.oz + faceInfo.nz * 0.015)
        bars.rotation.y = faceInfo.rot
      }
      g.add(bars)
      const glow = createGlowSprite(0xffb063, 2.1, 0.18)
      if (face === 'east' || face === 'west') glow.position.set(faceInfo.ox + faceInfo.nx * 0.55, 1.95, offset)
      else glow.position.set(offset, 1.95, faceInfo.oz + faceInfo.nz * 0.55)
      g.add(glow)
    }

    // porch
    const isNS = face === 'north' || face === 'south'
    const porchDepth = 2.2
    const porchW = isNS ? w * 0.92 : porchDepth
    const porchD = isNS ? porchDepth : d * 0.92
    const porchX = face === 'east' ? w / 2 + porchDepth / 2 : face === 'west' ? -w / 2 - porchDepth / 2 : 0
    const porchZ = face === 'south' ? d / 2 + porchDepth / 2 : face === 'north' ? -d / 2 - porchDepth / 2 : 0
    const porch = new THREE.Mesh(new THREE.BoxGeometry(porchW, 0.12, porchD), darkWood)
    porch.position.set(porchX, 0.12, porchZ)
    porch.receiveShadow = true
    porch.castShadow = true
    g.add(porch)

    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.5, 0.14), darkWood)
      const px = face === 'east' ? w / 2 + porchDepth - 0.18 : face === 'west' ? -w / 2 - porchDepth + 0.18 : s * porchW * 0.44
      const pz = face === 'south' ? d / 2 + porchDepth - 0.18 : face === 'north' ? -d / 2 - porchDepth + 0.18 : s * porchD * 0.44
      post.position.set(px, 1.3, pz)
      post.castShadow = true
      g.add(post)
    }
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(porchW + 0.2, 0.12, porchD + 0.2), roofMat)
    porchRoof.position.set(porchX, 2.56, porchZ)
    porchRoof.rotation.z = face === 'east' ? -0.06 : face === 'west' ? 0.06 : 0
    porchRoof.rotation.x = face === 'north' ? 0.06 : face === 'south' ? -0.06 : 0
    g.add(porchRoof)

    // steps
    const steps = new THREE.Mesh(new THREE.BoxGeometry(isNS ? 1.4 : 0.5, 0.1, isNS ? 0.5 : 1.4), darkWood)
    steps.position.set(
      face === 'east' ? w / 2 + porchDepth + 0.25 : face === 'west' ? -w / 2 - porchDepth - 0.25 : 0,
      0.06,
      face === 'south' ? d / 2 + porchDepth + 0.25 : face === 'north' ? -d / 2 - porchDepth - 0.25 : 0
    )
    g.add(steps)

    this.root.add(g)

    const pad = 0.1
    this._boxCollider(x - w / 2 - pad, x + w / 2 + pad, z - d / 2 - pad, z + d / 2 + pad)
    return g
  }

  _buildCabins() {
    this._buildCabin({ x: -17, z: -6, w: 6, d: 5, face: 'east', tint: 0x2c2118 })
    this._buildCabin({ x: 17, z: 4, w: 6, d: 5, face: 'west', tint: 0x241f1a })
  }

  _buildShed() {
    const g = new THREE.Group()
    g.position.set(-4, 0, 19.5)
    const metal = new THREE.MeshStandardMaterial({ color: 0x2c2f2f, metalness: 0.35, roughness: 0.75 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x111314, roughness: 0.95 })
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.7, 3.7), metal)
    body.position.y = 1.35
    body.castShadow = true
    body.receiveShadow = true
    g.add(body)
    for (let i = 0; i < 14; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(4.24, 2.72, 0.035), dark)
      rib.position.set(0, 1.35, -1.84 + i * 0.283)
      g.add(rib)
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.16, 4.3), dark)
    roof.position.set(0, 2.82, 0)
    roof.rotation.x = 0.06
    roof.castShadow = true
    g.add(roof)
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), dark)
    door.position.set(0.55, 1.2, 1.86)
    door.rotation.y = Math.PI
    g.add(door)
    const lightSeam = new THREE.Mesh(
      new THREE.PlaneGeometry(0.04, 2.1),
      new THREE.MeshStandardMaterial({ color: 0xff7b31, emissive: 0xff5c18, emissiveIntensity: 1.4 })
    )
    lightSeam.position.set(-0.18, 1.2, 1.855)
    lightSeam.rotation.y = Math.PI
    g.add(lightSeam)
    this.root.add(g)
    this._boxCollider(-6.25, -1.75, 17.55, 21.45)
  }

  _buildTower() {
    const g = new THREE.Group()
    g.position.set(11, 0, -18)
    const wood = new THREE.MeshStandardMaterial({ color: 0x2a2017, roughness: 0.96 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x14100d, roughness: 1 })
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.6, 0.2), wood)
        post.position.set(sx * 1.35, 2.3, sz * 1.35)
        post.castShadow = true
        g.add(post)
      }
    }
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.12, 0.1), wood)
        brace.position.set(0, 0.8 + i * 1.3, side * 1.35)
        g.add(brace)
        const brace2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 2.75), wood)
        brace2.position.set(side * 1.35, 0.8 + i * 1.3, 0)
        g.add(brace2)
      }
    }
    const platform = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.16, 3.3), wood)
    platform.position.y = 4.55
    platform.castShadow = true
    platform.receiveShadow = true
    g.add(platform)
    for (const [x, z, w, d] of [[0, 1.55, 3.3, 0.08], [0, -1.55, 3.3, 0.08], [1.55, 0, 0.08, 3.3], [-1.55, 0, 0.08, 3.3]]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.75, d), wood)
      rail.position.set(x, 5, z)
      g.add(rail)
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 4), dark)
    roof.position.y = 6.2
    roof.rotation.y = Math.PI / 4
    g.add(roof)
    for (let i = 0; i < 4; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), wood)
      post.position.set(i < 2 ? -1.35 : 1.35, 5.55, i % 2 ? -1.35 : 1.35)
      g.add(post)
    }
    const ladder = new THREE.Group()
    for (const sx of [-0.3, 0.3]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 4.3, 0.06), wood)
      rail.position.set(sx, 2.15, 1.52)
      ladder.add(rail)
    }
    for (let i = 0; i < 9; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.05, 0.05), wood)
      rung.position.set(0, 0.4 + i * 0.46, 1.52)
      ladder.add(rung)
    }
    g.add(ladder)
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshStandardMaterial({ color: 0x5a1014, emissive: 0xff1e2c, emissiveIntensity: 2.2 }))
    lantern.position.set(0, 5.2, 1.5)
    g.add(lantern)
    const lanternGlow = createGlowSprite(0xff2634, 1.3, 0.26)
    lanternGlow.position.set(0, 5.2, 1.5)
    g.add(lanternGlow)
    this.root.add(g)
    for (const sx of [-1.35, 1.35]) for (const sz of [-1.35, 1.35]) this._circleCollider(11 + sx, -18 + sz, 0.22)
  }

  _buildWell() {
    const g = new THREE.Group()
    g.position.set(-21, 0, 14)
    const stone = new THREE.MeshStandardMaterial({ color: 0x3d3b36, roughness: 0.98 })
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.95, 14, 1, true), stone)
    ring.position.y = 0.48
    ring.castShadow = true
    ring.receiveShadow = true
    g.add(ring)
    const inner = new THREE.Mesh(new THREE.CircleGeometry(1.12, 14), new THREE.MeshBasicMaterial({ color: 0x020202 }))
    inner.rotation.x = -Math.PI / 2
    inner.position.y = 0.88
    g.add(inner)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.12, 8, 18), stone)
    rim.rotation.x = Math.PI / 2
    rim.position.y = 0.95
    g.add(rim)
    const wood = new THREE.MeshStandardMaterial({ color: 0x241b13, roughness: 0.98 })
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), wood)
      post.position.set(sx * 1.05, 1.6, 0)
      g.add(post)
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.14), wood)
    beam.position.y = 2.7
    g.add(beam)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.7, 4), new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 1 }))
    roof.position.y = 3.1
    roof.rotation.y = Math.PI / 4
    g.add(roof)
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.7, 4), new THREE.MeshStandardMaterial({ color: 0x5f4c33, roughness: 1 }))
    rope.position.set(0, 1.85, 0)
    g.add(rope)
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.28, 9), wood)
    bucket.position.set(0, 0.98, 0)
    g.add(bucket)
    this.root.add(g)
    this._circleCollider(-21, 14, 1.35)
  }

  _buildGate() {
    const wood = new THREE.MeshStandardMaterial({ color: 0x2a2017, roughness: 0.97 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 1 })

    const gate = new THREE.Group()
    gate.position.set(0, 0, -35.5)
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.35), wood)
      post.position.set(sx * 3.6, 1.7, 0)
      post.castShadow = true
      gate.add(post)
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.3, 0.3), wood)
    beam.position.y = 3.15
    gate.add(beam)
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 1.15),
      new THREE.MeshStandardMaterial({ map: makeSignTexture('SALIDA', 'BLACKWOOD', 'NO MIRES ATRÁS'), roughness: 0.9, emissive: 0x1a0c04, emissiveIntensity: 0.6 })
    )
    sign.position.set(0, 2.4, 0.19)
    gate.add(sign)
    const signGlow = createGlowSprite(0xffb063, 2.8, 0.11)
    signGlow.position.set(0, 2.4, 0.4)
    gate.add(signGlow)

    for (let side = 0; side < 2; side++) {
      const dir = side ? 1 : -1
      for (let i = 0; i < 4; i++) {
        const x = dir * (4.4 + i * 2)
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.1, 0.18), dark)
        post.position.set(x, 1.05, -35.5)
        gate.add(post)
      }
      for (let i = 0; i < 3; i++) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(8, 0.11, 0.09), wood)
        rail.position.set(dir * 8, 0.55 + i * 0.62, -35.5)
        gate.add(rail)
      }
      this._boxCollider(side ? 3.75 : -11.8, side ? 11.8 : -3.75, -35.75, -35.25, true)
    }

    // truck behind the fence
    const truck = new THREE.Group()
    truck.position.set(6.4, 0, -38.6)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x26302f, roughness: 0.78, metalness: 0.12 })
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.35, 2.1), bodyMat)
    cab.position.set(0, 1.15, 0.9)
    cab.castShadow = true
    truck.add(cab)
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 2.7), bodyMat)
    bed.position.set(0, 0.85, -1.25)
    bed.castShadow = true
    truck.add(bed)
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.62), new THREE.MeshStandardMaterial({ color: 0x0b1216, metalness: 0.6, roughness: 0.18 }))
    windshield.position.set(0, 1.45, 1.97)
    truck.add(windshield)
    this.truckHeadlights = []
    for (const sx of [-0.66, 0.66]) {
      const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff0c4, emissive: 0xffe2a0, emissiveIntensity: 0.15 })
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.18, 10), lampMat)
      lamp.position.set(sx, 0.92, 2.16)
      truck.add(lamp)
      this.truckHeadlights.push(lampMat)
    }
    for (const sx of [-1, 1]) for (const sz of [0.85, -1.35]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 10), new THREE.MeshStandardMaterial({ color: 0x0c0d0e, roughness: 0.95 }))
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(sx * 1.12, 0.38, sz)
      truck.add(wheel)
    }
    this.root.add(truck)
    this.root.add(gate)
    this._boxCollider(5.1, 7.7, -39.9, -37.2, false)
    this.exitPos = new THREE.Vector3(0, 0, -34.3)
  }

  _buildForest() {
    const rand = (a, b) => a + Math.random() * (b - a)
    const spots = []
    const blocked = (x, z) => {
      if (Math.hypot(x, z) < 13.5) return true
      if (Math.abs(x) < 4.3 && z > -40 && z < -2) return true
      if (Math.abs(x + 4) < 5.8 && z > 14 && z < 24) return true
      if (Math.abs(x + 17) < 6.8 && Math.abs(z + 6) < 5.8) return true
      if (Math.abs(x - 17) < 6.8 && Math.abs(z - 4) < 5.8) return true
      if (Math.abs(x - 11) < 4.5 && Math.abs(z + 18) < 4.5) return true
      if (Math.abs(x + 21) < 4.5 && Math.abs(z - 14) < 4.5) return true
      for (const s of this.evidenceSpots) if (Math.hypot(x - s.pos.x, z - s.pos.z) < 4) return true
      for (const s of this.waypoints) if (Math.hypot(x - s.x, z - s.z) < 2.2) return true
      for (const s of spots) if (Math.hypot(x - s.x, z - s.z) < 2.6) return true
      return false
    }
    for (let tries = 0; tries < 1400 && spots.length < 185; tries++) {
      const a = Math.random() * Math.PI * 2
      const r = spots.length < 34 ? rand(13.8, 21) : rand(14, 45)
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (Math.abs(x) > 46 || Math.abs(z) > 46) continue
      if (blocked(x, z)) continue
      spots.push({ x, z, scale: rand(0.72, 1.45), rot: Math.random() * Math.PI * 2 })
    }

    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.26, 2.8, 6)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3b2d20, roughness: 0.98 })
    const trunk = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length)
    trunk.instanceMatrix.setUsage(THREE.StaticDrawUsage)

    const coneGeoA = new THREE.ConeGeometry(1.75, 3.4, 7)
    const coneGeoB = new THREE.ConeGeometry(1.35, 2.8, 7)
    const coneGeoC = new THREE.ConeGeometry(0.9, 2.2, 7)
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 })
    const layerA = new THREE.InstancedMesh(coneGeoA, leafMat, spots.length)
    const layerB = new THREE.InstancedMesh(coneGeoB, leafMat, spots.length)
    const layerC = new THREE.InstancedMesh(coneGeoC, leafMat, spots.length)
    for (const m of [trunk, layerA, layerB, layerC]) {
      m.instanceMatrix.setUsage(THREE.StaticDrawUsage)
      m.castShadow = false
      m.receiveShadow = true
      this.root.add(m)
    }

    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    spots.forEach((s, i) => {
      const k = s.scale
      dummy.position.set(s.x, 1.4 * k, s.z)
      dummy.rotation.set(0, s.rot, 0)
      dummy.scale.set(k, k, k)
      dummy.updateMatrix()
      trunk.setMatrixAt(i, dummy.matrix)

      dummy.position.set(s.x, (2.6 + 1.2) * k, s.z)
      dummy.scale.set(k, k * rand(0.9, 1.2), k)
      dummy.rotation.y = s.rot + i
      dummy.updateMatrix()
      layerA.setMatrixAt(i, dummy.matrix)

      dummy.position.set(s.x, (4.4 + 0.9) * k, s.z)
      dummy.rotation.y = s.rot * 1.3
      dummy.updateMatrix()
      layerB.setMatrixAt(i, dummy.matrix)

      dummy.position.set(s.x, (5.9 + 0.7) * k, s.z)
      dummy.rotation.y = s.rot * 0.7
      dummy.updateMatrix()
      layerC.setMatrixAt(i, dummy.matrix)

      const t = Math.random()
      color.setHSL(0.29 + t * 0.045, 0.26 + t * 0.1, 0.045 + t * 0.038)
      layerA.setColorAt(i, color)
      layerB.setColorAt(i, color.clone().multiplyScalar(1.12))
      layerC.setColorAt(i, color.clone().multiplyScalar(1.25))
      this._circleCollider(s.x, s.z, 0.28 * k)
    })
    trunk.instanceMatrix.needsUpdate = true
    for (const m of [layerA, layerB, layerC]) {
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    this.treeSpots = spots

    // bushes
    const bushGeo = new THREE.IcosahedronGeometry(0.7, 1)
    const bushMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 })
    const bushCount = 72
    const bushes = new THREE.InstancedMesh(bushGeo, bushMat, bushCount)
    let placed = 0
    for (let tries = 0; tries < 400 && placed < bushCount; tries++) {
      const a = Math.random() * Math.PI * 2
      const r = rand(11.5, 40)
      const x = Math.cos(a) * r, z = Math.sin(a) * r
      if (Math.hypot(x, z) < 9) continue
      if (Math.abs(x) < 4 && z > -38 && z < -2) continue
      if (Math.abs(x + 17) < 5 && Math.abs(z + 6) < 4) continue
      if (Math.abs(x - 17) < 5 && Math.abs(z - 4) < 4) continue
      const s = rand(0.55, 1.5)
      dummy.position.set(x, 0.36 * s, z)
      dummy.rotation.set(0, Math.random() * 6, 0)
      dummy.scale.set(s, s * rand(0.5, 0.9), s)
      dummy.updateMatrix()
      bushes.setMatrixAt(placed, dummy.matrix)
      color.setHSL(0.28, 0.2 + Math.random() * 0.16, 0.035 + Math.random() * 0.03)
      bushes.setColorAt(placed, color)
      placed++
    }
    bushes.count = placed
    bushes.instanceMatrix.needsUpdate = true
    if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true
    bushes.receiveShadow = true
    this.root.add(bushes)

    // rocks
    const rockGeo = new THREE.DodecahedronGeometry(0.5, 0)
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96 })
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 46)
    placed = 0
    for (let tries = 0; tries < 300 && placed < 46; tries++) {
      const a = Math.random() * Math.PI * 2
      const r = rand(9, 40)
      const x = Math.cos(a) * r, z = Math.sin(a) * r
      if (Math.abs(x) < 4 && z > -38 && z < -2) continue
      if (Math.hypot(x, z) < 8) continue
      const s = rand(0.3, 1.15)
      dummy.position.set(x, 0.12 * s, z)
      dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
      dummy.scale.set(s, s * rand(0.5, 0.9), s)
      dummy.updateMatrix()
      rocks.setMatrixAt(placed, dummy.matrix)
      color.setHSL(0.08, 0.04, 0.12 + Math.random() * 0.06)
      rocks.setColorAt(placed, color)
      placed++
    }
    rocks.count = placed
    rocks.instanceMatrix.needsUpdate = true
    if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true
    rocks.castShadow = true
    rocks.receiveShadow = true
    this.root.add(rocks)

    // fireflies
    const flyCount = 90
    const flyPos = new Float32Array(flyCount * 3)
    const flyData = []
    for (let i = 0; i < flyCount; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 6 + Math.random() * 34
      flyData.push({
        x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0.5 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2, speed: 0.2 + Math.random() * 0.5,
        radius: 0.5 + Math.random() * 1.8,
      })
      flyPos[i * 3] = flyData[i].x
      flyPos[i * 3 + 1] = flyData[i].y
      flyPos[i * 3 + 2] = flyData[i].z
    }
    const flyGeo = new THREE.BufferGeometry()
    flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3))
    const flyMat = new THREE.PointsMaterial({
      color: 0xd8e88a, size: 0.09, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })
    this.fireflies = new THREE.Points(flyGeo, flyMat)
    this.fireflies.userData.data = flyData
    this.root.add(this.fireflies)

    // mist sprites
    this.mist = []
    const mistTex = (() => {
      const c = document.createElement('canvas')
      c.width = c.height = 128
      const g = c.getContext('2d')
      const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64)
      grd.addColorStop(0, 'rgba(255,255,255,.30)')
      grd.addColorStop(0.5, 'rgba(255,255,255,.12)')
      grd.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grd
      g.fillRect(0, 0, 128, 128)
      return canvasTexture(c)
    })()
    for (let i = 0; i < 16; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: mistTex, color: 0x9db0c4, transparent: true, opacity: 0.05,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }))
      const a = Math.random() * Math.PI * 2
      const r = Math.random() * 38
      sprite.position.set(Math.cos(a) * r, 0.6 + Math.random() * 0.9, Math.sin(a) * r)
      sprite.scale.set(10 + Math.random() * 16, 4 + Math.random() * 5, 1)
      sprite.userData.drift = { a: Math.random() * Math.PI * 2, speed: 0.05 + Math.random() * 0.1, r: r }
      this.mist.push(sprite)
      this.root.add(sprite)
    }
  }

  _buildDetails() {
    // signs
    const makePost = (x, z, h) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, h, 6), new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1 }))
      post.position.set(x, h / 2, z)
      post.castShadow = true
      this.root.add(post)
    }
    const signPositions = [
      { x: 8.8, z: -30.5, rot: -0.3, tex: makeSignTexture('BLACKWOOD', 'CAMPAMENTO', 'PROPIEDAD PRIVADA') },
      { x: -8.2, z: 8.6, rot: 0.4, tex: makeSignTexture('NO TE ALEJES', 'DEL GRUPO', '') },
    ]
    for (const s of signPositions) {
      makePost(s.x - 0.7, s.z, 2.1)
      makePost(s.x + 0.7, s.z, 2.1)
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(1.9, 0.95),
        new THREE.MeshStandardMaterial({ map: s.tex, roughness: 0.94, side: THREE.DoubleSide })
      )
      board.position.set(s.x, 1.55, s.z)
      board.rotation.y = s.rot
      this.root.add(board)
    }

    // scattered crates near cabins
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x2c2319, roughness: 0.95 })
    const crateSpots = [[-12.8, -8.4, 0.3], [-12.4, -8.1, 0.8], [13.2, 6.6, 0.2], [-5.4, 16.8, 0.5], [6.6, -13.8, 0.4]]
    for (const [x, z, r] of crateSpots) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), crateMat)
      crate.position.set(x, 0.35, z)
      crate.rotation.y = r
      crate.castShadow = true
      crate.receiveShadow = true
      this.root.add(crate)
    }

    // lantern posts along the main path
    for (const [x, z] of [[-3.2, -9], [3.2, -18], [-3.5, 7.5]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.5, 6), new THREE.MeshStandardMaterial({ color: 0x241b13, roughness: 1 }))
      post.position.set(x, 1.25, z)
      this.root.add(post)
      const wire = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 4, 8), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.4 }))
      wire.position.set(x + 0.14, 2.2, z)
      wire.rotation.y = Math.PI / 2
      this.root.add(wire)
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 6), new THREE.MeshStandardMaterial({ color: 0xffdca0, emissive: 0xffb55d, emissiveIntensity: 1.6 }))
      bulb.position.set(x + 0.27, 2.12, z)
      this.root.add(bulb)
      const glow = createGlowSprite(0xffb063, 1.4, 0.28)
      glow.position.copy(bulb.position)
      this.root.add(glow)
      this._circleCollider(x, z, 0.18, false)
    }

    // low fog cards near the ground
    this.forestRing = new THREE.Group()
    this.root.add(this.forestRing)
  }

  _buildWaypoints() {
    this.waypoints = [
      new THREE.Vector3(-10.6, 0, -6),
      new THREE.Vector3(10.6, 0, 4),
      new THREE.Vector3(-4, 0, 14.8),
      new THREE.Vector3(7.7, 0, -15.2),
      new THREE.Vector3(-18.4, 0, 13),
      new THREE.Vector3(-5, 0, 4.2),
      new THREE.Vector3(5.2, 0, -3.8),
      new THREE.Vector3(-7.5, 0, -12),
      new THREE.Vector3(9, 0, 11),
      new THREE.Vector3(-10, 0, 18),
      new THREE.Vector3(0, 0, -27),
      new THREE.Vector3(14, 0, -8),
      new THREE.Vector3(-14, 0, 2),
    ]
  }

  _buildEvidence() {
    const definitions = [
      { id: 'cabin-a', pos: new THREE.Vector3(-11.7, 0.45, -6), name: 'Cabaña de los monitores', title: 'VHS 04 — «No mires atrás»', detail: 'Sobre la barandilla del porche, medio tapada por la niebla.' },
      { id: 'cabin-b', pos: new THREE.Vector3(11.7, 0.45, 4), name: 'Cabaña del guardabosques', title: 'VHS 07 — «El bosque escucha»', detail: 'Alguien la dejó junto a la puerta, como una invitación.' },
      { id: 'shed', pos: new THREE.Vector3(-4, 0.45, 16.4), name: 'Cobertizo', title: 'VHS 13 — «La última hoguera»', detail: 'Huele a óxido y a cinta quemada.' },
      { id: 'tower', pos: new THREE.Vector3(8.4, 0.45, -16.2), name: 'Torre de vigilancia', title: 'VHS 19 — «Uno de nosotros»', detail: 'La torre cruje aunque no hay viento.' },
      { id: 'well', pos: new THREE.Vector3(-18.8, 0.45, 13), name: 'Pozo viejo', title: 'VHS 21 — «No bajes la mirada»', detail: 'La cinta está húmeda. El pozo también.' },
    ]
    for (const d of definitions) {
      const s = { ...d, taken: false }
      this.evidenceSpots.push(s)
    }
  }

  flicker(duration = 1.2, strength = 1) {
    this.flickerT = Math.max(this.flickerT, duration)
    this.flickerStrength = strength
  }

  setRadioActive(active) {
    this.radioActive = active
    if (active) this.radioPulse = 0
  }

  setExitActive(active) {
    this.exitActive = active
    this.exitLight.intensity = active ? 26 : 0
    for (const m of this.truckHeadlights) {
      m.emissiveIntensity = active ? 3.2 : 0.15
    }
  }

  update(dt, time, playerPos) {
    this.time = time
    const flick = this.flickerT > 0 ? 0.15 + Math.random() * 0.85 : 1
    if (this.flickerT > 0) this.flickerT = Math.max(0, this.flickerT - dt)
    const firePulse = 0.9 + Math.sin(time * 9.2) * 0.06 + Math.sin(time * 23.7) * 0.035
    this.fireLight.intensity = this.fireBaseIntensity * firePulse * flick
    this.fireLight.position.x = Math.sin(time * 7.3) * 0.12
    this.fireLight.position.z = Math.cos(time * 6.1) * 0.12
    this.fireGlow.material.opacity = 0.34 + Math.sin(time * 8.4) * 0.06
    for (const [i, flame] of this.flameMeshes.entries()) {
      const s = 0.86 + Math.sin(time * (8 + i * 2.4) + i) * 0.12
      flame.scale.set(0.9 + Math.sin(time * 5.7 + i) * 0.08, s, 0.9)
      flame.rotation.y += dt * (0.6 + i * 0.2)
    }
    for (const m of this.windowMats) m.emissiveIntensity = 2.5 * flick
    this.moonLight.intensity = 1.15 * (0.82 + flick * 0.18)

    // embers
    if (this.embers) {
      const data = this.embers.userData.data
      const pos = this.embers.geometry.attributes.position
      for (let i = 0; i < data.length; i++) {
        const e = data[i]
        e.y += e.speed * dt
        e.x += Math.sin(time * 1.7 + i) * e.drift * dt
        if (e.y > 3.2) {
          e.y = 0.35
          e.x = (Math.random() - 0.5) * 0.7
          e.z = (Math.random() - 0.5) * 0.7
        }
        pos.setXYZ(i, e.x, e.y, e.z)
      }
      pos.needsUpdate = true
      this.embers.material.opacity = 0.5 + flick * 0.4
    }

    if (this.fireflies) {
      const data = this.fireflies.userData.data
      const pos = this.fireflies.geometry.attributes.position
      for (let i = 0; i < data.length; i++) {
        const f = data[i]
        pos.setXYZ(
          i,
          f.x + Math.sin(time * f.speed + f.phase) * f.radius,
          f.y + Math.sin(time * 0.6 + f.phase * 1.7) * 0.5,
          f.z + Math.cos(time * f.speed * 0.8 + f.phase) * f.radius
        )
      }
      pos.needsUpdate = true
      this.fireflies.material.opacity = 0.5 + Math.sin(time * 2.1) * 0.16
    }

    for (const sprite of this.mist) {
      const d = sprite.userData.drift
      d.a += dt * d.speed * 0.04
      sprite.position.x = Math.cos(d.a) * d.r
      sprite.position.z = Math.sin(d.a) * d.r
    }

    // radio pulse when evidence complete
    if (this.radioActive) {
      this.radioPulse += dt
      const p = 0.55 + Math.sin(this.radioPulse * 4.2) * 0.45
      this.radioLight.intensity = 1.6 * p
      this.radioLed.emissiveIntensity = 0.8 + p * 3.4
      this.radioLed.color.setHex(0xff2633)
      this.radioGlow.material.opacity = 0.12 + p * 0.36
    } else {
      this.radioLight.intensity = 0
      this.radioLed.emissiveIntensity = 1
      this.radioLed.color.setHex(0x4d080c)
      this.radioGlow.material.opacity = 0
    }

    if (this.exitActive) {
      const p = 0.7 + Math.sin(time * 2.4) * 0.3
      this.exitLight.intensity = 20 + p * 12
    }
  }
}
