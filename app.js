function govParodyApp() {
  const WORDS = {
    buzz: [
      "inclusive", "resilient", "sustainable", "evidence-led", "place-based", "citizen-centric",
      "future-proof", "bilingual", "cross-sector", "net‑zero", "high-impact", "pan‑regional",
      "collaborative", "innovative", "value-for-money", "digital-first", "decarbonised", "data-driven",
      "place-making", "outcomes-focused", "co-produced", "welsh-first", "accessible", "scalable",
      "transparent", "participatory", "joined-up", "community-led", "fair", "green"
    ],
    strapTemplates: [
      "Delivering {a}, {b} and {c} for Wales.",
      "A {a} and {b} future, powered by {c}.",
      "Building {a} services with {b} approaches and {c} ambition.",
      "Towards {a} outcomes through {b} partnerships and {c} delivery.",
      "Putting {a} communities first with {b} action and {c} ideas."
    ]
  };

  const SECRET_KEY = "DRAIG-CYMRU-2025"; // simple obfuscation key

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function makeReference() {
    const prefix = "WGP-"; // Welsh Gov Parody
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}${year}-${rand}`;
  }

  function generateRaw() {
    const policyIndex = Math.floor(Math.random() * window.POLICIES.length);
    // pick 3 distinct buzzwords
    const pool = [...WORDS.buzz];
    const strapBuzz = [];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      strapBuzz.push(pool.splice(idx, 1)[0]);
    }
    const template = pick(WORDS.strapTemplates);
    const strapline = template
      .replace('{a}', strapBuzz[0])
      .replace('{b}', strapBuzz[1])
      .replace('{c}', strapBuzz[2]);
    return { policyIndex, strapBuzz, strapline };
  }

  function formatPolicy(raw) {
    const policy = window.POLICIES[raw.policyIndex] || { title: 'Policy', rationale: '' };
    return {
      title: policy.title,
      rationale: policy.rationale,
      strapline: raw.strapline,
      date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
      reference: makeReference()
    };
  }

  function xorBytes(bytes, key) {
    const out = new Uint8Array(bytes.length);
    const keyBytes = new TextEncoder().encode(key);
    for (let i = 0; i < bytes.length; i++) {
      out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return out;
  }

  function toBase64Url(bytes) {
    let str = '';
    for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    const b64 = btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return b64;
  }

  function fromBase64Url(b64url) {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 2 ? '==' : (b64.length % 4 === 3 ? '=' : '');
    const bin = atob(b64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function encodeState(raw) {
    const json = JSON.stringify({ policyIndex: raw.policyIndex, strapBuzz: raw.strapBuzz, strapline: raw.strapline });
    const bytes = new TextEncoder().encode(json);
    const salted = xorBytes(bytes, SECRET_KEY);
    return toBase64Url(salted);
  }

  function decodeState(token) {
    try {
      const bytes = fromBase64Url(token);
      const unsalted = xorBytes(bytes, SECRET_KEY);
      const json = new TextDecoder().decode(unsalted);
      const raw = JSON.parse(json);
      // basic shape check
      if (!raw || typeof raw.policyIndex !== 'number' || !Array.isArray(raw.strapBuzz) || !raw.strapline) return null;
      return raw;
    } catch(_) {
      return null;
    }
  }

  return {
    policy: { title: '', rationale: '', strapline: '', date: '', reference: '' },
    raw: { policyIndex: 0, strapBuzz: [], strapline: '' },
    toastMessage: '',
    copiedUrl: false,

    init() {
      // If a token is present (query or hash), reconstruct the policy
      const url = new URL(window.location.href);
      const token = url.searchParams.get('r') || (url.hash.startsWith('#r=') ? url.hash.slice(3) : '');
      const decoded = token ? decodeState(token) : null;
      if (decoded) {
        this.raw = decoded;
        this.policy = formatPolicy(decoded);
      } else {
        this.regenerate();
      }
      // Clean up the hash for neatness if used
      if (url.hash.startsWith('#r=')) history.replaceState({}, document.title, url.pathname + url.search);
    },

    regenerate() {
      this.raw = generateRaw();
      this.policy = formatPolicy(this.raw);
      this.copiedUrl = false;
    },

    async share() {
      const token = encodeState(this.raw);
      // Use innocuous param name
      const url = new URL(window.location.href);
      url.searchParams.set('r', token);
      const shareUrl = url.toString();

      try {
        await navigator.clipboard.writeText(shareUrl);
        this.copiedUrl = true;
        this.showToast('Shareable link copied to clipboard');
      } catch (err) {
        this.copiedUrl = false;
        this.showToast('Unable to copy link. Please copy from address bar.');
      }
    },

    showToast(message) {
      this.toastMessage = message;
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => { this.toastMessage = ''; }, 1800);
    }
  };
}


