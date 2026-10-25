const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142],
]

class MinHeap {
  constructor() {
    this.items = []
    this.priorities = []
  }
  get size() { return this.items.length }
  push(item, priority) {
    const a = this.items, p = this.priorities
    a.push(item); p.push(priority)
    let i = a.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (p[parent] <= p[i]) break
      ;[a[parent], a[i]] = [a[i], a[parent]]
      ;[p[parent], p[i]] = [p[i], p[parent]]
      i = parent
    }
  }
  pop() {
    const a = this.items, p = this.priorities
    const top = a[0]
    const lastItem = a.pop(), lastPriority = p.pop()
    if (a.length) {
      a[0] = lastItem; p[0] = lastPriority
      let i = 0
      for (;;) {
        const l = i * 2 + 1, r = l + 1
        let best = i
        if (l < a.length && p[l] < p[best]) best = l
        if (r < a.length && p[r] < p[best]) best = r
        if (best === i) break
        ;[a[best], a[i]] = [a[i], a[best]]
        ;[p[best], p[i]] = [p[i], p[best]]
        i = best
      }
    }
    return top
  }
}

export class NavGrid {
  constructor({ min = -44, max = 44, cell = 1, colliders = [] } = {}) {
    this.min = min
    this.max = max
    this.cell = cell
    this.cols = Math.ceil((max - min) / cell)
    this.colliders = colliders
    this.blocked = new Uint8Array(this.cols * this.cols)
    this.build()
  }

  build() {
    const { cols, min, cell, colliders } = this
    for (let iz = 0; iz < cols; iz++) {
      for (let ix = 0; ix < cols; ix++) {
        const x = min + (ix + 0.5) * cell
        const z = min + (iz + 0.5) * cell
        let hit = 0
        outer: for (const c of colliders) {
          if (c.type === 'circle') {
            if (c.nav === false) continue
            const dx = x - c.x, dz = z - c.z
            const rr = c.r + 0.45
            if (dx * dx + dz * dz < rr * rr) { hit = 1; break outer }
          } else {
            if (c.nav === false) continue
            if (x > c.minX - 0.45 && x < c.maxX + 0.45 && z > c.minZ - 0.45 && z < c.maxZ + 0.45) { hit = 1; break outer }
          }
        }
        this.blocked[iz * cols + ix] = hit
      }
    }
  }

  index(ix, iz) { return iz * this.cols + ix }
  inBounds(ix, iz) { return ix >= 0 && iz >= 0 && ix < this.cols && iz < this.cols }
  isBlocked(ix, iz) { return !this.inBounds(ix, iz) || this.blocked[this.index(ix, iz)] === 1 }
  toCell(x, z) {
    return {
      ix: Math.max(0, Math.min(this.cols - 1, Math.floor((x - this.min) / this.cell))),
      iz: Math.max(0, Math.min(this.cols - 1, Math.floor((z - this.min) / this.cell))),
    }
  }
  toWorld(ix, iz) {
    return { x: this.min + (ix + 0.5) * this.cell, z: this.min + (iz + 0.5) * this.cell }
  }

  nearestWalkable(ix, iz, radius = 7) {
    if (!this.isBlocked(ix, iz)) return { ix, iz }
    for (let r = 1; r <= radius; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue
          const nx = ix + dx, nz = iz + dz
          if (!this.isBlocked(nx, nz)) return { ix: nx, iz: nz }
        }
      }
    }
    return null
  }

  findPath(start, target) {
    const sCell = this.toCell(start.x, start.z)
    const tCell = this.toCell(target.x, target.z)
    const startCell = this.nearestWalkable(sCell.ix, sCell.iz)
    const goalCell = this.nearestWalkable(tCell.ix, tCell.iz)
    if (!startCell || !goalCell) return null
    const cols = this.cols
    const startIdx = this.index(startCell.ix, startCell.iz)
    const goalIdx = this.index(goalCell.ix, goalCell.iz)
    if (startIdx === goalIdx) return [{ x: target.x, z: target.z }]

    const gScore = new Float32Array(cols * cols).fill(Infinity)
    const came = new Int32Array(cols * cols).fill(-1)
    const closed = new Uint8Array(cols * cols)
    const open = new MinHeap()
    const gx = goalCell.ix, gz = goalCell.iz
    const heur = (ix, iz) => {
      const dx = Math.abs(ix - gx), dz = Math.abs(iz - gz)
      return (dx + dz) + (1.4142 - 2) * Math.min(dx, dz)
    }
    gScore[startIdx] = 0
    open.push(startIdx, heur(startCell.ix, startCell.iz))
    let found = false
    let guard = 0
    while (open.size && guard++ < 20000) {
      const cur = open.pop()
      if (cur === goalIdx) { found = true; break }
      if (closed[cur]) continue
      closed[cur] = 1
      const cx = cur % cols, cz = (cur / cols) | 0
      for (const [dx, dz, cost] of DIRS) {
        const nx = cx + dx, nz = cz + dz
        if (this.isBlocked(nx, nz)) continue
        if (dx && dz) {
          if (this.isBlocked(cx + dx, cz) || this.isBlocked(cx, cz + dz)) continue
        }
        const ni = this.index(nx, nz)
        if (closed[ni]) continue
        const ng = gScore[cur] + cost
        if (ng < gScore[ni]) {
          gScore[ni] = ng
          came[ni] = cur
          open.push(ni, ng + heur(nx, nz))
        }
      }
    }
    if (!found) return null
    const cells = []
    let cur = goalIdx
    let safety = 0
    while (cur !== -1 && safety++ < 5000) {
      const ix = cur % cols, iz = (cur / cols) | 0
      const w = this.toWorld(ix, iz)
      cells.push({ x: w.x, z: w.z })
      if (cur === startIdx) break
      cur = came[cur]
    }
    cells.reverse()
    if (cells.length) cells[cells.length - 1] = { x: target.x, z: target.z }
    return this.smooth(cells)
  }

  lineClear(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z
    const dist = Math.hypot(dx, dz)
    const steps = Math.max(1, Math.ceil(dist / 0.3))
    for (let i = 1; i < steps; i++) {
      const t = i / steps
      const x = a.x + dx * t, z = a.z + dz * t
      const c = this.toCell(x, z)
      if (this.isBlocked(c.ix, c.iz)) return false
    }
    return true
  }

  smooth(cells) {
    if (cells.length <= 2) return cells
    const out = [cells[0]]
    let i = 0
    while (i < cells.length - 1) {
      let j = cells.length - 1
      for (; j > i + 1; j--) {
        if (this.lineClear(cells[i], cells[j])) break
      }
      out.push(cells[j])
      i = j
    }
    return out
  }
}
