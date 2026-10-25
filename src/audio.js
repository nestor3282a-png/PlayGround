const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t

export class AudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.volume = 0.8
    this.muted = false
    this.ready = false
    this.tension = 0
    this.chase = false
    this._heartAcc = 0
    this._chaseAcc = 0
    this._broken = false
  }

  async init() {
    if (this._broken) return
    if (this.ctx) {
      try { await this.ctx.resume() } catch {}
      return
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) throw new Error('no webaudio')
      this.ctx = new Ctx({ latencyHint: 'interactive' })
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : this.volume
      this.master.connect(this.ctx.destination)
      this.noise = this._makeNoise(2.4)
      this._buildAmbience()
      this.ready = true
      if (this.ctx.state === 'suspended') await this.ctx.resume()
    } catch (error) {
      this._broken = true
      console.warn('Audio unavailable', error)
    }
  }

  _makeNoise(seconds) {
    const rate = this.ctx.sampleRate
    const buffer = this.ctx.createBuffer(1, Math.floor(rate * seconds), rate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      last = last * 0.72 + white * 0.28
      data[i] = last
    }
    return buffer
  }

  _noiseSource() {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    return src
  }

  _buildAmbience() {
    const ctx = this.ctx
    const now = ctx.currentTime
    this.ambient = ctx.createGain()
    this.ambient.gain.setValueAtTime(0.0001, now)
    this.ambient.gain.exponentialRampToValueAtTime(0.55, now + 3.5)
    this.ambient.connect(this.master)

    // wind
    this.windFilter = ctx.createBiquadFilter()
    this.windFilter.type = 'lowpass'
    this.windFilter.frequency.value = 420
    this.windFilter.Q.value = 0.7
    this.windGain = ctx.createGain()
    this.windGain.gain.value = 0.08
    const wind = this._noiseSource()
    wind.playbackRate.value = 0.55
    wind.connect(this.windFilter)
    this.windFilter.connect(this.windGain)
    this.windGain.connect(this.ambient)
    wind.start()
    const windLfo = ctx.createOscillator()
    windLfo.frequency.value = 0.085
    const windLfoGain = ctx.createGain()
    windLfoGain.gain.value = 0.035
    windLfo.connect(windLfoGain)
    windLfoGain.connect(this.windGain.gain)
    windLfo.start()

    // low drone
    this.droneFilter = ctx.createBiquadFilter()
    this.droneFilter.type = 'lowpass'
    this.droneFilter.frequency.value = 220
    this.droneFilter.Q.value = 1.4
    this.droneGain = ctx.createGain()
    this.droneGain.gain.value = 0.05
    this.droneFilter.connect(this.droneGain)
    this.droneGain.connect(this.ambient)
    this.drones = []
    for (const [freq, detune, type] of [[41.2, 0, 'sawtooth'], [55, 7, 'triangle'], [82.4, -5, 'sine']]) {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.value = freq
      osc.detune.value = detune
      osc.connect(this.droneFilter)
      osc.start()
      this.drones.push(osc)
    }
    const droneLfo = ctx.createOscillator()
    droneLfo.frequency.value = 0.06
    const droneLfoGain = ctx.createGain()
    droneLfoGain.gain.value = 90
    droneLfo.connect(droneLfoGain)
    droneLfoGain.connect(this.droneFilter.frequency)
    droneLfo.start()

    // high air shimmer
    this.shimmerGain = ctx.createGain()
    this.shimmerGain.gain.value = 0.006
    const shimmerFilter = ctx.createBiquadFilter()
    shimmerFilter.type = 'highpass'
    shimmerFilter.frequency.value = 6500
    const shimmer = this._noiseSource()
    shimmer.playbackRate.value = 0.2
    shimmer.connect(shimmerFilter)
    shimmerFilter.connect(this.shimmerGain)
    this.shimmerGain.connect(this.ambient)
    shimmer.start()
  }

  setVolume(value) {
    this.volume = clamp(value, 0, 1)
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime)
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05)
    }
  }

  setMuted(muted) {
    this.muted = muted
    this.setVolume(this.volume)
  }

  setTension(value) {
    this.tension = clamp(value, 0, 1)
    if (!this.ready) return
    const now = this.ctx.currentTime
    const t = this.tension
    this.droneGain.gain.setTargetAtTime(0.05 + t * 0.07, now, 0.35)
    this.droneFilter.frequency.setTargetAtTime(220 + t * 320, now, 0.35)
    this.windGain.gain.setTargetAtTime(0.08 + t * 0.05, now, 0.5)
  }

  setChase(on) {
    this.chase = on
    this._chaseAcc = 0
    if (on) this.chaseStart()
  }

  update(dt, proximity = 0) {
    if (!this.ready) return
    const prox = clamp(proximity, 0, 1)
    this.setTension(Math.max(prox, this.chase ? 0.55 : 0))
    const interval = this.chase ? lerp(0.62, 0.28, prox) : lerp(1.5, 0.4, prox)
    if (prox > 0.02 || this.chase) {
      this._heartAcc += dt
      if (this._heartAcc >= interval) {
        this._heartAcc = 0
        this._thump(this.chase ? 0.22 : 0.13, prox)
        const t = this.ctx.currentTime
        this._thumpAt(t + 0.17, (this.chase ? 0.15 : 0.08) * (0.6 + prox * 0.4), prox * 0.8)
      }
    } else {
      this._heartAcc = 0
    }
    if (this.chase) {
      this._chaseAcc += dt
      const tick = lerp(0.36, 0.24, prox)
      if (this._chaseAcc >= tick) {
        this._chaseAcc = 0
        this._chaseTick(prox)
      }
    }
  }

  _thump(gain = 0.16, prox = 0.5) {
    this._thumpAt(this.ctx.currentTime, gain, prox)
  }

  _thumpAt(time, gain, prox) {
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(68 - prox * 12, time)
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.16)
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), time + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.26)
    osc.connect(g)
    g.connect(this.master)
    osc.start(time)
    osc.stop(time + 0.3)
  }

  _chaseTick(prox) {
    const ctx = this.ctx
    const time = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 92 - prox * 16
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 180
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(0.05, time + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14)
    osc.connect(filter)
    filter.connect(g)
    g.connect(this.master)
    osc.start(time)
    osc.stop(time + 0.16)
  }

  _burst({ dur = 0.18, gain = 0.12, type = 'bandpass', freq = 800, q = 1, rate = 1, attack = 0.006 } = {}) {
    if (!this.ready) return
    const ctx = this.ctx
    const time = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    src.playbackRate.value = rate
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    filter.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur)
    src.connect(filter)
    filter.connect(g)
    g.connect(this.master)
    src.start(time, Math.random() * 1.5)
    src.stop(time + dur + 0.05)
  }

  _tone({ freq = 220, endFreq = null, dur = 0.4, gain = 0.1, type = 'sine', attack = 0.01, delay = 0 } = {}) {
    if (!this.ready) return
    const ctx = this.ctx
    const time = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, time)
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), time + dur)
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur)
    osc.connect(g)
    g.connect(this.master)
    osc.start(time)
    osc.stop(time + dur + 0.05)
  }

  footstep(running = false) {
    if (!this.ready) return
    this._burst({
      dur: running ? 0.14 : 0.18,
      gain: running ? 0.055 : 0.035,
      type: 'bandpass',
      freq: running ? 520 : 380,
      q: 1.4,
      rate: 0.8 + Math.random() * 0.3,
    })
  }

  ui() {
    if (!this.ready) return
    this._tone({ freq: 640, endFreq: 420, dur: 0.07, gain: 0.035, type: 'triangle' })
  }

  collect() {
    if (!this.ready) return
    this._tone({ freq: 196, endFreq: 196, dur: 1.1, gain: 0.06, type: 'sine' })
    this._tone({ freq: 293.66, dur: 1.4, gain: 0.04, type: 'sine', delay: 0.12 })
    this._tone({ freq: 392, dur: 1.8, gain: 0.022, type: 'sine', delay: 0.24 })
    this._burst({ dur: 1.2, gain: 0.02, type: 'highpass', freq: 3000 })
  }

  tapeStart() {
    if (!this.ready) return
    this._burst({ dur: 0.9, gain: 0.05, type: 'bandpass', freq: 2400, q: 0.7 })
    this._tone({ freq: 90, dur: 0.7, gain: 0.04, type: 'sawtooth' })
  }

  tapeReveal() {
    if (!this.ready) return
    this._tone({ freq: 60, endFreq: 38, dur: 1.6, gain: 0.13, type: 'sine' })
    this._burst({ dur: 1.1, gain: 0.04, type: 'lowpass', freq: 500, rate: 0.4 })
  }

  radioStatic(duration = 1.4) {
    if (!this.ready) return
    this._burst({ dur: duration, gain: 0.05, type: 'bandpass', freq: 1800, q: 0.5, rate: 1.4 })
  }

  stinger() {
    if (!this.ready) return
    this._burst({ dur: 0.7, gain: 0.16, type: 'highpass', freq: 900, rate: 0.7 })
    this._tone({ freq: 880, endFreq: 110, dur: 0.9, gain: 0.05, type: 'sawtooth' })
    this._tone({ freq: 60, endFreq: 30, dur: 1.2, gain: 0.2, type: 'sine' })
  }

  scream() {
    if (!this.ready) return
    const ctx = this.ctx
    const time = ctx.currentTime
    for (const [freq, end, type, gain] of [[1240, 240, 'sawtooth', 0.055], [1660, 380, 'square', 0.022], [310, 120, 'sawtooth', 0.04]]) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 1100
      filter.Q.value = 1.2
      osc.type = type
      osc.frequency.setValueAtTime(freq, time)
      osc.frequency.exponentialRampToValueAtTime(end, time + 1.1)
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 17 + Math.random() * 8
      lfoGain.gain.value = 70
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfo.start(time)
      lfo.stop(time + 1.2)
      g.gain.setValueAtTime(0.0001, time)
      g.gain.exponentialRampToValueAtTime(gain, time + 0.05)
      g.gain.exponentialRampToValueAtTime(0.0001, time + 1.2)
      osc.connect(filter)
      filter.connect(g)
      g.connect(this.master)
      osc.start(time)
      osc.stop(time + 1.25)
    }
    this._burst({ dur: 1.1, gain: 0.07, type: 'bandpass', freq: 1600, q: 0.8, rate: 1.1 })
  }

  flash() {
    if (!this.ready) return
    this._burst({ dur: 0.35, gain: 0.08, type: 'highpass', freq: 2500 })
    this._tone({ freq: 1600, endFreq: 300, dur: 0.45, gain: 0.045, type: 'square' })
  }

  stunHit() {
    if (!this.ready) return
    this._tone({ freq: 1800, endFreq: 120, dur: 1.1, gain: 0.06, type: 'sawtooth' })
    this._tone({ freq: 90, endFreq: 40, dur: 0.9, gain: 0.18, type: 'sine' })
    this._burst({ dur: 0.7, gain: 0.08, type: 'bandpass', freq: 900 })
  }

  chaseStart() {
    if (!this.ready) return
    this._tone({ freq: 55, endFreq: 42, dur: 2.4, gain: 0.16, type: 'sawtooth' })
    this._tone({ freq: 220, endFreq: 180, dur: 1.6, gain: 0.04, type: 'square' })
    this._burst({ dur: 1.2, gain: 0.09, type: 'highpass', freq: 1400 })
  }

  win() {
    if (!this.ready) return
    this._tone({ freq: 110, dur: 2.4, gain: 0.08, type: 'sine' })
    this._tone({ freq: 138.6, dur: 2.8, gain: 0.05, type: 'sine', delay: 0.2 })
    this._tone({ freq: 164.8, dur: 3.2, gain: 0.04, type: 'sine', delay: 0.45 })
    this._burst({ dur: 2.5, gain: 0.02, type: 'highpass', freq: 2800 })
  }

  jumpscare() {
    if (!this.ready) return
    this.scream()
    this._tone({ freq: 70, endFreq: 28, dur: 1.6, gain: 0.32, type: 'sine' })
    this._burst({ dur: 1.4, gain: 0.22, type: 'lowpass', freq: 1400, rate: 1.6 })
    this._tone({ freq: 1900, endFreq: 900, dur: 0.7, gain: 0.05, type: 'square' })
  }

  doorCreak() {
    if (!this.ready) return
    this._burst({ dur: 0.9, gain: 0.025, type: 'bandpass', freq: 340, q: 8, rate: 0.35 })
  }

  whisper() {
    if (!this.ready) return
    this._burst({ dur: 1.5, gain: 0.03, type: 'bandpass', freq: 950, q: 3, rate: 0.45 })
  }
}
