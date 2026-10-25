import * as THREE from '../vendor/three.module.js'

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({
  color,
  roughness: opts.roughness ?? 0.86,
  metalness: opts.metalness ?? 0.04,
  emissive: opts.emissive ?? 0x000000,
  emissiveIntensity: opts.emissiveIntensity ?? 0,
  transparent: opts.transparent ?? false,
  opacity: opts.opacity ?? 1,
  side: opts.side ?? THREE.FrontSide,
})

function box(w, h, d, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  return m
}

function addShadowFlags(group, cast = true, receive = true) {
  group.traverse(o => {
    if (o.isMesh) {
      o.castShadow = cast
      o.receiveShadow = receive
    }
  })
}

export const CHARACTER_DEFS = [
  {
    id: 'mara',
    name: 'MARA VOSS',
    role: 'MONITORA · 24 AÑOS',
    height: 1.81,
    heightLabel: '1,81 m',
    hand: 'izquierda',
    handLabel: 'ZURDA',
    mark: 'cicatriz',
    markLabel: 'CICATRIZ EN LA MUÑECA',
    jacket: 0x5d2932,
    pants: 0x24262b,
    skin: 0xc69b7d,
    hair: 0x17130f,
    hairStyle: 'long',
    accent: '#7d3541',
  },
  {
    id: 'diego',
    name: 'DIEGO REYES',
    role: 'MONITOR · 26 AÑOS',
    height: 1.68,
    heightLabel: '1,68 m',
    hand: 'derecha',
    handLabel: 'DIESTRO',
    mark: 'tatuaje',
    markLabel: 'TATUAJE EN EL CUELLO',
    jacket: 0x2d4653,
    pants: 0x1e2227,
    skin: 0x9c6c4f,
    hair: 0x0d0c0b,
    hairStyle: 'cap',
    accent: '#396173',
  },
  {
    id: 'luna',
    name: 'LUNA KADE',
    role: 'FOTÓGRAFA · 23 AÑOS',
    height: 1.76,
    heightLabel: '1,76 m',
    hand: 'derecha',
    handLabel: 'DIESTRA',
    mark: 'cicatriz',
    markLabel: 'CICATRIZ EN LA MUÑECA',
    jacket: 0x47412c,
    pants: 0x25262a,
    skin: 0xd2b195,
    hair: 0x6f5a3a,
    hairStyle: 'long',
    accent: '#7c7448',
  },
  {
    id: 'rulo',
    name: 'RULO MENDES',
    role: 'MECÁNICO · 27 AÑOS',
    height: 1.63,
    heightLabel: '1,63 m',
    hand: 'izquierda',
    handLabel: 'ZURDO',
    mark: 'tatuaje',
    markLabel: 'TATUAJE EN EL CUELLO',
    jacket: 0x37353a,
    pants: 0x24262b,
    skin: 0x8a5c42,
    hair: 0x151312,
    hairStyle: 'buzz',
    accent: '#5b555e',
  },
]

export function createCharacter(def, isPlayer = false) {
  const group = new THREE.Group()
  const root = new THREE.Group()
  group.add(root)
  const scale = (def.height || 1.75) / 1.76
  root.scale.setScalar(scale)

  const jacketMat = mat(isPlayer ? 0x344148 : def.jacket, { roughness: 0.9 })
  const pantsMat = mat(def.pants || 0x24262b, { roughness: 0.95 })
  const skinMat = mat(def.skin || 0xc69b7d, { roughness: 0.72 })
  const hairMat = mat(def.hair || 0x17130f, { roughness: 0.95 })
  const shoeMat = mat(0x121316, { roughness: 0.85 })
  const darkMat = mat(0x1b1c20, { roughness: 0.9 })

  const legL = new THREE.Group()
  legL.position.set(-0.115, 0.84, 0)
  const legLm = box(0.16, 0.82, 0.2, pantsMat)
  legLm.position.y = -0.41
  legL.add(legLm)
  const bootL = box(0.19, 0.16, 0.28, shoeMat)
  bootL.position.set(0, -0.78, 0.04)
  legL.add(bootL)
  root.add(legL)

  const legR = legL.clone()
  legR.position.x = 0.115
  root.add(legR)

  const torso = new THREE.Group()
  torso.position.y = 1.12
  const chest = box(0.46, 0.6, 0.28, jacketMat)
  torso.add(chest)
  const collar = box(0.34, 0.07, 0.3, darkMat)
  collar.position.y = 0.31
  torso.add(collar)
  const zipper = box(0.018, 0.5, 0.012, mat(0x0c0d10, { metalness: 0.25, roughness: 0.5 }))
  zipper.position.set(0, -0.02, 0.147)
  torso.add(zipper)
  root.add(torso)

  const armL = new THREE.Group()
  armL.position.set(-0.285, 1.36, 0)
  const upperL = box(0.13, 0.56, 0.16, jacketMat)
  upperL.position.y = -0.26
  armL.add(upperL)
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), skinMat)
  handL.position.y = -0.56
  armL.add(handL)
  root.add(armL)

  const armR = armL.clone()
  armR.position.x = 0.285
  root.add(armR)

  const head = new THREE.Group()
  head.position.y = 1.59
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), skinMat)
  skull.scale.set(0.92, 1.08, 0.94)
  head.add(skull)
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), skinMat)
  jaw.position.set(0, -0.1, 0.02)
  jaw.scale.set(0.92, 0.72, 0.84)
  head.add(jaw)

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.07, 5), skinMat)
  nose.position.set(0, -0.015, 0.163)
  nose.rotation.x = Math.PI / 2
  head.add(nose)
  const eyeMat = mat(0x0b0b0c, { roughness: 0.4 })
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), eyeMat)
    eye.position.set(sx * 0.065, 0.025, 0.154)
    head.add(eye)
  }
  const browMat = mat(def.hair || 0x17130f, { roughness: 1 })
  const brow = box(0.16, 0.018, 0.02, browMat)
  brow.position.set(0, 0.075, 0.156)
  head.add(brow)

  if (def.hairStyle === 'long') {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat)
    hair.position.set(0, 0.045, -0.01)
    hair.scale.set(1.04, 1.02, 1.08)
    head.add(hair)
    const mane = box(0.3, 0.42, 0.12, hairMat)
    mane.position.set(0, -0.14, -0.15)
    head.add(mane)
  } else if (def.hairStyle === 'cap') {
    const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.185, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(0x1d2a30, { roughness: 1 }))
    capTop.position.y = 0.045
    head.add(capTop)
    const brim = box(0.28, 0.025, 0.17, mat(0x1d2a30, { roughness: 1 }))
    brim.position.set(0, 0.03, 0.15)
    head.add(brim)
  } else if (def.hairStyle === 'buzz') {
    const buzz = new THREE.Mesh(new THREE.SphereGeometry(0.173, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat)
    buzz.position.y = 0.035
    buzz.scale.set(1.01, 0.72, 1.01)
    head.add(buzz)
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.178, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat)
    hair.position.y = 0.035
    hair.scale.set(1.03, 0.88, 1.04)
    head.add(hair)
  }
  root.add(head)

  if (isPlayer) {
    const backpack = box(0.34, 0.4, 0.17, mat(0x20282a, { roughness: 0.95 }))
    backpack.position.set(0, 1.16, -0.22)
    root.add(backpack)
    const strapL = box(0.035, 0.46, 0.03, mat(0x171b1c))
    strapL.position.set(-0.16, 1.19, 0.15)
    root.add(strapL)
    const strapR = strapL.clone()
    strapR.position.x = 0.16
    root.add(strapR)

    const torchBody = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.22, 8), mat(0x15171a, { metalness: 0.5, roughness: 0.45 }))
    torchBody.rotation.x = Math.PI / 2
    torchBody.position.set(0.27, 1.08, 0.18)
    root.add(torchBody)
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.02, 8), mat(0xfff0c0, { emissive: 0xffdda0, emissiveIntensity: 2.4, roughness: 0.2 }))
    lens.rotation.x = Math.PI / 2
    lens.position.set(0.27, 1.08, 0.3)
    root.add(lens)
  }

  addShadowFlags(group)
  group.userData.parts = { root, torso, head, legL, legR, armL, armR, legLm, legRm: legR.children[0] }
  group.userData.height = def.height || 1.75
  group.userData.animPhase = Math.random() * Math.PI * 2
  return group
}

export function animateCharacter(character, dt, speed, idle = false) {
  const p = character.userData.parts
  if (!p) return
  const phase = (character.userData.animPhase += dt * (2.6 + speed * 1.65))
  const walkAmp = Math.min(speed / 5.2, 1) * 0.78
  if (idle) {
    const t = performance.now() * 0.001
    p.torso.position.y = 1.12 + Math.sin(t * 1.4) * 0.008
    p.armL.rotation.x = Math.sin(t * 1.1) * 0.035
    p.armR.rotation.x = -Math.sin(t * 1.1) * 0.035
    p.legL.rotation.x *= 0.9
    p.legR.rotation.x *= 0.9
    p.head.rotation.y = Math.sin(t * 0.45) * 0.16
    return
  }
  p.legL.rotation.x = Math.sin(phase) * walkAmp
  p.legR.rotation.x = -Math.sin(phase) * walkAmp
  p.armL.rotation.x = -Math.sin(phase) * walkAmp * 0.85
  p.armR.rotation.x = Math.sin(phase) * walkAmp * 0.85
  p.armL.rotation.z = 0.04
  p.armR.rotation.z = -0.04
  p.torso.position.y = 1.12 + Math.abs(Math.sin(phase)) * 0.035 * walkAmp
  p.torso.rotation.z = Math.sin(phase) * 0.02 * walkAmp
  p.head.rotation.y *= 0.85
}

// ---------------------------------------------------------------- mask texture
function makeMaskTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 320
  const g = c.getContext('2d')
  g.clearRect(0, 0, 256, 320)

  const grd = g.createLinearGradient(40, 14, 220, 310)
  grd.addColorStop(0, '#f5f0e4')
  grd.addColorStop(0.36, '#e0d9cb')
  grd.addColorStop(0.72, '#b4aea0')
  grd.addColorStop(1, '#777267')

  g.beginPath()
  g.moveTo(128, 10)
  g.bezierCurveTo(184, 10, 224, 42, 226, 108)
  g.bezierCurveTo(228, 164, 207, 218, 172, 264)
  g.bezierCurveTo(156, 287, 142, 303, 128, 312)
  g.bezierCurveTo(114, 303, 100, 287, 84, 264)
  g.bezierCurveTo(49, 218, 28, 164, 30, 108)
  g.bezierCurveTo(32, 42, 72, 10, 128, 10)
  g.closePath()
  g.fillStyle = grd
  g.fill()

  g.save()
  g.clip()
  const light = g.createRadialGradient(95, 70, 10, 128, 150, 190)
  light.addColorStop(0, 'rgba(255,255,255,.55)')
  light.addColorStop(0.35, 'rgba(255,255,255,.1)')
  light.addColorStop(1, 'rgba(0,0,0,.36)')
  g.fillStyle = light
  g.fillRect(0, 0, 256, 320)
  const shadeL = g.createLinearGradient(0, 0, 70, 0)
  shadeL.addColorStop(0, 'rgba(0,0,0,.3)')
  shadeL.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = shadeL
  g.fillRect(0, 0, 80, 320)
  const shadeR = g.createLinearGradient(256, 0, 190, 0)
  shadeR.addColorStop(0, 'rgba(0,0,0,.38)')
  shadeR.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = shadeR
  g.fillRect(176, 0, 80, 320)

  for (let i = 0; i < 1200; i++) {
    g.fillStyle = `rgba(${30 + Math.random() * 40},${30 + Math.random() * 38},${28 + Math.random() * 34},${Math.random() * 0.08})`
    g.fillRect(Math.random() * 256, Math.random() * 320, 1.4, 1.4)
  }
  g.restore()

  // eye sockets
  const eye = (mirror) => {
    g.save()
    if (mirror) { g.translate(256, 0); g.scale(-1, 1) }
    g.beginPath()
    g.moveTo(62, 116)
    g.bezierCurveTo(76, 100, 108, 101, 116, 120)
    g.bezierCurveTo(107, 139, 76, 147, 60, 132)
    g.bezierCurveTo(55, 126, 57, 120, 62, 116)
    g.closePath()
    const eg = g.createRadialGradient(92, 120, 2, 92, 120, 30)
    eg.addColorStop(0, '#050505')
    eg.addColorStop(0.65, '#0a0a0b')
    eg.addColorStop(1, '#28241e')
    g.fillStyle = eg
    g.fill()
    g.strokeStyle = 'rgba(70,64,54,.5)'
    g.lineWidth = 2
    g.stroke()
    g.beginPath()
    g.arc(86, 118, 2.6, 0, Math.PI * 2)
    g.fillStyle = 'rgba(220,214,200,.45)'
    g.fill()
    g.restore()
  }
  eye(false)
  eye(true)

  // nose
  g.fillStyle = '#17130f'
  g.beginPath()
  g.moveTo(121, 165)
  g.bezierCurveTo(123, 174, 119, 181, 114, 184)
  g.bezierCurveTo(121, 186, 127, 180, 128, 171)
  g.closePath()
  g.fill()
  g.beginPath()
  g.moveTo(135, 165)
  g.bezierCurveTo(133, 174, 137, 181, 142, 184)
  g.bezierCurveTo(135, 186, 129, 180, 128, 171)
  g.closePath()
  g.fill()

  // mouth
  g.beginPath()
  g.moveTo(78, 210)
  g.bezierCurveTo(101, 198, 155, 198, 178, 210)
  g.bezierCurveTo(172, 249, 154, 282, 128, 292)
  g.bezierCurveTo(102, 282, 84, 249, 78, 210)
  g.closePath()
  g.fillStyle = '#08080a'
  g.fill()
  g.strokeStyle = 'rgba(62,57,49,.7)'
  g.lineWidth = 3
  g.stroke()

  g.save()
  g.beginPath()
  g.moveTo(78, 210)
  g.bezierCurveTo(101, 198, 155, 198, 178, 210)
  g.bezierCurveTo(172, 249, 154, 282, 128, 292)
  g.bezierCurveTo(102, 282, 84, 249, 78, 210)
  g.closePath()
  g.clip()
  g.fillStyle = 'rgba(190,182,166,.55)'
  for (let i = 0; i < 7; i++) {
    const x = 88 + i * 13
    g.beginPath()
    g.moveTo(x, 212)
    g.lineTo(x + 8, 212)
    g.lineTo(x + 4, 225)
    g.closePath()
    g.fill()
  }
  g.fillStyle = 'rgba(190,182,166,.24)'
  g.fillRect(82, 272, 94, 5)
  g.restore()

  // cracks
  g.strokeStyle = 'rgba(74,68,58,.5)'
  g.lineWidth = 1
  const cracks = [
    [[104, 143], [98, 166], [104, 184], [98, 200]],
    [[154, 141], [160, 162], [154, 180]],
    [[70, 235], [84, 246], [82, 264]],
    [[186, 244], [174, 258], [178, 272]],
    [[128, 298], [120, 286], [124, 278]],
  ]
  for (const crack of cracks) {
    g.beginPath()
    g.moveTo(crack[0][0], crack[0][1])
    for (let i = 1; i < crack.length; i++) g.lineTo(crack[i][0], crack[i][1])
    g.stroke()
  }

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

let maskTextureCache = null
export function maskTexture() {
  if (!maskTextureCache) maskTextureCache = makeMaskTexture()
  return maskTextureCache
}

export function createMaskPlane() {
  const geo = new THREE.PlaneGeometry(0.47, 0.59, 12, 12)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / 0.235
    const y = pos.getY(i) / 0.295
    const curve = (1 - x * x) * (1 - y * y) * 0.045
    pos.setZ(i, curve)
  }
  geo.computeVertexNormals()
  const material = new THREE.MeshStandardMaterial({
    map: maskTexture(),
    transparent: true,
    alphaTest: 0.22,
    roughness: 0.72,
    metalness: 0.02,
    emissive: 0xffffff,
    emissiveMap: maskTexture(),
    emissiveIntensity: 0.055,
    side: THREE.DoubleSide,
  })
  return new THREE.Mesh(geo, material)
}

export function createGhostface() {
  const group = new THREE.Group()
  const root = new THREE.Group()
  group.add(root)
  const black = mat(0x0a0a0c, { roughness: 0.94 })
  const black2 = mat(0x121216, { roughness: 0.9 })
  const skin = mat(0xd9d3c6, { roughness: 0.74 })

  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.52, 1.42, 9, 1, true), black)
  robe.position.y = 0.72
  root.add(robe)
  const robeBack = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 9, 1, true, 0, Math.PI * 2), black2)
  robeBack.position.set(0, 0.8, -0.05)
  robeBack.rotation.y = 0.2
  root.add(robeBack)

  const torso = box(0.56, 0.62, 0.34, black2)
  torso.position.y = 1.27
  root.add(torso)

  const armL = new THREE.Group()
  armL.position.set(-0.35, 1.48, 0)
  const upperL = box(0.15, 0.62, 0.19, black)
  upperL.position.y = -0.29
  armL.add(upperL)
  const gloveL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), black)
  gloveL.position.y = -0.62
  armL.add(gloveL)
  root.add(armL)

  const armR = armL.clone()
  armR.position.x = 0.35
  root.add(armR)

  const knife = new THREE.Group()
  const blade = box(0.055, 0.42, 0.018, mat(0xc7c9c9, { metalness: 0.85, roughness: 0.25, emissive: 0x1c1f22, emissiveIntensity: 0.4 }))
  blade.position.y = -0.24
  knife.add(blade)
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), blade.material)
  tip.position.y = -0.52
  tip.rotation.y = Math.PI / 4
  knife.add(tip)
  const guard = box(0.16, 0.035, 0.06, mat(0x33343a, { metalness: 0.6, roughness: 0.4 }))
  knife.add(guard)
  const grip = box(0.07, 0.18, 0.05, mat(0x191a1e))
  grip.position.y = 0.1
  knife.add(grip)
  knife.position.set(0, -0.6, 0.06)
  knife.rotation.x = Math.PI * 0.12
  armR.add(knife)

  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.275, 14, 12), black)
  hood.scale.set(1.02, 1.12, 1.02)
  hood.position.set(0, 1.7, -0.012)
  root.add(hood)
  const hoodPeak = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.32, 9), black2)
  hoodPeak.position.set(0, 1.9, -0.1)
  hoodPeak.rotation.x = -0.28
  root.add(hoodPeak)

  const mask = createMaskPlane()
  mask.position.set(0, 1.69, 0.195)
  mask.rotation.x = -0.02
  root.add(mask)

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.16, 8), black)
  neck.position.y = 1.51
  root.add(neck)

  addShadowFlags(group)
  group.userData.parts = { root, torso, armL, armR, knife, mask, hood, robe, robeBack, head: hood }
  group.userData.animPhase = 0
  group.userData.height = 1.95
  return group
}

export function animateGhost(ghost, dt, speed, mode = 'walk') {
  const p = ghost.userData.parts
  if (!p) return
  const phase = (ghost.userData.animPhase += dt * (2.5 + speed * 1.6))
  const amp = Math.min(speed / 5, 1)
  if (mode === 'idle') {
    const t = performance.now() * 0.001
    p.root.position.y = Math.sin(t * 0.9) * 0.012
    p.armL.rotation.x = Math.sin(t * 0.7) * 0.05
    p.armR.rotation.x = Math.sin(t * 0.7 + 0.6) * 0.05
    p.mask.rotation.z = Math.sin(t * 0.6) * 0.018
    return
  }
  p.root.position.y = Math.abs(Math.sin(phase)) * 0.035
  p.armL.rotation.x = -Math.sin(phase) * amp * 0.7
  p.armR.rotation.x = Math.sin(phase) * amp * 0.45 - 0.1
  p.armL.rotation.z = 0.12
  p.armR.rotation.z = -0.16
  p.robe.rotation.z = Math.sin(phase) * 0.04 * amp
  p.robeBack.rotation.z = -Math.sin(phase) * 0.055 * amp
  p.torso.rotation.z = Math.sin(phase) * 0.02 * amp
  p.mask.rotation.z = Math.sin(phase * 0.5) * 0.02
}

export function createTape() {
  const group = new THREE.Group()
  const body = box(0.36, 0.23, 0.065, mat(0x121317, { roughness: 0.6, metalness: 0.1 }))
  group.add(body)
  const label = box(0.29, 0.13, 0.01, mat(0xd8d1c0, { roughness: 0.8 }))
  label.position.set(0, 0.015, 0.038)
  group.add(label)
  const line1 = box(0.23, 0.012, 0.004, mat(0x4b1418))
  line1.position.set(0, 0.04, 0.045)
  group.add(line1)
  const line2 = box(0.16, 0.008, 0.004, mat(0x272729))
  line2.position.set(-0.03, 0.012, 0.045)
  group.add(line2)
  for (const sx of [-1, 1]) {
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.008, 12), mat(0x2e3034, { metalness: 0.3, roughness: 0.5 }))
    reel.rotation.x = Math.PI / 2
    reel.position.set(sx * 0.085, -0.01, 0.037)
    group.add(reel)
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8), mat(0x0a0a0c))
    hub.rotation.x = Math.PI / 2
    hub.position.set(sx * 0.085, -0.01, 0.041)
    group.add(hub)
  }
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), mat(0xff2a33, { emissive: 0xff1a28, emissiveIntensity: 2.8 }))
  led.position.set(0.14, 0.075, 0.038)
  group.add(led)
  addShadowFlags(group)
  group.userData.led = led
  return group
}

export function createGlowSprite(color = 0xffe0a0, size = 1.6, opacity = 0.5) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(64, 64, 2, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.22, 'rgba(255,255,255,.5)')
  grd.addColorStop(0.6, 'rgba(255,255,255,.1)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false,
  }))
  sprite.scale.set(size, size, 1)
  return sprite
}

export function createBody(def) {
  const group = new THREE.Group()
  const jacket = mat(def.jacket, { roughness: 0.95 })
  const skin = mat(def.skin, { roughness: 0.8 })
  const pants = mat(0x1e2024, { roughness: 0.95 })

  const torso = box(0.52, 0.24, 0.72, jacket)
  torso.position.set(0, 0.16, 0)
  group.add(torso)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skin)
  head.position.set(0.06, 0.23, -0.52)
  head.scale.set(1, 0.9, 1.05)
  group.add(head)
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(def.hair, { roughness: 1 }))
  hair.position.set(0.06, 0.28, -0.53)
  group.add(hair)
  for (const sx of [-1, 1]) {
    const leg = box(0.17, 0.2, 0.62, pants)
    leg.position.set(sx * 0.15, 0.12, 0.56)
    leg.rotation.x = -0.14 + Math.random() * 0.12
    leg.rotation.z = sx * 0.1
    group.add(leg)
    const arm = box(0.14, 0.17, 0.5, jacket)
    arm.position.set(sx * 0.34, 0.14, -0.1)
    arm.rotation.y = sx * 0.32
    group.add(arm)
  }

  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 20),
    new THREE.MeshBasicMaterial({ color: 0x3b0509, transparent: true, opacity: 0.82, depthWrite: false })
  )
  pool.rotation.x = -Math.PI / 2
  pool.position.set(0.02, 0.025, -0.05)
  pool.scale.set(1, 0.7, 1)
  group.add(pool)
  addShadowFlags(group)
  return group
}

// ---------------------------------------------------------------- portraits
export function createPortrait(def) {
  const c = document.createElement('canvas')
  c.width = 320
  c.height = 400
  const g = c.getContext('2d')
  const rnd = (a, b) => a + Math.random() * (b - a)

  const bg = g.createRadialGradient(120, 120, 20, 160, 190, 300)
  bg.addColorStop(0, '#2a2b30')
  bg.addColorStop(0.55, '#121318')
  bg.addColorStop(1, '#060709')
  g.fillStyle = bg
  g.fillRect(0, 0, 320, 400)

  g.fillStyle = '#0e0f13'
  g.fillRect(0, 300, 320, 100)

  g.save()
  g.filter = 'blur(18px)'
  g.fillStyle = 'rgba(0,0,0,.6)'
  g.beginPath()
  g.ellipse(160, 360, 150, 70, 0, 0, Math.PI * 2)
  g.fill()
  g.restore()

  // shoulders / jacket
  g.fillStyle = def.accent
  g.beginPath()
  g.moveTo(30, 400)
  g.bezierCurveTo(36, 330, 84, 300, 126, 292)
  g.lineTo(194, 292)
  g.bezierCurveTo(236, 300, 284, 330, 290, 400)
  g.closePath()
  g.fill()
  const shoulderLight = g.createLinearGradient(30, 0, 290, 0)
  shoulderLight.addColorStop(0, 'rgba(0,0,0,.45)')
  shoulderLight.addColorStop(0.34, 'rgba(255,255,255,.16)')
  shoulderLight.addColorStop(1, 'rgba(0,0,0,.55)')
  g.fillStyle = shoulderLight
  g.beginPath()
  g.moveTo(30, 400)
  g.bezierCurveTo(36, 330, 84, 300, 126, 292)
  g.lineTo(194, 292)
  g.bezierCurveTo(236, 300, 284, 330, 290, 400)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(0,0,0,.5)'
  g.beginPath()
  g.moveTo(160, 310)
  g.lineTo(160, 400)
  g.stroke()

  // neck
  const skin = '#' + new THREE.Color(def.skin).getHexString()
  g.fillStyle = skin
  g.fillRect(138, 260, 44, 58)
  g.fillStyle = 'rgba(0,0,0,.32)'
  g.fillRect(138, 260, 44, 20)

  // head
  const hx = 160, hy = 188, rx = 62, ry = 78
  const face = g.createRadialGradient(hx - 22, hy - 26, 8, hx, hy, 100)
  face.addColorStop(0, '#f0cfb3')
  face.addColorStop(0.45, skin)
  face.addColorStop(1, '#4a3124')
  g.fillStyle = face
  g.beginPath()
  g.ellipse(hx, hy, rx, ry, 0, 0, Math.PI * 2)
  g.fill()
  g.save()
  g.clip()
  const sideShadow = g.createLinearGradient(90, 0, 230, 0)
  sideShadow.addColorStop(0, 'rgba(0,0,0,.28)')
  sideShadow.addColorStop(0.35, 'rgba(0,0,0,0)')
  sideShadow.addColorStop(0.78, 'rgba(0,0,0,.04)')
  sideShadow.addColorStop(1, 'rgba(0,0,0,.55)')
  g.fillStyle = sideShadow
  g.fillRect(80, 80, 160, 220)
  g.restore()

  // ears
  g.fillStyle = skin
  for (const sx of [-1, 1]) {
    g.beginPath()
    g.ellipse(hx + sx * 62, hy, 10, 18, 0, 0, Math.PI * 2)
    g.fill()
  }

  // hair
  g.fillStyle = '#' + new THREE.Color(def.hair).getHexString()
  if (def.hairStyle === 'long') {
    g.beginPath()
    g.moveTo(92, 210)
    g.bezierCurveTo(78, 170, 88, 100, 126, 82)
    g.bezierCurveTo(162, 64, 208, 78, 224, 112)
    g.bezierCurveTo(238, 142, 232, 190, 224, 240)
    g.lineTo(206, 250)
    g.bezierCurveTo(218, 190, 214, 140, 196, 118)
    g.bezierCurveTo(170, 136, 128, 142, 104, 132)
    g.bezierCurveTo(98, 178, 102, 218, 110, 258)
    g.lineTo(92, 250)
    g.closePath()
    g.fill()
  } else if (def.hairStyle === 'cap') {
    g.beginPath()
    g.moveTo(94, 150)
    g.bezierCurveTo(96, 100, 136, 76, 170, 82)
    g.bezierCurveTo(208, 88, 228, 118, 226, 156)
    g.lineTo(212, 152)
    g.bezierCurveTo(202, 124, 170, 112, 130, 126)
    g.bezierCurveTo(112, 132, 101, 142, 94, 150)
    g.closePath()
    g.fill()
    g.fillStyle = '#1c2b32'
    g.beginPath()
    g.ellipse(166, 116, 70, 36, -0.08, Math.PI, Math.PI * 2)
    g.fill()
    g.fillRect(96, 112, 140, 14)
    g.beginPath()
    g.ellipse(188, 128, 46, 12, 0.02, 0, Math.PI * 2)
    g.fill()
  } else {
    g.beginPath()
    g.ellipse(160, 122, 64, 38, 0, Math.PI, Math.PI * 2)
    g.fill()
    g.fillRect(96, 122, 128, 14)
    // beard
    g.fillStyle = 'rgba(15,12,10,.65)'
    g.beginPath()
    g.ellipse(160, 242, 40, 24, 0, 0, Math.PI)
    g.fill()
  }

  // features
  g.fillStyle = '#14100d'
  for (const sx of [-1, 1]) {
    g.beginPath()
    g.ellipse(hx + sx * 23, hy - 4, 10, 5, sx * 0.12, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = 'rgba(235,224,205,.5)'
    g.beginPath()
    g.arc(hx + sx * 21 - 2, hy - 6, 1.6, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#14100d'
  }
  g.strokeStyle = 'rgba(60,38,28,.7)'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(hx - 8, hy + 6)
  g.lineTo(hx - 14, hy + 24)
  g.lineTo(hx - 6, hy + 26)
  g.stroke()
  g.strokeStyle = 'rgba(40,20,18,.72)'
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(hx - 18, hy + 46)
  g.bezierCurveTo(hx - 5, hy + 52, hx + 8, hy + 52, hx + 20, hy + 45)
  g.stroke()
  g.strokeStyle = 'rgba(255,230,210,.16)'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(hx - 12, hy + 47)
  g.bezierCurveTo(hx - 2, hy + 51, hx + 8, hy + 51, hx + 16, hy + 47)
  g.stroke()

  if (def.mark === 'tatuaje') {
    g.strokeStyle = 'rgba(31,49,58,.8)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(136, 268)
    g.bezierCurveTo(146, 276, 158, 272, 168, 264)
    g.bezierCurveTo(174, 276, 184, 276, 190, 268)
    g.stroke()
  }

  // photo texture
  g.fillStyle = 'rgba(233,227,213,.035)'
  for (let i = 0; i < 380; i++) {
    g.fillRect(rnd(0, 320), rnd(0, 400), rnd(0.5, 1.6), rnd(0.5, 1.6))
  }
  for (let i = 0; i < 3; i++) {
    g.strokeStyle = 'rgba(255,255,255,.025)'
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(rnd(0, 320), rnd(0, 400))
    g.lineTo(rnd(0, 320), rnd(0, 400))
    g.stroke()
  }
  const vig = g.createRadialGradient(160, 200, 110, 160, 200, 260)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,.85)')
  g.fillStyle = vig
  g.fillRect(0, 0, 320, 400)

  // scanlines
  g.fillStyle = 'rgba(0,0,0,.16)'
  for (let y = 0; y < 400; y += 3) g.fillRect(0, y, 320, 1)

  return c.toDataURL('image/jpeg', 0.86)
}
