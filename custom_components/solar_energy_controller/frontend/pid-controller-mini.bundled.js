// lit-core.min.js
var t = window;
var i = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var e = /* @__PURE__ */ new WeakMap();
var o = class {
  constructor(t2, i2, e2) {
    if (this._$cssResult$ = true, e2 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t2, this.t = i2;
  }
  get styleSheet() {
    let t2 = this.i;
    const s2 = this.t;
    if (i && void 0 === t2) {
      const i2 = void 0 !== s2 && 1 === s2.length;
      i2 && (t2 = e.get(s2)), void 0 === t2 && ((this.i = t2 = new CSSStyleSheet()).replaceSync(this.cssText), i2 && e.set(s2, t2));
    }
    return t2;
  }
  toString() {
    return this.cssText;
  }
};
var n = (t2) => new o("string" == typeof t2 ? t2 : t2 + "", void 0, s);
var r = (t2, ...i2) => {
  const e2 = 1 === t2.length ? t2[0] : i2.reduce(((i3, s2, e3) => i3 + ((t3) => {
    if (true === t3._$cssResult$) return t3.cssText;
    if ("number" == typeof t3) return t3;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t3 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s2) + t2[e3 + 1]), t2[0]);
  return new o(e2, t2, s);
};
var h = (s2, e2) => {
  i ? s2.adoptedStyleSheets = e2.map(((t2) => t2 instanceof CSSStyleSheet ? t2 : t2.styleSheet)) : e2.forEach(((i2) => {
    const e3 = document.createElement("style"), o2 = t.litNonce;
    void 0 !== o2 && e3.setAttribute("nonce", o2), e3.textContent = i2.cssText, s2.appendChild(e3);
  }));
};
var l = i ? (t2) => t2 : (t2) => t2 instanceof CSSStyleSheet ? ((t3) => {
  let i2 = "";
  for (const s2 of t3.cssRules) i2 += s2.cssText;
  return n(i2);
})(t2) : t2;
var a;
var u = window;
var c = u.trustedTypes;
var d = c ? c.emptyScript : "";
var v = u.reactiveElementPolyfillSupport;
var p = { toAttribute(t2, i2) {
  switch (i2) {
    case Boolean:
      t2 = t2 ? d : null;
      break;
    case Object:
    case Array:
      t2 = null == t2 ? t2 : JSON.stringify(t2);
  }
  return t2;
}, fromAttribute(t2, i2) {
  let s2 = t2;
  switch (i2) {
    case Boolean:
      s2 = null !== t2;
      break;
    case Number:
      s2 = null === t2 ? null : Number(t2);
      break;
    case Object:
    case Array:
      try {
        s2 = JSON.parse(t2);
      } catch (t3) {
        s2 = null;
      }
  }
  return s2;
} };
var f = (t2, i2) => i2 !== t2 && (i2 == i2 || t2 == t2);
var m = { attribute: true, type: String, converter: p, reflect: false, hasChanged: f };
var _ = "finalized";
var y = class extends HTMLElement {
  constructor() {
    super(), this.o = /* @__PURE__ */ new Map(), this.isUpdatePending = false, this.hasUpdated = false, this.l = null, this.u();
  }
  static addInitializer(t2) {
    var i2;
    this.finalize(), (null !== (i2 = this.v) && void 0 !== i2 ? i2 : this.v = []).push(t2);
  }
  static get observedAttributes() {
    this.finalize();
    const t2 = [];
    return this.elementProperties.forEach(((i2, s2) => {
      const e2 = this.p(s2, i2);
      void 0 !== e2 && (this.m.set(e2, s2), t2.push(e2));
    })), t2;
  }
  static createProperty(t2, i2 = m) {
    if (i2.state && (i2.attribute = false), this.finalize(), this.elementProperties.set(t2, i2), !i2.noAccessor && !this.prototype.hasOwnProperty(t2)) {
      const s2 = "symbol" == typeof t2 ? /* @__PURE__ */ Symbol() : "__" + t2, e2 = this.getPropertyDescriptor(t2, s2, i2);
      void 0 !== e2 && Object.defineProperty(this.prototype, t2, e2);
    }
  }
  static getPropertyDescriptor(t2, i2, s2) {
    return { get() {
      return this[i2];
    }, set(e2) {
      const o2 = this[t2];
      this[i2] = e2, this.requestUpdate(t2, o2, s2);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t2) {
    return this.elementProperties.get(t2) || m;
  }
  static finalize() {
    if (this.hasOwnProperty(_)) return false;
    this[_] = true;
    const t2 = Object.getPrototypeOf(this);
    if (t2.finalize(), void 0 !== t2.v && (this.v = [...t2.v]), this.elementProperties = new Map(t2.elementProperties), this.m = /* @__PURE__ */ new Map(), this.hasOwnProperty("properties")) {
      const t3 = this.properties, i2 = [...Object.getOwnPropertyNames(t3), ...Object.getOwnPropertySymbols(t3)];
      for (const s2 of i2) this.createProperty(s2, t3[s2]);
    }
    return this.elementStyles = this.finalizeStyles(this.styles), true;
  }
  static finalizeStyles(t2) {
    const i2 = [];
    if (Array.isArray(t2)) {
      const s2 = new Set(t2.flat(1 / 0).reverse());
      for (const t3 of s2) i2.unshift(l(t3));
    } else void 0 !== t2 && i2.push(l(t2));
    return i2;
  }
  static p(t2, i2) {
    const s2 = i2.attribute;
    return false === s2 ? void 0 : "string" == typeof s2 ? s2 : "string" == typeof t2 ? t2.toLowerCase() : void 0;
  }
  u() {
    var t2;
    this._ = new Promise(((t3) => this.enableUpdating = t3)), this._$AL = /* @__PURE__ */ new Map(), this.g(), this.requestUpdate(), null === (t2 = this.constructor.v) || void 0 === t2 || t2.forEach(((t3) => t3(this)));
  }
  addController(t2) {
    var i2, s2;
    (null !== (i2 = this.S) && void 0 !== i2 ? i2 : this.S = []).push(t2), void 0 !== this.renderRoot && this.isConnected && (null === (s2 = t2.hostConnected) || void 0 === s2 || s2.call(t2));
  }
  removeController(t2) {
    var i2;
    null === (i2 = this.S) || void 0 === i2 || i2.splice(this.S.indexOf(t2) >>> 0, 1);
  }
  g() {
    this.constructor.elementProperties.forEach(((t2, i2) => {
      this.hasOwnProperty(i2) && (this.o.set(i2, this[i2]), delete this[i2]);
    }));
  }
  createRenderRoot() {
    var t2;
    const i2 = null !== (t2 = this.shadowRoot) && void 0 !== t2 ? t2 : this.attachShadow(this.constructor.shadowRootOptions);
    return h(i2, this.constructor.elementStyles), i2;
  }
  connectedCallback() {
    var t2;
    void 0 === this.renderRoot && (this.renderRoot = this.createRenderRoot()), this.enableUpdating(true), null === (t2 = this.S) || void 0 === t2 || t2.forEach(((t3) => {
      var i2;
      return null === (i2 = t3.hostConnected) || void 0 === i2 ? void 0 : i2.call(t3);
    }));
  }
  enableUpdating(t2) {
  }
  disconnectedCallback() {
    var t2;
    null === (t2 = this.S) || void 0 === t2 || t2.forEach(((t3) => {
      var i2;
      return null === (i2 = t3.hostDisconnected) || void 0 === i2 ? void 0 : i2.call(t3);
    }));
  }
  attributeChangedCallback(t2, i2, s2) {
    this._$AK(t2, s2);
  }
  $(t2, i2, s2 = m) {
    var e2;
    const o2 = this.constructor.p(t2, s2);
    if (void 0 !== o2 && true === s2.reflect) {
      const n2 = (void 0 !== (null === (e2 = s2.converter) || void 0 === e2 ? void 0 : e2.toAttribute) ? s2.converter : p).toAttribute(i2, s2.type);
      this.l = t2, null == n2 ? this.removeAttribute(o2) : this.setAttribute(o2, n2), this.l = null;
    }
  }
  _$AK(t2, i2) {
    var s2;
    const e2 = this.constructor, o2 = e2.m.get(t2);
    if (void 0 !== o2 && this.l !== o2) {
      const t3 = e2.getPropertyOptions(o2), n2 = "function" == typeof t3.converter ? { fromAttribute: t3.converter } : void 0 !== (null === (s2 = t3.converter) || void 0 === s2 ? void 0 : s2.fromAttribute) ? t3.converter : p;
      this.l = o2, this[o2] = n2.fromAttribute(i2, t3.type), this.l = null;
    }
  }
  requestUpdate(t2, i2, s2) {
    let e2 = true;
    void 0 !== t2 && (((s2 = s2 || this.constructor.getPropertyOptions(t2)).hasChanged || f)(this[t2], i2) ? (this._$AL.has(t2) || this._$AL.set(t2, i2), true === s2.reflect && this.l !== t2 && (void 0 === this.C && (this.C = /* @__PURE__ */ new Map()), this.C.set(t2, s2))) : e2 = false), !this.isUpdatePending && e2 && (this._ = this.T());
  }
  async T() {
    this.isUpdatePending = true;
    try {
      await this._;
    } catch (t3) {
      Promise.reject(t3);
    }
    const t2 = this.scheduleUpdate();
    return null != t2 && await t2, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var t2;
    if (!this.isUpdatePending) return;
    this.hasUpdated, this.o && (this.o.forEach(((t3, i3) => this[i3] = t3)), this.o = void 0);
    let i2 = false;
    const s2 = this._$AL;
    try {
      i2 = this.shouldUpdate(s2), i2 ? (this.willUpdate(s2), null === (t2 = this.S) || void 0 === t2 || t2.forEach(((t3) => {
        var i3;
        return null === (i3 = t3.hostUpdate) || void 0 === i3 ? void 0 : i3.call(t3);
      })), this.update(s2)) : this.P();
    } catch (t3) {
      throw i2 = false, this.P(), t3;
    }
    i2 && this._$AE(s2);
  }
  willUpdate(t2) {
  }
  _$AE(t2) {
    var i2;
    null === (i2 = this.S) || void 0 === i2 || i2.forEach(((t3) => {
      var i3;
      return null === (i3 = t3.hostUpdated) || void 0 === i3 ? void 0 : i3.call(t3);
    })), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t2)), this.updated(t2);
  }
  P() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._;
  }
  shouldUpdate(t2) {
    return true;
  }
  update(t2) {
    void 0 !== this.C && (this.C.forEach(((t3, i2) => this.$(i2, this[i2], t3))), this.C = void 0), this.P();
  }
  updated(t2) {
  }
  firstUpdated(t2) {
  }
};
var b;
y[_] = true, y.elementProperties = /* @__PURE__ */ new Map(), y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, null == v || v({ ReactiveElement: y }), (null !== (a = u.reactiveElementVersions) && void 0 !== a ? a : u.reactiveElementVersions = []).push("1.6.3");
var g = window;
var w = g.trustedTypes;
var S = w ? w.createPolicy("lit-html", { createHTML: (t2) => t2 }) : void 0;
var $ = "$lit$";
var C = `lit$${(Math.random() + "").slice(9)}$`;
var T = "?" + C;
var P = `<${T}>`;
var x = document;
var A = () => x.createComment("");
var k = (t2) => null === t2 || "object" != typeof t2 && "function" != typeof t2;
var E = Array.isArray;
var M = (t2) => E(t2) || "function" == typeof (null == t2 ? void 0 : t2[Symbol.iterator]);
var U = "[ 	\n\f\r]";
var N = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var R = /-->/g;
var O = />/g;
var V = RegExp(`>|${U}(?:([^\\s"'>=/]+)(${U}*=${U}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var j = /'/g;
var z = /"/g;
var L = /^(?:script|style|textarea|title)$/i;
var I = (t2) => (i2, ...s2) => ({ _$litType$: t2, strings: i2, values: s2 });
var H = I(1);
var B = I(2);
var D = /* @__PURE__ */ Symbol.for("lit-noChange");
var q = /* @__PURE__ */ Symbol.for("lit-nothing");
var J = /* @__PURE__ */ new WeakMap();
var W = x.createTreeWalker(x, 129, null, false);
function Z(t2, i2) {
  if (!Array.isArray(t2) || !t2.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== S ? S.createHTML(i2) : i2;
}
var F = (t2, i2) => {
  const s2 = t2.length - 1, e2 = [];
  let o2, n2 = 2 === i2 ? "<svg>" : "", r2 = N;
  for (let i3 = 0; i3 < s2; i3++) {
    const s3 = t2[i3];
    let h2, l2, a2 = -1, u2 = 0;
    for (; u2 < s3.length && (r2.lastIndex = u2, l2 = r2.exec(s3), null !== l2); ) u2 = r2.lastIndex, r2 === N ? "!--" === l2[1] ? r2 = R : void 0 !== l2[1] ? r2 = O : void 0 !== l2[2] ? (L.test(l2[2]) && (o2 = RegExp("</" + l2[2], "g")), r2 = V) : void 0 !== l2[3] && (r2 = V) : r2 === V ? ">" === l2[0] ? (r2 = null != o2 ? o2 : N, a2 = -1) : void 0 === l2[1] ? a2 = -2 : (a2 = r2.lastIndex - l2[2].length, h2 = l2[1], r2 = void 0 === l2[3] ? V : '"' === l2[3] ? z : j) : r2 === z || r2 === j ? r2 = V : r2 === R || r2 === O ? r2 = N : (r2 = V, o2 = void 0);
    const c2 = r2 === V && t2[i3 + 1].startsWith("/>") ? " " : "";
    n2 += r2 === N ? s3 + P : a2 >= 0 ? (e2.push(h2), s3.slice(0, a2) + $ + s3.slice(a2) + C + c2) : s3 + C + (-2 === a2 ? (e2.push(void 0), i3) : c2);
  }
  return [Z(t2, n2 + (t2[s2] || "<?>") + (2 === i2 ? "</svg>" : "")), e2];
};
var G = class _G {
  constructor({ strings: t2, _$litType$: i2 }, s2) {
    let e2;
    this.parts = [];
    let o2 = 0, n2 = 0;
    const r2 = t2.length - 1, h2 = this.parts, [l2, a2] = F(t2, i2);
    if (this.el = _G.createElement(l2, s2), W.currentNode = this.el.content, 2 === i2) {
      const t3 = this.el.content, i3 = t3.firstChild;
      i3.remove(), t3.append(...i3.childNodes);
    }
    for (; null !== (e2 = W.nextNode()) && h2.length < r2; ) {
      if (1 === e2.nodeType) {
        if (e2.hasAttributes()) {
          const t3 = [];
          for (const i3 of e2.getAttributeNames()) if (i3.endsWith($) || i3.startsWith(C)) {
            const s3 = a2[n2++];
            if (t3.push(i3), void 0 !== s3) {
              const t4 = e2.getAttribute(s3.toLowerCase() + $).split(C), i4 = /([.?@])?(.*)/.exec(s3);
              h2.push({ type: 1, index: o2, name: i4[2], strings: t4, ctor: "." === i4[1] ? tt : "?" === i4[1] ? st : "@" === i4[1] ? et : Y });
            } else h2.push({ type: 6, index: o2 });
          }
          for (const i3 of t3) e2.removeAttribute(i3);
        }
        if (L.test(e2.tagName)) {
          const t3 = e2.textContent.split(C), i3 = t3.length - 1;
          if (i3 > 0) {
            e2.textContent = w ? w.emptyScript : "";
            for (let s3 = 0; s3 < i3; s3++) e2.append(t3[s3], A()), W.nextNode(), h2.push({ type: 2, index: ++o2 });
            e2.append(t3[i3], A());
          }
        }
      } else if (8 === e2.nodeType) if (e2.data === T) h2.push({ type: 2, index: o2 });
      else {
        let t3 = -1;
        for (; -1 !== (t3 = e2.data.indexOf(C, t3 + 1)); ) h2.push({ type: 7, index: o2 }), t3 += C.length - 1;
      }
      o2++;
    }
  }
  static createElement(t2, i2) {
    const s2 = x.createElement("template");
    return s2.innerHTML = t2, s2;
  }
};
function K(t2, i2, s2 = t2, e2) {
  var o2, n2, r2, h2;
  if (i2 === D) return i2;
  let l2 = void 0 !== e2 ? null === (o2 = s2.A) || void 0 === o2 ? void 0 : o2[e2] : s2.k;
  const a2 = k(i2) ? void 0 : i2._$litDirective$;
  return (null == l2 ? void 0 : l2.constructor) !== a2 && (null === (n2 = null == l2 ? void 0 : l2._$AO) || void 0 === n2 || n2.call(l2, false), void 0 === a2 ? l2 = void 0 : (l2 = new a2(t2), l2._$AT(t2, s2, e2)), void 0 !== e2 ? (null !== (r2 = (h2 = s2).A) && void 0 !== r2 ? r2 : h2.A = [])[e2] = l2 : s2.k = l2), void 0 !== l2 && (i2 = K(t2, l2._$AS(t2, i2.values), l2, e2)), i2;
}
var Q = class {
  constructor(t2, i2) {
    this._$AV = [], this._$AN = void 0, this._$AD = t2, this._$AM = i2;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  M(t2) {
    var i2;
    const { el: { content: s2 }, parts: e2 } = this._$AD, o2 = (null !== (i2 = null == t2 ? void 0 : t2.creationScope) && void 0 !== i2 ? i2 : x).importNode(s2, true);
    W.currentNode = o2;
    let n2 = W.nextNode(), r2 = 0, h2 = 0, l2 = e2[0];
    for (; void 0 !== l2; ) {
      if (r2 === l2.index) {
        let i3;
        2 === l2.type ? i3 = new X(n2, n2.nextSibling, this, t2) : 1 === l2.type ? i3 = new l2.ctor(n2, l2.name, l2.strings, this, t2) : 6 === l2.type && (i3 = new ot(n2, this, t2)), this._$AV.push(i3), l2 = e2[++h2];
      }
      r2 !== (null == l2 ? void 0 : l2.index) && (n2 = W.nextNode(), r2++);
    }
    return W.currentNode = x, o2;
  }
  U(t2) {
    let i2 = 0;
    for (const s2 of this._$AV) void 0 !== s2 && (void 0 !== s2.strings ? (s2._$AI(t2, s2, i2), i2 += s2.strings.length - 2) : s2._$AI(t2[i2])), i2++;
  }
};
var X = class _X {
  constructor(t2, i2, s2, e2) {
    var o2;
    this.type = 2, this._$AH = q, this._$AN = void 0, this._$AA = t2, this._$AB = i2, this._$AM = s2, this.options = e2, this.N = null === (o2 = null == e2 ? void 0 : e2.isConnected) || void 0 === o2 || o2;
  }
  get _$AU() {
    var t2, i2;
    return null !== (i2 = null === (t2 = this._$AM) || void 0 === t2 ? void 0 : t2._$AU) && void 0 !== i2 ? i2 : this.N;
  }
  get parentNode() {
    let t2 = this._$AA.parentNode;
    const i2 = this._$AM;
    return void 0 !== i2 && 11 === (null == t2 ? void 0 : t2.nodeType) && (t2 = i2.parentNode), t2;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t2, i2 = this) {
    t2 = K(this, t2, i2), k(t2) ? t2 === q || null == t2 || "" === t2 ? (this._$AH !== q && this._$AR(), this._$AH = q) : t2 !== this._$AH && t2 !== D && this.R(t2) : void 0 !== t2._$litType$ ? this.O(t2) : void 0 !== t2.nodeType ? this.V(t2) : M(t2) ? this.j(t2) : this.R(t2);
  }
  L(t2) {
    return this._$AA.parentNode.insertBefore(t2, this._$AB);
  }
  V(t2) {
    this._$AH !== t2 && (this._$AR(), this._$AH = this.L(t2));
  }
  R(t2) {
    this._$AH !== q && k(this._$AH) ? this._$AA.nextSibling.data = t2 : this.V(x.createTextNode(t2)), this._$AH = t2;
  }
  O(t2) {
    var i2;
    const { values: s2, _$litType$: e2 } = t2, o2 = "number" == typeof e2 ? this._$AC(t2) : (void 0 === e2.el && (e2.el = G.createElement(Z(e2.h, e2.h[0]), this.options)), e2);
    if ((null === (i2 = this._$AH) || void 0 === i2 ? void 0 : i2._$AD) === o2) this._$AH.U(s2);
    else {
      const t3 = new Q(o2, this), i3 = t3.M(this.options);
      t3.U(s2), this.V(i3), this._$AH = t3;
    }
  }
  _$AC(t2) {
    let i2 = J.get(t2.strings);
    return void 0 === i2 && J.set(t2.strings, i2 = new G(t2)), i2;
  }
  j(t2) {
    E(this._$AH) || (this._$AH = [], this._$AR());
    const i2 = this._$AH;
    let s2, e2 = 0;
    for (const o2 of t2) e2 === i2.length ? i2.push(s2 = new _X(this.L(A()), this.L(A()), this, this.options)) : s2 = i2[e2], s2._$AI(o2), e2++;
    e2 < i2.length && (this._$AR(s2 && s2._$AB.nextSibling, e2), i2.length = e2);
  }
  _$AR(t2 = this._$AA.nextSibling, i2) {
    var s2;
    for (null === (s2 = this._$AP) || void 0 === s2 || s2.call(this, false, true, i2); t2 && t2 !== this._$AB; ) {
      const i3 = t2.nextSibling;
      t2.remove(), t2 = i3;
    }
  }
  setConnected(t2) {
    var i2;
    void 0 === this._$AM && (this.N = t2, null === (i2 = this._$AP) || void 0 === i2 || i2.call(this, t2));
  }
};
var Y = class {
  constructor(t2, i2, s2, e2, o2) {
    this.type = 1, this._$AH = q, this._$AN = void 0, this.element = t2, this.name = i2, this._$AM = e2, this.options = o2, s2.length > 2 || "" !== s2[0] || "" !== s2[1] ? (this._$AH = Array(s2.length - 1).fill(new String()), this.strings = s2) : this._$AH = q;
  }
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t2, i2 = this, s2, e2) {
    const o2 = this.strings;
    let n2 = false;
    if (void 0 === o2) t2 = K(this, t2, i2, 0), n2 = !k(t2) || t2 !== this._$AH && t2 !== D, n2 && (this._$AH = t2);
    else {
      const e3 = t2;
      let r2, h2;
      for (t2 = o2[0], r2 = 0; r2 < o2.length - 1; r2++) h2 = K(this, e3[s2 + r2], i2, r2), h2 === D && (h2 = this._$AH[r2]), n2 || (n2 = !k(h2) || h2 !== this._$AH[r2]), h2 === q ? t2 = q : t2 !== q && (t2 += (null != h2 ? h2 : "") + o2[r2 + 1]), this._$AH[r2] = h2;
    }
    n2 && !e2 && this.I(t2);
  }
  I(t2) {
    t2 === q ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, null != t2 ? t2 : "");
  }
};
var tt = class extends Y {
  constructor() {
    super(...arguments), this.type = 3;
  }
  I(t2) {
    this.element[this.name] = t2 === q ? void 0 : t2;
  }
};
var it = w ? w.emptyScript : "";
var st = class extends Y {
  constructor() {
    super(...arguments), this.type = 4;
  }
  I(t2) {
    t2 && t2 !== q ? this.element.setAttribute(this.name, it) : this.element.removeAttribute(this.name);
  }
};
var et = class extends Y {
  constructor(t2, i2, s2, e2, o2) {
    super(t2, i2, s2, e2, o2), this.type = 5;
  }
  _$AI(t2, i2 = this) {
    var s2;
    if ((t2 = null !== (s2 = K(this, t2, i2, 0)) && void 0 !== s2 ? s2 : q) === D) return;
    const e2 = this._$AH, o2 = t2 === q && e2 !== q || t2.capture !== e2.capture || t2.once !== e2.once || t2.passive !== e2.passive, n2 = t2 !== q && (e2 === q || o2);
    o2 && this.element.removeEventListener(this.name, this, e2), n2 && this.element.addEventListener(this.name, this, t2), this._$AH = t2;
  }
  handleEvent(t2) {
    var i2, s2;
    "function" == typeof this._$AH ? this._$AH.call(null !== (s2 = null === (i2 = this.options) || void 0 === i2 ? void 0 : i2.host) && void 0 !== s2 ? s2 : this.element, t2) : this._$AH.handleEvent(t2);
  }
};
var ot = class {
  constructor(t2, i2, s2) {
    this.element = t2, this.type = 6, this._$AN = void 0, this._$AM = i2, this.options = s2;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t2) {
    K(this, t2);
  }
};
var rt = g.litHtmlPolyfillSupport;
null == rt || rt(G, X), (null !== (b = g.litHtmlVersions) && void 0 !== b ? b : g.litHtmlVersions = []).push("2.8.0");
var ht = (t2, i2, s2) => {
  var e2, o2;
  const n2 = null !== (e2 = null == s2 ? void 0 : s2.renderBefore) && void 0 !== e2 ? e2 : i2;
  let r2 = n2._$litPart$;
  if (void 0 === r2) {
    const t3 = null !== (o2 = null == s2 ? void 0 : s2.renderBefore) && void 0 !== o2 ? o2 : null;
    n2._$litPart$ = r2 = new X(i2.insertBefore(A(), t3), t3, void 0, null != s2 ? s2 : {});
  }
  return r2._$AI(t2), r2;
};
var lt;
var at;
var ct = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this.st = void 0;
  }
  createRenderRoot() {
    var t2, i2;
    const s2 = super.createRenderRoot();
    return null !== (t2 = (i2 = this.renderOptions).renderBefore) && void 0 !== t2 || (i2.renderBefore = s2.firstChild), s2;
  }
  update(t2) {
    const i2 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t2), this.st = ht(i2, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var t2;
    super.connectedCallback(), null === (t2 = this.st) || void 0 === t2 || t2.setConnected(true);
  }
  disconnectedCallback() {
    var t2;
    super.disconnectedCallback(), null === (t2 = this.st) || void 0 === t2 || t2.setConnected(false);
  }
  render() {
    return D;
  }
};
ct.finalized = true, ct._$litElement$ = true, null === (lt = globalThis.litElementHydrateSupport) || void 0 === lt || lt.call(globalThis, { LitElement: ct });
var dt = globalThis.litElementPolyfillSupport;
null == dt || dt({ LitElement: ct });
(null !== (at = globalThis.litElementVersions) && void 0 !== at ? at : globalThis.litElementVersions = []).push("3.3.3");

// runtime-modes.js
var RUNTIME_MODE_AUTO_SP = "auto_sp";
var RUNTIME_MODE_MANUAL_SP = "manual_sp";
var RUNTIME_MODE_HOLD = "hold";
var RUNTIME_MODE_MANUAL_OUT = "manual_out";
var RUNTIME_MODES = [
  RUNTIME_MODE_AUTO_SP,
  RUNTIME_MODE_MANUAL_SP,
  RUNTIME_MODE_HOLD,
  RUNTIME_MODE_MANUAL_OUT
];
var LEGACY_RUNTIME_MODES = {
  "AUTO SP": RUNTIME_MODE_AUTO_SP,
  "MANUAL SP": RUNTIME_MODE_MANUAL_SP,
  HOLD: RUNTIME_MODE_HOLD,
  "MANUAL OUT": RUNTIME_MODE_MANUAL_OUT
};
var RUNTIME_MODE_LABELS = {
  [RUNTIME_MODE_AUTO_SP]: "AUTO SP",
  [RUNTIME_MODE_MANUAL_SP]: "MANUAL SP",
  [RUNTIME_MODE_HOLD]: "HOLD",
  [RUNTIME_MODE_MANUAL_OUT]: "MANUAL OUT"
};
function normalizeRuntimeMode(mode) {
  if (!mode) {
    return RUNTIME_MODE_AUTO_SP;
  }
  const value = String(mode);
  if (Object.hasOwn(LEGACY_RUNTIME_MODES, value)) {
    return LEGACY_RUNTIME_MODES[value];
  }
  if (RUNTIME_MODES.includes(value)) {
    return value;
  }
  return RUNTIME_MODE_AUTO_SP;
}
function runtimeModeLabel(mode) {
  const normalized = normalizeRuntimeMode(mode);
  if (Object.hasOwn(RUNTIME_MODE_LABELS, normalized)) {
    return RUNTIME_MODE_LABELS[normalized];
  }
  return normalized;
}
function resolvePidEntity(config) {
  if (!config || typeof config !== "object") {
    return "";
  }
  const raw = config.pid_entity ?? config.entity;
  return typeof raw === "string" ? raw.trim() : "";
}
function validatePidCardConfig(config) {
  const pid_entity = resolvePidEntity(config);
  if (!pid_entity) {
    return {
      ok: false,
      error: "pid_entity is required \u2014 choose the sensor.*_status entity from Solar Energy Controller."
    };
  }
  if (!pid_entity.startsWith("sensor.")) {
    return {
      ok: false,
      error: `pid_entity must be a sensor (got "${pid_entity}").`
    };
  }
  return { ok: true, pid_entity };
}

// ha-components.js
var REQUIRED = ["ha-textfield", "ha-select", "ha-switch", "mwc-list-item", "mwc-button"];
function allDefined() {
  return REQUIRED.every((tag) => customElements.get(tag));
}
var loadingPromise = null;
async function ensureHaComponents(timeoutMs = 5e3) {
  if (allDefined()) return true;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      if (window.loadCardHelpers) {
        const helpers = await window.loadCardHelpers();
        const card = await helpers.createCardElement({ type: "entities", entities: [] });
        if (card?.constructor?.getConfigElement) {
          await card.constructor.getConfigElement();
        }
      }
    } catch (err) {
      console.warn("Solar Energy Controller: loadCardHelpers failed", err);
    }
    await Promise.race([
      Promise.all(REQUIRED.map((tag) => customElements.whenDefined(tag))),
      new Promise((resolve) => setTimeout(resolve, timeoutMs))
    ]);
    if (!allDefined()) {
      const missing = REQUIRED.filter((tag) => !customElements.get(tag));
      console.warn("Solar Energy Controller: HA components missing:", missing);
    }
    return allDefined();
  })();
  return loadingPromise;
}

// chart-utils.js
var HISTORY_WINDOW_MS = 36e5;
function loadChartJS(versionQuery) {
  return new Promise((resolve, reject) => {
    if (window.Chart) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `/solar_energy_controller/frontend/chart.umd.min.js${versionQuery}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Chart.js"));
    document.head.appendChild(script);
  });
}
function getEntityIds(_hass, pidEntityId) {
  if (!pidEntityId || !pidEntityId.startsWith("sensor.")) {
    return null;
  }
  const deviceName = pidEntityId.replace(/^sensor\./, "").replace(/_status$/, "");
  return {
    pv: `sensor.${deviceName}_pv_value`,
    sp: `sensor.${deviceName}_effective_sp`,
    output: `sensor.${deviceName}_output`
  };
}
async function fetchHistory(hass, entityIds) {
  if (!entityIds || !hass) {
    return null;
  }
  const pvExists = hass.states[entityIds.pv];
  const spExists = hass.states[entityIds.sp];
  const outputExists = hass.states[entityIds.output];
  if (!pvExists || !spExists || !outputExists) {
    return null;
  }
  try {
    const startTime = new Date(Date.now() - HISTORY_WINDOW_MS);
    const entityList = `${entityIds.pv},${entityIds.sp},${entityIds.output}`;
    const url = `history/period/${startTime.toISOString()}?filter_entity_id=${encodeURIComponent(entityList)}&minimal_response=false&significant_changes_only=false`;
    const history = await hass.callApi("GET", url);
    if (!history || !Array.isArray(history)) {
      return null;
    }
    return applyChartMeta(parseHistory(history, entityIds), buildChartMeta(hass, entityIds));
  } catch (err) {
    console.error("Error fetching history:", err);
    return null;
  }
}
function parseHistory(history, entityIds) {
  const data = { pv: [], sp: [], output: [] };
  const allTimes = /* @__PURE__ */ new Set();
  if (Array.isArray(history)) {
    history.forEach((entityHistory) => {
      if (!Array.isArray(entityHistory) || entityHistory.length === 0) return;
      const firstState = entityHistory[0];
      if (!firstState?.entity_id) return;
      const entityId = firstState.entity_id;
      entityHistory.forEach((state) => {
        if (!state) return;
        const time = new Date(state.last_changed || state.last_updated);
        if (isNaN(time.getTime())) return;
        const value = parseFloat(state.state);
        if (isNaN(value)) return;
        allTimes.add(time.getTime());
        if (entityId === entityIds.pv) {
          data.pv.push({ time: time.getTime(), value });
        } else if (entityId === entityIds.sp) {
          data.sp.push({ time: time.getTime(), value });
        } else if (entityId === entityIds.output) {
          data.output.push({ time: time.getTime(), value });
        }
      });
    });
  }
  if (allTimes.size === 0) {
    return null;
  }
  const sortedTimes = Array.from(allTimes).sort((a2, b2) => a2 - b2);
  const labels = sortedTimes.map((t2) => new Date(t2).toISOString());
  data.pv.sort((a2, b2) => a2.time - b2.time);
  data.sp.sort((a2, b2) => a2.time - b2.time);
  data.output.sort((a2, b2) => a2.time - b2.time);
  const pvData = alignSeriesToTimeAxis(data.pv, sortedTimes);
  const spData = alignSeriesToTimeAxis(data.sp, sortedTimes);
  const outputData = alignSeriesToTimeAxis(data.output, sortedTimes);
  return {
    labels,
    entityIds,
    datasets: [
      { label: "PV", data: pvData },
      { label: "SP", data: spData },
      { label: "OUTPUT", data: outputData }
    ]
  };
}
function getEntityUnit(hass, entityId) {
  if (!hass?.states?.[entityId]) {
    return null;
  }
  const unit = hass.states[entityId].attributes?.unit_of_measurement;
  return typeof unit === "string" && unit ? unit : null;
}
function buildChartMeta(hass, entityIds) {
  if (!entityIds) {
    return null;
  }
  const pvUnit = getEntityUnit(hass, entityIds.pv);
  const spUnit = getEntityUnit(hass, entityIds.sp);
  const outUnit = getEntityUnit(hass, entityIds.output) || "%";
  const leftUnit = pvUnit || spUnit || "";
  return {
    entityIds,
    pvUnit,
    spUnit,
    outUnit,
    leftUnit,
    rightUnit: outUnit,
    pvLabel: pvUnit ? `PV (${pvUnit})` : "PV",
    spLabel: spUnit ? `SP (${spUnit})` : "SP",
    outputLabel: outUnit ? `Output (${outUnit})` : "Output",
    leftAxisTitle: leftUnit ? `PV / SP, ${leftUnit}` : "PV / SP",
    rightAxisTitle: outUnit ? `Output, ${outUnit}` : "Output",
    caption: `${entityIds.pv} \xB7 ${entityIds.sp} \xB7 ${entityIds.output}`
  };
}
function applyChartMeta(points, meta) {
  if (!points || !meta) {
    return points;
  }
  const labels = [meta.pvLabel, meta.spLabel, meta.outputLabel];
  return {
    ...points,
    meta,
    datasets: points.datasets.map((dataset, index) => ({
      ...dataset,
      label: labels[index] || dataset.label
    }))
  };
}
function formatAxisTick(value, unit) {
  if (value === null || value === void 0 || !Number.isFinite(value)) {
    return "";
  }
  const abs = Math.abs(value);
  let formatted;
  if (abs >= 1e3) {
    formatted = value.toFixed(0);
  } else if (abs >= 100) {
    formatted = value.toFixed(0);
  } else if (abs >= 10) {
    formatted = value.toFixed(1);
  } else {
    formatted = value.toFixed(1);
  }
  if (formatted.endsWith(".0")) {
    formatted = formatted.slice(0, -2);
  }
  return unit ? `${formatted} ${unit}` : formatted;
}
function axisTickCallback(scaleId) {
  return function axisTick(value) {
    const unit = this.chart?.options?.scales?.[scaleId]?.unit || "";
    return formatAxisTick(value, unit);
  };
}
function updateChartAxisTitles(chart, meta) {
  if (!chart?.options?.scales || !meta) {
    return;
  }
  if (chart.options.scales.y_pv_sp) {
    if (chart.options.scales.y_pv_sp.title) {
      chart.options.scales.y_pv_sp.title.text = meta.leftAxisTitle;
    }
    chart.options.scales.y_pv_sp.unit = meta.leftUnit || "";
  }
  if (chart.options.scales.y_out) {
    if (chart.options.scales.y_out.title) {
      chart.options.scales.y_out.title.text = meta.rightAxisTitle;
    }
    chart.options.scales.y_out.unit = meta.rightUnit || "";
  }
  chart.update("none");
}
function alignSeriesToTimeAxis(points, timeAxis) {
  if (!points || points.length === 0) {
    return new Array(timeAxis.length).fill(null);
  }
  const result = [];
  let i2 = 0;
  for (const time of timeAxis) {
    while (i2 < points.length - 1 && points[i2 + 1].time <= time) {
      i2++;
    }
    if (time < points[0].time) {
      result.push(null);
      continue;
    }
    result.push(points[i2].value);
  }
  return result;
}
function updateTraces(chart, points) {
  if (!chart || !points) {
    return;
  }
  chart.data.labels = points.labels;
  points.datasets.forEach((dataset, index) => {
    if (chart.data.datasets[index]) {
      chart.data.datasets[index].data = dataset.data;
      if (dataset.label) {
        chart.data.datasets[index].label = dataset.label;
      }
    }
  });
  updateChartAxisTitles(chart, points.meta);
  chart.update("none");
}
function createHistoryLineChartConfig(meta) {
  const pvLabel = meta?.pvLabel || "PV";
  const spLabel = meta?.spLabel || "SP";
  const outputLabel = meta?.outputLabel || "Output";
  const leftAxisTitle = meta?.leftAxisTitle || "PV / SP";
  const rightAxisTitle = meta?.rightAxisTitle || "Output";
  const leftUnit = meta?.leftUnit || "";
  const rightUnit = meta?.rightUnit || "";
  return {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: pvLabel,
          data: [],
          borderColor: "#2196F3",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
          spanGaps: false,
          yAxisID: "y_pv_sp"
        },
        {
          label: spLabel,
          data: [],
          borderColor: "#FF9800",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
          spanGaps: false,
          yAxisID: "y_pv_sp"
        },
        {
          label: outputLabel,
          data: [],
          borderColor: "#9C27B0",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
          spanGaps: false,
          yAxisID: "y_out"
        }
      ]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index"
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            usePointStyle: true,
            padding: 10,
            font: { size: 11 }
          }
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label(context) {
              const label = context.dataset.label || "";
              const value = context.parsed.y;
              if (value === null || value === void 0) {
                return `${label}: \u2014`;
              }
              const unitMatch = label.match(/\(([^)]+)\)$/);
              const unit = unitMatch ? unitMatch[1] : "";
              const name = unit ? label.replace(` (${unit})`, "") : label;
              return `${name}: ${formatAxisTick(value, unit)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: "var(--divider-color, #ddd)" },
          ticks: {
            color: "var(--secondary-text-color, #888)",
            font: { size: 10 },
            maxTicksLimit: 5,
            callback(value) {
              const label = this.getLabelForValue(value);
              if (!label) return "";
              const date = new Date(label);
              return date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              });
            }
          }
        },
        y_pv_sp: {
          position: "left",
          unit: leftUnit,
          title: {
            display: true,
            text: leftAxisTitle,
            color: "var(--primary-text-color, #333)",
            font: { size: 12, weight: 600 },
            padding: { top: 0, bottom: 4 }
          },
          grid: { color: "var(--divider-color, #ddd)" },
          ticks: {
            color: "var(--secondary-text-color, #888)",
            font: { size: 11 },
            maxTicksLimit: 5,
            callback: axisTickCallback("y_pv_sp")
          }
        },
        y_out: {
          position: "right",
          unit: rightUnit,
          title: {
            display: true,
            text: rightAxisTitle,
            color: "var(--primary-text-color, #333)",
            font: { size: 12, weight: 600 },
            padding: { top: 0, bottom: 4 }
          },
          grid: { drawOnChartArea: false },
          ticks: {
            color: "var(--secondary-text-color, #888)",
            font: { size: 11 },
            maxTicksLimit: 5,
            callback: axisTickCallback("y_out")
          }
        }
      }
    }
  };
}
function formatValue(value) {
  if (value === null || value === void 0) return "\u2014";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "\u2014";
    const rounded = value.toFixed(1);
    return rounded === "-0.0" ? "0.0" : rounded;
  }
  return String(value);
}

// pid-controller-mini.js
var MODULE_VERSION_QUERY = new URL(import.meta.url).search;
var PIDControllerMini = class extends ct {
  static properties = {
    hass: { type: Object },
    config: { type: Object },
    _data: { state: true },
    _configError: { state: true }
  };
  static styles = r`
    :host {
      display: block;
    }

    ha-card {
      padding: 16px;
      cursor: pointer;
    }

    ha-card:hover {
      box-shadow: var(--ha-card-box-shadow, 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2));
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .title {
      font-size: 16px;
      font-weight: 500;
      color: var(--primary-text-color);
    }

    .compact-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .metric {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .metric-label {
      font-size: 12px;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-value {
      font-size: 16px;
      font-weight: 500;
      color: var(--primary-text-color);
    }

    .metric-value.negative {
      color: var(--error-color);
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--divider-color);
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      background-color: var(--info-color, #039be5);
      color: var(--text-primary-color, #fff);
    }

    .status-badge.running {
      background-color: var(--success-color, #4caf50);
    }

    .status-badge.disabled {
      background-color: var(--disabled-color, #9e9e9e);
    }

    .graph-container {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--divider-color);
      min-height: 200px;
    }

    .graph-container ha-card {
      box-shadow: none;
      padding: 0;
    }

    .graph-container canvas {
      display: block;
      width: 100%;
      max-width: 100%;
      pointer-events: none;
    }

    .card-clickable {
      cursor: pointer;
    }

    .card-clickable:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    .config-error {
      padding: 16px;
      color: var(--error-color, #db4437);
      font-size: 14px;
      line-height: 1.4;
    }

    .config-error-title {
      font-weight: 600;
      margin-bottom: 8px;
    }

    .config-error-hint {
      margin-top: 8px;
      font-size: 12px;
      color: var(--secondary-text-color);
    }
  `;
  constructor() {
    super();
    this._data = {};
    this._configError = null;
    this._canvas = null;
    this._chart = null;
    this._graphInFlight = false;
    this._graphUpdateTimeout = null;
    this._activePopupCard = null;
  }
  setConfig(config) {
    const validation = validatePidCardConfig(config);
    if (!validation.ok) {
      this._configError = validation.error;
      this.config = null;
      return;
    }
    this._configError = null;
    this.config = {
      title: "PID Controller",
      show_status: true,
      show_mode: true,
      show_pv: true,
      show_sp: true,
      show_error: true,
      show_output: true,
      show_chart: true,
      ...config,
      pid_entity: validation.pid_entity
    };
  }
  static getConfigForm() {
    return {
      schema: [
        {
          name: "pid_entity",
          required: false,
          selector: {
            entity: {
              domain: "sensor"
            }
          }
        },
        {
          name: "title",
          default: "PID Controller",
          selector: {
            text: {}
          }
        },
        {
          name: "show_status",
          label: "Show Status",
          default: true,
          selector: {
            boolean: {}
          }
        },
        {
          name: "show_mode",
          label: "Show Mode",
          default: true,
          selector: {
            boolean: {}
          }
        },
        {
          name: "show_pv",
          label: "Show PV",
          default: true,
          selector: {
            boolean: {}
          }
        },
        {
          name: "show_sp",
          label: "Show SP",
          default: true,
          selector: {
            boolean: {}
          }
        },
        {
          name: "show_error",
          label: "Show Error",
          default: true,
          selector: {
            boolean: {}
          }
        },
        {
          name: "show_output",
          label: "Show Output",
          default: true,
          selector: {
            boolean: {}
          }
        },
        {
          name: "show_chart",
          label: "Show Chart",
          default: true,
          selector: {
            boolean: {}
          }
        }
      ]
    };
  }
  static getStubConfig() {
    return {
      pid_entity: "sensor.solar_energy_controller_status",
      title: "PID Controller"
    };
  }
  getCardSize() {
    return 6;
  }
  updated(changedProperties) {
    if (!this.config || this._configError) {
      return;
    }
    if (changedProperties.has("hass") || changedProperties.has("config")) {
      this._updateData();
      if (this.config.show_chart) {
        this._scheduleGraphUpdate(800);
      }
    }
    if (this._activePopupCard && changedProperties.has("hass") && this.hass) {
      this._activePopupCard.hass = this.hass;
    }
  }
  async firstUpdated() {
    if (!this.config?.show_chart) {
      return;
    }
    try {
      await loadChartJS(MODULE_VERSION_QUERY);
      if (!this.isConnected) return;
      setTimeout(() => this._updateGraph(), 200);
      this._graphInterval = setInterval(() => this._updateGraph(), 3e4);
    } catch (err) {
      console.error("Solar Energy Controller: chart setup failed", err);
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._graphInterval) {
      clearInterval(this._graphInterval);
      this._graphInterval = null;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    if (this._graphUpdateTimeout) {
      clearTimeout(this._graphUpdateTimeout);
      this._graphUpdateTimeout = null;
    }
    if (this._chart) {
      this._chart.destroy();
      this._chart = null;
    }
  }
  _scheduleGraphUpdate(delayMs = 800) {
    if (this._graphUpdateTimeout) {
      clearTimeout(this._graphUpdateTimeout);
    }
    this._graphUpdateTimeout = setTimeout(() => {
      this._updateGraph();
    }, delayMs);
  }
  async _ensureChart() {
    if (this._chart) {
      return;
    }
    const container = this.shadowRoot?.getElementById("graph-container");
    if (!container) {
      return;
    }
    if (!this._canvas) {
      this._canvas = document.createElement("canvas");
      this._canvas.style.width = "100%";
      this._canvas.style.height = "200px";
      this._canvas.style.display = "block";
      container.appendChild(this._canvas);
    }
    const ctx = this._canvas.getContext("2d");
    const entityIds = getEntityIds(this.hass, this.config?.pid_entity);
    const meta = buildChartMeta(this.hass, entityIds);
    try {
      this._chart = new window.Chart(ctx, createHistoryLineChartConfig(meta));
    } catch (err) {
      console.error("Solar Energy Controller: Chart.js init failed", err);
      return;
    }
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        if (this._chart) {
          this._chart.resize();
          this._chart.update("none");
        }
      });
      this._resizeObserver.observe(container);
    }
  }
  async _updateGraph() {
    if (this._graphInFlight) {
      return;
    }
    this._graphInFlight = true;
    try {
      await this._ensureChart();
      if (!this._chart) {
        this._graphInFlight = false;
        return;
      }
      const entityIds = getEntityIds(this.hass, this.config.pid_entity);
      const points = await fetchHistory(this.hass, entityIds);
      if (points) {
        updateTraces(this._chart, points);
      }
    } catch (err) {
      console.error("Error updating graph:", err);
      const container = this.shadowRoot?.getElementById("graph-container");
      if (container && !this._chart) {
        const errorMsg = err?.message || (typeof err === "string" ? err : JSON.stringify(err));
        container.replaceChildren();
        const errEl = document.createElement("div");
        errEl.style.cssText = "padding:8px;color:var(--error-color,red);font-size:12px";
        errEl.textContent = `Graph error: ${errorMsg}`;
        container.appendChild(errEl);
      }
    } finally {
      this._graphInFlight = false;
    }
  }
  _updateData() {
    if (!this.hass || !this.config) return;
    const state = this.hass.states[this.config.pid_entity];
    const data = {};
    if (state && state.attributes) {
      const attrs = state.attributes;
      data.enabled = attrs.enabled ?? false;
      data.runtime_mode = normalizeRuntimeMode(attrs.runtime_mode);
      data.pv_value = attrs.pv_value ?? null;
      data.effective_sp = attrs.effective_sp ?? null;
      data.error = attrs.error ?? null;
      data.output = attrs.output ?? null;
      data.status = attrs.status || "unknown";
    }
    this._data = data;
  }
  _formatMode(mode) {
    if (!mode) return "\u2014";
    return runtimeModeLabel(mode);
  }
  _ensureNativeDialogStyles() {
    if (document.getElementById("pid-controller-native-dialog-styles")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "pid-controller-native-dialog-styles";
    style.textContent = `
      dialog.pid-controller-native-dialog {
        border: none;
        padding: 0;
        margin: auto;
        width: min(680px, 92vw);
        max-height: 85vh;
        overflow: auto;
        background: var(--card-background-color, #1c1c1c);
        color: var(--primary-text-color, #fff);
        border-radius: var(--ha-card-border-radius, 12px);
        box-shadow: var(--ha-card-box-shadow, 0 8px 24px rgba(0, 0, 0, 0.35));
      }
      dialog.pid-controller-native-dialog::backdrop {
        background: rgba(0, 0, 0, 0.55);
      }
      .pid-controller-native-dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 12px 0;
        position: sticky;
        top: 0;
        z-index: 1;
        background: var(--card-background-color, #1c1c1c);
      }
      .pid-controller-native-dialog-title {
        font-size: 18px;
        font-weight: 500;
      }
      .pid-controller-native-dialog-close {
        border: none;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 24px;
        line-height: 1;
        padding: 4px 8px;
      }
    `;
    document.head.appendChild(style);
  }
  async _ensurePopupElementReady() {
    if (customElements.get("pid-controller-popup")) {
      return true;
    }
    await import(`/solar_energy_controller/frontend/pid-controller-popup.bundled.js${MODULE_VERSION_QUERY}`);
    await customElements.whenDefined("pid-controller-popup");
    await ensureHaComponents();
    return true;
  }
  _createPopupCard() {
    if (!customElements.get("pid-controller-popup")) {
      throw new Error("pid-controller-popup custom element is not registered");
    }
    const popupCard = document.createElement("pid-controller-popup");
    popupCard.setConfig({ pid_entity: this.config.pid_entity });
    popupCard.hass = this.hass;
    return popupCard;
  }
  _closeDialogElement(dialog) {
    if (!dialog) {
      return;
    }
    if (typeof dialog.close === "function") {
      try {
        dialog.close();
      } catch (err) {
        dialog.open = false;
      }
      return;
    }
    if ("open" in dialog) {
      dialog.open = false;
    }
  }
  _attachDialogCleanup(dialog, popupCard) {
    const cleanup = () => {
      if (this._activePopupCard === popupCard) {
        this._activePopupCard = null;
      }
      if (dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
      }
    };
    dialog.addEventListener("closed", cleanup, { once: true });
    dialog.addEventListener("close", cleanup, { once: true });
  }
  _openNativeDialog(title, popupCard) {
    this._ensureNativeDialogStyles();
    this._activePopupCard = popupCard;
    const dialog = document.createElement("dialog");
    dialog.className = "pid-controller-native-dialog";
    const header = document.createElement("div");
    header.className = "pid-controller-native-dialog-header";
    const heading = document.createElement("div");
    heading.className = "pid-controller-native-dialog-title";
    heading.textContent = title;
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "pid-controller-native-dialog-close";
    closeButton.setAttribute("aria-label", "Close");
    closeButton.textContent = "\xD7";
    closeButton.addEventListener("click", () => this._closeDialogElement(dialog));
    header.appendChild(heading);
    header.appendChild(closeButton);
    dialog.appendChild(header);
    dialog.appendChild(popupCard);
    this._attachDialogCleanup(dialog, popupCard);
    document.body.appendChild(dialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        this._closeDialogElement(dialog);
      }
    });
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else if (typeof dialog.show === "function") {
      dialog.show();
    } else {
      dialog.open = true;
    }
  }
  _openPopup(ev) {
    void this._openPopupAsync(ev);
  }
  async _openPopupAsync(ev) {
    if (ev) {
      ev.stopPropagation();
      ev.preventDefault();
    }
    const title = this.config.title || "PID Controller";
    if (this.hass?.services?.browser_mod?.popup) {
      this.hass.callService("browser_mod", "popup", {
        title,
        card: {
          type: "custom:pid-controller-popup",
          pid_entity: this.config.pid_entity
        },
        size: "large"
      });
      return;
    }
    try {
      await this._ensurePopupElementReady();
    } catch (err) {
      console.error("Solar Energy Controller: could not load popup editor", err);
      return;
    }
    let popupCard;
    try {
      popupCard = this._createPopupCard();
    } catch (err) {
      console.error("Solar Energy Controller: popup editor element missing", err);
      return;
    }
    this._openNativeDialog(title, popupCard);
  }
  _onCardKeydown(ev) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._openPopup(ev);
    }
  }
  render() {
    if (this._configError) {
      return H`
        <ha-card>
          <div class="config-error">
            <div class="config-error-title">PID Controller Mini</div>
            ${this._configError}
            <div class="config-error-hint">
              Edit the card and set pid_entity to your Solar Energy Controller status sensor
              (sensor.&lt;name&gt;_status). If the card worked before an update, reload the
              integration and hard-refresh the dashboard (Ctrl+F5).
            </div>
          </div>
        </ha-card>
      `;
    }
    if (!this.hass || !this.config) {
      return H``;
    }
    const d2 = this._data;
    const statusClass = d2.status === "running" ? "running" : d2.enabled === false ? "disabled" : "";
    return H`
      <ha-card>
        <div
          class="card-clickable"
          role="button"
          tabindex="0"
          aria-label="Open PID controller editor"
          @click=${this._openPopup}
          @keydown=${this._onCardKeydown}
        >
        <div class="header">
          <div class="title">${this.config.title}</div>
        </div>

        <div class="compact-grid">
          ${this.config.show_status ? H`
          <div class="metric">
            <div class="metric-label">Status</div>
            <div class="metric-value">
              <span class="status-badge ${statusClass}">${d2.status || "\u2014"}</span>
            </div>
          </div>
          ` : ""}

          ${this.config.show_mode ? H`
          <div class="metric">
            <div class="metric-label">Mode</div>
            <div class="metric-value">${this._formatMode(d2.runtime_mode)}</div>
          </div>
          ` : ""}

          ${this.config.show_pv ? H`
          <div class="metric">
            <div class="metric-label">PV</div>
            <div class="metric-value">${formatValue(d2.pv_value)}</div>
          </div>
          ` : ""}

          ${this.config.show_sp ? H`
          <div class="metric">
            <div class="metric-label">SP</div>
            <div class="metric-value">${formatValue(d2.effective_sp)}</div>
          </div>
          ` : ""}

          ${this.config.show_error ? H`
          <div class="metric">
            <div class="metric-label">Error</div>
            <div
              class="metric-value ${d2.error && d2.error < 0 ? "negative" : ""}"
            >
              ${formatValue(d2.error)}
            </div>
          </div>
          ` : ""}

          ${this.config.show_output ? H`
          <div class="metric">
            <div class="metric-label">Output</div>
            <div class="metric-value">${formatValue(d2.output)}</div>
          </div>
          ` : ""}
        </div>

        ${this.config.show_chart ? H`
          <div class="graph-container" id="graph-container"></div>
        ` : ""}

        <div class="actions">
          <mwc-button outlined label="Open Editor" @click=${this._openPopup}></mwc-button>
        </div>
        </div>
      </ha-card>
    `;
  }
};
if (!customElements.get("pid-controller-mini")) {
  customElements.define("pid-controller-mini", PIDControllerMini);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c2) => c2.type === "pid-controller-mini")) {
    window.customCards.push({
      type: "pid-controller-mini",
      name: "PID Controller Mini",
      description: "Compact dashboard card for PID controller with popup editor",
      preview: false
    });
  }
}
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
