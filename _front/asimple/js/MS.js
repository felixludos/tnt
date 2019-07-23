class MS {
	constructor(id, areaName, uid=null) {
		this.id = id; //TODO: id<=>uid mapping
		this.uid = uid? uid:id;
		this.areaName = areaName;
		this.parent = document.getElementById(areaName);
		this.areaType = detectType(areaName);
		testGSM('type', this.areaType);

		this.elem = null;
		if (this.areaType == 'div') {
			this.elem = addSvgg(document.getElementById(this.areaName), this.uid, {});
			testGSM('type', getTypeOf(this.elem));
		} else if (this.areaType == 'g') {
			this.elem = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			this.elem.id = this.uid;
		}

		this.isDrawn = false;
		this.isHighlighted = false;
		this.isSelected = false;
		this.isEnabled = false;
		this.isBlinking = false;
		this.isVisible = false;
		this.x = 0; // refers to center!
		this.y = 0;
		this.w = 0;
		this.h = 0;
		this.bounds = {l: 0, t: 0, r: 0, b: 0};
		this.overlay = null; //this is the overlay element for highlighting and selecting
		this.ground = null;
		this.data = {}; //any properties
		this.clickHandler = null;
		this.elem.addEventListener('click', this.onClick.bind(this));
		this.children = {}; //dictionary that holds info about children of specific classes
		this.layout = null;
	}

	//#region colors
	//this.bg and this.fg are set on top g element and inherited to all descendants unless explicit fill or border set!
	//in case of text element, fg is used rather than bg!
	setbg(color) {
		this.elem.setAttribute('fill', color);
		let hex = standardize_color(color);
		this.bg = hex;
		this.fg = idealTextColor(hex);
		// this.elem.setAttribute('stroke', this.fg);
		return this;
	}
	setfg(color) {
		let hex = standardize_color(color);
		this.fg = hex;
		this.elem.setAttribute('stroke', hex);
		return this;
	}
	setFill(el, fill, alpha) {
		if (fill) {
			fill = convertToRgba(fill, alpha);
			el.setAttribute('fill', fill);
		}
	}
	setTextFill(el, fill, alpha) {
		if (fill) {
			fill = convertToRgba(fill, alpha);
			el.setAttribute('fill', fill);
		}else if (this.fg){
			el.setAttribute('fill', this.fg);
			console.log(this.fg)
		}
	}
	setStroke(border) {}
	//#endregion

	//#region css classes
	addClass(clName) {
		let el = this.overlay;
		if (!el) return this;

		let cl = el.getAttribute('class');
		if (cl && cl.includes(clName)) {
			return this;
		} else {
			let newClass = cl ? (cl + ' ' + clName).trim() : clName;
			testGSM('add result:', newClass);
			el.setAttribute('class', newClass);
		}
		testGSM('am ende:', this.overlay, cl, this.overlay.getAttribute('class'));
		return this;
	}
	getClass() {
		if (this.overlay) {
			return this.overlay.getAttribute('class');
		}
		return null;
	}
	removeClass(clName) {
		let el = this.overlay;
		if (!el) return this;

		let cl = el.getAttribute('class');
		if (cl && cl.includes(clName)) {
			let newClass = cl.replace(clName, '').trim();
			testMS_fine('remove result:', newClass);
			el.setAttribute('class', newClass);
		}
		testMS_fine('am ende:', this.overlay, cl, this.overlay.getAttribute('class'));
		return this;
	}
	//#endregion

	//#region geo
	circle({border = 'white', thickness = 0, className = '', sz = 50, fill = 'yellow', alpha = 1, x = 0, y = 0} = {}) {
		return this.ellipse({
			className: className,
			w: sz,
			h: sz,
			fill: fill,
			border: border,
			thickness: thickness,
			alpha: alpha,
			x: x,
			y: y
		});
	}
	ellipse({border = 'white', thickness = 0, className = '', w = 50, h = 25, fill, alpha = 1, x = 0, y = 0} = {}) {
		let r = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');

		this.setFill(r, fill, alpha);

		if (thickness > 0) {
			border = convertToRgba(border, alpha);
			r.setAttribute('stroke', border);
			r.setAttribute('stroke-width', thickness);
		}

		if (this.elem.childNodes.length == 0) {
			this.w = w;
			this.h = h;
		}

		r.setAttribute('rx', w / 2);
		r.setAttribute('ry', h / 2);
		r.setAttribute('cx', x); //kann ruhig in unit % sein!!!
		r.setAttribute('cy', y);
		if (className !== '') {
			r.setAttribute('class', className);
			if (className.includes('overlay')) {
				this.overlay = r; //set the interactive element!
			} else if (className.includes('ground')) {
				this.ground = r;
			}
		}
		this.elem.appendChild(r);
		return this;
	}
	hex({className = '', x = 0, y = 0, w, h = 0, fill, alpha = 1, border = 'white', thickness = 0, flat = false}) {
		//flat=true means  TODO: implement!
		//if h<=0, heightis calculated from width!
		let r = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');

		if (h <= 0) {
			h = (2 * w) / 1.73;
		}
		let pts = size2hex(w, h, x, y);
		r.setAttribute('points', pts);

		if (this.elem.childNodes.length == 0) {
			this.bounds.w = w;
			this.bounds.h = h;
		}

		this.setFill(r, fill, alpha);

		if (thickness > 0) {
			border = convertToRgba(border, alpha);
			r.setAttribute('stroke', border);
			r.setAttribute('stroke-width', thickness);
		}

		if (className !== '') {
			r.setAttribute('class', className);
			if (className.includes('overlay')) {
				this.overlay = r; //set the interactive element!
			} else if (className.includes('ground')) {
				this.ground = r;
			}
		}
		this.elem.appendChild(r);
		return this;
	}
	image({className = '', path = '', w = 50, h = 50, x = 0, y = 0} = {}) {
		//<image xlink:href="firefox.jpg" x="0" y="0" height="50px" width="50px"/>
		let r = document.createElementNS('http://www.w3.org/2000/svg', 'image');
		r.setAttribute('href', path);

		r.setAttribute('width', w);
		r.setAttribute('height', h);
		r.setAttribute('x', -w / 2 + x);
		r.setAttribute('y', -h / 2 + y);
		if (className !== '') {
			r.setAttribute('class', className);
			if (className.includes('overlay')) {
				this.overlay = r; //set the interactive element!
			}
		}
		if (this.elem.childNodes.length == 0) {
			this.w = w;
			this.h = h;
		}
		this.elem.appendChild(r);
		return this;
	}
	poly({className = '', pts = '0,0 100,0 50,80', fill, alpha = 1, border = 'white', thickness = 0}) {
		let r = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
		r.setAttribute('points', pts);

		//bounds berechnen!!!
		// r.setAttribute('height', h);
		// r.setAttribute('x', -w / 2 + x);
		// r.setAttribute('y', -h / 2 + y);

		// if (this.elem.childNodes.length == 0) {
		// 	this.bounds.w = w;
		// 	this.bounds.h = h;
		// }

		//testGSM('rect vorher', fill);
		this.setFill(r, fill, alpha);

		if (thickness > 0) {
			border = convertToRgba(border, alpha);
			r.setAttribute('stroke', border);
			r.setAttribute('stroke-width', thickness);
		}

		if (className !== '') {
			r.setAttribute('class', className);
			if (className.includes('overlay')) {
				this.overlay = r; //set the interactive element!
			} else if (className.includes('ground')) {
				this.ground = r;
			}
		}
		this.elem.appendChild(r);
		return this;
	}
	rect({border = 'red', thickness = 0, className = '', w = 50, h = 25, fill, alpha = 1, x = 0, y = 0} = {}) {
		let r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		r.setAttribute('width', w);
		r.setAttribute('height', h);
		r.setAttribute('x', -w / 2 + x);
		r.setAttribute('y', -h / 2 + y);

		if (this.elem.childNodes.length == 0) {
			this.bounds.w = w;
			this.bounds.h = h;
		}

		this.setFill(r, fill, alpha);

		if (thickness > 0) {
			border = convertToRgba(border, alpha);
			r.setAttribute('stroke', border);
			r.setAttribute('stroke-width', thickness);
		}

		//testGSM('rect nachher', fill);

		if (className !== '') {
			r.setAttribute('class', className);
			if (className.includes('overlay')) {
				this.overlay = r; //set the interactive element!
			} else if (className.includes('ground')) {
				this.ground = r;
			}
		}
		this.elem.appendChild(r);
		return this;
	}
	roundedRect({border = 'red', thickness = 0, className = '', w = 150, h = 125, fill = 'darkviolet', rounding = 10, alpha = 1, x = 0, y = 0} = {}) {
		this.rect({
			className: className,
			w: w,
			h: h,
			fill: fill,
			border: border,
			thickness: thickness,
			alpha: alpha,
			x: x,
			y: y
		});
		let r = this.elem.lastChild;
		r.setAttribute('rx', rounding); // rounding kann ruhig in % sein!
		r.setAttribute('ry', rounding);
		return this;
	}
	square({className = '', sz = 50, fill = 'yellow', alpha = 1, x = 0, y = 0} = {}) {
		return this.rect({
			className: className,
			w: sz,
			h: sz,
			fill: fill,
			alpha: alpha,
			x: x,
			y: y
		});
	}
	setText(txt){
		//look for a child of type text and modify r.textContent = txt;
		let ch = findChildOfType('text', this);
		if (ch){
			ch.textContent = txt;
		}
	}
	text({className = '', maxWidth = 1000, txt = 'A', fz = 20, fill, alpha = 1, x = 0, y = 0, family = 'arial', weight = ''} = {}) {
		let r = document.createElementNS('http://www.w3.org/2000/svg', 'text');

		this.setTextFill(r, fill, alpha);

		r.setAttribute('font-family', family);
		r.setAttribute('font-size', '' + fz + 'px');
		if (weight !== '') {
			r.setAttribute('font-weight', weight);
		}
		r.setAttribute('x', x);
		r.setAttribute('y', y + fz / 2.8);
		r.setAttribute('text-anchor', 'middle');

		if (className !== '') {
			r.setAttribute('class', className);
			if (className.includes('overlay')) {
				this.overlay = r; //set the interactive element!
			}
		}

		let firstChild = this.elem.childNodes.length == 0;
		let padding = 1;
		let sFont = weight + ' ' + fz + 'px ' + family; //"bold 12pt arial"
		sFont = sFont.trim();
		let wText = getTextWidth(txt, sFont);
		testMS_fine(txt, wText, maxWidth);
		if (wText > maxWidth) {
			txt = ellipsis(txt, sFont, maxWidth, padding);
			wText = getTextWidth(txt, sFont);
			testMS_fine('...', txt, wText);
		}
		if (firstChild) {
			this.w = wText + 2 * padding;
			this.h = fz;
		}

		r.textContent = txt;
		this.elem.appendChild(r);
		return this;
	}
	textMultiline({
		className = '',
		maxWidth = 1000,
		txt = ['one', 'two', 'three'],
		fz = 20,
		fill = 'black',
		alpha = 1,
		x = 0,
		y = 0,
		family = 'arial',
		weight = ''
	}) {
		let h = txt.length * fz;
		//testMS_fine("height", h);
		let yStart = y - h / 2 + fz / 2;
		let maxW = 0;
		for (const t of txt) {
			this.text({
				className: className,
				maxWidth: maxWidth,
				txt: t,
				fz: fz,
				fill: fill,
				alpha: alpha,
				x: x,
				y: yStart,
				family: family,
				weight: weight
			});
			maxW = Math.max(maxW, this.bounds.w);
			yStart += fz;
		}
		return this;
	}

	//#endregion

	//#region interactivity
	enable() {
		this.isEnabled = true;
	}
	disable() {
		this.isEnabled = false;
	}
	makeUnselectable() {
		this.unhighlight();
		this.unselect();
		this.clickHandler == null;
		this.disable();
	}
	makeSelectable(handler) {
		this.highlight();
		this.enable();
		this.clickHandler = handler;
	}
	onClick(ev) {
		testGSM('click', this.id, this.isEnabled, this.clickHandler);
		if (!this.isEnabled) return;

		if (typeof this.clickHandler == 'function') {
			testGSM('calling clickhandler');
			this.clickHandler(ev);
		}
	}
	mouseDisable() {
		this.addClass('mouseDisabled');
	}
	mouseEnable() {
		this.removeClass('mouseDisabled');
	}
	//#endregion

	//#region NONONO layouts
	// grid(rows,cols){
	// 	this.layout = 'grid';
	// 	this.fields = {};
	// 	this.rows = rows;
	// 	this.cols = cols;
	// 	this.sz = 100;
	// 	let sz = this.sz;
	// 	let wBoard = cols*sz;
	// 	let hBoard = rows*sz;
	// 	this.rect({w:wBoard,h:hBoard});
	// 	for (let r = 0; r < rows; r++) {
	// 		this.fields[r]={};
	// 		for(let c=0;c<cols;c++){
	// 			let idNew = this.id+'_'+r+'_'+c;
	// 			let ms = new GSM(idNew,this.elem.id)
	// 			.rect({w:sz,h:sz,fill:'blue'})
	// 			.rect({w:sz,h:sz,class:'overlay'})
	// 			.setPos(c*sz+sz/2,r*sz+sz/2).draw();
	// 			this.fields[r][c]=ms;
	// 		}

	// 	}
	// 	return this;
	// }
	//#endregion

	//#region parent, pos, draw, remove from UI
	getPos() {
		return {x: this.x, y: this.y};
	}
	setPos(x, y) {
		this.elem.setAttribute('transform', `translate(${x},${y})`);
		this.x = x; //center!
		this.y = y;
		this.bounds.l = x - this.w / 2;
		this.bounds.t = y - this.h / 2;
		this.bounds.r = x + this.w / 2;
		this.bounds.b = y + this.h / 2;
		return this;
	}
	draw() {
		if (!this.isDrawn && this.parent) {
			this.isDrawn = true;
			this.parent.appendChild(this.elem);
			this.show();
		} else {
			let p = this.parent;
			if (!p) return this;
			let ch = findChildWithId(this.id, p);
			testMS_fine('child is', ch, 'this.id is', this.id, 'this.elem.id is', this.elem.id, 'this.parent is', this.parent);
			testMS_fine('children of parent:', arrChildren(p));
			testMS_fine('childNodes od p', p.childNodes);
			testMS_fine('childNodes od p', p.children);
			if (ch == null) {
				//this elem has been erased from UI
				this.isDrawn = true;
				this.parent.appendChild(this.elem);
				this.show();
				testMS_fine('element', this.id, 'has been re drawn!!!');
			} else {
				testMS_fine('there is already an element with id', this.id, 'drawn!!!!!!!');
			}
		}
		return this;
	}
	removeForever() {
		this.removeFromUI();
		this.clickHandler = null; //no need probably
		this.elem.removeEventListener('click', this.onClick.bind(this));
	}
	removeFromChildIndex(idx) {
		let el = this.elem;
		while (el.childNodes.length >= idx) {
			el.removeChild(el.lastChild);
		}
		testMS_fine(el, this);
	}
	removeFromUI() {
		if (this.isDrawn && this.parent) {
			this.parent.removeChild(this.elem);
			this.isDrawn = false;
		}
	}
	removeFromUIAndParent() {
		if (this.isDrawn && this.parent) {
			this.parent.removeChild(this.elem);
			this.isDrawn = false;
		}
		this.parent = null;
	}
	//#endregion

	//#region temp visual features
	addBorder(color = 'red', thickness = 1) {
		if (!this.overlay) return;
		this.overlay.setAttribute('stroke', color);
		this.overlay.setAttribute('stroke-width', thickness);
	}
	removeBorder() {
		if (!this.overlay) return;
		this.overlay.setAttribute('stroke-width', 0);
	}
	highlight() {
		testMS_fine('highlighting', this.id);
		if (this.isHighlighted) return;
		this.addClass('highlighted');
		this.isHighlighted = true;
	}
	unhighlight() {
		if (!this.isHighlighted) return;
		this.removeClass('highlighted');
		this.isHighlighted = false;
	}
	select() {
		if (this.isSelected) return;
		testMS_fine('selecting', this.id);
		this.addClass('selected');
		//this.isHighlighted = false;
		this.isSelected = true;
	}
	unselect() {
		if (!this.isSelected) return;
		this.removeClass('selected');
		this.isSelected = false;
	}
	selGreen() {
		if (this.isSelGreen) return;
		this.addClass('selGreen');
		this.isSelGreen = true;
	}
	stopSelGreen() {
		if (!this.isSelGreen) return;
		this.removeClass('selGreen');
		this.isSelGreen = false;
	}
	//#endregion

	//#region visibility
	show() {
		testMS_fine('called show!!! ', this.id, this.isVisible);
		if (this.isVisible) return;
		this.elem.setAttribute('style', 'visibility:visible;');
		this.isVisible = true;
	}
	hide() {
		//if (!this.isVisible) return;
		this.elem.setAttribute('style', 'visibility:hidden;display:none');
		this.isVisible = false;
	}
	hideChildren(className) {
		testMS_fine('hideChildren');
		if (!(className in this.children)) {
			testMS_fine('className', className, 'not in ', this.children);
			this.children[className] = {isHidden: false};
		}
		testMS_fine('pik dame');
		if (this.children[className].isHidden) return this;
		for (const ch of [...this.elem.childNodes]) {
			let cl = ch.getAttribute('class');
			testGSM('class', cl, 'className', className);
			if (cl && ch.getAttribute('class').includes(className)) {
				ch.setAttribute('style', 'visibility:hidden;display:none');
			}
		}
		this.children[className].isHidden = true;
		return this;
	}
	showChildren(className) {
		if (!(className in this.children)) {
			testGSM(className, 'not in', this.children);
			this.children[className] = {isHidden: true};
		}
		if (!this.children[className].isHidden) {
			testGSM(this.children[className].isHidden, 'seems to be false');
			return this;
		}
		for (const ch of [...this.elem.childNodes]) {
			let cl = ch.getAttribute('class');
			testGSM('class', cl, 'className', className);

			if (cl && ch.getAttribute('class').includes(className)) {
				ch.setAttribute('style', '');
			}
		}
		this.children[className].isHidden = false;
		return this;
	}
	toggleVisibility() {
		if (this.isVisible) this.hide();
		else this.show();
	}

	//#endregion

	//#region tags
	tag(key, val) {
		this.data[key] = val;
		return this;
	}
	getTag(key) {
		if (key in this.data) return this.data[key];
		else return null;
	}
	hasTag(key) {
		return key in this.data;
	}
	hasTagWithVal(key, val) {
		return key in this.data && this.data[key] == val;
	}
	//#endregion
}
