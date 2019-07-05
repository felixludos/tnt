//#region _HACKS
function hackPhaseAndPlayerTest(msg) {
	//console.log(msg);
	let res = stringAfterLast(msg, 'Beginning ');
	let phase = stringBefore(res, ' ');
	//console.log(res, "phase=" + phase);
	let res1 = stringAfter(res, '<br>');
	let player = stringBefore(res1, ' ');
	//console.log(res1, "player=" + player);
}

//#endregion HACKS

//#region array helpers
function addAll(akku, other) {
	for (const el of other) {
		akku.push(el);
	}
	return akku;
}
function addIfComma(csv, arr) {
	let strings = csv.split(',');
	for (const s of strings) {
		addIf(s.trim(), arr);
	}
}
function addIf(el, arr) {
	if (!arr.includes(el)) arr.push(el);
}
function addIfDict(key, val, dict) {
	if (!(key in dict)) {
		dict[key] = [val];
	} else {
		addIf(val, dict[key]);
	}
}
function arrMinus(a, b) {
	let res = a.filter(x => !b.includes(x));
	return res;
}
function any(arr, cond) {
	return !empty(arr.filter(cond));
}
function anyStartsWith(arr, prefix) {
	return any(arr, el => startsWith(el, prefix));
}
function carteset(l1, l2) {
	//l1,l2 are lists of list
	let res = [];
	for (var el1 of l1) {
		for (var el2 of l2) {
			//if (isll(el2)) el2=el2.flat();
			if (isList(el1)) res.push(el1.concat(el2));
			else res.push([el1].concat(el2));
		}
	}
	return res;
}
function cartesian(s1, s2, sep = '_') {
	let res = [];
	for (const el1 of s1) {
		for (const el2 of s2) {
			res.push(el1 + '_' + el2);
		}
	}
	return res;
}
function cartesianOf(ll) {
	// like a branchlist in MTree
	let cart = ll[0];
	for (let i = 1; i < ll.length; i++) {
		cart = cartesian(cart, ll[i]);
	}
	return cart;
}
function chooseRandom(arr) {
	return chooseRandomElement(arr);
}
function chooseRandomElement(arr, condFunc = null) {
	let len = arr.length;
	if (condFunc) {
		let best = arr.filter(condFunc);
		if (!empty(best)) return chooseRandomElement(best);
	}
	let idx = Math.floor(Math.random() * len);
	return arr[idx];
}
function chooseDeterministicOrRandom(n, arr, condFunc = null) {
	if (n < 0) return chooseRandomElement(arr, condFunc);

	if (condFunc) {
		let best = arr.filter(condFunc);
		if (!empty(best)) return best[n % best.length];
	}
	return arr[n % arr.length];
}
function choose(arr, n) {
	var result = new Array(n);
	var len = arr.length;
	var taken = new Array(len);
	if (n > len) throw new RangeError('getRandom: more elements taken than available');
	while (n--) {
		var x = Math.floor(Math.random() * len);
		result[n] = arr[x in taken ? taken[x] : x];
		taken[x] = --len in taken ? taken[len] : len;
	}
	return result;
}
function contains(arr, el) {
	return arr.includes(el);
}
function containsAll(arr, lst) {
	for (const el of lst) {
		if (!arr.includes(el)) return false;
	}
	return true;
}
function containsSet(arr, lst) {
	return containsAll(arr, lst);
}
function containedInAny(el, ll) {
	// any list in ll contains element el
	for (const lst of ll) {
		if (lst.includes(el)) return true;
	}
	return false;
}
function empty(arr) {
	let result = arr === undefined || !arr || (isString(arr) && arr == '') || (Array.isArray(arr) && arr.length == 0);
	//console.log(typeof(arr),result?'EMPTY':arr)
	return result;
}
function first(arr) {
	return arr.length > 0 ? arr[0] : null;
}
function firstCond(arr, func) {
	//return first elem that fulfills condition
	let res = arr.filter(x => func(x));
	return res.length > 0 ? res[0] : null;
}
function findFirst(arr, attr, val) {
	let matches = arr.filter(x => attr in x && x[attr] == val);
	return empty(matches) ? null : matches[0];
}
function findSameSet(llst, lst) {
	// returns element of llst that has same elements as lst, even if different order
	for (const l of llst) {
		if (sameList(l, lst)) return l;
	}
	return null;
}
function fj(x) {
	return formatjson(x);
}
function formatll(ll) {
	//return beautiful string for list of lists
	//ensure this is a list of lists
	if (!isll(ll)) return 'NOT list of lists!';
	let s = '[';
	for (const l of ll) {
		let content = isllPlus(l) ? formatll(l) : l.toString();
		s += '[' + content + ']';
	}
	s += ']';
	//console.log(s);
}
function formatjson(j) {
	//return beautiful small json
	let s = JSON.stringify(j);
	s = s.replace(/\s/g, '');
	return s;
}
function getMissingIndices(arr, len) {
	let i = 0;
	let a = arr[i];
	let j = 0;
	let res = [];
	while (j < len) {
		while (j < a) {
			//console.log(j,a,'adding j')
			res.push(j);
			j += 1;
		}
		i += 1;
		j = a + 1;
		a = i < arr.length ? arr[i] : len;
	}
	return res;
}

function getListsContainingAll(ll, l) {
	let res = [];
	for (const l1 of ll) {
		if (containsAll(l1, l)) res.push(l1);
	}
	return res;
}
function intersection(arr1, arr2) {
	//each el in result will be unique
	let res = [];
	for (const a of arr1) {
		if (arr2.includes(a)) {
			addIf(a, res);
		}
	}
	return res;
}
function isEmpty(arr) {
	return empty(arr);
}
function isList(arr) {
	return Array.isArray(arr);
}
function isll(ll) {
	//true if arr is a list of lists of strings
	if (!isList(ll)) {
		//console.log('NOT a list',ll);
		return false;
	}
	for (const l of ll) {
		if (!isList(l)) {
			//console.log('element',l,'NOT a list!');
			return false;
		}
		for (const el of l) {
			if (!isString(el) && !isNumeric(el)) return false;
		}
	}
	return true;
}
function isllPlus(ll) {
	//true if arr is a list of lists
	if (!isList(ll)) {
		//console.log('NOT a list',ll);
		return false;
	}
	for (const l of ll) {
		if (!isList(l)) {
			//console.log('element',l,'NOT a list!');
			return false;
		}
	}
	return true;
}
function keepOnlyElements(func, lst) {
	return lst.filter(func);
}
function last(arr) {
	return arr.length > 0 ? arr[arr.length - 1] : null;
}
function orderFromTo(lst, fromOrder, toOrder) {
	let res = [];
	for (let i = 0; i < lst.length; i++) {
		res.push(lst[fromOrder.indexOf(toOrder[i])]);
	}
	//console.log(res)
	return res;
}
function prjstart(j) {
	console.log('______', formatjson(j));
}
function prj(j) {
	console.log(formatjson(j));
}
function pr(x) {
	console.log(prlist(x).replace(/,,/g, ','));
}
function prll(ll) {
	//ensure this is a list of lists
	if (!isList(ll)) {
		//console.log('NOT a list',ll);
		return;
	}
	for (const l of ll) {
		if (!isList(ll)) {
			console.log('element', l, 'NOT a list!');
			return;
		}
	}
	let s = '[';
	for (const l of ll) {
		s += '[' + l.toString() + ']';
	}
	s += ']';
	//console.log(s);
}
function prlist(arr) {
	if (isList(arr)) {
		if (isEmpty(arr)) return '';
		else return '[' + prlist(arr[0]) + arr.slice(1).map(x => ',' + prlist(x)) + ']';
	} else return arr;
}
function removeByProp(arr, prop, val) {
	for (var i = 0; i < arr.length; i++) {
		if (arr[i][prop] === val) {
			arr.splice(i, 1);
			i--;
			return;
		}
	}
}
function removeInPlace(arr, el) {
	for (var i = 0; i < arr.length; i++) {
		if (arr[i] === el) {
			arr.splice(i, 1);
			i--;
			return;
		}
	}
}
function someFunction() {
	//console.log("hhhhhhhhhhhhhhhhhhhhhhhhhhh");
}
function sameList(l1, l2) {
	// compares 2 lists of strings if have same strings in it
	if (l1.length != l2.length) return false;
	for (const s of l1) {
		if (!l2.includes(s)) return false;
	}
	return true;
}
function uniqueFirstLetters(arr) {
	let res = [];
	for (const s of arr) {
		if (s.length > 0) {
			addIf(s[0], res);
		}
	}
	return res;
}
function without(arr, elementToRemove) {
	return arr.filter(function(el) {
		return el !== elementToRemove;
	});
}

//#endregion array helpers

//#region color conversion
function standardize_color(str) {
	var c = document.createElement('canvas').getContext('2d');
	c.fillStyle = str;
	return c.fillStyle;
}
function hex2rgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	result = result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
		  }
		: null;
	if (result) return `rgb(${result.r},${result.g},${result.b})`;
	else return 'rgb(0,0,0)';
}

function rgb2hsl(r, g, b) {
	(r /= 255), (g /= 255), (b /= 255);

	var max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	var h,
		s,
		l = (max + min) / 2;

	if (max == min) {
		h = s = 0; // achromatic
	} else {
		var d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}

		h /= 6;
	}

	return [h, s, l];
}
var Epsilon = 1e-10;

function RGBtoHCV(RGB) {
	// Based on work by Sam Hocevar and Emil Persson
	let P = RGB.g < RGB.b ? float4(RGB.bg, -1.0, 2.0 / 3.0) : float4(RGB.gb, 0.0, -1.0 / 3.0);
	let Q = RGB.r < P.x ? float4(P.xyw, RGB.r) : float4(RGB.r, P.yzx);
	let C = Q.x - min(Q.w, Q.y);
	let H = abs((Q.w - Q.y) / (6 * C + Epsilon) + Q.z);
	return float3(H, C, Q.x);
}
function h2rgb(h) {
	let r = Math.abs(h * 6 - 3) - 1;
	let g = 2 - Math.abs(h * 6 - 2);
	let b = 2 - Math.abs(h * 6 - 4);
	return saturate(float3(r, g, b));
}
function hsl2rgb(h, s, l) {
	let RGB = h2rgb(h);
	let C = (1 - Math.abs(2 * l - 1)) * s;
	return (RGB - 0.5) * C + l;
}
function hsv2hsl(hue, sat, val) {
	return [
		//[hue, saturation, lightness]
		//Range should be between 0 - 1
		hue, //Hue stays the same

		//Saturation is very different between the two color spaces
		//If (2-sat)*val < 1 set it to sat*val/((2-sat)*val)
		//Otherwise sat*val/(2-(2-sat)*val)
		//Conditional is not operating with hue, it is reassigned!
		(sat * val) / ((hue = (2 - sat) * val) < 1 ? hue : 2 - hue),

		hue / 2 //Lightness is (2-sat)*val/2
		//See reassignment of hue above
	];
}
function hsl2hsv(hue, sat, light) {
	sat *= light < 0.5 ? light : 1 - light;

	return [
		//[hue, saturation, value]
		//Range should be between 0 - 1

		hue, //Hue stays the same
		(2 * sat) / (light + sat), //Saturation
		light + sat //Value
	];
}
function rgb2hex(r, g, b) {
	return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function rgb2hsv(r, g, b) {
	let v = Math.max(r, g, b);
	let n = v - Math.min(r, g, b);
	let h = n && (v == r ? (g - b) / n : v == g ? 2 + (b - r) / n : 4 + (r - g) / n);
	h = 60 * (h < 0 ? h + 6 : h);
	s = v && n / v;
	return {
		h: h,
		s: s * 100,
		v: (v * 100) / 255
	};
}

//#endregion

//#region color helpers

function fromArray(arr) {
	return colorArrToString(...arr);
}
function fromArrayDarker(arr) {
	let c = fromArray(arr);
	return pSBC(-0.4, c);
}
function fromArrayLighter(arr) {
	let c = fromArray(arr);
	return pSBC(0.4, c);
}
function colorArrToString(r, g, b) {
	return 'rgb(' + r + ',' + g + ',' + b + ')';
}
const pSBC = (p, c0, c1, l) => {
	let r,
		g,
		b,
		P,
		f,
		t,
		h,
		i = parseInt,
		m = Math.round,
		a = typeof c1 == 'string';
	if (typeof p != 'number' || p < -1 || p > 1 || typeof c0 != 'string' || (c0[0] != 'r' && c0[0] != '#') || (c1 && !a)) return null;
	if (!this.pSBCr)
		this.pSBCr = d => {
			let n = d.length,
				x = {};
			if (n > 9) {
				([r, g, b, a] = d = d.split(',')), (n = d.length);
				if (n < 3 || n > 4) return null;
				(x.r = i(r[3] == 'a' ? r.slice(5) : r.slice(4))), (x.g = i(g)), (x.b = i(b)), (x.a = a ? parseFloat(a) : -1);
			} else {
				if (n == 8 || n == 6 || n < 4) return null;
				if (n < 6) d = '#' + d[1] + d[1] + d[2] + d[2] + d[3] + d[3] + (n > 4 ? d[4] + d[4] : '');
				d = i(d.slice(1), 16);
				if (n == 9 || n == 5) (x.r = (d >> 24) & 255), (x.g = (d >> 16) & 255), (x.b = (d >> 8) & 255), (x.a = m((d & 255) / 0.255) / 1000);
				else (x.r = d >> 16), (x.g = (d >> 8) & 255), (x.b = d & 255), (x.a = -1);
			}
			return x;
		};
	(h = c0.length > 9),
		(h = a ? (c1.length > 9 ? true : c1 == 'c' ? !h : false) : h),
		(f = pSBCr(c0)),
		(P = p < 0),
		(t = c1 && c1 != 'c' ? pSBCr(c1) : P ? {r: 0, g: 0, b: 0, a: -1} : {r: 255, g: 255, b: 255, a: -1}),
		(p = P ? p * -1 : p),
		(P = 1 - p);
	if (!f || !t) return null;
	if (l) (r = m(P * f.r + p * t.r)), (g = m(P * f.g + p * t.g)), (b = m(P * f.b + p * t.b));
	else (r = m((P * f.r ** 2 + p * t.r ** 2) ** 0.5)), (g = m((P * f.g ** 2 + p * t.g ** 2) ** 0.5)), (b = m((P * f.b ** 2 + p * t.b ** 2) ** 0.5));
	(a = f.a), (t = t.a), (f = a >= 0 || t >= 0), (a = f ? (a < 0 ? t : t < 0 ? a : a * P + t * p) : 0);
	if (h) return 'rgb' + (f ? 'a(' : '(') + r + ',' + g + ',' + b + (f ? ',' + m(a * 1000) / 1000 : '') + ')';
	else return '#' + (4294967296 + r * 16777216 + g * 65536 + b * 256 + (f ? m(a * 255) : 0)).toString(16).slice(1, f ? undefined : -2);
};
function hexToRgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
		  }
		: null;
}

function hslToHsv(h, s, l) {
	//h in [0,360], s,l in percent, a in [0,1]
	let newh = h;
	l /= 100.0;
	s /= 100.0;
	//console.log(h, s, l);
	let newv = (2 * l + s * (1 - Math.abs(2 * l - 1))) / 2;
	let news = (2 * (newv - l)) / newv;
	//console.log(newh, news, newv);
	let rgb = hsvToRgb(newh, news, newv);
	let result = [h, s, l, newh, news, newv];
	result.push(rgbToHex(rgb[0], rgb[1], rgb[2]));
	return result;
}

function hslToHslaString(h, s, l, a = 1) {
	// hsl is object
	return 'hsla(' + h + ', ' + s + '%, ' + l + '%, ' + a + ')';
}

function hsvToHsl(h, s, v) {
	//h in [0,360], s,l in percent, a in [0,1]
	let newh = h;
	s /= 100.0;
	v /= 100.0;
	//console.log(h, s, v);
	let newl = 0.5 * v * (2 - s);
	let news = (v * s) / (1 - Math.abs(2 * s - 1));
	//console.log(newh, news, newl);
	return {
		h: newh,
		s: news,
		l: newl
	};
	// let rgb = hsvToRgb(newh,news,newv);
	// let result = [h,s,l,newh,news,newv];
	// result.push(rgbToHex(rgb[0],rgb[1],rgb[2]));
	// return result;
}

function hsvToRgb(h, s, v) {
	//expects input: h in [0,360] and s,v in [0,1] - output: [r,g,b] in [0,1]
	let f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
	//return [f(5),f(3),f(1)]; // this returns r,g,b in [0,1]
	return [Math.floor(f(5) * 255), Math.floor(f(3) * 255), Math.floor(f(1) * 255)];
}
function rgbToHsl(r, g, b) {
	(r /= 255), (g /= 255), (b /= 255);

	var max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	var h,
		s,
		l = (max + min) / 2;

	if (max == min) {
		h = s = 0; // achromatic
	} else {
		var d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}

		h /= 6;
	}

	return [h, s, l];
}
function dlColor(factor, r, g, b) {
	//console.log(r, g, b);
	let hsl = rgbToHsl(r, g, b);
	let hsv = hsl2hsv(...hsl);

	let h = hsv[0];
	let s = hsv[1];
	let v = hsv[2];

	v *= factor;

	hsl = hsv2hsl(h, s, v);
	let l = hsl[2];

	let sperc = s * 100;
	let lperc = l * 100;

	// let hsv = rgbToHsv(r, g, b);
	// let h = hsv.h;
	// let s = hsv.s;
	// let v = hsv.v / 2;
	// //console.log("hsv", h, s, v);
	// let hsl = hsv2hsl(h, s, v); //hsvToHsl(h, s, v);
	// let h = hsl[0];
	// let s = hsl[1] * 100;
	// let l = hsl[2] * 100;
	// let v = hsv[2];
	//console.log("h,s,l,v:", h, s, l, v); //hsl[0], hsl[1], hsl[2]);
	return hslToHslaString(h, sperc, lperc); //hsl[0], hsl[1], hsl[2]);
}

function blackOrWhite(cssHSLA, maxLumForWhite = 88) {
	//returns 'black' or 'white' depending on hue and luminosity
	let l = getLuminosity(cssHSLA);
	let hue = getHue(cssHSLA);
	if (hue > 40 && hue < 90) maxLumForWhite = 60;
	let result = l <= maxLumForWhite ? 'white' : 'black';
	//console.log('lum(' + l + '), hue(' + hue + ') : ' + result);
	return result;
}

function colorNameToHexString(str) {
	//str is color name
	var ctx = document.createElement('canvas').getContext('2d');
	ctx.fillStyle = str;
	return ctx.fillStyle;
}

function colorNameToHslaString(str) {
	let hex = colorNameToHexString(str);
	//hex string to rgb
	let rgb = hexToRgb(hex);
	//rgb to hsv
	let hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
	//hsv to hsl
	let hsl = hsvToHsl(hsv.h, hsv.s, hsv.v);
	//hsl to hsla string
	hsla = hslToHslaString(hsl.h, hsl.s, hsl.l, 1);
	return hsla;
}
function colorNameToRgb(str) {
	let hex = colorNameToHexString(str);
	//hex string to rgb
	let rgb = hexToRgb(hex);
	return rgb;
}
function convertToRgba(cAny, alpha = 1) {
	//alpha either value btween 0 and 1 or 0-255
	let a = alpha >= 0 && alpha <= 1 ? alpha : alpha / 100; //alpha==0?0:alpha==1?255:alpha<1?Math.round(alpha*100):alpha;
	//console.log("type is", typeof cAny);
	if (isString(cAny)) {
		//console.log("convertToRgba is a String", cAny);
		if (cAny[0] == '#') {
			let rgbObj = hexToRgb(cAny);
			return `rgba(${rgbObj.r},${rgbObj.g},${rgbObj.b},${a})`;
		} else if (startsWith(cAny, 'hsl') || startsWith(cAny, 'rgb')) {
			//console.log("hsla or rgba color!", cAny);
			return cAny;
		} else if (cAny == 'transparent') {
			return cAny;
		} else {
			//assume colorname
			//console.log("should be a color name!!!", cAny);
			let rgbObj = colorNameToRgb(cAny);
			return `rgba(${rgbObj.r},${rgbObj.g},${rgbObj.b},${a})`;
		}
	} else if (Array.isArray(cAny)) {
		if (cAny.length == 3) {
			//assume this is a rgb
			let r = cAny[0];
			let g = cAny[1];
			let b = cAny[2];
			return `rgba(${r},${g},${b},${a})`;
		} else {
			//return a random color
			//console.log("convertToRgba: ERROR! NOT A COLOR:", cAny);
			return randomColor(100, 70, a);
		}
	}
}
function getColorNames() {
	return [
		'AliceBlue',
		'AntiqueWhite',
		'Aqua',
		'Aquamarine',
		'Azure',
		'Beige',
		'Bisque',
		'Black',
		'BlanchedAlmond',
		'Blue',
		'BlueViolet',
		'Brown',
		'BurlyWood',
		'CadetBlue',
		'Chartreuse',
		'Chocolate',
		'Coral',
		'CornflowerBlue',
		'Cornsilk',
		'Crimson',
		'Cyan',
		'DarkBlue',
		'DarkCyan',
		'DarkGoldenRod',
		'DarkGray',
		'DarkGrey',
		'DarkGreen',
		'DarkKhaki',
		'DarkMagenta',
		'DarkOliveGreen',
		'DarkOrange',
		'DarkOrchid',
		'DarkRed',
		'DarkSalmon',
		'DarkSeaGreen',
		'DarkSlateBlue',
		'DarkSlateGray',
		'DarkSlateGrey',
		'DarkTurquoise',
		'DarkViolet',
		'DeepPink',
		'DeepSkyBlue',
		'DimGray',
		'DimGrey',
		'DodgerBlue',
		'FireBrick',
		'FloralWhite',
		'ForestGreen',
		'Fuchsia',
		'Gainsboro',
		'GhostWhite',
		'Gold',
		'GoldenRod',
		'Gray',
		'Grey',
		'Green',
		'GreenYellow',
		'HoneyDew',
		'HotPink',
		'IndianRed',
		'Indigo',
		'Ivory',
		'Khaki',
		'Lavender',
		'LavenderBlush',
		'LawnGreen',
		'LemonChiffon',
		'LightBlue',
		'LightCoral',
		'LightCyan',
		'LightGoldenRodYellow',
		'LightGray',
		'LightGrey',
		'LightGreen',
		'LightPink',
		'LightSalmon',
		'LightSeaGreen',
		'LightSkyBlue',
		'LightSlateGray',
		'LightSlateGrey',
		'LightSteelBlue',
		'LightYellow',
		'Lime',
		'LimeGreen',
		'Linen',
		'Magenta',
		'Maroon',
		'MediumAquaMarine',
		'MediumBlue',
		'MediumOrchid',
		'MediumPurple',
		'MediumSeaGreen',
		'MediumSlateBlue',
		'MediumSpringGreen',
		'MediumTurquoise',
		'MediumVioletRed',
		'MidnightBlue',
		'MintCream',
		'MistyRose',
		'Moccasin',
		'NavajoWhite',
		'Navy',
		'OldLace',
		'Olive',
		'OliveDrab',
		'Orange',
		'OrangeRed',
		'Orchid',
		'PaleGoldenRod',
		'PaleGreen',
		'PaleTurquoise',
		'PaleVioletRed',
		'PapayaWhip',
		'PeachPuff',
		'Peru',
		'Pink',
		'Plum',
		'PowderBlue',
		'Purple',
		'RebeccaPurple',
		'Red',
		'RosyBrown',
		'RoyalBlue',
		'SaddleBrown',
		'Salmon',
		'SandyBrown',
		'SeaGreen',
		'SeaShell',
		'Sienna',
		'Silver',
		'SkyBlue',
		'SlateBlue',
		'SlateGray',
		'SlateGrey',
		'Snow',
		'SpringGreen',
		'SteelBlue',
		'Tan',
		'Teal',
		'Thistle',
		'Tomato',
		'Turquoise',
		'Violet',
		'Wheat',
		'White',
		'WhiteSmoke',
		'Yellow',
		'YellowGreen'
	];
}

function getColorHexes(x) {
	return [
		'f0f8ff',
		'faebd7',
		'00ffff',
		'7fffd4',
		'f0ffff',
		'f5f5dc',
		'ffe4c4',
		'000000',
		'ffebcd',
		'0000ff',
		'8a2be2',
		'a52a2a',
		'deb887',
		'5f9ea0',
		'7fff00',
		'd2691e',
		'ff7f50',
		'6495ed',
		'fff8dc',
		'dc143c',
		'00ffff',
		'00008b',
		'008b8b',
		'b8860b',
		'a9a9a9',
		'a9a9a9',
		'006400',
		'bdb76b',
		'8b008b',
		'556b2f',
		'ff8c00',
		'9932cc',
		'8b0000',
		'e9967a',
		'8fbc8f',
		'483d8b',
		'2f4f4f',
		'2f4f4f',
		'00ced1',
		'9400d3',
		'ff1493',
		'00bfff',
		'696969',
		'696969',
		'1e90ff',
		'b22222',
		'fffaf0',
		'228b22',
		'ff00ff',
		'dcdcdc',
		'f8f8ff',
		'ffd700',
		'daa520',
		'808080',
		'808080',
		'008000',
		'adff2f',
		'f0fff0',
		'ff69b4',
		'cd5c5c',
		'4b0082',
		'fffff0',
		'f0e68c',
		'e6e6fa',
		'fff0f5',
		'7cfc00',
		'fffacd',
		'add8e6',
		'f08080',
		'e0ffff',
		'fafad2',
		'd3d3d3',
		'd3d3d3',
		'90ee90',
		'ffb6c1',
		'ffa07a',
		'20b2aa',
		'87cefa',
		'778899',
		'778899',
		'b0c4de',
		'ffffe0',
		'00ff00',
		'32cd32',
		'faf0e6',
		'ff00ff',
		'800000',
		'66cdaa',
		'0000cd',
		'ba55d3',
		'9370db',
		'3cb371',
		'7b68ee',
		'00fa9a',
		'48d1cc',
		'c71585',
		'191970',
		'f5fffa',
		'ffe4e1',
		'ffe4b5',
		'ffdead',
		'000080',
		'fdf5e6',
		'808000',
		'6b8e23',
		'ffa500',
		'ff4500',
		'da70d6',
		'eee8aa',
		'98fb98',
		'afeeee',
		'db7093',
		'ffefd5',
		'ffdab9',
		'cd853f',
		'ffc0cb',
		'dda0dd',
		'b0e0e6',
		'800080',
		'663399',
		'ff0000',
		'bc8f8f',
		'4169e1',
		'8b4513',
		'fa8072',
		'f4a460',
		'2e8b57',
		'fff5ee',
		'a0522d',
		'c0c0c0',
		'87ceeb',
		'6a5acd',
		'708090',
		'708090',
		'fffafa',
		'00ff7f',
		'4682b4',
		'd2b48c',
		'008080',
		'd8bfd8',
		'ff6347',
		'40e0d0',
		'ee82ee',
		'f5deb3',
		'ffffff',
		'f5f5f5',
		'ffff00',
		'9acd32'
	];
}

function getLuminosity(cssHSLA) {
	//return luminosity in percent
	////console.log('css: ',cssHSLA);
	let ints = allNumbers(cssHSLA);
	return ints[2];
}

function getHue(cssHSLA) {
	//return luminosity in percent
	////console.log('css: ',cssHSLA);
	let h = firstNumber(cssHSLA);
	return h;
}

function hue(h) {
	var r = Math.abs(h * 6 - 3) - 1;
	var g = 2 - Math.abs(h * 6 - 2);
	var b = 2 - Math.abs(h * 6 - 4);
	return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}
const complementaryColor = color => {
	const hexColor = color.replace('#', '0x');

	return `#${('000000' + ('0xffffff' ^ hexColor).toString(16)).slice(-6)}`;
};
// complementaryColor('#ff0000'); // #00ffff
function niceColor(rgb) {
	// assumes "rgb(R,G,B)" string
	let hsl = rgb2hsl(rgb);
	hsl[0] = (hsl[0] + 0.5) % 1; // Hue
	hsl[1] = (hsl[1] + 0.5) % 1; // Saturation
	hsl[2] = (hsl[2] + 0.5) % 1; // Luminocity
	return 'hsl(' + hsl[0] * 360 + ',' + hsl[1] * 100 + '%,' + hsl[2] * 100 + '%)';
}
// assumes bgColor is a rgb() string: "rgb(66, 134, 244)"
function getTextColor(c) {
	let rgb = c
		.substring(4, c.indexOf(')'))
		.split(', ')
		.map(x => parseInt(x));
	let o = Math.round((parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000);
	return o > 125 ? 'black' : 'white';
}

function idealTextColor(bg, grayPreferred = false) {
	//bg color name or hex string!
	const nThreshold = 105; //40; //105;
	if (bg.substring(0, 1) != '#') bg = colorNameToHexString(bg);
	rgb = hexToRgb(bg);
	r = rgb.r;
	g = rgb.g;
	b = rgb.b;
	var bgDelta = r * 0.299 + g * 0.587 + b * 0.114;
	var foreColor = 255 - bgDelta < nThreshold ? 'black' : 'white';
	if (grayPreferred) foreColor = 255 - bgDelta < nThreshold ? 'dimgray' : 'snow';
	return foreColor;
}

function randomColor(s = 100, l = 70, a = 1) {
	//s,l in percent, a in [0,1], returns hsla string
	var hue = Math.random() * 360;
	return hslToHslaString(hue, s, l, a);
}

function rgbToHex(r, g, b) {
	return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function rgbToHsv(r, g, b) {
	let v = Math.max(r, g, b);
	let n = v - Math.min(r, g, b);
	let h = n && (v == r ? (g - b) / n : v == g ? 2 + (b - r) / n : 4 + (r - g) / n);
	h = 60 * (h < 0 ? h + 6 : h);
	s = v && n / v;
	return {
		h: h,
		s: s * 100,
		v: (v * 100) / 255
	};
}
function darkerColor(r, g, b) {
	let hsv = rgbToHsv(r, g, b);
	//console.log(hsv);
	let h = hsv.h;
	let s = hsv.s;
	let v = hsv.v / 2;
	let hsl = hsvToHsl(h, s, v);
	h = hsl.h;
	s = hsl.s * 100;
	let l = hsl.l * 100;
	//console.log('hsl:',h,s,l)
	return hslToHslaString(h, s, l);
}
function lighterColor(r, g, b) {
	let hsv = rgbToHsv(r, g, b);
	//console.log(hsv);
	let h = hsv.h;
	let s = hsv.s;
	let v = hsv.v * 1.5;
	let hsl = hsvToHsl(h, s, v);
	h = hsl.h;
	s = hsl.s * 100;
	let l = hsl.l * 100;
	//console.log('hsl:',h,s,l)
	return hslToHslaString(h, s, l);
}
function transColor(r, g, b, a) {
	return 'rgba(r,g,b,a)';
}
//#endregion

//#region dictionary helpers
function isType(sType, val) {
	// uses existing (global) config data to infer type from val
	////console.log("isType called!",sType, val, regions, units);
	switch (sType) {
		case 'region':
			return val in regions;
		case 'power':
			return val in unitsPerPower;
		case 'unit':
			return val in units;
		case 'faction':
			return val in ['Axis', 'West', 'USSR'];
	}
	return false;
}
function inferType(val) {
	for (const t of ['region', 'power', 'unit', 'faction']) {
		if (isType(t, val)) {
			return t;
		}
	}
	return 'unknown';
}
//#endregion dictionary helpers

//#region DOM helpers:
function arrChildren(elem) {
	return [...elem.children];
}
function clearElement(elem, eventHandlerDictByEvent = {}) {
	while (elem.firstChild) {
		for (key in eventHandlerDictByEvent) {
			elem.removeEventListener(key, eventHandlerDictByEvent[key]);
		}
		let el = elem.firstChild;
		elem.removeChild(el);
		//console.log('removed',el)
	}
}
function clearElementFromChildIndex(elem, idx = 0) {
	let charr = arrChildren(elem).slice(idx);
	for (const ch of charr) {
		elem.removeChild(ch);
	}
}
function closestParent(elem, selector) {
	for (; elem && elem !== document; elem = elem.parentNode) {
		if (elem.matches(selector)) return elem;
	}
	return null;
}
function findParentWithId(elem) {
	////console.log(elem);
	while (elem && !elem.id) {
		elem = elem.parentNode;
	}
	////console.log("parent with id: ", elem);
	return elem;
}
function ellipsis(text, font, width, padding) {
	let textLength = getTextWidth(text, font);
	let ellipsisLength = 0;
	while (textLength + ellipsisLength > width - 2 * padding && text.length > 0) {
		text = text.slice(0, -1).trim();
		ellipsisLength = getTextWidth('...', font);
		textLength = getTextWidth(text, font); //self.node().getComputedTextLength();
	}
	return ellipsisLength > 0 ? text + '...' : text;
}
function ensureInView(container, element) {
	//Determine container top and bottom
	let cTop = container.scrollTop;
	let cBottom = cTop + container.clientHeight;

	//Determine element top and bottom
	let eTop = element.offsetTop;
	let eBottom = eTop + element.clientHeight;

	//Check if out of view
	if (eTop < cTop) {
		container.scrollTop -= cTop - eTop;
	} else if (eBottom > cBottom) {
		container.scrollTop += eBottom - cBottom;
	}
}
function evToId(ev) {
	let elem = findParentWithId(ev.target);
	return elem.id;
}
function evToIdParent(ev) {
	let elem = findParentWithId(ev.target);
	return elem;
}
function getParentOfScript() {
	// finds script in which this function is called
	var thisScript = document.scripts[document.scripts.length - 1];
	var parent = thisScript.parentElement;
	return parent;
}
function getTextWidth(text, font) {
	// re-use canvas object for better performance
	var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement('canvas'));
	var context = canvas.getContext('2d');
	context.font = font;
	var metrics = context.measureText(text);
	return metrics.width;
}
function hide(elem) {
	if (isSvg(elem)) {
		hideSvg(elem);
	} else {
		elem.classList.add('hidden');
	}
}
function hideSvg(elem) {
	elem.setAttribute('style', 'visibility:hidden;display:none');
}
function insertHere() {
	var thisScript = document.scripts[document.scripts.length - 1];
	var parent = thisScript.parentElement;
	for (let i = 0; i < arguments.length; i++) {
		const el = arguments[i];
		if (typeof el == 'string') {
			thisScript.nextSibling.insertAdjacentHTML('beforebegin', el);
		} else {
			parent.insertBefore(el, thisScript.nextSibling);
		}
	}
}
function isSvg(elem) {
	return startsWith(elem.constructor.name, 'SVG');
}
function isVisible(elem) {
	if (isSvg(elem)) {
		let style = elem.getAttribute('style');
		if (style) return !style.includes('hidden');
		else return true;
	} else {
		return !elem.classList.includes('hidden');
	}
}
function makeSvg(w, h) {
	const svg1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg1.setAttribute('width', w);
	svg1.setAttribute('height', h);
	return svg1;
}
function show(elem) {
	if (isSvg(elem)) {
		showSvg(elem);
	} else {
		elem.classList.remove('hidden');
	}
}
function showSvg(elem) {
	elem.setAttribute('style', 'visibility:visible');
}
function toHTMLString(msg) {
	msg = JSON.stringify(msg);
	msg = msg.replace(/(?:\r\n|\r|\n)/g, '<br>');
	msg = msg.replace('\\n', '<br>');
	msg = msg.replace(/\\n/g, '<br>');
	msg = msg.replace(/"/g, '');
	return msg.trim();
}
//tableCreate();
function makeKeyValueTable(data) {
	let cols = 2;
	let rows = data.length;
	let res = `<table>`;
	for (const k in data) {
		res += `<tr><th>${k}</th><td>${data[k]}</td></tr>`;
	}
	res += `</table>`;
	let res1 = (elem = new DOMParser().parseFromString(res, 'text/html').body.firstChild);
	return res1;
}

function makeTable(tableName, rowHeaders, colHeaders) {
	let cols = colHeaders.length + 1;
	let rows = rowHeaders.length + 1;
	let sh = `<table id='${tableName}'><tr><th></th>`;
	for (const ch of colHeaders) {
		sh += `<th id='${ch}Header'>${ch}</th>`;
	}
	sh += `</tr>`;
	for (const rh of rowHeaders) {
		sh += `<tr id='${rh}${tableName}'><th>${rh}</th>`;
		for (const ch of colHeaders) {
			sh += `<td id='${rh}${ch}'>0</td>`;
		}
		sh += `</tr>`;
	}
	sh += `</table>`;
	let res = (elem = new DOMParser().parseFromString(sh, 'text/html').body.firstChild);
	return res;
}
function makeCadreTable(powers) {
	let cadreTypes = ['Infantry', 'Fortress', 'Tank', 'AirForce', 'Fleet', 'Carrier', 'Submarine'];
	//let powers = ['Germany','Italy','Britain','France','USA','USSR'];
	let table = makeTable('AvailableCadres', cadreTypes, powers);
	addTableTo(table);
}
function addTableTo(table) {
	let div = document.getElementById('slideInAvailableCadres');
	div.appendChild(table);
}

//#endregion

//#region flask server: uses jQuery ajax!
// function loadTest(){
//   $.ajax({
//     url: "/loadTest",
//     type: "GET",
//     success: function(response) {
//       //console.log(response);
//     },
//     error: function(error) {
//       //console.log(error);
//     }
//   });
// }
// function loadScenario(){
//   $.ajax({
//     url: "/loadTest",
//     type: "GET",
//     success: function(response) {
//       //console.log(response);
//     },
//     error: function(error) {
//       //console.log(error);
//     }
//   });
// }
function saveJsonAtServer(jsonObject, filename) {
	event.preventDefault();
	var labels = ['hallo', 'das', 'ist']; //checkboxes.toArray().map(checkbox => checkbox.value);

	$.ajax({
		url: '/postTest',
		type: 'POST',
		data: JSON.stringify(jsonObject),
		processData: false,
		contentType: 'application/json; charset=UTF-8',
		success: function(response) {
			//console.log(response);
		},
		error: function(error) {
			//console.log(error);
		}
	});
}
//#endregion

//#region file helpers
function loadJSON(path, callback) {
	//console.log(path);
	var xobj = new XMLHttpRequest();
	xobj.overrideMimeType('application/json');
	xobj.open('GET', path, true); //path example: '../news_data.json'
	xobj.onreadystatechange = function() {
		if (xobj.readyState == 4 && xobj.status == '200') {
			callback(JSON.parse(xobj.responseText));
		}
	};
	xobj.send(null);
}
function loadYML(path, callback) {
	////console.log(path);
	res = undefined;
	$.get(path) // eg. '/common/resources/LessonContentsLv01Ln01.yml'
		.done(function(data) {
			////console.log("File load complete");
			var yml = jsyaml.load(data);
			////console.log(yml);
			var jsonString = JSON.stringify(data);
			var json = $.parseJSON(jsonString);
			////console.log(jsonString);
			////console.log(json);
			callback(yml);
		});
}
function download(jsonObject, fname) {
	json_str = JSON.stringify(jsonObject);
	saveFile(fname + '.json', 'data:application/json', new Blob([json_str], {type: ''}));
}
function saveFile(name, type, data) {
	// Function to download data to a file
	//usage:
	// json_str = JSON.stringify(G);
	// saveFile("yourfilename.json", "data:application/json", new Blob([json_str], {type: ""}));

	if (data != null && navigator.msSaveBlob) return navigator.msSaveBlob(new Blob([data], {type: type}), name);

	var a = $("<a style='display: none;'/>");
	var url = window.URL.createObjectURL(new Blob([data], {type: type}));
	a.attr('href', url);
	a.attr('download', name);
	$('body').append(a);
	a[0].click();
	setTimeout(function() {
		// fixes firefox html removal bug
		window.URL.revokeObjectURL(url);
		a.remove();
	}, 500);
}

//usage: https://stackoverflow.com/questions/48073151/read-local-json-file-into-variable
// loadJSON(function(json) {
//   //console.log(json); // this will log out the json object
// });
//#endregion file helpers

//#region id helpers
function comp_(...arr) {
	return arr.join('_');
}
function comp_1(id) {
	return stringBefore(id, '_');
}
function comp_2(id) {
	return stringBefore(stringAfter(id, '_'), '_');
}
function comp_last(id) {
	return stringAfterLast(id, '_');
}

function complus(...arr) {
	return arr.join('+');
}
function complus1(id) {
	return stringBefore(id, '+');
}
function complus2(id) {
	return stringBefore(stringAfter(id, '+'), '+');
}
function compluslast(id) {
	return stringAfterLast(id, '+');
}
//#endregion id helpers

//#region io helpers
function dump(...arr) {
	for (const a of arr) {
		console.log(a);
	}
}
function error(msg) {
	console.log('ERROR!!!!! ' + msg);
}
//#endregion io helpers

//#region layout helpers
function calculateDims(n, sz = 60, minRows = 1) {
	var rows = minRows;
	var cols = Math.ceil(n / rows);
	var gap = 10;
	var padding = 20;
	let w = 9999999;
	//console.log('calculateDims with:',rows,cols)
	let rOld = 0;
	while (true) {
		rOld = rows;
		for (var i = Math.max(2, rows); i < n / 2; i++) {
			if (n % i == 0) {
				rows = i;
				cols = n / i;
				break;
			}
		}
		w = padding * 2 - gap + (sz + gap) * cols;
		if (w > window.innerWidth) {
			if (rows == rOld) {
				rows += 1;
				cols = Math.ceil(n / rows);
			} else if (gap > 1) gap -= 1;
			else if (padding > 1) padding -= 2;
			else {
				minRows += 1;
				gap = 6;
				padding = 10;
			}
		} else break;
		if (rows == rOld) break;
	}
	return {rows: rows, cols: cols, gap: gap, padding: padding, width: w};
}

function mup(o, p, d) {
	p = {x: p.x, y: p.y - d};
	if (o) o.setPos(p.x, p.y);
	return p;
}
function mri(o, p, d) {
	p = {x: p.x + d, y: p.y};
	if (o) o.setPos(p.x, p.y);
	return p;
}
function mdo(o, p, d) {
	p = {x: p.x, y: p.y + d};
	if (o) o.setPos(p.x, p.y);
	return p;
}
function mle(o, p, d) {
	p = {x: p.x - d, y: p.y};
	if (o) o.setPos(p.x, p.y);
	return p;
}
function snail(p, o, d) {
	if (o.length == 0) return;
	//console.log(p,o)

	o[0].setPos(p.x, p.y);
	n = o.length;
	let step = 1;
	let k = 1;
	while (true) {
		for (i = 0; i < step; i++) {
			if (k < n) {
				p = mup(o[k], p, d);
				k += 1;
			} else return;
		}
		for (i = 0; i < step; i++) {
			if (k < n) {
				p = mri(o[k], p, d);
				k += 1;
			} else return;
		}
		step += 1;
		for (i = 0; i < step; i++) {
			if (k < n) {
				p = mdo(o[k], p, d);
				k += 1;
			} else return;
		}
		for (i = 0; i < step; i++) {
			if (k < n) {
				p = mle(o[k], p, d);
				k += 1;
			} else return;
		}
		step += 1;
	}
}
function calcSnailPositions(x, y, d, n) {
	let p = {x: x, y: y};
	let res = [p];
	let step = 1;
	let k = 1;
	while (true) {
		for (i = 0; i < step; i++) {
			if (k < n) {
				p = mup(null, p, d);
				res.push(p);
				k += 1;
			} else return res;
		}
		for (i = 0; i < step; i++) {
			if (k < n) {
				p = mri(null, p, d);
				res.push(p);
				k += 1;
			} else return res;
		}
		step += 1;
		for (i = 0; i < step; i++) {
			if (k < n) {
				p = mdo(null, p, d);
				res.push(p);
				k += 1;
			} else return res;
		}
		for (i = 0; i < step; i++) {
			if (k < n) {
				p = mle(null, p, d);
				res.push(p);
				k += 1;
			} else return res;
		}
		step += 1;
	}
}

//   let p=[[x,y],[x,y-sz],[x+sz,y-sz],[x+sz,y],[x+sz,y+sz],[x,y+sz],[x-sz,y+sz],[x-sz,y],[x-sz,y-sz]];
//   let s2=sz*2;
//   p=p.concat([[x-sz,y-s2],[x,y-s2],[x+sz,y-s2],[x+s2,y-s2],[x+s2,y-s2]]);
//   p=p.concat([[x+s2,y-s2],[x+s2,y-sz],[x+s2,y],[x+s2,y+sz],[x+s2,y+s2]]);
//   p=p.concat([[x+sz,y+s2],[x,y+s2],[x-sz+s2,y+s2],[x-s2,y+s2]]);

//   let i=0;
//   for (const o of objects) {
//     //console.log('p[i]',p[i],'object',o)
//     o.setPos(p[i][0],p[i][1]); i+=1;
//   }
// }
//#endregion layout helpers

//#region list of countries
/*An array containing all the country names in the world:*/
var countries = [
	'Afghanistan',
	'Albania',
	'Algeria',
	'Andorra',
	'Angola',
	'Anguilla',
	'Antigua & Barbuda',
	'Argentina',
	'Armenia',
	'Aruba',
	'Australia',
	'Austria',
	'Azerbaijan',
	'Bahamas',
	'Bahrain',
	'Bangladesh',
	'Barbados',
	'Belarus',
	'Belgium',
	'Belize',
	'Benin',
	'Bermuda',
	'Bhutan',
	'Bolivia',
	'Bosnia & Herzegovina',
	'Botswana',
	'Brazil',
	'British Virgin Islands',
	'Brunei',
	'Bulgaria',
	'Burkina Faso',
	'Burundi',
	'Cambodia',
	'Cameroon',
	'Canada',
	'Cape Verde',
	'Cayman Islands',
	'Central Arfrican Republic',
	'Chad',
	'Chile',
	'China',
	'Colombia',
	'Congo',
	'Cook Islands',
	'Costa Rica',
	'Cote D Ivoire',
	'Croatia',
	'Cuba',
	'Curacao',
	'Cyprus',
	'Czech Republic',
	'Denmark',
	'Djibouti',
	'Dominica',
	'Dominican Republic',
	'Ecuador',
	'Egypt',
	'El Salvador',
	'Equatorial Guinea',
	'Eritrea',
	'Estonia',
	'Ethiopia',
	'Falkland Islands',
	'Faroe Islands',
	'Fiji',
	'Finland',
	'France',
	'French Polynesia',
	'French West Indies',
	'Gabon',
	'Gambia',
	'Georgia',
	'Germany',
	'Ghana',
	'Gibraltar',
	'Greece',
	'Greenland',
	'Grenada',
	'Guam',
	'Guatemala',
	'Guernsey',
	'Guinea',
	'Guinea Bissau',
	'Guyana',
	'Haiti',
	'Honduras',
	'Hong Kong',
	'Hungary',
	'Iceland',
	'India',
	'Indonesia',
	'Iran',
	'Iraq',
	'Ireland',
	'Isle of Man',
	'Israel',
	'Italy',
	'Jamaica',
	'Japan',
	'Jersey',
	'Jordan',
	'Kazakhstan',
	'Kenya',
	'Kiribati',
	'Kosovo',
	'Kuwait',
	'Kyrgyzstan',
	'Laos',
	'Latvia',
	'Lebanon',
	'Lesotho',
	'Liberia',
	'Libya',
	'Liechtenstein',
	'Lithuania',
	'Luxembourg',
	'Macau',
	'Macedonia',
	'Madagascar',
	'Malawi',
	'Malaysia',
	'Maldives',
	'Mali',
	'Malta',
	'Marshall Islands',
	'Mauritania',
	'Mauritius',
	'Mexico',
	'Micronesia',
	'Moldova',
	'Monaco',
	'Mongolia',
	'Montenegro',
	'Montserrat',
	'Morocco',
	'Mozambique',
	'Myanmar',
	'Namibia',
	'Nauro',
	'Nepal',
	'Netherlands',
	'Netherlands Antilles',
	'New Caledonia',
	'New Zealand',
	'Nicaragua',
	'Niger',
	'Nigeria',
	'North Korea',
	'Norway',
	'Oman',
	'Pakistan',
	'Palau',
	'Palestine',
	'Panama',
	'Papua New Guinea',
	'Paraguay',
	'Peru',
	'Philippines',
	'Poland',
	'Portugal',
	'Puerto Rico',
	'Qatar',
	'Reunion',
	'Romania',
	'Russia',
	'Rwanda',
	'Saint Pierre & Miquelon',
	'Samoa',
	'San Marino',
	'Sao Tome and Principe',
	'Saudi Arabia',
	'Senegal',
	'Serbia',
	'Seychelles',
	'Sierra Leone',
	'Singapore',
	'Slovakia',
	'Slovenia',
	'Solomon Islands',
	'Somalia',
	'South Africa',
	'South Korea',
	'South Sudan',
	'Spain',
	'Sri Lanka',
	'St Kitts & Nevis',
	'St Lucia',
	'St Vincent',
	'Sudan',
	'Suriname',
	'Swaziland',
	'Sweden',
	'Switzerland',
	'Syria',
	'Taiwan',
	'Tajikistan',
	'Tanzania',
	'Thailand',
	"Timor L'Este",
	'Togo',
	'Tonga',
	'Trinidad & Tobago',
	'Tunisia',
	'Turkey',
	'Turkmenistan',
	'Turks & Caicos',
	'Tuvalu',
	'Uganda',
	'Ukraine',
	'United Arab Emirates',
	'United Kingdom',
	'United States of America',
	'Uruguay',
	'Uzbekistan',
	'Vanuatu',
	'Vatican City',
	'Venezuela',
	'Vietnam',
	'Virgin Islands (US)',
	'Yemen',
	'Zambia',
	'Zimbabwe'
];
//#endregion

//#region numbers
function intDiv(n, q) {
	return Math.floor(n / q);
}
function randomNumber(min = 0, max = 100) {
	return Math.floor(Math.random() * (max - min + 1)) + min; //min and max inclusive!
}
//#endregion

//#region object and dictionary helpers
function augment(obj, newobj) {
	return extend(true, obj, newobj);
}
var extend = function() {
	// Variables
	var extended = {};
	var deep = false;
	var i = 0;

	// Check if a deep merge
	if (typeof arguments[0] === 'boolean') {
		deep = arguments[0];
		i++;
	}

	// Merge the object into the extended object
	var merge = function(obj) {
		for (var prop in obj) {
			if (obj.hasOwnProperty(prop)) {
				if (deep && Object.prototype.toString.call(obj[prop]) === '[object Object]') {
					// If we're doing a deep merge and the property is an object
					extended[prop] = extend(true, extended[prop], obj[prop]);
				} else {
					// Otherwise, do a regular merge
					extended[prop] = obj[prop];
				}
			}
		}
	};

	// Loop through each object and conduct a merge
	for (; i < arguments.length; i++) {
		merge(arguments[i]);
	}

	return extended;
};
function jsCopy(o) {
	return JSON.parse(JSON.stringify(o));
}
function hasSameProps(o1, o2) {
	let diff = propDiff(o1, o2);
	return !diff.hasChanged;
}
function propDiff(o_old, o_new) {
	//berechne diff in props
	let onlyOld = [];
	let onlyNew = [];
	let propChange = [];
	let summary = [];
	let hasChanged = false;

	for (const prop in o_new) {
		if (o_new.hasOwnProperty(prop)) {
			if (!(prop in o_old)) {
				addIf(prop, onlyNew);
				addIf(prop, summary);
				hasChanged = true;
			} else if (o_new[prop] != o_old[prop]) {
				if (prop == 'visible') {
					let visOld = getVisibleSet(o_old);
					let visNew = getVisibleSet(o_new);
					if (sameList(visOld, visNew)) {
						continue;
					}
				} else if (typeof o_new[prop] == 'object') {
					if (hasSameProps(o_new[prop], o_old[prop])) {
						continue;
					}
				}

				addIf({prop: prop, old: o_old[prop], new: o_new[prop]}, propChange);
				addIf(prop, summary);
				hasChanged = true;
			}
		}
	}
	for (const prop in o_old) {
		if (o_old.hasOwnProperty(prop)) {
			if (!(prop in o_new)) {
				addIf(prop, onlyOld);
				addIf(prop, summary);
				hasChanged = true;
			}
		}
	}
	return {onlyOld: onlyOld, onlyNew: onlyNew, propChange: propChange, summary: summary, hasChanged: hasChanged};
}
//#endregion object helpers

//#region set and tuple helpers
function extractUniqueStrings(tupleList) {
	let idlist = [];
	tupleList.map(x => x.map(y => addIf(y, idlist)));
	return idlist;
}

function isSet(x) {
	return 'set' in x;
}
function isNumeric(x) {
	return !isNaN(+x);
}
function isLiteral(x) {
	return isString(x) || $.isNumeric(x);
}
function isTuple(x) {
	return Array.isArray(x);
}
function isSingleton(x) {
	return (isSet(x) && x.set.length == 1) || (isTuple(x) && x.length == 1);
}
function firstElement(x) {
	if (isSet(x)) return x.set[0];
	else if (isTuple(x)) return x[0];
	else return null;
}
function expand1(x) {
	if (isEmpty(x)) return [];
	if (isLiteral(x)) return [x.toString()];
	if (isSingleton(x)) return expand1(firstElement(x));
	if (isSet(x)) return x.set.map(el => expand1(el));
	if (isTuple(x)) {
		let a = expand1(firstElement(x));
		let b = x.slice(1);
		let c = expand1(x.slice(1));
		let d = extractStringLists(c);
		//console.log('a=',fj(a),'b=',fj(b),'c=',fj(c))
		//console.log('d=',fj(d))
		return carteset(a, d);
	}
}
function isListOfLiterals(lst) {
	if (!isList(lst)) return false;
	for (const el of lst) {
		if (isList(el)) return false;
	}
	return true;
}
function extractStringLists(lst) {
	let res = [];
	for (const l of lst) {
		if (isListOfLiterals(l)) res.push(l);
		else if (isLiteral(l)) res.push([l]);
		else {
			let r2 = extractStringLists(l);
			r2.map(x => res.push(x));
		}
	}
	return res;
}
function expand(e) {
	let res = [];
	e = expand1(e);
	for (const el of e) {
		if (isll(el)) el.map(x => res.push(x));
		else res.push(el);
	}
	return res;
}
function prex(x) {
	prll(expand(x));
}
//#endregion

//#region string helpers:
function allNumbers(s) {
	//returns array of all numbers within string s
	return s.match(/\d+\.\d+|\d+\b|\d+(?=\w)/g).map(v => {
		return +v;
	});
}
function capitalize(s) {
	if (typeof s !== 'string') return '';
	return s.charAt(0).toUpperCase() + s.slice(1);
}
function eraseSpaces(s) {
	let i = 0;
	while (s.includes('  ')) {
		////console.log(i++ + ": ", s);
		s = s.replace('  ', ' ');
		s = s.replace(' {', '{');
		s = s.replace(' (', '(');
		s = s.replace('\n ', ' ');
		s = s.replace('\n{', '{');
		s = s.replace('\n}', '}');
	}
	return s;
}
function endsWith(s, sSub) {
	let i = s.indexOf(sSub);
	return i == s.length - sSub.length;
}
function getLines(s) {
	// returns array of lines in s
	var str = s;
	var res = str.split('\n');
	return res;
}

function firstNumber(s) {
	// returns first number in string s
	return s ? Number(s.match(/-?\d+/).shift()) : -1;
}

function firstPositiveNumber(s) {
	// returns first number in string s
	return s ? Number(s.match(/\d+/).shift()) : -1;
}
function makeString(obj, prop, maxlen = 50, isStart = true) {
	let s = prop + ':';
	if (prop in obj) {
		let s1 = JSON.stringify(obj[prop]);
		if (maxlen > 0) {
			s += isStart ? s1.substring(0, maxlen) : s1.substring(s.length - maxlen);
		} else {
			s += s1;
		}
	} else {
		s += ' not present';
	}
	return s;
}
function makeStrings(obj, props, maxlen = 50, isStart = true) {
	strs = props.map(x => makeString(obj, x)).join('\n');
	return strs;
}
function padSep(sep, n, args) {
	//sep..separator string, n..length of result, args are arbitrary numbers
	s = '';
	for (var i = 2; i < arguments.length; i++) {
		s += arguments[i].toString().padStart(n, '0') + sep;
	}
	return s.substring(0, s.length - 1);
}
function replaceAll(str, sSub, sBy) {
	let regex = new RegExp(sSub, 'g');
	return str.replace(regex, sBy);
}
function sameCaseIn(s1, s2) {
	return s1.toLowerCase() == s2.toLowerCase();
}
function startsWith(s, sSub) {
	////console.log('startWith: s='+s+', sSub='+sSub,typeof(s),typeof(sSub));
	return s.substring(0, sSub.length) == sSub;
}
function startsWithCaseIn(s, ssub) {
	return startsWith(s.toLowerCase(), ssub.toLowerCase());
}
function stringAfter(sFull, sSub) {
	////console.log('s='+sFull,'sub='+sSub)
	let idx = sFull.indexOf(sSub);
	////console.log('idx='+idx)
	if (idx < 0) return '';
	return sFull.substring(idx + sSub.length);
}
function stringAfterLast(sFull, sSub) {
	let parts = sFull.split(sSub);
	return last(parts);
}
function stringBefore(sFull, sSub) {
	let idx = sFull.indexOf(sSub);
	if (idx < 0) return sFull;
	return sFull.substring(0, idx);
}
//#endregion

//#region type and conversion helpers
function getTypeOf(param) {
	let type = typeof param;
	//console.log("typeof says:" + type);
	if (type == 'string') {
		return 'string';
	}
	if (type == 'object') {
		type = param.constructor.name;
		//console.log(type, startsWith(type, "SVG"));
		if (startsWith(type, 'SVG')) type = stringBefore(stringAfter(type, 'SVG'), 'Element').toLowerCase();
		else if (startsWith(type, 'HTML')) type = stringBefore(stringAfter(type, 'HTML'), 'Element').toLowerCase();
	}
	let lType = type.toLowerCase();
	if (lType.includes('event')) type = 'event';
	////console.log("this param is of type: " + type);
	////console.log(param);
	return type;
}
function isEvent(param) {
	return getTypeOf(param) == 'event';
}
function isString(param) {
	return typeof param == 'string';
}
function isMS(param) {
	return getTypeOf(param) == 'MS';
}
function isNumber(param) {
	return !isNaN(Number(param));
}
function convertToMS(p) {
	let res = undefined;
	if (isMS(p)) {
		////console.log("convertToMS: isMS ", p);
		res = p;
	} else if (isEvent(p)) {
		////console.log("convertToMS: isEvent ", p);
		p = p.target;
		res = findParentWithId(p);
		res = MS.byId[res.id];
	} else if (isString(p)) {
		//assume that this is the id
		////console.log("convertToMS: isString ", p);
		res = MS.byId[p];
	} else {
		//assume some ui element
		////console.log("convertToMS: else ", res);
	}
	////console.log("convertToMS: RESULT=", res);
	return res;
}

//#endregion

// #region zooming
function deltaTransformPoint(matrix, point) {
	var dx = point.x * matrix.a + point.y * matrix.c + 0;
	var dy = point.x * matrix.b + point.y * matrix.d + 0;
	return {x: dx, y: dy};
}
function decomposeMatrix(matrix) {
	// @see https://gist.github.com/2052247

	// calculate delta transform point
	var px = deltaTransformPoint(matrix, {x: 0, y: 1});
	var py = deltaTransformPoint(matrix, {x: 1, y: 0});

	// calculate skew
	var skewX = (180 / Math.PI) * Math.atan2(px.y, px.x) - 90;
	var skewY = (180 / Math.PI) * Math.atan2(py.y, py.x);

	return {
		translateX: matrix.e,
		translateY: matrix.f,
		scaleX: Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b),
		scaleY: Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d),
		scale: Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b),
		skewX: skewX,
		skewY: skewY,
		rotation: skewX // rotation is the same as skew x
	};
}
function getTransformInfo(gElement) {
	//console.log(gElement)
	var matrix = gElement.getCTM();
	let info = decomposeMatrix(matrix);
	return info;
}
function getZoomFactor(gElement) {
	//var m = gElement.getAttribute("transform");
	var matrix = gElement.getCTM();
	let info = decomposeMatrix(matrix);
	return info.scale;
	// //console.log(x.scale);
}
//#endregion zooming
