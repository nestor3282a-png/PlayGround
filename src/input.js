const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export class Input {
  constructor(canvas, { onAction, onPause, onRoster } = {}) {
    this.canvas = canvas
    this.onAction = onAction || (() => {})
    this.onPause = onPause || (() => {})
    this.onRoster = onRoster || (() => {})
    this.keys = new Set()
    this.move = { x: 0, y: 0 }
    this.lookX = 0
    this.lookY = 0
    this.touchSprint = false
    this.enabled = false
    this.lookPointer = null
    this.lastLook = { x: 0, y: 0 }
    this.joyPointer = null
    this.joyCenter = { x: 0, y: 0 }
    this.joyRadius = 44
    this.isTouch = false
    this._bindKeyboard()
    this._bindLook()
    this._bindJoystick()
    this._bindButtons()
    this._detectTouch()
  }

  _detectTouch() {
    const forced = new URLSearchParams(location.search).get('touch') === '1'
    this.isTouch = forced || navigator.maxTouchPoints > 0 || window.innerWidth < 820
    document.body.classList.toggle('touch', this.isTouch)
    window.addEventListener('resize', () => {
      const touch = navigator.maxTouchPoints > 0 || window.innerWidth < 820
      if (!forced && touch !== this.isTouch) {
        this.isTouch = touch
        document.body.classList.toggle('touch', touch)
      }
    })
  }

  setEnabled(on) {
    this.enabled = on
    if (!on) {
      this.move.x = 0
      this.move.y = 0
      this.touchSprint = false
      this.keys.clear()
      this._resetJoystick()
      const sprint = document.getElementById('sprintBtn')
      sprint?.classList.remove('on')
    }
  }

  _bindKeyboard() {
    const blocked = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'])
    window.addEventListener('keydown', (event) => {
      if (!this.enabled) return
      if (blocked.has(event.code)) event.preventDefault()
      if (event.repeat) return
      this.keys.add(event.code)
      if (event.code === 'KeyF') this.onAction('light')
      if (event.code === 'KeyE' || event.code === 'Space') this.onAction('interact')
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') this.onAction('sprintDown')
      if (event.code === 'Escape') this.onPause()
      if (event.code === 'Tab') this.onRoster()
    })
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code)
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') this.onAction('sprintUp')
    })
    window.addEventListener('blur', () => {
      this.keys.clear()
      this.touchSprint = false
    })
  }

  _bindLook() {
    const el = this.canvas
    el.addEventListener('pointerdown', (event) => {
      if (!this.enabled) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      if (this.lookPointer !== null) return
      this.lookPointer = event.pointerId
      this.lastLook.x = event.clientX
      this.lastLook.y = event.clientY
      try { el.setPointerCapture(event.pointerId) } catch {}
    })
    el.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.lookPointer) return
      const dx = event.clientX - this.lastLook.x
      const dy = event.clientY - this.lastLook.y
      this.lastLook.x = event.clientX
      this.lastLook.y = event.clientY
      this.lookX += dx
      this.lookY += dy
    })
    const end = (event) => {
      if (event.pointerId !== this.lookPointer) return
      this.lookPointer = null
    }
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
    el.addEventListener('contextmenu', event => event.preventDefault())
  }

  _bindJoystick() {
    const joy = document.getElementById('joystick')
    const knob = document.getElementById('joystickKnob')
    if (!joy || !knob) return
    this.joyEl = joy
    this.knobEl = knob

    const start = (event) => {
      if (!this.enabled) return
      event.preventDefault()
      event.stopPropagation()
      if (this.joyPointer !== null) return
      this.joyPointer = event.pointerId
      const rect = joy.getBoundingClientRect()
      this.joyCenter.x = rect.left + rect.width / 2
      this.joyCenter.y = rect.top + rect.height / 2
      this.joyRadius = rect.width * 0.36
      try { joy.setPointerCapture(event.pointerId) } catch {}
      this._joyMove(event)
    }
    const move = (event) => {
      if (event.pointerId !== this.joyPointer) return
      event.preventDefault()
      this._joyMove(event)
    }
    const end = (event) => {
      if (event.pointerId !== this.joyPointer) return
      this.joyPointer = null
      this._resetJoystick()
    }
    joy.addEventListener('pointerdown', start)
    joy.addEventListener('pointermove', move)
    joy.addEventListener('pointerup', end)
    joy.addEventListener('pointercancel', end)
    joy.addEventListener('lostpointercapture', end)
  }

  _joyMove(event) {
    const dx = event.clientX - this.joyCenter.x
    const dy = event.clientY - this.joyCenter.y
    const dist = Math.hypot(dx, dy)
    const max = this.joyRadius
    const nx = dist > max ? dx / dist : dx / max
    const ny = dist > max ? dy / dist : dy / max
    this.move.x = clamp(nx, -1, 1)
    this.move.y = clamp(-ny, -1, 1)
    if (this.knobEl) {
      this.knobEl.style.transform = `translate(${this.move.x * max}px, ${-this.move.y * max}px)`
    }
  }

  _resetJoystick() {
    this.move.x = 0
    this.move.y = 0
    if (this.knobEl) this.knobEl.style.transform = 'translate(0px, 0px)'
  }

  _bindButtons() {
    const sprint = document.getElementById('sprintBtn')
    const light = document.getElementById('lightBtn')
    const interact = document.getElementById('interactBtn')
    const stun = document.getElementById('stunBtn')

    const press = (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.touchSprint = true
      sprint.classList.add('on')
      this.onAction('sprintDown')
    }
    const release = (event) => {
      event.preventDefault()
      this.touchSprint = false
      sprint.classList.remove('on')
      this.onAction('sprintUp')
    }
    sprint.addEventListener('pointerdown', press)
    sprint.addEventListener('pointerup', release)
    sprint.addEventListener('pointercancel', release)
    sprint.addEventListener('pointerleave', (event) => {
      if (this.touchSprint && event.buttons === 0) release(event)
    })
    light.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.onAction('light')
    })
    interact.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.onAction('interact')
    })
    stun.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.onAction('stun')
    })
  }

  consumeLook() {
    const x = this.lookX
    const y = this.lookY
    this.lookX = 0
    this.lookY = 0
    return [x, y]
  }

  get movement() {
    let x = 0, y = 0
    if (this.enabled) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1
      x += this.move.x
      y += this.move.y
      const len = Math.hypot(x, y)
      if (len > 1) { x /= len; y /= len }
    }
    return { x, y }
  }

  get sprinting() {
    return this.enabled && (this.touchSprint || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'))
  }
}
