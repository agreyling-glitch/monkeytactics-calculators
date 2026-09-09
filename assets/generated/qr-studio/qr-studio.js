//#region \0rolldown/runtime.js
var e = (e, t) => () => (t || (e((t = { exports: {} }).exports, t), e = null), t.exports), t = /* @__PURE__ */ e(((e) => {
	var t = Symbol.for("react.transitional.element"), n = Symbol.for("react.portal"), r = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), o = Symbol.for("react.consumer"), s = Symbol.for("react.context"), c = Symbol.for("react.forward_ref"), l = Symbol.for("react.suspense"), u = Symbol.for("react.memo"), d = Symbol.for("react.lazy"), f = Symbol.for("react.activity"), p = Symbol.iterator;
	function m(e) {
		return typeof e != "object" || !e ? null : (e = p && e[p] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var h = {
		isMounted: function() {
			return !1;
		},
		enqueueForceUpdate: function() {},
		enqueueReplaceState: function() {},
		enqueueSetState: function() {}
	}, g = Object.assign, _ = {};
	function v(e, t, n) {
		this.props = e, this.context = t, this.refs = _, this.updater = n || h;
	}
	v.prototype.isReactComponent = {}, v.prototype.setState = function(e, t) {
		if (typeof e != "object" && typeof e != "function" && e != null) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
		this.updater.enqueueSetState(this, e, t, "setState");
	}, v.prototype.forceUpdate = function(e) {
		this.updater.enqueueForceUpdate(this, e, "forceUpdate");
	};
	function y() {}
	y.prototype = v.prototype;
	function b(e, t, n) {
		this.props = e, this.context = t, this.refs = _, this.updater = n || h;
	}
	var x = b.prototype = new y();
	x.constructor = b, g(x, v.prototype), x.isPureReactComponent = !0;
	var S = Array.isArray;
	function C() {}
	var w = {
		H: null,
		A: null,
		T: null,
		S: null
	}, T = Object.prototype.hasOwnProperty;
	function E(e, n, r) {
		var i = r.ref;
		return {
			$$typeof: t,
			type: e,
			key: n,
			ref: i === void 0 ? null : i,
			props: r
		};
	}
	function ee(e, t) {
		return E(e.type, t, e.props);
	}
	function D(e) {
		return typeof e == "object" && !!e && e.$$typeof === t;
	}
	function te(e) {
		var t = {
			"=": "=0",
			":": "=2"
		};
		return "$" + e.replace(/[=:]/g, function(e) {
			return t[e];
		});
	}
	var ne = /\/+/g;
	function O(e, t) {
		return typeof e == "object" && e && e.key != null ? te("" + e.key) : t.toString(36);
	}
	function re(e) {
		switch (e.status) {
			case "fulfilled": return e.value;
			case "rejected": throw e.reason;
			default: switch (typeof e.status == "string" ? e.then(C, C) : (e.status = "pending", e.then(function(t) {
				e.status === "pending" && (e.status = "fulfilled", e.value = t);
			}, function(t) {
				e.status === "pending" && (e.status = "rejected", e.reason = t);
			})), e.status) {
				case "fulfilled": return e.value;
				case "rejected": throw e.reason;
			}
		}
		throw e;
	}
	function ie(e, r, i, a, o) {
		var s = typeof e;
		(s === "undefined" || s === "boolean") && (e = null);
		var c = !1;
		if (e === null) c = !0;
		else switch (s) {
			case "bigint":
			case "string":
			case "number":
				c = !0;
				break;
			case "object": switch (e.$$typeof) {
				case t:
				case n:
					c = !0;
					break;
				case d: return c = e._init, ie(c(e._payload), r, i, a, o);
			}
		}
		if (c) return o = o(e), c = a === "" ? "." + O(e, 0) : a, S(o) ? (i = "", c != null && (i = c.replace(ne, "$&/") + "/"), ie(o, r, i, "", function(e) {
			return e;
		})) : o != null && (D(o) && (o = ee(o, i + (o.key == null || e && e.key === o.key ? "" : ("" + o.key).replace(ne, "$&/") + "/") + c)), r.push(o)), 1;
		c = 0;
		var l = a === "" ? "." : a + ":";
		if (S(e)) for (var u = 0; u < e.length; u++) a = e[u], s = l + O(a, u), c += ie(a, r, i, s, o);
		else if (u = m(e), typeof u == "function") for (e = u.call(e), u = 0; !(a = e.next()).done;) a = a.value, s = l + O(a, u++), c += ie(a, r, i, s, o);
		else if (s === "object") {
			if (typeof e.then == "function") return ie(re(e), r, i, a, o);
			throw r = String(e), Error("Objects are not valid as a React child (found: " + (r === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : r) + "). If you meant to render a collection of children, use an array instead.");
		}
		return c;
	}
	function ae(e, t, n) {
		if (e == null) return e;
		var r = [], i = 0;
		return ie(e, r, "", "", function(e) {
			return t.call(n, e, i++);
		}), r;
	}
	function oe(e) {
		if (e._status === -1) {
			var t = e._result;
			t = t(), t.then(function(t) {
				(e._status === 0 || e._status === -1) && (e._status = 1, e._result = t);
			}, function(t) {
				(e._status === 0 || e._status === -1) && (e._status = 2, e._result = t);
			}), e._status === -1 && (e._status = 0, e._result = t);
		}
		if (e._status === 1) return e._result.default;
		throw e._result;
	}
	var k = typeof reportError == "function" ? reportError : function(e) {
		if (typeof window == "object" && typeof window.ErrorEvent == "function") {
			var t = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: typeof e == "object" && e && typeof e.message == "string" ? String(e.message) : String(e),
				error: e
			});
			if (!window.dispatchEvent(t)) return;
		} else if (typeof process == "object" && typeof process.emit == "function") {
			process.emit("uncaughtException", e);
			return;
		}
		console.error(e);
	}, A = {
		map: ae,
		forEach: function(e, t, n) {
			ae(e, function() {
				t.apply(this, arguments);
			}, n);
		},
		count: function(e) {
			var t = 0;
			return ae(e, function() {
				t++;
			}), t;
		},
		toArray: function(e) {
			return ae(e, function(e) {
				return e;
			}) || [];
		},
		only: function(e) {
			if (!D(e)) throw Error("React.Children.only expected to receive a single React element child.");
			return e;
		}
	};
	e.Activity = f, e.Children = A, e.Component = v, e.Fragment = r, e.Profiler = a, e.PureComponent = b, e.StrictMode = i, e.Suspense = l, e.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = w, e.__COMPILER_RUNTIME = {
		__proto__: null,
		c: function(e) {
			return w.H.useMemoCache(e);
		}
	}, e.cache = function(e) {
		return function() {
			return e.apply(null, arguments);
		};
	}, e.cacheSignal = function() {
		return null;
	}, e.cloneElement = function(e, t, n) {
		if (e == null) throw Error("The argument must be a React element, but you passed " + e + ".");
		var r = g({}, e.props), i = e.key;
		if (t != null) for (a in t.key !== void 0 && (i = "" + t.key), t) !T.call(t, a) || a === "key" || a === "__self" || a === "__source" || a === "ref" && t.ref === void 0 || (r[a] = t[a]);
		var a = arguments.length - 2;
		if (a === 1) r.children = n;
		else if (1 < a) {
			for (var o = Array(a), s = 0; s < a; s++) o[s] = arguments[s + 2];
			r.children = o;
		}
		return E(e.type, i, r);
	}, e.createContext = function(e) {
		return e = {
			$$typeof: s,
			_currentValue: e,
			_currentValue2: e,
			_threadCount: 0,
			Provider: null,
			Consumer: null
		}, e.Provider = e, e.Consumer = {
			$$typeof: o,
			_context: e
		}, e;
	}, e.createElement = function(e, t, n) {
		var r, i = {}, a = null;
		if (t != null) for (r in t.key !== void 0 && (a = "" + t.key), t) T.call(t, r) && r !== "key" && r !== "__self" && r !== "__source" && (i[r] = t[r]);
		var o = arguments.length - 2;
		if (o === 1) i.children = n;
		else if (1 < o) {
			for (var s = Array(o), c = 0; c < o; c++) s[c] = arguments[c + 2];
			i.children = s;
		}
		if (e && e.defaultProps) for (r in o = e.defaultProps, o) i[r] === void 0 && (i[r] = o[r]);
		return E(e, a, i);
	}, e.createRef = function() {
		return { current: null };
	}, e.forwardRef = function(e) {
		return {
			$$typeof: c,
			render: e
		};
	}, e.isValidElement = D, e.lazy = function(e) {
		return {
			$$typeof: d,
			_payload: {
				_status: -1,
				_result: e
			},
			_init: oe
		};
	}, e.memo = function(e, t) {
		return {
			$$typeof: u,
			type: e,
			compare: t === void 0 ? null : t
		};
	}, e.startTransition = function(e) {
		var t = w.T, n = {};
		w.T = n;
		try {
			var r = e(), i = w.S;
			i !== null && i(n, r), typeof r == "object" && r && typeof r.then == "function" && r.then(C, k);
		} catch (e) {
			k(e);
		} finally {
			t !== null && n.types !== null && (t.types = n.types), w.T = t;
		}
	}, e.unstable_useCacheRefresh = function() {
		return w.H.useCacheRefresh();
	}, e.use = function(e) {
		return w.H.use(e);
	}, e.useActionState = function(e, t, n) {
		return w.H.useActionState(e, t, n);
	}, e.useCallback = function(e, t) {
		return w.H.useCallback(e, t);
	}, e.useContext = function(e) {
		return w.H.useContext(e);
	}, e.useDebugValue = function() {}, e.useDeferredValue = function(e, t) {
		return w.H.useDeferredValue(e, t);
	}, e.useEffect = function(e, t) {
		return w.H.useEffect(e, t);
	}, e.useEffectEvent = function(e) {
		return w.H.useEffectEvent(e);
	}, e.useId = function() {
		return w.H.useId();
	}, e.useImperativeHandle = function(e, t, n) {
		return w.H.useImperativeHandle(e, t, n);
	}, e.useInsertionEffect = function(e, t) {
		return w.H.useInsertionEffect(e, t);
	}, e.useLayoutEffect = function(e, t) {
		return w.H.useLayoutEffect(e, t);
	}, e.useMemo = function(e, t) {
		return w.H.useMemo(e, t);
	}, e.useOptimistic = function(e, t) {
		return w.H.useOptimistic(e, t);
	}, e.useReducer = function(e, t, n) {
		return w.H.useReducer(e, t, n);
	}, e.useRef = function(e) {
		return w.H.useRef(e);
	}, e.useState = function(e) {
		return w.H.useState(e);
	}, e.useSyncExternalStore = function(e, t, n) {
		return w.H.useSyncExternalStore(e, t, n);
	}, e.useTransition = function() {
		return w.H.useTransition();
	}, e.version = "19.2.8";
})), n = /* @__PURE__ */ e(((e, n) => {
	n.exports = t();
})), r = /* @__PURE__ */ e(((e) => {
	function t(e, t) {
		var n = e.length;
		e.push(t);
		a: for (; 0 < n;) {
			var r = n - 1 >>> 1, a = e[r];
			if (0 < i(a, t)) e[r] = t, e[n] = a, n = r;
			else break a;
		}
	}
	function n(e) {
		return e.length === 0 ? null : e[0];
	}
	function r(e) {
		if (e.length === 0) return null;
		var t = e[0], n = e.pop();
		if (n !== t) {
			e[0] = n;
			a: for (var r = 0, a = e.length, o = a >>> 1; r < o;) {
				var s = 2 * (r + 1) - 1, c = e[s], l = s + 1, u = e[l];
				if (0 > i(c, n)) l < a && 0 > i(u, c) ? (e[r] = u, e[l] = n, r = l) : (e[r] = c, e[s] = n, r = s);
				else if (l < a && 0 > i(u, n)) e[r] = u, e[l] = n, r = l;
				else break a;
			}
		}
		return t;
	}
	function i(e, t) {
		var n = e.sortIndex - t.sortIndex;
		return n === 0 ? e.id - t.id : n;
	}
	if (e.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
		var a = performance;
		e.unstable_now = function() {
			return a.now();
		};
	} else {
		var o = Date, s = o.now();
		e.unstable_now = function() {
			return o.now() - s;
		};
	}
	var c = [], l = [], u = 1, d = null, f = 3, p = !1, m = !1, h = !1, g = !1, _ = typeof setTimeout == "function" ? setTimeout : null, v = typeof clearTimeout == "function" ? clearTimeout : null, y = typeof setImmediate < "u" ? setImmediate : null;
	function b(e) {
		for (var i = n(l); i !== null;) {
			if (i.callback === null) r(l);
			else if (i.startTime <= e) r(l), i.sortIndex = i.expirationTime, t(c, i);
			else break;
			i = n(l);
		}
	}
	function x(e) {
		if (h = !1, b(e), !m) if (n(c) !== null) m = !0, S || (S = !0, D());
		else {
			var t = n(l);
			t !== null && O(x, t.startTime - e);
		}
	}
	var S = !1, C = -1, w = 5, T = -1;
	function E() {
		return g ? !0 : !(e.unstable_now() - T < w);
	}
	function ee() {
		if (g = !1, S) {
			var t = e.unstable_now();
			T = t;
			var i = !0;
			try {
				a: {
					m = !1, h && (h = !1, v(C), C = -1), p = !0;
					var a = f;
					try {
						b: {
							for (b(t), d = n(c); d !== null && !(d.expirationTime > t && E());) {
								var o = d.callback;
								if (typeof o == "function") {
									d.callback = null, f = d.priorityLevel;
									var s = o(d.expirationTime <= t);
									if (t = e.unstable_now(), typeof s == "function") {
										d.callback = s, b(t), i = !0;
										break b;
									}
									d === n(c) && r(c), b(t);
								} else r(c);
								d = n(c);
							}
							if (d !== null) i = !0;
							else {
								var u = n(l);
								u !== null && O(x, u.startTime - t), i = !1;
							}
						}
						break a;
					} finally {
						d = null, f = a, p = !1;
					}
				}
			} finally {
				i ? D() : S = !1;
			}
		}
	}
	var D;
	if (typeof y == "function") D = function() {
		y(ee);
	};
	else if (typeof MessageChannel < "u") {
		var te = new MessageChannel(), ne = te.port2;
		te.port1.onmessage = ee, D = function() {
			ne.postMessage(null);
		};
	} else D = function() {
		_(ee, 0);
	};
	function O(t, n) {
		C = _(function() {
			t(e.unstable_now());
		}, n);
	}
	e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(e) {
		e.callback = null;
	}, e.unstable_forceFrameRate = function(e) {
		0 > e || 125 < e ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : w = 0 < e ? Math.floor(1e3 / e) : 5;
	}, e.unstable_getCurrentPriorityLevel = function() {
		return f;
	}, e.unstable_next = function(e) {
		switch (f) {
			case 1:
			case 2:
			case 3:
				var t = 3;
				break;
			default: t = f;
		}
		var n = f;
		f = t;
		try {
			return e();
		} finally {
			f = n;
		}
	}, e.unstable_requestPaint = function() {
		g = !0;
	}, e.unstable_runWithPriority = function(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 3:
			case 4:
			case 5: break;
			default: e = 3;
		}
		var n = f;
		f = e;
		try {
			return t();
		} finally {
			f = n;
		}
	}, e.unstable_scheduleCallback = function(r, i, a) {
		var o = e.unstable_now();
		switch (typeof a == "object" && a ? (a = a.delay, a = typeof a == "number" && 0 < a ? o + a : o) : a = o, r) {
			case 1:
				var s = -1;
				break;
			case 2:
				s = 250;
				break;
			case 5:
				s = 1073741823;
				break;
			case 4:
				s = 1e4;
				break;
			default: s = 5e3;
		}
		return s = a + s, r = {
			id: u++,
			callback: i,
			priorityLevel: r,
			startTime: a,
			expirationTime: s,
			sortIndex: -1
		}, a > o ? (r.sortIndex = a, t(l, r), n(c) === null && r === n(l) && (h ? (v(C), C = -1) : h = !0, O(x, a - o))) : (r.sortIndex = s, t(c, r), m || p || (m = !0, S || (S = !0, D()))), r;
	}, e.unstable_shouldYield = E, e.unstable_wrapCallback = function(e) {
		var t = f;
		return function() {
			var n = f;
			f = t;
			try {
				return e.apply(this, arguments);
			} finally {
				f = n;
			}
		};
	};
})), i = /* @__PURE__ */ e(((e, t) => {
	t.exports = r();
})), a = /* @__PURE__ */ e(((e) => {
	var t = n();
	function r(e) {
		var t = "https://react.dev/errors/" + e;
		if (1 < arguments.length) {
			t += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var n = 2; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
		}
		return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function i() {}
	var a = {
		d: {
			f: i,
			r: function() {
				throw Error(r(522));
			},
			D: i,
			C: i,
			L: i,
			m: i,
			X: i,
			S: i,
			M: i
		},
		p: 0,
		findDOMNode: null
	}, o = Symbol.for("react.portal");
	function s(e, t, n) {
		var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
		return {
			$$typeof: o,
			key: r == null ? null : "" + r,
			children: e,
			containerInfo: t,
			implementation: n
		};
	}
	var c = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
	function l(e, t) {
		if (e === "font") return "";
		if (typeof t == "string") return t === "use-credentials" ? t : "";
	}
	e.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = a, e.createPortal = function(e, t) {
		var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
		if (!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11) throw Error(r(299));
		return s(e, t, null, n);
	}, e.flushSync = function(e) {
		var t = c.T, n = a.p;
		try {
			if (c.T = null, a.p = 2, e) return e();
		} finally {
			c.T = t, a.p = n, a.d.f();
		}
	}, e.preconnect = function(e, t) {
		typeof e == "string" && (t ? (t = t.crossOrigin, t = typeof t == "string" ? t === "use-credentials" ? t : "" : void 0) : t = null, a.d.C(e, t));
	}, e.prefetchDNS = function(e) {
		typeof e == "string" && a.d.D(e);
	}, e.preinit = function(e, t) {
		if (typeof e == "string" && t && typeof t.as == "string") {
			var n = t.as, r = l(n, t.crossOrigin), i = typeof t.integrity == "string" ? t.integrity : void 0, o = typeof t.fetchPriority == "string" ? t.fetchPriority : void 0;
			n === "style" ? a.d.S(e, typeof t.precedence == "string" ? t.precedence : void 0, {
				crossOrigin: r,
				integrity: i,
				fetchPriority: o
			}) : n === "script" && a.d.X(e, {
				crossOrigin: r,
				integrity: i,
				fetchPriority: o,
				nonce: typeof t.nonce == "string" ? t.nonce : void 0
			});
		}
	}, e.preinitModule = function(e, t) {
		if (typeof e == "string") if (typeof t == "object" && t) {
			if (t.as == null || t.as === "script") {
				var n = l(t.as, t.crossOrigin);
				a.d.M(e, {
					crossOrigin: n,
					integrity: typeof t.integrity == "string" ? t.integrity : void 0,
					nonce: typeof t.nonce == "string" ? t.nonce : void 0
				});
			}
		} else t ?? a.d.M(e);
	}, e.preload = function(e, t) {
		if (typeof e == "string" && typeof t == "object" && t && typeof t.as == "string") {
			var n = t.as, r = l(n, t.crossOrigin);
			a.d.L(e, n, {
				crossOrigin: r,
				integrity: typeof t.integrity == "string" ? t.integrity : void 0,
				nonce: typeof t.nonce == "string" ? t.nonce : void 0,
				type: typeof t.type == "string" ? t.type : void 0,
				fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : void 0,
				referrerPolicy: typeof t.referrerPolicy == "string" ? t.referrerPolicy : void 0,
				imageSrcSet: typeof t.imageSrcSet == "string" ? t.imageSrcSet : void 0,
				imageSizes: typeof t.imageSizes == "string" ? t.imageSizes : void 0,
				media: typeof t.media == "string" ? t.media : void 0
			});
		}
	}, e.preloadModule = function(e, t) {
		if (typeof e == "string") if (t) {
			var n = l(t.as, t.crossOrigin);
			a.d.m(e, {
				as: typeof t.as == "string" && t.as !== "script" ? t.as : void 0,
				crossOrigin: n,
				integrity: typeof t.integrity == "string" ? t.integrity : void 0
			});
		} else a.d.m(e);
	}, e.requestFormReset = function(e) {
		a.d.r(e);
	}, e.unstable_batchedUpdates = function(e, t) {
		return e(t);
	}, e.useFormState = function(e, t, n) {
		return c.H.useFormState(e, t, n);
	}, e.useFormStatus = function() {
		return c.H.useHostTransitionStatus();
	}, e.version = "19.2.8";
})), o = /* @__PURE__ */ e(((e, t) => {
	function n() {
		if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function")) try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
		} catch (e) {
			console.error(e);
		}
	}
	n(), t.exports = a();
})), s = /* @__PURE__ */ e(((e) => {
	var t = i(), r = n(), a = o();
	function s(e) {
		var t = "https://react.dev/errors/" + e;
		if (1 < arguments.length) {
			t += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var n = 2; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
		}
		return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function c(e) {
		return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
	}
	function l(e) {
		var t = e, n = e;
		if (e.alternate) for (; t.return;) t = t.return;
		else {
			e = t;
			do
				t = e, t.flags & 4098 && (n = t.return), e = t.return;
			while (e);
		}
		return t.tag === 3 ? n : null;
	}
	function u(e) {
		if (e.tag === 13) {
			var t = e.memoizedState;
			if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
		}
		return null;
	}
	function d(e) {
		if (e.tag === 31) {
			var t = e.memoizedState;
			if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
		}
		return null;
	}
	function f(e) {
		if (l(e) !== e) throw Error(s(188));
	}
	function p(e) {
		var t = e.alternate;
		if (!t) {
			if (t = l(e), t === null) throw Error(s(188));
			return t === e ? e : null;
		}
		for (var n = e, r = t;;) {
			var i = n.return;
			if (i === null) break;
			var a = i.alternate;
			if (a === null) {
				if (r = i.return, r !== null) {
					n = r;
					continue;
				}
				break;
			}
			if (i.child === a.child) {
				for (a = i.child; a;) {
					if (a === n) return f(i), e;
					if (a === r) return f(i), t;
					a = a.sibling;
				}
				throw Error(s(188));
			}
			if (n.return !== r.return) n = i, r = a;
			else {
				for (var o = !1, c = i.child; c;) {
					if (c === n) {
						o = !0, n = i, r = a;
						break;
					}
					if (c === r) {
						o = !0, r = i, n = a;
						break;
					}
					c = c.sibling;
				}
				if (!o) {
					for (c = a.child; c;) {
						if (c === n) {
							o = !0, n = a, r = i;
							break;
						}
						if (c === r) {
							o = !0, r = a, n = i;
							break;
						}
						c = c.sibling;
					}
					if (!o) throw Error(s(189));
				}
			}
			if (n.alternate !== r) throw Error(s(190));
		}
		if (n.tag !== 3) throw Error(s(188));
		return n.stateNode.current === n ? e : t;
	}
	function m(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e;
		for (e = e.child; e !== null;) {
			if (t = m(e), t !== null) return t;
			e = e.sibling;
		}
		return null;
	}
	var h = Object.assign, g = Symbol.for("react.element"), _ = Symbol.for("react.transitional.element"), v = Symbol.for("react.portal"), y = Symbol.for("react.fragment"), b = Symbol.for("react.strict_mode"), x = Symbol.for("react.profiler"), S = Symbol.for("react.consumer"), C = Symbol.for("react.context"), w = Symbol.for("react.forward_ref"), T = Symbol.for("react.suspense"), E = Symbol.for("react.suspense_list"), ee = Symbol.for("react.memo"), D = Symbol.for("react.lazy"), te = Symbol.for("react.activity"), ne = Symbol.for("react.memo_cache_sentinel"), O = Symbol.iterator;
	function re(e) {
		return typeof e != "object" || !e ? null : (e = O && e[O] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var ie = Symbol.for("react.client.reference");
	function ae(e) {
		if (e == null) return null;
		if (typeof e == "function") return e.$$typeof === ie ? null : e.displayName || e.name || null;
		if (typeof e == "string") return e;
		switch (e) {
			case y: return "Fragment";
			case x: return "Profiler";
			case b: return "StrictMode";
			case T: return "Suspense";
			case E: return "SuspenseList";
			case te: return "Activity";
		}
		if (typeof e == "object") switch (e.$$typeof) {
			case v: return "Portal";
			case C: return e.displayName || "Context";
			case S: return (e._context.displayName || "Context") + ".Consumer";
			case w:
				var t = e.render;
				return e = e.displayName, e ||= (e = t.displayName || t.name || "", e === "" ? "ForwardRef" : "ForwardRef(" + e + ")"), e;
			case ee: return t = e.displayName || null, t === null ? ae(e.type) || "Memo" : t;
			case D:
				t = e._payload, e = e._init;
				try {
					return ae(e(t));
				} catch {}
		}
		return null;
	}
	var oe = Array.isArray, k = r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, A = a.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, se = {
		pending: !1,
		data: null,
		method: null,
		action: null
	}, j = [], ce = -1;
	function le(e) {
		return { current: e };
	}
	function M(e) {
		0 > ce || (e.current = j[ce], j[ce] = null, ce--);
	}
	function N(e, t) {
		ce++, j[ce] = e.current, e.current = t;
	}
	var ue = le(null), de = le(null), fe = le(null), pe = le(null);
	function me(e, t) {
		switch (N(fe, t), N(de, e), N(ue, null), t.nodeType) {
			case 9:
			case 11:
				e = (e = t.documentElement) && (e = e.namespaceURI) ? Vd(e) : 0;
				break;
			default: if (e = t.tagName, t = t.namespaceURI) t = Vd(t), e = Hd(t, e);
			else switch (e) {
				case "svg":
					e = 1;
					break;
				case "math":
					e = 2;
					break;
				default: e = 0;
			}
		}
		M(ue), N(ue, e);
	}
	function he() {
		M(ue), M(de), M(fe);
	}
	function ge(e) {
		e.memoizedState !== null && N(pe, e);
		var t = ue.current, n = Hd(t, e.type);
		t !== n && (N(de, e), N(ue, n));
	}
	function _e(e) {
		de.current === e && (M(ue), M(de)), pe.current === e && (M(pe), Qf._currentValue = se);
	}
	var ve, ye;
	function be(e) {
		if (ve === void 0) try {
			throw Error();
		} catch (e) {
			var t = e.stack.trim().match(/\n( *(at )?)/);
			ve = t && t[1] || "", ye = -1 < e.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < e.stack.indexOf("@") ? "@unknown:0:0" : "";
		}
		return "\n" + ve + e + ye;
	}
	var xe = !1;
	function Se(e, t) {
		if (!e || xe) return "";
		xe = !0;
		var n = Error.prepareStackTrace;
		Error.prepareStackTrace = void 0;
		try {
			var r = { DetermineComponentFrameRoot: function() {
				try {
					if (t) {
						var n = function() {
							throw Error();
						};
						if (Object.defineProperty(n.prototype, "props", { set: function() {
							throw Error();
						} }), typeof Reflect == "object" && Reflect.construct) {
							try {
								Reflect.construct(n, []);
							} catch (e) {
								var r = e;
							}
							Reflect.construct(e, [], n);
						} else {
							try {
								n.call();
							} catch (e) {
								r = e;
							}
							e.call(n.prototype);
						}
					} else {
						try {
							throw Error();
						} catch (e) {
							r = e;
						}
						(n = e()) && typeof n.catch == "function" && n.catch(function() {});
					}
				} catch (e) {
					if (e && r && typeof e.stack == "string") return [e.stack, r.stack];
				}
				return [null, null];
			} };
			r.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
			var i = Object.getOwnPropertyDescriptor(r.DetermineComponentFrameRoot, "name");
			i && i.configurable && Object.defineProperty(r.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
			var a = r.DetermineComponentFrameRoot(), o = a[0], s = a[1];
			if (o && s) {
				var c = o.split("\n"), l = s.split("\n");
				for (i = r = 0; r < c.length && !c[r].includes("DetermineComponentFrameRoot");) r++;
				for (; i < l.length && !l[i].includes("DetermineComponentFrameRoot");) i++;
				if (r === c.length || i === l.length) for (r = c.length - 1, i = l.length - 1; 1 <= r && 0 <= i && c[r] !== l[i];) i--;
				for (; 1 <= r && 0 <= i; r--, i--) if (c[r] !== l[i]) {
					if (r !== 1 || i !== 1) do
						if (r--, i--, 0 > i || c[r] !== l[i]) {
							var u = "\n" + c[r].replace(" at new ", " at ");
							return e.displayName && u.includes("<anonymous>") && (u = u.replace("<anonymous>", e.displayName)), u;
						}
					while (1 <= r && 0 <= i);
					break;
				}
			}
		} finally {
			xe = !1, Error.prepareStackTrace = n;
		}
		return (n = e ? e.displayName || e.name : "") ? be(n) : "";
	}
	function Ce(e, t) {
		switch (e.tag) {
			case 26:
			case 27:
			case 5: return be(e.type);
			case 16: return be("Lazy");
			case 13: return e.child !== t && t !== null ? be("Suspense Fallback") : be("Suspense");
			case 19: return be("SuspenseList");
			case 0:
			case 15: return Se(e.type, !1);
			case 11: return Se(e.type.render, !1);
			case 1: return Se(e.type, !0);
			case 31: return be("Activity");
			default: return "";
		}
	}
	function we(e) {
		try {
			var t = "", n = null;
			do
				t += Ce(e, n), n = e, e = e.return;
			while (e);
			return t;
		} catch (e) {
			return "\nError generating stack: " + e.message + "\n" + e.stack;
		}
	}
	var Te = Object.prototype.hasOwnProperty, Ee = t.unstable_scheduleCallback, De = t.unstable_cancelCallback, Oe = t.unstable_shouldYield, ke = t.unstable_requestPaint, Ae = t.unstable_now, je = t.unstable_getCurrentPriorityLevel, Me = t.unstable_ImmediatePriority, Ne = t.unstable_UserBlockingPriority, Pe = t.unstable_NormalPriority, Fe = t.unstable_LowPriority, Ie = t.unstable_IdlePriority, Le = t.log, Re = t.unstable_setDisableYieldValue, ze = null, Be = null;
	function Ve(e) {
		if (typeof Le == "function" && Re(e), Be && typeof Be.setStrictMode == "function") try {
			Be.setStrictMode(ze, e);
		} catch {}
	}
	var P = Math.clz32 ? Math.clz32 : We, He = Math.log, Ue = Math.LN2;
	function We(e) {
		return e >>>= 0, e === 0 ? 32 : 31 - (He(e) / Ue | 0) | 0;
	}
	var Ge = 256, Ke = 262144, qe = 4194304;
	function F(e) {
		var t = e & 42;
		if (t !== 0) return t;
		switch (e & -e) {
			case 1: return 1;
			case 2: return 2;
			case 4: return 4;
			case 8: return 8;
			case 16: return 16;
			case 32: return 32;
			case 64: return 64;
			case 128: return 128;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072: return e & 261888;
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return e & 3932160;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432: return e & 62914560;
			case 67108864: return 67108864;
			case 134217728: return 134217728;
			case 268435456: return 268435456;
			case 536870912: return 536870912;
			case 1073741824: return 0;
			default: return e;
		}
	}
	function Je(e, t, n) {
		var r = e.pendingLanes;
		if (r === 0) return 0;
		var i = 0, a = e.suspendedLanes, o = e.pingedLanes;
		e = e.warmLanes;
		var s = r & 134217727;
		return s === 0 ? (s = r & ~a, s === 0 ? o === 0 ? n || (n = r & ~e, n !== 0 && (i = F(n))) : i = F(o) : i = F(s)) : (r = s & ~a, r === 0 ? (o &= s, o === 0 ? n || (n = s & ~e, n !== 0 && (i = F(n))) : i = F(o)) : i = F(r)), i === 0 ? 0 : t !== 0 && t !== i && (t & a) === 0 && (a = i & -i, n = t & -t, a >= n || a === 32 && n & 4194048) ? t : i;
	}
	function Ye(e, t) {
		return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
	}
	function Xe(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 4:
			case 8:
			case 64: return t + 250;
			case 16:
			case 32:
			case 128:
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return t + 5e3;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432: return -1;
			case 67108864:
			case 134217728:
			case 268435456:
			case 536870912:
			case 1073741824: return -1;
			default: return -1;
		}
	}
	function Ze() {
		var e = qe;
		return qe <<= 1, !(qe & 62914560) && (qe = 4194304), e;
	}
	function Qe(e) {
		for (var t = [], n = 0; 31 > n; n++) t.push(e);
		return t;
	}
	function $e(e, t) {
		e.pendingLanes |= t, t !== 268435456 && (e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0);
	}
	function et(e, t, n, r, i, a) {
		var o = e.pendingLanes;
		e.pendingLanes = n, e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0, e.expiredLanes &= n, e.entangledLanes &= n, e.errorRecoveryDisabledLanes &= n, e.shellSuspendCounter = 0;
		var s = e.entanglements, c = e.expirationTimes, l = e.hiddenUpdates;
		for (n = o & ~n; 0 < n;) {
			var u = 31 - P(n), d = 1 << u;
			s[u] = 0, c[u] = -1;
			var f = l[u];
			if (f !== null) for (l[u] = null, u = 0; u < f.length; u++) {
				var p = f[u];
				p !== null && (p.lane &= -536870913);
			}
			n &= ~d;
		}
		r !== 0 && tt(e, r, 0), a !== 0 && i === 0 && e.tag !== 0 && (e.suspendedLanes |= a & ~(o & ~t));
	}
	function tt(e, t, n) {
		e.pendingLanes |= t, e.suspendedLanes &= ~t;
		var r = 31 - P(t);
		e.entangledLanes |= t, e.entanglements[r] = e.entanglements[r] | 1073741824 | n & 261930;
	}
	function I(e, t) {
		var n = e.entangledLanes |= t;
		for (e = e.entanglements; n;) {
			var r = 31 - P(n), i = 1 << r;
			i & t | e[r] & t && (e[r] |= t), n &= ~i;
		}
	}
	function nt(e, t) {
		var n = t & -t;
		return n = n & 42 ? 1 : rt(n), (n & (e.suspendedLanes | t)) === 0 ? n : 0;
	}
	function rt(e) {
		switch (e) {
			case 2:
				e = 1;
				break;
			case 8:
				e = 4;
				break;
			case 32:
				e = 16;
				break;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152:
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432:
				e = 128;
				break;
			case 268435456:
				e = 134217728;
				break;
			default: e = 0;
		}
		return e;
	}
	function it(e) {
		return e &= -e, 2 < e ? 8 < e ? e & 134217727 ? 32 : 268435456 : 8 : 2;
	}
	function at() {
		var e = A.p;
		return e === 0 ? (e = window.event, e === void 0 ? 32 : mp(e.type)) : e;
	}
	function ot(e, t) {
		var n = A.p;
		try {
			return A.p = e, t();
		} finally {
			A.p = n;
		}
	}
	var st = Math.random().toString(36).slice(2), L = "__reactFiber$" + st, R = "__reactProps$" + st, ct = "__reactContainer$" + st, lt = "__reactEvents$" + st, ut = "__reactListeners$" + st, dt = "__reactHandles$" + st, ft = "__reactResources$" + st, pt = "__reactMarker$" + st;
	function mt(e) {
		delete e[L], delete e[R], delete e[lt], delete e[ut], delete e[dt];
	}
	function ht(e) {
		var t = e[L];
		if (t) return t;
		for (var n = e.parentNode; n;) {
			if (t = n[ct] || n[L]) {
				if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = df(e); e !== null;) {
					if (n = e[L]) return n;
					e = df(e);
				}
				return t;
			}
			e = n, n = e.parentNode;
		}
		return null;
	}
	function gt(e) {
		if (e = e[L] || e[ct]) {
			var t = e.tag;
			if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3) return e;
		}
		return null;
	}
	function _t(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
		throw Error(s(33));
	}
	function vt(e) {
		var t = e[ft];
		return t ||= e[ft] = {
			hoistableStyles: /* @__PURE__ */ new Map(),
			hoistableScripts: /* @__PURE__ */ new Map()
		}, t;
	}
	function yt(e) {
		e[pt] = !0;
	}
	var bt = /* @__PURE__ */ new Set(), xt = {};
	function St(e, t) {
		Ct(e, t), Ct(e + "Capture", t);
	}
	function Ct(e, t) {
		for (xt[e] = t, e = 0; e < t.length; e++) bt.add(t[e]);
	}
	var wt = RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"), Tt = {}, z = {};
	function Et(e) {
		return Te.call(z, e) ? !0 : Te.call(Tt, e) ? !1 : wt.test(e) ? z[e] = !0 : (Tt[e] = !0, !1);
	}
	function Dt(e, t, n) {
		if (Et(t)) if (n === null) e.removeAttribute(t);
		else {
			switch (typeof n) {
				case "undefined":
				case "function":
				case "symbol":
					e.removeAttribute(t);
					return;
				case "boolean":
					var r = t.toLowerCase().slice(0, 5);
					if (r !== "data-" && r !== "aria-") {
						e.removeAttribute(t);
						return;
					}
			}
			e.setAttribute(t, "" + n);
		}
	}
	function Ot(e, t, n) {
		if (n === null) e.removeAttribute(t);
		else {
			switch (typeof n) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					e.removeAttribute(t);
					return;
			}
			e.setAttribute(t, "" + n);
		}
	}
	function kt(e, t, n, r) {
		if (r === null) e.removeAttribute(n);
		else {
			switch (typeof r) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					e.removeAttribute(n);
					return;
			}
			e.setAttributeNS(t, n, "" + r);
		}
	}
	function At(e) {
		switch (typeof e) {
			case "bigint":
			case "boolean":
			case "number":
			case "string":
			case "undefined": return e;
			case "object": return e;
			default: return "";
		}
	}
	function jt(e) {
		var t = e.type;
		return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
	}
	function Mt(e, t, n) {
		var r = Object.getOwnPropertyDescriptor(e.constructor.prototype, t);
		if (!e.hasOwnProperty(t) && r !== void 0 && typeof r.get == "function" && typeof r.set == "function") {
			var i = r.get, a = r.set;
			return Object.defineProperty(e, t, {
				configurable: !0,
				get: function() {
					return i.call(this);
				},
				set: function(e) {
					n = "" + e, a.call(this, e);
				}
			}), Object.defineProperty(e, t, { enumerable: r.enumerable }), {
				getValue: function() {
					return n;
				},
				setValue: function(e) {
					n = "" + e;
				},
				stopTracking: function() {
					e._valueTracker = null, delete e[t];
				}
			};
		}
	}
	function Nt(e) {
		if (!e._valueTracker) {
			var t = jt(e) ? "checked" : "value";
			e._valueTracker = Mt(e, t, "" + e[t]);
		}
	}
	function Pt(e) {
		if (!e) return !1;
		var t = e._valueTracker;
		if (!t) return !0;
		var n = t.getValue(), r = "";
		return e && (r = jt(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n && (t.setValue(e), !0);
	}
	function Ft(e) {
		if (e ||= typeof document < "u" ? document : void 0, e === void 0) return null;
		try {
			return e.activeElement || e.body;
		} catch {
			return e.body;
		}
	}
	var It = /[\n"\\]/g;
	function Lt(e) {
		return e.replace(It, function(e) {
			return "\\" + e.charCodeAt(0).toString(16) + " ";
		});
	}
	function Rt(e, t, n, r, i, a, o, s) {
		e.name = "", o != null && typeof o != "function" && typeof o != "symbol" && typeof o != "boolean" ? e.type = o : e.removeAttribute("type"), t == null ? o !== "submit" && o !== "reset" || e.removeAttribute("value") : o === "number" ? (t === 0 && e.value === "" || e.value != t) && (e.value = "" + At(t)) : e.value !== "" + At(t) && (e.value = "" + At(t)), t == null ? n == null ? r != null && e.removeAttribute("value") : Bt(e, o, At(n)) : Bt(e, o, At(t)), i == null && a != null && (e.defaultChecked = !!a), i != null && (e.checked = i && typeof i != "function" && typeof i != "symbol"), s != null && typeof s != "function" && typeof s != "symbol" && typeof s != "boolean" ? e.name = "" + At(s) : e.removeAttribute("name");
	}
	function zt(e, t, n, r, i, a, o, s) {
		if (a != null && typeof a != "function" && typeof a != "symbol" && typeof a != "boolean" && (e.type = a), t != null || n != null) {
			if (!(a !== "submit" && a !== "reset" || t != null)) {
				Nt(e);
				return;
			}
			n = n == null ? "" : "" + At(n), t = t == null ? n : "" + At(t), s || t === e.value || (e.value = t), e.defaultValue = t;
		}
		r ??= i, r = typeof r != "function" && typeof r != "symbol" && !!r, e.checked = s ? e.checked : !!r, e.defaultChecked = !!r, o != null && typeof o != "function" && typeof o != "symbol" && typeof o != "boolean" && (e.name = o), Nt(e);
	}
	function Bt(e, t, n) {
		t === "number" && Ft(e.ownerDocument) === e || e.defaultValue === "" + n || (e.defaultValue = "" + n);
	}
	function Vt(e, t, n, r) {
		if (e = e.options, t) {
			t = {};
			for (var i = 0; i < n.length; i++) t["$" + n[i]] = !0;
			for (n = 0; n < e.length; n++) i = t.hasOwnProperty("$" + e[n].value), e[n].selected !== i && (e[n].selected = i), i && r && (e[n].defaultSelected = !0);
		} else {
			for (n = "" + At(n), t = null, i = 0; i < e.length; i++) {
				if (e[i].value === n) {
					e[i].selected = !0, r && (e[i].defaultSelected = !0);
					return;
				}
				t !== null || e[i].disabled || (t = e[i]);
			}
			t !== null && (t.selected = !0);
		}
	}
	function Ht(e, t, n) {
		if (t != null && (t = "" + At(t), t !== e.value && (e.value = t), n == null)) {
			e.defaultValue !== t && (e.defaultValue = t);
			return;
		}
		e.defaultValue = n == null ? "" : "" + At(n);
	}
	function Ut(e, t, n, r) {
		if (t == null) {
			if (r != null) {
				if (n != null) throw Error(s(92));
				if (oe(r)) {
					if (1 < r.length) throw Error(s(93));
					r = r[0];
				}
				n = r;
			}
			n ??= "", t = n;
		}
		n = At(t), e.defaultValue = n, r = e.textContent, r === n && r !== "" && r !== null && (e.value = r), Nt(e);
	}
	function Wt(e, t) {
		if (t) {
			var n = e.firstChild;
			if (n && n === e.lastChild && n.nodeType === 3) {
				n.nodeValue = t;
				return;
			}
		}
		e.textContent = t;
	}
	var Gt = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));
	function Kt(e, t, n) {
		var r = t.indexOf("--") === 0;
		n == null || typeof n == "boolean" || n === "" ? r ? e.setProperty(t, "") : t === "float" ? e.cssFloat = "" : e[t] = "" : r ? e.setProperty(t, n) : typeof n != "number" || n === 0 || Gt.has(t) ? t === "float" ? e.cssFloat = n : e[t] = ("" + n).trim() : e[t] = n + "px";
	}
	function qt(e, t, n) {
		if (t != null && typeof t != "object") throw Error(s(62));
		if (e = e.style, n != null) {
			for (var r in n) !n.hasOwnProperty(r) || t != null && t.hasOwnProperty(r) || (r.indexOf("--") === 0 ? e.setProperty(r, "") : r === "float" ? e.cssFloat = "" : e[r] = "");
			for (var i in t) r = t[i], t.hasOwnProperty(i) && n[i] !== r && Kt(e, i, r);
		} else for (var a in t) t.hasOwnProperty(a) && Kt(e, a, t[a]);
	}
	function Jt(e) {
		if (e.indexOf("-") === -1) return !1;
		switch (e) {
			case "annotation-xml":
			case "color-profile":
			case "font-face":
			case "font-face-src":
			case "font-face-uri":
			case "font-face-format":
			case "font-face-name":
			case "missing-glyph": return !1;
			default: return !0;
		}
	}
	var Yt = /* @__PURE__ */ new Map([
		["acceptCharset", "accept-charset"],
		["htmlFor", "for"],
		["httpEquiv", "http-equiv"],
		["crossOrigin", "crossorigin"],
		["accentHeight", "accent-height"],
		["alignmentBaseline", "alignment-baseline"],
		["arabicForm", "arabic-form"],
		["baselineShift", "baseline-shift"],
		["capHeight", "cap-height"],
		["clipPath", "clip-path"],
		["clipRule", "clip-rule"],
		["colorInterpolation", "color-interpolation"],
		["colorInterpolationFilters", "color-interpolation-filters"],
		["colorProfile", "color-profile"],
		["colorRendering", "color-rendering"],
		["dominantBaseline", "dominant-baseline"],
		["enableBackground", "enable-background"],
		["fillOpacity", "fill-opacity"],
		["fillRule", "fill-rule"],
		["floodColor", "flood-color"],
		["floodOpacity", "flood-opacity"],
		["fontFamily", "font-family"],
		["fontSize", "font-size"],
		["fontSizeAdjust", "font-size-adjust"],
		["fontStretch", "font-stretch"],
		["fontStyle", "font-style"],
		["fontVariant", "font-variant"],
		["fontWeight", "font-weight"],
		["glyphName", "glyph-name"],
		["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
		["glyphOrientationVertical", "glyph-orientation-vertical"],
		["horizAdvX", "horiz-adv-x"],
		["horizOriginX", "horiz-origin-x"],
		["imageRendering", "image-rendering"],
		["letterSpacing", "letter-spacing"],
		["lightingColor", "lighting-color"],
		["markerEnd", "marker-end"],
		["markerMid", "marker-mid"],
		["markerStart", "marker-start"],
		["overlinePosition", "overline-position"],
		["overlineThickness", "overline-thickness"],
		["paintOrder", "paint-order"],
		["panose-1", "panose-1"],
		["pointerEvents", "pointer-events"],
		["renderingIntent", "rendering-intent"],
		["shapeRendering", "shape-rendering"],
		["stopColor", "stop-color"],
		["stopOpacity", "stop-opacity"],
		["strikethroughPosition", "strikethrough-position"],
		["strikethroughThickness", "strikethrough-thickness"],
		["strokeDasharray", "stroke-dasharray"],
		["strokeDashoffset", "stroke-dashoffset"],
		["strokeLinecap", "stroke-linecap"],
		["strokeLinejoin", "stroke-linejoin"],
		["strokeMiterlimit", "stroke-miterlimit"],
		["strokeOpacity", "stroke-opacity"],
		["strokeWidth", "stroke-width"],
		["textAnchor", "text-anchor"],
		["textDecoration", "text-decoration"],
		["textRendering", "text-rendering"],
		["transformOrigin", "transform-origin"],
		["underlinePosition", "underline-position"],
		["underlineThickness", "underline-thickness"],
		["unicodeBidi", "unicode-bidi"],
		["unicodeRange", "unicode-range"],
		["unitsPerEm", "units-per-em"],
		["vAlphabetic", "v-alphabetic"],
		["vHanging", "v-hanging"],
		["vIdeographic", "v-ideographic"],
		["vMathematical", "v-mathematical"],
		["vectorEffect", "vector-effect"],
		["vertAdvY", "vert-adv-y"],
		["vertOriginX", "vert-origin-x"],
		["vertOriginY", "vert-origin-y"],
		["wordSpacing", "word-spacing"],
		["writingMode", "writing-mode"],
		["xmlnsXlink", "xmlns:xlink"],
		["xHeight", "x-height"]
	]), Xt = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
	function Zt(e) {
		return Xt.test("" + e) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : e;
	}
	function Qt() {}
	var $t = null;
	function en(e) {
		return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
	}
	var tn = null, nn = null;
	function rn(e) {
		var t = gt(e);
		if (t && (e = t.stateNode)) {
			var n = e[R] || null;
			a: switch (e = t.stateNode, t.type) {
				case "input":
					if (Rt(e, n.value, n.defaultValue, n.defaultValue, n.checked, n.defaultChecked, n.type, n.name), t = n.name, n.type === "radio" && t != null) {
						for (n = e; n.parentNode;) n = n.parentNode;
						for (n = n.querySelectorAll("input[name=\"" + Lt("" + t) + "\"][type=\"radio\"]"), t = 0; t < n.length; t++) {
							var r = n[t];
							if (r !== e && r.form === e.form) {
								var i = r[R] || null;
								if (!i) throw Error(s(90));
								Rt(r, i.value, i.defaultValue, i.defaultValue, i.checked, i.defaultChecked, i.type, i.name);
							}
						}
						for (t = 0; t < n.length; t++) r = n[t], r.form === e.form && Pt(r);
					}
					break a;
				case "textarea":
					Ht(e, n.value, n.defaultValue);
					break a;
				case "select": t = n.value, t != null && Vt(e, !!n.multiple, t, !1);
			}
		}
	}
	var an = !1;
	function on(e, t, n) {
		if (an) return e(t, n);
		an = !0;
		try {
			return e(t);
		} finally {
			if (an = !1, (tn !== null || nn !== null) && (bu(), tn && (t = tn, e = nn, nn = tn = null, rn(t), e))) for (t = 0; t < e.length; t++) rn(e[t]);
		}
	}
	function sn(e, t) {
		var n = e.stateNode;
		if (n === null) return null;
		var r = n[R] || null;
		if (r === null) return null;
		n = r[t];
		a: switch (t) {
			case "onClick":
			case "onClickCapture":
			case "onDoubleClick":
			case "onDoubleClickCapture":
			case "onMouseDown":
			case "onMouseDownCapture":
			case "onMouseMove":
			case "onMouseMoveCapture":
			case "onMouseUp":
			case "onMouseUpCapture":
			case "onMouseEnter":
				(r = !r.disabled) || (e = e.type, r = e !== "button" && e !== "input" && e !== "select" && e !== "textarea"), e = !r;
				break a;
			default: e = !1;
		}
		if (e) return null;
		if (n && typeof n != "function") throw Error(s(231, t, typeof n));
		return n;
	}
	var cn = !(typeof window > "u" || window.document === void 0 || window.document.createElement === void 0), ln = !1;
	if (cn) try {
		var un = {};
		Object.defineProperty(un, "passive", { get: function() {
			ln = !0;
		} }), window.addEventListener("test", un, un), window.removeEventListener("test", un, un);
	} catch {
		ln = !1;
	}
	var dn = null, fn = null, pn = null;
	function mn() {
		if (pn) return pn;
		var e, t = fn, n = t.length, r, i = "value" in dn ? dn.value : dn.textContent, a = i.length;
		for (e = 0; e < n && t[e] === i[e]; e++);
		var o = n - e;
		for (r = 1; r <= o && t[n - r] === i[a - r]; r++);
		return pn = i.slice(e, 1 < r ? 1 - r : void 0);
	}
	function hn(e) {
		var t = e.keyCode;
		return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
	}
	function gn() {
		return !0;
	}
	function _n() {
		return !1;
	}
	function vn(e) {
		function t(t, n, r, i, a) {
			for (var o in this._reactName = t, this._targetInst = r, this.type = n, this.nativeEvent = i, this.target = a, this.currentTarget = null, e) e.hasOwnProperty(o) && (t = e[o], this[o] = t ? t(i) : i[o]);
			return this.isDefaultPrevented = (i.defaultPrevented == null ? !1 === i.returnValue : i.defaultPrevented) ? gn : _n, this.isPropagationStopped = _n, this;
		}
		return h(t.prototype, {
			preventDefault: function() {
				this.defaultPrevented = !0;
				var e = this.nativeEvent;
				e && (e.preventDefault ? e.preventDefault() : typeof e.returnValue != "unknown" && (e.returnValue = !1), this.isDefaultPrevented = gn);
			},
			stopPropagation: function() {
				var e = this.nativeEvent;
				e && (e.stopPropagation ? e.stopPropagation() : typeof e.cancelBubble != "unknown" && (e.cancelBubble = !0), this.isPropagationStopped = gn);
			},
			persist: function() {},
			isPersistent: gn
		}), t;
	}
	var yn = {
		eventPhase: 0,
		bubbles: 0,
		cancelable: 0,
		timeStamp: function(e) {
			return e.timeStamp || Date.now();
		},
		defaultPrevented: 0,
		isTrusted: 0
	}, bn = vn(yn), xn = h({}, yn, {
		view: 0,
		detail: 0
	}), Sn = vn(xn), Cn, wn, Tn, En = h({}, xn, {
		screenX: 0,
		screenY: 0,
		clientX: 0,
		clientY: 0,
		pageX: 0,
		pageY: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		getModifierState: Ln,
		button: 0,
		buttons: 0,
		relatedTarget: function(e) {
			return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
		},
		movementX: function(e) {
			return "movementX" in e ? e.movementX : (e !== Tn && (Tn && e.type === "mousemove" ? (Cn = e.screenX - Tn.screenX, wn = e.screenY - Tn.screenY) : wn = Cn = 0, Tn = e), Cn);
		},
		movementY: function(e) {
			return "movementY" in e ? e.movementY : wn;
		}
	}), Dn = vn(En), On = vn(h({}, En, { dataTransfer: 0 })), kn = vn(h({}, xn, { relatedTarget: 0 })), An = vn(h({}, yn, {
		animationName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), jn = vn(h({}, yn, { clipboardData: function(e) {
		return "clipboardData" in e ? e.clipboardData : window.clipboardData;
	} })), Mn = vn(h({}, yn, { data: 0 })), Nn = {
		Esc: "Escape",
		Spacebar: " ",
		Left: "ArrowLeft",
		Up: "ArrowUp",
		Right: "ArrowRight",
		Down: "ArrowDown",
		Del: "Delete",
		Win: "OS",
		Menu: "ContextMenu",
		Apps: "ContextMenu",
		Scroll: "ScrollLock",
		MozPrintableKey: "Unidentified"
	}, Pn = {
		8: "Backspace",
		9: "Tab",
		12: "Clear",
		13: "Enter",
		16: "Shift",
		17: "Control",
		18: "Alt",
		19: "Pause",
		20: "CapsLock",
		27: "Escape",
		32: " ",
		33: "PageUp",
		34: "PageDown",
		35: "End",
		36: "Home",
		37: "ArrowLeft",
		38: "ArrowUp",
		39: "ArrowRight",
		40: "ArrowDown",
		45: "Insert",
		46: "Delete",
		112: "F1",
		113: "F2",
		114: "F3",
		115: "F4",
		116: "F5",
		117: "F6",
		118: "F7",
		119: "F8",
		120: "F9",
		121: "F10",
		122: "F11",
		123: "F12",
		144: "NumLock",
		145: "ScrollLock",
		224: "Meta"
	}, Fn = {
		Alt: "altKey",
		Control: "ctrlKey",
		Meta: "metaKey",
		Shift: "shiftKey"
	};
	function In(e) {
		var t = this.nativeEvent;
		return t.getModifierState ? t.getModifierState(e) : (e = Fn[e]) ? !!t[e] : !1;
	}
	function Ln() {
		return In;
	}
	var Rn = vn(h({}, xn, {
		key: function(e) {
			if (e.key) {
				var t = Nn[e.key] || e.key;
				if (t !== "Unidentified") return t;
			}
			return e.type === "keypress" ? (e = hn(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Pn[e.keyCode] || "Unidentified" : "";
		},
		code: 0,
		location: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		repeat: 0,
		locale: 0,
		getModifierState: Ln,
		charCode: function(e) {
			return e.type === "keypress" ? hn(e) : 0;
		},
		keyCode: function(e) {
			return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		},
		which: function(e) {
			return e.type === "keypress" ? hn(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		}
	})), zn = vn(h({}, En, {
		pointerId: 0,
		width: 0,
		height: 0,
		pressure: 0,
		tangentialPressure: 0,
		tiltX: 0,
		tiltY: 0,
		twist: 0,
		pointerType: 0,
		isPrimary: 0
	})), Bn = vn(h({}, xn, {
		touches: 0,
		targetTouches: 0,
		changedTouches: 0,
		altKey: 0,
		metaKey: 0,
		ctrlKey: 0,
		shiftKey: 0,
		getModifierState: Ln
	})), Vn = vn(h({}, yn, {
		propertyName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), Hn = vn(h({}, En, {
		deltaX: function(e) {
			return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
		},
		deltaY: function(e) {
			return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
		},
		deltaZ: 0,
		deltaMode: 0
	})), Un = vn(h({}, yn, {
		newState: 0,
		oldState: 0
	})), Wn = [
		9,
		13,
		27,
		32
	], Gn = cn && "CompositionEvent" in window, Kn = null;
	cn && "documentMode" in document && (Kn = document.documentMode);
	var qn = cn && "TextEvent" in window && !Kn, Jn = cn && (!Gn || Kn && 8 < Kn && 11 >= Kn), Yn = " ", Xn = !1;
	function Zn(e, t) {
		switch (e) {
			case "keyup": return Wn.indexOf(t.keyCode) !== -1;
			case "keydown": return t.keyCode !== 229;
			case "keypress":
			case "mousedown":
			case "focusout": return !0;
			default: return !1;
		}
	}
	function Qn(e) {
		return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
	}
	var $n = !1;
	function er(e, t) {
		switch (e) {
			case "compositionend": return Qn(t);
			case "keypress": return t.which === 32 ? (Xn = !0, Yn) : null;
			case "textInput": return e = t.data, e === Yn && Xn ? null : e;
			default: return null;
		}
	}
	function tr(e, t) {
		if ($n) return e === "compositionend" || !Gn && Zn(e, t) ? (e = mn(), pn = fn = dn = null, $n = !1, e) : null;
		switch (e) {
			case "paste": return null;
			case "keypress":
				if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
					if (t.char && 1 < t.char.length) return t.char;
					if (t.which) return String.fromCharCode(t.which);
				}
				return null;
			case "compositionend": return Jn && t.locale !== "ko" ? null : t.data;
			default: return null;
		}
	}
	var nr = {
		color: !0,
		date: !0,
		datetime: !0,
		"datetime-local": !0,
		email: !0,
		month: !0,
		number: !0,
		password: !0,
		range: !0,
		search: !0,
		tel: !0,
		text: !0,
		time: !0,
		url: !0,
		week: !0
	};
	function rr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t === "input" ? !!nr[e.type] : t === "textarea";
	}
	function ir(e, t, n, r) {
		tn ? nn ? nn.push(r) : nn = [r] : tn = r, t = Ed(t, "onChange"), 0 < t.length && (n = new bn("onChange", "change", null, n, r), e.push({
			event: n,
			listeners: t
		}));
	}
	var ar = null, or = null;
	function sr(e) {
		yd(e, 0);
	}
	function cr(e) {
		if (Pt(_t(e))) return e;
	}
	function lr(e, t) {
		if (e === "change") return t;
	}
	var ur = !1;
	if (cn) {
		var dr;
		if (cn) {
			var fr = "oninput" in document;
			if (!fr) {
				var pr = document.createElement("div");
				pr.setAttribute("oninput", "return;"), fr = typeof pr.oninput == "function";
			}
			dr = fr;
		} else dr = !1;
		ur = dr && (!document.documentMode || 9 < document.documentMode);
	}
	function mr() {
		ar && (ar.detachEvent("onpropertychange", hr), or = ar = null);
	}
	function hr(e) {
		if (e.propertyName === "value" && cr(or)) {
			var t = [];
			ir(t, or, e, en(e)), on(sr, t);
		}
	}
	function gr(e, t, n) {
		e === "focusin" ? (mr(), ar = t, or = n, ar.attachEvent("onpropertychange", hr)) : e === "focusout" && mr();
	}
	function _r(e) {
		if (e === "selectionchange" || e === "keyup" || e === "keydown") return cr(or);
	}
	function vr(e, t) {
		if (e === "click") return cr(t);
	}
	function yr(e, t) {
		if (e === "input" || e === "change") return cr(t);
	}
	function br(e, t) {
		return e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
	}
	var xr = typeof Object.is == "function" ? Object.is : br;
	function Sr(e, t) {
		if (xr(e, t)) return !0;
		if (typeof e != "object" || !e || typeof t != "object" || !t) return !1;
		var n = Object.keys(e), r = Object.keys(t);
		if (n.length !== r.length) return !1;
		for (r = 0; r < n.length; r++) {
			var i = n[r];
			if (!Te.call(t, i) || !xr(e[i], t[i])) return !1;
		}
		return !0;
	}
	function Cr(e) {
		for (; e && e.firstChild;) e = e.firstChild;
		return e;
	}
	function wr(e, t) {
		var n = Cr(e);
		e = 0;
		for (var r; n;) {
			if (n.nodeType === 3) {
				if (r = e + n.textContent.length, e <= t && r >= t) return {
					node: n,
					offset: t - e
				};
				e = r;
			}
			a: {
				for (; n;) {
					if (n.nextSibling) {
						n = n.nextSibling;
						break a;
					}
					n = n.parentNode;
				}
				n = void 0;
			}
			n = Cr(n);
		}
	}
	function Tr(e, t) {
		return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Tr(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
	}
	function Er(e) {
		e = e != null && e.ownerDocument != null && e.ownerDocument.defaultView != null ? e.ownerDocument.defaultView : window;
		for (var t = Ft(e.document); t instanceof e.HTMLIFrameElement;) {
			try {
				var n = typeof t.contentWindow.location.href == "string";
			} catch {
				n = !1;
			}
			if (n) e = t.contentWindow;
			else break;
			t = Ft(e.document);
		}
		return t;
	}
	function Dr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
	}
	var Or = cn && "documentMode" in document && 11 >= document.documentMode, kr = null, Ar = null, jr = null, Mr = !1;
	function Nr(e, t, n) {
		var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
		Mr || kr == null || kr !== Ft(r) || (r = kr, "selectionStart" in r && Dr(r) ? r = {
			start: r.selectionStart,
			end: r.selectionEnd
		} : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = {
			anchorNode: r.anchorNode,
			anchorOffset: r.anchorOffset,
			focusNode: r.focusNode,
			focusOffset: r.focusOffset
		}), jr && Sr(jr, r) || (jr = r, r = Ed(Ar, "onSelect"), 0 < r.length && (t = new bn("onSelect", "select", null, t, n), e.push({
			event: t,
			listeners: r
		}), t.target = kr)));
	}
	function Pr(e, t) {
		var n = {};
		return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
	}
	var Fr = {
		animationend: Pr("Animation", "AnimationEnd"),
		animationiteration: Pr("Animation", "AnimationIteration"),
		animationstart: Pr("Animation", "AnimationStart"),
		transitionrun: Pr("Transition", "TransitionRun"),
		transitionstart: Pr("Transition", "TransitionStart"),
		transitioncancel: Pr("Transition", "TransitionCancel"),
		transitionend: Pr("Transition", "TransitionEnd")
	}, Ir = {}, Lr = {};
	cn && (Lr = document.createElement("div").style, "AnimationEvent" in window || (delete Fr.animationend.animation, delete Fr.animationiteration.animation, delete Fr.animationstart.animation), "TransitionEvent" in window || delete Fr.transitionend.transition);
	function Rr(e) {
		if (Ir[e]) return Ir[e];
		if (!Fr[e]) return e;
		var t = Fr[e], n;
		for (n in t) if (t.hasOwnProperty(n) && n in Lr) return Ir[e] = t[n];
		return e;
	}
	var zr = Rr("animationend"), Br = Rr("animationiteration"), Vr = Rr("animationstart"), Hr = Rr("transitionrun"), Ur = Rr("transitionstart"), Wr = Rr("transitioncancel"), Gr = Rr("transitionend"), Kr = /* @__PURE__ */ new Map(), qr = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
	qr.push("scrollEnd");
	function Jr(e, t) {
		Kr.set(e, t), St(t, [e]);
	}
	var Yr = typeof reportError == "function" ? reportError : function(e) {
		if (typeof window == "object" && typeof window.ErrorEvent == "function") {
			var t = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: typeof e == "object" && e && typeof e.message == "string" ? String(e.message) : String(e),
				error: e
			});
			if (!window.dispatchEvent(t)) return;
		} else if (typeof process == "object" && typeof process.emit == "function") {
			process.emit("uncaughtException", e);
			return;
		}
		console.error(e);
	}, Xr = [], Zr = 0, Qr = 0;
	function $r() {
		for (var e = Zr, t = Qr = Zr = 0; t < e;) {
			var n = Xr[t];
			Xr[t++] = null;
			var r = Xr[t];
			Xr[t++] = null;
			var i = Xr[t];
			Xr[t++] = null;
			var a = Xr[t];
			if (Xr[t++] = null, r !== null && i !== null) {
				var o = r.pending;
				o === null ? i.next = i : (i.next = o.next, o.next = i), r.pending = i;
			}
			a !== 0 && ri(n, i, a);
		}
	}
	function ei(e, t, n, r) {
		Xr[Zr++] = e, Xr[Zr++] = t, Xr[Zr++] = n, Xr[Zr++] = r, Qr |= r, e.lanes |= r, e = e.alternate, e !== null && (e.lanes |= r);
	}
	function ti(e, t, n, r) {
		return ei(e, t, n, r), ii(e);
	}
	function ni(e, t) {
		return ei(e, null, null, t), ii(e);
	}
	function ri(e, t, n) {
		e.lanes |= n;
		var r = e.alternate;
		r !== null && (r.lanes |= n);
		for (var i = !1, a = e.return; a !== null;) a.childLanes |= n, r = a.alternate, r !== null && (r.childLanes |= n), a.tag === 22 && (e = a.stateNode, e === null || e._visibility & 1 || (i = !0)), e = a, a = a.return;
		return e.tag === 3 ? (a = e.stateNode, i && t !== null && (i = 31 - P(n), e = a.hiddenUpdates, r = e[i], r === null ? e[i] = [t] : r.push(t), t.lane = n | 536870912), a) : null;
	}
	function ii(e) {
		if (50 < du) throw du = 0, fu = null, Error(s(185));
		for (var t = e.return; t !== null;) e = t, t = e.return;
		return e.tag === 3 ? e.stateNode : null;
	}
	var ai = {};
	function oi(e, t, n, r) {
		this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
	}
	function si(e, t, n, r) {
		return new oi(e, t, n, r);
	}
	function ci(e) {
		return e = e.prototype, !(!e || !e.isReactComponent);
	}
	function li(e, t) {
		var n = e.alternate;
		return n === null ? (n = si(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 65011712, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n.refCleanup = e.refCleanup, n;
	}
	function ui(e, t) {
		e.flags &= 65011714;
		var n = e.alternate;
		return n === null ? (e.childLanes = 0, e.lanes = t, e.child = null, e.subtreeFlags = 0, e.memoizedProps = null, e.memoizedState = null, e.updateQueue = null, e.dependencies = null, e.stateNode = null) : (e.childLanes = n.childLanes, e.lanes = n.lanes, e.child = n.child, e.subtreeFlags = 0, e.deletions = null, e.memoizedProps = n.memoizedProps, e.memoizedState = n.memoizedState, e.updateQueue = n.updateQueue, e.type = n.type, t = n.dependencies, e.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}), e;
	}
	function di(e, t, n, r, i, a) {
		var o = 0;
		if (r = e, typeof e == "function") ci(e) && (o = 1);
		else if (typeof e == "string") o = Uf(e, n, ue.current) ? 26 : e === "html" || e === "head" || e === "body" ? 27 : 5;
		else a: switch (e) {
			case te: return e = si(31, n, t, i), e.elementType = te, e.lanes = a, e;
			case y: return fi(n.children, i, a, t);
			case b:
				o = 8, i |= 24;
				break;
			case x: return e = si(12, n, t, i | 2), e.elementType = x, e.lanes = a, e;
			case T: return e = si(13, n, t, i), e.elementType = T, e.lanes = a, e;
			case E: return e = si(19, n, t, i), e.elementType = E, e.lanes = a, e;
			default:
				if (typeof e == "object" && e) switch (e.$$typeof) {
					case C:
						o = 10;
						break a;
					case S:
						o = 9;
						break a;
					case w:
						o = 11;
						break a;
					case ee:
						o = 14;
						break a;
					case D:
						o = 16, r = null;
						break a;
				}
				o = 29, n = Error(s(130, e === null ? "null" : typeof e, "")), r = null;
		}
		return t = si(o, n, t, i), t.elementType = e, t.type = r, t.lanes = a, t;
	}
	function fi(e, t, n, r) {
		return e = si(7, e, r, t), e.lanes = n, e;
	}
	function pi(e, t, n) {
		return e = si(6, e, null, t), e.lanes = n, e;
	}
	function mi(e) {
		var t = si(18, null, null, 0);
		return t.stateNode = e, t;
	}
	function hi(e, t, n) {
		return t = si(4, e.children === null ? [] : e.children, e.key, t), t.lanes = n, t.stateNode = {
			containerInfo: e.containerInfo,
			pendingChildren: null,
			implementation: e.implementation
		}, t;
	}
	var gi = /* @__PURE__ */ new WeakMap();
	function _i(e, t) {
		if (typeof e == "object" && e) {
			var n = gi.get(e);
			return n === void 0 ? (t = {
				value: e,
				source: t,
				stack: we(t)
			}, gi.set(e, t), t) : n;
		}
		return {
			value: e,
			source: t,
			stack: we(t)
		};
	}
	var vi = [], yi = 0, bi = null, xi = 0, Si = [], Ci = 0, wi = null, Ti = 1, Ei = "";
	function Di(e, t) {
		vi[yi++] = xi, vi[yi++] = bi, bi = e, xi = t;
	}
	function Oi(e, t, n) {
		Si[Ci++] = Ti, Si[Ci++] = Ei, Si[Ci++] = wi, wi = e;
		var r = Ti;
		e = Ei;
		var i = 32 - P(r) - 1;
		r &= ~(1 << i), n += 1;
		var a = 32 - P(t) + i;
		if (30 < a) {
			var o = i - i % 5;
			a = (r & (1 << o) - 1).toString(32), r >>= o, i -= o, Ti = 1 << 32 - P(t) + i | n << i | r, Ei = a + e;
		} else Ti = 1 << a | n << i | r, Ei = e;
	}
	function ki(e) {
		e.return !== null && (Di(e, 1), Oi(e, 1, 0));
	}
	function Ai(e) {
		for (; e === bi;) bi = vi[--yi], vi[yi] = null, xi = vi[--yi], vi[yi] = null;
		for (; e === wi;) wi = Si[--Ci], Si[Ci] = null, Ei = Si[--Ci], Si[Ci] = null, Ti = Si[--Ci], Si[Ci] = null;
	}
	function ji(e, t) {
		Si[Ci++] = Ti, Si[Ci++] = Ei, Si[Ci++] = wi, Ti = t.id, Ei = t.overflow, wi = e;
	}
	var Mi = null, B = null, V = !1, Ni = null, Pi = !1, Fi = Error(s(519));
	function Ii(e) {
		throw Hi(_i(Error(s(418, 1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML", "")), e)), Fi;
	}
	function Li(e) {
		var t = e.stateNode, n = e.type, r = e.memoizedProps;
		switch (t[L] = e, t[R] = r, n) {
			case "dialog":
				Q("cancel", t), Q("close", t);
				break;
			case "iframe":
			case "object":
			case "embed":
				Q("load", t);
				break;
			case "video":
			case "audio":
				for (n = 0; n < _d.length; n++) Q(_d[n], t);
				break;
			case "source":
				Q("error", t);
				break;
			case "img":
			case "image":
			case "link":
				Q("error", t), Q("load", t);
				break;
			case "details":
				Q("toggle", t);
				break;
			case "input":
				Q("invalid", t), zt(t, r.value, r.defaultValue, r.checked, r.defaultChecked, r.type, r.name, !0);
				break;
			case "select":
				Q("invalid", t);
				break;
			case "textarea": Q("invalid", t), Ut(t, r.value, r.defaultValue, r.children);
		}
		n = r.children, typeof n != "string" && typeof n != "number" && typeof n != "bigint" || t.textContent === "" + n || !0 === r.suppressHydrationWarning || Md(t.textContent, n) ? (r.popover != null && (Q("beforetoggle", t), Q("toggle", t)), r.onScroll != null && Q("scroll", t), r.onScrollEnd != null && Q("scrollend", t), r.onClick != null && (t.onclick = Qt), t = !0) : t = !1, t || Ii(e, !0);
	}
	function Ri(e) {
		for (Mi = e.return; Mi;) switch (Mi.tag) {
			case 5:
			case 31:
			case 13:
				Pi = !1;
				return;
			case 27:
			case 3:
				Pi = !0;
				return;
			default: Mi = Mi.return;
		}
	}
	function zi(e) {
		if (e !== Mi) return !1;
		if (!V) return Ri(e), V = !0, !1;
		var t = e.tag, n;
		if ((n = t !== 3 && t !== 27) && ((n = t === 5) && (n = e.type, n = n === "form" || n === "button" || Ud(e.type, e.memoizedProps)), n = !n), n && B && Ii(e), Ri(e), t === 13) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(s(317));
			B = uf(e);
		} else if (t === 31) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(s(317));
			B = uf(e);
		} else t === 27 ? (t = B, Zd(e.type) ? (e = lf, lf = null, B = e) : B = t) : B = Mi ? cf(e.stateNode.nextSibling) : null;
		return !0;
	}
	function Bi() {
		B = Mi = null, V = !1;
	}
	function Vi() {
		var e = Ni;
		return e !== null && (Zl === null ? Zl = e : Zl.push.apply(Zl, e), Ni = null), e;
	}
	function Hi(e) {
		Ni === null ? Ni = [e] : Ni.push(e);
	}
	var Ui = le(null), Wi = null, Gi = null;
	function Ki(e, t, n) {
		N(Ui, t._currentValue), t._currentValue = n;
	}
	function qi(e) {
		e._currentValue = Ui.current, M(Ui);
	}
	function Ji(e, t, n) {
		for (; e !== null;) {
			var r = e.alternate;
			if ((e.childLanes & t) === t ? r !== null && (r.childLanes & t) !== t && (r.childLanes |= t) : (e.childLanes |= t, r !== null && (r.childLanes |= t)), e === n) break;
			e = e.return;
		}
	}
	function Yi(e, t, n, r) {
		var i = e.child;
		for (i !== null && (i.return = e); i !== null;) {
			var a = i.dependencies;
			if (a !== null) {
				var o = i.child;
				a = a.firstContext;
				a: for (; a !== null;) {
					var c = a;
					a = i;
					for (var l = 0; l < t.length; l++) if (c.context === t[l]) {
						a.lanes |= n, c = a.alternate, c !== null && (c.lanes |= n), Ji(a.return, n, e), r || (o = null);
						break a;
					}
					a = c.next;
				}
			} else if (i.tag === 18) {
				if (o = i.return, o === null) throw Error(s(341));
				o.lanes |= n, a = o.alternate, a !== null && (a.lanes |= n), Ji(o, n, e), o = null;
			} else o = i.child;
			if (o !== null) o.return = i;
			else for (o = i; o !== null;) {
				if (o === e) {
					o = null;
					break;
				}
				if (i = o.sibling, i !== null) {
					i.return = o.return, o = i;
					break;
				}
				o = o.return;
			}
			i = o;
		}
	}
	function Xi(e, t, n, r) {
		e = null;
		for (var i = t, a = !1; i !== null;) {
			if (!a) {
				if (i.flags & 524288) a = !0;
				else if (i.flags & 262144) break;
			}
			if (i.tag === 10) {
				var o = i.alternate;
				if (o === null) throw Error(s(387));
				if (o = o.memoizedProps, o !== null) {
					var c = i.type;
					xr(i.pendingProps.value, o.value) || (e === null ? e = [c] : e.push(c));
				}
			} else if (i === pe.current) {
				if (o = i.alternate, o === null) throw Error(s(387));
				o.memoizedState.memoizedState !== i.memoizedState.memoizedState && (e === null ? e = [Qf] : e.push(Qf));
			}
			i = i.return;
		}
		e !== null && Yi(t, e, n, r), t.flags |= 262144;
	}
	function Zi(e) {
		for (e = e.firstContext; e !== null;) {
			if (!xr(e.context._currentValue, e.memoizedValue)) return !0;
			e = e.next;
		}
		return !1;
	}
	function Qi(e) {
		Wi = e, Gi = null, e = e.dependencies, e !== null && (e.firstContext = null);
	}
	function $i(e) {
		return ta(Wi, e);
	}
	function ea(e, t) {
		return Wi === null && Qi(e), ta(e, t);
	}
	function ta(e, t) {
		var n = t._currentValue;
		if (t = {
			context: t,
			memoizedValue: n,
			next: null
		}, Gi === null) {
			if (e === null) throw Error(s(308));
			Gi = t, e.dependencies = {
				lanes: 0,
				firstContext: t
			}, e.flags |= 524288;
		} else Gi = Gi.next = t;
		return n;
	}
	var na = typeof AbortController < "u" ? AbortController : function() {
		var e = [], t = this.signal = {
			aborted: !1,
			addEventListener: function(t, n) {
				e.push(n);
			}
		};
		this.abort = function() {
			t.aborted = !0, e.forEach(function(e) {
				return e();
			});
		};
	}, ra = t.unstable_scheduleCallback, ia = t.unstable_NormalPriority, aa = {
		$$typeof: C,
		Consumer: null,
		Provider: null,
		_currentValue: null,
		_currentValue2: null,
		_threadCount: 0
	};
	function oa() {
		return {
			controller: new na(),
			data: /* @__PURE__ */ new Map(),
			refCount: 0
		};
	}
	function sa(e) {
		e.refCount--, e.refCount === 0 && ra(ia, function() {
			e.controller.abort();
		});
	}
	var ca = null, la = 0, ua = 0, da = null;
	function fa(e, t) {
		if (ca === null) {
			var n = ca = [];
			la = 0, ua = dd(), da = {
				status: "pending",
				value: void 0,
				then: function(e) {
					n.push(e);
				}
			};
		}
		return la++, t.then(pa, pa), t;
	}
	function pa() {
		if (--la === 0 && ca !== null) {
			da !== null && (da.status = "fulfilled");
			var e = ca;
			ca = null, ua = 0, da = null;
			for (var t = 0; t < e.length; t++) (0, e[t])();
		}
	}
	function ma(e, t) {
		var n = [], r = {
			status: "pending",
			value: null,
			reason: null,
			then: function(e) {
				n.push(e);
			}
		};
		return e.then(function() {
			r.status = "fulfilled", r.value = t;
			for (var e = 0; e < n.length; e++) (0, n[e])(t);
		}, function(e) {
			for (r.status = "rejected", r.reason = e, e = 0; e < n.length; e++) (0, n[e])(void 0);
		}), r;
	}
	var ha = k.S;
	k.S = function(e, t) {
		eu = Ae(), typeof t == "object" && t && typeof t.then == "function" && fa(e, t), ha !== null && ha(e, t);
	};
	var ga = le(null);
	function _a() {
		var e = ga.current;
		return e === null ? q.pooledCache : e;
	}
	function va(e, t) {
		t === null ? N(ga, ga.current) : N(ga, t.pool);
	}
	function ya() {
		var e = _a();
		return e === null ? null : {
			parent: aa._currentValue,
			pool: e
		};
	}
	var ba = Error(s(460)), xa = Error(s(474)), Sa = Error(s(542)), Ca = { then: function() {} };
	function wa(e) {
		return e = e.status, e === "fulfilled" || e === "rejected";
	}
	function Ta(e, t, n) {
		switch (n = e[n], n === void 0 ? e.push(t) : n !== t && (t.then(Qt, Qt), t = n), t.status) {
			case "fulfilled": return t.value;
			case "rejected": throw e = t.reason, ka(e), e;
			default:
				if (typeof t.status == "string") t.then(Qt, Qt);
				else {
					if (e = q, e !== null && 100 < e.shellSuspendCounter) throw Error(s(482));
					e = t, e.status = "pending", e.then(function(e) {
						if (t.status === "pending") {
							var n = t;
							n.status = "fulfilled", n.value = e;
						}
					}, function(e) {
						if (t.status === "pending") {
							var n = t;
							n.status = "rejected", n.reason = e;
						}
					});
				}
				switch (t.status) {
					case "fulfilled": return t.value;
					case "rejected": throw e = t.reason, ka(e), e;
				}
				throw Da = t, ba;
		}
	}
	function Ea(e) {
		try {
			var t = e._init;
			return t(e._payload);
		} catch (e) {
			throw typeof e == "object" && e && typeof e.then == "function" ? (Da = e, ba) : e;
		}
	}
	var Da = null;
	function Oa() {
		if (Da === null) throw Error(s(459));
		var e = Da;
		return Da = null, e;
	}
	function ka(e) {
		if (e === ba || e === Sa) throw Error(s(483));
	}
	var Aa = null, ja = 0;
	function Ma(e) {
		var t = ja;
		return ja += 1, Aa === null && (Aa = []), Ta(Aa, e, t);
	}
	function Na(e, t) {
		t = t.props.ref, e.ref = t === void 0 ? null : t;
	}
	function Pa(e, t) {
		throw t.$$typeof === g ? Error(s(525)) : (e = Object.prototype.toString.call(t), Error(s(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e)));
	}
	function Fa(e) {
		function t(t, n) {
			if (e) {
				var r = t.deletions;
				r === null ? (t.deletions = [n], t.flags |= 16) : r.push(n);
			}
		}
		function n(n, r) {
			if (!e) return null;
			for (; r !== null;) t(n, r), r = r.sibling;
			return null;
		}
		function r(e) {
			for (var t = /* @__PURE__ */ new Map(); e !== null;) e.key === null ? t.set(e.index, e) : t.set(e.key, e), e = e.sibling;
			return t;
		}
		function i(e, t) {
			return e = li(e, t), e.index = 0, e.sibling = null, e;
		}
		function a(t, n, r) {
			return t.index = r, e ? (r = t.alternate, r === null ? (t.flags |= 67108866, n) : (r = r.index, r < n ? (t.flags |= 67108866, n) : r)) : (t.flags |= 1048576, n);
		}
		function o(t) {
			return e && t.alternate === null && (t.flags |= 67108866), t;
		}
		function c(e, t, n, r) {
			return t === null || t.tag !== 6 ? (t = pi(n, e.mode, r), t.return = e, t) : (t = i(t, n), t.return = e, t);
		}
		function l(e, t, n, r) {
			var a = n.type;
			return a === y ? d(e, t, n.props.children, r, n.key) : t !== null && (t.elementType === a || typeof a == "object" && a && a.$$typeof === D && Ea(a) === t.type) ? (t = i(t, n.props), Na(t, n), t.return = e, t) : (t = di(n.type, n.key, n.props, null, e.mode, r), Na(t, n), t.return = e, t);
		}
		function u(e, t, n, r) {
			return t === null || t.tag !== 4 || t.stateNode.containerInfo !== n.containerInfo || t.stateNode.implementation !== n.implementation ? (t = hi(n, e.mode, r), t.return = e, t) : (t = i(t, n.children || []), t.return = e, t);
		}
		function d(e, t, n, r, a) {
			return t === null || t.tag !== 7 ? (t = fi(n, e.mode, r, a), t.return = e, t) : (t = i(t, n), t.return = e, t);
		}
		function f(e, t, n) {
			if (typeof t == "string" && t !== "" || typeof t == "number" || typeof t == "bigint") return t = pi("" + t, e.mode, n), t.return = e, t;
			if (typeof t == "object" && t) {
				switch (t.$$typeof) {
					case _: return n = di(t.type, t.key, t.props, null, e.mode, n), Na(n, t), n.return = e, n;
					case v: return t = hi(t, e.mode, n), t.return = e, t;
					case D: return t = Ea(t), f(e, t, n);
				}
				if (oe(t) || re(t)) return t = fi(t, e.mode, n, null), t.return = e, t;
				if (typeof t.then == "function") return f(e, Ma(t), n);
				if (t.$$typeof === C) return f(e, ea(e, t), n);
				Pa(e, t);
			}
			return null;
		}
		function p(e, t, n, r) {
			var i = t === null ? null : t.key;
			if (typeof n == "string" && n !== "" || typeof n == "number" || typeof n == "bigint") return i === null ? c(e, t, "" + n, r) : null;
			if (typeof n == "object" && n) {
				switch (n.$$typeof) {
					case _: return n.key === i ? l(e, t, n, r) : null;
					case v: return n.key === i ? u(e, t, n, r) : null;
					case D: return n = Ea(n), p(e, t, n, r);
				}
				if (oe(n) || re(n)) return i === null ? d(e, t, n, r, null) : null;
				if (typeof n.then == "function") return p(e, t, Ma(n), r);
				if (n.$$typeof === C) return p(e, t, ea(e, n), r);
				Pa(e, n);
			}
			return null;
		}
		function m(e, t, n, r, i) {
			if (typeof r == "string" && r !== "" || typeof r == "number" || typeof r == "bigint") return e = e.get(n) || null, c(t, e, "" + r, i);
			if (typeof r == "object" && r) {
				switch (r.$$typeof) {
					case _: return e = e.get(r.key === null ? n : r.key) || null, l(t, e, r, i);
					case v: return e = e.get(r.key === null ? n : r.key) || null, u(t, e, r, i);
					case D: return r = Ea(r), m(e, t, n, r, i);
				}
				if (oe(r) || re(r)) return e = e.get(n) || null, d(t, e, r, i, null);
				if (typeof r.then == "function") return m(e, t, n, Ma(r), i);
				if (r.$$typeof === C) return m(e, t, n, ea(t, r), i);
				Pa(t, r);
			}
			return null;
		}
		function h(i, o, s, c) {
			for (var l = null, u = null, d = o, h = o = 0, g = null; d !== null && h < s.length; h++) {
				d.index > h ? (g = d, d = null) : g = d.sibling;
				var _ = p(i, d, s[h], c);
				if (_ === null) {
					d === null && (d = g);
					break;
				}
				e && d && _.alternate === null && t(i, d), o = a(_, o, h), u === null ? l = _ : u.sibling = _, u = _, d = g;
			}
			if (h === s.length) return n(i, d), V && Di(i, h), l;
			if (d === null) {
				for (; h < s.length; h++) d = f(i, s[h], c), d !== null && (o = a(d, o, h), u === null ? l = d : u.sibling = d, u = d);
				return V && Di(i, h), l;
			}
			for (d = r(d); h < s.length; h++) g = m(d, i, h, s[h], c), g !== null && (e && g.alternate !== null && d.delete(g.key === null ? h : g.key), o = a(g, o, h), u === null ? l = g : u.sibling = g, u = g);
			return e && d.forEach(function(e) {
				return t(i, e);
			}), V && Di(i, h), l;
		}
		function g(i, o, c, l) {
			if (c == null) throw Error(s(151));
			for (var u = null, d = null, h = o, g = o = 0, _ = null, v = c.next(); h !== null && !v.done; g++, v = c.next()) {
				h.index > g ? (_ = h, h = null) : _ = h.sibling;
				var y = p(i, h, v.value, l);
				if (y === null) {
					h === null && (h = _);
					break;
				}
				e && h && y.alternate === null && t(i, h), o = a(y, o, g), d === null ? u = y : d.sibling = y, d = y, h = _;
			}
			if (v.done) return n(i, h), V && Di(i, g), u;
			if (h === null) {
				for (; !v.done; g++, v = c.next()) v = f(i, v.value, l), v !== null && (o = a(v, o, g), d === null ? u = v : d.sibling = v, d = v);
				return V && Di(i, g), u;
			}
			for (h = r(h); !v.done; g++, v = c.next()) v = m(h, i, g, v.value, l), v !== null && (e && v.alternate !== null && h.delete(v.key === null ? g : v.key), o = a(v, o, g), d === null ? u = v : d.sibling = v, d = v);
			return e && h.forEach(function(e) {
				return t(i, e);
			}), V && Di(i, g), u;
		}
		function b(e, r, a, c) {
			if (typeof a == "object" && a && a.type === y && a.key === null && (a = a.props.children), typeof a == "object" && a) {
				switch (a.$$typeof) {
					case _:
						a: {
							for (var l = a.key; r !== null;) {
								if (r.key === l) {
									if (l = a.type, l === y) {
										if (r.tag === 7) {
											n(e, r.sibling), c = i(r, a.props.children), c.return = e, e = c;
											break a;
										}
									} else if (r.elementType === l || typeof l == "object" && l && l.$$typeof === D && Ea(l) === r.type) {
										n(e, r.sibling), c = i(r, a.props), Na(c, a), c.return = e, e = c;
										break a;
									}
									n(e, r);
									break;
								}
								t(e, r), r = r.sibling;
							}
							a.type === y ? (c = fi(a.props.children, e.mode, c, a.key), c.return = e, e = c) : (c = di(a.type, a.key, a.props, null, e.mode, c), Na(c, a), c.return = e, e = c);
						}
						return o(e);
					case v:
						a: {
							for (l = a.key; r !== null;) {
								if (r.key === l) if (r.tag === 4 && r.stateNode.containerInfo === a.containerInfo && r.stateNode.implementation === a.implementation) {
									n(e, r.sibling), c = i(r, a.children || []), c.return = e, e = c;
									break a;
								} else {
									n(e, r);
									break;
								}
								t(e, r), r = r.sibling;
							}
							c = hi(a, e.mode, c), c.return = e, e = c;
						}
						return o(e);
					case D: return a = Ea(a), b(e, r, a, c);
				}
				if (oe(a)) return h(e, r, a, c);
				if (re(a)) {
					if (l = re(a), typeof l != "function") throw Error(s(150));
					return a = l.call(a), g(e, r, a, c);
				}
				if (typeof a.then == "function") return b(e, r, Ma(a), c);
				if (a.$$typeof === C) return b(e, r, ea(e, a), c);
				Pa(e, a);
			}
			return typeof a == "string" && a !== "" || typeof a == "number" || typeof a == "bigint" ? (a = "" + a, r !== null && r.tag === 6 ? (n(e, r.sibling), c = i(r, a), c.return = e, e = c) : (n(e, r), c = pi(a, e.mode, c), c.return = e, e = c), o(e)) : n(e, r);
		}
		return function(e, t, n, r) {
			try {
				ja = 0;
				var i = b(e, t, n, r);
				return Aa = null, i;
			} catch (t) {
				if (t === ba || t === Sa) throw t;
				var a = si(29, t, null, e.mode);
				return a.lanes = r, a.return = e, a;
			}
		};
	}
	var Ia = Fa(!0), La = Fa(!1), Ra = !1;
	function za(e) {
		e.updateQueue = {
			baseState: e.memoizedState,
			firstBaseUpdate: null,
			lastBaseUpdate: null,
			shared: {
				pending: null,
				lanes: 0,
				hiddenCallbacks: null
			},
			callbacks: null
		};
	}
	function Ba(e, t) {
		e = e.updateQueue, t.updateQueue === e && (t.updateQueue = {
			baseState: e.baseState,
			firstBaseUpdate: e.firstBaseUpdate,
			lastBaseUpdate: e.lastBaseUpdate,
			shared: e.shared,
			callbacks: null
		});
	}
	function Va(e) {
		return {
			lane: e,
			tag: 0,
			payload: null,
			callback: null,
			next: null
		};
	}
	function Ha(e, t, n) {
		var r = e.updateQueue;
		if (r === null) return null;
		if (r = r.shared, K & 2) {
			var i = r.pending;
			return i === null ? t.next = t : (t.next = i.next, i.next = t), r.pending = t, t = ii(e), ri(e, null, n), t;
		}
		return ei(e, r, t, n), ii(e);
	}
	function Ua(e, t, n) {
		if (t = t.updateQueue, t !== null && (t = t.shared, n & 4194048)) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, I(e, n);
		}
	}
	function Wa(e, t) {
		var n = e.updateQueue, r = e.alternate;
		if (r !== null && (r = r.updateQueue, n === r)) {
			var i = null, a = null;
			if (n = n.firstBaseUpdate, n !== null) {
				do {
					var o = {
						lane: n.lane,
						tag: n.tag,
						payload: n.payload,
						callback: null,
						next: null
					};
					a === null ? i = a = o : a = a.next = o, n = n.next;
				} while (n !== null);
				a === null ? i = a = t : a = a.next = t;
			} else i = a = t;
			n = {
				baseState: r.baseState,
				firstBaseUpdate: i,
				lastBaseUpdate: a,
				shared: r.shared,
				callbacks: r.callbacks
			}, e.updateQueue = n;
			return;
		}
		e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
	}
	var Ga = !1;
	function Ka() {
		if (Ga) {
			var e = da;
			if (e !== null) throw e;
		}
	}
	function qa(e, t, n, r) {
		Ga = !1;
		var i = e.updateQueue;
		Ra = !1;
		var a = i.firstBaseUpdate, o = i.lastBaseUpdate, s = i.shared.pending;
		if (s !== null) {
			i.shared.pending = null;
			var c = s, l = c.next;
			c.next = null, o === null ? a = l : o.next = l, o = c;
			var u = e.alternate;
			u !== null && (u = u.updateQueue, s = u.lastBaseUpdate, s !== o && (s === null ? u.firstBaseUpdate = l : s.next = l, u.lastBaseUpdate = c));
		}
		if (a !== null) {
			var d = i.baseState;
			o = 0, u = l = c = null, s = a;
			do {
				var f = s.lane & -536870913, p = f !== s.lane;
				if (p ? (Y & f) === f : (r & f) === f) {
					f !== 0 && f === ua && (Ga = !0), u !== null && (u = u.next = {
						lane: 0,
						tag: s.tag,
						payload: s.payload,
						callback: null,
						next: null
					});
					a: {
						var m = e, g = s;
						f = t;
						var _ = n;
						switch (g.tag) {
							case 1:
								if (m = g.payload, typeof m == "function") {
									d = m.call(_, d, f);
									break a;
								}
								d = m;
								break a;
							case 3: m.flags = m.flags & -65537 | 128;
							case 0:
								if (m = g.payload, f = typeof m == "function" ? m.call(_, d, f) : m, f == null) break a;
								d = h({}, d, f);
								break a;
							case 2: Ra = !0;
						}
					}
					f = s.callback, f !== null && (e.flags |= 64, p && (e.flags |= 8192), p = i.callbacks, p === null ? i.callbacks = [f] : p.push(f));
				} else p = {
					lane: f,
					tag: s.tag,
					payload: s.payload,
					callback: s.callback,
					next: null
				}, u === null ? (l = u = p, c = d) : u = u.next = p, o |= f;
				if (s = s.next, s === null) {
					if (s = i.shared.pending, s === null) break;
					p = s, s = p.next, p.next = null, i.lastBaseUpdate = p, i.shared.pending = null;
				}
			} while (1);
			u === null && (c = d), i.baseState = c, i.firstBaseUpdate = l, i.lastBaseUpdate = u, a === null && (i.shared.lanes = 0), Gl |= o, e.lanes = o, e.memoizedState = d;
		}
	}
	function Ja(e, t) {
		if (typeof e != "function") throw Error(s(191, e));
		e.call(t);
	}
	function Ya(e, t) {
		var n = e.callbacks;
		if (n !== null) for (e.callbacks = null, e = 0; e < n.length; e++) Ja(n[e], t);
	}
	var Xa = le(null), Za = le(0);
	function Qa(e, t) {
		e = Ul, N(Za, e), N(Xa, t), Ul = e | t.baseLanes;
	}
	function $a() {
		N(Za, Ul), N(Xa, Xa.current);
	}
	function eo() {
		Ul = Za.current, M(Xa), M(Za);
	}
	var to = le(null), no = null;
	function ro(e) {
		var t = e.alternate;
		N(co, co.current & 1), N(to, e), no === null && (t === null || Xa.current !== null || t.memoizedState !== null) && (no = e);
	}
	function io(e) {
		N(co, co.current), N(to, e), no === null && (no = e);
	}
	function ao(e) {
		e.tag === 22 ? (N(co, co.current), N(to, e), no === null && (no = e)) : oo(e);
	}
	function oo() {
		N(co, co.current), N(to, to.current);
	}
	function so(e) {
		M(to), no === e && (no = null), M(co);
	}
	var co = le(0);
	function lo(e) {
		for (var t = e; t !== null;) {
			if (t.tag === 13) {
				var n = t.memoizedState;
				if (n !== null && (n = n.dehydrated, n === null || af(n) || of(n))) return t;
			} else if (t.tag === 19 && (t.memoizedProps.revealOrder === "forwards" || t.memoizedProps.revealOrder === "backwards" || t.memoizedProps.revealOrder === "unstable_legacy-backwards" || t.memoizedProps.revealOrder === "together")) {
				if (t.flags & 128) return t;
			} else if (t.child !== null) {
				t.child.return = t, t = t.child;
				continue;
			}
			if (t === e) break;
			for (; t.sibling === null;) {
				if (t.return === null || t.return === e) return null;
				t = t.return;
			}
			t.sibling.return = t.return, t = t.sibling;
		}
		return null;
	}
	var uo = 0, H = null, U = null, fo = null, po = !1, mo = !1, ho = !1, go = 0, _o = 0, vo = null, yo = 0;
	function bo() {
		throw Error(s(321));
	}
	function xo(e, t) {
		if (t === null) return !1;
		for (var n = 0; n < t.length && n < e.length; n++) if (!xr(e[n], t[n])) return !1;
		return !0;
	}
	function So(e, t, n, r, i, a) {
		return uo = a, H = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, k.H = e === null || e.memoizedState === null ? zs : Bs, ho = !1, a = n(r, i), ho = !1, mo && (a = wo(t, n, r, i)), Co(e), a;
	}
	function Co(e) {
		k.H = Rs;
		var t = U !== null && U.next !== null;
		if (uo = 0, fo = U = H = null, po = !1, _o = 0, vo = null, t) throw Error(s(300));
		e === null || rc || (e = e.dependencies, e !== null && Zi(e) && (rc = !0));
	}
	function wo(e, t, n, r) {
		H = e;
		var i = 0;
		do {
			if (mo && (vo = null), _o = 0, mo = !1, 25 <= i) throw Error(s(301));
			if (i += 1, fo = U = null, e.updateQueue != null) {
				var a = e.updateQueue;
				a.lastEffect = null, a.events = null, a.stores = null, a.memoCache != null && (a.memoCache.index = 0);
			}
			k.H = Vs, a = t(n, r);
		} while (mo);
		return a;
	}
	function To() {
		var e = k.H, t = e.useState()[0];
		return t = typeof t.then == "function" ? Mo(t) : t, e = e.useState()[0], (U === null ? null : U.memoizedState) !== e && (H.flags |= 1024), t;
	}
	function Eo() {
		var e = go !== 0;
		return go = 0, e;
	}
	function Do(e, t, n) {
		t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~n;
	}
	function Oo(e) {
		if (po) {
			for (e = e.memoizedState; e !== null;) {
				var t = e.queue;
				t !== null && (t.pending = null), e = e.next;
			}
			po = !1;
		}
		uo = 0, fo = U = H = null, mo = !1, _o = go = 0, vo = null;
	}
	function ko() {
		var e = {
			memoizedState: null,
			baseState: null,
			baseQueue: null,
			queue: null,
			next: null
		};
		return fo === null ? H.memoizedState = fo = e : fo = fo.next = e, fo;
	}
	function Ao() {
		if (U === null) {
			var e = H.alternate;
			e = e === null ? null : e.memoizedState;
		} else e = U.next;
		var t = fo === null ? H.memoizedState : fo.next;
		if (t !== null) fo = t, U = e;
		else {
			if (e === null) throw H.alternate === null ? Error(s(467)) : Error(s(310));
			U = e, e = {
				memoizedState: U.memoizedState,
				baseState: U.baseState,
				baseQueue: U.baseQueue,
				queue: U.queue,
				next: null
			}, fo === null ? H.memoizedState = fo = e : fo = fo.next = e;
		}
		return fo;
	}
	function jo() {
		return {
			lastEffect: null,
			events: null,
			stores: null,
			memoCache: null
		};
	}
	function Mo(e) {
		var t = _o;
		return _o += 1, vo === null && (vo = []), e = Ta(vo, e, t), t = H, (fo === null ? t.memoizedState : fo.next) === null && (t = t.alternate, k.H = t === null || t.memoizedState === null ? zs : Bs), e;
	}
	function No(e) {
		if (typeof e == "object" && e) {
			if (typeof e.then == "function") return Mo(e);
			if (e.$$typeof === C) return $i(e);
		}
		throw Error(s(438, String(e)));
	}
	function Po(e) {
		var t = null, n = H.updateQueue;
		if (n !== null && (t = n.memoCache), t == null) {
			var r = H.alternate;
			r !== null && (r = r.updateQueue, r !== null && (r = r.memoCache, r != null && (t = {
				data: r.data.map(function(e) {
					return e.slice();
				}),
				index: 0
			})));
		}
		if (t ??= {
			data: [],
			index: 0
		}, n === null && (n = jo(), H.updateQueue = n), n.memoCache = t, n = t.data[t.index], n === void 0) for (n = t.data[t.index] = Array(e), r = 0; r < e; r++) n[r] = ne;
		return t.index++, n;
	}
	function Fo(e, t) {
		return typeof t == "function" ? t(e) : t;
	}
	function Io(e) {
		return Lo(Ao(), U, e);
	}
	function Lo(e, t, n) {
		var r = e.queue;
		if (r === null) throw Error(s(311));
		r.lastRenderedReducer = n;
		var i = e.baseQueue, a = r.pending;
		if (a !== null) {
			if (i !== null) {
				var o = i.next;
				i.next = a.next, a.next = o;
			}
			t.baseQueue = i = a, r.pending = null;
		}
		if (a = e.baseState, i === null) e.memoizedState = a;
		else {
			t = i.next;
			var c = o = null, l = null, u = t, d = !1;
			do {
				var f = u.lane & -536870913;
				if (f === u.lane ? (uo & f) === f : (Y & f) === f) {
					var p = u.revertLane;
					if (p === 0) l !== null && (l = l.next = {
						lane: 0,
						revertLane: 0,
						gesture: null,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					}), f === ua && (d = !0);
					else if ((uo & p) === p) {
						u = u.next, p === ua && (d = !0);
						continue;
					} else f = {
						lane: 0,
						revertLane: u.revertLane,
						gesture: null,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					}, l === null ? (c = l = f, o = a) : l = l.next = f, H.lanes |= p, Gl |= p;
					f = u.action, ho && n(a, f), a = u.hasEagerState ? u.eagerState : n(a, f);
				} else p = {
					lane: f,
					revertLane: u.revertLane,
					gesture: u.gesture,
					action: u.action,
					hasEagerState: u.hasEagerState,
					eagerState: u.eagerState,
					next: null
				}, l === null ? (c = l = p, o = a) : l = l.next = p, H.lanes |= f, Gl |= f;
				u = u.next;
			} while (u !== null && u !== t);
			if (l === null ? o = a : l.next = c, !xr(a, e.memoizedState) && (rc = !0, d && (n = da, n !== null))) throw n;
			e.memoizedState = a, e.baseState = o, e.baseQueue = l, r.lastRenderedState = a;
		}
		return i === null && (r.lanes = 0), [e.memoizedState, r.dispatch];
	}
	function Ro(e) {
		var t = Ao(), n = t.queue;
		if (n === null) throw Error(s(311));
		n.lastRenderedReducer = e;
		var r = n.dispatch, i = n.pending, a = t.memoizedState;
		if (i !== null) {
			n.pending = null;
			var o = i = i.next;
			do
				a = e(a, o.action), o = o.next;
			while (o !== i);
			xr(a, t.memoizedState) || (rc = !0), t.memoizedState = a, t.baseQueue === null && (t.baseState = a), n.lastRenderedState = a;
		}
		return [a, r];
	}
	function zo(e, t, n) {
		var r = H, i = Ao(), a = V;
		if (a) {
			if (n === void 0) throw Error(s(407));
			n = n();
		} else n = t();
		var o = !xr((U || i).memoizedState, n);
		if (o && (i.memoizedState = n, rc = !0), i = i.queue, us(Ho.bind(null, r, i, e), [e]), i.getSnapshot !== t || o || fo !== null && fo.memoizedState.tag & 1) {
			if (r.flags |= 2048, as(9, { destroy: void 0 }, Vo.bind(null, r, i, n, t), null), q === null) throw Error(s(349));
			a || uo & 127 || Bo(r, t, n);
		}
		return n;
	}
	function Bo(e, t, n) {
		e.flags |= 16384, e = {
			getSnapshot: t,
			value: n
		}, t = H.updateQueue, t === null ? (t = jo(), H.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
	}
	function Vo(e, t, n, r) {
		t.value = n, t.getSnapshot = r, Uo(t) && Wo(e);
	}
	function Ho(e, t, n) {
		return n(function() {
			Uo(t) && Wo(e);
		});
	}
	function Uo(e) {
		var t = e.getSnapshot;
		e = e.value;
		try {
			var n = t();
			return !xr(e, n);
		} catch {
			return !0;
		}
	}
	function Wo(e) {
		var t = ni(e, 2);
		t !== null && hu(t, e, 2);
	}
	function Go(e) {
		var t = ko();
		if (typeof e == "function") {
			var n = e;
			if (e = n(), ho) {
				Ve(!0);
				try {
					n();
				} finally {
					Ve(!1);
				}
			}
		}
		return t.memoizedState = t.baseState = e, t.queue = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: Fo,
			lastRenderedState: e
		}, t;
	}
	function Ko(e, t, n, r) {
		return e.baseState = n, Lo(e, U, typeof r == "function" ? r : Fo);
	}
	function qo(e, t, n, r, i) {
		if (Fs(e)) throw Error(s(485));
		if (e = t.action, e !== null) {
			var a = {
				payload: i,
				action: e,
				next: null,
				isTransition: !0,
				status: "pending",
				value: null,
				reason: null,
				listeners: [],
				then: function(e) {
					a.listeners.push(e);
				}
			};
			k.T === null ? a.isTransition = !1 : n(!0), r(a), n = t.pending, n === null ? (a.next = t.pending = a, Jo(t, a)) : (a.next = n.next, t.pending = n.next = a);
		}
	}
	function Jo(e, t) {
		var n = t.action, r = t.payload, i = e.state;
		if (t.isTransition) {
			var a = k.T, o = {};
			k.T = o;
			try {
				var s = n(i, r), c = k.S;
				c !== null && c(o, s), Yo(e, t, s);
			} catch (n) {
				Zo(e, t, n);
			} finally {
				a !== null && o.types !== null && (a.types = o.types), k.T = a;
			}
		} else try {
			a = n(i, r), Yo(e, t, a);
		} catch (n) {
			Zo(e, t, n);
		}
	}
	function Yo(e, t, n) {
		typeof n == "object" && n && typeof n.then == "function" ? n.then(function(n) {
			Xo(e, t, n);
		}, function(n) {
			return Zo(e, t, n);
		}) : Xo(e, t, n);
	}
	function Xo(e, t, n) {
		t.status = "fulfilled", t.value = n, Qo(t), e.state = n, t = e.pending, t !== null && (n = t.next, n === t ? e.pending = null : (n = n.next, t.next = n, Jo(e, n)));
	}
	function Zo(e, t, n) {
		var r = e.pending;
		if (e.pending = null, r !== null) {
			r = r.next;
			do
				t.status = "rejected", t.reason = n, Qo(t), t = t.next;
			while (t !== r);
		}
		e.action = null;
	}
	function Qo(e) {
		e = e.listeners;
		for (var t = 0; t < e.length; t++) (0, e[t])();
	}
	function $o(e, t) {
		return t;
	}
	function es(e, t) {
		if (V) {
			var n = q.formState;
			if (n !== null) {
				a: {
					var r = H;
					if (V) {
						if (B) {
							b: {
								for (var i = B, a = Pi; i.nodeType !== 8;) {
									if (!a) {
										i = null;
										break b;
									}
									if (i = cf(i.nextSibling), i === null) {
										i = null;
										break b;
									}
								}
								a = i.data, i = a === "F!" || a === "F" ? i : null;
							}
							if (i) {
								B = cf(i.nextSibling), r = i.data === "F!";
								break a;
							}
						}
						Ii(r);
					}
					r = !1;
				}
				r && (t = n[0]);
			}
		}
		return n = ko(), n.memoizedState = n.baseState = t, r = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: $o,
			lastRenderedState: t
		}, n.queue = r, n = Ms.bind(null, H, r), r.dispatch = n, r = Go(!1), a = Ps.bind(null, H, !1, r.queue), r = ko(), i = {
			state: t,
			dispatch: null,
			action: e,
			pending: null
		}, r.queue = i, n = qo.bind(null, H, i, a, n), i.dispatch = n, r.memoizedState = e, [
			t,
			n,
			!1
		];
	}
	function ts(e) {
		return ns(Ao(), U, e);
	}
	function ns(e, t, n) {
		if (t = Lo(e, t, $o)[0], e = Io(Fo)[0], typeof t == "object" && t && typeof t.then == "function") try {
			var r = Mo(t);
		} catch (e) {
			throw e === ba ? Sa : e;
		}
		else r = t;
		t = Ao();
		var i = t.queue, a = i.dispatch;
		return n !== t.memoizedState && (H.flags |= 2048, as(9, { destroy: void 0 }, rs.bind(null, i, n), null)), [
			r,
			a,
			e
		];
	}
	function rs(e, t) {
		e.action = t;
	}
	function is(e) {
		var t = Ao(), n = U;
		if (n !== null) return ns(t, n, e);
		Ao(), t = t.memoizedState, n = Ao();
		var r = n.queue.dispatch;
		return n.memoizedState = e, [
			t,
			r,
			!1
		];
	}
	function as(e, t, n, r) {
		return e = {
			tag: e,
			create: n,
			deps: r,
			inst: t,
			next: null
		}, t = H.updateQueue, t === null && (t = jo(), H.updateQueue = t), n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e), e;
	}
	function os() {
		return Ao().memoizedState;
	}
	function ss(e, t, n, r) {
		var i = ko();
		H.flags |= e, i.memoizedState = as(1 | t, { destroy: void 0 }, n, r === void 0 ? null : r);
	}
	function cs(e, t, n, r) {
		var i = Ao();
		r = r === void 0 ? null : r;
		var a = i.memoizedState.inst;
		U !== null && r !== null && xo(r, U.memoizedState.deps) ? i.memoizedState = as(t, a, n, r) : (H.flags |= e, i.memoizedState = as(1 | t, a, n, r));
	}
	function ls(e, t) {
		ss(8390656, 8, e, t);
	}
	function us(e, t) {
		cs(2048, 8, e, t);
	}
	function ds(e) {
		H.flags |= 4;
		var t = H.updateQueue;
		if (t === null) t = jo(), H.updateQueue = t, t.events = [e];
		else {
			var n = t.events;
			n === null ? t.events = [e] : n.push(e);
		}
	}
	function fs(e) {
		var t = Ao().memoizedState;
		return ds({
			ref: t,
			nextImpl: e
		}), function() {
			if (K & 2) throw Error(s(440));
			return t.impl.apply(void 0, arguments);
		};
	}
	function ps(e, t) {
		return cs(4, 2, e, t);
	}
	function ms(e, t) {
		return cs(4, 4, e, t);
	}
	function hs(e, t) {
		if (typeof t == "function") {
			e = e();
			var n = t(e);
			return function() {
				typeof n == "function" ? n() : t(null);
			};
		}
		if (t != null) return e = e(), t.current = e, function() {
			t.current = null;
		};
	}
	function gs(e, t, n) {
		n = n == null ? null : n.concat([e]), cs(4, 4, hs.bind(null, t, e), n);
	}
	function _s() {}
	function vs(e, t) {
		var n = Ao();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		return t !== null && xo(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
	}
	function ys(e, t) {
		var n = Ao();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		if (t !== null && xo(t, r[1])) return r[0];
		if (r = e(), ho) {
			Ve(!0);
			try {
				e();
			} finally {
				Ve(!1);
			}
		}
		return n.memoizedState = [r, t], r;
	}
	function bs(e, t, n) {
		return n === void 0 || uo & 1073741824 && !(Y & 261930) ? e.memoizedState = t : (e.memoizedState = n, e = mu(), H.lanes |= e, Gl |= e, n);
	}
	function xs(e, t, n, r) {
		return xr(n, t) ? n : Xa.current === null ? !(uo & 42) || uo & 1073741824 && !(Y & 261930) ? (rc = !0, e.memoizedState = n) : (e = mu(), H.lanes |= e, Gl |= e, t) : (e = bs(e, n, r), xr(e, t) || (rc = !0), e);
	}
	function Ss(e, t, n, r, i) {
		var a = A.p;
		A.p = a !== 0 && 8 > a ? a : 8;
		var o = k.T, s = {};
		k.T = s, Ps(e, !1, t, n);
		try {
			var c = i(), l = k.S;
			l !== null && l(s, c), typeof c == "object" && c && typeof c.then == "function" ? Ns(e, t, ma(c, r), pu(e)) : Ns(e, t, r, pu(e));
		} catch (n) {
			Ns(e, t, {
				then: function() {},
				status: "rejected",
				reason: n
			}, pu());
		} finally {
			A.p = a, o !== null && s.types !== null && (o.types = s.types), k.T = o;
		}
	}
	function Cs() {}
	function ws(e, t, n, r) {
		if (e.tag !== 5) throw Error(s(476));
		var i = Ts(e).queue;
		Ss(e, i, t, se, n === null ? Cs : function() {
			return Es(e), n(r);
		});
	}
	function Ts(e) {
		var t = e.memoizedState;
		if (t !== null) return t;
		t = {
			memoizedState: se,
			baseState: se,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: Fo,
				lastRenderedState: se
			},
			next: null
		};
		var n = {};
		return t.next = {
			memoizedState: n,
			baseState: n,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: Fo,
				lastRenderedState: n
			},
			next: null
		}, e.memoizedState = t, e = e.alternate, e !== null && (e.memoizedState = t), t;
	}
	function Es(e) {
		var t = Ts(e);
		t.next === null && (t = e.alternate.memoizedState), Ns(e, t.next.queue, {}, pu());
	}
	function Ds() {
		return $i(Qf);
	}
	function Os() {
		return Ao().memoizedState;
	}
	function ks() {
		return Ao().memoizedState;
	}
	function As(e) {
		for (var t = e.return; t !== null;) {
			switch (t.tag) {
				case 24:
				case 3:
					var n = pu();
					e = Va(n);
					var r = Ha(t, e, n);
					r !== null && (hu(r, t, n), Ua(r, t, n)), t = { cache: oa() }, e.payload = t;
					return;
			}
			t = t.return;
		}
	}
	function js(e, t, n) {
		var r = pu();
		n = {
			lane: r,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, Fs(e) ? Is(t, n) : (n = ti(e, t, n, r), n !== null && (hu(n, e, r), Ls(n, t, r)));
	}
	function Ms(e, t, n) {
		Ns(e, t, n, pu());
	}
	function Ns(e, t, n, r) {
		var i = {
			lane: r,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		};
		if (Fs(e)) Is(t, i);
		else {
			var a = e.alternate;
			if (e.lanes === 0 && (a === null || a.lanes === 0) && (a = t.lastRenderedReducer, a !== null)) try {
				var o = t.lastRenderedState, s = a(o, n);
				if (i.hasEagerState = !0, i.eagerState = s, xr(s, o)) return ei(e, t, i, 0), q === null && $r(), !1;
			} catch {}
			if (n = ti(e, t, i, r), n !== null) return hu(n, e, r), Ls(n, t, r), !0;
		}
		return !1;
	}
	function Ps(e, t, n, r) {
		if (r = {
			lane: 2,
			revertLane: dd(),
			gesture: null,
			action: r,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, Fs(e)) {
			if (t) throw Error(s(479));
		} else t = ti(e, n, r, 2), t !== null && hu(t, e, 2);
	}
	function Fs(e) {
		var t = e.alternate;
		return e === H || t !== null && t === H;
	}
	function Is(e, t) {
		mo = po = !0;
		var n = e.pending;
		n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
	}
	function Ls(e, t, n) {
		if (n & 4194048) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, I(e, n);
		}
	}
	var Rs = {
		readContext: $i,
		use: No,
		useCallback: bo,
		useContext: bo,
		useEffect: bo,
		useImperativeHandle: bo,
		useLayoutEffect: bo,
		useInsertionEffect: bo,
		useMemo: bo,
		useReducer: bo,
		useRef: bo,
		useState: bo,
		useDebugValue: bo,
		useDeferredValue: bo,
		useTransition: bo,
		useSyncExternalStore: bo,
		useId: bo,
		useHostTransitionStatus: bo,
		useFormState: bo,
		useActionState: bo,
		useOptimistic: bo,
		useMemoCache: bo,
		useCacheRefresh: bo
	};
	Rs.useEffectEvent = bo;
	var zs = {
		readContext: $i,
		use: No,
		useCallback: function(e, t) {
			return ko().memoizedState = [e, t === void 0 ? null : t], e;
		},
		useContext: $i,
		useEffect: ls,
		useImperativeHandle: function(e, t, n) {
			n = n == null ? null : n.concat([e]), ss(4194308, 4, hs.bind(null, t, e), n);
		},
		useLayoutEffect: function(e, t) {
			return ss(4194308, 4, e, t);
		},
		useInsertionEffect: function(e, t) {
			ss(4, 2, e, t);
		},
		useMemo: function(e, t) {
			var n = ko();
			t = t === void 0 ? null : t;
			var r = e();
			if (ho) {
				Ve(!0);
				try {
					e();
				} finally {
					Ve(!1);
				}
			}
			return n.memoizedState = [r, t], r;
		},
		useReducer: function(e, t, n) {
			var r = ko();
			if (n !== void 0) {
				var i = n(t);
				if (ho) {
					Ve(!0);
					try {
						n(t);
					} finally {
						Ve(!1);
					}
				}
			} else i = t;
			return r.memoizedState = r.baseState = i, e = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: e,
				lastRenderedState: i
			}, r.queue = e, e = e.dispatch = js.bind(null, H, e), [r.memoizedState, e];
		},
		useRef: function(e) {
			var t = ko();
			return e = { current: e }, t.memoizedState = e;
		},
		useState: function(e) {
			e = Go(e);
			var t = e.queue, n = Ms.bind(null, H, t);
			return t.dispatch = n, [e.memoizedState, n];
		},
		useDebugValue: _s,
		useDeferredValue: function(e, t) {
			return bs(ko(), e, t);
		},
		useTransition: function() {
			var e = Go(!1);
			return e = Ss.bind(null, H, e.queue, !0, !1), ko().memoizedState = e, [!1, e];
		},
		useSyncExternalStore: function(e, t, n) {
			var r = H, i = ko();
			if (V) {
				if (n === void 0) throw Error(s(407));
				n = n();
			} else {
				if (n = t(), q === null) throw Error(s(349));
				Y & 127 || Bo(r, t, n);
			}
			i.memoizedState = n;
			var a = {
				value: n,
				getSnapshot: t
			};
			return i.queue = a, ls(Ho.bind(null, r, a, e), [e]), r.flags |= 2048, as(9, { destroy: void 0 }, Vo.bind(null, r, a, n, t), null), n;
		},
		useId: function() {
			var e = ko(), t = q.identifierPrefix;
			if (V) {
				var n = Ei, r = Ti;
				n = (r & ~(1 << 32 - P(r) - 1)).toString(32) + n, t = "_" + t + "R_" + n, n = go++, 0 < n && (t += "H" + n.toString(32)), t += "_";
			} else n = yo++, t = "_" + t + "r_" + n.toString(32) + "_";
			return e.memoizedState = t;
		},
		useHostTransitionStatus: Ds,
		useFormState: es,
		useActionState: es,
		useOptimistic: function(e) {
			var t = ko();
			t.memoizedState = t.baseState = e;
			var n = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: null,
				lastRenderedState: null
			};
			return t.queue = n, t = Ps.bind(null, H, !0, n), n.dispatch = t, [e, t];
		},
		useMemoCache: Po,
		useCacheRefresh: function() {
			return ko().memoizedState = As.bind(null, H);
		},
		useEffectEvent: function(e) {
			var t = ko(), n = { impl: e };
			return t.memoizedState = n, function() {
				if (K & 2) throw Error(s(440));
				return n.impl.apply(void 0, arguments);
			};
		}
	}, Bs = {
		readContext: $i,
		use: No,
		useCallback: vs,
		useContext: $i,
		useEffect: us,
		useImperativeHandle: gs,
		useInsertionEffect: ps,
		useLayoutEffect: ms,
		useMemo: ys,
		useReducer: Io,
		useRef: os,
		useState: function() {
			return Io(Fo);
		},
		useDebugValue: _s,
		useDeferredValue: function(e, t) {
			return xs(Ao(), U.memoizedState, e, t);
		},
		useTransition: function() {
			var e = Io(Fo)[0], t = Ao().memoizedState;
			return [typeof e == "boolean" ? e : Mo(e), t];
		},
		useSyncExternalStore: zo,
		useId: Os,
		useHostTransitionStatus: Ds,
		useFormState: ts,
		useActionState: ts,
		useOptimistic: function(e, t) {
			return Ko(Ao(), U, e, t);
		},
		useMemoCache: Po,
		useCacheRefresh: ks
	};
	Bs.useEffectEvent = fs;
	var Vs = {
		readContext: $i,
		use: No,
		useCallback: vs,
		useContext: $i,
		useEffect: us,
		useImperativeHandle: gs,
		useInsertionEffect: ps,
		useLayoutEffect: ms,
		useMemo: ys,
		useReducer: Ro,
		useRef: os,
		useState: function() {
			return Ro(Fo);
		},
		useDebugValue: _s,
		useDeferredValue: function(e, t) {
			var n = Ao();
			return U === null ? bs(n, e, t) : xs(n, U.memoizedState, e, t);
		},
		useTransition: function() {
			var e = Ro(Fo)[0], t = Ao().memoizedState;
			return [typeof e == "boolean" ? e : Mo(e), t];
		},
		useSyncExternalStore: zo,
		useId: Os,
		useHostTransitionStatus: Ds,
		useFormState: is,
		useActionState: is,
		useOptimistic: function(e, t) {
			var n = Ao();
			return U === null ? (n.baseState = e, [e, n.queue.dispatch]) : Ko(n, U, e, t);
		},
		useMemoCache: Po,
		useCacheRefresh: ks
	};
	Vs.useEffectEvent = fs;
	function Hs(e, t, n, r) {
		t = e.memoizedState, n = n(r, t), n = n == null ? t : h({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
	}
	var Us = {
		enqueueSetState: function(e, t, n) {
			e = e._reactInternals;
			var r = pu(), i = Va(r);
			i.payload = t, n != null && (i.callback = n), t = Ha(e, i, r), t !== null && (hu(t, e, r), Ua(t, e, r));
		},
		enqueueReplaceState: function(e, t, n) {
			e = e._reactInternals;
			var r = pu(), i = Va(r);
			i.tag = 1, i.payload = t, n != null && (i.callback = n), t = Ha(e, i, r), t !== null && (hu(t, e, r), Ua(t, e, r));
		},
		enqueueForceUpdate: function(e, t) {
			e = e._reactInternals;
			var n = pu(), r = Va(n);
			r.tag = 2, t != null && (r.callback = t), t = Ha(e, r, n), t !== null && (hu(t, e, n), Ua(t, e, n));
		}
	};
	function Ws(e, t, n, r, i, a, o) {
		return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, a, o) : t.prototype && t.prototype.isPureReactComponent ? !Sr(n, r) || !Sr(i, a) : !0;
	}
	function Gs(e, t, n, r) {
		e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && Us.enqueueReplaceState(t, t.state, null);
	}
	function Ks(e, t) {
		var n = t;
		if ("ref" in t) for (var r in n = {}, t) r !== "ref" && (n[r] = t[r]);
		if (e = e.defaultProps) for (var i in n === t && (n = h({}, n)), e) n[i] === void 0 && (n[i] = e[i]);
		return n;
	}
	function qs(e) {
		Yr(e);
	}
	function Js(e) {
		console.error(e);
	}
	function Ys(e) {
		Yr(e);
	}
	function Xs(e, t) {
		try {
			var n = e.onUncaughtError;
			n(t.value, { componentStack: t.stack });
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	function Zs(e, t, n) {
		try {
			var r = e.onCaughtError;
			r(n.value, {
				componentStack: n.stack,
				errorBoundary: t.tag === 1 ? t.stateNode : null
			});
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	function Qs(e, t, n) {
		return n = Va(n), n.tag = 3, n.payload = { element: null }, n.callback = function() {
			Xs(e, t);
		}, n;
	}
	function $s(e) {
		return e = Va(e), e.tag = 3, e;
	}
	function ec(e, t, n, r) {
		var i = n.type.getDerivedStateFromError;
		if (typeof i == "function") {
			var a = r.value;
			e.payload = function() {
				return i(a);
			}, e.callback = function() {
				Zs(t, n, r);
			};
		}
		var o = n.stateNode;
		o !== null && typeof o.componentDidCatch == "function" && (e.callback = function() {
			Zs(t, n, r), typeof i != "function" && (ru === null ? ru = /* @__PURE__ */ new Set([this]) : ru.add(this));
			var e = r.stack;
			this.componentDidCatch(r.value, { componentStack: e === null ? "" : e });
		});
	}
	function tc(e, t, n, r, i) {
		if (n.flags |= 32768, typeof r == "object" && r && typeof r.then == "function") {
			if (t = n.alternate, t !== null && Xi(t, n, i, !0), n = to.current, n !== null) {
				switch (n.tag) {
					case 31:
					case 13: return no === null ? Du() : n.alternate === null && Wl === 0 && (Wl = 3), n.flags &= -257, n.flags |= 65536, n.lanes = i, r === Ca ? n.flags |= 16384 : (t = n.updateQueue, t === null ? n.updateQueue = /* @__PURE__ */ new Set([r]) : t.add(r), Gu(e, r, i)), !1;
					case 22: return n.flags |= 65536, r === Ca ? n.flags |= 16384 : (t = n.updateQueue, t === null ? (t = {
						transitions: null,
						markerInstances: null,
						retryQueue: /* @__PURE__ */ new Set([r])
					}, n.updateQueue = t) : (n = t.retryQueue, n === null ? t.retryQueue = /* @__PURE__ */ new Set([r]) : n.add(r)), Gu(e, r, i)), !1;
				}
				throw Error(s(435, n.tag));
			}
			return Gu(e, r, i), Du(), !1;
		}
		if (V) return t = to.current, t === null ? (r !== Fi && (t = Error(s(423), { cause: r }), Hi(_i(t, n))), e = e.current.alternate, e.flags |= 65536, i &= -i, e.lanes |= i, r = _i(r, n), i = Qs(e.stateNode, r, i), Wa(e, i), Wl !== 4 && (Wl = 2)) : (!(t.flags & 65536) && (t.flags |= 256), t.flags |= 65536, t.lanes = i, r !== Fi && (e = Error(s(422), { cause: r }), Hi(_i(e, n)))), !1;
		var a = Error(s(520), { cause: r });
		if (a = _i(a, n), Xl === null ? Xl = [a] : Xl.push(a), Wl !== 4 && (Wl = 2), t === null) return !0;
		r = _i(r, n), n = t;
		do {
			switch (n.tag) {
				case 3: return n.flags |= 65536, e = i & -i, n.lanes |= e, e = Qs(n.stateNode, r, e), Wa(n, e), !1;
				case 1: if (t = n.type, a = n.stateNode, !(n.flags & 128) && (typeof t.getDerivedStateFromError == "function" || a !== null && typeof a.componentDidCatch == "function" && (ru === null || !ru.has(a)))) return n.flags |= 65536, i &= -i, n.lanes |= i, i = $s(i), ec(i, e, n, r), Wa(n, i), !1;
			}
			n = n.return;
		} while (n !== null);
		return !1;
	}
	var nc = Error(s(461)), rc = !1;
	function ic(e, t, n, r) {
		t.child = e === null ? La(t, null, n, r) : Ia(t, e.child, n, r);
	}
	function ac(e, t, n, r, i) {
		n = n.render;
		var a = t.ref;
		if ("ref" in r) {
			var o = {};
			for (var s in r) s !== "ref" && (o[s] = r[s]);
		} else o = r;
		return Qi(t), r = So(e, t, n, o, a, i), s = Eo(), e !== null && !rc ? (Do(e, t, i), kc(e, t, i)) : (V && s && ki(t), t.flags |= 1, ic(e, t, r, i), t.child);
	}
	function oc(e, t, n, r, i) {
		if (e === null) {
			var a = n.type;
			return typeof a == "function" && !ci(a) && a.defaultProps === void 0 && n.compare === null ? (t.tag = 15, t.type = a, sc(e, t, a, r, i)) : (e = di(n.type, null, r, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
		}
		if (a = e.child, !Ac(e, i)) {
			var o = a.memoizedProps;
			if (n = n.compare, n = n === null ? Sr : n, n(o, r) && e.ref === t.ref) return kc(e, t, i);
		}
		return t.flags |= 1, e = li(a, r), e.ref = t.ref, e.return = t, t.child = e;
	}
	function sc(e, t, n, r, i) {
		if (e !== null) {
			var a = e.memoizedProps;
			if (Sr(a, r) && e.ref === t.ref) if (rc = !1, t.pendingProps = r = a, Ac(e, i)) e.flags & 131072 && (rc = !0);
			else return t.lanes = e.lanes, kc(e, t, i);
		}
		return hc(e, t, n, r, i);
	}
	function cc(e, t, n, r) {
		var i = r.children, a = e === null ? null : e.memoizedState;
		if (e === null && t.stateNode === null && (t.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		}), r.mode === "hidden") {
			if (t.flags & 128) {
				if (a = a === null ? n : a.baseLanes | n, e !== null) {
					for (r = t.child = e.child, i = 0; r !== null;) i = i | r.lanes | r.childLanes, r = r.sibling;
					r = i & ~a;
				} else r = 0, t.child = null;
				return uc(e, t, a, n, r);
			}
			if (n & 536870912) t.memoizedState = {
				baseLanes: 0,
				cachePool: null
			}, e !== null && va(t, a === null ? null : a.cachePool), a === null ? $a() : Qa(t, a), ao(t);
			else return r = t.lanes = 536870912, uc(e, t, a === null ? n : a.baseLanes | n, n, r);
		} else a === null ? (e !== null && va(t, null), $a(), oo(t)) : (va(t, a.cachePool), Qa(t, a), oo(t), t.memoizedState = null);
		return ic(e, t, i, n), t.child;
	}
	function lc(e, t) {
		return e !== null && e.tag === 22 || t.stateNode !== null || (t.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		}), t.sibling;
	}
	function uc(e, t, n, r, i) {
		var a = _a();
		return a = a === null ? null : {
			parent: aa._currentValue,
			pool: a
		}, t.memoizedState = {
			baseLanes: n,
			cachePool: a
		}, e !== null && va(t, null), $a(), ao(t), e !== null && Xi(e, t, r, !0), t.childLanes = i, null;
	}
	function dc(e, t) {
		return t = wc({
			mode: t.mode,
			children: t.children
		}, e.mode), t.ref = e.ref, e.child = t, t.return = e, t;
	}
	function fc(e, t, n) {
		return Ia(t, e.child, null, n), e = dc(t, t.pendingProps), e.flags |= 2, so(t), t.memoizedState = null, e;
	}
	function pc(e, t, n) {
		var r = t.pendingProps, i = !!(t.flags & 128);
		if (t.flags &= -129, e === null) {
			if (V) {
				if (r.mode === "hidden") return e = dc(t, r), t.lanes = 536870912, lc(null, e);
				if (io(t), (e = B) ? (e = rf(e, Pi), e = e !== null && e.data === "&" ? e : null, e !== null && (t.memoizedState = {
					dehydrated: e,
					treeContext: wi === null ? null : {
						id: Ti,
						overflow: Ei
					},
					retryLane: 536870912,
					hydrationErrors: null
				}, n = mi(e), n.return = t, t.child = n, Mi = t, B = null)) : e = null, e === null) throw Ii(t);
				return t.lanes = 536870912, null;
			}
			return dc(t, r);
		}
		var a = e.memoizedState;
		if (a !== null) {
			var o = a.dehydrated;
			if (io(t), i) if (t.flags & 256) t.flags &= -257, t = fc(e, t, n);
			else if (t.memoizedState !== null) t.child = e.child, t.flags |= 128, t = null;
			else throw Error(s(558));
			else if (rc || Xi(e, t, n, !1), i = (n & e.childLanes) !== 0, rc || i) {
				if (r = q, r !== null && (o = nt(r, n), o !== 0 && o !== a.retryLane)) throw a.retryLane = o, ni(e, o), hu(r, e, o), nc;
				Du(), t = fc(e, t, n);
			} else e = a.treeContext, B = cf(o.nextSibling), Mi = t, V = !0, Ni = null, Pi = !1, e !== null && ji(t, e), t = dc(t, r), t.flags |= 4096;
			return t;
		}
		return e = li(e.child, {
			mode: r.mode,
			children: r.children
		}), e.ref = t.ref, t.child = e, e.return = t, e;
	}
	function mc(e, t) {
		var n = t.ref;
		if (n === null) e !== null && e.ref !== null && (t.flags |= 4194816);
		else {
			if (typeof n != "function" && typeof n != "object") throw Error(s(284));
			(e === null || e.ref !== n) && (t.flags |= 4194816);
		}
	}
	function hc(e, t, n, r, i) {
		return Qi(t), n = So(e, t, n, r, void 0, i), r = Eo(), e !== null && !rc ? (Do(e, t, i), kc(e, t, i)) : (V && r && ki(t), t.flags |= 1, ic(e, t, n, i), t.child);
	}
	function gc(e, t, n, r, i, a) {
		return Qi(t), t.updateQueue = null, n = wo(t, r, n, i), Co(e), r = Eo(), e !== null && !rc ? (Do(e, t, a), kc(e, t, a)) : (V && r && ki(t), t.flags |= 1, ic(e, t, n, a), t.child);
	}
	function _c(e, t, n, r, i) {
		if (Qi(t), t.stateNode === null) {
			var a = ai, o = n.contextType;
			typeof o == "object" && o && (a = $i(o)), a = new n(r, a), t.memoizedState = a.state !== null && a.state !== void 0 ? a.state : null, a.updater = Us, t.stateNode = a, a._reactInternals = t, a = t.stateNode, a.props = r, a.state = t.memoizedState, a.refs = {}, za(t), o = n.contextType, a.context = typeof o == "object" && o ? $i(o) : ai, a.state = t.memoizedState, o = n.getDerivedStateFromProps, typeof o == "function" && (Hs(t, n, o, r), a.state = t.memoizedState), typeof n.getDerivedStateFromProps == "function" || typeof a.getSnapshotBeforeUpdate == "function" || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (o = a.state, typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount(), o !== a.state && Us.enqueueReplaceState(a, a.state, null), qa(t, r, a, i), Ka(), a.state = t.memoizedState), typeof a.componentDidMount == "function" && (t.flags |= 4194308), r = !0;
		} else if (e === null) {
			a = t.stateNode;
			var s = t.memoizedProps, c = Ks(n, s);
			a.props = c;
			var l = a.context, u = n.contextType;
			o = ai, typeof u == "object" && u && (o = $i(u));
			var d = n.getDerivedStateFromProps;
			u = typeof d == "function" || typeof a.getSnapshotBeforeUpdate == "function", s = t.pendingProps !== s, u || typeof a.UNSAFE_componentWillReceiveProps != "function" && typeof a.componentWillReceiveProps != "function" || (s || l !== o) && Gs(t, a, r, o), Ra = !1;
			var f = t.memoizedState;
			a.state = f, qa(t, r, a, i), Ka(), l = t.memoizedState, s || f !== l || Ra ? (typeof d == "function" && (Hs(t, n, d, r), l = t.memoizedState), (c = Ra || Ws(t, n, c, r, f, l, o)) ? (u || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount()), typeof a.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof a.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = l), a.props = r, a.state = l, a.context = o, r = c) : (typeof a.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
		} else {
			a = t.stateNode, Ba(e, t), o = t.memoizedProps, u = Ks(n, o), a.props = u, d = t.pendingProps, f = a.context, l = n.contextType, c = ai, typeof l == "object" && l && (c = $i(l)), s = n.getDerivedStateFromProps, (l = typeof s == "function" || typeof a.getSnapshotBeforeUpdate == "function") || typeof a.UNSAFE_componentWillReceiveProps != "function" && typeof a.componentWillReceiveProps != "function" || (o !== d || f !== c) && Gs(t, a, r, c), Ra = !1, f = t.memoizedState, a.state = f, qa(t, r, a, i), Ka();
			var p = t.memoizedState;
			o !== d || f !== p || Ra || e !== null && e.dependencies !== null && Zi(e.dependencies) ? (typeof s == "function" && (Hs(t, n, s, r), p = t.memoizedState), (u = Ra || Ws(t, n, u, r, f, p, c) || e !== null && e.dependencies !== null && Zi(e.dependencies)) ? (l || typeof a.UNSAFE_componentWillUpdate != "function" && typeof a.componentWillUpdate != "function" || (typeof a.componentWillUpdate == "function" && a.componentWillUpdate(r, p, c), typeof a.UNSAFE_componentWillUpdate == "function" && a.UNSAFE_componentWillUpdate(r, p, c)), typeof a.componentDidUpdate == "function" && (t.flags |= 4), typeof a.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof a.componentDidUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof a.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = p), a.props = r, a.state = p, a.context = c, r = u) : (typeof a.componentDidUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof a.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), r = !1);
		}
		return a = r, mc(e, t), r = !!(t.flags & 128), a || r ? (a = t.stateNode, n = r && typeof n.getDerivedStateFromError != "function" ? null : a.render(), t.flags |= 1, e !== null && r ? (t.child = Ia(t, e.child, null, i), t.child = Ia(t, null, n, i)) : ic(e, t, n, i), t.memoizedState = a.state, e = t.child) : e = kc(e, t, i), e;
	}
	function vc(e, t, n, r) {
		return Bi(), t.flags |= 256, ic(e, t, n, r), t.child;
	}
	var yc = {
		dehydrated: null,
		treeContext: null,
		retryLane: 0,
		hydrationErrors: null
	};
	function bc(e) {
		return {
			baseLanes: e,
			cachePool: ya()
		};
	}
	function xc(e, t, n) {
		return e = e === null ? 0 : e.childLanes & ~n, t && (e |= Jl), e;
	}
	function Sc(e, t, n) {
		var r = t.pendingProps, i = !1, a = !!(t.flags & 128), o;
		if ((o = a) || (o = e !== null && e.memoizedState === null ? !1 : !!(co.current & 2)), o && (i = !0, t.flags &= -129), o = !!(t.flags & 32), t.flags &= -33, e === null) {
			if (V) {
				if (i ? ro(t) : oo(t), (e = B) ? (e = rf(e, Pi), e = e !== null && e.data !== "&" ? e : null, e !== null && (t.memoizedState = {
					dehydrated: e,
					treeContext: wi === null ? null : {
						id: Ti,
						overflow: Ei
					},
					retryLane: 536870912,
					hydrationErrors: null
				}, n = mi(e), n.return = t, t.child = n, Mi = t, B = null)) : e = null, e === null) throw Ii(t);
				return of(e) ? t.lanes = 32 : t.lanes = 536870912, null;
			}
			var c = r.children;
			return r = r.fallback, i ? (oo(t), i = t.mode, c = wc({
				mode: "hidden",
				children: c
			}, i), r = fi(r, i, n, null), c.return = t, r.return = t, c.sibling = r, t.child = c, r = t.child, r.memoizedState = bc(n), r.childLanes = xc(e, o, n), t.memoizedState = yc, lc(null, r)) : (ro(t), Cc(t, c));
		}
		var l = e.memoizedState;
		if (l !== null && (c = l.dehydrated, c !== null)) {
			if (a) t.flags & 256 ? (ro(t), t.flags &= -257, t = Tc(e, t, n)) : t.memoizedState === null ? (oo(t), c = r.fallback, i = t.mode, r = wc({
				mode: "visible",
				children: r.children
			}, i), c = fi(c, i, n, null), c.flags |= 2, r.return = t, c.return = t, r.sibling = c, t.child = r, Ia(t, e.child, null, n), r = t.child, r.memoizedState = bc(n), r.childLanes = xc(e, o, n), t.memoizedState = yc, t = lc(null, r)) : (oo(t), t.child = e.child, t.flags |= 128, t = null);
			else if (ro(t), of(c)) {
				if (o = c.nextSibling && c.nextSibling.dataset, o) var u = o.dgst;
				o = u, r = Error(s(419)), r.stack = "", r.digest = o, Hi({
					value: r,
					source: null,
					stack: null
				}), t = Tc(e, t, n);
			} else if (rc || Xi(e, t, n, !1), o = (n & e.childLanes) !== 0, rc || o) {
				if (o = q, o !== null && (r = nt(o, n), r !== 0 && r !== l.retryLane)) throw l.retryLane = r, ni(e, r), hu(o, e, r), nc;
				af(c) || Du(), t = Tc(e, t, n);
			} else af(c) ? (t.flags |= 192, t.child = e.child, t = null) : (e = l.treeContext, B = cf(c.nextSibling), Mi = t, V = !0, Ni = null, Pi = !1, e !== null && ji(t, e), t = Cc(t, r.children), t.flags |= 4096);
			return t;
		}
		return i ? (oo(t), c = r.fallback, i = t.mode, l = e.child, u = l.sibling, r = li(l, {
			mode: "hidden",
			children: r.children
		}), r.subtreeFlags = l.subtreeFlags & 65011712, u === null ? (c = fi(c, i, n, null), c.flags |= 2) : c = li(u, c), c.return = t, r.return = t, r.sibling = c, t.child = r, lc(null, r), r = t.child, c = e.child.memoizedState, c === null ? c = bc(n) : (i = c.cachePool, i === null ? i = ya() : (l = aa._currentValue, i = i.parent === l ? i : {
			parent: l,
			pool: l
		}), c = {
			baseLanes: c.baseLanes | n,
			cachePool: i
		}), r.memoizedState = c, r.childLanes = xc(e, o, n), t.memoizedState = yc, lc(e.child, r)) : (ro(t), n = e.child, e = n.sibling, n = li(n, {
			mode: "visible",
			children: r.children
		}), n.return = t, n.sibling = null, e !== null && (o = t.deletions, o === null ? (t.deletions = [e], t.flags |= 16) : o.push(e)), t.child = n, t.memoizedState = null, n);
	}
	function Cc(e, t) {
		return t = wc({
			mode: "visible",
			children: t
		}, e.mode), t.return = e, e.child = t;
	}
	function wc(e, t) {
		return e = si(22, e, null, t), e.lanes = 0, e;
	}
	function Tc(e, t, n) {
		return Ia(t, e.child, null, n), e = Cc(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
	}
	function Ec(e, t, n) {
		e.lanes |= t;
		var r = e.alternate;
		r !== null && (r.lanes |= t), Ji(e.return, t, n);
	}
	function Dc(e, t, n, r, i, a) {
		var o = e.memoizedState;
		o === null ? e.memoizedState = {
			isBackwards: t,
			rendering: null,
			renderingStartTime: 0,
			last: r,
			tail: n,
			tailMode: i,
			treeForkCount: a
		} : (o.isBackwards = t, o.rendering = null, o.renderingStartTime = 0, o.last = r, o.tail = n, o.tailMode = i, o.treeForkCount = a);
	}
	function Oc(e, t, n) {
		var r = t.pendingProps, i = r.revealOrder, a = r.tail;
		r = r.children;
		var o = co.current, s = !!(o & 2);
		if (s ? (o = o & 1 | 2, t.flags |= 128) : o &= 1, N(co, o), ic(e, t, r, n), r = V ? xi : 0, !s && e !== null && e.flags & 128) a: for (e = t.child; e !== null;) {
			if (e.tag === 13) e.memoizedState !== null && Ec(e, n, t);
			else if (e.tag === 19) Ec(e, n, t);
			else if (e.child !== null) {
				e.child.return = e, e = e.child;
				continue;
			}
			if (e === t) break a;
			for (; e.sibling === null;) {
				if (e.return === null || e.return === t) break a;
				e = e.return;
			}
			e.sibling.return = e.return, e = e.sibling;
		}
		switch (i) {
			case "forwards":
				for (n = t.child, i = null; n !== null;) e = n.alternate, e !== null && lo(e) === null && (i = n), n = n.sibling;
				n = i, n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null), Dc(t, !1, i, n, a, r);
				break;
			case "backwards":
			case "unstable_legacy-backwards":
				for (n = null, i = t.child, t.child = null; i !== null;) {
					if (e = i.alternate, e !== null && lo(e) === null) {
						t.child = i;
						break;
					}
					e = i.sibling, i.sibling = n, n = i, i = e;
				}
				Dc(t, !0, n, null, a, r);
				break;
			case "together":
				Dc(t, !1, null, null, void 0, r);
				break;
			default: t.memoizedState = null;
		}
		return t.child;
	}
	function kc(e, t, n) {
		if (e !== null && (t.dependencies = e.dependencies), Gl |= t.lanes, (n & t.childLanes) === 0) if (e !== null) {
			if (Xi(e, t, n, !1), (n & t.childLanes) === 0) return null;
		} else return null;
		if (e !== null && t.child !== e.child) throw Error(s(153));
		if (t.child !== null) {
			for (e = t.child, n = li(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null;) e = e.sibling, n = n.sibling = li(e, e.pendingProps), n.return = t;
			n.sibling = null;
		}
		return t.child;
	}
	function Ac(e, t) {
		return (e.lanes & t) !== 0 || (e = e.dependencies, !!(e !== null && Zi(e)));
	}
	function jc(e, t, n) {
		switch (t.tag) {
			case 3:
				me(t, t.stateNode.containerInfo), Ki(t, aa, e.memoizedState.cache), Bi();
				break;
			case 27:
			case 5:
				ge(t);
				break;
			case 4:
				me(t, t.stateNode.containerInfo);
				break;
			case 10:
				Ki(t, t.type, t.memoizedProps.value);
				break;
			case 31:
				if (t.memoizedState !== null) return t.flags |= 128, io(t), null;
				break;
			case 13:
				var r = t.memoizedState;
				if (r !== null) return r.dehydrated === null ? (n & t.child.childLanes) === 0 ? (ro(t), e = kc(e, t, n), e === null ? null : e.sibling) : Sc(e, t, n) : (ro(t), t.flags |= 128, null);
				ro(t);
				break;
			case 19:
				var i = !!(e.flags & 128);
				if (r = (n & t.childLanes) !== 0, r ||= (Xi(e, t, n, !1), (n & t.childLanes) !== 0), i) {
					if (r) return Oc(e, t, n);
					t.flags |= 128;
				}
				if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), N(co, co.current), r) break;
				return null;
			case 22: return t.lanes = 0, cc(e, t, n, t.pendingProps);
			case 24: Ki(t, aa, e.memoizedState.cache);
		}
		return kc(e, t, n);
	}
	function Mc(e, t, n) {
		if (e !== null) if (e.memoizedProps !== t.pendingProps) rc = !0;
		else {
			if (!Ac(e, n) && !(t.flags & 128)) return rc = !1, jc(e, t, n);
			rc = !!(e.flags & 131072);
		}
		else rc = !1, V && t.flags & 1048576 && Oi(t, xi, t.index);
		switch (t.lanes = 0, t.tag) {
			case 16:
				a: {
					var r = t.pendingProps;
					if (e = Ea(t.elementType), t.type = e, typeof e == "function") ci(e) ? (r = Ks(e, r), t.tag = 1, t = _c(null, t, e, r, n)) : (t.tag = 0, t = hc(null, t, e, r, n));
					else {
						if (e != null) {
							var i = e.$$typeof;
							if (i === w) {
								t.tag = 11, t = ac(null, t, e, r, n);
								break a;
							}
							if (i === ee) {
								t.tag = 14, t = oc(null, t, e, r, n);
								break a;
							}
						}
						throw t = ae(e) || e, Error(s(306, t, ""));
					}
				}
				return t;
			case 0: return hc(e, t, t.type, t.pendingProps, n);
			case 1: return r = t.type, i = Ks(r, t.pendingProps), _c(e, t, r, i, n);
			case 3:
				a: {
					if (me(t, t.stateNode.containerInfo), e === null) throw Error(s(387));
					r = t.pendingProps;
					var a = t.memoizedState;
					i = a.element, Ba(e, t), qa(t, r, null, n);
					var o = t.memoizedState;
					if (r = o.cache, Ki(t, aa, r), r !== a.cache && Yi(t, [aa], n, !0), Ka(), r = o.element, a.isDehydrated) if (a = {
						element: r,
						isDehydrated: !1,
						cache: o.cache
					}, t.updateQueue.baseState = a, t.memoizedState = a, t.flags & 256) {
						t = vc(e, t, r, n);
						break a;
					} else if (r !== i) {
						i = _i(Error(s(424)), t), Hi(i), t = vc(e, t, r, n);
						break a;
					} else {
						switch (e = t.stateNode.containerInfo, e.nodeType) {
							case 9:
								e = e.body;
								break;
							default: e = e.nodeName === "HTML" ? e.ownerDocument.body : e;
						}
						for (B = cf(e.firstChild), Mi = t, V = !0, Ni = null, Pi = !0, n = La(t, null, r, n), t.child = n; n;) n.flags = n.flags & -3 | 4096, n = n.sibling;
					}
					else {
						if (Bi(), r === i) {
							t = kc(e, t, n);
							break a;
						}
						ic(e, t, r, n);
					}
					t = t.child;
				}
				return t;
			case 26: return mc(e, t), e === null ? (n = kf(t.type, null, t.pendingProps, null)) ? t.memoizedState = n : V || (n = t.type, e = t.pendingProps, r = Bd(fe.current).createElement(n), r[L] = t, r[R] = e, Pd(r, n, e), yt(r), t.stateNode = r) : t.memoizedState = kf(t.type, e.memoizedProps, t.pendingProps, e.memoizedState), null;
			case 27: return ge(t), e === null && V && (r = t.stateNode = ff(t.type, t.pendingProps, fe.current), Mi = t, Pi = !0, i = B, Zd(t.type) ? (lf = i, B = cf(r.firstChild)) : B = i), ic(e, t, t.pendingProps.children, n), mc(e, t), e === null && (t.flags |= 4194304), t.child;
			case 5: return e === null && V && ((i = r = B) && (r = tf(r, t.type, t.pendingProps, Pi), r === null ? i = !1 : (t.stateNode = r, Mi = t, B = cf(r.firstChild), Pi = !1, i = !0)), i || Ii(t)), ge(t), i = t.type, a = t.pendingProps, o = e === null ? null : e.memoizedProps, r = a.children, Ud(i, a) ? r = null : o !== null && Ud(i, o) && (t.flags |= 32), t.memoizedState !== null && (i = So(e, t, To, null, null, n), Qf._currentValue = i), mc(e, t), ic(e, t, r, n), t.child;
			case 6: return e === null && V && ((e = n = B) && (n = nf(n, t.pendingProps, Pi), n === null ? e = !1 : (t.stateNode = n, Mi = t, B = null, e = !0)), e || Ii(t)), null;
			case 13: return Sc(e, t, n);
			case 4: return me(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = Ia(t, null, r, n) : ic(e, t, r, n), t.child;
			case 11: return ac(e, t, t.type, t.pendingProps, n);
			case 7: return ic(e, t, t.pendingProps, n), t.child;
			case 8: return ic(e, t, t.pendingProps.children, n), t.child;
			case 12: return ic(e, t, t.pendingProps.children, n), t.child;
			case 10: return r = t.pendingProps, Ki(t, t.type, r.value), ic(e, t, r.children, n), t.child;
			case 9: return i = t.type._context, r = t.pendingProps.children, Qi(t), i = $i(i), r = r(i), t.flags |= 1, ic(e, t, r, n), t.child;
			case 14: return oc(e, t, t.type, t.pendingProps, n);
			case 15: return sc(e, t, t.type, t.pendingProps, n);
			case 19: return Oc(e, t, n);
			case 31: return pc(e, t, n);
			case 22: return cc(e, t, n, t.pendingProps);
			case 24: return Qi(t), r = $i(aa), e === null ? (i = _a(), i === null && (i = q, a = oa(), i.pooledCache = a, a.refCount++, a !== null && (i.pooledCacheLanes |= n), i = a), t.memoizedState = {
				parent: r,
				cache: i
			}, za(t), Ki(t, aa, i)) : ((e.lanes & n) !== 0 && (Ba(e, t), qa(t, null, null, n), Ka()), i = e.memoizedState, a = t.memoizedState, i.parent === r ? (r = a.cache, Ki(t, aa, r), r !== i.cache && Yi(t, [aa], n, !0)) : (i = {
				parent: r,
				cache: r
			}, t.memoizedState = i, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = i), Ki(t, aa, r))), ic(e, t, t.pendingProps.children, n), t.child;
			case 29: throw t.pendingProps;
		}
		throw Error(s(156, t.tag));
	}
	function Nc(e) {
		e.flags |= 4;
	}
	function Pc(e, t, n, r, i) {
		if ((t = !!(e.mode & 32)) && (t = !1), t) {
			if (e.flags |= 16777216, (i & 335544128) === i) if (e.stateNode.complete) e.flags |= 8192;
			else if (wu()) e.flags |= 8192;
			else throw Da = Ca, xa;
		} else e.flags &= -16777217;
	}
	function Fc(e, t) {
		if (t.type !== "stylesheet" || t.state.loading & 4) e.flags &= -16777217;
		else if (e.flags |= 16777216, !Wf(t)) if (wu()) e.flags |= 8192;
		else throw Da = Ca, xa;
	}
	function Ic(e, t) {
		t !== null && (e.flags |= 4), e.flags & 16384 && (t = e.tag === 22 ? 536870912 : Ze(), e.lanes |= t, Yl |= t);
	}
	function Lc(e, t) {
		if (!V) switch (e.tailMode) {
			case "hidden":
				t = e.tail;
				for (var n = null; t !== null;) t.alternate !== null && (n = t), t = t.sibling;
				n === null ? e.tail = null : n.sibling = null;
				break;
			case "collapsed":
				n = e.tail;
				for (var r = null; n !== null;) n.alternate !== null && (r = n), n = n.sibling;
				r === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null;
		}
	}
	function W(e) {
		var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
		if (t) for (var i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags & 65011712, r |= i.flags & 65011712, i.return = e, i = i.sibling;
		else for (i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags, r |= i.flags, i.return = e, i = i.sibling;
		return e.subtreeFlags |= r, e.childLanes = n, t;
	}
	function Rc(e, t, n) {
		var r = t.pendingProps;
		switch (Ai(t), t.tag) {
			case 16:
			case 15:
			case 0:
			case 11:
			case 7:
			case 8:
			case 12:
			case 9:
			case 14: return W(t), null;
			case 1: return W(t), null;
			case 3: return n = t.stateNode, r = null, e !== null && (r = e.memoizedState.cache), t.memoizedState.cache !== r && (t.flags |= 2048), qi(aa), he(), n.pendingContext && (n.context = n.pendingContext, n.pendingContext = null), (e === null || e.child === null) && (zi(t) ? Nc(t) : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, Vi())), W(t), null;
			case 26:
				var i = t.type, a = t.memoizedState;
				return e === null ? (Nc(t), a === null ? (W(t), Pc(t, i, null, r, n)) : (W(t), Fc(t, a))) : a ? a === e.memoizedState ? (W(t), t.flags &= -16777217) : (Nc(t), W(t), Fc(t, a)) : (e = e.memoizedProps, e !== r && Nc(t), W(t), Pc(t, i, e, r, n)), null;
			case 27:
				if (_e(t), n = fe.current, i = t.type, e !== null && t.stateNode != null) e.memoizedProps !== r && Nc(t);
				else {
					if (!r) {
						if (t.stateNode === null) throw Error(s(166));
						return W(t), null;
					}
					e = ue.current, zi(t) ? Li(t, e) : (e = ff(i, r, n), t.stateNode = e, Nc(t));
				}
				return W(t), null;
			case 5:
				if (_e(t), i = t.type, e !== null && t.stateNode != null) e.memoizedProps !== r && Nc(t);
				else {
					if (!r) {
						if (t.stateNode === null) throw Error(s(166));
						return W(t), null;
					}
					if (a = ue.current, zi(t)) Li(t, a);
					else {
						var o = Bd(fe.current);
						switch (a) {
							case 1:
								a = o.createElementNS("http://www.w3.org/2000/svg", i);
								break;
							case 2:
								a = o.createElementNS("http://www.w3.org/1998/Math/MathML", i);
								break;
							default: switch (i) {
								case "svg":
									a = o.createElementNS("http://www.w3.org/2000/svg", i);
									break;
								case "math":
									a = o.createElementNS("http://www.w3.org/1998/Math/MathML", i);
									break;
								case "script":
									a = o.createElement("div"), a.innerHTML = "<script><\/script>", a = a.removeChild(a.firstChild);
									break;
								case "select":
									a = typeof r.is == "string" ? o.createElement("select", { is: r.is }) : o.createElement("select"), r.multiple ? a.multiple = !0 : r.size && (a.size = r.size);
									break;
								default: a = typeof r.is == "string" ? o.createElement(i, { is: r.is }) : o.createElement(i);
							}
						}
						a[L] = t, a[R] = r;
						a: for (o = t.child; o !== null;) {
							if (o.tag === 5 || o.tag === 6) a.appendChild(o.stateNode);
							else if (o.tag !== 4 && o.tag !== 27 && o.child !== null) {
								o.child.return = o, o = o.child;
								continue;
							}
							if (o === t) break a;
							for (; o.sibling === null;) {
								if (o.return === null || o.return === t) break a;
								o = o.return;
							}
							o.sibling.return = o.return, o = o.sibling;
						}
						t.stateNode = a;
						a: switch (Pd(a, i, r), i) {
							case "button":
							case "input":
							case "select":
							case "textarea":
								r = !!r.autoFocus;
								break a;
							case "img":
								r = !0;
								break a;
							default: r = !1;
						}
						r && Nc(t);
					}
				}
				return W(t), Pc(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, n), null;
			case 6:
				if (e && t.stateNode != null) e.memoizedProps !== r && Nc(t);
				else {
					if (typeof r != "string" && t.stateNode === null) throw Error(s(166));
					if (e = fe.current, zi(t)) {
						if (e = t.stateNode, n = t.memoizedProps, r = null, i = Mi, i !== null) switch (i.tag) {
							case 27:
							case 5: r = i.memoizedProps;
						}
						e[L] = t, e = !!(e.nodeValue === n || r !== null && !0 === r.suppressHydrationWarning || Md(e.nodeValue, n)), e || Ii(t, !0);
					} else e = Bd(e).createTextNode(r), e[L] = t, t.stateNode = e;
				}
				return W(t), null;
			case 31:
				if (n = t.memoizedState, e === null || e.memoizedState !== null) {
					if (r = zi(t), n !== null) {
						if (e === null) {
							if (!r) throw Error(s(318));
							if (e = t.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(s(557));
							e[L] = t;
						} else Bi(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						W(t), e = !1;
					} else n = Vi(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = n), e = !0;
					if (!e) return t.flags & 256 ? (so(t), t) : (so(t), null);
					if (t.flags & 128) throw Error(s(558));
				}
				return W(t), null;
			case 13:
				if (r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
					if (i = zi(t), r !== null && r.dehydrated !== null) {
						if (e === null) {
							if (!i) throw Error(s(318));
							if (i = t.memoizedState, i = i === null ? null : i.dehydrated, !i) throw Error(s(317));
							i[L] = t;
						} else Bi(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						W(t), i = !1;
					} else i = Vi(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = i), i = !0;
					if (!i) return t.flags & 256 ? (so(t), t) : (so(t), null);
				}
				return so(t), t.flags & 128 ? (t.lanes = n, t) : (n = r !== null, e = e !== null && e.memoizedState !== null, n && (r = t.child, i = null, r.alternate !== null && r.alternate.memoizedState !== null && r.alternate.memoizedState.cachePool !== null && (i = r.alternate.memoizedState.cachePool.pool), a = null, r.memoizedState !== null && r.memoizedState.cachePool !== null && (a = r.memoizedState.cachePool.pool), a !== i && (r.flags |= 2048)), n !== e && n && (t.child.flags |= 8192), Ic(t, t.updateQueue), W(t), null);
			case 4: return he(), e === null && Sd(t.stateNode.containerInfo), W(t), null;
			case 10: return qi(t.type), W(t), null;
			case 19:
				if (M(co), r = t.memoizedState, r === null) return W(t), null;
				if (i = !!(t.flags & 128), a = r.rendering, a === null) if (i) Lc(r, !1);
				else {
					if (Wl !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null;) {
						if (a = lo(e), a !== null) {
							for (t.flags |= 128, Lc(r, !1), e = a.updateQueue, t.updateQueue = e, Ic(t, e), t.subtreeFlags = 0, e = n, n = t.child; n !== null;) ui(n, e), n = n.sibling;
							return N(co, co.current & 1 | 2), V && Di(t, r.treeForkCount), t.child;
						}
						e = e.sibling;
					}
					r.tail !== null && Ae() > tu && (t.flags |= 128, i = !0, Lc(r, !1), t.lanes = 4194304);
				}
				else {
					if (!i) if (e = lo(a), e !== null) {
						if (t.flags |= 128, i = !0, e = e.updateQueue, t.updateQueue = e, Ic(t, e), Lc(r, !0), r.tail === null && r.tailMode === "hidden" && !a.alternate && !V) return W(t), null;
					} else 2 * Ae() - r.renderingStartTime > tu && n !== 536870912 && (t.flags |= 128, i = !0, Lc(r, !1), t.lanes = 4194304);
					r.isBackwards ? (a.sibling = t.child, t.child = a) : (e = r.last, e === null ? t.child = a : e.sibling = a, r.last = a);
				}
				return r.tail === null ? (W(t), null) : (e = r.tail, r.rendering = e, r.tail = e.sibling, r.renderingStartTime = Ae(), e.sibling = null, n = co.current, N(co, i ? n & 1 | 2 : n & 1), V && Di(t, r.treeForkCount), e);
			case 22:
			case 23: return so(t), eo(), r = t.memoizedState !== null, e === null ? r && (t.flags |= 8192) : e.memoizedState !== null !== r && (t.flags |= 8192), r ? n & 536870912 && !(t.flags & 128) && (W(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : W(t), n = t.updateQueue, n !== null && Ic(t, n.retryQueue), n = null, e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), r = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (r = t.memoizedState.cachePool.pool), r !== n && (t.flags |= 2048), e !== null && M(ga), null;
			case 24: return n = null, e !== null && (n = e.memoizedState.cache), t.memoizedState.cache !== n && (t.flags |= 2048), qi(aa), W(t), null;
			case 25: return null;
			case 30: return null;
		}
		throw Error(s(156, t.tag));
	}
	function zc(e, t) {
		switch (Ai(t), t.tag) {
			case 1: return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 3: return qi(aa), he(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
			case 26:
			case 27:
			case 5: return _e(t), null;
			case 31:
				if (t.memoizedState !== null) {
					if (so(t), t.alternate === null) throw Error(s(340));
					Bi();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 13:
				if (so(t), e = t.memoizedState, e !== null && e.dehydrated !== null) {
					if (t.alternate === null) throw Error(s(340));
					Bi();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 19: return M(co), null;
			case 4: return he(), null;
			case 10: return qi(t.type), null;
			case 22:
			case 23: return so(t), eo(), e !== null && M(ga), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 24: return qi(aa), null;
			case 25: return null;
			default: return null;
		}
	}
	function Bc(e, t) {
		switch (Ai(t), t.tag) {
			case 3:
				qi(aa), he();
				break;
			case 26:
			case 27:
			case 5:
				_e(t);
				break;
			case 4:
				he();
				break;
			case 31:
				t.memoizedState !== null && so(t);
				break;
			case 13:
				so(t);
				break;
			case 19:
				M(co);
				break;
			case 10:
				qi(t.type);
				break;
			case 22:
			case 23:
				so(t), eo(), e !== null && M(ga);
				break;
			case 24: qi(aa);
		}
	}
	function Vc(e, t) {
		try {
			var n = t.updateQueue, r = n === null ? null : n.lastEffect;
			if (r !== null) {
				var i = r.next;
				n = i;
				do {
					if ((n.tag & e) === e) {
						r = void 0;
						var a = n.create, o = n.inst;
						r = a(), o.destroy = r;
					}
					n = n.next;
				} while (n !== i);
			}
		} catch (e) {
			Z(t, t.return, e);
		}
	}
	function Hc(e, t, n) {
		try {
			var r = t.updateQueue, i = r === null ? null : r.lastEffect;
			if (i !== null) {
				var a = i.next;
				r = a;
				do {
					if ((r.tag & e) === e) {
						var o = r.inst, s = o.destroy;
						if (s !== void 0) {
							o.destroy = void 0, i = t;
							var c = n, l = s;
							try {
								l();
							} catch (e) {
								Z(i, c, e);
							}
						}
					}
					r = r.next;
				} while (r !== a);
			}
		} catch (e) {
			Z(t, t.return, e);
		}
	}
	function Uc(e) {
		var t = e.updateQueue;
		if (t !== null) {
			var n = e.stateNode;
			try {
				Ya(t, n);
			} catch (t) {
				Z(e, e.return, t);
			}
		}
	}
	function Wc(e, t, n) {
		n.props = Ks(e.type, e.memoizedProps), n.state = e.memoizedState;
		try {
			n.componentWillUnmount();
		} catch (n) {
			Z(e, t, n);
		}
	}
	function Gc(e, t) {
		try {
			var n = e.ref;
			if (n !== null) {
				switch (e.tag) {
					case 26:
					case 27:
					case 5:
						var r = e.stateNode;
						break;
					case 30:
						r = e.stateNode;
						break;
					default: r = e.stateNode;
				}
				typeof n == "function" ? e.refCleanup = n(r) : n.current = r;
			}
		} catch (n) {
			Z(e, t, n);
		}
	}
	function Kc(e, t) {
		var n = e.ref, r = e.refCleanup;
		if (n !== null) if (typeof r == "function") try {
			r();
		} catch (n) {
			Z(e, t, n);
		} finally {
			e.refCleanup = null, e = e.alternate, e != null && (e.refCleanup = null);
		}
		else if (typeof n == "function") try {
			n(null);
		} catch (n) {
			Z(e, t, n);
		}
		else n.current = null;
	}
	function qc(e) {
		var t = e.type, n = e.memoizedProps, r = e.stateNode;
		try {
			a: switch (t) {
				case "button":
				case "input":
				case "select":
				case "textarea":
					n.autoFocus && r.focus();
					break a;
				case "img": n.src ? r.src = n.src : n.srcSet && (r.srcset = n.srcSet);
			}
		} catch (t) {
			Z(e, e.return, t);
		}
	}
	function Jc(e, t, n) {
		try {
			var r = e.stateNode;
			Fd(r, e.type, n, t), r[R] = t;
		} catch (t) {
			Z(e, e.return, t);
		}
	}
	function Yc(e) {
		return e.tag === 5 || e.tag === 3 || e.tag === 26 || e.tag === 27 && Zd(e.type) || e.tag === 4;
	}
	function Xc(e) {
		a: for (;;) {
			for (; e.sibling === null;) {
				if (e.return === null || Yc(e.return)) return null;
				e = e.return;
			}
			for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18;) {
				if (e.tag === 27 && Zd(e.type) || e.flags & 2 || e.child === null || e.tag === 4) continue a;
				e.child.return = e, e = e.child;
			}
			if (!(e.flags & 2)) return e.stateNode;
		}
	}
	function Zc(e, t, n) {
		var r = e.tag;
		if (r === 5 || r === 6) e = e.stateNode, t ? (n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n).insertBefore(e, t) : (t = n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n, t.appendChild(e), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = Qt));
		else if (r !== 4 && (r === 27 && Zd(e.type) && (n = e.stateNode, t = null), e = e.child, e !== null)) for (Zc(e, t, n), e = e.sibling; e !== null;) Zc(e, t, n), e = e.sibling;
	}
	function Qc(e, t, n) {
		var r = e.tag;
		if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
		else if (r !== 4 && (r === 27 && Zd(e.type) && (n = e.stateNode), e = e.child, e !== null)) for (Qc(e, t, n), e = e.sibling; e !== null;) Qc(e, t, n), e = e.sibling;
	}
	function $c(e) {
		var t = e.stateNode, n = e.memoizedProps;
		try {
			for (var r = e.type, i = t.attributes; i.length;) t.removeAttributeNode(i[0]);
			Pd(t, r, n), t[L] = e, t[R] = n;
		} catch (t) {
			Z(e, e.return, t);
		}
	}
	var el = !1, tl = !1, nl = !1, rl = typeof WeakSet == "function" ? WeakSet : Set, il = null;
	function al(e, t) {
		if (e = e.containerInfo, Rd = sp, e = Er(e), Dr(e)) {
			if ("selectionStart" in e) var n = {
				start: e.selectionStart,
				end: e.selectionEnd
			};
			else a: {
				n = (n = e.ownerDocument) && n.defaultView || window;
				var r = n.getSelection && n.getSelection();
				if (r && r.rangeCount !== 0) {
					n = r.anchorNode;
					var i = r.anchorOffset, a = r.focusNode;
					r = r.focusOffset;
					try {
						n.nodeType, a.nodeType;
					} catch {
						n = null;
						break a;
					}
					var o = 0, c = -1, l = -1, u = 0, d = 0, f = e, p = null;
					b: for (;;) {
						for (var m; f !== n || i !== 0 && f.nodeType !== 3 || (c = o + i), f !== a || r !== 0 && f.nodeType !== 3 || (l = o + r), f.nodeType === 3 && (o += f.nodeValue.length), (m = f.firstChild) !== null;) p = f, f = m;
						for (;;) {
							if (f === e) break b;
							if (p === n && ++u === i && (c = o), p === a && ++d === r && (l = o), (m = f.nextSibling) !== null) break;
							f = p, p = f.parentNode;
						}
						f = m;
					}
					n = c === -1 || l === -1 ? null : {
						start: c,
						end: l
					};
				} else n = null;
			}
			n ||= {
				start: 0,
				end: 0
			};
		} else n = null;
		for (zd = {
			focusedElem: e,
			selectionRange: n
		}, sp = !1, il = t; il !== null;) if (t = il, e = t.child, t.subtreeFlags & 1028 && e !== null) e.return = t, il = e;
		else for (; il !== null;) {
			switch (t = il, a = t.alternate, e = t.flags, t.tag) {
				case 0:
					if (e & 4 && (e = t.updateQueue, e = e === null ? null : e.events, e !== null)) for (n = 0; n < e.length; n++) i = e[n], i.ref.impl = i.nextImpl;
					break;
				case 11:
				case 15: break;
				case 1:
					if (e & 1024 && a !== null) {
						e = void 0, n = t, i = a.memoizedProps, a = a.memoizedState, r = n.stateNode;
						try {
							var h = Ks(n.type, i);
							e = r.getSnapshotBeforeUpdate(h, a), r.__reactInternalSnapshotBeforeUpdate = e;
						} catch (e) {
							Z(n, n.return, e);
						}
					}
					break;
				case 3:
					if (e & 1024) {
						if (e = t.stateNode.containerInfo, n = e.nodeType, n === 9) ef(e);
						else if (n === 1) switch (e.nodeName) {
							case "HEAD":
							case "HTML":
							case "BODY":
								ef(e);
								break;
							default: e.textContent = "";
						}
					}
					break;
				case 5:
				case 26:
				case 27:
				case 6:
				case 4:
				case 17: break;
				default: if (e & 1024) throw Error(s(163));
			}
			if (e = t.sibling, e !== null) {
				e.return = t.return, il = e;
				break;
			}
			il = t.return;
		}
	}
	function ol(e, t, n) {
		var r = n.flags;
		switch (n.tag) {
			case 0:
			case 11:
			case 15:
				bl(e, n), r & 4 && Vc(5, n);
				break;
			case 1:
				if (bl(e, n), r & 4) if (e = n.stateNode, t === null) try {
					e.componentDidMount();
				} catch (e) {
					Z(n, n.return, e);
				}
				else {
					var i = Ks(n.type, t.memoizedProps);
					t = t.memoizedState;
					try {
						e.componentDidUpdate(i, t, e.__reactInternalSnapshotBeforeUpdate);
					} catch (e) {
						Z(n, n.return, e);
					}
				}
				r & 64 && Uc(n), r & 512 && Gc(n, n.return);
				break;
			case 3:
				if (bl(e, n), r & 64 && (e = n.updateQueue, e !== null)) {
					if (t = null, n.child !== null) switch (n.child.tag) {
						case 27:
						case 5:
							t = n.child.stateNode;
							break;
						case 1: t = n.child.stateNode;
					}
					try {
						Ya(e, t);
					} catch (e) {
						Z(n, n.return, e);
					}
				}
				break;
			case 27: t === null && r & 4 && $c(n);
			case 26:
			case 5:
				bl(e, n), t === null && r & 4 && qc(n), r & 512 && Gc(n, n.return);
				break;
			case 12:
				bl(e, n);
				break;
			case 31:
				bl(e, n), r & 4 && dl(e, n);
				break;
			case 13:
				bl(e, n), r & 4 && fl(e, n), r & 64 && (e = n.memoizedState, e !== null && (e = e.dehydrated, e !== null && (n = Ju.bind(null, n), sf(e, n))));
				break;
			case 22:
				if (r = n.memoizedState !== null || el, !r) {
					t = t !== null && t.memoizedState !== null || tl, i = el;
					var a = tl;
					el = r, (tl = t) && !a ? Sl(e, n, !!(n.subtreeFlags & 8772)) : bl(e, n), el = i, tl = a;
				}
				break;
			case 30: break;
			default: bl(e, n);
		}
	}
	function sl(e) {
		var t = e.alternate;
		t !== null && (e.alternate = null, sl(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && mt(t)), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
	}
	var G = null, cl = !1;
	function ll(e, t, n) {
		for (n = n.child; n !== null;) ul(e, t, n), n = n.sibling;
	}
	function ul(e, t, n) {
		if (Be && typeof Be.onCommitFiberUnmount == "function") try {
			Be.onCommitFiberUnmount(ze, n);
		} catch {}
		switch (n.tag) {
			case 26:
				tl || Kc(n, t), ll(e, t, n), n.memoizedState ? n.memoizedState.count-- : n.stateNode && (n = n.stateNode, n.parentNode.removeChild(n));
				break;
			case 27:
				tl || Kc(n, t);
				var r = G, i = cl;
				Zd(n.type) && (G = n.stateNode, cl = !1), ll(e, t, n), pf(n.stateNode), G = r, cl = i;
				break;
			case 5: tl || Kc(n, t);
			case 6:
				if (r = G, i = cl, G = null, ll(e, t, n), G = r, cl = i, G !== null) if (cl) try {
					(G.nodeType === 9 ? G.body : G.nodeName === "HTML" ? G.ownerDocument.body : G).removeChild(n.stateNode);
				} catch (e) {
					Z(n, t, e);
				}
				else try {
					G.removeChild(n.stateNode);
				} catch (e) {
					Z(n, t, e);
				}
				break;
			case 18:
				G !== null && (cl ? (e = G, Qd(e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e, n.stateNode), Np(e)) : Qd(G, n.stateNode));
				break;
			case 4:
				r = G, i = cl, G = n.stateNode.containerInfo, cl = !0, ll(e, t, n), G = r, cl = i;
				break;
			case 0:
			case 11:
			case 14:
			case 15:
				Hc(2, n, t), tl || Hc(4, n, t), ll(e, t, n);
				break;
			case 1:
				tl || (Kc(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function" && Wc(n, t, r)), ll(e, t, n);
				break;
			case 21:
				ll(e, t, n);
				break;
			case 22:
				tl = (r = tl) || n.memoizedState !== null, ll(e, t, n), tl = r;
				break;
			default: ll(e, t, n);
		}
	}
	function dl(e, t) {
		if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null))) {
			e = e.dehydrated;
			try {
				Np(e);
			} catch (e) {
				Z(t, t.return, e);
			}
		}
	}
	function fl(e, t) {
		if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null && (e = e.dehydrated, e !== null)))) try {
			Np(e);
		} catch (e) {
			Z(t, t.return, e);
		}
	}
	function pl(e) {
		switch (e.tag) {
			case 31:
			case 13:
			case 19:
				var t = e.stateNode;
				return t === null && (t = e.stateNode = new rl()), t;
			case 22: return e = e.stateNode, t = e._retryCache, t === null && (t = e._retryCache = new rl()), t;
			default: throw Error(s(435, e.tag));
		}
	}
	function ml(e, t) {
		var n = pl(e);
		t.forEach(function(t) {
			if (!n.has(t)) {
				n.add(t);
				var r = Yu.bind(null, e, t);
				t.then(r, r);
			}
		});
	}
	function hl(e, t) {
		var n = t.deletions;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var i = n[r], a = e, o = t, c = o;
			a: for (; c !== null;) {
				switch (c.tag) {
					case 27:
						if (Zd(c.type)) {
							G = c.stateNode, cl = !1;
							break a;
						}
						break;
					case 5:
						G = c.stateNode, cl = !1;
						break a;
					case 3:
					case 4:
						G = c.stateNode.containerInfo, cl = !0;
						break a;
				}
				c = c.return;
			}
			if (G === null) throw Error(s(160));
			ul(a, o, i), G = null, cl = !1, a = i.alternate, a !== null && (a.return = null), i.return = null;
		}
		if (t.subtreeFlags & 13886) for (t = t.child; t !== null;) _l(t, e), t = t.sibling;
	}
	var gl = null;
	function _l(e, t) {
		var n = e.alternate, r = e.flags;
		switch (e.tag) {
			case 0:
			case 11:
			case 14:
			case 15:
				hl(t, e), vl(e), r & 4 && (Hc(3, e, e.return), Vc(3, e), Hc(5, e, e.return));
				break;
			case 1:
				hl(t, e), vl(e), r & 512 && (tl || n === null || Kc(n, n.return)), r & 64 && el && (e = e.updateQueue, e !== null && (r = e.callbacks, r !== null && (n = e.shared.hiddenCallbacks, e.shared.hiddenCallbacks = n === null ? r : n.concat(r))));
				break;
			case 26:
				var i = gl;
				if (hl(t, e), vl(e), r & 512 && (tl || n === null || Kc(n, n.return)), r & 4) {
					var a = n === null ? null : n.memoizedState;
					if (r = e.memoizedState, n === null) if (r === null) if (e.stateNode === null) {
						a: {
							r = e.type, n = e.memoizedProps, i = i.ownerDocument || i;
							b: switch (r) {
								case "title":
									a = i.getElementsByTagName("title")[0], (!a || a[pt] || a[L] || a.namespaceURI === "http://www.w3.org/2000/svg" || a.hasAttribute("itemprop")) && (a = i.createElement(r), i.head.insertBefore(a, i.querySelector("head > title"))), Pd(a, r, n), a[L] = e, yt(a), r = a;
									break a;
								case "link":
									var o = Vf("link", "href", i).get(r + (n.href || ""));
									if (o) {
										for (var c = 0; c < o.length; c++) if (a = o[c], a.getAttribute("href") === (n.href == null || n.href === "" ? null : n.href) && a.getAttribute("rel") === (n.rel == null ? null : n.rel) && a.getAttribute("title") === (n.title == null ? null : n.title) && a.getAttribute("crossorigin") === (n.crossOrigin == null ? null : n.crossOrigin)) {
											o.splice(c, 1);
											break b;
										}
									}
									a = i.createElement(r), Pd(a, r, n), i.head.appendChild(a);
									break;
								case "meta":
									if (o = Vf("meta", "content", i).get(r + (n.content || ""))) {
										for (c = 0; c < o.length; c++) if (a = o[c], a.getAttribute("content") === (n.content == null ? null : "" + n.content) && a.getAttribute("name") === (n.name == null ? null : n.name) && a.getAttribute("property") === (n.property == null ? null : n.property) && a.getAttribute("http-equiv") === (n.httpEquiv == null ? null : n.httpEquiv) && a.getAttribute("charset") === (n.charSet == null ? null : n.charSet)) {
											o.splice(c, 1);
											break b;
										}
									}
									a = i.createElement(r), Pd(a, r, n), i.head.appendChild(a);
									break;
								default: throw Error(s(468, r));
							}
							a[L] = e, yt(a), r = a;
						}
						e.stateNode = r;
					} else Hf(i, e.type, e.stateNode);
					else e.stateNode = If(i, r, e.memoizedProps);
					else a === r ? r === null && e.stateNode !== null && Jc(e, e.memoizedProps, n.memoizedProps) : (a === null ? n.stateNode !== null && (n = n.stateNode, n.parentNode.removeChild(n)) : a.count--, r === null ? Hf(i, e.type, e.stateNode) : If(i, r, e.memoizedProps));
				}
				break;
			case 27:
				hl(t, e), vl(e), r & 512 && (tl || n === null || Kc(n, n.return)), n !== null && r & 4 && Jc(e, e.memoizedProps, n.memoizedProps);
				break;
			case 5:
				if (hl(t, e), vl(e), r & 512 && (tl || n === null || Kc(n, n.return)), e.flags & 32) {
					i = e.stateNode;
					try {
						Wt(i, "");
					} catch (t) {
						Z(e, e.return, t);
					}
				}
				r & 4 && e.stateNode != null && (i = e.memoizedProps, Jc(e, i, n === null ? i : n.memoizedProps)), r & 1024 && (nl = !0);
				break;
			case 6:
				if (hl(t, e), vl(e), r & 4) {
					if (e.stateNode === null) throw Error(s(162));
					r = e.memoizedProps, n = e.stateNode;
					try {
						n.nodeValue = r;
					} catch (t) {
						Z(e, e.return, t);
					}
				}
				break;
			case 3:
				if (Bf = null, i = gl, gl = gf(t.containerInfo), hl(t, e), gl = i, vl(e), r & 4 && n !== null && n.memoizedState.isDehydrated) try {
					Np(t.containerInfo);
				} catch (t) {
					Z(e, e.return, t);
				}
				nl && (nl = !1, yl(e));
				break;
			case 4:
				r = gl, gl = gf(e.stateNode.containerInfo), hl(t, e), vl(e), gl = r;
				break;
			case 12:
				hl(t, e), vl(e);
				break;
			case 31:
				hl(t, e), vl(e), r & 4 && (r = e.updateQueue, r !== null && (e.updateQueue = null, ml(e, r)));
				break;
			case 13:
				hl(t, e), vl(e), e.child.flags & 8192 && e.memoizedState !== null != (n !== null && n.memoizedState !== null) && ($l = Ae()), r & 4 && (r = e.updateQueue, r !== null && (e.updateQueue = null, ml(e, r)));
				break;
			case 22:
				i = e.memoizedState !== null;
				var l = n !== null && n.memoizedState !== null, u = el, d = tl;
				if (el = u || i, tl = d || l, hl(t, e), tl = d, el = u, vl(e), r & 8192) a: for (t = e.stateNode, t._visibility = i ? t._visibility & -2 : t._visibility | 1, i && (n === null || l || el || tl || xl(e)), n = null, t = e;;) {
					if (t.tag === 5 || t.tag === 26) {
						if (n === null) {
							l = n = t;
							try {
								if (a = l.stateNode, i) o = a.style, typeof o.setProperty == "function" ? o.setProperty("display", "none", "important") : o.display = "none";
								else {
									c = l.stateNode;
									var f = l.memoizedProps.style, p = f != null && f.hasOwnProperty("display") ? f.display : null;
									c.style.display = p == null || typeof p == "boolean" ? "" : ("" + p).trim();
								}
							} catch (e) {
								Z(l, l.return, e);
							}
						}
					} else if (t.tag === 6) {
						if (n === null) {
							l = t;
							try {
								l.stateNode.nodeValue = i ? "" : l.memoizedProps;
							} catch (e) {
								Z(l, l.return, e);
							}
						}
					} else if (t.tag === 18) {
						if (n === null) {
							l = t;
							try {
								var m = l.stateNode;
								i ? $d(m, !0) : $d(l.stateNode, !1);
							} catch (e) {
								Z(l, l.return, e);
							}
						}
					} else if ((t.tag !== 22 && t.tag !== 23 || t.memoizedState === null || t === e) && t.child !== null) {
						t.child.return = t, t = t.child;
						continue;
					}
					if (t === e) break a;
					for (; t.sibling === null;) {
						if (t.return === null || t.return === e) break a;
						n === t && (n = null), t = t.return;
					}
					n === t && (n = null), t.sibling.return = t.return, t = t.sibling;
				}
				r & 4 && (r = e.updateQueue, r !== null && (n = r.retryQueue, n !== null && (r.retryQueue = null, ml(e, n))));
				break;
			case 19:
				hl(t, e), vl(e), r & 4 && (r = e.updateQueue, r !== null && (e.updateQueue = null, ml(e, r)));
				break;
			case 30: break;
			case 21: break;
			default: hl(t, e), vl(e);
		}
	}
	function vl(e) {
		var t = e.flags;
		if (t & 2) {
			try {
				for (var n, r = e.return; r !== null;) {
					if (Yc(r)) {
						n = r;
						break;
					}
					r = r.return;
				}
				if (n == null) throw Error(s(160));
				switch (n.tag) {
					case 27:
						var i = n.stateNode;
						Qc(e, Xc(e), i);
						break;
					case 5:
						var a = n.stateNode;
						n.flags & 32 && (Wt(a, ""), n.flags &= -33), Qc(e, Xc(e), a);
						break;
					case 3:
					case 4:
						var o = n.stateNode.containerInfo;
						Zc(e, Xc(e), o);
						break;
					default: throw Error(s(161));
				}
			} catch (t) {
				Z(e, e.return, t);
			}
			e.flags &= -3;
		}
		t & 4096 && (e.flags &= -4097);
	}
	function yl(e) {
		if (e.subtreeFlags & 1024) for (e = e.child; e !== null;) {
			var t = e;
			yl(t), t.tag === 5 && t.flags & 1024 && t.stateNode.reset(), e = e.sibling;
		}
	}
	function bl(e, t) {
		if (t.subtreeFlags & 8772) for (t = t.child; t !== null;) ol(e, t.alternate, t), t = t.sibling;
	}
	function xl(e) {
		for (e = e.child; e !== null;) {
			var t = e;
			switch (t.tag) {
				case 0:
				case 11:
				case 14:
				case 15:
					Hc(4, t, t.return), xl(t);
					break;
				case 1:
					Kc(t, t.return);
					var n = t.stateNode;
					typeof n.componentWillUnmount == "function" && Wc(t, t.return, n), xl(t);
					break;
				case 27: pf(t.stateNode);
				case 26:
				case 5:
					Kc(t, t.return), xl(t);
					break;
				case 22:
					t.memoizedState === null && xl(t);
					break;
				case 30:
					xl(t);
					break;
				default: xl(t);
			}
			e = e.sibling;
		}
	}
	function Sl(e, t, n) {
		for (n &&= !!(t.subtreeFlags & 8772), t = t.child; t !== null;) {
			var r = t.alternate, i = e, a = t, o = a.flags;
			switch (a.tag) {
				case 0:
				case 11:
				case 15:
					Sl(i, a, n), Vc(4, a);
					break;
				case 1:
					if (Sl(i, a, n), r = a, i = r.stateNode, typeof i.componentDidMount == "function") try {
						i.componentDidMount();
					} catch (e) {
						Z(r, r.return, e);
					}
					if (r = a, i = r.updateQueue, i !== null) {
						var s = r.stateNode;
						try {
							var c = i.shared.hiddenCallbacks;
							if (c !== null) for (i.shared.hiddenCallbacks = null, i = 0; i < c.length; i++) Ja(c[i], s);
						} catch (e) {
							Z(r, r.return, e);
						}
					}
					n && o & 64 && Uc(a), Gc(a, a.return);
					break;
				case 27: $c(a);
				case 26:
				case 5:
					Sl(i, a, n), n && r === null && o & 4 && qc(a), Gc(a, a.return);
					break;
				case 12:
					Sl(i, a, n);
					break;
				case 31:
					Sl(i, a, n), n && o & 4 && dl(i, a);
					break;
				case 13:
					Sl(i, a, n), n && o & 4 && fl(i, a);
					break;
				case 22:
					a.memoizedState === null && Sl(i, a, n), Gc(a, a.return);
					break;
				case 30: break;
				default: Sl(i, a, n);
			}
			t = t.sibling;
		}
	}
	function Cl(e, t) {
		var n = null;
		e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), e = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), e !== n && (e != null && e.refCount++, n != null && sa(n));
	}
	function wl(e, t) {
		e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && sa(e));
	}
	function Tl(e, t, n, r) {
		if (t.subtreeFlags & 10256) for (t = t.child; t !== null;) El(e, t, n, r), t = t.sibling;
	}
	function El(e, t, n, r) {
		var i = t.flags;
		switch (t.tag) {
			case 0:
			case 11:
			case 15:
				Tl(e, t, n, r), i & 2048 && Vc(9, t);
				break;
			case 1:
				Tl(e, t, n, r);
				break;
			case 3:
				Tl(e, t, n, r), i & 2048 && (e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && sa(e)));
				break;
			case 12:
				if (i & 2048) {
					Tl(e, t, n, r), e = t.stateNode;
					try {
						var a = t.memoizedProps, o = a.id, s = a.onPostCommit;
						typeof s == "function" && s(o, t.alternate === null ? "mount" : "update", e.passiveEffectDuration, -0);
					} catch (e) {
						Z(t, t.return, e);
					}
				} else Tl(e, t, n, r);
				break;
			case 31:
				Tl(e, t, n, r);
				break;
			case 13:
				Tl(e, t, n, r);
				break;
			case 23: break;
			case 22:
				a = t.stateNode, o = t.alternate, t.memoizedState === null ? a._visibility & 2 ? Tl(e, t, n, r) : (a._visibility |= 2, Dl(e, t, n, r, !!(t.subtreeFlags & 10256) || !1)) : a._visibility & 2 ? Tl(e, t, n, r) : Ol(e, t), i & 2048 && Cl(o, t);
				break;
			case 24:
				Tl(e, t, n, r), i & 2048 && wl(t.alternate, t);
				break;
			default: Tl(e, t, n, r);
		}
	}
	function Dl(e, t, n, r, i) {
		for (i &&= !!(t.subtreeFlags & 10256) || !1, t = t.child; t !== null;) {
			var a = e, o = t, s = n, c = r, l = o.flags;
			switch (o.tag) {
				case 0:
				case 11:
				case 15:
					Dl(a, o, s, c, i), Vc(8, o);
					break;
				case 23: break;
				case 22:
					var u = o.stateNode;
					o.memoizedState === null ? (u._visibility |= 2, Dl(a, o, s, c, i)) : u._visibility & 2 ? Dl(a, o, s, c, i) : Ol(a, o), i && l & 2048 && Cl(o.alternate, o);
					break;
				case 24:
					Dl(a, o, s, c, i), i && l & 2048 && wl(o.alternate, o);
					break;
				default: Dl(a, o, s, c, i);
			}
			t = t.sibling;
		}
	}
	function Ol(e, t) {
		if (t.subtreeFlags & 10256) for (t = t.child; t !== null;) {
			var n = e, r = t, i = r.flags;
			switch (r.tag) {
				case 22:
					Ol(n, r), i & 2048 && Cl(r.alternate, r);
					break;
				case 24:
					Ol(n, r), i & 2048 && wl(r.alternate, r);
					break;
				default: Ol(n, r);
			}
			t = t.sibling;
		}
	}
	var kl = 8192;
	function Al(e, t, n) {
		if (e.subtreeFlags & kl) for (e = e.child; e !== null;) jl(e, t, n), e = e.sibling;
	}
	function jl(e, t, n) {
		switch (e.tag) {
			case 26:
				Al(e, t, n), e.flags & kl && e.memoizedState !== null && Gf(n, gl, e.memoizedState, e.memoizedProps);
				break;
			case 5:
				Al(e, t, n);
				break;
			case 3:
			case 4:
				var r = gl;
				gl = gf(e.stateNode.containerInfo), Al(e, t, n), gl = r;
				break;
			case 22:
				e.memoizedState === null && (r = e.alternate, r !== null && r.memoizedState !== null ? (r = kl, kl = 16777216, Al(e, t, n), kl = r) : Al(e, t, n));
				break;
			default: Al(e, t, n);
		}
	}
	function Ml(e) {
		var t = e.alternate;
		if (t !== null && (e = t.child, e !== null)) {
			t.child = null;
			do
				t = e.sibling, e.sibling = null, e = t;
			while (e !== null);
		}
	}
	function Nl(e) {
		var t = e.deletions;
		if (e.flags & 16) {
			if (t !== null) for (var n = 0; n < t.length; n++) {
				var r = t[n];
				il = r, Il(r, e);
			}
			Ml(e);
		}
		if (e.subtreeFlags & 10256) for (e = e.child; e !== null;) Pl(e), e = e.sibling;
	}
	function Pl(e) {
		switch (e.tag) {
			case 0:
			case 11:
			case 15:
				Nl(e), e.flags & 2048 && Hc(9, e, e.return);
				break;
			case 3:
				Nl(e);
				break;
			case 12:
				Nl(e);
				break;
			case 22:
				var t = e.stateNode;
				e.memoizedState !== null && t._visibility & 2 && (e.return === null || e.return.tag !== 13) ? (t._visibility &= -3, Fl(e)) : Nl(e);
				break;
			default: Nl(e);
		}
	}
	function Fl(e) {
		var t = e.deletions;
		if (e.flags & 16) {
			if (t !== null) for (var n = 0; n < t.length; n++) {
				var r = t[n];
				il = r, Il(r, e);
			}
			Ml(e);
		}
		for (e = e.child; e !== null;) {
			switch (t = e, t.tag) {
				case 0:
				case 11:
				case 15:
					Hc(8, t, t.return), Fl(t);
					break;
				case 22:
					n = t.stateNode, n._visibility & 2 && (n._visibility &= -3, Fl(t));
					break;
				default: Fl(t);
			}
			e = e.sibling;
		}
	}
	function Il(e, t) {
		for (; il !== null;) {
			var n = il;
			switch (n.tag) {
				case 0:
				case 11:
				case 15:
					Hc(8, n, t);
					break;
				case 23:
				case 22:
					if (n.memoizedState !== null && n.memoizedState.cachePool !== null) {
						var r = n.memoizedState.cachePool.pool;
						r != null && r.refCount++;
					}
					break;
				case 24: sa(n.memoizedState.cache);
			}
			if (r = n.child, r !== null) r.return = n, il = r;
			else a: for (n = e; il !== null;) {
				r = il;
				var i = r.sibling, a = r.return;
				if (sl(r), r === n) {
					il = null;
					break a;
				}
				if (i !== null) {
					i.return = a, il = i;
					break a;
				}
				il = a;
			}
		}
	}
	var Ll = {
		getCacheForType: function(e) {
			var t = $i(aa), n = t.data.get(e);
			return n === void 0 && (n = e(), t.data.set(e, n)), n;
		},
		cacheSignal: function() {
			return $i(aa).controller.signal;
		}
	}, Rl = typeof WeakMap == "function" ? WeakMap : Map, K = 0, q = null, J = null, Y = 0, X = 0, zl = null, Bl = !1, Vl = !1, Hl = !1, Ul = 0, Wl = 0, Gl = 0, Kl = 0, ql = 0, Jl = 0, Yl = 0, Xl = null, Zl = null, Ql = !1, $l = 0, eu = 0, tu = Infinity, nu = null, ru = null, iu = 0, au = null, ou = null, su = 0, cu = 0, lu = null, uu = null, du = 0, fu = null;
	function pu() {
		return K & 2 && Y !== 0 ? Y & -Y : k.T === null ? at() : dd();
	}
	function mu() {
		if (Jl === 0) if (!(Y & 536870912) || V) {
			var e = Ke;
			Ke <<= 1, !(Ke & 3932160) && (Ke = 262144), Jl = e;
		} else Jl = 536870912;
		return e = to.current, e !== null && (e.flags |= 32), Jl;
	}
	function hu(e, t, n) {
		(e === q && (X === 2 || X === 9) || e.cancelPendingCommit !== null) && (Su(e, 0), yu(e, Y, Jl, !1)), $e(e, n), (!(K & 2) || e !== q) && (e === q && (!(K & 2) && (Kl |= n), Wl === 4 && yu(e, Y, Jl, !1)), rd(e));
	}
	function gu(e, t, n) {
		if (K & 6) throw Error(s(327));
		var r = !n && !(t & 127) && (t & e.expiredLanes) === 0 || Ye(e, t), i = r ? Au(e, t) : Ou(e, t, !0), a = r;
		do {
			if (i === 0) {
				Vl && !r && yu(e, t, 0, !1);
				break;
			}
			if (n = e.current.alternate, a && !vu(n)) {
				i = Ou(e, t, !1), a = !1;
				continue;
			}
			if (i === 2) {
				if (a = t, e.errorRecoveryDisabledLanes & a) var o = 0;
				else o = e.pendingLanes & -536870913, o = o === 0 ? o & 536870912 ? 536870912 : 0 : o;
				if (o !== 0) {
					t = o;
					a: {
						var c = e;
						i = Xl;
						var l = c.current.memoizedState.isDehydrated;
						if (l && (Su(c, o).flags |= 256), o = Ou(c, o, !1), o !== 2) {
							if (Hl && !l) {
								c.errorRecoveryDisabledLanes |= a, Kl |= a, i = 4;
								break a;
							}
							a = Zl, Zl = i, a !== null && (Zl === null ? Zl = a : Zl.push.apply(Zl, a));
						}
						i = o;
					}
					if (a = !1, i !== 2) continue;
				}
			}
			if (i === 1) {
				Su(e, 0), yu(e, t, 0, !0);
				break;
			}
			a: {
				switch (r = e, a = i, a) {
					case 0:
					case 1: throw Error(s(345));
					case 4: if ((t & 4194048) !== t) break;
					case 6:
						yu(r, t, Jl, !Bl);
						break a;
					case 2:
						Zl = null;
						break;
					case 3:
					case 5: break;
					default: throw Error(s(329));
				}
				if ((t & 62914560) === t && (i = $l + 300 - Ae(), 10 < i)) {
					if (yu(r, t, Jl, !Bl), Je(r, 0, !0) !== 0) break a;
					su = t, r.timeoutHandle = Kd(_u.bind(null, r, n, Zl, nu, Ql, t, Jl, Kl, Yl, Bl, a, "Throttled", -0, 0), i);
					break a;
				}
				_u(r, n, Zl, nu, Ql, t, Jl, Kl, Yl, Bl, a, null, -0, 0);
			}
			break;
		} while (1);
		rd(e);
	}
	function _u(e, t, n, r, i, a, o, s, c, l, u, d, f, p) {
		if (e.timeoutHandle = -1, d = t.subtreeFlags, d & 8192 || (d & 16785408) == 16785408) {
			d = {
				stylesheets: null,
				count: 0,
				imgCount: 0,
				imgBytes: 0,
				suspenseyImages: [],
				waitingForImages: !0,
				waitingForViewTransition: !1,
				unsuspend: Qt
			}, jl(t, a, d);
			var m = (a & 62914560) === a ? $l - Ae() : (a & 4194048) === a ? eu - Ae() : 0;
			if (m = qf(d, m), m !== null) {
				su = a, e.cancelPendingCommit = m(Lu.bind(null, e, t, a, n, r, i, o, s, c, u, d, null, f, p)), yu(e, a, o, !l);
				return;
			}
		}
		Lu(e, t, a, n, r, i, o, s, c);
	}
	function vu(e) {
		for (var t = e;;) {
			var n = t.tag;
			if ((n === 0 || n === 11 || n === 15) && t.flags & 16384 && (n = t.updateQueue, n !== null && (n = n.stores, n !== null))) for (var r = 0; r < n.length; r++) {
				var i = n[r], a = i.getSnapshot;
				i = i.value;
				try {
					if (!xr(a(), i)) return !1;
				} catch {
					return !1;
				}
			}
			if (n = t.child, t.subtreeFlags & 16384 && n !== null) n.return = t, t = n;
			else {
				if (t === e) break;
				for (; t.sibling === null;) {
					if (t.return === null || t.return === e) return !0;
					t = t.return;
				}
				t.sibling.return = t.return, t = t.sibling;
			}
		}
		return !0;
	}
	function yu(e, t, n, r) {
		t &= ~ql, t &= ~Kl, e.suspendedLanes |= t, e.pingedLanes &= ~t, r && (e.warmLanes |= t), r = e.expirationTimes;
		for (var i = t; 0 < i;) {
			var a = 31 - P(i), o = 1 << a;
			r[a] = -1, i &= ~o;
		}
		n !== 0 && tt(e, n, t);
	}
	function bu() {
		return K & 6 ? !0 : (id(0, !1), !1);
	}
	function xu() {
		if (J !== null) {
			if (X === 0) var e = J.return;
			else e = J, Gi = Wi = null, Oo(e), Aa = null, ja = 0, e = J;
			for (; e !== null;) Bc(e.alternate, e), e = e.return;
			J = null;
		}
	}
	function Su(e, t) {
		var n = e.timeoutHandle;
		n !== -1 && (e.timeoutHandle = -1, qd(n)), n = e.cancelPendingCommit, n !== null && (e.cancelPendingCommit = null, n()), su = 0, xu(), q = e, J = n = li(e.current, null), Y = t, X = 0, zl = null, Bl = !1, Vl = Ye(e, t), Hl = !1, Yl = Jl = ql = Kl = Gl = Wl = 0, Zl = Xl = null, Ql = !1, t & 8 && (t |= t & 32);
		var r = e.entangledLanes;
		if (r !== 0) for (e = e.entanglements, r &= t; 0 < r;) {
			var i = 31 - P(r), a = 1 << i;
			t |= e[i], r &= ~a;
		}
		return Ul = t, $r(), n;
	}
	function Cu(e, t) {
		H = null, k.H = Rs, t === ba || t === Sa ? (t = Oa(), X = 3) : t === xa ? (t = Oa(), X = 4) : X = t === nc ? 8 : typeof t == "object" && t && typeof t.then == "function" ? 6 : 1, zl = t, J === null && (Wl = 1, Xs(e, _i(t, e.current)));
	}
	function wu() {
		var e = to.current;
		return e === null ? !0 : (Y & 4194048) === Y ? no === null : (Y & 62914560) === Y || Y & 536870912 ? e === no : !1;
	}
	function Tu() {
		var e = k.H;
		return k.H = Rs, e === null ? Rs : e;
	}
	function Eu() {
		var e = k.A;
		return k.A = Ll, e;
	}
	function Du() {
		Wl = 4, Bl || (Y & 4194048) !== Y && to.current !== null || (Vl = !0), !(Gl & 134217727) && !(Kl & 134217727) || q === null || yu(q, Y, Jl, !1);
	}
	function Ou(e, t, n) {
		var r = K;
		K |= 2;
		var i = Tu(), a = Eu();
		(q !== e || Y !== t) && (nu = null, Su(e, t)), t = !1;
		var o = Wl;
		a: do
			try {
				if (X !== 0 && J !== null) {
					var s = J, c = zl;
					switch (X) {
						case 8:
							xu(), o = 6;
							break a;
						case 3:
						case 2:
						case 9:
						case 6:
							to.current === null && (t = !0);
							var l = X;
							if (X = 0, zl = null, Pu(e, s, c, l), n && Vl) {
								o = 0;
								break a;
							}
							break;
						default: l = X, X = 0, zl = null, Pu(e, s, c, l);
					}
				}
				ku(), o = Wl;
				break;
			} catch (t) {
				Cu(e, t);
			}
		while (1);
		return t && e.shellSuspendCounter++, Gi = Wi = null, K = r, k.H = i, k.A = a, J === null && (q = null, Y = 0, $r()), o;
	}
	function ku() {
		for (; J !== null;) Mu(J);
	}
	function Au(e, t) {
		var n = K;
		K |= 2;
		var r = Tu(), i = Eu();
		q !== e || Y !== t ? (nu = null, tu = Ae() + 500, Su(e, t)) : Vl = Ye(e, t);
		a: do
			try {
				if (X !== 0 && J !== null) {
					t = J;
					var a = zl;
					b: switch (X) {
						case 1:
							X = 0, zl = null, Pu(e, t, a, 1);
							break;
						case 2:
						case 9:
							if (wa(a)) {
								X = 0, zl = null, Nu(t);
								break;
							}
							t = function() {
								X !== 2 && X !== 9 || q !== e || (X = 7), rd(e);
							}, a.then(t, t);
							break a;
						case 3:
							X = 7;
							break a;
						case 4:
							X = 5;
							break a;
						case 7:
							wa(a) ? (X = 0, zl = null, Nu(t)) : (X = 0, zl = null, Pu(e, t, a, 7));
							break;
						case 5:
							var o = null;
							switch (J.tag) {
								case 26: o = J.memoizedState;
								case 5:
								case 27:
									var c = J;
									if (o ? Wf(o) : c.stateNode.complete) {
										X = 0, zl = null;
										var l = c.sibling;
										if (l !== null) J = l;
										else {
											var u = c.return;
											u === null ? J = null : (J = u, Fu(u));
										}
										break b;
									}
							}
							X = 0, zl = null, Pu(e, t, a, 5);
							break;
						case 6:
							X = 0, zl = null, Pu(e, t, a, 6);
							break;
						case 8:
							xu(), Wl = 6;
							break a;
						default: throw Error(s(462));
					}
				}
				ju();
				break;
			} catch (t) {
				Cu(e, t);
			}
		while (1);
		return Gi = Wi = null, k.H = r, k.A = i, K = n, J === null ? (q = null, Y = 0, $r(), Wl) : 0;
	}
	function ju() {
		for (; J !== null && !Oe();) Mu(J);
	}
	function Mu(e) {
		var t = Mc(e.alternate, e, Ul);
		e.memoizedProps = e.pendingProps, t === null ? Fu(e) : J = t;
	}
	function Nu(e) {
		var t = e, n = t.alternate;
		switch (t.tag) {
			case 15:
			case 0:
				t = gc(n, t, t.pendingProps, t.type, void 0, Y);
				break;
			case 11:
				t = gc(n, t, t.pendingProps, t.type.render, t.ref, Y);
				break;
			case 5: Oo(t);
			default: Bc(n, t), t = J = ui(t, Ul), t = Mc(n, t, Ul);
		}
		e.memoizedProps = e.pendingProps, t === null ? Fu(e) : J = t;
	}
	function Pu(e, t, n, r) {
		Gi = Wi = null, Oo(t), Aa = null, ja = 0;
		var i = t.return;
		try {
			if (tc(e, i, t, n, Y)) {
				Wl = 1, Xs(e, _i(n, e.current)), J = null;
				return;
			}
		} catch (t) {
			if (i !== null) throw J = i, t;
			Wl = 1, Xs(e, _i(n, e.current)), J = null;
			return;
		}
		t.flags & 32768 ? (V || r === 1 ? e = !0 : Vl || Y & 536870912 ? e = !1 : (Bl = e = !0, (r === 2 || r === 9 || r === 3 || r === 6) && (r = to.current, r !== null && r.tag === 13 && (r.flags |= 16384))), Iu(t, e)) : Fu(t);
	}
	function Fu(e) {
		var t = e;
		do {
			if (t.flags & 32768) {
				Iu(t, Bl);
				return;
			}
			e = t.return;
			var n = Rc(t.alternate, t, Ul);
			if (n !== null) {
				J = n;
				return;
			}
			if (t = t.sibling, t !== null) {
				J = t;
				return;
			}
			J = t = e;
		} while (t !== null);
		Wl === 0 && (Wl = 5);
	}
	function Iu(e, t) {
		do {
			var n = zc(e.alternate, e);
			if (n !== null) {
				n.flags &= 32767, J = n;
				return;
			}
			if (n = e.return, n !== null && (n.flags |= 32768, n.subtreeFlags = 0, n.deletions = null), !t && (e = e.sibling, e !== null)) {
				J = e;
				return;
			}
			J = e = n;
		} while (e !== null);
		Wl = 6, J = null;
	}
	function Lu(e, t, n, r, i, a, o, c, l) {
		e.cancelPendingCommit = null;
		do
			Hu();
		while (iu !== 0);
		if (K & 6) throw Error(s(327));
		if (t !== null) {
			if (t === e.current) throw Error(s(177));
			if (a = t.lanes | t.childLanes, a |= Qr, et(e, n, a, o, c, l), e === q && (J = q = null, Y = 0), ou = t, au = e, su = n, cu = a, lu = i, uu = r, t.subtreeFlags & 10256 || t.flags & 10256 ? (e.callbackNode = null, e.callbackPriority = 0, Xu(Pe, function() {
				return Uu(), null;
			})) : (e.callbackNode = null, e.callbackPriority = 0), r = !!(t.flags & 13878), t.subtreeFlags & 13878 || r) {
				r = k.T, k.T = null, i = A.p, A.p = 2, o = K, K |= 4;
				try {
					al(e, t, n);
				} finally {
					K = o, A.p = i, k.T = r;
				}
			}
			iu = 1, Ru(), zu(), Bu();
		}
	}
	function Ru() {
		if (iu === 1) {
			iu = 0;
			var e = au, t = ou, n = !!(t.flags & 13878);
			if (t.subtreeFlags & 13878 || n) {
				n = k.T, k.T = null;
				var r = A.p;
				A.p = 2;
				var i = K;
				K |= 4;
				try {
					_l(t, e);
					var a = zd, o = Er(e.containerInfo), s = a.focusedElem, c = a.selectionRange;
					if (o !== s && s && s.ownerDocument && Tr(s.ownerDocument.documentElement, s)) {
						if (c !== null && Dr(s)) {
							var l = c.start, u = c.end;
							if (u === void 0 && (u = l), "selectionStart" in s) s.selectionStart = l, s.selectionEnd = Math.min(u, s.value.length);
							else {
								var d = s.ownerDocument || document, f = d && d.defaultView || window;
								if (f.getSelection) {
									var p = f.getSelection(), m = s.textContent.length, h = Math.min(c.start, m), g = c.end === void 0 ? h : Math.min(c.end, m);
									!p.extend && h > g && (o = g, g = h, h = o);
									var _ = wr(s, h), v = wr(s, g);
									if (_ && v && (p.rangeCount !== 1 || p.anchorNode !== _.node || p.anchorOffset !== _.offset || p.focusNode !== v.node || p.focusOffset !== v.offset)) {
										var y = d.createRange();
										y.setStart(_.node, _.offset), p.removeAllRanges(), h > g ? (p.addRange(y), p.extend(v.node, v.offset)) : (y.setEnd(v.node, v.offset), p.addRange(y));
									}
								}
							}
						}
						for (d = [], p = s; p = p.parentNode;) p.nodeType === 1 && d.push({
							element: p,
							left: p.scrollLeft,
							top: p.scrollTop
						});
						for (typeof s.focus == "function" && s.focus(), s = 0; s < d.length; s++) {
							var b = d[s];
							b.element.scrollLeft = b.left, b.element.scrollTop = b.top;
						}
					}
					sp = !!Rd, zd = Rd = null;
				} finally {
					K = i, A.p = r, k.T = n;
				}
			}
			e.current = t, iu = 2;
		}
	}
	function zu() {
		if (iu === 2) {
			iu = 0;
			var e = au, t = ou, n = !!(t.flags & 8772);
			if (t.subtreeFlags & 8772 || n) {
				n = k.T, k.T = null;
				var r = A.p;
				A.p = 2;
				var i = K;
				K |= 4;
				try {
					ol(e, t.alternate, t);
				} finally {
					K = i, A.p = r, k.T = n;
				}
			}
			iu = 3;
		}
	}
	function Bu() {
		if (iu === 4 || iu === 3) {
			iu = 0, ke();
			var e = au, t = ou, n = su, r = uu;
			t.subtreeFlags & 10256 || t.flags & 10256 ? iu = 5 : (iu = 0, ou = au = null, Vu(e, e.pendingLanes));
			var i = e.pendingLanes;
			if (i === 0 && (ru = null), it(n), t = t.stateNode, Be && typeof Be.onCommitFiberRoot == "function") try {
				Be.onCommitFiberRoot(ze, t, void 0, (t.current.flags & 128) == 128);
			} catch {}
			if (r !== null) {
				t = k.T, i = A.p, A.p = 2, k.T = null;
				try {
					for (var a = e.onRecoverableError, o = 0; o < r.length; o++) {
						var s = r[o];
						a(s.value, { componentStack: s.stack });
					}
				} finally {
					k.T = t, A.p = i;
				}
			}
			su & 3 && Hu(), rd(e), i = e.pendingLanes, n & 261930 && i & 42 ? e === fu ? du++ : (du = 0, fu = e) : du = 0, id(0, !1);
		}
	}
	function Vu(e, t) {
		(e.pooledCacheLanes &= t) === 0 && (t = e.pooledCache, t != null && (e.pooledCache = null, sa(t)));
	}
	function Hu() {
		return Ru(), zu(), Bu(), Uu();
	}
	function Uu() {
		if (iu !== 5) return !1;
		var e = au, t = cu;
		cu = 0;
		var n = it(su), r = k.T, i = A.p;
		try {
			A.p = 32 > n ? 32 : n, k.T = null, n = lu, lu = null;
			var a = au, o = su;
			if (iu = 0, ou = au = null, su = 0, K & 6) throw Error(s(331));
			var c = K;
			if (K |= 4, Pl(a.current), El(a, a.current, o, n), K = c, id(0, !1), Be && typeof Be.onPostCommitFiberRoot == "function") try {
				Be.onPostCommitFiberRoot(ze, a);
			} catch {}
			return !0;
		} finally {
			A.p = i, k.T = r, Vu(e, t);
		}
	}
	function Wu(e, t, n) {
		t = _i(n, t), t = Qs(e.stateNode, t, 2), e = Ha(e, t, 2), e !== null && ($e(e, 2), rd(e));
	}
	function Z(e, t, n) {
		if (e.tag === 3) Wu(e, e, n);
		else for (; t !== null;) {
			if (t.tag === 3) {
				Wu(t, e, n);
				break;
			}
			if (t.tag === 1) {
				var r = t.stateNode;
				if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (ru === null || !ru.has(r))) {
					e = _i(n, e), n = $s(2), r = Ha(t, n, 2), r !== null && (ec(n, r, t, e), $e(r, 2), rd(r));
					break;
				}
			}
			t = t.return;
		}
	}
	function Gu(e, t, n) {
		var r = e.pingCache;
		if (r === null) {
			r = e.pingCache = new Rl();
			var i = /* @__PURE__ */ new Set();
			r.set(t, i);
		} else i = r.get(t), i === void 0 && (i = /* @__PURE__ */ new Set(), r.set(t, i));
		i.has(n) || (Hl = !0, i.add(n), e = Ku.bind(null, e, t, n), t.then(e, e));
	}
	function Ku(e, t, n) {
		var r = e.pingCache;
		r !== null && r.delete(t), e.pingedLanes |= e.suspendedLanes & n, e.warmLanes &= ~n, q === e && (Y & n) === n && (Wl === 4 || Wl === 3 && (Y & 62914560) === Y && 300 > Ae() - $l ? !(K & 2) && Su(e, 0) : ql |= n, Yl === Y && (Yl = 0)), rd(e);
	}
	function qu(e, t) {
		t === 0 && (t = Ze()), e = ni(e, t), e !== null && ($e(e, t), rd(e));
	}
	function Ju(e) {
		var t = e.memoizedState, n = 0;
		t !== null && (n = t.retryLane), qu(e, n);
	}
	function Yu(e, t) {
		var n = 0;
		switch (e.tag) {
			case 31:
			case 13:
				var r = e.stateNode, i = e.memoizedState;
				i !== null && (n = i.retryLane);
				break;
			case 19:
				r = e.stateNode;
				break;
			case 22:
				r = e.stateNode._retryCache;
				break;
			default: throw Error(s(314));
		}
		r !== null && r.delete(t), qu(e, n);
	}
	function Xu(e, t) {
		return Ee(e, t);
	}
	var Zu = null, Qu = null, $u = !1, ed = !1, td = !1, nd = 0;
	function rd(e) {
		e !== Qu && e.next === null && (Qu === null ? Zu = Qu = e : Qu = Qu.next = e), ed = !0, $u || ($u = !0, ud());
	}
	function id(e, t) {
		if (!td && ed) {
			td = !0;
			do
				for (var n = !1, r = Zu; r !== null;) {
					if (!t) if (e !== 0) {
						var i = r.pendingLanes;
						if (i === 0) var a = 0;
						else {
							var o = r.suspendedLanes, s = r.pingedLanes;
							a = (1 << 31 - P(42 | e) + 1) - 1, a &= i & ~(o & ~s), a = a & 201326741 ? a & 201326741 | 1 : a ? a | 2 : 0;
						}
						a !== 0 && (n = !0, ld(r, a));
					} else a = Y, a = Je(r, r === q ? a : 0, r.cancelPendingCommit !== null || r.timeoutHandle !== -1), !(a & 3) || Ye(r, a) || (n = !0, ld(r, a));
					r = r.next;
				}
			while (n);
			td = !1;
		}
	}
	function ad() {
		od();
	}
	function od() {
		ed = $u = !1;
		var e = 0;
		nd !== 0 && Gd() && (e = nd);
		for (var t = Ae(), n = null, r = Zu; r !== null;) {
			var i = r.next, a = sd(r, t);
			a === 0 ? (r.next = null, n === null ? Zu = i : n.next = i, i === null && (Qu = n)) : (n = r, (e !== 0 || a & 3) && (ed = !0)), r = i;
		}
		iu !== 0 && iu !== 5 || id(e, !1), nd !== 0 && (nd = 0);
	}
	function sd(e, t) {
		for (var n = e.suspendedLanes, r = e.pingedLanes, i = e.expirationTimes, a = e.pendingLanes & -62914561; 0 < a;) {
			var o = 31 - P(a), s = 1 << o, c = i[o];
			c === -1 ? ((s & n) === 0 || (s & r) !== 0) && (i[o] = Xe(s, t)) : c <= t && (e.expiredLanes |= s), a &= ~s;
		}
		if (t = q, n = Y, n = Je(e, e === t ? n : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), r = e.callbackNode, n === 0 || e === t && (X === 2 || X === 9) || e.cancelPendingCommit !== null) return r !== null && r !== null && De(r), e.callbackNode = null, e.callbackPriority = 0;
		if (!(n & 3) || Ye(e, n)) {
			if (t = n & -n, t === e.callbackPriority) return t;
			switch (r !== null && De(r), it(n)) {
				case 2:
				case 8:
					n = Ne;
					break;
				case 32:
					n = Pe;
					break;
				case 268435456:
					n = Ie;
					break;
				default: n = Pe;
			}
			return r = cd.bind(null, e), n = Ee(n, r), e.callbackPriority = t, e.callbackNode = n, t;
		}
		return r !== null && r !== null && De(r), e.callbackPriority = 2, e.callbackNode = null, 2;
	}
	function cd(e, t) {
		if (iu !== 0 && iu !== 5) return e.callbackNode = null, e.callbackPriority = 0, null;
		var n = e.callbackNode;
		if (Hu() && e.callbackNode !== n) return null;
		var r = Y;
		return r = Je(e, e === q ? r : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), r === 0 ? null : (gu(e, r, t), sd(e, Ae()), e.callbackNode != null && e.callbackNode === n ? cd.bind(null, e) : null);
	}
	function ld(e, t) {
		if (Hu()) return null;
		gu(e, t, !0);
	}
	function ud() {
		Yd(function() {
			K & 6 ? Ee(Me, ad) : od();
		});
	}
	function dd() {
		if (nd === 0) {
			var e = ua;
			e === 0 && (e = Ge, Ge <<= 1, !(Ge & 261888) && (Ge = 256)), nd = e;
		}
		return nd;
	}
	function fd(e) {
		return e == null || typeof e == "symbol" || typeof e == "boolean" ? null : typeof e == "function" ? e : Zt("" + e);
	}
	function pd(e, t) {
		var n = t.ownerDocument.createElement("input");
		return n.name = t.name, n.value = t.value, e.id && n.setAttribute("form", e.id), t.parentNode.insertBefore(n, t), e = new FormData(e), n.parentNode.removeChild(n), e;
	}
	function md(e, t, n, r, i) {
		if (t === "submit" && n && n.stateNode === i) {
			var a = fd((i[R] || null).action), o = r.submitter;
			o && (t = (t = o[R] || null) ? fd(t.formAction) : o.getAttribute("formAction"), t !== null && (a = t, o = null));
			var s = new bn("action", "action", null, r, i);
			e.push({
				event: s,
				listeners: [{
					instance: null,
					listener: function() {
						if (r.defaultPrevented) {
							if (nd !== 0) {
								var e = o ? pd(i, o) : new FormData(i);
								ws(n, {
									pending: !0,
									data: e,
									method: i.method,
									action: a
								}, null, e);
							}
						} else typeof a == "function" && (s.preventDefault(), e = o ? pd(i, o) : new FormData(i), ws(n, {
							pending: !0,
							data: e,
							method: i.method,
							action: a
						}, a, e));
					},
					currentTarget: i
				}]
			});
		}
	}
	for (var hd = 0; hd < qr.length; hd++) {
		var gd = qr[hd];
		Jr(gd.toLowerCase(), "on" + (gd[0].toUpperCase() + gd.slice(1)));
	}
	Jr(zr, "onAnimationEnd"), Jr(Br, "onAnimationIteration"), Jr(Vr, "onAnimationStart"), Jr("dblclick", "onDoubleClick"), Jr("focusin", "onFocus"), Jr("focusout", "onBlur"), Jr(Hr, "onTransitionRun"), Jr(Ur, "onTransitionStart"), Jr(Wr, "onTransitionCancel"), Jr(Gr, "onTransitionEnd"), Ct("onMouseEnter", ["mouseout", "mouseover"]), Ct("onMouseLeave", ["mouseout", "mouseover"]), Ct("onPointerEnter", ["pointerout", "pointerover"]), Ct("onPointerLeave", ["pointerout", "pointerover"]), St("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), St("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), St("onBeforeInput", [
		"compositionend",
		"keypress",
		"textInput",
		"paste"
	]), St("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), St("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), St("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
	var _d = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), vd = new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(_d));
	function yd(e, t) {
		t = !!(t & 4);
		for (var n = 0; n < e.length; n++) {
			var r = e[n], i = r.event;
			r = r.listeners;
			a: {
				var a = void 0;
				if (t) for (var o = r.length - 1; 0 <= o; o--) {
					var s = r[o], c = s.instance, l = s.currentTarget;
					if (s = s.listener, c !== a && i.isPropagationStopped()) break a;
					a = s, i.currentTarget = l;
					try {
						a(i);
					} catch (e) {
						Yr(e);
					}
					i.currentTarget = null, a = c;
				}
				else for (o = 0; o < r.length; o++) {
					if (s = r[o], c = s.instance, l = s.currentTarget, s = s.listener, c !== a && i.isPropagationStopped()) break a;
					a = s, i.currentTarget = l;
					try {
						a(i);
					} catch (e) {
						Yr(e);
					}
					i.currentTarget = null, a = c;
				}
			}
		}
	}
	function Q(e, t) {
		var n = t[lt];
		n === void 0 && (n = t[lt] = /* @__PURE__ */ new Set());
		var r = e + "__bubble";
		n.has(r) || (Cd(t, e, 2, !1), n.add(r));
	}
	function bd(e, t, n) {
		var r = 0;
		t && (r |= 4), Cd(n, e, r, t);
	}
	var xd = "_reactListening" + Math.random().toString(36).slice(2);
	function Sd(e) {
		if (!e[xd]) {
			e[xd] = !0, bt.forEach(function(t) {
				t !== "selectionchange" && (vd.has(t) || bd(t, !1, e), bd(t, !0, e));
			});
			var t = e.nodeType === 9 ? e : e.ownerDocument;
			t === null || t[xd] || (t[xd] = !0, bd("selectionchange", !1, t));
		}
	}
	function Cd(e, t, n, r) {
		switch (mp(t)) {
			case 2:
				var i = cp;
				break;
			case 8:
				i = lp;
				break;
			default: i = up;
		}
		n = i.bind(null, t, n, e), i = void 0, !ln || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (i = !0), r ? i === void 0 ? e.addEventListener(t, n, !0) : e.addEventListener(t, n, {
			capture: !0,
			passive: i
		}) : i === void 0 ? e.addEventListener(t, n, !1) : e.addEventListener(t, n, { passive: i });
	}
	function wd(e, t, n, r, i) {
		var a = r;
		if (!(t & 1) && !(t & 2) && r !== null) a: for (;;) {
			if (r === null) return;
			var o = r.tag;
			if (o === 3 || o === 4) {
				var s = r.stateNode.containerInfo;
				if (s === i) break;
				if (o === 4) for (o = r.return; o !== null;) {
					var c = o.tag;
					if ((c === 3 || c === 4) && o.stateNode.containerInfo === i) return;
					o = o.return;
				}
				for (; s !== null;) {
					if (o = ht(s), o === null) return;
					if (c = o.tag, c === 5 || c === 6 || c === 26 || c === 27) {
						r = a = o;
						continue a;
					}
					s = s.parentNode;
				}
			}
			r = r.return;
		}
		on(function() {
			var r = a, i = en(n), o = [];
			a: {
				var s = Kr.get(e);
				if (s !== void 0) {
					var c = bn, u = e;
					switch (e) {
						case "keypress": if (hn(n) === 0) break a;
						case "keydown":
						case "keyup":
							c = Rn;
							break;
						case "focusin":
							u = "focus", c = kn;
							break;
						case "focusout":
							u = "blur", c = kn;
							break;
						case "beforeblur":
						case "afterblur":
							c = kn;
							break;
						case "click": if (n.button === 2) break a;
						case "auxclick":
						case "dblclick":
						case "mousedown":
						case "mousemove":
						case "mouseup":
						case "mouseout":
						case "mouseover":
						case "contextmenu":
							c = Dn;
							break;
						case "drag":
						case "dragend":
						case "dragenter":
						case "dragexit":
						case "dragleave":
						case "dragover":
						case "dragstart":
						case "drop":
							c = On;
							break;
						case "touchcancel":
						case "touchend":
						case "touchmove":
						case "touchstart":
							c = Bn;
							break;
						case zr:
						case Br:
						case Vr:
							c = An;
							break;
						case Gr:
							c = Vn;
							break;
						case "scroll":
						case "scrollend":
							c = Sn;
							break;
						case "wheel":
							c = Hn;
							break;
						case "copy":
						case "cut":
						case "paste":
							c = jn;
							break;
						case "gotpointercapture":
						case "lostpointercapture":
						case "pointercancel":
						case "pointerdown":
						case "pointermove":
						case "pointerout":
						case "pointerover":
						case "pointerup":
							c = zn;
							break;
						case "toggle":
						case "beforetoggle": c = Un;
					}
					var d = !!(t & 4), f = !d && (e === "scroll" || e === "scrollend"), p = d ? s === null ? null : s + "Capture" : s;
					d = [];
					for (var m = r, h; m !== null;) {
						var g = m;
						if (h = g.stateNode, g = g.tag, g !== 5 && g !== 26 && g !== 27 || h === null || p === null || (g = sn(m, p), g != null && d.push(Td(m, g, h))), f) break;
						m = m.return;
					}
					0 < d.length && (s = new c(s, u, null, n, i), o.push({
						event: s,
						listeners: d
					}));
				}
			}
			if (!(t & 7)) {
				a: {
					if (s = e === "mouseover" || e === "pointerover", c = e === "mouseout" || e === "pointerout", s && n !== $t && (u = n.relatedTarget || n.fromElement) && (ht(u) || u[ct])) break a;
					if ((c || s) && (s = i.window === i ? i : (s = i.ownerDocument) ? s.defaultView || s.parentWindow : window, c ? (u = n.relatedTarget || n.toElement, c = r, u = u ? ht(u) : null, u !== null && (f = l(u), d = u.tag, u !== f || d !== 5 && d !== 27 && d !== 6) && (u = null)) : (c = null, u = r), c !== u)) {
						if (d = Dn, g = "onMouseLeave", p = "onMouseEnter", m = "mouse", (e === "pointerout" || e === "pointerover") && (d = zn, g = "onPointerLeave", p = "onPointerEnter", m = "pointer"), f = c == null ? s : _t(c), h = u == null ? s : _t(u), s = new d(g, m + "leave", c, n, i), s.target = f, s.relatedTarget = h, g = null, ht(i) === r && (d = new d(p, m + "enter", u, n, i), d.target = h, d.relatedTarget = f, g = d), f = g, c && u) b: {
							for (d = Dd, p = c, m = u, h = 0, g = p; g; g = d(g)) h++;
							g = 0;
							for (var _ = m; _; _ = d(_)) g++;
							for (; 0 < h - g;) p = d(p), h--;
							for (; 0 < g - h;) m = d(m), g--;
							for (; h--;) {
								if (p === m || m !== null && p === m.alternate) {
									d = p;
									break b;
								}
								p = d(p), m = d(m);
							}
							d = null;
						}
						else d = null;
						c !== null && Od(o, s, c, d, !1), u !== null && f !== null && Od(o, f, u, d, !0);
					}
				}
				a: {
					if (s = r ? _t(r) : window, c = s.nodeName && s.nodeName.toLowerCase(), c === "select" || c === "input" && s.type === "file") var v = lr;
					else if (rr(s)) if (ur) v = yr;
					else {
						v = _r;
						var y = gr;
					}
					else c = s.nodeName, !c || c.toLowerCase() !== "input" || s.type !== "checkbox" && s.type !== "radio" ? r && Jt(r.elementType) && (v = lr) : v = vr;
					if (v &&= v(e, r)) {
						ir(o, v, n, i);
						break a;
					}
					y && y(e, s, r), e === "focusout" && r && s.type === "number" && r.memoizedProps.value != null && Bt(s, "number", s.value);
				}
				switch (y = r ? _t(r) : window, e) {
					case "focusin":
						(rr(y) || y.contentEditable === "true") && (kr = y, Ar = r, jr = null);
						break;
					case "focusout":
						jr = Ar = kr = null;
						break;
					case "mousedown":
						Mr = !0;
						break;
					case "contextmenu":
					case "mouseup":
					case "dragend":
						Mr = !1, Nr(o, n, i);
						break;
					case "selectionchange": if (Or) break;
					case "keydown":
					case "keyup": Nr(o, n, i);
				}
				var b;
				if (Gn) b: {
					switch (e) {
						case "compositionstart":
							var x = "onCompositionStart";
							break b;
						case "compositionend":
							x = "onCompositionEnd";
							break b;
						case "compositionupdate":
							x = "onCompositionUpdate";
							break b;
					}
					x = void 0;
				}
				else $n ? Zn(e, n) && (x = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (x = "onCompositionStart");
				x && (Jn && n.locale !== "ko" && ($n || x !== "onCompositionStart" ? x === "onCompositionEnd" && $n && (b = mn()) : (dn = i, fn = "value" in dn ? dn.value : dn.textContent, $n = !0)), y = Ed(r, x), 0 < y.length && (x = new Mn(x, e, null, n, i), o.push({
					event: x,
					listeners: y
				}), b ? x.data = b : (b = Qn(n), b !== null && (x.data = b)))), (b = qn ? er(e, n) : tr(e, n)) && (x = Ed(r, "onBeforeInput"), 0 < x.length && (y = new Mn("onBeforeInput", "beforeinput", null, n, i), o.push({
					event: y,
					listeners: x
				}), y.data = b)), md(o, e, r, n, i);
			}
			yd(o, t);
		});
	}
	function Td(e, t, n) {
		return {
			instance: e,
			listener: t,
			currentTarget: n
		};
	}
	function Ed(e, t) {
		for (var n = t + "Capture", r = []; e !== null;) {
			var i = e, a = i.stateNode;
			if (i = i.tag, i !== 5 && i !== 26 && i !== 27 || a === null || (i = sn(e, n), i != null && r.unshift(Td(e, i, a)), i = sn(e, t), i != null && r.push(Td(e, i, a))), e.tag === 3) return r;
			e = e.return;
		}
		return [];
	}
	function Dd(e) {
		if (e === null) return null;
		do
			e = e.return;
		while (e && e.tag !== 5 && e.tag !== 27);
		return e || null;
	}
	function Od(e, t, n, r, i) {
		for (var a = t._reactName, o = []; n !== null && n !== r;) {
			var s = n, c = s.alternate, l = s.stateNode;
			if (s = s.tag, c !== null && c === r) break;
			s !== 5 && s !== 26 && s !== 27 || l === null || (c = l, i ? (l = sn(n, a), l != null && o.unshift(Td(n, l, c))) : i || (l = sn(n, a), l != null && o.push(Td(n, l, c)))), n = n.return;
		}
		o.length !== 0 && e.push({
			event: t,
			listeners: o
		});
	}
	var kd = /\r\n?/g, Ad = /\u0000|\uFFFD/g;
	function jd(e) {
		return (typeof e == "string" ? e : "" + e).replace(kd, "\n").replace(Ad, "");
	}
	function Md(e, t) {
		return t = jd(t), jd(e) === t;
	}
	function $(e, t, n, r, i, a) {
		switch (n) {
			case "children":
				typeof r == "string" ? t === "body" || t === "textarea" && r === "" || Wt(e, r) : (typeof r == "number" || typeof r == "bigint") && t !== "body" && Wt(e, "" + r);
				break;
			case "className":
				Ot(e, "class", r);
				break;
			case "tabIndex":
				Ot(e, "tabindex", r);
				break;
			case "dir":
			case "role":
			case "viewBox":
			case "width":
			case "height":
				Ot(e, n, r);
				break;
			case "style":
				qt(e, r, a);
				break;
			case "data": if (t !== "object") {
				Ot(e, "data", r);
				break;
			}
			case "src":
			case "href":
				if (r === "" && (t !== "a" || n !== "href")) {
					e.removeAttribute(n);
					break;
				}
				if (r == null || typeof r == "function" || typeof r == "symbol" || typeof r == "boolean") {
					e.removeAttribute(n);
					break;
				}
				r = Zt("" + r), e.setAttribute(n, r);
				break;
			case "action":
			case "formAction":
				if (typeof r == "function") {
					e.setAttribute(n, "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");
					break;
				}
				if (typeof a == "function" && (n === "formAction" ? (t !== "input" && $(e, t, "name", i.name, i, null), $(e, t, "formEncType", i.formEncType, i, null), $(e, t, "formMethod", i.formMethod, i, null), $(e, t, "formTarget", i.formTarget, i, null)) : ($(e, t, "encType", i.encType, i, null), $(e, t, "method", i.method, i, null), $(e, t, "target", i.target, i, null))), r == null || typeof r == "symbol" || typeof r == "boolean") {
					e.removeAttribute(n);
					break;
				}
				r = Zt("" + r), e.setAttribute(n, r);
				break;
			case "onClick":
				r != null && (e.onclick = Qt);
				break;
			case "onScroll":
				r != null && Q("scroll", e);
				break;
			case "onScrollEnd":
				r != null && Q("scrollend", e);
				break;
			case "dangerouslySetInnerHTML":
				if (r != null) {
					if (typeof r != "object" || !("__html" in r)) throw Error(s(61));
					if (n = r.__html, n != null) {
						if (i.children != null) throw Error(s(60));
						e.innerHTML = n;
					}
				}
				break;
			case "multiple":
				e.multiple = r && typeof r != "function" && typeof r != "symbol";
				break;
			case "muted":
				e.muted = r && typeof r != "function" && typeof r != "symbol";
				break;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "defaultValue":
			case "defaultChecked":
			case "innerHTML":
			case "ref": break;
			case "autoFocus": break;
			case "xlinkHref":
				if (r == null || typeof r == "function" || typeof r == "boolean" || typeof r == "symbol") {
					e.removeAttribute("xlink:href");
					break;
				}
				n = Zt("" + r), e.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", n);
				break;
			case "contentEditable":
			case "spellCheck":
			case "draggable":
			case "value":
			case "autoReverse":
			case "externalResourcesRequired":
			case "focusable":
			case "preserveAlpha":
				r != null && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, "" + r) : e.removeAttribute(n);
				break;
			case "inert":
			case "allowFullScreen":
			case "async":
			case "autoPlay":
			case "controls":
			case "default":
			case "defer":
			case "disabled":
			case "disablePictureInPicture":
			case "disableRemotePlayback":
			case "formNoValidate":
			case "hidden":
			case "loop":
			case "noModule":
			case "noValidate":
			case "open":
			case "playsInline":
			case "readOnly":
			case "required":
			case "reversed":
			case "scoped":
			case "seamless":
			case "itemScope":
				r && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, "") : e.removeAttribute(n);
				break;
			case "capture":
			case "download":
				!0 === r ? e.setAttribute(n, "") : !1 !== r && r != null && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "cols":
			case "rows":
			case "size":
			case "span":
				r != null && typeof r != "function" && typeof r != "symbol" && !isNaN(r) && 1 <= r ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "rowSpan":
			case "start":
				r == null || typeof r == "function" || typeof r == "symbol" || isNaN(r) ? e.removeAttribute(n) : e.setAttribute(n, r);
				break;
			case "popover":
				Q("beforetoggle", e), Q("toggle", e), Dt(e, "popover", r);
				break;
			case "xlinkActuate":
				kt(e, "http://www.w3.org/1999/xlink", "xlink:actuate", r);
				break;
			case "xlinkArcrole":
				kt(e, "http://www.w3.org/1999/xlink", "xlink:arcrole", r);
				break;
			case "xlinkRole":
				kt(e, "http://www.w3.org/1999/xlink", "xlink:role", r);
				break;
			case "xlinkShow":
				kt(e, "http://www.w3.org/1999/xlink", "xlink:show", r);
				break;
			case "xlinkTitle":
				kt(e, "http://www.w3.org/1999/xlink", "xlink:title", r);
				break;
			case "xlinkType":
				kt(e, "http://www.w3.org/1999/xlink", "xlink:type", r);
				break;
			case "xmlBase":
				kt(e, "http://www.w3.org/XML/1998/namespace", "xml:base", r);
				break;
			case "xmlLang":
				kt(e, "http://www.w3.org/XML/1998/namespace", "xml:lang", r);
				break;
			case "xmlSpace":
				kt(e, "http://www.w3.org/XML/1998/namespace", "xml:space", r);
				break;
			case "is":
				Dt(e, "is", r);
				break;
			case "innerText":
			case "textContent": break;
			default: (!(2 < n.length) || n[0] !== "o" && n[0] !== "O" || n[1] !== "n" && n[1] !== "N") && (n = Yt.get(n) || n, Dt(e, n, r));
		}
	}
	function Nd(e, t, n, r, i, a) {
		switch (n) {
			case "style":
				qt(e, r, a);
				break;
			case "dangerouslySetInnerHTML":
				if (r != null) {
					if (typeof r != "object" || !("__html" in r)) throw Error(s(61));
					if (n = r.__html, n != null) {
						if (i.children != null) throw Error(s(60));
						e.innerHTML = n;
					}
				}
				break;
			case "children":
				typeof r == "string" ? Wt(e, r) : (typeof r == "number" || typeof r == "bigint") && Wt(e, "" + r);
				break;
			case "onScroll":
				r != null && Q("scroll", e);
				break;
			case "onScrollEnd":
				r != null && Q("scrollend", e);
				break;
			case "onClick":
				r != null && (e.onclick = Qt);
				break;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "innerHTML":
			case "ref": break;
			case "innerText":
			case "textContent": break;
			default: if (!xt.hasOwnProperty(n)) a: {
				if (n[0] === "o" && n[1] === "n" && (i = n.endsWith("Capture"), t = n.slice(2, i ? n.length - 7 : void 0), a = e[R] || null, a = a == null ? null : a[n], typeof a == "function" && e.removeEventListener(t, a, i), typeof r == "function")) {
					typeof a != "function" && a !== null && (n in e ? e[n] = null : e.hasAttribute(n) && e.removeAttribute(n)), e.addEventListener(t, r, i);
					break a;
				}
				n in e ? e[n] = r : !0 === r ? e.setAttribute(n, "") : Dt(e, n, r);
			}
		}
	}
	function Pd(e, t, n) {
		switch (t) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li": break;
			case "img":
				Q("error", e), Q("load", e);
				var r = !1, i = !1, a;
				for (a in n) if (n.hasOwnProperty(a)) {
					var o = n[a];
					if (o != null) switch (a) {
						case "src":
							r = !0;
							break;
						case "srcSet":
							i = !0;
							break;
						case "children":
						case "dangerouslySetInnerHTML": throw Error(s(137, t));
						default: $(e, t, a, o, n, null);
					}
				}
				i && $(e, t, "srcSet", n.srcSet, n, null), r && $(e, t, "src", n.src, n, null);
				return;
			case "input":
				Q("invalid", e);
				var c = a = o = i = null, l = null, u = null;
				for (r in n) if (n.hasOwnProperty(r)) {
					var d = n[r];
					if (d != null) switch (r) {
						case "name":
							i = d;
							break;
						case "type":
							o = d;
							break;
						case "checked":
							l = d;
							break;
						case "defaultChecked":
							u = d;
							break;
						case "value":
							a = d;
							break;
						case "defaultValue":
							c = d;
							break;
						case "children":
						case "dangerouslySetInnerHTML":
							if (d != null) throw Error(s(137, t));
							break;
						default: $(e, t, r, d, n, null);
					}
				}
				zt(e, a, c, l, u, o, i, !1);
				return;
			case "select":
				for (i in Q("invalid", e), r = o = a = null, n) if (n.hasOwnProperty(i) && (c = n[i], c != null)) switch (i) {
					case "value":
						a = c;
						break;
					case "defaultValue":
						o = c;
						break;
					case "multiple": r = c;
					default: $(e, t, i, c, n, null);
				}
				t = a, n = o, e.multiple = !!r, t == null ? n != null && Vt(e, !!r, n, !0) : Vt(e, !!r, t, !1);
				return;
			case "textarea":
				for (o in Q("invalid", e), a = i = r = null, n) if (n.hasOwnProperty(o) && (c = n[o], c != null)) switch (o) {
					case "value":
						r = c;
						break;
					case "defaultValue":
						i = c;
						break;
					case "children":
						a = c;
						break;
					case "dangerouslySetInnerHTML":
						if (c != null) throw Error(s(91));
						break;
					default: $(e, t, o, c, n, null);
				}
				Ut(e, r, i, a);
				return;
			case "option":
				for (l in n) if (n.hasOwnProperty(l) && (r = n[l], r != null)) switch (l) {
					case "selected":
						e.selected = r && typeof r != "function" && typeof r != "symbol";
						break;
					default: $(e, t, l, r, n, null);
				}
				return;
			case "dialog":
				Q("beforetoggle", e), Q("toggle", e), Q("cancel", e), Q("close", e);
				break;
			case "iframe":
			case "object":
				Q("load", e);
				break;
			case "video":
			case "audio":
				for (r = 0; r < _d.length; r++) Q(_d[r], e);
				break;
			case "image":
				Q("error", e), Q("load", e);
				break;
			case "details":
				Q("toggle", e);
				break;
			case "embed":
			case "source":
			case "link": Q("error", e), Q("load", e);
			case "area":
			case "base":
			case "br":
			case "col":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "track":
			case "wbr":
			case "menuitem":
				for (u in n) if (n.hasOwnProperty(u) && (r = n[u], r != null)) switch (u) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error(s(137, t));
					default: $(e, t, u, r, n, null);
				}
				return;
			default: if (Jt(t)) {
				for (d in n) n.hasOwnProperty(d) && (r = n[d], r !== void 0 && Nd(e, t, d, r, n, void 0));
				return;
			}
		}
		for (c in n) n.hasOwnProperty(c) && (r = n[c], r != null && $(e, t, c, r, n, null));
	}
	function Fd(e, t, n, r) {
		switch (t) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li": break;
			case "input":
				var i = null, a = null, o = null, c = null, l = null, u = null, d = null;
				for (m in n) {
					var f = n[m];
					if (n.hasOwnProperty(m) && f != null) switch (m) {
						case "checked": break;
						case "value": break;
						case "defaultValue": l = f;
						default: r.hasOwnProperty(m) || $(e, t, m, null, r, f);
					}
				}
				for (var p in r) {
					var m = r[p];
					if (f = n[p], r.hasOwnProperty(p) && (m != null || f != null)) switch (p) {
						case "type":
							a = m;
							break;
						case "name":
							i = m;
							break;
						case "checked":
							u = m;
							break;
						case "defaultChecked":
							d = m;
							break;
						case "value":
							o = m;
							break;
						case "defaultValue":
							c = m;
							break;
						case "children":
						case "dangerouslySetInnerHTML":
							if (m != null) throw Error(s(137, t));
							break;
						default: m !== f && $(e, t, p, m, r, f);
					}
				}
				Rt(e, o, c, l, u, d, a, i);
				return;
			case "select":
				for (a in m = o = c = p = null, n) if (l = n[a], n.hasOwnProperty(a) && l != null) switch (a) {
					case "value": break;
					case "multiple": m = l;
					default: r.hasOwnProperty(a) || $(e, t, a, null, r, l);
				}
				for (i in r) if (a = r[i], l = n[i], r.hasOwnProperty(i) && (a != null || l != null)) switch (i) {
					case "value":
						p = a;
						break;
					case "defaultValue":
						c = a;
						break;
					case "multiple": o = a;
					default: a !== l && $(e, t, i, a, r, l);
				}
				t = c, n = o, r = m, p == null ? !!r != !!n && (t == null ? Vt(e, !!n, n ? [] : "", !1) : Vt(e, !!n, t, !0)) : Vt(e, !!n, p, !1);
				return;
			case "textarea":
				for (c in m = p = null, n) if (i = n[c], n.hasOwnProperty(c) && i != null && !r.hasOwnProperty(c)) switch (c) {
					case "value": break;
					case "children": break;
					default: $(e, t, c, null, r, i);
				}
				for (o in r) if (i = r[o], a = n[o], r.hasOwnProperty(o) && (i != null || a != null)) switch (o) {
					case "value":
						p = i;
						break;
					case "defaultValue":
						m = i;
						break;
					case "children": break;
					case "dangerouslySetInnerHTML":
						if (i != null) throw Error(s(91));
						break;
					default: i !== a && $(e, t, o, i, r, a);
				}
				Ht(e, p, m);
				return;
			case "option":
				for (var h in n) if (p = n[h], n.hasOwnProperty(h) && p != null && !r.hasOwnProperty(h)) switch (h) {
					case "selected":
						e.selected = !1;
						break;
					default: $(e, t, h, null, r, p);
				}
				for (l in r) if (p = r[l], m = n[l], r.hasOwnProperty(l) && p !== m && (p != null || m != null)) switch (l) {
					case "selected":
						e.selected = p && typeof p != "function" && typeof p != "symbol";
						break;
					default: $(e, t, l, p, r, m);
				}
				return;
			case "img":
			case "link":
			case "area":
			case "base":
			case "br":
			case "col":
			case "embed":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "source":
			case "track":
			case "wbr":
			case "menuitem":
				for (var g in n) p = n[g], n.hasOwnProperty(g) && p != null && !r.hasOwnProperty(g) && $(e, t, g, null, r, p);
				for (u in r) if (p = r[u], m = n[u], r.hasOwnProperty(u) && p !== m && (p != null || m != null)) switch (u) {
					case "children":
					case "dangerouslySetInnerHTML":
						if (p != null) throw Error(s(137, t));
						break;
					default: $(e, t, u, p, r, m);
				}
				return;
			default: if (Jt(t)) {
				for (var _ in n) p = n[_], n.hasOwnProperty(_) && p !== void 0 && !r.hasOwnProperty(_) && Nd(e, t, _, void 0, r, p);
				for (d in r) p = r[d], m = n[d], !r.hasOwnProperty(d) || p === m || p === void 0 && m === void 0 || Nd(e, t, d, p, r, m);
				return;
			}
		}
		for (var v in n) p = n[v], n.hasOwnProperty(v) && p != null && !r.hasOwnProperty(v) && $(e, t, v, null, r, p);
		for (f in r) p = r[f], m = n[f], !r.hasOwnProperty(f) || p === m || p == null && m == null || $(e, t, f, p, r, m);
	}
	function Id(e) {
		switch (e) {
			case "css":
			case "script":
			case "font":
			case "img":
			case "image":
			case "input":
			case "link": return !0;
			default: return !1;
		}
	}
	function Ld() {
		if (typeof performance.getEntriesByType == "function") {
			for (var e = 0, t = 0, n = performance.getEntriesByType("resource"), r = 0; r < n.length; r++) {
				var i = n[r], a = i.transferSize, o = i.initiatorType, s = i.duration;
				if (a && s && Id(o)) {
					for (o = 0, s = i.responseEnd, r += 1; r < n.length; r++) {
						var c = n[r], l = c.startTime;
						if (l > s) break;
						var u = c.transferSize, d = c.initiatorType;
						u && Id(d) && (c = c.responseEnd, o += u * (c < s ? 1 : (s - l) / (c - l)));
					}
					if (--r, t += 8 * (a + o) / (i.duration / 1e3), e++, 10 < e) break;
				}
			}
			if (0 < e) return t / e / 1e6;
		}
		return navigator.connection && (e = navigator.connection.downlink, typeof e == "number") ? e : 5;
	}
	var Rd = null, zd = null;
	function Bd(e) {
		return e.nodeType === 9 ? e : e.ownerDocument;
	}
	function Vd(e) {
		switch (e) {
			case "http://www.w3.org/2000/svg": return 1;
			case "http://www.w3.org/1998/Math/MathML": return 2;
			default: return 0;
		}
	}
	function Hd(e, t) {
		if (e === 0) switch (t) {
			case "svg": return 1;
			case "math": return 2;
			default: return 0;
		}
		return e === 1 && t === "foreignObject" ? 0 : e;
	}
	function Ud(e, t) {
		return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
	}
	var Wd = null;
	function Gd() {
		var e = window.event;
		return e && e.type === "popstate" ? e !== Wd && (Wd = e, !0) : (Wd = null, !1);
	}
	var Kd = typeof setTimeout == "function" ? setTimeout : void 0, qd = typeof clearTimeout == "function" ? clearTimeout : void 0, Jd = typeof Promise == "function" ? Promise : void 0, Yd = typeof queueMicrotask == "function" ? queueMicrotask : Jd === void 0 ? Kd : function(e) {
		return Jd.resolve(null).then(e).catch(Xd);
	};
	function Xd(e) {
		setTimeout(function() {
			throw e;
		});
	}
	function Zd(e) {
		return e === "head";
	}
	function Qd(e, t) {
		var n = t, r = 0;
		do {
			var i = n.nextSibling;
			if (e.removeChild(n), i && i.nodeType === 8) if (n = i.data, n === "/$" || n === "/&") {
				if (r === 0) {
					e.removeChild(i), Np(t);
					return;
				}
				r--;
			} else if (n === "$" || n === "$?" || n === "$~" || n === "$!" || n === "&") r++;
			else if (n === "html") pf(e.ownerDocument.documentElement);
			else if (n === "head") {
				n = e.ownerDocument.head, pf(n);
				for (var a = n.firstChild; a;) {
					var o = a.nextSibling, s = a.nodeName;
					a[pt] || s === "SCRIPT" || s === "STYLE" || s === "LINK" && a.rel.toLowerCase() === "stylesheet" || n.removeChild(a), a = o;
				}
			} else n === "body" && pf(e.ownerDocument.body);
			n = i;
		} while (n);
		Np(t);
	}
	function $d(e, t) {
		var n = e;
		e = 0;
		do {
			var r = n.nextSibling;
			if (n.nodeType === 1 ? t ? (n._stashedDisplay = n.style.display, n.style.display = "none") : (n.style.display = n._stashedDisplay || "", n.getAttribute("style") === "" && n.removeAttribute("style")) : n.nodeType === 3 && (t ? (n._stashedText = n.nodeValue, n.nodeValue = "") : n.nodeValue = n._stashedText || ""), r && r.nodeType === 8) if (n = r.data, n === "/$") {
				if (e === 0) break;
				e--;
			} else n !== "$" && n !== "$?" && n !== "$~" && n !== "$!" || e++;
			n = r;
		} while (n);
	}
	function ef(e) {
		var t = e.firstChild;
		for (t && t.nodeType === 10 && (t = t.nextSibling); t;) {
			var n = t;
			switch (t = t.nextSibling, n.nodeName) {
				case "HTML":
				case "HEAD":
				case "BODY":
					ef(n), mt(n);
					continue;
				case "SCRIPT":
				case "STYLE": continue;
				case "LINK": if (n.rel.toLowerCase() === "stylesheet") continue;
			}
			e.removeChild(n);
		}
	}
	function tf(e, t, n, r) {
		for (; e.nodeType === 1;) {
			var i = n;
			if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
				if (!r && (e.nodeName !== "INPUT" || e.type !== "hidden")) break;
			} else if (!r) if (t === "input" && e.type === "hidden") {
				var a = i.name == null ? null : "" + i.name;
				if (i.type === "hidden" && e.getAttribute("name") === a) return e;
			} else return e;
			else if (!e[pt]) switch (t) {
				case "meta":
					if (!e.hasAttribute("itemprop")) break;
					return e;
				case "link":
					if (a = e.getAttribute("rel"), a === "stylesheet" && e.hasAttribute("data-precedence") || a !== i.rel || e.getAttribute("href") !== (i.href == null || i.href === "" ? null : i.href) || e.getAttribute("crossorigin") !== (i.crossOrigin == null ? null : i.crossOrigin) || e.getAttribute("title") !== (i.title == null ? null : i.title)) break;
					return e;
				case "style":
					if (e.hasAttribute("data-precedence")) break;
					return e;
				case "script":
					if (a = e.getAttribute("src"), (a !== (i.src == null ? null : i.src) || e.getAttribute("type") !== (i.type == null ? null : i.type) || e.getAttribute("crossorigin") !== (i.crossOrigin == null ? null : i.crossOrigin)) && a && e.hasAttribute("async") && !e.hasAttribute("itemprop")) break;
					return e;
				default: return e;
			}
			if (e = cf(e.nextSibling), e === null) break;
		}
		return null;
	}
	function nf(e, t, n) {
		if (t === "") return null;
		for (; e.nodeType !== 3;) if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !n || (e = cf(e.nextSibling), e === null)) return null;
		return e;
	}
	function rf(e, t) {
		for (; e.nodeType !== 8;) if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !t || (e = cf(e.nextSibling), e === null)) return null;
		return e;
	}
	function af(e) {
		return e.data === "$?" || e.data === "$~";
	}
	function of(e) {
		return e.data === "$!" || e.data === "$?" && e.ownerDocument.readyState !== "loading";
	}
	function sf(e, t) {
		var n = e.ownerDocument;
		if (e.data === "$~") e._reactRetry = t;
		else if (e.data !== "$?" || n.readyState !== "loading") t();
		else {
			var r = function() {
				t(), n.removeEventListener("DOMContentLoaded", r);
			};
			n.addEventListener("DOMContentLoaded", r), e._reactRetry = r;
		}
	}
	function cf(e) {
		for (; e != null; e = e.nextSibling) {
			var t = e.nodeType;
			if (t === 1 || t === 3) break;
			if (t === 8) {
				if (t = e.data, t === "$" || t === "$!" || t === "$?" || t === "$~" || t === "&" || t === "F!" || t === "F") break;
				if (t === "/$" || t === "/&") return null;
			}
		}
		return e;
	}
	var lf = null;
	function uf(e) {
		e = e.nextSibling;
		for (var t = 0; e;) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "/$" || n === "/&") {
					if (t === 0) return cf(e.nextSibling);
					t--;
				} else n !== "$" && n !== "$!" && n !== "$?" && n !== "$~" && n !== "&" || t++;
			}
			e = e.nextSibling;
		}
		return null;
	}
	function df(e) {
		e = e.previousSibling;
		for (var t = 0; e;) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "$" || n === "$!" || n === "$?" || n === "$~" || n === "&") {
					if (t === 0) return e;
					t--;
				} else n !== "/$" && n !== "/&" || t++;
			}
			e = e.previousSibling;
		}
		return null;
	}
	function ff(e, t, n) {
		switch (t = Bd(n), e) {
			case "html":
				if (e = t.documentElement, !e) throw Error(s(452));
				return e;
			case "head":
				if (e = t.head, !e) throw Error(s(453));
				return e;
			case "body":
				if (e = t.body, !e) throw Error(s(454));
				return e;
			default: throw Error(s(451));
		}
	}
	function pf(e) {
		for (var t = e.attributes; t.length;) e.removeAttributeNode(t[0]);
		mt(e);
	}
	var mf = /* @__PURE__ */ new Map(), hf = /* @__PURE__ */ new Set();
	function gf(e) {
		return typeof e.getRootNode == "function" ? e.getRootNode() : e.nodeType === 9 ? e : e.ownerDocument;
	}
	var _f = A.d;
	A.d = {
		f: vf,
		r: yf,
		D: Sf,
		C: Cf,
		L: wf,
		m: Tf,
		X: Df,
		S: Ef,
		M: Of
	};
	function vf() {
		var e = _f.f(), t = bu();
		return e || t;
	}
	function yf(e) {
		var t = gt(e);
		t !== null && t.tag === 5 && t.type === "form" ? Es(t) : _f.r(e);
	}
	var bf = typeof document > "u" ? null : document;
	function xf(e, t, n) {
		var r = bf;
		if (r && typeof t == "string" && t) {
			var i = Lt(t);
			i = "link[rel=\"" + e + "\"][href=\"" + i + "\"]", typeof n == "string" && (i += "[crossorigin=\"" + n + "\"]"), hf.has(i) || (hf.add(i), e = {
				rel: e,
				crossOrigin: n,
				href: t
			}, r.querySelector(i) === null && (t = r.createElement("link"), Pd(t, "link", e), yt(t), r.head.appendChild(t)));
		}
	}
	function Sf(e) {
		_f.D(e), xf("dns-prefetch", e, null);
	}
	function Cf(e, t) {
		_f.C(e, t), xf("preconnect", e, t);
	}
	function wf(e, t, n) {
		_f.L(e, t, n);
		var r = bf;
		if (r && e && t) {
			var i = "link[rel=\"preload\"][as=\"" + Lt(t) + "\"]";
			t === "image" && n && n.imageSrcSet ? (i += "[imagesrcset=\"" + Lt(n.imageSrcSet) + "\"]", typeof n.imageSizes == "string" && (i += "[imagesizes=\"" + Lt(n.imageSizes) + "\"]")) : i += "[href=\"" + Lt(e) + "\"]";
			var a = i;
			switch (t) {
				case "style":
					a = Af(e);
					break;
				case "script": a = Pf(e);
			}
			mf.has(a) || (e = h({
				rel: "preload",
				href: t === "image" && n && n.imageSrcSet ? void 0 : e,
				as: t
			}, n), mf.set(a, e), r.querySelector(i) !== null || t === "style" && r.querySelector(jf(a)) || t === "script" && r.querySelector(Ff(a)) || (t = r.createElement("link"), Pd(t, "link", e), yt(t), r.head.appendChild(t)));
		}
	}
	function Tf(e, t) {
		_f.m(e, t);
		var n = bf;
		if (n && e) {
			var r = t && typeof t.as == "string" ? t.as : "script", i = "link[rel=\"modulepreload\"][as=\"" + Lt(r) + "\"][href=\"" + Lt(e) + "\"]", a = i;
			switch (r) {
				case "audioworklet":
				case "paintworklet":
				case "serviceworker":
				case "sharedworker":
				case "worker":
				case "script": a = Pf(e);
			}
			if (!mf.has(a) && (e = h({
				rel: "modulepreload",
				href: e
			}, t), mf.set(a, e), n.querySelector(i) === null)) {
				switch (r) {
					case "audioworklet":
					case "paintworklet":
					case "serviceworker":
					case "sharedworker":
					case "worker":
					case "script": if (n.querySelector(Ff(a))) return;
				}
				r = n.createElement("link"), Pd(r, "link", e), yt(r), n.head.appendChild(r);
			}
		}
	}
	function Ef(e, t, n) {
		_f.S(e, t, n);
		var r = bf;
		if (r && e) {
			var i = vt(r).hoistableStyles, a = Af(e);
			t ||= "default";
			var o = i.get(a);
			if (!o) {
				var s = {
					loading: 0,
					preload: null
				};
				if (o = r.querySelector(jf(a))) s.loading = 5;
				else {
					e = h({
						rel: "stylesheet",
						href: e,
						"data-precedence": t
					}, n), (n = mf.get(a)) && Rf(e, n);
					var c = o = r.createElement("link");
					yt(c), Pd(c, "link", e), c._p = new Promise(function(e, t) {
						c.onload = e, c.onerror = t;
					}), c.addEventListener("load", function() {
						s.loading |= 1;
					}), c.addEventListener("error", function() {
						s.loading |= 2;
					}), s.loading |= 4, Lf(o, t, r);
				}
				o = {
					type: "stylesheet",
					instance: o,
					count: 1,
					state: s
				}, i.set(a, o);
			}
		}
	}
	function Df(e, t) {
		_f.X(e, t);
		var n = bf;
		if (n && e) {
			var r = vt(n).hoistableScripts, i = Pf(e), a = r.get(i);
			a || (a = n.querySelector(Ff(i)), a || (e = h({
				src: e,
				async: !0
			}, t), (t = mf.get(i)) && zf(e, t), a = n.createElement("script"), yt(a), Pd(a, "link", e), n.head.appendChild(a)), a = {
				type: "script",
				instance: a,
				count: 1,
				state: null
			}, r.set(i, a));
		}
	}
	function Of(e, t) {
		_f.M(e, t);
		var n = bf;
		if (n && e) {
			var r = vt(n).hoistableScripts, i = Pf(e), a = r.get(i);
			a || (a = n.querySelector(Ff(i)), a || (e = h({
				src: e,
				async: !0,
				type: "module"
			}, t), (t = mf.get(i)) && zf(e, t), a = n.createElement("script"), yt(a), Pd(a, "link", e), n.head.appendChild(a)), a = {
				type: "script",
				instance: a,
				count: 1,
				state: null
			}, r.set(i, a));
		}
	}
	function kf(e, t, n, r) {
		var i = (i = fe.current) ? gf(i) : null;
		if (!i) throw Error(s(446));
		switch (e) {
			case "meta":
			case "title": return null;
			case "style": return typeof n.precedence == "string" && typeof n.href == "string" ? (t = Af(n.href), n = vt(i).hoistableStyles, r = n.get(t), r || (r = {
				type: "style",
				instance: null,
				count: 0,
				state: null
			}, n.set(t, r)), r) : {
				type: "void",
				instance: null,
				count: 0,
				state: null
			};
			case "link":
				if (n.rel === "stylesheet" && typeof n.href == "string" && typeof n.precedence == "string") {
					e = Af(n.href);
					var a = vt(i).hoistableStyles, o = a.get(e);
					if (o || (i = i.ownerDocument || i, o = {
						type: "stylesheet",
						instance: null,
						count: 0,
						state: {
							loading: 0,
							preload: null
						}
					}, a.set(e, o), (a = i.querySelector(jf(e))) && !a._p && (o.instance = a, o.state.loading = 5), mf.has(e) || (n = {
						rel: "preload",
						as: "style",
						href: n.href,
						crossOrigin: n.crossOrigin,
						integrity: n.integrity,
						media: n.media,
						hrefLang: n.hrefLang,
						referrerPolicy: n.referrerPolicy
					}, mf.set(e, n), a || Nf(i, e, n, o.state))), t && r === null) throw Error(s(528, ""));
					return o;
				}
				if (t && r !== null) throw Error(s(529, ""));
				return null;
			case "script": return t = n.async, n = n.src, typeof n == "string" && t && typeof t != "function" && typeof t != "symbol" ? (t = Pf(n), n = vt(i).hoistableScripts, r = n.get(t), r || (r = {
				type: "script",
				instance: null,
				count: 0,
				state: null
			}, n.set(t, r)), r) : {
				type: "void",
				instance: null,
				count: 0,
				state: null
			};
			default: throw Error(s(444, e));
		}
	}
	function Af(e) {
		return "href=\"" + Lt(e) + "\"";
	}
	function jf(e) {
		return "link[rel=\"stylesheet\"][" + e + "]";
	}
	function Mf(e) {
		return h({}, e, {
			"data-precedence": e.precedence,
			precedence: null
		});
	}
	function Nf(e, t, n, r) {
		e.querySelector("link[rel=\"preload\"][as=\"style\"][" + t + "]") ? r.loading = 1 : (t = e.createElement("link"), r.preload = t, t.addEventListener("load", function() {
			return r.loading |= 1;
		}), t.addEventListener("error", function() {
			return r.loading |= 2;
		}), Pd(t, "link", n), yt(t), e.head.appendChild(t));
	}
	function Pf(e) {
		return "[src=\"" + Lt(e) + "\"]";
	}
	function Ff(e) {
		return "script[async]" + e;
	}
	function If(e, t, n) {
		if (t.count++, t.instance === null) switch (t.type) {
			case "style":
				var r = e.querySelector("style[data-href~=\"" + Lt(n.href) + "\"]");
				if (r) return t.instance = r, yt(r), r;
				var i = h({}, n, {
					"data-href": n.href,
					"data-precedence": n.precedence,
					href: null,
					precedence: null
				});
				return r = (e.ownerDocument || e).createElement("style"), yt(r), Pd(r, "style", i), Lf(r, n.precedence, e), t.instance = r;
			case "stylesheet":
				i = Af(n.href);
				var a = e.querySelector(jf(i));
				if (a) return t.state.loading |= 4, t.instance = a, yt(a), a;
				r = Mf(n), (i = mf.get(i)) && Rf(r, i), a = (e.ownerDocument || e).createElement("link"), yt(a);
				var o = a;
				return o._p = new Promise(function(e, t) {
					o.onload = e, o.onerror = t;
				}), Pd(a, "link", r), t.state.loading |= 4, Lf(a, n.precedence, e), t.instance = a;
			case "script": return a = Pf(n.src), (i = e.querySelector(Ff(a))) ? (t.instance = i, yt(i), i) : (r = n, (i = mf.get(a)) && (r = h({}, n), zf(r, i)), e = e.ownerDocument || e, i = e.createElement("script"), yt(i), Pd(i, "link", r), e.head.appendChild(i), t.instance = i);
			case "void": return null;
			default: throw Error(s(443, t.type));
		}
		else t.type === "stylesheet" && !(t.state.loading & 4) && (r = t.instance, t.state.loading |= 4, Lf(r, n.precedence, e));
		return t.instance;
	}
	function Lf(e, t, n) {
		for (var r = n.querySelectorAll("link[rel=\"stylesheet\"][data-precedence],style[data-precedence]"), i = r.length ? r[r.length - 1] : null, a = i, o = 0; o < r.length; o++) {
			var s = r[o];
			if (s.dataset.precedence === t) a = s;
			else if (a !== i) break;
		}
		a ? a.parentNode.insertBefore(e, a.nextSibling) : (t = n.nodeType === 9 ? n.head : n, t.insertBefore(e, t.firstChild));
	}
	function Rf(e, t) {
		e.crossOrigin ??= t.crossOrigin, e.referrerPolicy ??= t.referrerPolicy, e.title ??= t.title;
	}
	function zf(e, t) {
		e.crossOrigin ??= t.crossOrigin, e.referrerPolicy ??= t.referrerPolicy, e.integrity ??= t.integrity;
	}
	var Bf = null;
	function Vf(e, t, n) {
		if (Bf === null) {
			var r = /* @__PURE__ */ new Map(), i = Bf = /* @__PURE__ */ new Map();
			i.set(n, r);
		} else i = Bf, r = i.get(n), r || (r = /* @__PURE__ */ new Map(), i.set(n, r));
		if (r.has(e)) return r;
		for (r.set(e, null), n = n.getElementsByTagName(e), i = 0; i < n.length; i++) {
			var a = n[i];
			if (!(a[pt] || a[L] || e === "link" && a.getAttribute("rel") === "stylesheet") && a.namespaceURI !== "http://www.w3.org/2000/svg") {
				var o = a.getAttribute(t) || "";
				o = e + o;
				var s = r.get(o);
				s ? s.push(a) : r.set(o, [a]);
			}
		}
		return r;
	}
	function Hf(e, t, n) {
		e = e.ownerDocument || e, e.head.insertBefore(n, t === "title" ? e.querySelector("head > title") : null);
	}
	function Uf(e, t, n) {
		if (n === 1 || t.itemProp != null) return !1;
		switch (e) {
			case "meta":
			case "title": return !0;
			case "style":
				if (typeof t.precedence != "string" || typeof t.href != "string" || t.href === "") break;
				return !0;
			case "link":
				if (typeof t.rel != "string" || typeof t.href != "string" || t.href === "" || t.onLoad || t.onError) break;
				switch (t.rel) {
					case "stylesheet": return e = t.disabled, typeof t.precedence == "string" && e == null;
					default: return !0;
				}
			case "script": if (t.async && typeof t.async != "function" && typeof t.async != "symbol" && !t.onLoad && !t.onError && t.src && typeof t.src == "string") return !0;
		}
		return !1;
	}
	function Wf(e) {
		return !(e.type === "stylesheet" && !(e.state.loading & 3));
	}
	function Gf(e, t, n, r) {
		if (n.type === "stylesheet" && (typeof r.media != "string" || !1 !== matchMedia(r.media).matches) && !(n.state.loading & 4)) {
			if (n.instance === null) {
				var i = Af(r.href), a = t.querySelector(jf(i));
				if (a) {
					t = a._p, typeof t == "object" && t && typeof t.then == "function" && (e.count++, e = Jf.bind(e), t.then(e, e)), n.state.loading |= 4, n.instance = a, yt(a);
					return;
				}
				a = t.ownerDocument || t, r = Mf(r), (i = mf.get(i)) && Rf(r, i), a = a.createElement("link"), yt(a);
				var o = a;
				o._p = new Promise(function(e, t) {
					o.onload = e, o.onerror = t;
				}), Pd(a, "link", r), n.instance = a;
			}
			e.stylesheets === null && (e.stylesheets = /* @__PURE__ */ new Map()), e.stylesheets.set(n, t), (t = n.state.preload) && !(n.state.loading & 3) && (e.count++, n = Jf.bind(e), t.addEventListener("load", n), t.addEventListener("error", n));
		}
	}
	var Kf = 0;
	function qf(e, t) {
		return e.stylesheets && e.count === 0 && Xf(e, e.stylesheets), 0 < e.count || 0 < e.imgCount ? function(n) {
			var r = setTimeout(function() {
				if (e.stylesheets && Xf(e, e.stylesheets), e.unsuspend) {
					var t = e.unsuspend;
					e.unsuspend = null, t();
				}
			}, 6e4 + t);
			0 < e.imgBytes && Kf === 0 && (Kf = 62500 * Ld());
			var i = setTimeout(function() {
				if (e.waitingForImages = !1, e.count === 0 && (e.stylesheets && Xf(e, e.stylesheets), e.unsuspend)) {
					var t = e.unsuspend;
					e.unsuspend = null, t();
				}
			}, (e.imgBytes > Kf ? 50 : 800) + t);
			return e.unsuspend = n, function() {
				e.unsuspend = null, clearTimeout(r), clearTimeout(i);
			};
		} : null;
	}
	function Jf() {
		if (this.count--, this.count === 0 && (this.imgCount === 0 || !this.waitingForImages)) {
			if (this.stylesheets) Xf(this, this.stylesheets);
			else if (this.unsuspend) {
				var e = this.unsuspend;
				this.unsuspend = null, e();
			}
		}
	}
	var Yf = null;
	function Xf(e, t) {
		e.stylesheets = null, e.unsuspend !== null && (e.count++, Yf = /* @__PURE__ */ new Map(), t.forEach(Zf, e), Yf = null, Jf.call(e));
	}
	function Zf(e, t) {
		if (!(t.state.loading & 4)) {
			var n = Yf.get(e);
			if (n) var r = n.get(null);
			else {
				n = /* @__PURE__ */ new Map(), Yf.set(e, n);
				for (var i = e.querySelectorAll("link[data-precedence],style[data-precedence]"), a = 0; a < i.length; a++) {
					var o = i[a];
					(o.nodeName === "LINK" || o.getAttribute("media") !== "not all") && (n.set(o.dataset.precedence, o), r = o);
				}
				r && n.set(null, r);
			}
			i = t.instance, o = i.getAttribute("data-precedence"), a = n.get(o) || r, a === r && n.set(null, i), n.set(o, i), this.count++, r = Jf.bind(this), i.addEventListener("load", r), i.addEventListener("error", r), a ? a.parentNode.insertBefore(i, a.nextSibling) : (e = e.nodeType === 9 ? e.head : e, e.insertBefore(i, e.firstChild)), t.state.loading |= 4;
		}
	}
	var Qf = {
		$$typeof: C,
		Provider: null,
		Consumer: null,
		_currentValue: se,
		_currentValue2: se,
		_threadCount: 0
	};
	function $f(e, t, n, r, i, a, o, s, c) {
		this.tag = 1, this.containerInfo = e, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = Qe(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Qe(0), this.hiddenUpdates = Qe(null), this.identifierPrefix = r, this.onUncaughtError = i, this.onCaughtError = a, this.onRecoverableError = o, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = c, this.incompleteTransitions = /* @__PURE__ */ new Map();
	}
	function ep(e, t, n, r, i, a, o, s, c, l, u, d) {
		return e = new $f(e, t, n, o, c, l, u, d, s), t = 1, !0 === a && (t |= 24), a = si(3, null, null, t), e.current = a, a.stateNode = e, t = oa(), t.refCount++, e.pooledCache = t, t.refCount++, a.memoizedState = {
			element: r,
			isDehydrated: n,
			cache: t
		}, za(a), e;
	}
	function tp(e) {
		return e ? (e = ai, e) : ai;
	}
	function np(e, t, n, r, i, a) {
		i = tp(i), r.context === null ? r.context = i : r.pendingContext = i, r = Va(t), r.payload = { element: n }, a = a === void 0 ? null : a, a !== null && (r.callback = a), n = Ha(e, r, t), n !== null && (hu(n, e, t), Ua(n, e, t));
	}
	function rp(e, t) {
		if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
			var n = e.retryLane;
			e.retryLane = n !== 0 && n < t ? n : t;
		}
	}
	function ip(e, t) {
		rp(e, t), (e = e.alternate) && rp(e, t);
	}
	function ap(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = ni(e, 67108864);
			t !== null && hu(t, e, 67108864), ip(e, 67108864);
		}
	}
	function op(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = pu();
			t = rt(t);
			var n = ni(e, t);
			n !== null && hu(n, e, t), ip(e, t);
		}
	}
	var sp = !0;
	function cp(e, t, n, r) {
		var i = k.T;
		k.T = null;
		var a = A.p;
		try {
			A.p = 2, up(e, t, n, r);
		} finally {
			A.p = a, k.T = i;
		}
	}
	function lp(e, t, n, r) {
		var i = k.T;
		k.T = null;
		var a = A.p;
		try {
			A.p = 8, up(e, t, n, r);
		} finally {
			A.p = a, k.T = i;
		}
	}
	function up(e, t, n, r) {
		if (sp) {
			var i = dp(r);
			if (i === null) wd(e, t, r, fp, n), Cp(e, r);
			else if (Tp(i, e, t, n, r)) r.stopPropagation();
			else if (Cp(e, r), t & 4 && -1 < Sp.indexOf(e)) {
				for (; i !== null;) {
					var a = gt(i);
					if (a !== null) switch (a.tag) {
						case 3:
							if (a = a.stateNode, a.current.memoizedState.isDehydrated) {
								var o = F(a.pendingLanes);
								if (o !== 0) {
									var s = a;
									for (s.pendingLanes |= 2, s.entangledLanes |= 2; o;) {
										var c = 1 << 31 - P(o);
										s.entanglements[1] |= c, o &= ~c;
									}
									rd(a), !(K & 6) && (tu = Ae() + 500, id(0, !1));
								}
							}
							break;
						case 31:
						case 13: s = ni(a, 2), s !== null && hu(s, a, 2), bu(), ip(a, 2);
					}
					if (a = dp(r), a === null && wd(e, t, r, fp, n), a === i) break;
					i = a;
				}
				i !== null && r.stopPropagation();
			} else wd(e, t, r, null, n);
		}
	}
	function dp(e) {
		return e = en(e), pp(e);
	}
	var fp = null;
	function pp(e) {
		if (fp = null, e = ht(e), e !== null) {
			var t = l(e);
			if (t === null) e = null;
			else {
				var n = t.tag;
				if (n === 13) {
					if (e = u(t), e !== null) return e;
					e = null;
				} else if (n === 31) {
					if (e = d(t), e !== null) return e;
					e = null;
				} else if (n === 3) {
					if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
					e = null;
				} else t !== e && (e = null);
			}
		}
		return fp = e, null;
	}
	function mp(e) {
		switch (e) {
			case "beforetoggle":
			case "cancel":
			case "click":
			case "close":
			case "contextmenu":
			case "copy":
			case "cut":
			case "auxclick":
			case "dblclick":
			case "dragend":
			case "dragstart":
			case "drop":
			case "focusin":
			case "focusout":
			case "input":
			case "invalid":
			case "keydown":
			case "keypress":
			case "keyup":
			case "mousedown":
			case "mouseup":
			case "paste":
			case "pause":
			case "play":
			case "pointercancel":
			case "pointerdown":
			case "pointerup":
			case "ratechange":
			case "reset":
			case "resize":
			case "seeked":
			case "submit":
			case "toggle":
			case "touchcancel":
			case "touchend":
			case "touchstart":
			case "volumechange":
			case "change":
			case "selectionchange":
			case "textInput":
			case "compositionstart":
			case "compositionend":
			case "compositionupdate":
			case "beforeblur":
			case "afterblur":
			case "beforeinput":
			case "blur":
			case "fullscreenchange":
			case "focus":
			case "hashchange":
			case "popstate":
			case "select":
			case "selectstart": return 2;
			case "drag":
			case "dragenter":
			case "dragexit":
			case "dragleave":
			case "dragover":
			case "mousemove":
			case "mouseout":
			case "mouseover":
			case "pointermove":
			case "pointerout":
			case "pointerover":
			case "scroll":
			case "touchmove":
			case "wheel":
			case "mouseenter":
			case "mouseleave":
			case "pointerenter":
			case "pointerleave": return 8;
			case "message": switch (je()) {
				case Me: return 2;
				case Ne: return 8;
				case Pe:
				case Fe: return 32;
				case Ie: return 268435456;
				default: return 32;
			}
			default: return 32;
		}
	}
	var hp = !1, gp = null, _p = null, vp = null, yp = /* @__PURE__ */ new Map(), bp = /* @__PURE__ */ new Map(), xp = [], Sp = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");
	function Cp(e, t) {
		switch (e) {
			case "focusin":
			case "focusout":
				gp = null;
				break;
			case "dragenter":
			case "dragleave":
				_p = null;
				break;
			case "mouseover":
			case "mouseout":
				vp = null;
				break;
			case "pointerover":
			case "pointerout":
				yp.delete(t.pointerId);
				break;
			case "gotpointercapture":
			case "lostpointercapture": bp.delete(t.pointerId);
		}
	}
	function wp(e, t, n, r, i, a) {
		return e === null || e.nativeEvent !== a ? (e = {
			blockedOn: t,
			domEventName: n,
			eventSystemFlags: r,
			nativeEvent: a,
			targetContainers: [i]
		}, t !== null && (t = gt(t), t !== null && ap(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, i !== null && t.indexOf(i) === -1 && t.push(i), e);
	}
	function Tp(e, t, n, r, i) {
		switch (t) {
			case "focusin": return gp = wp(gp, e, t, n, r, i), !0;
			case "dragenter": return _p = wp(_p, e, t, n, r, i), !0;
			case "mouseover": return vp = wp(vp, e, t, n, r, i), !0;
			case "pointerover":
				var a = i.pointerId;
				return yp.set(a, wp(yp.get(a) || null, e, t, n, r, i)), !0;
			case "gotpointercapture": return a = i.pointerId, bp.set(a, wp(bp.get(a) || null, e, t, n, r, i)), !0;
		}
		return !1;
	}
	function Ep(e) {
		var t = ht(e.target);
		if (t !== null) {
			var n = l(t);
			if (n !== null) {
				if (t = n.tag, t === 13) {
					if (t = u(n), t !== null) {
						e.blockedOn = t, ot(e.priority, function() {
							op(n);
						});
						return;
					}
				} else if (t === 31) {
					if (t = d(n), t !== null) {
						e.blockedOn = t, ot(e.priority, function() {
							op(n);
						});
						return;
					}
				} else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
					e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
					return;
				}
			}
		}
		e.blockedOn = null;
	}
	function Dp(e) {
		if (e.blockedOn !== null) return !1;
		for (var t = e.targetContainers; 0 < t.length;) {
			var n = dp(e.nativeEvent);
			if (n === null) {
				n = e.nativeEvent;
				var r = new n.constructor(n.type, n);
				$t = r, n.target.dispatchEvent(r), $t = null;
			} else return t = gt(n), t !== null && ap(t), e.blockedOn = n, !1;
			t.shift();
		}
		return !0;
	}
	function Op(e, t, n) {
		Dp(e) && n.delete(t);
	}
	function kp() {
		hp = !1, gp !== null && Dp(gp) && (gp = null), _p !== null && Dp(_p) && (_p = null), vp !== null && Dp(vp) && (vp = null), yp.forEach(Op), bp.forEach(Op);
	}
	function Ap(e, n) {
		e.blockedOn === n && (e.blockedOn = null, hp || (hp = !0, t.unstable_scheduleCallback(t.unstable_NormalPriority, kp)));
	}
	var jp = null;
	function Mp(e) {
		jp !== e && (jp = e, t.unstable_scheduleCallback(t.unstable_NormalPriority, function() {
			jp === e && (jp = null);
			for (var t = 0; t < e.length; t += 3) {
				var n = e[t], r = e[t + 1], i = e[t + 2];
				if (typeof r != "function") {
					if (pp(r || n) === null) continue;
					break;
				}
				var a = gt(n);
				a !== null && (e.splice(t, 3), t -= 3, ws(a, {
					pending: !0,
					data: i,
					method: n.method,
					action: r
				}, r, i));
			}
		}));
	}
	function Np(e) {
		function t(t) {
			return Ap(t, e);
		}
		gp !== null && Ap(gp, e), _p !== null && Ap(_p, e), vp !== null && Ap(vp, e), yp.forEach(t), bp.forEach(t);
		for (var n = 0; n < xp.length; n++) {
			var r = xp[n];
			r.blockedOn === e && (r.blockedOn = null);
		}
		for (; 0 < xp.length && (n = xp[0], n.blockedOn === null);) Ep(n), n.blockedOn === null && xp.shift();
		if (n = (e.ownerDocument || e).$$reactFormReplay, n != null) for (r = 0; r < n.length; r += 3) {
			var i = n[r], a = n[r + 1], o = i[R] || null;
			if (typeof a == "function") o || Mp(n);
			else if (o) {
				var s = null;
				if (a && a.hasAttribute("formAction")) {
					if (i = a, o = a[R] || null) s = o.formAction;
					else if (pp(i) !== null) continue;
				} else s = o.action;
				typeof s == "function" ? n[r + 1] = s : (n.splice(r, 3), r -= 3), Mp(n);
			}
		}
	}
	function Pp() {
		function e(e) {
			e.canIntercept && e.info === "react-transition" && e.intercept({
				handler: function() {
					return new Promise(function(e) {
						return i = e;
					});
				},
				focusReset: "manual",
				scroll: "manual"
			});
		}
		function t() {
			i !== null && (i(), i = null), r || setTimeout(n, 20);
		}
		function n() {
			if (!r && !navigation.transition) {
				var e = navigation.currentEntry;
				e && e.url != null && navigation.navigate(e.url, {
					state: e.getState(),
					info: "react-transition",
					history: "replace"
				});
			}
		}
		if (typeof navigation == "object") {
			var r = !1, i = null;
			return navigation.addEventListener("navigate", e), navigation.addEventListener("navigatesuccess", t), navigation.addEventListener("navigateerror", t), setTimeout(n, 100), function() {
				r = !0, navigation.removeEventListener("navigate", e), navigation.removeEventListener("navigatesuccess", t), navigation.removeEventListener("navigateerror", t), i !== null && (i(), i = null);
			};
		}
	}
	function Fp(e) {
		this._internalRoot = e;
	}
	Ip.prototype.render = Fp.prototype.render = function(e) {
		var t = this._internalRoot;
		if (t === null) throw Error(s(409));
		var n = t.current;
		np(n, pu(), e, t, null, null);
	}, Ip.prototype.unmount = Fp.prototype.unmount = function() {
		var e = this._internalRoot;
		if (e !== null) {
			this._internalRoot = null;
			var t = e.containerInfo;
			np(e.current, 2, null, e, null, null), bu(), t[ct] = null;
		}
	};
	function Ip(e) {
		this._internalRoot = e;
	}
	Ip.prototype.unstable_scheduleHydration = function(e) {
		if (e) {
			var t = at();
			e = {
				blockedOn: null,
				target: e,
				priority: t
			};
			for (var n = 0; n < xp.length && t !== 0 && t < xp[n].priority; n++);
			xp.splice(n, 0, e), n === 0 && Ep(e);
		}
	};
	var Lp = r.version;
	if (Lp !== "19.2.8") throw Error(s(527, Lp, "19.2.8"));
	A.findDOMNode = function(e) {
		var t = e._reactInternals;
		if (t === void 0) throw typeof e.render == "function" ? Error(s(188)) : (e = Object.keys(e).join(","), Error(s(268, e)));
		return e = p(t), e = e === null ? null : m(e), e = e === null ? null : e.stateNode, e;
	};
	var Rp = {
		bundleType: 0,
		version: "19.2.8",
		rendererPackageName: "react-dom",
		currentDispatcherRef: k,
		reconcilerVersion: "19.2.8"
	};
	if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
		var zp = __REACT_DEVTOOLS_GLOBAL_HOOK__;
		if (!zp.isDisabled && zp.supportsFiber) try {
			ze = zp.inject(Rp), Be = zp;
		} catch {}
	}
	e.createRoot = function(e, t) {
		if (!c(e)) throw Error(s(299));
		var n = !1, r = "", i = qs, a = Js, o = Ys;
		return t != null && (!0 === t.unstable_strictMode && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onUncaughtError !== void 0 && (i = t.onUncaughtError), t.onCaughtError !== void 0 && (a = t.onCaughtError), t.onRecoverableError !== void 0 && (o = t.onRecoverableError)), t = ep(e, 1, !1, null, null, n, r, null, i, a, o, Pp), e[ct] = t.current, Sd(e), new Fp(t);
	};
})), c = /* @__PURE__ */ e(((e, t) => {
	function n() {
		if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function")) try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
		} catch (e) {
			console.error(e);
		}
	}
	n(), t.exports = s();
})), l = n(), u = c();
function d(e, t) {
	let n = e.normalize("NFC").replace(/[. ]+$/g, "") || "qrcode";
	/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(n) && (n = `qr-${n}`);
	let r = n, i = 2;
	for (; t.has(r.toLowerCase());) r = `${n}-${i++}`;
	return t.add(r.toLowerCase()), r;
}
//#endregion
//#region apps/qr-studio/src/utils/riskHeatmap.ts
function f(e, t) {
	let n = e.moduleCount, r = [], i = v(n, t), a = g(n), o = y(t);
	for (let t = 0; t < n; t += 1) for (let s = 0; s < n; s += 1) {
		let c = e.modules[t * n + s] === 1;
		i && s >= i.start && s < i.end && t >= i.start && t < i.end ? r.push({
			x: s,
			y: t,
			risk: i.risk,
			reason: "Logo coverage"
		}) : m(s, t, n) ? r.push({
			x: s,
			y: t,
			risk: "critical",
			reason: "Finder pattern"
		}) : _(s, t, n, a) ? r.push({
			x: s,
			y: t,
			risk: "critical",
			reason: "Alignment pattern"
		}) : h(s, t, n) ? r.push({
			x: s,
			y: t,
			risk: "caution",
			reason: "Timing or format data"
		}) : c && r.push({
			x: s,
			y: t,
			risk: o,
			reason: o === "low" ? "Data module" : "Styled data module"
		});
	}
	return r;
}
function p(e, t, n) {
	if (t.angle === 0) return e;
	let r = new Map(e.map((e) => [`${e.x}-${e.y}`, e]));
	for (let e = 0; e < n; e += 1) for (let i = 0; i < n; i += 1) {
		let a = t.moduleRisks[e * n + i];
		if (a === "low") continue;
		let o = `${i}-${e}`, s = r.get(o);
		if (!s) {
			r.set(o, {
				x: i,
				y: e,
				risk: a,
				reason: b(a)
			});
			continue;
		}
		x(a) > x(s.risk) && (s.risk = a), s.reason = `${s.reason}; ${b(a).toLowerCase()}`;
	}
	return [...r.values()].sort((e, t) => e.y - t.y || e.x - t.x);
}
function m(e, t, n) {
	return e < 7 && t < 7 || e >= n - 7 && t < 7 || e < 7 && t >= n - 7;
}
function h(e, t, n) {
	let r = e === 6 && t >= 8 && t < n - 8 || t === 6 && e >= 8 && e < n - 8, i = e === 8 && (t < 9 || t >= n - 8) || t === 8 && (e < 9 || e >= n - 8);
	return r || i;
}
function g(e) {
	let t = Math.round((e - 17) / 4);
	if (t <= 1) return [];
	let n = Math.floor(t / 7) + 2, r = t === 32 ? 26 : Math.ceil((t * 4 + n * 2 + 1) / (n * 2 - 2)) * 2, i = [6];
	for (let t = n - 2; t >= 0; --t) i.push(e - 7 - t * r);
	return i;
}
function _(e, t, n, r) {
	return r.some((i) => r.some((r) => i === 6 && r === 6 || i === 6 && r === n - 7 || i === n - 7 && r === 6 ? !1 : Math.abs(e - i) <= 2 && Math.abs(t - r) <= 2));
}
function v(e, t) {
	if (!t.logoDataUrl) return null;
	let n = t.logoSafeMode ? .2 : .3, r = Math.max(3, Math.round(e * Math.min(n, Math.max(.08, t.logoSize)))), i = Math.floor((e - r) / 2);
	return {
		start: i,
		end: i + r,
		risk: !t.logoSafeMode || t.logoSize > .2 ? "critical" : "caution"
	};
}
function y(e) {
	return e.artistic || e.moduleScale < .7 ? "critical" : e.moduleScale < .9 || e.noise || e.texture || e.glow || e.patternPreset === "tech" ? "caution" : "low";
}
function b(e) {
	return e === "critical" ? "Critical camera-perspective compression" : "Camera-perspective compression";
}
function x(e) {
	return e === "critical" ? 2 : +(e === "caution");
}
var S = [
	"Segoe UI",
	"Georgia",
	"Courier New",
	"Trebuchet MS",
	"Impact"
], C = [
	"regular",
	"medium",
	"semibold",
	"bold"
], w = [
	"circle",
	"rounded-square",
	"squircle",
	"capsule"
];
function T(e) {
	let t = [], n = (typeof e.text == "string" ? e.text : "").toUpperCase(), r = [...n].filter((e) => /^[A-Z0-9 ._-]$/.test(e)).join("").replace(/\s+/g, " ").trimStart();
	r !== n && t.push("Only A-Z, 0-9, spaces, period, dash, and underscore are allowed.");
	let i = r.slice(0, 12);
	r.length > 12 && t.push("Text was limited to 12 characters."), i.length > 8 && t.push("Long text may reduce clarity.");
	let a = ie(e.fontSize, 24), o = ae(a, 10, 128);
	o !== a && t.push("Font size was limited to 10–128px.");
	let s = ie(e.padding, .15), c = ae(s, .1, .2);
	c !== s && t.push("Padding was limited to 10%–20%.");
	let l = re(e.backgroundColor) ? e.backgroundColor : "#000000", u = S.includes(e.fontFamily) ? e.fontFamily : "Segoe UI", d = C.includes(e.fontWeight) ? e.fontWeight : "bold", f = w.includes(e.backgroundShape) ? e.backgroundShape : "rounded-square", p = e.autoContrast !== !1, m = re(e.color) ? e.color : D(l);
	return {
		settings: {
			text: i,
			fontFamily: u,
			fontWeight: d,
			fontSize: o,
			color: p ? D(l) : m,
			backgroundShape: f,
			backgroundColor: l,
			padding: c,
			autoContrast: p,
			centered: !0
		},
		warnings: [...new Set(t)]
	};
}
function E(e) {
	let t = T(e);
	if (typeof document > "u") return {
		...t,
		dataUrl: ""
	};
	let n = document.createElement("canvas");
	n.width = 512, n.height = 512;
	let r = n.getContext("2d");
	if (!r) return {
		...t,
		dataUrl: ""
	};
	r.scale(2, 2), te(r, t.settings.backgroundShape, t.settings.backgroundColor);
	let i = 256 * (1 - t.settings.padding * 2), a = ne(t.settings.fontFamily), o = O(t.settings.fontWeight), s = t.settings.fontSize;
	r.font = `${o} ${s}px ${a}`;
	let c = r.measureText(t.settings.text || " ").width;
	return c > i && (s = Math.max(10, s * i / c)), s < t.settings.fontSize && t.warnings.push("Font size was reduced so the text stays inside the safe logo zone."), r.font = `${o} ${s}px ${a}`, r.fillStyle = t.settings.color, r.textAlign = "center", r.textBaseline = "middle", r.fillText(t.settings.text, 256 / 2, 256 / 2, i), {
		...t,
		warnings: [...new Set(t.warnings)],
		dataUrl: n.toDataURL("image/png")
	};
}
function ee(e) {
	return e === "rounded-square" ? "rounded" : e;
}
function D(e) {
	let t = e.replace("#", ""), n = Number.parseInt(t.slice(0, 2), 16) || 0, r = Number.parseInt(t.slice(2, 4), 16) || 0, i = Number.parseInt(t.slice(4, 6), 16) || 0;
	return (n * 299 + r * 587 + i * 114) / 1e3 >= 145 ? "#000000" : "#FFFFFF";
}
function te(e, t, n) {
	if (e.fillStyle = n, e.beginPath(), t === "circle") e.arc(256 / 2, 256 / 2, 256 / 2, 0, Math.PI * 2);
	else if (t === "capsule") {
		let t = 143.36;
		e.roundRect(0, 112.63999999999999 / 2, 256, t, t / 2);
	} else {
		let n = t === "squircle" ? 97.28 : 51.2;
		e.roundRect(0, 0, 256, 256, n);
	}
	e.fill();
}
function ne(e) {
	return e === "Georgia" ? "Georgia, serif" : e === "Courier New" ? "\"Courier New\", monospace" : e === "Trebuchet MS" ? "\"Trebuchet MS\", sans-serif" : e === "Impact" ? "Impact, Haettenschweiler, sans-serif" : "\"Segoe UI\", sans-serif";
}
function O(e) {
	return {
		regular: 400,
		medium: 500,
		semibold: 600,
		bold: 700
	}[e];
}
function re(e) {
	return typeof e == "string" && /^#[0-9A-F]{6}$/i.test(e);
}
function ie(e, t) {
	return typeof e == "number" && Number.isFinite(e) ? e : t;
}
function ae(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
//#endregion
//#region apps/qr-studio/src/utils/frame.ts
var oe = [
	"rectangle",
	"rounded-rectangle",
	"squircle",
	"capsule",
	"circle",
	"outline",
	"thick-border",
	"glow",
	"shadow",
	"gradient-border",
	"pattern-border",
	"arrow-left",
	"arrow-right",
	"arrow-down",
	"camera",
	"phone",
	"tap-icon"
], k = [
	"Segoe UI",
	"Georgia",
	"Courier New",
	"Trebuchet MS",
	"Impact"
], A = [
	"regular",
	"medium",
	"semibold",
	"bold"
], se = [
	"none",
	"dots",
	"stripes",
	"waves",
	"mesh",
	"grid"
], j = [
	"linear",
	"radial",
	"conic"
], ce = [
	"top-bottom",
	"left-right",
	"diagonal"
], le = [
	{
		id: "scan-me",
		label: "SCAN ME",
		patch: {
			text: "SCAN ME",
			style: "rounded-rectangle",
			color: "#111827"
		}
	},
	{
		id: "open",
		label: "OPEN",
		patch: {
			text: "OPEN",
			style: "outline",
			color: "#166534"
		}
	},
	{
		id: "menu",
		label: "MENU",
		patch: {
			text: "MENU",
			style: "capsule",
			color: "#7c2d12"
		}
	},
	{
		id: "wifi",
		label: "WIFI",
		patch: {
			text: "WIFI",
			style: "gradient-border",
			gradient: {
				enabled: !0,
				type: "linear",
				direction: "left-right",
				stops: ["#2563eb", "#06b6d4"]
			}
		}
	},
	{
		id: "pay",
		label: "PAY",
		patch: {
			text: "PAY",
			style: "thick-border",
			color: "#166534"
		}
	},
	{
		id: "join",
		label: "JOIN",
		patch: {
			text: "JOIN",
			style: "arrow-right",
			color: "#7c3aed"
		}
	}
];
function M(e) {
	let t = [], n = (typeof e.text == "string" ? e.text : "").toUpperCase(), r = [...n].filter((e) => /^[A-Z0-9 ._-]$/.test(e)).join("").replace(/\s+/g, " ").trimStart();
	r !== n && t.push("Frame text allows only A-Z, 0-9, spaces, period, dash, and underscore.");
	let i = r.slice(0, 12);
	r.length > 12 && t.push("Frame text was limited to 12 characters."), i.length > 8 && t.push("Long frame text may reduce clarity.");
	let a = pe(e.color) ? e.color : "#000000", o = (e.gradient?.stops ?? []).filter(pe).slice(0, 6);
	for (; o.length < 2;) o.push(o.length ? a : "#16a34a");
	let s = {
		enabled: !!e.gradient?.enabled,
		type: ge(j, e.gradient?.type) ? e.gradient.type : "linear",
		direction: ge(ce, e.gradient?.direction) ? e.gradient.direction : "top-bottom",
		stops: o
	}, c = s.enabled ? de(s.stops) : a, l = e.autoContrast !== !1, u = pe(e.textColor) ? e.textColor : D(c), d = l ? D(c) : u, f = me(e.thickness, .08), p = me(e.padding, .12), m = me(e.cornerRadius, .25), h = me(e.textSize, 18), g = me(e.patternOpacity, .2), _ = he(f, .02, .15), v = he(p, .06, .12), y = he(m, 0, .5), b = he(h, 10, 40), x = he(g, .1, .4);
	return _ !== f && t.push("Frame thickness was limited to 2%-15%."), v !== p && t.push("Frame padding was limited to 6%-12%."), y !== m && t.push("Frame corner radius was limited to 50%."), b !== h && t.push("Frame text size was limited to 10-40px."), x !== g && t.push("Pattern opacity was limited to 10%-40%."), {
		settings: {
			enabled: !!e.enabled,
			style: oe.includes(e.style) ? e.style : "rounded-rectangle",
			thickness: _,
			color: a,
			gradient: s,
			cornerRadius: y,
			padding: v,
			text: i,
			textFont: k.includes(e.textFont ?? "") ? e.textFont : "Segoe UI",
			textWeight: ge(A, e.textWeight) ? e.textWeight : "bold",
			textColor: d,
			textSize: b,
			autoContrast: l,
			pattern: ge(se, e.pattern) ? e.pattern : "none",
			patternOpacity: x,
			preset: typeof e.preset == "string" ? e.preset : null
		},
		warnings: [...new Set(t)]
	};
}
function N(e, t) {
	if (!t.enabled) return 0;
	let n = he(Math.round(e * t.padding), 2, 8), r = e * t.thickness, i = t.text ? he(t.textSize / 10, 1, 4) : 0, a = t.text || ue(t.style) ? Math.max(r * 2.5, i / .4) : r;
	return Math.ceil(n + Math.max(r / 2, a / 2) + 1);
}
function ue(e) {
	return [
		"arrow-left",
		"arrow-right",
		"arrow-down",
		"camera",
		"phone",
		"tap-icon"
	].includes(e);
}
function de(e) {
	return [...e].sort((e, t) => fe(e) - fe(t))[0] ?? "#000000";
}
function fe(e) {
	let t = e.slice(1);
	return Number.parseInt(t.slice(0, 2), 16) * 299 + Number.parseInt(t.slice(2, 4), 16) * 587 + Number.parseInt(t.slice(4, 6), 16) * 114;
}
function pe(e) {
	return typeof e == "string" && /^#[0-9A-F]{6}$/i.test(e);
}
function me(e, t) {
	return typeof e == "number" && Number.isFinite(e) ? e : t;
}
function he(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function ge(e, t) {
	return typeof t == "string" && e.includes(t);
}
//#endregion
//#region apps/qr-studio/src/utils/previewDiagnostics.ts
var _e = 2.05;
function ve(e, t, n, r = 900 / _e) {
	let i = Math.round(-n * 18) / 100, a = Math.round(r * _e * 100) / 100;
	return `translate(${e.x}px, ${e.y}px) perspective(${a}px) rotateX(${i}deg) rotateY(${n}deg) scale(${t})`;
}
function ye(e, t) {
	let n = Ne(t, 0, 55), r = e.moduleCount, i = 1 / r, a = [], o = [];
	for (let e = 0; e < r; e += 1) for (let t = 0; t < r; t += 1) {
		let s = [
			be(t / r, e / r, n),
			be((t + 1) / r, e / r, n),
			be((t + 1) / r, (e + 1) / r, n),
			be(t / r, (e + 1) / r, n)
		], c = [
			Oe(s[0], s[1]),
			Oe(s[1], s[2]),
			Oe(s[2], s[3]),
			Oe(s[3], s[0])
		].map((e) => e / i), l = Math.min(...c), u = ke(s) / (i * i);
		a.push({
			minimumScale: l,
			areaScale: u
		}), o.push(l < .52 || u < .42 ? "critical" : l < .76 || u < .68 ? "caution" : "low");
	}
	let s = a.map((e) => e.minimumScale).sort((e, t) => e - t), c = a.map((e) => e.areaScale).sort((e, t) => e - t), l = s[0] ?? 1, u = Ae(s, .1), d = Ae(c, .1), f = n === 0 ? 0 : Math.round(Math.max(0, 1 - u) * 38 + Math.max(0, .76 - l) * 38 + Math.max(0, .72 - d) * 22), p = Ne(e.reliabilityScore - f, 0, 100), m = [];
	return n >= 18 && m.push("Move the camera closer to square-on so the far-side modules remain large enough to resolve."), o.includes("critical") ? m.push("The simulated camera angle critically compresses modules along the far edge.") : o.includes("caution") && m.push("Perspective compression is reducing module separation along the far edge."), {
		angle: n,
		score: p,
		label: je(p),
		penalty: f,
		minimumScale: l,
		tenthPercentileScale: u,
		moduleRisks: o,
		suggestions: m
	};
}
function be(e, t, n) {
	let r = Me(Ne(n, 0, 55)), i = Me(-Ne(n, 0, 55) * .18), a = e - .5, o = t - .5, s = a * Math.cos(r), c = -a * Math.sin(r), l = o * Math.cos(i) - c * Math.sin(i), u = _e / (_e - (o * Math.sin(i) + c * Math.cos(i)));
	return {
		x: s * u + .5,
		y: l * u + .5
	};
}
var xe = {
	medium: .15,
	quartile: .25,
	high: .3
};
function Se(e) {
	let t = e.moduleCount, n = t + 8, r = [];
	for (let n = 0; n < t; n += 1) for (let i = 0; i < t; i += 1) e.modules[n * t + i] === 1 && r.push(`M${i + 4} ${n + 4}h1v1h-1z`);
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" role="img" aria-label="Raw unstyled QR code"><rect width="${n}" height="${n}" fill="#fff"/><path d="${r.join("")}" fill="#000" shape-rendering="crispEdges"/></svg>`;
}
function Ce(e) {
	let t = [];
	return e.transparent && t.push("The transparent background can reveal artwork behind the quiet zone."), e.gradientType !== "none" && e.gradientTarget === "quiet-zone" && t.push("A gradient is applied inside the quiet zone."), (e.noise || e.texture) && t.push("Texture or noise can add marks inside the quiet zone."), e.artistic && t.push("Artistic masking can reduce quiet-zone separation."), (e.glow || e.dropShadow) && t.push("Glow or shadow may spill into the quiet zone."), {
		violated: t.length > 0,
		reasons: t
	};
}
function we(e, t) {
	let n = e.moduleCount, r = Te(n), i = Ee(n, r), a = Math.round(i.length * xe[t]), o = Math.max(0, i.length - a), s = new Set(i.slice(o).map(({ x: e, y: t }) => `${e}-${t}`)), c = [];
	for (let e = 0; e < n; e += 1) for (let t = 0; t < n; t += 1) {
		let i = e * n + t;
		c.push({
			x: t,
			y: e,
			kind: r[i] ? "function" : s.has(`${t}-${e}`) ? "correction" : "data"
		});
	}
	return c;
}
function Te(e) {
	let t = Array(e * e).fill(!1), n = (n, r) => {
		n >= 0 && r >= 0 && n < e && r < e && (t[r * e + n] = !0);
	}, r = (e, t, r, i) => {
		for (let a = t; a < t + i; a += 1) for (let t = e; t < e + r; t += 1) n(t, a);
	};
	r(0, 0, 9, 9), r(e - 8, 0, 8, 9), r(0, e - 8, 9, 8);
	for (let t = 0; t < e; t += 1) n(6, t), n(t, 6);
	for (let t of De(e)) for (let n of De(e)) n <= 8 && t <= 8 || n >= e - 8 && t <= 8 || n <= 8 && t >= e - 8 || r(n - 2, t - 2, 5, 5);
	for (let e = 0; e <= 8; e += 1) n(8, e), n(e, 8);
	for (let t = e - 8; t < e; t += 1) n(t, 8);
	for (let t = e - 7; t < e; t += 1) n(8, t);
	return n(8, e - 8), Math.round((e - 17) / 4) >= 7 && (r(e - 11, 0, 3, 6), r(0, e - 11, 6, 3)), t;
}
function Ee(e, t) {
	let n = [], r = !0;
	for (let i = e - 1; i > 0; i -= 2) {
		i === 6 && --i;
		for (let a = 0; a < e; a += 1) {
			let o = r ? e - 1 - a : a;
			for (let r = 0; r < 2; r += 1) {
				let a = i - r;
				t[o * e + a] || n.push({
					x: a,
					y: o
				});
			}
		}
		r = !r;
	}
	return n;
}
function De(e) {
	let t = Math.round((e - 17) / 4);
	if (t <= 1) return [];
	let n = Math.floor(t / 7) + 2, r = t === 32 ? 26 : Math.ceil((t * 4 + n * 2 + 1) / (n * 2 - 2)) * 2, i = [6];
	for (let t = n - 2; t >= 0; --t) i.push(e - 7 - t * r);
	return i;
}
function Oe(e, t) {
	return Math.hypot(t.x - e.x, t.y - e.y);
}
function ke(e) {
	let t = 0;
	for (let n = 0; n < e.length; n += 1) {
		let r = e[n], i = e[(n + 1) % e.length];
		t += r.x * i.y - i.x * r.y;
	}
	return Math.abs(t) / 2;
}
function Ae(e, t) {
	return e.length ? e[Math.min(e.length - 1, Math.max(0, Math.floor(e.length * t)))] : 1;
}
function je(e) {
	return e >= 85 ? "Excellent" : e >= 70 ? "Good" : e >= 50 ? "Fair" : "At risk";
}
function Me(e) {
	return e * Math.PI / 180;
}
function Ne(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
//#endregion
//#region apps/qr-studio/src/utils/previewPan.ts
var Pe = .55, Fe = 3.4, Ie = .15;
function Le(e, t) {
	return Be(Math.round((e + Ie * t) * 100) / 100, Pe, Fe);
}
function Re(e) {
	return e >= 3.4 ? Pe : Fe;
}
function ze(e, t) {
	if (t.zoom <= 1) return {
		x: 0,
		y: 0
	};
	let n = Math.max(24, (t.frameWidth * t.zoom - t.stageWidth) / 2 + 24), r = Math.max(24, (t.frameHeight * t.zoom - t.stageHeight) / 2 + 24);
	return {
		x: Be(e.x, -n, n),
		y: Be(e.y, -r, r)
	};
}
function Be(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
//#endregion
//#region node_modules/react/cjs/react-jsx-runtime.production.js
var Ve = /* @__PURE__ */ e(((e) => {
	var t = Symbol.for("react.transitional.element"), n = Symbol.for("react.fragment");
	function r(e, n, r) {
		var i = null;
		if (r !== void 0 && (i = "" + r), n.key !== void 0 && (i = "" + n.key), "key" in n) for (var a in r = {}, n) a !== "key" && (r[a] = n[a]);
		else r = n;
		return n = r.ref, {
			$$typeof: t,
			type: e,
			key: i,
			ref: n === void 0 ? null : n,
			props: r
		};
	}
	e.Fragment = n, e.jsx = r, e.jsxs = r;
})), P = (/* @__PURE__ */ e(((e, t) => {
	t.exports = Ve();
})))();
function He(e) {
	let [t, n] = (0, l.useState)(!1), [r, i] = (0, l.useState)(!1), [a, o] = (0, l.useState)(!1), [s, c] = (0, l.useState)("styled"), [u, d] = (0, l.useState)(0), [m, h] = (0, l.useState)(900 / 2.05), [g, _] = (0, l.useState)({
		x: 0,
		y: 0
	}), [v, y] = (0, l.useState)(!1), b = (0, l.useRef)(null), x = (0, l.useRef)(null), S = (0, l.useRef)({
		pointerX: 0,
		pointerY: 0,
		panX: 0,
		panY: 0
	}), C = (0, l.useRef)({
		pointerId: -1,
		startedAt: 0,
		startX: 0,
		startY: 0,
		moved: !1
	}), w = (0, l.useRef)({
		occurredAt: 0,
		x: 0,
		y: 0
	}), T = (0, l.useRef)(e.zoom), E = (0, l.useRef)(e.result?.svg), ee = (0, l.useRef)(e.onZoomChange), D = e.result?.moduleCount ?? 21, te = D + 8, ne = s === "styled" ? N(D, e.style.frame) : 0, O = te + ne * 2, re = (0, l.useMemo)(() => e.result ? ye(e.result, u) : null, [e.result, u]), ie = (0, l.useMemo)(() => {
		if (!e.result) return [];
		let t = f(e.result, e.style);
		return re ? p(t, re, e.result.moduleCount) : t;
	}, [
		e.result,
		e.style,
		re
	]), ae = (0, l.useMemo)(() => e.result ? Se(e.result) : "", [e.result]), oe = (0, l.useMemo)(() => e.result ? we(e.result, e.errorCorrection) : [], [e.result, e.errorCorrection]), k = (0, l.useMemo)(() => Ce(e.style), [e.style]), A = s === "raw" ? ae : e.result?.svg ?? "", se = e.errorCorrection === "high" ? "H · about 30% recovery" : e.errorCorrection === "quartile" ? "Q · about 25% recovery" : "M · about 15% recovery", j = re?.score ?? 0, ce = j >= 85 ? "excellent" : j >= 70 ? "good" : j >= 50 ? "warning" : "risk", le = e.zoom > 1 && !!e.result?.svg;
	E.current = e.result?.svg, ee.current = e.onZoomChange;
	let M = (t) => {
		let n = b.current, r = x.current;
		return !n || !r ? e.zoom <= 1 ? {
			x: 0,
			y: 0
		} : t : ze(t, {
			zoom: e.zoom,
			stageWidth: n.clientWidth,
			stageHeight: n.clientHeight,
			frameWidth: r.offsetWidth,
			frameHeight: r.offsetHeight
		});
	};
	return (0, l.useEffect)(() => {
		T.current = e.zoom, _((e) => M(e)), e.zoom <= 1 && y(!1);
	}, [e.zoom, e.result?.svg]), (0, l.useEffect)(() => {
		let e = b.current;
		if (!e) return;
		let t = (e) => {
			if (!E.current || e.deltaY === 0) return;
			e.preventDefault();
			let t = Le(T.current, e.deltaY < 0 ? 1 : -1);
			t !== T.current && (T.current = t, ee.current(t));
		};
		return e.addEventListener("wheel", t, { passive: !1 }), () => e.removeEventListener("wheel", t);
	}, []), (0, l.useEffect)(() => {
		let e = x.current;
		if (!e || typeof ResizeObserver > "u") return;
		let t = () => h(e.offsetWidth || 900 / 2.05);
		t();
		let n = new ResizeObserver(t);
		return n.observe(e), () => n.disconnect();
	}, [e.result?.svg]), /* @__PURE__ */ (0, P.jsxs)("section", {
		className: `qr-preview-pane simulation-${e.simulation}`,
		"aria-label": "Live QR preview",
		children: [
			/* @__PURE__ */ (0, P.jsxs)("header", {
				className: "qr-preview-toolbar",
				children: [/* @__PURE__ */ (0, P.jsxs)("div", { children: [/* @__PURE__ */ (0, P.jsx)("strong", { children: "Live preview" }), /* @__PURE__ */ (0, P.jsx)("span", { children: e.engineStatus })] }), /* @__PURE__ */ (0, P.jsxs)("div", {
					className: "qr-preview-controls",
					children: [
						/* @__PURE__ */ (0, P.jsx)("button", {
							type: "button",
							"aria-label": "Zoom out",
							disabled: e.zoom <= Pe,
							onClick: () => e.onZoomChange(Le(e.zoom, -1)),
							children: "−"
						}),
						/* @__PURE__ */ (0, P.jsxs)("output", { children: [Math.round(e.zoom * 100), "%"] }),
						/* @__PURE__ */ (0, P.jsx)("button", {
							type: "button",
							"aria-label": "Zoom in",
							disabled: e.zoom >= Fe,
							onClick: () => e.onZoomChange(Le(e.zoom, 1)),
							children: "+"
						}),
						/* @__PURE__ */ (0, P.jsx)("button", {
							type: "button",
							className: e.showGrid ? "active" : "",
							"aria-pressed": e.showGrid,
							title: "Overlay QR module boundaries",
							onClick: () => e.onGridChange(!e.showGrid),
							children: "Grid"
						}),
						/* @__PURE__ */ (0, P.jsx)("button", {
							type: "button",
							onClick: () => e.onSimulationChange(e.simulation === "light" ? "dark" : "light"),
							children: e.simulation === "light" ? "Dark scene" : "Light scene"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, P.jsx)("div", {
				ref: b,
				className: `qr-preview-stage ${e.style.transparent ? "is-transparent" : ""} ${e.showGrid ? "show-grid" : ""} ${le ? "pannable" : ""} ${v ? "dragging" : ""}`,
				title: le ? "Use the mouse wheel to zoom. Click and drag to pan. Double-click to zoom all the way out." : "Use the mouse wheel to zoom. Double-click to zoom all the way in.",
				onPointerDown: (t) => {
					!e.result?.svg || t.button !== 0 || (t.preventDefault(), C.current = {
						pointerId: t.pointerId,
						startedAt: t.timeStamp,
						startX: t.clientX,
						startY: t.clientY,
						moved: !1
					}, le && (t.currentTarget.setPointerCapture(t.pointerId), S.current = {
						pointerX: t.clientX,
						pointerY: t.clientY,
						panX: g.x,
						panY: g.y
					}, y(!0)));
				},
				onPointerMove: (e) => {
					C.current.pointerId === e.pointerId && (Math.hypot(e.clientX - C.current.startX, e.clientY - C.current.startY) <= 4 || (C.current.moved = !0, le && (e.preventDefault(), _(M({
						x: S.current.panX + e.clientX - S.current.pointerX,
						y: S.current.panY + e.clientY - S.current.pointerY
					})))));
				},
				onPointerUp: (t) => {
					if (C.current.pointerId !== t.pointerId) return;
					t.currentTarget.hasPointerCapture(t.pointerId) && t.currentTarget.releasePointerCapture(t.pointerId), y(!1);
					let n = C.current;
					if (C.current.pointerId = -1, n.moved || t.timeStamp - n.startedAt > 500) {
						w.current.occurredAt = 0;
						return;
					}
					let r = w.current, i = Math.hypot(t.clientX - r.x, t.clientY - r.y);
					if (r.occurredAt && t.timeStamp - r.occurredAt <= 450 && i <= 28) {
						w.current.occurredAt = 0, _({
							x: 0,
							y: 0
						}), e.onZoomChange(Re(e.zoom));
						return;
					}
					w.current = {
						occurredAt: t.timeStamp,
						x: t.clientX,
						y: t.clientY
					};
				},
				onPointerCancel: (e) => {
					e.currentTarget.hasPointerCapture(e.pointerId) && e.currentTarget.releasePointerCapture(e.pointerId), C.current.pointerId = -1, w.current.occurredAt = 0, y(!1);
				},
				children: e.result?.svg ? /* @__PURE__ */ (0, P.jsxs)("div", {
					ref: x,
					className: "qr-svg-frame",
					style: {
						transform: ve(g, e.zoom, u, m),
						"--qr-grid-count": te,
						"--qr-module-count": e.result.moduleCount,
						"--qr-grid-inset": `${ne * 100 / O}%`,
						"--qr-quiet-inset": `${(ne + 4) * 100 / O}%`,
						"--qr-quiet-size": `${400 / te}%`
					},
					children: [
						/* @__PURE__ */ (0, P.jsx)("div", {
							className: "qr-svg-content",
							dangerouslySetInnerHTML: { __html: A }
						}),
						e.showGrid && /* @__PURE__ */ (0, P.jsx)("div", {
							className: "qr-module-grid",
							"aria-hidden": "true"
						}),
						t && /* @__PURE__ */ (0, P.jsx)("div", {
							className: "qr-risk-heatmap",
							"aria-hidden": "true",
							children: ie.map((e) => /* @__PURE__ */ (0, P.jsx)("i", {
								className: e.risk,
								style: {
									gridColumn: e.x + 1,
									gridRow: e.y + 1
								},
								title: e.reason
							}, `${e.x}-${e.y}`))
						}),
						r && /* @__PURE__ */ (0, P.jsx)("div", {
							className: `qr-quiet-zone-overlay ${k.violated ? "violation" : "safe"}`,
							"aria-hidden": "true",
							children: /* @__PURE__ */ (0, P.jsx)("span", { children: k.violated ? "Potential violation" : "Clear 4-module margin" })
						}),
						a && /* @__PURE__ */ (0, P.jsx)("div", {
							className: "qr-error-correction-overlay",
							"aria-hidden": "true",
							children: oe.map((e) => /* @__PURE__ */ (0, P.jsx)("i", {
								className: e.kind,
								style: {
									gridColumn: e.x + 1,
									gridRow: e.y + 1
								}
							}, `${e.x}-${e.y}`))
						})
					]
				}) : /* @__PURE__ */ (0, P.jsxs)("div", {
					className: "qr-preview-empty",
					children: [
						/* @__PURE__ */ (0, P.jsx)("div", {
							className: "qr-empty-mark",
							children: "QR"
						}),
						/* @__PURE__ */ (0, P.jsx)("strong", { children: "Build your code" }),
						/* @__PURE__ */ (0, P.jsx)("p", { children: "Complete the Content tab to start the live preview." })
					]
				})
			}),
			le && /* @__PURE__ */ (0, P.jsx)("p", {
				className: "qr-pan-hint",
				children: "Use the mouse wheel to zoom. Click and drag the preview to move around."
			}),
			t && e.result && /* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-heatmap-legend",
				role: "status",
				children: [
					/* @__PURE__ */ (0, P.jsx)("strong", { children: "Risk heatmap" }),
					/* @__PURE__ */ (0, P.jsxs)("span", { children: [/* @__PURE__ */ (0, P.jsx)("i", { className: "critical" }), "Critical scan structures"] }),
					/* @__PURE__ */ (0, P.jsxs)("span", { children: [/* @__PURE__ */ (0, P.jsx)("i", { className: "caution" }), "Caution / logo coverage"] }),
					/* @__PURE__ */ (0, P.jsxs)("span", { children: [/* @__PURE__ */ (0, P.jsx)("i", { className: "low" }), "Normal data modules"] })
				]
			}),
			r && e.result && /* @__PURE__ */ (0, P.jsxs)("div", {
				className: `qr-diagnostic-message ${k.violated ? "violation" : "safe"}`,
				role: "status",
				children: [/* @__PURE__ */ (0, P.jsx)("strong", { children: k.violated ? "Quiet-zone warning" : "Quiet zone is clear" }), /* @__PURE__ */ (0, P.jsx)("span", { children: k.violated ? k.reasons.join(" ") : "The required four-module margin is clear in the current design." })]
			}),
			a && e.result && /* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-heatmap-legend qr-correction-legend",
				role: "status",
				children: [
					/* @__PURE__ */ (0, P.jsx)("strong", { children: se }),
					/* @__PURE__ */ (0, P.jsxs)("span", { children: [/* @__PURE__ */ (0, P.jsx)("i", { className: "function" }), "Function patterns"] }),
					/* @__PURE__ */ (0, P.jsxs)("span", { children: [/* @__PURE__ */ (0, P.jsx)("i", { className: "data" }), "Payload data"] }),
					/* @__PURE__ */ (0, P.jsxs)("span", { children: [/* @__PURE__ */ (0, P.jsx)("i", { className: "correction" }), "Recovery parity"] })
				]
			}),
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-reliability-card",
				children: [
					/* @__PURE__ */ (0, P.jsxs)("div", {
						className: "qr-reliability-heading",
						children: [/* @__PURE__ */ (0, P.jsxs)("span", { children: ["Scan reliability", u > 0 ? " · camera-adjusted" : ""] }), /* @__PURE__ */ (0, P.jsxs)("strong", {
							className: ce,
							children: [
								re?.label ?? "Waiting",
								" · ",
								j,
								"%"
							]
						})]
					}),
					/* @__PURE__ */ (0, P.jsx)("div", {
						className: "qr-score-track",
						children: /* @__PURE__ */ (0, P.jsx)("i", {
							className: ce,
							style: { width: `${j}%` }
						})
					}),
					re && u > 0 && /* @__PURE__ */ (0, P.jsxs)("p", {
						className: "qr-perspective-result",
						children: [
							re.penalty,
							" point camera-perspective penalty · weakest modules retain ",
							Math.round(re.minimumScale * 100),
							"% of their flat edge size."
						]
					}),
					[...e.result?.suggestions ?? [], ...re?.suggestions ?? []].length ? /* @__PURE__ */ (0, P.jsx)("ul", { children: [...e.result?.suggestions ?? [], ...re?.suggestions ?? []].map((e) => /* @__PURE__ */ (0, P.jsx)("li", { children: e }, e)) }) : null
				]
			}),
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-preview-download",
				children: [/* @__PURE__ */ (0, P.jsxs)("div", { children: [/* @__PURE__ */ (0, P.jsx)("strong", { children: "Make it yours. Take it anywhere." }), /* @__PURE__ */ (0, P.jsx)("span", { children: "PNG, SVG or PDF · Export settings on the left" })] }), /* @__PURE__ */ (0, P.jsxs)("button", {
					type: "button",
					disabled: !e.result,
					onClick: e.onDownload,
					children: ["Download QR code ", /* @__PURE__ */ (0, P.jsx)("span", {
						"aria-hidden": "true",
						children: "↗"
					})]
				})]
			}),
			/* @__PURE__ */ (0, P.jsxs)("details", {
				className: "qr-inspection",
				children: [/* @__PURE__ */ (0, P.jsxs)("summary", { children: ["Inspect scan reliability ", /* @__PURE__ */ (0, P.jsx)("span", { children: "Overlays & camera checks" })] }), /* @__PURE__ */ (0, P.jsxs)("div", {
					className: "qr-preview-analysis-controls",
					"aria-label": "Preview inspection controls",
					children: [
						/* @__PURE__ */ (0, P.jsxs)("div", {
							className: "qr-preview-mode",
							role: "group",
							"aria-label": "QR rendering mode",
							children: [/* @__PURE__ */ (0, P.jsx)("button", {
								type: "button",
								className: s === "raw" ? "active" : "",
								"aria-pressed": s === "raw",
								disabled: !e.result,
								onClick: () => c("raw"),
								children: "Raw"
							}), /* @__PURE__ */ (0, P.jsx)("button", {
								type: "button",
								className: s === "styled" ? "active" : "",
								"aria-pressed": s === "styled",
								disabled: !e.result,
								onClick: () => c("styled"),
								children: "Styled"
							})]
						}),
						/* @__PURE__ */ (0, P.jsxs)("label", {
							className: "qr-perspective-control",
							children: [/* @__PURE__ */ (0, P.jsxs)("span", { children: ["Camera perspective ", /* @__PURE__ */ (0, P.jsxs)("output", { children: [u, "°"] })] }), /* @__PURE__ */ (0, P.jsx)("input", {
								type: "range",
								min: "0",
								max: "55",
								step: "1",
								value: u,
								"aria-label": "Camera perspective distortion",
								disabled: !e.result,
								onInput: (e) => d(Number(e.currentTarget.value))
							})]
						}),
						/* @__PURE__ */ (0, P.jsx)("button", {
							type: "button",
							className: `${r ? "active" : ""} ${r && k.violated ? "violation" : ""}`,
							"aria-pressed": r,
							disabled: !e.result,
							onClick: () => i(!r),
							children: "Quiet zone"
						}),
						/* @__PURE__ */ (0, P.jsx)("button", {
							type: "button",
							className: a ? "active correction-active" : "",
							"aria-pressed": a,
							disabled: !e.result,
							onClick: () => {
								o(!a), a || n(!1);
							},
							children: "Error correction"
						}),
						/* @__PURE__ */ (0, P.jsx)("button", {
							type: "button",
							className: t ? "active heatmap-active" : "",
							"aria-pressed": t,
							disabled: !e.result,
							title: "Show scan-sensitive and risky QR areas",
							onClick: () => {
								n(!t), t || o(!1);
							},
							children: "Heatmap"
						})
					]
				})]
			})
		]
	});
}
//#endregion
//#region apps/qr-studio/src/components/BatchProgressDialog.tsx
function Ue({ progress: e }) {
	let t = (0, l.useRef)(null), n = Math.round(e.current / Math.max(e.total, 1) * 100);
	return (0, l.useEffect)(() => {
		let e = t.current;
		return e && !e.open && e.showModal(), () => {
			e?.open && e.close();
		};
	}, []), /* @__PURE__ */ (0, P.jsxs)("dialog", {
		ref: t,
		className: "qr-progress-dialog",
		role: "alertdialog",
		"aria-modal": "true",
		"aria-labelledby": "qr-progress-dialog-title",
		"aria-describedby": "qr-progress-dialog-detail",
		onCancel: (e) => e.preventDefault(),
		children: [
			/* @__PURE__ */ (0, P.jsx)("div", {
				className: "qr-progress-spinner",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, P.jsx)("h2", {
				id: "qr-progress-dialog-title",
				children: e.label
			}),
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-progress-summary",
				children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Batch export in progress" }), /* @__PURE__ */ (0, P.jsxs)("strong", { children: [n, "%"] })]
			}),
			/* @__PURE__ */ (0, P.jsx)("progress", {
				value: e.current,
				max: e.total,
				"aria-label": `Batch export ${n}% complete`
			}),
			/* @__PURE__ */ (0, P.jsx)("p", {
				id: "qr-progress-dialog-detail",
				children: e.detail
			}),
			/* @__PURE__ */ (0, P.jsx)("small", { children: "Please keep this page open. The download will start automatically when the ZIP is ready." })
		]
	});
}
//#endregion
//#region apps/qr-studio/src/components/CsvErrorDialog.tsx
function We({ message: e, onClose: t }) {
	let n = (0, l.useRef)(null);
	return (0, l.useEffect)(() => {
		let e = n.current;
		return e && !e.open && e.showModal(), () => {
			e?.open && e.close();
		};
	}, []), /* @__PURE__ */ (0, P.jsxs)("dialog", {
		ref: n,
		className: "qr-csv-dialog",
		role: "alertdialog",
		"aria-modal": "true",
		"aria-labelledby": "qr-csv-dialog-title",
		"aria-describedby": "qr-csv-dialog-message",
		onCancel: (e) => {
			e.preventDefault(), t();
		},
		children: [
			/* @__PURE__ */ (0, P.jsx)("div", {
				className: "qr-csv-dialog-icon",
				"aria-hidden": "true",
				children: "!"
			}),
			/* @__PURE__ */ (0, P.jsx)("h2", {
				id: "qr-csv-dialog-title",
				children: "CSV file could not be loaded"
			}),
			/* @__PURE__ */ (0, P.jsx)("p", {
				id: "qr-csv-dialog-message",
				children: e
			}),
			/* @__PURE__ */ (0, P.jsx)("p", {
				className: "qr-csv-dialog-help",
				children: "Check that the file:"
			}),
			/* @__PURE__ */ (0, P.jsxs)("ul", { children: [
				/* @__PURE__ */ (0, P.jsxs)("li", { children: [
					"Is a CSV file with ",
					/* @__PURE__ */ (0, P.jsx)("code", { children: "name,data" }),
					" columns"
				] }),
				/* @__PURE__ */ (0, P.jsx)("li", { children: "Has one QR value per row" }),
				/* @__PURE__ */ (0, P.jsx)("li", { children: "Contains no more than 250 data rows" })
			] }),
			/* @__PURE__ */ (0, P.jsx)("button", {
				type: "button",
				className: "qr-primary-action",
				autoFocus: !0,
				onClick: t,
				children: "Close"
			})
		]
	});
}
//#endregion
//#region apps/qr-studio/src/components/SidebarContent.tsx
var Ge = [
	["url", "URL"],
	["text", "Text"],
	["wifi", "Wi-Fi"],
	["vcard", "vCard"],
	["email", "Email"],
	["sms", "SMS"],
	["geo", "Geo"],
	["calendar", "Calendar"],
	["totp", "TOTP"],
	["crypto", "Crypto"],
	["social", "Social"]
];
function Ke({ qrType: e, values: t, error: n, onTypeChange: r, onValueChange: i }) {
	let [a, o] = (0, l.useState)("");
	return /* @__PURE__ */ (0, P.jsxs)("div", {
		className: "qr-panel-content",
		children: [
			/* @__PURE__ */ (0, P.jsxs)("label", {
				className: "qr-field",
				children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "QR type" }), /* @__PURE__ */ (0, P.jsx)("select", {
					value: e,
					onChange: (e) => r(e.target.value),
					children: Ge.map(([e, t]) => /* @__PURE__ */ (0, P.jsx)("option", {
						value: e,
						children: t
					}, e))
				})]
			}),
			/* @__PURE__ */ (0, P.jsx)("div", {
				className: "qr-dynamic-form",
				children: qe(e, t, (e) => String(t[e] ?? ""), (e) => (t) => {
					i(e, t.currentTarget.type === "checkbox" ? t.currentTarget.checked : t.currentTarget.value);
				}, (e) => {
					let t = e.target.files?.[0];
					if (o(""), !t) return i("contactPhoto", "");
					if (t.size > 1e3 || ![
						"image/png",
						"image/jpeg",
						"image/webp"
					].includes(t.type)) return o("Choose a PNG, JPEG, or WebP under 1 KB. QR codes have very limited photo capacity."), e.target.value = "", i("contactPhoto", "");
					i("contactPhoto", "");
					let n = new FileReader();
					n.onload = () => i("contactPhoto", String(n.result)), n.onerror = () => o("Unable to read this photo. Try another file."), n.readAsDataURL(t);
				})
			}),
			e === "vcard" && a && /* @__PURE__ */ (0, P.jsx)("div", {
				className: "qr-inline-error",
				role: "alert",
				children: a
			}),
			n && /* @__PURE__ */ (0, P.jsx)("div", {
				className: "qr-inline-error",
				role: "alert",
				children: n
			})
		]
	});
}
function qe(e, t, n, r, i) {
	switch (e) {
		case "url": return /* @__PURE__ */ (0, P.jsx)(F, {
			label: "Destination URL",
			children: /* @__PURE__ */ (0, P.jsx)("input", {
				type: "url",
				value: n("url"),
				onChange: r("url"),
				placeholder: "https://example.com"
			})
		});
		case "text": return /* @__PURE__ */ (0, P.jsx)(F, {
			label: "Plain text",
			children: /* @__PURE__ */ (0, P.jsx)("textarea", {
				rows: 7,
				value: n("text"),
				onChange: r("text"),
				placeholder: "Enter text to encode"
			})
		});
		case "wifi": return /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [
			/* @__PURE__ */ (0, P.jsx)(F, {
				label: "Network name (SSID)",
				children: /* @__PURE__ */ (0, P.jsx)("input", {
					value: n("wifiSsid"),
					onChange: r("wifiSsid"),
					placeholder: "Guest Wi-Fi"
				})
			}),
			n("wifiEncryption") !== "NONE" && /* @__PURE__ */ (0, P.jsx)(F, {
				label: "Password",
				children: /* @__PURE__ */ (0, P.jsx)("input", {
					type: "password",
					value: n("wifiPassword"),
					onChange: r("wifiPassword")
				})
			}),
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-field-row",
				children: [/* @__PURE__ */ (0, P.jsx)(F, {
					label: "Encryption",
					children: /* @__PURE__ */ (0, P.jsxs)("select", {
						value: n("wifiEncryption"),
						onChange: r("wifiEncryption"),
						children: [
							/* @__PURE__ */ (0, P.jsx)("option", {
								value: "WPA",
								children: "WPA / WPA2 Personal"
							}),
							/* @__PURE__ */ (0, P.jsx)("option", { children: "WEP" }),
							/* @__PURE__ */ (0, P.jsx)("option", {
								value: "NONE",
								children: "Open"
							})
						]
					})
				}), /* @__PURE__ */ (0, P.jsxs)("label", {
					className: "qr-check",
					children: [/* @__PURE__ */ (0, P.jsx)("input", {
						type: "checkbox",
						checked: !!t.wifiHidden,
						onChange: r("wifiHidden")
					}), " Hidden network"]
				})]
			})
		] });
		case "vcard": return /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-field-row",
				children: [/* @__PURE__ */ (0, P.jsx)(F, {
					label: "Full name",
					children: /* @__PURE__ */ (0, P.jsx)("input", {
						value: n("contactName"),
						onChange: r("contactName")
					})
				}), /* @__PURE__ */ (0, P.jsx)(F, {
					label: "Company",
					children: /* @__PURE__ */ (0, P.jsx)("input", {
						value: n("contactCompany"),
						onChange: r("contactCompany")
					})
				})]
			}),
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-field-row",
				children: [/* @__PURE__ */ (0, P.jsx)(F, {
					label: "Phone",
					children: /* @__PURE__ */ (0, P.jsx)("input", {
						type: "tel",
						value: n("contactPhone"),
						onChange: r("contactPhone")
					})
				}), /* @__PURE__ */ (0, P.jsx)(F, {
					label: "Email",
					children: /* @__PURE__ */ (0, P.jsx)("input", {
						type: "email",
						value: n("contactEmail"),
						onChange: r("contactEmail")
					})
				})]
			}),
			/* @__PURE__ */ (0, P.jsx)(F, {
				label: "Address",
				children: /* @__PURE__ */ (0, P.jsx)("input", {
					value: n("contactAddress"),
					onChange: r("contactAddress")
				})
			}),
			/* @__PURE__ */ (0, P.jsx)(F, {
				label: "Website",
				children: /* @__PURE__ */ (0, P.jsx)("input", {
					type: "url",
					value: n("contactWebsite"),
					onChange: r("contactWebsite")
				})
			}),
			/* @__PURE__ */ (0, P.jsxs)(F, {
				label: "Embedded photo",
				children: [/* @__PURE__ */ (0, P.jsx)("input", {
					type: "file",
					accept: "image/png,image/jpeg,image/webp",
					onChange: i
				}), /* @__PURE__ */ (0, P.jsx)("small", { children: "Optional; under 1 KB. Even a small photo may exceed QR capacity with other contact details." })]
			})
		] });
		case "email": return /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [
			/* @__PURE__ */ (0, P.jsx)(F, {
				label: "Recipient",
				children: /* @__PURE__ */ (0, P.jsx)("input", {
					type: "email",
					value: n("emailAddress"),
					onChange: r("emailAddress")
				})
			}),
			/* @__PURE__ */ (0, P.jsx)(F, {
				label: "Subject",
				children: /* @__PURE__ */ (0, P.jsx)("input", {
					value: n("emailSubject"),
					onChange: r("emailSubject")
				})
			}),
			/* @__PURE__ */ (0, P.jsx)(F, {
				label: "Message",
				children: /* @__PURE__ */ (0, P.jsx)("textarea", {
					rows: 5,
					value: n("emailBody"),
					onChange: r("emailBody")
				})
			})
		] });
		case "sms": return /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [/* @__PURE__ */ (0, P.jsx)(F, {
			label: "Phone number",
			children: /* @__PURE__ */ (0, P.jsx)("input", {
				type: "tel",
				value: n("smsPhone"),
				onChange: r("smsPhone")
			})
		}), /* @__PURE__ */ (0, P.jsx)(F, {
			label: "Message",
			children: /* @__PURE__ */ (0, P.jsx)("textarea", {
				rows: 5,
				value: n("smsMessage"),
				onChange: r("smsMessage")
			})
		})] });
		case "geo": return /* @__PURE__ */ (0, P.jsxs)("div", {
			className: "qr-field-row",
			children: [/* @__PURE__ */ (0, P.jsx)(F, {
				label: "Latitude",
				children: /* @__PURE__ */ (0, P.jsx)("input", {
					type: "number",
					min: "-90",
					max: "90",
					step: "any",
					value: n("latitude"),
					onChange: r("latitude"),
					placeholder: "44.9537"
				})
			}), /* @__PURE__ */ (0, P.jsx)(F, {
				label: "Longitude",
				children: /* @__PURE__ */ (0, P.jsx)("input", {
					type: "number",
					min: "-180",
					max: "180",
					step: "any",
					value: n("longitude"),
					onChange: r("longitude"),
					placeholder: "-93.0900"
				})
			})]
		});
		case "calendar": return /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [
			/* @__PURE__ */ (0, P.jsx)("p", {
				className: "qr-content-help",
				children: "Times are saved without a time zone and use the local time of the calendar importing the code."
			}),
			/* @__PURE__ */ (0, P.jsx)(F, {
				label: "Event title",
				children: /* @__PURE__ */ (0, P.jsx)("input", {
					value: n("eventTitle"),
					onChange: r("eventTitle")
				})
			}),
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-field-row",
				children: [/* @__PURE__ */ (0, P.jsx)(F, {
					label: "Starts",
					children: /* @__PURE__ */ (0, P.jsx)("input", {
						type: "datetime-local",
						value: n("eventStart"),
						onChange: r("eventStart"),
						onInput: r("eventStart")
					})
				}), /* @__PURE__ */ (0, P.jsx)(F, {
					label: "Ends",
					children: /* @__PURE__ */ (0, P.jsx)("input", {
						type: "datetime-local",
						value: n("eventEnd"),
						onChange: r("eventEnd"),
						onInput: r("eventEnd")
					})
				})]
			}),
			/* @__PURE__ */ (0, P.jsx)(F, {
				label: "Location",
				children: /* @__PURE__ */ (0, P.jsx)("input", {
					value: n("eventLocation"),
					onChange: r("eventLocation")
				})
			}),
			/* @__PURE__ */ (0, P.jsx)(F, {
				label: "Description",
				children: /* @__PURE__ */ (0, P.jsx)("textarea", {
					rows: 4,
					value: n("eventDescription"),
					onChange: r("eventDescription")
				})
			})
		] });
		case "totp": return /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [
			/* @__PURE__ */ (0, P.jsx)("div", {
				className: "qr-security-note",
				children: "TOTP secrets are sensitive. Processing stays inside this browser."
			}),
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-field-row",
				children: [/* @__PURE__ */ (0, P.jsx)(F, {
					label: "Issuer",
					children: /* @__PURE__ */ (0, P.jsx)("input", {
						value: n("totpIssuer"),
						onChange: r("totpIssuer"),
						placeholder: "MonkeyTactics"
					})
				}), /* @__PURE__ */ (0, P.jsx)(F, {
					label: "Account",
					children: /* @__PURE__ */ (0, P.jsx)("input", {
						value: n("totpAccount"),
						onChange: r("totpAccount"),
						placeholder: "name@example.com"
					})
				})]
			}),
			/* @__PURE__ */ (0, P.jsx)(F, {
				label: "Base32 secret",
				children: /* @__PURE__ */ (0, P.jsx)("input", {
					type: "password",
					value: n("totpSecret"),
					onChange: r("totpSecret")
				})
			}),
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-field-row",
				children: [
					/* @__PURE__ */ (0, P.jsx)(F, {
						label: "Algorithm",
						children: /* @__PURE__ */ (0, P.jsxs)("select", {
							value: n("totpAlgorithm"),
							onChange: r("totpAlgorithm"),
							children: [
								/* @__PURE__ */ (0, P.jsx)("option", { children: "SHA1" }),
								/* @__PURE__ */ (0, P.jsx)("option", { children: "SHA256" }),
								/* @__PURE__ */ (0, P.jsx)("option", { children: "SHA512" })
							]
						})
					}),
					/* @__PURE__ */ (0, P.jsx)(F, {
						label: "Digits",
						children: /* @__PURE__ */ (0, P.jsxs)("select", {
							value: n("totpDigits"),
							onChange: r("totpDigits"),
							children: [/* @__PURE__ */ (0, P.jsx)("option", { children: "6" }), /* @__PURE__ */ (0, P.jsx)("option", { children: "8" })]
						})
					}),
					/* @__PURE__ */ (0, P.jsx)(F, {
						label: "Period",
						children: /* @__PURE__ */ (0, P.jsxs)("select", {
							value: n("totpPeriod"),
							onChange: r("totpPeriod"),
							children: [/* @__PURE__ */ (0, P.jsx)("option", { children: "30" }), /* @__PURE__ */ (0, P.jsx)("option", { children: "60" })]
						})
					})
				]
			})
		] });
		case "crypto": return /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [
			/* @__PURE__ */ (0, P.jsx)(F, {
				label: "Network",
				children: /* @__PURE__ */ (0, P.jsxs)("select", {
					value: n("cryptoNetwork"),
					onChange: r("cryptoNetwork"),
					children: [
						/* @__PURE__ */ (0, P.jsx)("option", {
							value: "bitcoin",
							children: "Bitcoin"
						}),
						/* @__PURE__ */ (0, P.jsx)("option", {
							value: "ethereum",
							children: "Ethereum"
						}),
						/* @__PURE__ */ (0, P.jsx)("option", {
							value: "solana",
							children: "Solana"
						}),
						/* @__PURE__ */ (0, P.jsx)("option", {
							value: "litecoin",
							children: "Litecoin"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, P.jsx)("p", {
				className: "qr-content-help",
				children: "Use a native-coin address for the selected network. Address ownership and checksums are not verified."
			}),
			/* @__PURE__ */ (0, P.jsx)(F, {
				label: "Wallet address",
				children: /* @__PURE__ */ (0, P.jsx)("input", {
					value: n("cryptoAddress"),
					onChange: r("cryptoAddress")
				})
			}),
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-field-row",
				children: [/* @__PURE__ */ (0, P.jsx)(F, {
					label: `Amount (${{
						bitcoin: "BTC",
						ethereum: "ETH",
						solana: "SOL",
						litecoin: "LTC"
					}[n("cryptoNetwork")] ?? "BTC"}, optional)`,
					children: /* @__PURE__ */ (0, P.jsx)("input", {
						inputMode: "decimal",
						value: n("cryptoAmount"),
						onChange: r("cryptoAmount")
					})
				}), n("cryptoNetwork") !== "ethereum" && /* @__PURE__ */ (0, P.jsx)(F, {
					label: "Label (optional)",
					children: /* @__PURE__ */ (0, P.jsx)("input", {
						value: n("cryptoLabel"),
						onChange: r("cryptoLabel")
					})
				})]
			})
		] });
		case "social": return /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [/* @__PURE__ */ (0, P.jsx)(F, {
			label: "Platform",
			children: /* @__PURE__ */ (0, P.jsxs)("select", {
				value: n("socialPlatform"),
				onChange: r("socialPlatform"),
				children: [
					/* @__PURE__ */ (0, P.jsx)("option", {
						value: "whatsapp",
						children: "WhatsApp"
					}),
					/* @__PURE__ */ (0, P.jsx)("option", {
						value: "telegram",
						children: "Telegram"
					}),
					/* @__PURE__ */ (0, P.jsx)("option", {
						value: "messenger",
						children: "Messenger"
					}),
					/* @__PURE__ */ (0, P.jsx)("option", {
						value: "instagram",
						children: "Instagram"
					}),
					/* @__PURE__ */ (0, P.jsx)("option", {
						value: "x",
						children: "X"
					}),
					/* @__PURE__ */ (0, P.jsx)("option", {
						value: "linkedin",
						children: "LinkedIn"
					})
				]
			})
		}), /* @__PURE__ */ (0, P.jsx)(F, {
			label: n("socialPlatform") === "whatsapp" ? "Phone with country code" : "Username",
			children: /* @__PURE__ */ (0, P.jsx)("input", {
				value: n("socialIdentity"),
				onChange: r("socialIdentity")
			})
		})] });
	}
}
function F({ label: e, children: t }) {
	return /* @__PURE__ */ (0, P.jsxs)("label", {
		className: "qr-field",
		children: [/* @__PURE__ */ (0, P.jsx)("span", { children: e }), t]
	});
}
//#endregion
//#region apps/qr-studio/src/components/SidebarExport.tsx
var Je = (e) => /[",\r\n]/.test(e) ? `"${e.replace(/"/g, "\"\"")}"` : e, Ye = [
	[
		"name",
		"data",
		"text_logo",
		"frame_text",
		"frame_color",
		"frame_style"
	],
	[
		"url-homepage",
		"https://monkeytactics.com",
		"HOME",
		"SCAN ME",
		"#111827",
		"rounded-rectangle"
	],
	["plain-text", "Welcome to MonkeyTactics QR Code Generator"],
	["wifi-guest", "WIFI:T:WPA;S:MonkeyTactics Guest;P:ExamplePassword123;H:false;;"],
	["vcard-contact", "BEGIN:VCARD\r\nVERSION:4.0\r\nFN:Jane Doe\r\nORG:MonkeyTactics\r\nTEL;TYPE=cell;VALUE=uri:tel:+15551234567\r\nEMAIL:jane@example.com\r\nADR;TYPE=work:;;123 Main Street;Minneapolis;MN;55401;USA\r\nURL:https://monkeytactics.com\r\nEND:VCARD"],
	["email-prefilled", "mailto:hello@example.com?subject=Hello&body=Thanks%20for%20connecting"],
	["sms-prefilled", "sms:+15551234567?body=Hello%20from%20MonkeyTactics"],
	["phone-call", "tel:+15551234567"],
	["geo-location", "geo:44.9537,-93.0900"],
	["calendar-event", "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MonkeyTactics//QR Code Generator//EN\r\nBEGIN:VEVENT\r\nSUMMARY:MonkeyTactics Demo\r\nDTSTART:20260810T140000\r\nDTEND:20260810T150000\r\nLOCATION:123 Main Street, Minneapolis\r\nDESCRIPTION:QR Code Generator demonstration\r\nEND:VEVENT\r\nEND:VCALENDAR"],
	["totp-authenticator", "otpauth://totp/MonkeyTactics:demo@example.com?secret=JBSWY3DPEHPK3PXP&issuer=MonkeyTactics&algorithm=SHA1&digits=6&period=30"],
	["crypto-bitcoin", "bitcoin:bc1qexampleaddress?amount=0.001&label=MonkeyTactics"],
	["social-whatsapp", "https://wa.me/15551234567"],
	["social-telegram", "https://t.me/monkeytactics"],
	["social-messenger", "https://m.me/monkeytactics"],
	["social-instagram", "https://instagram.com/monkeytactics"],
	["social-x", "https://x.com/monkeytactics"],
	["social-linkedin", "https://linkedin.com/in/monkeytactics"]
].map((e) => e.map(Je).join(",")).join("\r\n"), Xe = `data:text/csv;charset=utf-8,${encodeURIComponent(Ye)}`;
function Ze(e) {
	return /* @__PURE__ */ (0, P.jsxs)("div", {
		className: "qr-panel-content qr-export-panel",
		children: [
			/* @__PURE__ */ (0, P.jsxs)("section", {
				className: "qr-style-section",
				children: [
					/* @__PURE__ */ (0, P.jsx)("h3", { children: "Export format" }),
					/* @__PURE__ */ (0, P.jsx)("div", {
						className: "qr-export-formats",
						role: "group",
						"aria-label": "Export format",
						children: [
							"png",
							"svg",
							"pdf"
						].map((t) => /* @__PURE__ */ (0, P.jsxs)("button", {
							type: "button",
							disabled: e.isExporting,
							className: e.format === t ? "active" : "",
							"aria-pressed": e.format === t,
							onClick: () => e.onFormatChange(t),
							children: [/* @__PURE__ */ (0, P.jsx)("strong", { children: t.toUpperCase() }), /* @__PURE__ */ (0, P.jsx)("small", { children: t === "png" ? "Raster image" : t === "svg" ? "Scalable vector" : "Print-ready" })]
						}, t))
					}),
					(e.format === "png" || e.batchFileName && e.batchMode === "mixed") && /* @__PURE__ */ (0, P.jsxs)("label", {
						className: "qr-field",
						children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "PNG resolution" }), /* @__PURE__ */ (0, P.jsxs)("select", {
							disabled: e.isExporting,
							value: e.dpi,
							onChange: (t) => e.onDpiChange(Number(t.target.value)),
							children: [
								/* @__PURE__ */ (0, P.jsx)("option", {
									value: 72,
									children: "72 DPI · web"
								}),
								/* @__PURE__ */ (0, P.jsx)("option", {
									value: 300,
									children: "300 DPI · print"
								}),
								/* @__PURE__ */ (0, P.jsx)("option", {
									value: 600,
									children: "600 DPI · high detail"
								}),
								/* @__PURE__ */ (0, P.jsx)("option", {
									value: 1200,
									children: "1200 DPI · production"
								})
							]
						})]
					}),
					e.format === "pdf" && /* @__PURE__ */ (0, P.jsxs)("div", {
						className: "qr-pdf-options",
						children: [
							/* @__PURE__ */ (0, P.jsxs)("label", {
								className: "qr-field",
								children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "PDF layout" }), /* @__PURE__ */ (0, P.jsxs)("select", {
									disabled: e.isExporting,
									value: e.pdfLayout,
									onChange: (t) => e.onPdfLayoutChange(t.target.value),
									children: [
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "standard",
											children: "Standard · one QR per file"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "labels",
											children: "Label sheet · Avery templates"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "poster",
											children: "Poster · multiple QR codes per page"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "business-cards",
											children: "Business cards · 10 per sheet"
										})
									]
								})]
							}),
							e.pdfLayout === "labels" && /* @__PURE__ */ (0, P.jsxs)("label", {
								className: "qr-field",
								children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Avery template" }), /* @__PURE__ */ (0, P.jsxs)("select", {
									disabled: e.isExporting,
									value: e.averyTemplate,
									onChange: (t) => e.onAveryTemplateChange(t.target.value),
									children: [
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "5160",
											children: "5160 / 8160 · 30 labels"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "5163",
											children: "5163 / 8163 · 10 labels"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "5164",
											children: "5164 / 8164 · 6 labels"
										})
									]
								})]
							}),
							e.pdfLayout === "poster" && /* @__PURE__ */ (0, P.jsxs)("label", {
								className: "qr-field",
								children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "QR codes per page" }), /* @__PURE__ */ (0, P.jsxs)("select", {
									disabled: e.isExporting,
									value: e.posterGrid,
									onChange: (t) => e.onPosterGridChange(t.target.value),
									children: [
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "2x2",
											children: "2 × 2 · 4 per page"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "3x3",
											children: "3 × 3 · 9 per page"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "4x4",
											children: "4 × 4 · 16 per page"
										})
									]
								})]
							}),
							e.pdfLayout === "business-cards" && /* @__PURE__ */ (0, P.jsx)("p", {
								className: "qr-help",
								children: "Letter-size sheet compatible with Avery 5371 / 8371 business cards."
							})
						]
					}),
					/* @__PURE__ */ (0, P.jsxs)("label", {
						className: "qr-switch",
						children: [
							/* @__PURE__ */ (0, P.jsx)("input", {
								type: "checkbox",
								disabled: e.isExporting,
								checked: e.transparent,
								onChange: (t) => e.onTransparentChange(t.target.checked)
							}),
							/* @__PURE__ */ (0, P.jsx)("span", { "aria-hidden": "true" }),
							"Transparent background"
						]
					})
				]
			}),
			/* @__PURE__ */ (0, P.jsxs)("section", {
				className: "qr-style-section",
				children: [
					/* @__PURE__ */ (0, P.jsx)("h3", { children: "Optional batch CSV" }),
					/* @__PURE__ */ (0, P.jsxs)("p", {
						className: "qr-help",
						children: [
							"Upload a CSV with ",
							/* @__PURE__ */ (0, P.jsx)("code", { children: "name,data" }),
							" columns to switch Export into batch mode. Optional ",
							/* @__PURE__ */ (0, P.jsx)("code", { children: "text_logo" }),
							", ",
							/* @__PURE__ */ (0, P.jsx)("code", { children: "frame_text" }),
							", ",
							/* @__PURE__ */ (0, P.jsx)("code", { children: "frame_color" }),
							", and ",
							/* @__PURE__ */ (0, P.jsx)("code", { children: "frame_style" }),
							" columns can override styling per row. Data is encoded exactly as supplied; use complete URLs or preformatted Wi-Fi, contact, and other payloads. The file stays in this browser so you can change styling before exporting. Batch files can contain up to 250 QR codes. ",
							/* @__PURE__ */ (0, P.jsx)("a", {
								className: "qr-template-link",
								download: "qr-batch-template.csv",
								href: Xe,
								children: "Download CSV template"
							})
						]
					}),
					e.batchFileName ? /* @__PURE__ */ (0, P.jsxs)("div", {
						className: "qr-selected-upload",
						"aria-live": "polite",
						children: [/* @__PURE__ */ (0, P.jsx)("button", {
							type: "button",
							disabled: e.isExporting,
							onClick: e.onBatchCsvRemove,
							children: "Remove file"
						}), /* @__PURE__ */ (0, P.jsxs)("p", { children: [
							"Selected: ",
							/* @__PURE__ */ (0, P.jsx)("strong", { children: e.batchFileName }),
							" · ",
							e.batchCount,
							" QR ",
							e.batchCount === 1 ? "code" : "codes"
						] })]
					}) : /* @__PURE__ */ (0, P.jsxs)("label", {
						className: "qr-field",
						children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Choose CSV file" }), /* @__PURE__ */ (0, P.jsx)("input", {
							type: "file",
							disabled: e.isExporting,
							accept: ".csv,text/csv",
							onChange: (t) => {
								let n = t.target.files?.[0];
								n && e.onBatchCsvChange(n), t.target.value = "";
							}
						})]
					}),
					e.batchAnalysis && /* @__PURE__ */ (0, P.jsx)($e, { analysis: e.batchAnalysis }),
					e.batchFileName && /* @__PURE__ */ (0, P.jsxs)("div", {
						className: "qr-batch-package-options",
						children: [
							/* @__PURE__ */ (0, P.jsxs)("label", {
								className: "qr-field",
								children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Batch output" }), /* @__PURE__ */ (0, P.jsxs)("select", {
									disabled: e.isExporting,
									value: e.batchMode,
									onChange: (t) => e.onBatchModeChange(t.target.value),
									children: [
										/* @__PURE__ */ (0, P.jsxs)("option", {
											value: "selected",
											children: [
												"Selected format files (",
												e.format.toUpperCase(),
												")"
											]
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "pdf-booklet",
											children: "PDF booklet · one QR per page"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "svg-set",
											children: "SVG set"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "mixed",
											children: "Mixed formats · PNG + SVG"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, P.jsxs)("label", {
								className: "qr-field",
								children: [
									/* @__PURE__ */ (0, P.jsx)("span", { children: "Filename pattern" }),
									/* @__PURE__ */ (0, P.jsx)("input", {
										disabled: e.isExporting,
										value: e.filenamePattern,
										onChange: (t) => e.onFilenamePatternChange(t.target.value),
										placeholder: "{name}"
									}),
									/* @__PURE__ */ (0, P.jsxs)("small", { children: [
										"Available tokens: ",
										/* @__PURE__ */ (0, P.jsx)("code", { children: "{index}" }),
										", ",
										/* @__PURE__ */ (0, P.jsx)("code", { children: "{name}" }),
										", ",
										/* @__PURE__ */ (0, P.jsx)("code", { children: "{type}" }),
										", and ",
										/* @__PURE__ */ (0, P.jsx)("code", { children: "{data_hash}" }),
										"."
									] })
								]
							}),
							/* @__PURE__ */ (0, P.jsx)("h4", { children: "Package metadata" }),
							/* @__PURE__ */ (0, P.jsx)(Qe, {
								label: "Include manifest.json",
								checked: e.includeManifest,
								disabled: e.isExporting,
								onChange: e.onIncludeManifestChange
							}),
							/* @__PURE__ */ (0, P.jsx)(Qe, {
								label: "Include final QR list CSV",
								checked: e.includeFinalCsv,
								disabled: e.isExporting,
								onChange: e.onIncludeFinalCsvChange
							}),
							/* @__PURE__ */ (0, P.jsx)(Qe, {
								label: "Include thumbnail contact sheet PDF",
								checked: e.includeContactSheet,
								disabled: e.isExporting,
								onChange: e.onIncludeContactSheetChange
							}),
							/* @__PURE__ */ (0, P.jsx)("p", {
								className: "qr-help",
								children: "The manifest records source data, styling, reliability score, and every generated filename."
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, P.jsxs)("section", {
				className: "qr-style-section qr-export-final",
				children: [/* @__PURE__ */ (0, P.jsx)("button", {
					type: "button",
					className: "qr-primary-action",
					disabled: e.isExporting,
					onClick: e.onExport,
					children: e.isExporting ? "Exporting…" : e.batchFileName ? `Export Batch (${e.batchCount})` : "Export"
				}), e.exportStatus && /* @__PURE__ */ (0, P.jsx)("p", {
					className: "qr-batch-status",
					role: "status",
					children: e.exportStatus
				})]
			})
		]
	});
}
function Qe({ label: e, checked: t, disabled: n, onChange: r }) {
	return /* @__PURE__ */ (0, P.jsxs)("label", {
		className: "qr-switch",
		children: [
			/* @__PURE__ */ (0, P.jsx)("input", {
				type: "checkbox",
				disabled: n,
				checked: t,
				onChange: (e) => r(e.target.checked)
			}),
			/* @__PURE__ */ (0, P.jsx)("span", { "aria-hidden": "true" }),
			e
		]
	});
}
function $e({ analysis: e }) {
	let t = e.items.slice(0, 8), n = e.emptyRowsRemoved + e.duplicateRowsRemoved, r = e.items.some((e) => e.textLogo), i = e.items.some((e) => e.frameText || e.frameColor || e.frameStyle);
	return /* @__PURE__ */ (0, P.jsxs)("div", {
		className: "qr-csv-preview",
		children: [
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-csv-preview-heading",
				children: [/* @__PURE__ */ (0, P.jsx)("strong", { children: "Cleaned CSV preview" }), /* @__PURE__ */ (0, P.jsxs)("span", { children: [
					e.items.length,
					" valid ",
					e.items.length === 1 ? "row" : "rows"
				] })]
			}),
			n > 0 && /* @__PURE__ */ (0, P.jsxs)("p", {
				className: "qr-csv-cleanup",
				role: "status",
				children: [
					"Removed ",
					e.duplicateRowsRemoved,
					" duplicate ",
					e.duplicateRowsRemoved === 1 ? "row" : "rows",
					" and ",
					e.emptyRowsRemoved,
					" empty ",
					e.emptyRowsRemoved === 1 ? "row" : "rows",
					"."
				]
			}),
			e.ignoredColumns.length > 0 && /* @__PURE__ */ (0, P.jsxs)("p", {
				className: "qr-csv-columns",
				children: [
					"Ignored extra ",
					e.ignoredColumns.length === 1 ? "column" : "columns",
					": ",
					e.ignoredColumns.join(", ")
				]
			}),
			e.textLogoWarnings.length > 0 && /* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-csv-text-logo-warnings",
				role: "status",
				children: [
					/* @__PURE__ */ (0, P.jsx)("strong", { children: "Text logo adjustments" }),
					e.textLogoWarnings.slice(0, 4).map((e) => /* @__PURE__ */ (0, P.jsxs)("p", { children: [
						"Row ",
						e.row,
						" (",
						e.name,
						"): ",
						e.messages.join(" ")
					] }, `${e.row}-${e.name}`)),
					e.textLogoWarnings.length > 4 && /* @__PURE__ */ (0, P.jsxs)("p", { children: [
						"+ ",
						e.textLogoWarnings.length - 4,
						" more adjusted rows"
					] })
				]
			}),
			e.frameWarnings.length > 0 && /* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-csv-text-logo-warnings",
				role: "status",
				children: [
					/* @__PURE__ */ (0, P.jsx)("strong", { children: "Frame adjustments" }),
					e.frameWarnings.slice(0, 4).map((e) => /* @__PURE__ */ (0, P.jsxs)("p", { children: [
						"Row ",
						e.row,
						" (",
						e.name,
						"): ",
						e.messages.join(" ")
					] }, `${e.row}-${e.name}`)),
					e.frameWarnings.length > 4 && /* @__PURE__ */ (0, P.jsxs)("p", { children: [
						"+ ",
						e.frameWarnings.length - 4,
						" more adjusted rows"
					] })
				]
			}),
			/* @__PURE__ */ (0, P.jsx)("div", {
				className: "qr-csv-table-wrap",
				children: /* @__PURE__ */ (0, P.jsxs)("table", { children: [
					/* @__PURE__ */ (0, P.jsxs)("caption", { children: [
						"First ",
						t.length,
						" of ",
						e.items.length,
						" cleaned QR rows"
					] }),
					/* @__PURE__ */ (0, P.jsx)("thead", { children: /* @__PURE__ */ (0, P.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, P.jsx)("th", {
							scope: "col",
							children: "#"
						}),
						/* @__PURE__ */ (0, P.jsx)("th", {
							scope: "col",
							children: "Name"
						}),
						/* @__PURE__ */ (0, P.jsx)("th", {
							scope: "col",
							children: "Data"
						}),
						r && /* @__PURE__ */ (0, P.jsx)("th", {
							scope: "col",
							children: "Text logo"
						}),
						i && /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [
							/* @__PURE__ */ (0, P.jsx)("th", {
								scope: "col",
								children: "Frame text"
							}),
							/* @__PURE__ */ (0, P.jsx)("th", {
								scope: "col",
								children: "Frame color"
							}),
							/* @__PURE__ */ (0, P.jsx)("th", {
								scope: "col",
								children: "Frame style"
							})
						] })
					] }) }),
					/* @__PURE__ */ (0, P.jsx)("tbody", { children: t.map((e, t) => /* @__PURE__ */ (0, P.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, P.jsx)("td", { children: t + 1 }),
						/* @__PURE__ */ (0, P.jsx)("td", { children: e.name }),
						/* @__PURE__ */ (0, P.jsx)("td", {
							title: e.data,
							children: e.data
						}),
						r && /* @__PURE__ */ (0, P.jsx)("td", { children: e.textLogo || "—" }),
						i && /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [
							/* @__PURE__ */ (0, P.jsx)("td", { children: e.frameText || "—" }),
							/* @__PURE__ */ (0, P.jsx)("td", { children: e.frameColor || "—" }),
							/* @__PURE__ */ (0, P.jsx)("td", { children: e.frameStyle || "—" })
						] })
					] }, `${e.name}-${t}`)) })
				] })
			}),
			e.items.length > t.length && /* @__PURE__ */ (0, P.jsxs)("p", {
				className: "qr-csv-more",
				children: [
					"+ ",
					e.items.length - t.length,
					" more rows included in export"
				]
			})
		]
	});
}
//#endregion
//#region apps/qr-studio/src/components/SidebarProjects.tsx
function et(e) {
	return /* @__PURE__ */ (0, P.jsxs)("div", {
		className: "qr-panel-content qr-projects-panel",
		children: [
			/* @__PURE__ */ (0, P.jsxs)("section", {
				className: "qr-style-section",
				children: [
					/* @__PURE__ */ (0, P.jsx)("h3", { children: "Current project" }),
					/* @__PURE__ */ (0, P.jsx)("p", {
						className: "qr-help",
						children: "Save every content, styling, batch, and export setting together. Projects stay in this browser unless you export a JSON copy."
					}),
					/* @__PURE__ */ (0, P.jsxs)("label", {
						className: "qr-field",
						children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Project name" }), /* @__PURE__ */ (0, P.jsx)("input", {
							value: e.name,
							onChange: (t) => e.onNameChange(t.target.value),
							placeholder: "Spring campaign",
							required: !0
						})]
					}),
					/* @__PURE__ */ (0, P.jsxs)("label", {
						className: "qr-field",
						children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Description" }), /* @__PURE__ */ (0, P.jsx)("textarea", {
							rows: 2,
							value: e.description,
							onChange: (t) => e.onDescriptionChange(t.target.value),
							placeholder: "What this QR project is for"
						})]
					}),
					/* @__PURE__ */ (0, P.jsxs)("label", {
						className: "qr-field",
						children: [
							/* @__PURE__ */ (0, P.jsx)("span", { children: "Tags" }),
							/* @__PURE__ */ (0, P.jsx)("input", {
								value: e.tags,
								onChange: (t) => e.onTagsChange(t.target.value),
								placeholder: "campaign, print, spring-2026"
							}),
							/* @__PURE__ */ (0, P.jsx)("small", { children: "Separate tags with commas." })
						]
					}),
					/* @__PURE__ */ (0, P.jsxs)("label", {
						className: "qr-field",
						children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Notes" }), /* @__PURE__ */ (0, P.jsx)("textarea", {
							rows: 2,
							value: e.notes,
							onChange: (t) => e.onNotesChange(t.target.value),
							placeholder: "Production notes or reminders"
						})]
					}),
					/* @__PURE__ */ (0, P.jsxs)("div", {
						className: "qr-project-actions",
						children: [
							/* @__PURE__ */ (0, P.jsx)("button", {
								type: "button",
								onClick: e.onNew,
								children: "New Project"
							}),
							/* @__PURE__ */ (0, P.jsx)("button", {
								type: "button",
								className: "primary",
								onClick: e.onSave,
								children: "Save Project"
							}),
							/* @__PURE__ */ (0, P.jsx)("button", {
								type: "button",
								onClick: e.onSaveAs,
								children: "Save As…"
							}),
							/* @__PURE__ */ (0, P.jsx)("button", {
								type: "button",
								disabled: !e.selectedProjectId,
								onClick: () => e.onLoad(),
								children: "Load Project"
							})
						]
					}),
					e.status && /* @__PURE__ */ (0, P.jsx)("p", {
						className: "qr-project-status",
						role: "status",
						children: e.status
					})
				]
			}),
			/* @__PURE__ */ (0, P.jsxs)("section", {
				className: "qr-style-section",
				children: [/* @__PURE__ */ (0, P.jsx)("h3", { children: "Project JSON" }), /* @__PURE__ */ (0, P.jsxs)("div", {
					className: "qr-project-json-actions",
					children: [/* @__PURE__ */ (0, P.jsx)("button", {
						type: "button",
						disabled: !e.selectedProjectId && !e.name.trim(),
						onClick: e.onExport,
						children: "Export Project as JSON"
					}), /* @__PURE__ */ (0, P.jsxs)("label", {
						className: "qr-project-import",
						children: ["Import Project from JSON", /* @__PURE__ */ (0, P.jsx)("input", {
							type: "file",
							accept: ".json,application/json",
							onChange: (t) => {
								let n = t.target.files?.[0];
								n && e.onImport(n), t.target.value = "";
							}
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, P.jsxs)("section", {
				className: "qr-style-section",
				children: [/* @__PURE__ */ (0, P.jsxs)("div", {
					className: "qr-project-list-heading",
					children: [/* @__PURE__ */ (0, P.jsx)("h3", { children: "Saved projects" }), /* @__PURE__ */ (0, P.jsx)("span", { children: e.projects.length })]
				}), e.projects.length === 0 ? /* @__PURE__ */ (0, P.jsx)("p", {
					className: "qr-project-empty",
					children: "No projects saved yet."
				}) : /* @__PURE__ */ (0, P.jsx)("div", {
					className: "qr-project-list",
					children: e.projects.map((t) => {
						let n = e.selectedProjectId === t.id;
						return /* @__PURE__ */ (0, P.jsxs)("article", {
							className: `qr-project-card${n ? " selected" : ""}`,
							children: [/* @__PURE__ */ (0, P.jsxs)("button", {
								type: "button",
								className: "qr-project-select",
								"aria-pressed": n,
								onClick: () => e.onSelect(t.id),
								children: [
									/* @__PURE__ */ (0, P.jsx)("strong", { children: t.name }),
									t.description && /* @__PURE__ */ (0, P.jsx)("span", { children: t.description }),
									/* @__PURE__ */ (0, P.jsxs)("small", { children: [
										t.qrType.toUpperCase(),
										" · Updated ",
										tt(t.updatedAt)
									] }),
									/* @__PURE__ */ (0, P.jsxs)("small", { children: ["Created ", tt(t.createdAt)] }),
									t.meta.tags.length > 0 && /* @__PURE__ */ (0, P.jsx)("span", {
										className: "qr-project-tags",
										children: t.meta.tags.map((e) => /* @__PURE__ */ (0, P.jsx)("em", { children: e }, e))
									})
								]
							}), /* @__PURE__ */ (0, P.jsxs)("div", {
								className: "qr-project-card-actions",
								children: [
									/* @__PURE__ */ (0, P.jsx)("button", {
										type: "button",
										onClick: () => e.onLoad(t.id),
										children: "Load"
									}),
									/* @__PURE__ */ (0, P.jsx)("button", {
										type: "button",
										onClick: () => e.onDuplicate(t.id),
										children: "Duplicate"
									}),
									/* @__PURE__ */ (0, P.jsx)("button", {
										type: "button",
										className: "danger",
										onClick: () => e.onDelete(t.id),
										children: "Delete"
									})
								]
							})]
						}, t.id);
					})
				})]
			})
		]
	});
}
function tt(e) {
	let t = new Date(e);
	return Number.isNaN(t.valueOf()) ? e : t.toLocaleString([], {
		dateStyle: "medium",
		timeStyle: "short"
	});
}
//#endregion
//#region apps/qr-studio/src/utils/presetLogos.ts
var I = "fill=\"none\" stroke=\"#111827\" stroke-width=\"18\" stroke-linecap=\"round\" stroke-linejoin=\"round\"", nt = [
	{
		id: "email",
		label: "Email",
		category: "Communication",
		recommendedFor: ["email"],
		artwork: `<rect x="34" y="58" width="188" height="140" rx="18" ${I}/><path d="m42 72 86 70 86-70" ${I}/>`
	},
	{
		id: "sms",
		label: "SMS",
		category: "Communication",
		recommendedFor: ["sms"],
		artwork: `<path d="M40 55h176v120H105l-48 35 12-35H40z" ${I}/><path d="M82 112h92M82 142h58" ${I}/>`
	},
	{
		id: "phone",
		label: "Phone",
		category: "Communication",
		recommendedFor: [],
		artwork: `<path d="M76 37 48 63c3 74 70 141 144 144l27-28-45-41-26 23c-29-12-52-35-64-64l23-25z" ${I}/>`
	},
	{
		id: "wifi",
		label: "Wi-Fi",
		category: "Networking",
		recommendedFor: ["wifi"],
		artwork: `<path d="M37 91c52-45 130-45 182 0M69 128c34-29 84-29 118 0M102 164c15-13 37-13 52 0" ${I}/><circle cx="128" cy="201" r="11" fill="#22c55e"/>`
	},
	{
		id: "contact",
		label: "Contact",
		category: "Identity",
		recommendedFor: ["vcard"],
		artwork: `<circle cx="128" cy="83" r="42" ${I}/><path d="M49 211c7-48 35-75 79-75s72 27 79 75" ${I}/>`
	},
	{
		id: "calendar",
		label: "Calendar",
		category: "Identity",
		recommendedFor: ["calendar"],
		artwork: `<rect x="42" y="53" width="172" height="166" rx="18" ${I}/><path d="M42 99h172M82 37v32M174 37v32" ${I}/><path d="m91 157 24 23 51-55" ${I}/>`
	},
	{
		id: "location",
		label: "Location",
		category: "Identity",
		recommendedFor: ["geo"],
		artwork: `<path d="M128 226s70-66 70-125a70 70 0 1 0-140 0c0 59 70 125 70 125Z" ${I}/><circle cx="128" cy="101" r="25" ${I}/>`
	},
	{
		id: "link",
		label: "Link",
		category: "Web",
		recommendedFor: ["url"],
		artwork: `<path d="M105 151 84 172a42 42 0 0 1-59-59l40-40a42 42 0 0 1 59 0" ${I}/><path d="m151 105 21-21a42 42 0 0 1 59 59l-40 40a42 42 0 0 1-59 0M91 165l74-74" ${I}/>`
	},
	{
		id: "text",
		label: "Text",
		category: "Web",
		recommendedFor: ["text"],
		artwork: `<rect x="49" y="35" width="158" height="186" rx="16" ${I}/><path d="M82 82h92M82 121h92M82 160h67" ${I}/>`
	},
	{
		id: "social",
		label: "Social",
		category: "Web",
		recommendedFor: ["social"],
		artwork: `<circle cx="77" cy="128" r="25" ${I}/><circle cx="184" cy="70" r="25" ${I}/><circle cx="184" cy="186" r="25" ${I}/><path d="m99 116 61-34M99 141l61 33" ${I}/>`
	},
	{
		id: "crypto",
		label: "Crypto",
		category: "Business",
		recommendedFor: ["crypto"],
		artwork: `<circle cx="128" cy="128" r="94" ${I}/><path d="M104 72h37c40 0 40 49 0 49h-37zm0 49h43c43 0 43 57 0 57h-43zM124 53v19M151 53v19M124 178v22M151 178v22" ${I}/>`
	}
];
function rt(e) {
	let t = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${e.artwork}</svg>`;
	return `data:image/svg+xml,${encodeURIComponent(t)}`;
}
async function it(e) {
	let t = nt.find((t) => t.id === e);
	if (!t) throw Error("Unknown preset logo");
	let n = new Image();
	n.src = rt(t), await n.decode();
	let r = document.createElement("canvas");
	r.width = 512, r.height = 512;
	let i = r.getContext("2d");
	if (!i) throw Error("Logo rendering is unavailable in this browser");
	return i.drawImage(n, 0, 0, r.width, r.height), r.toDataURL("image/png");
}
//#endregion
//#region apps/qr-studio/src/components/SidebarStyling.tsx
var at = [
	{
		name: "Midnight",
		foreground: "#0f172a",
		background: "#ffffff",
		gradientStart: "#0f172a",
		gradientEnd: "#334155",
		gradientColors: ["#0f172a", "#334155"]
	},
	{
		name: "Monkey",
		foreground: "#15803d",
		background: "#f0fdf4",
		gradientStart: "#22c55e",
		gradientEnd: "#0f766e",
		gradientColors: ["#22c55e", "#0f766e"]
	},
	{
		name: "Electric",
		foreground: "#312e81",
		background: "#eef2ff",
		gradientStart: "#7c3aed",
		gradientEnd: "#2563eb",
		gradientColors: ["#7c3aed", "#2563eb"]
	},
	{
		name: "Sunset",
		foreground: "#7c2d12",
		background: "#fff7ed",
		gradientStart: "#f97316",
		gradientEnd: "#db2777",
		gradientColors: ["#f97316", "#db2777"]
	}
], ot = [
	{
		name: "Sunset",
		colors: [
			"#facc15",
			"#f97316",
			"#dc2626",
			"#7e22ce"
		]
	},
	{
		name: "Ocean",
		colors: [
			"#14b8a6",
			"#0284c7",
			"#1e3a8a"
		]
	},
	{
		name: "Neon",
		colors: [
			"#ec4899",
			"#8b5cf6",
			"#06b6d4"
		]
	}
];
function st({ style: e, qrType: t, logoFileName: n, logoSource: r, selectedLogoPreset: i, onChange: a, onLogoFileNameChange: o, onLogoSourceChange: s, onLogoPresetChange: c }) {
	let [u, d] = (0, l.useState)("colors"), [f, p] = (0, l.useState)([]), [m, h] = (0, l.useState)([]), g = e.gradientColors?.length >= 2 ? e.gradientColors : [e.gradientStart, e.gradientEnd], _ = (e, t) => {
		let n = g.map((n, r) => r === e ? t : n);
		a({
			gradientColors: n,
			gradientStart: n[0],
			gradientEnd: n[n.length - 1]
		});
	}, v = (e) => a({
		gradientColors: e,
		gradientStart: e[0],
		gradientEnd: e[e.length - 1]
	}), y = async (t) => {
		if (t === "logo-match" && e.logoDataUrl) try {
			let n = [await ut(e.logoDataUrl), ...g.slice(1)];
			a({
				gradientType: t,
				gradientColors: n,
				gradientStart: n[0],
				gradientEnd: n[n.length - 1]
			});
			return;
		} catch {}
		a({ gradientType: t });
	}, b = (e) => {
		let t = e.target.files?.[0];
		if (!t) return o(""), a({ logoDataUrl: "" });
		if (t.size > 2e6) return;
		o(t.name), c(""), s("upload");
		let n = new FileReader();
		n.onload = () => a({
			logoMode: "upload",
			logoDataUrl: String(n.result)
		}), n.onerror = () => {
			o(""), a({ logoDataUrl: "" });
		}, n.readAsDataURL(t);
	}, x = async (e) => {
		if (!nt.find((t) => t.id === e)) return;
		let t = await it(e);
		o(""), c(e), s("preset"), a({
			logoMode: "preset",
			logoDataUrl: t
		});
	}, S = (e = "none") => {
		o(""), c(""), s(e), a({
			logoMode: e,
			logoDataUrl: ""
		});
	}, C = () => {
		o(""), c(""), s("text"), w({});
	}, w = (t) => {
		let n = T({
			...e.textLogo,
			...t
		});
		p(n.warnings), a({
			logoMode: "text",
			textLogo: n.settings,
			logoSize: .2,
			logoPadding: n.settings.padding,
			logoBackgroundShape: ee(n.settings.backgroundShape),
			logoAutoContrast: n.settings.autoContrast,
			logoWhiteBorder: !1,
			logoSafeMode: !0,
			logoAutoEcc: !0
		});
	}, E = (t) => {
		let n = M({
			...e.frame,
			...t
		});
		h(n.warnings), a({ frame: n.settings });
	}, D = (t) => E({ gradient: {
		...e.frame.gradient,
		...t
	} });
	return /* @__PURE__ */ (0, P.jsxs)("div", {
		className: "qr-panel-content qr-style-sections",
		children: [
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-preset-heading",
				children: [/* @__PURE__ */ (0, P.jsx)("strong", { children: "Start with a look" }), /* @__PURE__ */ (0, P.jsx)("span", { children: "Then fine-tune every detail." })]
			}),
			/* @__PURE__ */ (0, P.jsx)("div", {
				className: "qr-look-presets",
				"aria-label": "Design presets",
				children: [
					{
						name: "Classic",
						shape: "square",
						color: "#17251c"
					},
					{
						name: "Rounded",
						shape: "rounded",
						color: "#17251c"
					},
					{
						name: "Forest",
						shape: "rounded",
						color: "#166534"
					}
				].map((e) => /* @__PURE__ */ (0, P.jsxs)("button", {
					type: "button",
					onClick: () => a({
						moduleShape: e.shape,
						moduleScale: 1,
						eyeShape: e.shape,
						foreground: e.color,
						eyeOuterColor: e.color,
						eyeInnerColor: e.color,
						background: "#ffffff",
						gradientType: "none",
						eyeGradientMode: "none",
						patternPreset: "classic",
						artistic: !1
					}),
					children: [/* @__PURE__ */ (0, P.jsxs)("svg", {
						viewBox: "0 0 29 29",
						"aria-hidden": "true",
						style: { color: e.color },
						children: [
							/* @__PURE__ */ (0, P.jsx)("rect", {
								width: "29",
								height: "29",
								rx: "2",
								fill: "white"
							}),
							[
								[3, 3],
								[19, 3],
								[3, 19]
							].map(([t, n]) => /* @__PURE__ */ (0, P.jsxs)("g", { children: [
								/* @__PURE__ */ (0, P.jsx)("rect", {
									x: t,
									y: n,
									width: "7",
									height: "7",
									rx: e.shape === "rounded" ? 2 : 0,
									fill: "currentColor"
								}),
								/* @__PURE__ */ (0, P.jsx)("rect", {
									x: t + 1,
									y: n + 1,
									width: "5",
									height: "5",
									rx: "1",
									fill: "white"
								}),
								/* @__PURE__ */ (0, P.jsx)("rect", {
									x: t + 2,
									y: n + 2,
									width: "3",
									height: "3",
									fill: "currentColor"
								})
							] }, `${t}-${n}`)),
							Array.from({ length: 121 }, (t, n) => {
								let r = 3 + n % 11 * 2, i = 3 + Math.floor(n / 11) * 2;
								return r < 11 && (i < 11 || i > 17) || r > 17 && i < 11 || (n * 7 + Math.floor(n / 11)) % 5 < 2 ? null : /* @__PURE__ */ (0, P.jsx)("rect", {
									x: r,
									y: i,
									width: "1.8",
									height: "1.8",
									rx: e.shape === "rounded" ? .6 : 0,
									fill: "currentColor"
								}, n);
							})
						]
					}), /* @__PURE__ */ (0, P.jsx)("strong", { children: e.name })]
				}, e.name))
			}),
			/* @__PURE__ */ (0, P.jsx)("div", {
				className: "qr-style-subtabs",
				role: "tablist",
				"aria-label": "Styling controls",
				children: [
					["colors", "Colors"],
					["dots", "QR Dots"],
					["eyes", "Corner Squares (Eyes)"],
					["logo", "Logo"],
					["frames", "Frames"],
					["effects", "Effects"]
				].map(([e, t]) => /* @__PURE__ */ (0, P.jsx)("button", {
					type: "button",
					role: "tab",
					"aria-selected": u === e,
					className: u === e ? "active" : "",
					onClick: () => d(e),
					children: t
				}, e))
			}),
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-style-subpanel",
				role: "tabpanel",
				children: [
					u === "colors" && /* @__PURE__ */ (0, P.jsx)(P.Fragment, { children: /* @__PURE__ */ (0, P.jsxs)(L, {
						title: "Colors",
						children: [
							/* @__PURE__ */ (0, P.jsxs)("div", {
								className: "qr-field-row",
								children: [/* @__PURE__ */ (0, P.jsx)(R, {
									label: "Foreground",
									value: e.foreground,
									onChange: (e) => a({ foreground: e })
								}), /* @__PURE__ */ (0, P.jsx)(R, {
									label: "Background",
									value: e.background,
									onChange: (e) => a({ background: e })
								})]
							}),
							/* @__PURE__ */ (0, P.jsxs)("label", {
								className: "qr-field",
								children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Gradient mode" }), /* @__PURE__ */ (0, P.jsxs)("select", {
									value: e.gradientType,
									onChange: (e) => void y(e.target.value),
									children: [
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "none",
											children: "None"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											className: "qr-option-heading",
											disabled: !0,
											children: "— Linear —"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "linear-lr",
											children: "Left → Right"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "linear-rl",
											children: "Right → Left"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "linear-tb",
											children: "Top → Bottom"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "linear-bt",
											children: "Bottom → Top"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "diagonal-down",
											children: "Diagonal ↘"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "diagonal-up",
											children: "Diagonal ↗"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											className: "qr-option-heading",
											disabled: !0,
											children: "— Radial —"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "radial-center",
											children: "Centered radial"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "radial-offset",
											children: "Offset radial"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "radial-ellipse",
											children: "Elliptical radial"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "spotlight",
											children: "Soft spotlight"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											className: "qr-option-heading",
											disabled: !0,
											children: "— Angular —"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "conic",
											children: "Conic sweep"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "pie",
											children: "Pie-slice gradient"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "spiral",
											children: "Spiral gradient"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											className: "qr-option-heading",
											disabled: !0,
											children: "— QR module —"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "module-horizontal",
											children: "Horizontal module gradient"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "module-vertical",
											children: "Vertical module gradient"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "module-radial",
											children: "Radial module gradient"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											className: "qr-option-heading",
											disabled: !0,
											children: "— Logo-aware —"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "logo-toward",
											children: "Gradient toward logo"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "logo-away",
											children: "Gradient away from logo"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "logo-match",
											children: "Logo color-matched"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "auto-contrast",
											children: "Auto-contrast gradient"
										})
									]
								})]
							}),
							e.gradientType !== "none" && /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [
								/* @__PURE__ */ (0, P.jsx)("div", {
									className: "qr-gradient-stops",
									children: g.map((e, t) => /* @__PURE__ */ (0, P.jsx)(R, {
										label: `Stop ${t + 1}`,
										value: e,
										onChange: (e) => _(t, e)
									}, t))
								}),
								/* @__PURE__ */ (0, P.jsxs)("div", {
									className: "qr-gradient-actions",
									children: [/* @__PURE__ */ (0, P.jsx)("button", {
										type: "button",
										disabled: g.length >= 6,
										onClick: () => v([...g, g[g.length - 1]]),
										children: "+ Add stop"
									}), /* @__PURE__ */ (0, P.jsx)("button", {
										type: "button",
										disabled: g.length <= 2,
										onClick: () => v(g.slice(0, -1)),
										children: "− Remove stop"
									})]
								}),
								/* @__PURE__ */ (0, P.jsx)("div", {
									className: "qr-gradient-presets",
									children: ot.map((e) => /* @__PURE__ */ (0, P.jsx)("button", {
										type: "button",
										onClick: () => v(e.colors),
										style: { background: `linear-gradient(90deg,${e.colors.join(",")})` },
										children: /* @__PURE__ */ (0, P.jsx)("span", { children: e.name })
									}, e.name))
								}),
								/* @__PURE__ */ (0, P.jsxs)("div", {
									className: "qr-field-row",
									children: [/* @__PURE__ */ (0, P.jsxs)("label", {
										className: "qr-field",
										children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Apply gradient to" }), /* @__PURE__ */ (0, P.jsxs)("select", {
											value: e.gradientTarget,
											onChange: (e) => a({ gradientTarget: e.target.value }),
											children: [
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "data",
													children: "Data modules"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "eyes",
													children: "Finder eyes region"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "data-eyes",
													children: "Data + eyes"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "quiet-zone",
													children: "Quiet zone"
												})
											]
										})]
									}), /* @__PURE__ */ (0, P.jsxs)("label", {
										className: "qr-field",
										children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Blend / texture" }), /* @__PURE__ */ (0, P.jsxs)("select", {
											value: e.gradientPattern,
											onChange: (e) => a({ gradientPattern: e.target.value }),
											children: [
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "none",
													children: "None"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													className: "qr-option-heading",
													disabled: !0,
													children: "— Noise —"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "perlin",
													children: "Perlin noise"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "fractal",
													children: "Fractal noise"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "grain",
													children: "Grainy"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "speckle",
													children: "Soft speckle"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													className: "qr-option-heading",
													disabled: !0,
													children: "— Patterns —"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "stripes",
													children: "Stripes"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "dots",
													children: "Dots"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "mesh",
													children: "Mesh"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "waves",
													children: "Waves"
												})
											]
										})]
									})]
								}),
								/* @__PURE__ */ (0, P.jsxs)("label", {
									className: "qr-field",
									children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Eye-specific gradient" }), /* @__PURE__ */ (0, P.jsxs)("select", {
										value: e.eyeGradientMode,
										onChange: (e) => a({ eyeGradientMode: e.target.value }),
										children: [
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "none",
												children: "Use eye colors"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "whole",
												children: "Eye-only gradient"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "ring",
												children: "Eye ring gradient"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "pupil",
												children: "Eye pupil gradient"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "dual",
												children: "Dual-tone eyes"
											})
										]
									})]
								})
							] }),
							/* @__PURE__ */ (0, P.jsx)("div", {
								className: "qr-theme-grid",
								children: at.map((e) => /* @__PURE__ */ (0, P.jsxs)("button", {
									type: "button",
									onClick: () => a(e),
									children: [/* @__PURE__ */ (0, P.jsx)("i", { style: { background: `linear-gradient(135deg, ${e.gradientStart}, ${e.gradientEnd})` } }), e.name]
								}, e.name))
							})
						]
					}) }),
					u === "dots" && /* @__PURE__ */ (0, P.jsx)(P.Fragment, { children: /* @__PURE__ */ (0, P.jsxs)(L, {
						title: "Modules (QR dots)",
						children: [
							/* @__PURE__ */ (0, P.jsxs)("label", {
								className: "qr-field",
								children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Shape" }), /* @__PURE__ */ (0, P.jsxs)("select", {
									value: e.moduleShape,
									onChange: (e) => a({ moduleShape: e.target.value }),
									children: [
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "square",
											children: "Square"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "rounded",
											children: "Rounded"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "circle",
											children: "Circle"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "hexagon",
											children: "Hexagon"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "diamond",
											children: "Diamond"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "soft-diamond",
											children: "Soft Diamond"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "capsule",
											children: "Capsule"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "squircle",
											children: "Squircle"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "octagon",
											children: "Octagon"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "teardrop",
											children: "Teardrop"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "triangle-up",
											children: "Triangle (up)"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "triangle-down",
											children: "Triangle (down)"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "star-four",
											children: "Star (4-point)"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "concentric",
											children: "Concentric circle"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, P.jsx)(lt, {
								label: "Module size",
								value: e.moduleScale,
								min: .5,
								max: 1,
								step: .02,
								output: `${Math.round(e.moduleScale * 100)}%`,
								onChange: (e) => a({ moduleScale: e })
							}),
							/* @__PURE__ */ (0, P.jsxs)("label", {
								className: "qr-field",
								children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Pattern preset" }), /* @__PURE__ */ (0, P.jsxs)("select", {
									value: e.patternPreset,
									onChange: (e) => a({
										patternPreset: e.target.value,
										artistic: e.target.value === "artistic"
									}),
									children: [
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "classic",
											children: "Classic grid"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "soft",
											children: "Soft dots"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "tech",
											children: "Tech matrix"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "artistic",
											children: "Artistic mask"
										})
									]
								})]
							})
						]
					}) }),
					u === "eyes" && /* @__PURE__ */ (0, P.jsx)(P.Fragment, { children: /* @__PURE__ */ (0, P.jsxs)(L, {
						title: "Eyes (corner squares)",
						children: [
							/* @__PURE__ */ (0, P.jsxs)("label", {
								className: "qr-field",
								children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Eye shape" }), /* @__PURE__ */ (0, P.jsxs)("select", {
									value: e.eyeShape,
									onChange: (e) => a({ eyeShape: e.target.value }),
									children: [
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "square",
											children: "Square"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "rounded",
											children: "Rounded"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "circle",
											children: "Circle"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "leaf",
											children: "Leaf"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "hexagon",
											children: "Hexagon"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "diamond",
											children: "Diamond"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "capsule",
											children: "Capsule"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "teardrop",
											children: "Teardrop"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "star-four",
											children: "Star (4-point)"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "triangle-up",
											children: "Triangle (up)"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "triangle-down",
											children: "Triangle (down)"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "honeycomb",
											children: "Honeycomb"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "pebble",
											children: "Pebble / blob"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "concentric",
											children: "Concentric circle"
										}),
										/* @__PURE__ */ (0, P.jsx)("option", {
											value: "heart",
											children: "Heart"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, P.jsxs)("div", {
								className: "qr-field-row",
								children: [/* @__PURE__ */ (0, P.jsx)(R, {
									label: "Outer",
									value: e.eyeOuterColor,
									onChange: (e) => a({ eyeOuterColor: e })
								}), /* @__PURE__ */ (0, P.jsx)(R, {
									label: "Inner",
									value: e.eyeInnerColor,
									onChange: (e) => a({ eyeInnerColor: e })
								})]
							}),
							/* @__PURE__ */ (0, P.jsxs)("div", {
								className: "qr-eye-presets",
								children: [
									/* @__PURE__ */ (0, P.jsx)("button", {
										type: "button",
										onClick: () => a({
											eyeShape: "square",
											eyeOuterColor: e.foreground,
											eyeInnerColor: e.foreground
										}),
										children: "Classic"
									}),
									/* @__PURE__ */ (0, P.jsx)("button", {
										type: "button",
										onClick: () => a({
											eyeShape: "rounded",
											eyeOuterColor: e.gradientStart,
											eyeInnerColor: e.gradientEnd
										}),
										children: "Duo"
									}),
									/* @__PURE__ */ (0, P.jsx)("button", {
										type: "button",
										onClick: () => a({ eyeShape: "circle" }),
										children: "Orbit"
									})
								]
							})
						]
					}) }),
					u === "logo" && /* @__PURE__ */ (0, P.jsx)(P.Fragment, { children: /* @__PURE__ */ (0, P.jsxs)(L, {
						title: "Logo",
						children: [
							/* @__PURE__ */ (0, P.jsxs)("div", {
								className: "qr-logo-source",
								role: "group",
								"aria-label": "Logo source",
								children: [
									/* @__PURE__ */ (0, P.jsx)("button", {
										type: "button",
										className: r === "none" ? "active" : "",
										onClick: () => S("none"),
										children: "None"
									}),
									/* @__PURE__ */ (0, P.jsx)("button", {
										type: "button",
										className: r === "upload" ? "active" : "",
										onClick: () => {
											r !== "upload" && S("upload");
										},
										children: "Upload custom"
									}),
									/* @__PURE__ */ (0, P.jsx)("button", {
										type: "button",
										className: r === "preset" ? "active" : "",
										onClick: () => {
											r !== "preset" && S("preset");
										},
										children: "Preset icons"
									}),
									/* @__PURE__ */ (0, P.jsx)("button", {
										type: "button",
										className: r === "text" ? "active" : "",
										onClick: C,
										children: "Text logo"
									})
								]
							}),
							r === "upload" && /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [/* @__PURE__ */ (0, P.jsxs)("label", {
								className: "qr-field qr-logo-upload",
								children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Choose logo" }), /* @__PURE__ */ (0, P.jsx)("input", {
									type: "file",
									accept: "image/png,image/jpeg,image/webp",
									onChange: b
								})]
							}), n && /* @__PURE__ */ (0, P.jsxs)("p", {
								className: "qr-selected-file",
								"aria-live": "polite",
								children: ["Selected: ", /* @__PURE__ */ (0, P.jsx)("strong", { children: n })]
							})] }),
							r === "preset" && /* @__PURE__ */ (0, P.jsx)("div", {
								className: "qr-preset-logo-grid",
								"aria-label": "Preset icons",
								children: nt.map((e) => /* @__PURE__ */ (0, P.jsxs)("button", {
									type: "button",
									className: i === e.id ? "active" : "",
									"aria-pressed": i === e.id,
									onClick: () => void x(e.id),
									title: `${e.category}: ${e.label}`,
									children: [
										/* @__PURE__ */ (0, P.jsx)("img", {
											src: rt(e),
											alt: ""
										}),
										/* @__PURE__ */ (0, P.jsx)("span", { children: e.label }),
										e.recommendedFor.includes(t) && /* @__PURE__ */ (0, P.jsx)("small", { children: "Recommended" })
									]
								}, e.id))
							}),
							r === "text" && /* @__PURE__ */ (0, P.jsxs)("div", {
								className: "qr-text-logo-options",
								children: [
									/* @__PURE__ */ (0, P.jsxs)("label", {
										className: "qr-field",
										children: [
											/* @__PURE__ */ (0, P.jsx)("span", { children: "Text" }),
											/* @__PURE__ */ (0, P.jsx)("input", {
												value: e.textLogo.text,
												maxLength: 12,
												inputMode: "text",
												autoCapitalize: "characters",
												onChange: (e) => w({ text: e.target.value }),
												placeholder: "MENU"
											}),
											/* @__PURE__ */ (0, P.jsxs)("small", { children: [e.textLogo.text.length, "/12 characters · A-Z, 0-9, spaces, period, dash, underscore"] })
										]
									}),
									/* @__PURE__ */ (0, P.jsxs)("div", {
										className: "qr-field-row",
										children: [/* @__PURE__ */ (0, P.jsxs)("label", {
											className: "qr-field",
											children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Font family" }), /* @__PURE__ */ (0, P.jsxs)("select", {
												value: e.textLogo.fontFamily,
												onChange: (e) => w({ fontFamily: e.target.value }),
												children: [
													/* @__PURE__ */ (0, P.jsx)("option", { children: "Segoe UI" }),
													/* @__PURE__ */ (0, P.jsx)("option", { children: "Georgia" }),
													/* @__PURE__ */ (0, P.jsx)("option", { children: "Courier New" }),
													/* @__PURE__ */ (0, P.jsx)("option", { children: "Trebuchet MS" }),
													/* @__PURE__ */ (0, P.jsx)("option", { children: "Impact" })
												]
											})]
										}), /* @__PURE__ */ (0, P.jsxs)("label", {
											className: "qr-field",
											children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Font weight" }), /* @__PURE__ */ (0, P.jsxs)("select", {
												value: e.textLogo.fontWeight,
												onChange: (e) => w({ fontWeight: e.target.value }),
												children: [
													/* @__PURE__ */ (0, P.jsx)("option", {
														value: "regular",
														children: "Regular"
													}),
													/* @__PURE__ */ (0, P.jsx)("option", {
														value: "medium",
														children: "Medium"
													}),
													/* @__PURE__ */ (0, P.jsx)("option", {
														value: "semibold",
														children: "Semibold"
													}),
													/* @__PURE__ */ (0, P.jsx)("option", {
														value: "bold",
														children: "Bold"
													})
												]
											})]
										})]
									}),
									/* @__PURE__ */ (0, P.jsx)(lt, {
										label: "Font size",
										value: e.textLogo.fontSize,
										min: 10,
										max: 128,
										step: 1,
										output: `${e.textLogo.fontSize}px`,
										onChange: (e) => w({ fontSize: e })
									}),
									/* @__PURE__ */ (0, P.jsxs)("div", {
										className: "qr-field-row",
										children: [/* @__PURE__ */ (0, P.jsx)(R, {
											label: "Text color",
											value: e.textLogo.color,
											onChange: (e) => w({
												color: e,
												autoContrast: !1
											})
										}), /* @__PURE__ */ (0, P.jsx)(R, {
											label: "Background",
											value: e.textLogo.backgroundColor,
											onChange: (e) => w({ backgroundColor: e })
										})]
									}),
									/* @__PURE__ */ (0, P.jsxs)("label", {
										className: "qr-field",
										children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Background shape" }), /* @__PURE__ */ (0, P.jsxs)("select", {
											value: e.textLogo.backgroundShape,
											onChange: (e) => w({ backgroundShape: e.target.value }),
											children: [
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "circle",
													children: "Circle"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "rounded-square",
													children: "Rounded square"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "squircle",
													children: "Squircle"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "capsule",
													children: "Capsule"
												})
											]
										})]
									}),
									/* @__PURE__ */ (0, P.jsx)(lt, {
										label: "Background padding",
										value: e.textLogo.padding,
										min: .1,
										max: .2,
										step: .01,
										output: `${Math.round(e.textLogo.padding * 100)}%`,
										onChange: (e) => w({ padding: e })
									}),
									/* @__PURE__ */ (0, P.jsx)(ct, {
										label: "Auto contrast",
										checked: e.textLogo.autoContrast,
										onChange: (e) => w({ autoContrast: e })
									}),
									/* @__PURE__ */ (0, P.jsx)("p", {
										className: "qr-help",
										children: "Auto contrast defaults to on. Choosing a text color turns it off; turn it back on to automatically use black or white. Text remains centered in a protected logo zone, and error correction is boosted to Q."
									}),
									(f.length > 0 || e.textLogo.text.length > 8) && /* @__PURE__ */ (0, P.jsx)("div", {
										className: "qr-text-logo-warning",
										role: "status",
										children: [.../* @__PURE__ */ new Set([...f, ...e.textLogo.text.length > 8 ? ["Long text may reduce clarity."] : []])].map((e) => /* @__PURE__ */ (0, P.jsx)("p", { children: e }, e))
									})
								]
							}),
							r !== "text" && e.logoDataUrl && /* @__PURE__ */ (0, P.jsx)("button", {
								type: "button",
								className: "qr-quiet-button qr-remove-logo",
								onClick: () => S(r),
								children: "Remove logo"
							}),
							r !== "text" && !e.logoDataUrl && /* @__PURE__ */ (0, P.jsx)("p", {
								className: "qr-logo-prompt",
								children: "Choose a preset icon, upload a logo, or select Text logo to enable logo settings."
							}),
							r !== "text" && /* @__PURE__ */ (0, P.jsxs)("fieldset", {
								className: "qr-logo-options",
								disabled: !e.logoDataUrl,
								"aria-label": "Logo settings",
								children: [
									/* @__PURE__ */ (0, P.jsx)(lt, {
										label: "Logo size",
										value: e.logoSize,
										min: .08,
										max: .3,
										step: .01,
										output: `${Math.round(e.logoSize * 100)}%`,
										onChange: (e) => a({ logoSize: e })
									}),
									/* @__PURE__ */ (0, P.jsx)(lt, {
										label: "Logo padding",
										value: e.logoPadding,
										min: 0,
										max: .25,
										step: .01,
										output: `${Math.round(e.logoPadding * 100)}%`,
										onChange: (e) => a({ logoPadding: e })
									}),
									/* @__PURE__ */ (0, P.jsxs)("label", {
										className: "qr-field",
										children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Logo background shape" }), /* @__PURE__ */ (0, P.jsxs)("select", {
											value: e.logoBackgroundShape,
											onChange: (e) => a({ logoBackgroundShape: e.target.value }),
											children: [
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "square",
													children: "Square"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "rounded",
													children: "Rounded square"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "squircle",
													children: "Squircle"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "circle",
													children: "Circle"
												})
											]
										})]
									}),
									/* @__PURE__ */ (0, P.jsx)(ct, {
										label: "Auto contrast",
										checked: e.logoAutoContrast,
										onChange: (e) => a({ logoAutoContrast: e })
									}),
									/* @__PURE__ */ (0, P.jsx)(ct, {
										label: "White safety border",
										checked: e.logoWhiteBorder,
										onChange: (e) => a({ logoWhiteBorder: e })
									}),
									/* @__PURE__ */ (0, P.jsx)(ct, {
										label: "Safe mode (protect ECC)",
										checked: e.logoSafeMode,
										onChange: (e) => a({ logoSafeMode: e })
									}),
									/* @__PURE__ */ (0, P.jsx)(ct, {
										label: "Auto-adjust error correction",
										checked: e.logoAutoEcc,
										onChange: (e) => a({ logoAutoEcc: e })
									}),
									/* @__PURE__ */ (0, P.jsx)("p", {
										className: "qr-help",
										children: "The white safety border clears one extra module around the logo. Auto contrast only controls the backdrop directly beneath it."
									})
								]
							})
						]
					}) }),
					u === "frames" && /* @__PURE__ */ (0, P.jsx)(P.Fragment, { children: /* @__PURE__ */ (0, P.jsxs)(L, {
						title: "Frames",
						children: [/* @__PURE__ */ (0, P.jsx)(ct, {
							label: "Enable frame",
							checked: e.frame.enabled,
							onChange: (e) => E({ enabled: e })
						}), e.frame.enabled && /* @__PURE__ */ (0, P.jsxs)("div", {
							className: "qr-frame-options",
							children: [
								/* @__PURE__ */ (0, P.jsx)("div", {
									className: "qr-frame-presets",
									"aria-label": "Frame presets",
									children: le.map((t) => /* @__PURE__ */ (0, P.jsx)("button", {
										type: "button",
										className: e.frame.preset === t.id ? "active" : "",
										onClick: () => E({
											...t.patch,
											preset: t.id
										}),
										children: t.label
									}, t.id))
								}),
								/* @__PURE__ */ (0, P.jsxs)("label", {
									className: "qr-field",
									children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Frame style" }), /* @__PURE__ */ (0, P.jsxs)("select", {
										value: e.frame.style,
										onChange: (e) => E({
											style: e.target.value,
											preset: null
										}),
										children: [
											/* @__PURE__ */ (0, P.jsx)("option", {
												className: "qr-option-heading",
												disabled: !0,
												children: "Basic frames"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "rectangle",
												children: "Rectangle"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "rounded-rectangle",
												children: "Rounded rectangle"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "squircle",
												children: "Squircle"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "capsule",
												children: "Capsule"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "circle",
												children: "Circle"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												className: "qr-option-heading",
												disabled: !0,
												children: "Decorative frames"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "outline",
												children: "Outline"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "thick-border",
												children: "Thick border"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "glow",
												children: "Glow"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "shadow",
												children: "Shadow"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "gradient-border",
												children: "Gradient border"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "pattern-border",
												children: "Pattern border"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												className: "qr-option-heading",
												disabled: !0,
												children: "Icon frames"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "arrow-left",
												children: "Arrow left"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "arrow-right",
												children: "Arrow right"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "arrow-down",
												children: "Arrow down"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "camera",
												children: "Camera"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "phone",
												children: "Phone"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "tap-icon",
												children: "Tap icon"
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, P.jsx)(lt, {
									label: "Thickness",
									value: e.frame.thickness,
									min: .02,
									max: .15,
									step: .01,
									output: `${Math.round(e.frame.thickness * 100)}%`,
									onChange: (e) => E({
										thickness: e,
										preset: null
									})
								}),
								/* @__PURE__ */ (0, P.jsx)(lt, {
									label: "QR separation",
									value: e.frame.padding,
									min: .06,
									max: .12,
									step: .01,
									output: `${Math.round(e.frame.padding * 100)}%`,
									onChange: (e) => E({
										padding: e,
										preset: null
									})
								}),
								/* @__PURE__ */ (0, P.jsx)(lt, {
									label: "Corner radius",
									value: e.frame.cornerRadius,
									min: 0,
									max: .5,
									step: .01,
									output: `${Math.round(e.frame.cornerRadius * 100)}%`,
									onChange: (e) => E({
										cornerRadius: e,
										preset: null
									})
								}),
								/* @__PURE__ */ (0, P.jsx)(R, {
									label: "Frame color (solid)",
									value: e.frame.color,
									onChange: (t) => E({
										color: t,
										gradient: {
											...e.frame.gradient,
											enabled: !1
										},
										style: e.frame.style === "gradient-border" ? "rounded-rectangle" : e.frame.style,
										preset: null
									})
								}),
								/* @__PURE__ */ (0, P.jsx)(ct, {
									label: "Gradient border",
									checked: e.frame.gradient.enabled,
									onChange: (e) => D({ enabled: e })
								}),
								e.frame.gradient.enabled && /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [
									/* @__PURE__ */ (0, P.jsxs)("div", {
										className: "qr-field-row",
										children: [/* @__PURE__ */ (0, P.jsxs)("label", {
											className: "qr-field",
											children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Gradient type" }), /* @__PURE__ */ (0, P.jsxs)("select", {
												value: e.frame.gradient.type,
												onChange: (e) => D({ type: e.target.value }),
												children: [
													/* @__PURE__ */ (0, P.jsx)("option", {
														value: "linear",
														children: "Linear"
													}),
													/* @__PURE__ */ (0, P.jsx)("option", {
														value: "radial",
														children: "Radial"
													}),
													/* @__PURE__ */ (0, P.jsx)("option", {
														value: "conic",
														children: "Conic"
													})
												]
											})]
										}), /* @__PURE__ */ (0, P.jsxs)("label", {
											className: "qr-field",
											children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Direction" }), /* @__PURE__ */ (0, P.jsxs)("select", {
												value: e.frame.gradient.direction,
												onChange: (e) => D({ direction: e.target.value }),
												children: [
													/* @__PURE__ */ (0, P.jsx)("option", {
														value: "top-bottom",
														children: "Top → bottom"
													}),
													/* @__PURE__ */ (0, P.jsx)("option", {
														value: "left-right",
														children: "Left → right"
													}),
													/* @__PURE__ */ (0, P.jsx)("option", {
														value: "diagonal",
														children: "Diagonal"
													})
												]
											})]
										})]
									}),
									/* @__PURE__ */ (0, P.jsx)("div", {
										className: "qr-gradient-stops",
										children: e.frame.gradient.stops.map((t, n) => /* @__PURE__ */ (0, P.jsx)(R, {
											label: `Stop ${n + 1}`,
											value: t,
											onChange: (t) => D({ stops: e.frame.gradient.stops.map((e, r) => r === n ? t : e) })
										}, n))
									}),
									/* @__PURE__ */ (0, P.jsxs)("div", {
										className: "qr-gradient-actions",
										children: [/* @__PURE__ */ (0, P.jsx)("button", {
											type: "button",
											disabled: e.frame.gradient.stops.length >= 6,
											onClick: () => D({ stops: [...e.frame.gradient.stops, e.frame.gradient.stops.at(-1) || e.frame.color] }),
											children: "+ Add stop"
										}), /* @__PURE__ */ (0, P.jsx)("button", {
											type: "button",
											disabled: e.frame.gradient.stops.length <= 2,
											onClick: () => D({ stops: e.frame.gradient.stops.slice(0, -1) }),
											children: "− Remove stop"
										})]
									})
								] }),
								/* @__PURE__ */ (0, P.jsxs)("label", {
									className: "qr-field",
									children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Border pattern" }), /* @__PURE__ */ (0, P.jsxs)("select", {
										value: e.frame.pattern,
										onChange: (t) => E({
											pattern: t.target.value,
											style: t.target.value === "none" ? e.frame.style : "pattern-border",
											preset: null
										}),
										children: [
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "none",
												children: "None"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "dots",
												children: "Dots"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "stripes",
												children: "Stripes"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "waves",
												children: "Waves"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "mesh",
												children: "Mesh"
											}),
											/* @__PURE__ */ (0, P.jsx)("option", {
												value: "grid",
												children: "Grid"
											})
										]
									})]
								}),
								e.frame.pattern !== "none" && /* @__PURE__ */ (0, P.jsx)(lt, {
									label: "Pattern opacity",
									value: e.frame.patternOpacity,
									min: .1,
									max: .4,
									step: .01,
									output: `${Math.round(e.frame.patternOpacity * 100)}%`,
									onChange: (e) => E({ patternOpacity: e })
								}),
								/* @__PURE__ */ (0, P.jsxs)("label", {
									className: "qr-field",
									children: [
										/* @__PURE__ */ (0, P.jsx)("span", { children: "Frame text" }),
										/* @__PURE__ */ (0, P.jsx)("input", {
											value: e.frame.text,
											maxLength: 12,
											autoCapitalize: "characters",
											onChange: (e) => E({
												text: e.target.value,
												preset: null
											}),
											placeholder: "SCAN ME"
										}),
										/* @__PURE__ */ (0, P.jsxs)("small", { children: [e.frame.text.length, "/12 characters · A-Z, 0-9, spaces, period, dash, underscore"] })
									]
								}),
								/* @__PURE__ */ (0, P.jsxs)("div", {
									className: "qr-field-row",
									children: [/* @__PURE__ */ (0, P.jsxs)("label", {
										className: "qr-field",
										children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Text font" }), /* @__PURE__ */ (0, P.jsxs)("select", {
											value: e.frame.textFont,
											onChange: (e) => E({
												textFont: e.target.value,
												preset: null
											}),
											children: [
												/* @__PURE__ */ (0, P.jsx)("option", { children: "Segoe UI" }),
												/* @__PURE__ */ (0, P.jsx)("option", { children: "Georgia" }),
												/* @__PURE__ */ (0, P.jsx)("option", { children: "Courier New" }),
												/* @__PURE__ */ (0, P.jsx)("option", { children: "Trebuchet MS" }),
												/* @__PURE__ */ (0, P.jsx)("option", { children: "Impact" })
											]
										})]
									}), /* @__PURE__ */ (0, P.jsxs)("label", {
										className: "qr-field",
										children: [/* @__PURE__ */ (0, P.jsx)("span", { children: "Text weight" }), /* @__PURE__ */ (0, P.jsxs)("select", {
											value: e.frame.textWeight,
											onChange: (e) => E({
												textWeight: e.target.value,
												preset: null
											}),
											children: [
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "regular",
													children: "Regular"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "medium",
													children: "Medium"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "semibold",
													children: "Semibold"
												}),
												/* @__PURE__ */ (0, P.jsx)("option", {
													value: "bold",
													children: "Bold"
												})
											]
										})]
									})]
								}),
								/* @__PURE__ */ (0, P.jsx)(lt, {
									label: "Text size",
									value: e.frame.textSize,
									min: 10,
									max: 40,
									step: 1,
									output: `${e.frame.textSize}px`,
									onChange: (e) => E({
										textSize: e,
										preset: null
									})
								}),
								/* @__PURE__ */ (0, P.jsx)(R, {
									label: "Text color",
									value: e.frame.textColor,
									onChange: (e) => E({
										textColor: e,
										autoContrast: !1,
										preset: null
									})
								}),
								/* @__PURE__ */ (0, P.jsx)(ct, {
									label: "Auto contrast",
									checked: e.frame.autoContrast,
									onChange: (e) => E({
										autoContrast: e,
										preset: null
									})
								}),
								/* @__PURE__ */ (0, P.jsx)("p", {
									className: "qr-help",
									children: "Frames are centered outside the QR quiet zone. Error correction is automatically boosted to Q."
								}),
								m.length > 0 && /* @__PURE__ */ (0, P.jsx)("div", {
									className: "qr-text-logo-warning",
									role: "status",
									children: m.map((e) => /* @__PURE__ */ (0, P.jsx)("p", { children: e }, e))
								})
							]
						})]
					}) }),
					u === "effects" && /* @__PURE__ */ (0, P.jsx)(P.Fragment, { children: /* @__PURE__ */ (0, P.jsx)(L, {
						title: "Effects",
						children: /* @__PURE__ */ (0, P.jsxs)("div", {
							className: "qr-toggle-grid",
							children: [
								/* @__PURE__ */ (0, P.jsx)(ct, {
									label: "Drop shadow",
									checked: e.dropShadow,
									onChange: (e) => a({ dropShadow: e })
								}),
								/* @__PURE__ */ (0, P.jsx)(ct, {
									label: "Glow",
									checked: e.glow,
									onChange: (e) => a({ glow: e })
								}),
								/* @__PURE__ */ (0, P.jsx)(ct, {
									label: "Noise",
									checked: e.noise,
									onChange: (e) => a({ noise: e })
								}),
								/* @__PURE__ */ (0, P.jsx)(ct, {
									label: "Texture overlay",
									checked: e.texture,
									onChange: (e) => a({ texture: e })
								}),
								/* @__PURE__ */ (0, P.jsx)(ct, {
									label: "Artistic QR mode",
									checked: e.artistic,
									onChange: (e) => a({ artistic: e })
								})
							]
						})
					}) })
				]
			})
		]
	});
}
function L({ title: e, children: t }) {
	return /* @__PURE__ */ (0, P.jsxs)("section", {
		className: "qr-style-section",
		children: [/* @__PURE__ */ (0, P.jsx)("h3", { children: e }), t]
	});
}
function R({ label: e, value: t, disabled: n = !1, onChange: r }) {
	return /* @__PURE__ */ (0, P.jsxs)("label", {
		className: "qr-color-field",
		children: [/* @__PURE__ */ (0, P.jsx)("span", { children: e }), /* @__PURE__ */ (0, P.jsxs)("div", { children: [/* @__PURE__ */ (0, P.jsx)("input", {
			type: "color",
			value: t,
			disabled: n,
			onChange: (e) => r(e.target.value)
		}), /* @__PURE__ */ (0, P.jsx)("code", { children: t })] })]
	});
}
function ct({ label: e, checked: t, onChange: n }) {
	return /* @__PURE__ */ (0, P.jsxs)("label", {
		className: "qr-switch",
		children: [
			/* @__PURE__ */ (0, P.jsx)("input", {
				type: "checkbox",
				checked: t,
				onChange: (e) => n(e.target.checked)
			}),
			/* @__PURE__ */ (0, P.jsx)("span", { "aria-hidden": "true" }),
			e
		]
	});
}
function lt({ label: e, value: t, min: n, max: r, step: i, output: a, onChange: o }) {
	return /* @__PURE__ */ (0, P.jsxs)("label", {
		className: "qr-range",
		children: [/* @__PURE__ */ (0, P.jsxs)("span", { children: [e, /* @__PURE__ */ (0, P.jsx)("output", { children: a })] }), /* @__PURE__ */ (0, P.jsx)("input", {
			type: "range",
			value: t,
			min: n,
			max: r,
			step: i,
			onChange: (e) => o(Number(e.target.value))
		})]
	});
}
async function ut(e) {
	let t = new Image();
	t.src = e, await t.decode();
	let n = document.createElement("canvas");
	n.width = 32, n.height = 32;
	let r = n.getContext("2d", { willReadFrequently: !0 });
	if (!r) throw Error("Logo color sampling is unavailable");
	r.drawImage(t, 0, 0, 32, 32);
	let i = r.getImageData(0, 0, 32, 32).data, a = 0, o = 0, s = 0, c = 0;
	for (let e = 0; e < i.length; e += 4) {
		let t = i[e + 3] / 255;
		t < .1 || i[e] > 245 && i[e + 1] > 245 && i[e + 2] > 245 || (a += i[e] * t, o += i[e + 1] * t, s += i[e + 2] * t, c += t);
	}
	if (!c) throw Error("Logo has no visible color");
	return `#${[
		a,
		o,
		s
	].map((e) => Math.round(e / c).toString(16).padStart(2, "0")).join("")}`;
}
//#endregion
//#region apps/qr-studio/src/utils/batchCsvStorage.ts
var dt = "monkeytactics.qrStudio.batchCsv.v1";
function ft(e = localStorage) {
	try {
		let t = JSON.parse(e.getItem("monkeytactics.qrStudio.batchCsv.v1") ?? "null");
		return !t || typeof t.fileName != "string" || typeof t.contents != "string" ? null : {
			fileName: t.fileName,
			contents: t.contents
		};
	} catch {
		return null;
	}
}
function pt(e, t = localStorage) {
	t.setItem(dt, JSON.stringify(e));
}
function mt(e = localStorage) {
	e.removeItem(dt);
}
//#endregion
//#region apps/qr-studio/src/utils/batchZip.ts
async function ht(e, t) {
	let n = new TextEncoder(), r = [], i = [], a = 0;
	for (let o = 0; o < e.length; o += 1) {
		let s = e[o], c = n.encode(s.name), l = await _t(s.bytes), u = new Uint8Array(30 + c.length + s.bytes.length), d = new DataView(u.buffer);
		d.setUint32(0, 67324752, !0), d.setUint16(4, 20, !0), d.setUint16(6, 2048, !0), d.setUint16(8, 0, !0), d.setUint32(14, l, !0), d.setUint32(18, s.bytes.length, !0), d.setUint32(22, s.bytes.length, !0), d.setUint16(26, c.length, !0), u.set(c, 30), u.set(s.bytes, 30 + c.length), r.push(u);
		let f = new Uint8Array(46 + c.length), p = new DataView(f.buffer);
		p.setUint32(0, 33639248, !0), p.setUint16(4, 20, !0), p.setUint16(6, 20, !0), p.setUint16(8, 2048, !0), p.setUint32(16, l, !0), p.setUint32(20, s.bytes.length, !0), p.setUint32(24, s.bytes.length, !0), p.setUint16(28, c.length, !0), p.setUint32(42, a, !0), f.set(c, 46), i.push(f), a += u.length, t?.(o + 1, e.length), await vt();
	}
	let o = i.reduce((e, t) => e + t.length, 0), s = /* @__PURE__ */ new Uint8Array(22), c = new DataView(s.buffer);
	return c.setUint32(0, 101010256, !0), c.setUint16(8, e.length, !0), c.setUint16(10, e.length, !0), c.setUint32(12, o, !0), c.setUint32(16, a, !0), await vt(), gt([
		...r,
		...i,
		s
	]);
}
function gt(e) {
	let t = new Uint8Array(e.reduce((e, t) => e + t.length, 0)), n = 0;
	for (let r of e) t.set(r, n), n += r.length;
	return t;
}
async function _t(e) {
	let t = 4294967295;
	for (let n = 0; n < e.length; n += 1) {
		t ^= e[n];
		for (let e = 0; e < 8; e += 1) t = t >>> 1 ^ 3988292384 & -(t & 1);
		n > 0 && n % 262144 == 0 && await vt();
	}
	return (t ^ 4294967295) >>> 0;
}
function vt() {
	return new Promise((e) => setTimeout(e, 0));
}
//#endregion
//#region apps/qr-studio/src/utils/csvBatch.ts
function yt(e) {
	return bt(e).items;
}
function bt(e) {
	let t = xt(e.replace(/^\uFEFF/, ""));
	if (!t.length) throw Error("CSV file is empty. Add name,data headers and at least one row.");
	let n = t[0].map((e) => e.trim().toLowerCase()), r = n.filter((e, t) => e && n.indexOf(e) !== t);
	if (r.length) throw Error(`CSV contains duplicate column headers: ${[...new Set(r)].join(", ")}.`);
	let i = n.indexOf("name"), a = n.indexOf("data"), o = n.indexOf("text_logo"), s = n.indexOf("frame_text"), c = n.indexOf("frame_color"), l = n.indexOf("frame_style"), u = [i < 0 ? "name" : "", a < 0 ? "data" : ""].filter(Boolean);
	if (u.length) throw Error(`CSV must include ${u.join(" and ")} ${u.length === 1 ? "column" : "columns"}. Required headers are name,data.`);
	let d = /* @__PURE__ */ new Set([
		"name",
		"data",
		"text_logo",
		"frame_text",
		"frame_color",
		"frame_style"
	]), f = n.filter((e) => e && !d.has(e)), p = [], m = [], h = [], g = /* @__PURE__ */ new Set(), _ = 0, v = 0;
	if (t.slice(1).forEach((e, t) => {
		if (e.length > n.length) throw Error(`CSV row ${t + 2} has more values than headers. Quote data containing commas.`);
		let r = e[i]?.trim() || `qrcode-${t + 1}`, u = e[a] ?? "";
		if (!u.trim()) {
			_ += 1;
			return;
		}
		let d = o >= 0 ? e[o]?.trim() ?? "" : "", f;
		if (d) {
			let e = T({ text: d });
			f = e.settings.text || void 0, (e.warnings.length || !f) && m.push({
				row: t + 2,
				name: r,
				messages: [...e.warnings, ...f ? [] : ["The text logo override was ignored because no valid characters remained."]]
			});
		}
		let y = s >= 0 ? e[s]?.trim() ?? "" : "", b = c >= 0 ? e[c]?.trim() ?? "" : "", x = l >= 0 ? e[l]?.trim().toLowerCase() ?? "" : "", S, C, w, E = [];
		if (y) {
			let e = M({ text: y });
			S = e.settings.text || void 0, E.push(...e.warnings), S || E.push("The frame text override was ignored because no valid characters remained.");
		}
		b && (/^#[0-9A-F]{6}$/i.test(b) ? C = b.toUpperCase() : E.push("Frame color must use six-digit hex notation, such as #000000; the override was ignored.")), x && (oe.includes(x) ? w = x : E.push(`Unknown frame style “${x}”; the override was ignored.`)), E.length && h.push({
			row: t + 2,
			name: r,
			messages: [...new Set(E)]
		});
		let ee = `${r.toLocaleLowerCase()}\u0000${u}\u0000${f ?? ""}\u0000${S ?? ""}\u0000${C ?? ""}\u0000${w ?? ""}`;
		if (g.has(ee)) {
			v += 1;
			return;
		}
		g.add(ee), p.push({
			name: r,
			data: u,
			...f ? { textLogo: f } : {},
			...S ? { frameText: S } : {},
			...C ? { frameColor: C } : {},
			...w ? { frameStyle: w } : {}
		});
	}), p.length > 250) throw Error("Batch CSV files are limited to 250 QR codes after cleanup.");
	return {
		items: p,
		originalDataRows: t.length - 1,
		emptyRowsRemoved: _,
		duplicateRowsRemoved: v,
		ignoredColumns: f,
		textLogoWarnings: m,
		frameWarnings: h
	};
}
function xt(e) {
	let t = [], n = [], r = "", i = !1, a = !1;
	for (let o = 0; o < e.length; o += 1) {
		let s = e[o];
		if (s === "\"" && i && e[o + 1] === "\"") r += "\"", o += 1;
		else if (s === "\"") {
			if (!i && (r.length || a)) throw Error("CSV contains a quote inside an unquoted value.");
			a = i, i = !i;
		} else if (s === "," && !i) n.push(r), r = "", a = !1;
		else if ((s === "\n" || s === "\r") && !i) s === "\r" && e[o + 1] === "\n" && (o += 1), n.push(r), t.push(n), n = [], r = "", a = !1;
		else {
			if (a && !i) throw Error("CSV contains characters after a closing quote. Add a comma or line break.");
			r += s;
		}
	}
	if (i) throw Error("CSV contains an unclosed quoted value.");
	return n.push(r), (n.length > 1 || n.some((e) => e.length)) && t.push(n), t;
}
//#endregion
//#region apps/qr-studio/src/utils/domainCheck.ts
function St(e, t = window.location.hostname) {
	return e.verifyDomain(t);
}
//#endregion
//#region apps/qr-studio/src/utils/errorCorrection.ts
function Ct(e) {
	return e.logoMode !== "text" && e.logoDataUrl && e.logoAutoEcc ? "high" : e.logoMode === "text" && e.textLogo.text || e.frame.enabled ? "quartile" : "medium";
}
//#endregion
//#region apps/qr-studio/src/utils/payloadBuilders.ts
var wt = (e, t) => String(e[t] ?? ""), Tt = (e) => e.toString().replace(/\+/g, "%20"), z = (e, t) => String(e[t] ?? "").trim(), Et = (e, t) => {
	if (!e) throw Error(t);
	return e;
}, Dt = (e) => {
	if (!/^\+?[0-9().\s-]+$/.test(e.trim())) throw Error("Enter a valid phone number");
	let t = `${e.trim().startsWith("+") ? "+" : ""}${e.replace(/\D/g, "")}`;
	if (t.replace(/\D/g, "").length < 3) throw Error("Enter a valid phone number");
	return t;
}, Ot = (e) => {
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw Error("Enter a valid email address");
	return e;
}, kt = (e) => {
	try {
		let t = new URL(e);
		if (!/^https?:$/.test(t.protocol)) throw Error();
		return t.href;
	} catch {
		throw Error("Enter a complete URL beginning with http:// or https://");
	}
};
function At(e, t) {
	switch (e) {
		case "url": return kt(Et(z(t, "url"), "URL is required"));
		case "text": return Et(z(t, "text"), "Text is required"), wt(t, "text");
		case "wifi": return jt(t);
		case "vcard": return Mt(t);
		case "email": return Nt(t);
		case "sms": return Pt(t);
		case "geo": return Ft(t);
		case "calendar": return It(t);
		case "totp": return Lt(t);
		case "crypto": return Rt(t);
		case "social": return zt(t);
	}
}
function jt(e) {
	let t = (e) => e.replace(/\\/g, "\\\\").replace(/([;,:"])/g, "\\$1"), n = Et(wt(e, "wifiSsid"), "Wi-Fi network name is required"), r = z(e, "wifiEncryption") || "WPA";
	if (![
		"WPA",
		"WEP",
		"NONE"
	].includes(r)) throw Error("Choose a supported Wi-Fi encryption type");
	let i = r === "NONE" ? "" : Et(wt(e, "wifiPassword"), "Wi-Fi password is required for a secured network");
	return `WIFI:T:${r === "NONE" ? "nopass" : r};S:${t(n)};P:${t(i)};H:${!!e.wifiHidden};;`;
}
function Mt(e) {
	let t = (e) => e.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([;,])/g, "\\$1"), n = Et(z(e, "contactName"), "Contact name is required"), r = z(e, "contactWebsite"), i = z(e, "contactEmail");
	return [
		"BEGIN:VCARD",
		"VERSION:4.0",
		`FN:${t(n)}`,
		z(e, "contactCompany") && `ORG:${t(z(e, "contactCompany"))}`,
		z(e, "contactPhone") && `TEL;TYPE=cell;VALUE=uri:tel:${Dt(z(e, "contactPhone"))}`,
		i && `EMAIL:${Ot(i)}`,
		z(e, "contactAddress") && `ADR;TYPE=home:;;${t(z(e, "contactAddress"))};;;;`,
		r && `URL:${kt(r)}`,
		z(e, "contactPhoto") && `PHOTO:${z(e, "contactPhoto")}`,
		"END:VCARD"
	].filter(Boolean).join("\r\n");
}
function Nt(e) {
	let t = Ot(Et(z(e, "emailAddress"), "Recipient email is required")), n = new URLSearchParams();
	return z(e, "emailSubject") && n.set("subject", z(e, "emailSubject")), z(e, "emailBody") && n.set("body", wt(e, "emailBody").replace(/\r\n|\r|\n/g, "\r\n")), `mailto:${t}${n.size ? `?${Tt(n)}` : ""}`;
}
function Pt(e) {
	let t = Dt(Et(z(e, "smsPhone"), "SMS phone number is required")), n = wt(e, "smsMessage");
	return `sms:${t}${n ? `?body=${encodeURIComponent(n)}` : ""}`;
}
function Ft(e) {
	let t = Number(Et(z(e, "latitude"), "Latitude is required")), n = Number(Et(z(e, "longitude"), "Longitude is required"));
	if (!Number.isFinite(t) || t < -90 || t > 90) throw Error("Latitude must be between -90 and 90");
	if (!Number.isFinite(n) || n < -180 || n > 180) throw Error("Longitude must be between -180 and 180");
	return `geo:${t},${n}`;
}
function It(e) {
	let t = (e) => e.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([;,])/g, "\\$1"), n = Et(z(e, "eventTitle"), "Event title is required"), r = Et(z(e, "eventStart"), "Event start is required"), i = Et(z(e, "eventEnd"), "Event end is required"), a = (e) => {
		if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(e)) return !1;
		let t = /* @__PURE__ */ new Date(e + "Z");
		return Number.isFinite(t.getTime()) && t.toISOString().slice(0, e.length) === e;
	};
	if (!a(r) || !a(i)) throw Error("Enter valid event start and end dates");
	if (/* @__PURE__ */ new Date(i + "Z") <= /* @__PURE__ */ new Date(r + "Z")) throw Error("Event end must be after its start");
	let o = (e) => e.replace(/[-:]/g, "") + (e.length === 16 ? "00" : "");
	return [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//MonkeyTactics//QR Code Generator//EN",
		"BEGIN:VEVENT",
		`UID:${crypto.randomUUID()}@monkeytactics.com`,
		`DTSTAMP:${(/* @__PURE__ */ new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
		`SUMMARY:${t(n)}`,
		`DTSTART:${o(r)}`,
		`DTEND:${o(i)}`,
		z(e, "eventLocation") && `LOCATION:${t(z(e, "eventLocation"))}`,
		z(e, "eventDescription") && `DESCRIPTION:${t(z(e, "eventDescription"))}`,
		"END:VEVENT",
		"END:VCALENDAR"
	].filter(Boolean).join("\r\n");
}
function Lt(e) {
	let t = Et(z(e, "totpSecret").replace(/[\s-]/g, "").toUpperCase().replace(/=+$/, ""), "TOTP secret is required");
	if (!/^[A-Z2-7]+$/.test(t) || ![
		0,
		2,
		4,
		5,
		7
	].includes(t.length % 8)) throw Error("TOTP secret must use Base32 characters A-Z and 2-7");
	let n = Et(z(e, "totpAccount"), "Account name is required"), r = z(e, "totpIssuer");
	if (n.includes(":") || r.includes(":")) throw Error("Issuer and account must not contain colons");
	let i = z(e, "totpAlgorithm") || "SHA1", a = z(e, "totpDigits") || "6", o = z(e, "totpPeriod") || "30";
	if (![
		"SHA1",
		"SHA256",
		"SHA512"
	].includes(i)) throw Error("Choose a supported TOTP algorithm");
	if (!["6", "8"].includes(a)) throw Error("TOTP digits must be 6 or 8");
	if (!["30", "60"].includes(o)) throw Error("TOTP period must be 30 or 60 seconds");
	let s = new URLSearchParams({ secret: t });
	return r && s.set("issuer", r), s.set("algorithm", i), s.set("digits", a), s.set("period", o), `otpauth://totp/${encodeURIComponent(r ? `${r}:${n}` : n)}?${s.toString()}`;
}
function Rt(e) {
	let t = z(e, "cryptoNetwork") || "bitcoin", n = Et(z(e, "cryptoAddress"), "Wallet address is required");
	if (![
		"bitcoin",
		"ethereum",
		"solana",
		"litecoin"
	].includes(t)) throw Error("Choose a supported network");
	if (!/^[a-zA-Z0-9]+$/.test(n)) throw Error("Enter a wallet address without spaces or URI parameters");
	if (t === "ethereum" && !/^0x[0-9a-fA-F]{40}$/.test(n)) throw Error("Ethereum address must be 0x followed by 40 hexadecimal characters");
	let r = z(e, "cryptoAmount"), i = t === "ethereum" ? 18 : t === "solana" ? 9 : 8;
	if (r && (!/^\d+(\.\d+)?$/.test(r) || (r.split(".")[1]?.length ?? 0) > i)) throw Error(`Enter a non-negative amount with at most ${i} decimal places`);
	let a = new URLSearchParams();
	if (r) if (t === "ethereum") {
		let [e, t = ""] = r.split(".");
		a.set("value", (BigInt(e) * 10n ** 18n + BigInt(t.padEnd(18, "0"))).toString());
	} else a.set("amount", r);
	return t !== "ethereum" && z(e, "cryptoLabel") && a.set("label", z(e, "cryptoLabel")), `${t}:${n}${a.size ? `?${Tt(a)}` : ""}`;
}
function zt(e) {
	let t = z(e, "socialPlatform") || "whatsapp", n = Et(z(e, "socialIdentity").replace(/^@/, ""), "Phone number or username is required");
	if (t === "whatsapp") {
		let e = Dt(n).replace(/^\+/, "");
		if (!/^[1-9]\d{6,14}$/.test(e)) throw Error("Enter a WhatsApp phone number including its country code (7–15 digits)");
		return `https://wa.me/${e}`;
	}
	if (!/^[a-zA-Z0-9_.-]+$/.test(n)) throw Error("Username contains unsupported characters");
	if (t === "telegram") return `https://t.me/${n}`;
	if (t === "messenger") return `https://m.me/${n}`;
	if (t === "instagram") return `https://instagram.com/${n}`;
	if (t === "x") return `https://x.com/${n}`;
	if (t === "linkedin") return `https://linkedin.com/in/${n}`;
	throw Error("Choose a supported social profile");
}
var Bt = {
	url: "https://monkeytactics.com",
	text: "",
	wifiEncryption: "WPA",
	wifiHidden: !1,
	totpAlgorithm: "SHA1",
	totpDigits: "6",
	totpPeriod: "30",
	cryptoNetwork: "bitcoin",
	socialPlatform: "whatsapp"
}, Vt = 612, Ht = 792, Ut = 612;
function Wt(e, t) {
	if (!e.length) throw Error("No QR PDFs were available for layout export.");
	let n = Yt(t), r = e.map(Xt), i = n.columns * n.rows, a = [];
	for (let e = 0; e < r.length; e += i) {
		let t = r.slice(e, e + i), o = (Vt - n.marginX * 2 - n.gapX * (n.columns - 1)) / n.columns, s = (Ht - n.marginY * 2 - n.gapY * (n.rows - 1)) / n.rows, c = "";
		t.forEach((e, t) => {
			let r = t % n.columns, i = Math.floor(t / n.columns), a = n.marginX + r * (o + n.gapX), l = Ht - n.marginY - (i + 1) * s - i * n.gapY, u = Math.min(o, s), d = u / Ut, f = a + (o - u) / 2, p = l + (s - u) / 2;
			c += `q ${$t(d)} 0 0 ${$t(d)} ${$t(f)} ${$t(p)} cm\n${e.content}\nQ\n`;
		}), a.push(c);
	}
	return Zt(a, r.find((e) => e.logo)?.logo ?? null);
}
function Gt(e, t) {
	return qt(e, t, 1, 1, 500, 16);
}
function Kt(e, t) {
	return qt(e, t, 3, 4, 130, 8);
}
function qt(e, t, n, r, i, a) {
	if (!e.length) throw Error("No QR PDFs were available for this PDF export.");
	let o = e.map(Xt), s = [], c = 552 / n, l = 724 / r, u = n * r;
	for (let e = 0; e < o.length; e += u) {
		let r = "";
		o.slice(e, e + u).forEach((o, s) => {
			let u = s % n, d = Math.floor(s / n), f = 30 + u * c, p = 758 - d * l, m = Math.min(i, c - 12, l - a - 22), h = f + (c - m) / 2, g = p - m - a - 12, _ = m / Ut, v = en((t[e + s] ?? `QR ${e + s + 1}`).slice(0, n === 1 ? 72 : 28));
			r += `q ${$t(_)} 0 0 ${$t(_)} ${$t(h)} ${$t(g)} cm\n${o.content}\nQ\n`, r += `BT /F1 ${a} Tf ${$t(f + 6)} ${$t(g - a - 3)} Td (${v}) Tj ET\n`;
		}), s.push(r);
	}
	return Zt(s, o.find((e) => e.logo)?.logo ?? null);
}
function Jt(e) {
	return e.layout === "labels" ? `monkeytactics-qr-avery-${e.averyTemplate}.pdf` : e.layout === "poster" ? `monkeytactics-qr-poster-${e.posterGrid}.pdf` : "monkeytactics-qr-business-cards.pdf";
}
function Yt(e) {
	if (e.layout === "labels") return e.averyTemplate === "5160" ? {
		columns: 3,
		rows: 10,
		marginX: 13.5,
		marginY: 36,
		gapX: 9,
		gapY: 0
	} : e.averyTemplate === "5163" ? {
		columns: 2,
		rows: 5,
		marginX: 18,
		marginY: 36,
		gapX: 0,
		gapY: 0
	} : {
		columns: 2,
		rows: 3,
		marginX: 18,
		marginY: 36,
		gapX: 0,
		gapY: 0
	};
	if (e.layout === "business-cards") return {
		columns: 2,
		rows: 5,
		marginX: 54,
		marginY: 36,
		gapX: 0,
		gapY: 0
	};
	let t = Number(e.posterGrid[0]);
	return {
		columns: t,
		rows: t,
		marginX: 36,
		marginY: 36,
		gapX: 18,
		gapY: 18
	};
}
function Xt(e) {
	let t = new TextDecoder("latin1").decode(e), n = t.match(/4 0 obj\s*<<[\s\S]*?>>\s*stream\r?\n([\s\S]*?)endstream/)?.[1]?.trim();
	if (!n) throw Error("A generated QR PDF could not be added to the selected layout.");
	return {
		content: n,
		logo: t.includes("/Logo 5 0 R") ? t.match(/5 0 obj\s*([\s\S]*?)\s*endobj/)?.[1]?.trim() ?? null : null
	};
}
function Zt(e, t) {
	let n = e.map((e, t) => 3 + t * 2), r = 3 + e.length * 2, i = t ? r++ : null, a = r++, o = r, s = `${i ? `/XObject << /Logo ${i} 0 R >>` : ""} /Font << /F1 ${a} 0 R >>`, c = ["<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Kids [${n.map((e) => `${e} 0 R`).join(" ")}] /Count ${e.length} >>`];
	e.forEach((e, t) => {
		let r = n[t];
		c.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${Vt} ${Ht}] /Contents ${r + 1} 0 R /Resources << ${s} >> >>`), c.push(`<< /Length ${new TextEncoder().encode(e).length} >>\nstream\n${e}endstream`);
	}), t && c.push(t), c.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"), c.push("<< /Producer (MonkeyTactics QR Code Generator) >>");
	let l = new TextEncoder(), u = [l.encode("%PDF-1.4\n%MTQR\n")], d = [], f = u[0].length;
	c.forEach((e, t) => {
		d.push(f);
		let n = l.encode(`${t + 1} 0 obj\n${e}\nendobj\n`);
		u.push(n), f += n.length;
	});
	let p = f, m = `xref\n0 ${c.length + 1}\n0000000000 65535 f \n`;
	return d.forEach((e) => {
		m += `${String(e).padStart(10, "0")} 00000 n \n`;
	}), m += `trailer\n<< /Size ${c.length + 1} /Root 1 0 R /Info ${o} 0 R >>\nstartxref\n${p}\n%%EOF`, u.push(l.encode(m)), Qt(u);
}
function Qt(e) {
	let t = new Uint8Array(e.reduce((e, t) => e + t.length, 0)), n = 0;
	return e.forEach((e) => {
		t.set(e, n), n += e.length;
	}), t;
}
function $t(e) {
	return Number(e.toFixed(5));
}
function en(e) {
	return e.replace(/[^\x20-\x7e]/g, "?").replace(/([\\()])/g, "\\$1");
}
//#endregion
//#region apps/qr-studio/src/utils/wasmEngine.ts
var tn = class {
	wasm;
	constructor(e) {
		this.wasm = e;
	}
	verifyDomain(e) {
		return this.wasm.verify_domain(e);
	}
	generate(e, t, n = "medium") {
		let r = this.wasm.generate_qr({
			data: e,
			style: t,
			ecc: n
		});
		if (r.error) throw Error(r.error);
		return r;
	}
	style(e) {
		let t = this.wasm.style_qr(e);
		if (t.error) throw Error(t.error);
		return t;
	}
	exportPng(e) {
		return this.wasm.export_png(e);
	}
	exportSvg() {
		return this.wasm.export_svg();
	}
	exportPdf() {
		return this.wasm.export_pdf();
	}
	batch(e, t, n = "medium") {
		let r = this.wasm.batch_generate({
			items: e,
			style: t,
			ecc: n
		});
		if (r.error) throw Error(r.error);
		return r.items ?? [];
	}
}, nn = null;
function rn() {
	return nn || (nn = (async () => {
		let e = new URL("/assets/wasm/qr-code-generator/qr_engine.js?v=20260806-60", window.location.origin).href, t = new URL("/assets/wasm/qr-code-generator/qr_engine_bg.wasm?v=20260806-60", window.location.origin), n = await import(
			/* @vite-ignore */
			e
);
		return await n.default({ module_or_path: t }), new tn(n);
	})(), nn);
}
//#endregion
//#region apps/qr-studio/src/types.ts
var an = {
	foreground: "#111827",
	background: "#ffffff",
	gradientType: "none",
	gradientStart: "#16a34a",
	gradientEnd: "#0f766e",
	gradientColors: ["#22c55e", "#0f766e"],
	gradientPattern: "none",
	gradientTarget: "data",
	eyeGradientMode: "none",
	moduleShape: "square",
	moduleScale: 1,
	patternPreset: "classic",
	eyeShape: "square",
	eyeOuterColor: "#111827",
	eyeInnerColor: "#111827",
	logoMode: "none",
	logoDataUrl: "",
	logoSize: .18,
	logoPadding: .12,
	logoBackgroundShape: "rounded",
	logoAutoContrast: !0,
	logoWhiteBorder: !0,
	logoSafeMode: !0,
	logoAutoEcc: !0,
	textLogo: {
		text: "MENU",
		fontFamily: "Segoe UI",
		fontWeight: "bold",
		fontSize: 24,
		color: "#FFFFFF",
		backgroundShape: "rounded-square",
		backgroundColor: "#000000",
		padding: .15,
		autoContrast: !0,
		centered: !0
	},
	frame: {
		enabled: !1,
		style: "rounded-rectangle",
		thickness: .08,
		color: "#000000",
		gradient: {
			enabled: !1,
			type: "linear",
			direction: "top-bottom",
			stops: ["#111827", "#16a34a"]
		},
		cornerRadius: .25,
		padding: .12,
		text: "SCAN ME",
		textFont: "Segoe UI",
		textWeight: "bold",
		textColor: "#FFFFFF",
		textSize: 18,
		autoContrast: !0,
		pattern: "none",
		patternOpacity: .2,
		preset: null
	},
	dropShadow: !1,
	glow: !1,
	noise: !1,
	texture: !1,
	artistic: !1,
	transparent: !1
}, on = "mt_qr_projects";
function sn(e) {
	let t = (/* @__PURE__ */ new Date()).toISOString(), n = e.style.gradientColors.length >= 2 ? e.style.gradientColors : [e.style.gradientStart, e.style.gradientEnd];
	return {
		schemaVersion: 1,
		id: e.id || mn(),
		name: e.name.trim(),
		description: e.description.trim(),
		createdAt: e.createdAt || t,
		updatedAt: t,
		qrType: e.qrType,
		content: {
			single: { ...e.values },
			batch: {
				enabled: e.batch.enabled,
				sourceType: "csv",
				csvData: e.batch.csvData,
				fileName: e.batch.fileName,
				mapping: {}
			}
		},
		styling: {
			foregroundColor: e.style.foreground,
			backgroundColor: e.style.background,
			gradient: {
				enabled: e.style.gradientType !== "none",
				type: e.style.gradientType,
				direction: e.style.gradientType,
				stops: n.map((e, t) => ({
					position: n.length === 1 ? 0 : t / (n.length - 1),
					color: e
				})),
				pattern: e.style.gradientPattern,
				target: e.style.gradientTarget
			},
			dots: {
				shape: e.style.moduleShape,
				size: e.style.moduleScale,
				pattern: e.style.patternPreset
			},
			eyes: {
				shapeOuter: e.style.eyeShape,
				shapeInner: e.style.eyeShape,
				useCustomColors: !0,
				outerColor: e.style.eyeOuterColor,
				innerColor: e.style.eyeInnerColor,
				gradientMode: e.style.eyeGradientMode
			},
			logo: {
				mode: e.logoSource,
				preset: e.logoPreset,
				uploadId: e.logoSource === "upload" ? "embedded-upload" : null,
				dataUrl: e.style.logoDataUrl,
				size: e.style.logoSize,
				padding: e.logoSource === "text" ? e.style.textLogo.padding : e.style.logoPadding,
				backgroundShape: e.logoSource === "text" ? e.style.textLogo.backgroundShape : e.style.logoBackgroundShape,
				autoContrast: e.logoSource === "text" ? e.style.textLogo.autoContrast : e.style.logoAutoContrast,
				text: e.style.textLogo.text,
				fontFamily: e.style.textLogo.fontFamily,
				fontWeight: e.style.textLogo.fontWeight,
				fontSize: e.style.textLogo.fontSize,
				color: e.style.textLogo.color,
				backgroundColor: e.style.textLogo.backgroundColor,
				centered: !0
			},
			frame: M(e.style.frame).settings,
			quietZone: {
				size: 4,
				color: e.style.background
			},
			errorCorrection: e.logoSource === "text" ? "Q" : e.style.logoDataUrl && e.style.logoAutoEcc ? "H" : "M",
			raw: {
				...e.style,
				gradientColors: [...e.style.gradientColors]
			}
		},
		export: {
			format: e.exportFormat,
			dpi: e.dpi,
			batchZip: !0,
			batchMode: e.batchMode,
			filenamePattern: e.filenamePattern,
			transparent: e.style.transparent,
			includeManifest: e.includeManifest,
			includeFinalCsv: e.includeFinalCsv,
			includeContactSheet: e.includeContactSheet,
			pdfLayout: {
				enabled: e.pdfLayout !== "standard",
				mode: e.pdfLayout,
				averyTemplate: e.averyTemplate,
				posterGrid: e.posterGrid
			}
		},
		meta: {
			reliabilityScore: e.reliabilityScore,
			notes: e.notes.trim(),
			tags: e.tags.map((e) => e.trim()).filter(Boolean)
		}
	};
}
function cn(e) {
	let t = e.styling.raw ?? {}, n = e.styling.gradient?.stops?.map((e) => e.color).filter(Boolean) ?? [], r = [
		"none",
		"upload",
		"preset",
		"text"
	].includes(e.styling.logo?.mode) ? e.styling.logo.mode : "none", i = T({
		...t.textLogo,
		text: e.styling.logo?.text ?? t.textLogo?.text,
		fontFamily: e.styling.logo?.fontFamily ?? t.textLogo?.fontFamily,
		fontWeight: e.styling.logo?.fontWeight ?? t.textLogo?.fontWeight,
		fontSize: e.styling.logo?.fontSize ?? t.textLogo?.fontSize,
		color: e.styling.logo?.color ?? t.textLogo?.color,
		backgroundShape: e.styling.logo?.backgroundShape ?? t.textLogo?.backgroundShape,
		backgroundColor: e.styling.logo?.backgroundColor ?? t.textLogo?.backgroundColor,
		padding: e.styling.logo?.padding ?? t.textLogo?.padding,
		autoContrast: e.styling.logo?.autoContrast ?? t.textLogo?.autoContrast ?? !0,
		centered: !0
	}).settings, a = {
		...an,
		...t,
		foreground: e.styling.foregroundColor || t.foreground || an.foreground,
		background: e.styling.backgroundColor || t.background || an.background,
		gradientType: e.styling.gradient?.enabled ? e.styling.gradient.type : "none",
		gradientColors: n.length >= 2 ? n : t.gradientColors ?? an.gradientColors,
		moduleShape: e.styling.dots?.shape || an.moduleShape,
		moduleScale: e.styling.dots?.size ?? an.moduleScale,
		eyeShape: e.styling.eyes?.shapeOuter || an.eyeShape,
		eyeOuterColor: e.styling.eyes?.outerColor || an.eyeOuterColor,
		eyeInnerColor: e.styling.eyes?.innerColor || an.eyeInnerColor,
		logoMode: r,
		logoDataUrl: e.styling.logo?.dataUrl || "",
		logoSize: e.styling.logo?.size ?? an.logoSize,
		logoPadding: r === "text" ? i.padding : e.styling.logo?.padding ?? an.logoPadding,
		logoBackgroundShape: r === "text" ? ee(i.backgroundShape) : e.styling.logo?.backgroundShape || an.logoBackgroundShape,
		logoAutoContrast: r === "text" ? i.autoContrast : e.styling.logo?.autoContrast ?? an.logoAutoContrast,
		textLogo: i,
		frame: M(e.styling.frame ?? t.frame ?? an.frame).settings,
		transparent: e.export.transparent ?? t.transparent ?? !1
	};
	return a.gradientStart = a.gradientColors[0] ?? a.gradientStart, a.gradientEnd = a.gradientColors[a.gradientColors.length - 1] ?? a.gradientEnd, {
		qrType: e.qrType,
		values: { ...e.content.single },
		style: a,
		batch: {
			enabled: e.content.batch?.enabled ?? !1,
			fileName: e.content.batch?.fileName || "project-batch.csv",
			csvData: e.content.batch?.csvData || ""
		},
		logoSource: r,
		logoPreset: e.styling.logo?.preset ?? "",
		exportFormat: e.export.format ?? "png",
		dpi: e.export.dpi ?? 300,
		batchMode: e.export.batchMode ?? "selected",
		filenamePattern: e.export.filenamePattern || "{name}",
		includeManifest: e.export.includeManifest ?? !0,
		includeFinalCsv: e.export.includeFinalCsv ?? !1,
		includeContactSheet: e.export.includeContactSheet ?? !1,
		pdfLayout: e.export.pdfLayout?.mode ?? "standard",
		averyTemplate: e.export.pdfLayout?.averyTemplate ?? "5160",
		posterGrid: e.export.pdfLayout?.posterGrid ?? "2x2"
	};
}
function ln(e = localStorage) {
	try {
		let t = JSON.parse(e.getItem("mt_qr_projects") ?? "[]");
		return Array.isArray(t) ? t.filter(hn) : [];
	} catch {
		return [];
	}
}
function un(e, t = localStorage) {
	t.setItem(on, JSON.stringify(e));
}
function dn(e, t = localStorage) {
	let n = ln(t), r = n.findIndex((t) => t.id === e.id);
	return r >= 0 ? n[r] = e : n.unshift(e), un(n, t), n;
}
function fn(e, t = localStorage) {
	let n = ln(t).filter((t) => t.id !== e);
	return un(n, t), n;
}
function pn(e) {
	if (!hn(e)) throw Error("This file is not a valid MonkeyTactics QR project.");
	return e;
}
function mn() {
	return globalThis.crypto?.randomUUID?.() ?? `qr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function hn(e) {
	if (!e || typeof e != "object") return !1;
	let t = e, n = [
		"url",
		"text",
		"wifi",
		"vcard",
		"email",
		"sms",
		"geo",
		"calendar",
		"totp",
		"crypto",
		"social"
	], r = t.content, i = t.styling, a = t.export, o = t.meta;
	return typeof t.id == "string" && t.id.length > 0 && typeof t.name == "string" && t.name.trim().length > 0 && typeof t.createdAt == "string" && typeof t.updatedAt == "string" && n.includes(t.qrType) && !!r && gn(r.single) && gn(r.batch) && !!i && typeof i.foregroundColor == "string" && typeof i.backgroundColor == "string" && gn(i.gradient) && gn(i.dots) && gn(i.eyes) && gn(i.logo) && !!a && [
		"png",
		"svg",
		"pdf"
	].includes(a.format) && typeof a.dpi == "number" && !!o && typeof o.reliabilityScore == "number" && typeof o.notes == "string" && Array.isArray(o.tags) && o.tags.every((e) => typeof e == "string");
}
function gn(e) {
	return !!e && typeof e == "object" && !Array.isArray(e);
}
//#endregion
//#region apps/qr-studio/src/components/QrStudio.tsx
function _n() {
	let e = (0, l.useRef)(null), t = (0, l.useRef)(!1), n = (0, l.useRef)("medium"), [r, i] = (0, l.useState)("content"), [a, o] = (0, l.useState)("url"), [s, c] = (0, l.useState)(Bt), [u, f] = (0, l.useState)(an), [p, m] = (0, l.useState)(""), [h, g] = (0, l.useState)("none"), [_, v] = (0, l.useState)(""), [y, b] = (0, l.useState)(null), [x, S] = (0, l.useState)(""), [C, w] = (0, l.useState)("Loading QR engine…"), [T, D] = (0, l.useState)(!1), [te, ne] = (0, l.useState)(300), [O, re] = (0, l.useState)("png"), [ie, ae] = (0, l.useState)("standard"), [oe, k] = (0, l.useState)("5160"), [A, se] = (0, l.useState)("2x2"), [j, ce] = (0, l.useState)("selected"), [le, N] = (0, l.useState)(!0), [ue, de] = (0, l.useState)(!1), [fe, pe] = (0, l.useState)(!1), [me, he] = (0, l.useState)("{name}"), [ge, _e] = (0, l.useState)(() => ft()), [ve, ye] = (0, l.useState)(""), [be, xe] = (0, l.useState)(""), [Se, Ce] = (0, l.useState)(null), [we, Te] = (0, l.useState)(!1), [Ee, De] = (0, l.useState)(1), [Oe, ke] = (0, l.useState)(!1), [Ae, je] = (0, l.useState)("dark"), [Me, Ne] = (0, l.useState)(() => ln()), [Pe, Fe] = (0, l.useState)(""), [Ie, Le] = (0, l.useState)(""), [Re, ze] = (0, l.useState)(""), [Be, Ve] = (0, l.useState)(""), [Ge, qe] = (0, l.useState)(""), [F, Je] = (0, l.useState)("");
	(0, l.useEffect)(() => {
		let t = !1;
		return rn().then((n) => {
			if (t) return;
			e.current = n;
			let r = St(n);
			D(r), w(r ? "QR engine ready" : "Domain verification failed"), r || S("This QR engine is not authorized on the current domain.");
		}).catch((e) => {
			w("QR engine unavailable"), S(e instanceof Error ? e.message : "Unable to load the QR engine");
		}), () => {
			t = !0;
		};
	}, []);
	let Ye = (0, l.useMemo)(() => {
		try {
			return {
				data: At(a, s),
				error: ""
			};
		} catch (e) {
			return {
				data: "",
				error: e instanceof Error ? e.message : "Unable to generate this QR code"
			};
		}
	}, [a, s]), Xe = Ye.data, Qe = (0, l.useMemo)(() => {
		if (!ge) return null;
		try {
			return bt(ge.contents);
		} catch {
			return null;
		}
	}, [ge]), $e = Qe?.items.length ?? 0;
	(0, l.useEffect)(() => {
		if (h !== "text") return;
		let e = E(u.textLogo);
		f((t) => {
			let n = e.settings;
			return t.logoMode === "text" && t.logoDataUrl === e.dataUrl && t.logoPadding === n.padding && t.logoBackgroundShape === ee(n.backgroundShape) && Cn(t.textLogo, n) ? t : {
				...t,
				logoMode: "text",
				logoDataUrl: e.dataUrl,
				logoSize: .2,
				logoPadding: n.padding,
				logoBackgroundShape: ee(n.backgroundShape),
				logoAutoContrast: n.autoContrast,
				logoWhiteBorder: !1,
				logoSafeMode: !0,
				logoAutoEcc: !0,
				textLogo: n
			};
		});
	}, [h, u.textLogo]), (0, l.useEffect)(() => {
		if (!T || !e.current) return;
		if (b(null), t.current = !1, !Xe) {
			S(Ye.error);
			return;
		}
		let r = window.setTimeout(() => {
			try {
				let r = e.current.generate(Xe, u, Ct(u));
				n.current = Ct(u), t.current = !0, b(r), S("");
			} catch (e) {
				b(null), t.current = !1, S(e instanceof Error ? e.message : "Unable to generate this QR code");
			}
		}, 160);
		return () => window.clearTimeout(r);
	}, [
		Xe,
		Ye.error,
		T
	]), (0, l.useEffect)(() => {
		if (!T || !e.current || !t.current) return;
		let r = window.setTimeout(() => {
			try {
				let t = Ct(u);
				t !== n.current && Xe ? (b(e.current.generate(Xe, u, t)), n.current = t) : b(e.current.style(u));
			} catch (e) {
				S(e instanceof Error ? e.message : "Unable to style this QR code");
			}
		}, 80);
		return () => window.clearTimeout(r);
	}, [
		u,
		T,
		Xe
	]);
	let tt = (e) => f((t) => ({
		...t,
		...e
	})), I = (e, t) => c((n) => ({
		...n,
		[e]: t
	})), nt = (e, t, n) => {
		let r = new Blob([typeof e == "string" ? e : e.slice().buffer], { type: t }), i = URL.createObjectURL(r), a = document.createElement("a");
		a.href = i, a.download = n, a.click(), window.setTimeout(() => URL.revokeObjectURL(i), 1e3);
	}, rt = () => {
		if (!e.current || !T) throw Error("The QR engine is not ready");
		if (Ye.error || !Xe) throw Error(Ye.error || "Enter valid content before exporting");
		let r = Xe, i = e.current.generate(r, u, Ct(u));
		return n.current = Ct(u), t.current = !0, b(i), S(""), e.current;
	}, it = async (e) => {
		ye("Reading CSV…");
		try {
			let t = await e.text(), n = bt(t);
			if (!n.items.length) throw Error("No usable data rows were found after removing empty and duplicate rows.");
			if (n.items.length > 250) throw Error("Batch CSV files are limited to 250 QR codes after cleanup.");
			let r = {
				fileName: e.name,
				contents: t
			};
			pt(r), _e(r), ye("");
		} catch (e) {
			let t = e instanceof Error ? e.message : "Unable to read this CSV file.";
			ye(""), xe(t);
		}
	}, at = () => {
		mt(), _e(null), ye("");
	}, ot = (e) => sn({
		id: e?.id,
		createdAt: e?.createdAt,
		name: e?.name ?? Ie,
		description: Re,
		qrType: a,
		values: s,
		style: u,
		batch: {
			enabled: !!ge,
			fileName: ge?.fileName ?? "",
			csvData: ge?.contents ?? ""
		},
		logoSource: h,
		logoPreset: _,
		exportFormat: O,
		dpi: te,
		batchMode: j,
		filenamePattern: me,
		includeManifest: le,
		includeFinalCsv: ue,
		includeContactSheet: fe,
		pdfLayout: ie,
		averyTemplate: oe,
		posterGrid: A,
		reliabilityScore: y?.reliabilityScore ?? 0,
		notes: Ge,
		tags: Be.split(",")
	}), L = (e) => {
		let t = cn(e);
		if (o(t.qrType), c(t.values), f(t.style), g(t.logoSource), v(t.logoPreset), m(t.logoSource === "upload" && t.style.logoDataUrl ? e.styling.logo.uploadId || "Embedded project logo" : ""), re(t.exportFormat), ne(t.dpi), ce(t.batchMode), he(t.filenamePattern), N(t.includeManifest), de(t.includeFinalCsv), pe(t.includeContactSheet), ae(t.pdfLayout), k(t.averyTemplate), se(t.posterGrid), t.batch.enabled && t.batch.csvData) {
			let e = {
				fileName: t.batch.fileName || "project-batch.csv",
				contents: t.batch.csvData
			};
			pt(e), _e(e);
		} else mt(), _e(null);
		Fe(e.id), Le(e.name), ze(e.description || ""), Ve((e.meta.tags || []).join(", ")), qe(e.meta.notes || ""), Je(`Loaded “${e.name}”.`), i("content");
	}, R = (e) => {
		let t = Me.find((t) => t.id === e);
		t && (Fe(e), Le(t.name), ze(t.description || ""), Ve((t.meta.tags || []).join(", ")), qe(t.meta.notes || ""), Je(""));
	}, ct = () => {
		Fe(""), Le(""), ze(""), Ve(""), qe(""), Je("New project ready. Add a name when you save it."), o("url"), c({ ...Bt }), f({
			...an,
			gradientColors: [...an.gradientColors]
		}), m(""), g("none"), v(""), mt(), _e(null), re("png"), ne(300), ce("selected"), he("{name}"), N(!0), de(!1), pe(!1), ae("standard"), k("5160"), se("2x2");
	}, lt = () => {
		let e = Me.find((e) => e.id === Pe), t = Ie.trim() || window.prompt("Project name", e?.name || "")?.trim();
		if (!t) return;
		let n = ot({
			id: e?.id,
			name: t,
			createdAt: e?.createdAt
		});
		Ne(dn(n)), Fe(n.id), Le(n.name), Je("Project saved.");
	}, ut = () => {
		let e = window.prompt("Save project as", Ie ? `${Ie} Copy` : "New QR Project")?.trim();
		if (!e) return;
		let t = ot({ name: e });
		Ne(dn(t)), Fe(t.id), Le(t.name), Je("Project saved as a new copy.");
	}, dt = (e = Pe) => {
		let t = Me.find((t) => t.id === e);
		t && L(t);
	}, gt = (e) => {
		let t = Me.find((t) => t.id === e);
		!t || !window.confirm(`Delete “${t.name}”? This cannot be undone.`) || (Ne(fn(e)), Pe === e && (Fe(""), Le(""), ze(""), Ve(""), qe("")), Je("Project deleted."));
	}, _t = (e) => {
		let t = Me.find((t) => t.id === e);
		if (!t) return;
		let n = (/* @__PURE__ */ new Date()).toISOString(), r = {
			...structuredClone(t),
			id: mn(),
			name: `${t.name} Copy`,
			createdAt: n,
			updatedAt: n
		};
		Ne(dn(r)), vt(r);
	}, vt = (e) => {
		Fe(e.id), Le(e.name), ze(e.description || ""), Ve((e.meta.tags || []).join(", ")), qe(e.meta.notes || ""), Je("Project duplicated.");
	};
	return !T && C !== "Loading QR engine…" ? /* @__PURE__ */ (0, P.jsxs)("div", {
		className: "qr-engine-blocked",
		children: [/* @__PURE__ */ (0, P.jsx)("strong", { children: "QR Code Generator unavailable" }), /* @__PURE__ */ (0, P.jsx)("p", { children: x || C })]
	}) : /* @__PURE__ */ (0, P.jsxs)("div", {
		className: "qr-studio-shell",
		children: [
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qr-workspace-toolbar",
				children: [/* @__PURE__ */ (0, P.jsxs)("div", { children: [
					/* @__PURE__ */ (0, P.jsx)("span", { className: "qr-workspace-dot" }),
					"QR Code Generator ",
					/* @__PURE__ */ (0, P.jsx)("span", {
						className: "qr-workspace-caption",
						children: "Your ideas, ready to scan"
					})
				] }), /* @__PURE__ */ (0, P.jsx)("button", {
					type: "button",
					"aria-expanded": r === "projects",
					"aria-controls": "qr-panel-projects",
					onClick: () => i(r === "projects" ? "content" : "projects"),
					children: "Saved projects"
				})]
			}),
			/* @__PURE__ */ (0, P.jsxs)("aside", {
				className: "qr-sidebar",
				children: [
					/* @__PURE__ */ (0, P.jsx)("div", {
						className: "qr-tablist",
						role: "tablist",
						"aria-label": "QR Code Generator settings",
						children: [
							"content",
							"styling",
							"export"
						].map((e, t) => /* @__PURE__ */ (0, P.jsxs)("button", {
							id: `qr-tab-${e}`,
							type: "button",
							role: "tab",
							"aria-controls": `qr-panel-${e}`,
							"aria-selected": r === e,
							className: r === e ? "active" : "",
							onClick: () => i(e),
							children: [/* @__PURE__ */ (0, P.jsxs)("span", {
								className: "qr-step-number",
								children: ["0", t + 1]
							}), {
								content: "Content",
								styling: "Design",
								export: "Download",
								projects: "Projects"
							}[e]]
						}, e))
					}),
					/* @__PURE__ */ (0, P.jsx)("div", {
						id: "qr-panel-projects",
						role: "region",
						"aria-label": "Saved projects",
						hidden: r !== "projects",
						children: /* @__PURE__ */ (0, P.jsx)(et, {
							projects: Me,
							selectedProjectId: Pe,
							name: Ie,
							description: Re,
							tags: Be,
							notes: Ge,
							status: F,
							onSelect: R,
							onNameChange: Le,
							onDescriptionChange: ze,
							onTagsChange: Ve,
							onNotesChange: qe,
							onNew: ct,
							onSave: lt,
							onSaveAs: ut,
							onLoad: dt,
							onDelete: gt,
							onDuplicate: _t,
							onExport: () => {
								let e = Me.find((e) => e.id === Pe), t = Ie.trim() || e?.name;
								if (!t) return;
								let n = ot({
									id: e?.id,
									name: t,
									createdAt: e?.createdAt
								});
								nt(JSON.stringify(n, null, 2), "application/json", `${vn(n.name, 0)}.qr-project.json`), Je("Project JSON exported.");
							},
							onImport: async (e) => {
								try {
									let t = pn(JSON.parse(await e.text())), n = cn(t), r = Me.some((e) => e.id === t.id) ? mn() : t.id, i = sn({
										...n,
										id: r,
										name: t.name,
										description: t.description || "",
										createdAt: t.createdAt,
										reliabilityScore: t.meta.reliabilityScore ?? 0,
										notes: t.meta.notes || "",
										tags: t.meta.tags || []
									});
									Ne(dn(i)), L(i), Je(`Imported and loaded “${i.name}”.`);
								} catch (e) {
									Je(e instanceof Error ? e.message : "Unable to import this project JSON.");
								}
							}
						})
					}),
					/* @__PURE__ */ (0, P.jsx)("div", {
						id: "qr-panel-content",
						role: "tabpanel",
						"aria-labelledby": "qr-tab-content",
						hidden: r !== "content",
						children: /* @__PURE__ */ (0, P.jsx)(Ke, {
							qrType: a,
							values: s,
							error: x,
							onTypeChange: o,
							onValueChange: I
						})
					}),
					/* @__PURE__ */ (0, P.jsx)("div", {
						id: "qr-panel-styling",
						role: "tabpanel",
						"aria-labelledby": "qr-tab-styling",
						hidden: r !== "styling",
						children: /* @__PURE__ */ (0, P.jsx)(st, {
							style: u,
							qrType: a,
							logoFileName: p,
							logoSource: h,
							selectedLogoPreset: _,
							onChange: tt,
							onLogoFileNameChange: m,
							onLogoSourceChange: g,
							onLogoPresetChange: v
						})
					}),
					/* @__PURE__ */ (0, P.jsx)("div", {
						id: "qr-panel-export",
						role: "tabpanel",
						"aria-labelledby": "qr-tab-export",
						hidden: r !== "export",
						children: /* @__PURE__ */ (0, P.jsx)(Ze, {
							dpi: te,
							transparent: u.transparent,
							format: O,
							batchFileName: ge?.fileName ?? "",
							batchCount: $e,
							batchAnalysis: Qe,
							exportStatus: ve,
							isExporting: we,
							pdfLayout: ie,
							averyTemplate: oe,
							posterGrid: A,
							batchMode: j,
							filenamePattern: me,
							includeManifest: le,
							includeFinalCsv: ue,
							includeContactSheet: fe,
							onDpiChange: ne,
							onTransparentChange: (e) => tt({ transparent: e }),
							onFormatChange: re,
							onPdfLayoutChange: ae,
							onAveryTemplateChange: k,
							onPosterGridChange: se,
							onBatchModeChange: ce,
							onFilenamePatternChange: he,
							onIncludeManifestChange: N,
							onIncludeFinalCsvChange: de,
							onIncludeContactSheetChange: pe,
							onBatchCsvChange: it,
							onBatchCsvRemove: at,
							onExport: async () => {
								if (!we) {
									Te(!0), Ce(null);
									try {
										if (!e.current || !T) throw Error("The QR engine is not ready");
										let t = e.current;
										if (!ge) {
											let e = rt();
											if (O === "png") nt(e.exportPng(te), "image/png", `monkeytactics-qr-${te}dpi.png`);
											else if (O === "svg") nt(e.exportSvg(), "image/svg+xml", "monkeytactics-qr.svg");
											else {
												let t = e.exportPdf();
												if (ie === "standard") nt(t, "application/pdf", "monkeytactics-qr.pdf");
												else {
													let e = {
														layout: ie,
														averyTemplate: oe,
														posterGrid: A
													};
													nt(Wt([t], e), "application/pdf", Jt(e));
												}
											}
											ye(`Single ${O.toUpperCase()} exported.`);
											return;
										}
										let n = yt(ge.contents);
										if (!n.length) throw Error("The stored CSV has no data rows.");
										if (n.length > 250) throw Error("Batch CSV files are limited to 250 QR codes.");
										ye(`Creating ${n.length} ${O.toUpperCase()} files…`);
										let r = new TextEncoder(), i = [], o = [], s = [], c = /* @__PURE__ */ new Set([
											"thumbnail-contact-sheet",
											"monkeytactics-qr-batch-booklet",
											"manifest",
											"final-qr-list"
										]), l = /* @__PURE__ */ new Map(), f = j === "pdf-booklet" || fe || j === "selected" && O === "pdf";
										for (let e = 0; e < n.length; e += 1) {
											let p = n[e];
											Ce({
												current: e + 1,
												total: n.length,
												label: `Processing QR ${e + 1} of ${n.length}`,
												detail: p.name
											}), await Sn();
											let m = u;
											if (p.textLogo) {
												let e = l.get(p.textLogo);
												if (e) m = e;
												else {
													let e = E({
														...u.textLogo,
														text: p.textLogo
													});
													m = {
														...u,
														logoMode: "text",
														logoDataUrl: e.dataUrl,
														logoPadding: e.settings.padding,
														logoBackgroundShape: ee(e.settings.backgroundShape),
														textLogo: e.settings
													}, l.set(p.textLogo, m);
												}
											}
											(p.frameText || p.frameColor || p.frameStyle) && (m = {
												...m,
												frame: M({
													...m.frame,
													enabled: !0,
													...p.frameText ? { text: p.frameText } : {},
													...p.frameColor ? {
														color: p.frameColor,
														gradient: {
															...m.frame.gradient,
															enabled: !1
														}
													} : {},
													...p.frameStyle ? { style: p.frameStyle } : {},
													preset: null
												}).settings
											});
											let h;
											try {
												h = t.generate(p.data, m, Ct(m));
											} catch (t) {
												throw Error(`Batch item ${e + 1} (${p.name}): ${t instanceof Error ? t.message : "QR generation failed"}`);
											}
											let g = d(yn(p, e, me, a), c), _ = [];
											if (j === "selected" && O !== "pdf") {
												let e = `${g}.${O}`;
												i.push({
													name: e,
													bytes: O === "png" ? t.exportPng(te) : r.encode(t.exportSvg())
												}), _.push(e);
											} else if (j === "svg-set") {
												let e = `svg/${g}.svg`;
												i.push({
													name: e,
													bytes: r.encode(t.exportSvg())
												}), _.push(e);
											} else if (j === "mixed") {
												let e = `png/${g}.png`, n = `svg/${g}.svg`;
												i.push({
													name: e,
													bytes: t.exportPng(te)
												}), i.push({
													name: n,
													bytes: r.encode(t.exportSvg())
												}), _.push(e, n);
											}
											if (f && o.push(t.exportPdf()), j === "selected" && O === "pdf" && ie === "standard") {
												let e = `${g}.pdf`;
												i.push({
													name: e,
													bytes: o[o.length - 1]
												}), _.push(e);
											}
											s.push({
												name: p.name,
												data: p.data,
												...m.logoMode === "text" ? { textLogo: m.textLogo.text } : {},
												...m.frame.enabled ? {
													frameText: m.frame.text,
													frameColor: m.frame.color,
													frameStyle: m.frame.style
												} : {},
												filenames: _,
												reliabilityScore: h.reliabilityScore,
												reliabilityLabel: h.reliabilityLabel
											});
										}
										if (j === "selected" && O === "pdf" && ie !== "standard") {
											let e = {
												layout: ie,
												averyTemplate: oe,
												posterGrid: A
											};
											Ce({
												current: n.length,
												total: n.length,
												label: "Building PDF layout",
												detail: `Arranging ${n.length} QR codes on printable pages`
											}), await Sn();
											let t = Jt(e);
											i.push({
												name: t,
												bytes: Wt(o, e)
											}), s.forEach((e) => e.filenames.push(t));
										}
										if (j === "pdf-booklet") {
											Ce({
												current: n.length,
												total: n.length,
												label: "Building PDF booklet",
												detail: `Creating ${n.length} labeled booklet pages`
											}), await Sn();
											let e = "monkeytactics-qr-batch-booklet.pdf";
											i.push({
												name: e,
												bytes: Gt(o, n.map((e) => e.name))
											}), s.forEach((t) => t.filenames.push(e));
										}
										fe && (Ce({
											current: n.length,
											total: n.length,
											label: "Building contact sheet",
											detail: `Creating thumbnails for ${n.length} QR codes`
										}), await Sn(), i.push({
											name: "thumbnail-contact-sheet.pdf",
											bytes: Kt(o, n.map((e) => e.name))
										}));
										let p = i.map((e) => e.name);
										if (ue) {
											let e = [[
												"name",
												"data",
												"text_logo",
												"frame_text",
												"frame_color",
												"frame_style",
												"filenames",
												"reliability_score",
												"reliability_label"
											], ...s.map((e) => [
												e.name,
												e.data,
												e.textLogo ?? "",
												e.frameText ?? "",
												e.frameColor ?? "",
												e.frameStyle ?? "",
												e.filenames.join(" | "),
												String(e.reliabilityScore),
												e.reliabilityLabel
											])].map((e) => e.map(xn).join(",")).join("\r\n");
											i.push({
												name: "final-qr-list.csv",
												bytes: r.encode(e)
											}), p.push("final-qr-list.csv");
										}
										if (le) {
											let e = {
												schemaVersion: 1,
												createdAt: (/* @__PURE__ */ new Date()).toISOString(),
												sourceFile: ge.fileName,
												qrCount: n.length,
												outputMode: j,
												selectedFormat: O,
												dpi: O === "png" || j === "mixed" ? te : void 0,
												styling: {
													...u,
													logoDataUrl: u.logoDataUrl ? "[embedded logo]" : ""
												},
												packageFiles: [...p, "manifest.json"],
												items: s
											};
											i.push({
												name: "manifest.json",
												bytes: r.encode(JSON.stringify(e, null, 2))
											});
										}
										Ce({
											current: n.length,
											total: n.length,
											label: "Packaging ZIP",
											detail: `Adding ${i.length} files to the download`
										}), await Sn();
										let m = await ht(i, (e, t) => {
											Ce({
												current: e,
												total: t,
												label: "Packaging ZIP",
												detail: `Added ${e} of ${t} files`
											});
										});
										nt(m, "application/zip", `monkeytactics-qr-batch-${j}-${Date.now()}.zip`), ye(`${n.length} QR codes exported with ${i.length} packaged files.`);
									} catch (e) {
										ye(e instanceof Error ? e.message : "Export failed");
									} finally {
										if (ge && e.current && Xe) try {
											b(e.current.generate(Xe, u, Ct(u)));
										} catch {}
										Ce(null), Te(!1);
									}
								}
							}
						})
					})
				]
			}),
			/* @__PURE__ */ (0, P.jsx)(He, {
				result: y,
				style: u,
				zoom: Ee,
				showGrid: Oe,
				simulation: Ae,
				errorCorrection: Ct(u),
				engineStatus: C,
				onZoomChange: De,
				onGridChange: ke,
				onSimulationChange: je,
				onDownload: () => {
					i("export"), requestAnimationFrame(() => {
						document.getElementById("qr-tab-export")?.focus();
					});
				}
			}),
			Se && /* @__PURE__ */ (0, P.jsx)(Ue, { progress: Se }),
			be && /* @__PURE__ */ (0, P.jsx)(We, {
				message: be,
				onClose: () => xe("")
			})
		]
	});
}
function vn(e, t) {
	return e.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/[. ]+$/g, "").slice(0, 100) || `qrcode-${t + 1}`;
}
function yn(e, t, n, r) {
	return vn((n.trim() || "{name}").replaceAll("{index}", String(t + 1).padStart(3, "0")).replaceAll("{name}", e.name).replaceAll("{type}", r).replaceAll("{data_hash}", bn(e.data)).replace(/\.(png|svg|pdf)$/i, ""), t);
}
function bn(e) {
	let t = 2166136261;
	for (let n = 0; n < e.length; n += 1) t ^= e.charCodeAt(n), t = Math.imul(t, 16777619);
	return (t >>> 0).toString(16).padStart(8, "0");
}
function xn(e) {
	return /[",\r\n]/.test(e) ? `"${e.replace(/"/g, "\"\"")}"` : e;
}
function Sn() {
	return new Promise((e) => requestAnimationFrame(() => setTimeout(e, 0)));
}
function Cn(e, t) {
	return e.text === t.text && e.fontFamily === t.fontFamily && e.fontWeight === t.fontWeight && e.fontSize === t.fontSize && e.color === t.color && e.backgroundShape === t.backgroundShape && e.backgroundColor === t.backgroundColor && e.padding === t.padding && e.autoContrast === t.autoContrast && e.centered === t.centered;
}
//#endregion
//#region apps/qr-studio/src/main.tsx
var wn = document.getElementById("qr-studio-root");
wn && (0, u.createRoot)(wn).render(/* @__PURE__ */ (0, P.jsx)(l.StrictMode, { children: /* @__PURE__ */ (0, P.jsx)(_n, {}) }));
//#endregion
