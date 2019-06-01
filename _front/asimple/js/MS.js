class MS {
  constructor(id, uid, parentName) {
    this.id = id;
    this.parent = document.getElementById(parentName);
    //console.log('MS: parent',parentName, parent, id, uid)
    this.elem = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.elem.id = uid;
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
		this.data = {};
    this.clickHandler = null;
    this.elem.addEventListener("click", this.onClick.bind(this));
  }
  addClass(clName) {
    let el = this.overlay;
    if (!el) return this;

    let cl = el.getAttribute("class");
    if (cl && cl.includes(clName)) {
      return this;
    } else {
      let newClass = cl ? (cl + " " + clName).trim() : clName;
      //console.log("add result:", newClass);
      el.setAttribute("class", newClass);
    }
    //console.log("am ende:", this.overlay, cl, this.overlay.getAttribute("class"));
    return this;
	}
	toggle(){if (this.isVisible) this.hide(); else this.show();}
	mouseDisable(){
		this.addClass('mouseDisabled');
	}
	mouseEnable(){
		this.removeClass('mouseDisabled');
	}
	blink(){
		if (this.isBlinking) return;
		this.addClass('selGreen');
		this.isBlinking = true;

		// this.blinker = setInterval(this.toggle.bind(this),500);

		//this.addClass('blink');

		// if (this.ground){
		// 	this.ground.setAttribute("class", 'blink');
		// }
	}
	stopBlinking(){
		if (!this.isBlinking) return;
		this.removeClass('selGreen');
		this.isBlinking = false;

		// clearInterval(this.blinker);
		// this.show();

		//this.removeClass('blink');

		// if (this.ground){
		// 	this.ground.setAttribute("class", 'ground');
		// }
	}
	frame(){

	}
  circle({className = "", sz = 50, fill = "yellow", alpha = 1, x = 0, y = 0} = {}) {
    return this.ellipse({
      className: className,
      w: sz,
      h: sz,
      fill: fill,
      alpha: alpha,
      x: x,
      y: y
    });
  }
  disable() {
    this.isEnabled = false;
  }
  draw() {
    if (!this.isDrawn && this.parent) {
      this.isDrawn = true;
      this.parent.appendChild(this.elem);
      this.show();
    }
    return this;
  }
  ellipse({className = "", w = 50, h = 25, fill = "yellow", alpha = 1, x = 0, y = 0} = {}) {
    let ell = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    fill = convertToRgba(fill, alpha);
    ell.setAttribute("fill", fill);

    if (this.elem.childNodes.length == 0) {
      this.w = w;
      this.h = h;
    }

    ell.setAttribute("rx", w / 2);
    ell.setAttribute("ry", h / 2);
    ell.setAttribute("cx", x); //kann ruhig in unit % sein!!!
    ell.setAttribute("cy", y);
    if (className !== "") {
      ell.setAttribute("class", className);
      if (className.includes("overlay")) {
        this.overlay = ell; //set the interactive element!
      }else if (className.includes('ground')){
				this.ground = ell;
			}
    }
    this.elem.appendChild(ell);
    return this;
  }
  enable() {
    this.isEnabled = true;
  }
  getClass() {
    if (this.overlay) {
      return this.overlay.getAttribute("class");
    }
    return null;
  }
  getPos() {
    return {x: this.x, y: this.y};
  }
  hide() {
    //if (!this.isVisible) return;
    this.elem.setAttribute("style", "visibility:hidden;display:none");
    this.isVisible = false;
  }
  highlight() {
		//console.log('highlighting',this.id)
		if (this.isHighlighted) return;
    this.addClass("highlighted");
    this.isHighlighted = true;
  }
  image({className = "", path = "", w = 50, h = 50, x = 0, y = 0} = {}) {
    //<image xlink:href="firefox.jpg" x="0" y="0" height="50px" width="50px"/>
    let r = document.createElementNS("http://www.w3.org/2000/svg", "image");
    r.setAttribute("href", path);

    r.setAttribute("width", w);
    r.setAttribute("height", h);
    r.setAttribute("x", -w / 2 + x);
    r.setAttribute("y", -h / 2 + y);
    if (className !== "") {
      r.setAttribute("class", className);
      if (className.includes("overlay")) {
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
	makeUnselectable(){
		this.unhighlight();
		this.unselect();
		this.clickHandler == null;
		this.disable();
	}
	makeSelectable(handler){
		this.highlight();
		this.enable();
		this.clickHandler = handler;

	}
  onClick(ev) {
    //console.log('click',this.id,this.isEnabled,this.clickHandler)
    if (!this.isEnabled) return;

    if (typeof this.clickHandler == "function") this.clickHandler(ev);
  }
  rect({className = "", w = 50, h = 25, fill = "yellow", alpha = 1, x = 0, y = 0} = {}) {
    let r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    r.setAttribute("width", w);
    r.setAttribute("height", h);
    r.setAttribute("x", -w / 2 + x);
    r.setAttribute("y", -h / 2 + y);

    if (this.elem.childNodes.length == 0) {
      this.bounds.w = w;
      this.bounds.h = h;
    }

    //console.log('rect vorher',fill)
    fill = convertToRgba(fill, alpha);
    r.setAttribute("fill", fill);
    //console.log('rect nachher',fill)
    // r.setAttribute("style", `fill:${fill};`);

    if (className !== "") {
      r.setAttribute("class", className);
      if (className.includes("overlay")) {
        this.overlay = r; //set the interactive element!
      } else if (className.includes('ground')){
				this.ground = r;
			}
    }
    this.elem.appendChild(r);
    return this;
  }
  removeClass(clName) {
    let el = this.overlay;
    if (!el) return this;

    let cl = el.getAttribute("class");
    if (cl && cl.includes(clName)) {
      let newClass = cl.replace(clName, "").trim();
      //console.log("remove result:", newClass);
      el.setAttribute("class", newClass);
    }
    //console.log("am ende:", this.overlay, cl, this.overlay.getAttribute("class"));
    return this;
  }
  removeForever() {
    this.removeFromUI();
    this.clickHandler = null; //no need probably
    this.elem.removeEventListener("click", this.onClick.bind(this));
  }
  removeFromChildIndex(idx) {
    //if (idx == 0){$(this.elem).empty();console.log('hallo!!!',this.elem,this);return;}
    let el = this.elem;
    while (el.childNodes.length >= idx) {
      el.removeChild(el.lastChild);
    }
    //console.log(el,this)
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
  roundedRect({className = "", w = 150, h = 125, fill = "darkviolet", rounding = 10, alpha = 1, x = 0, y = 0} = {}) {
    this.rect({
      className: className,
      w: w,
      h: h,
      fill: fill,
      alpha: alpha,
      x: x,
      y: y
    });
    let r = this.elem.lastChild;
    r.setAttribute("rx", rounding); // rounding kann ruhig in % sein!
    r.setAttribute("ry", rounding);
    return this;
  }
  select() {
		if (this.isSelected) return;
    //console.log('selecting',this.id)
    this.addClass("selected");
    //this.isHighlighted = false;
    this.isSelected = true;
  }
  setPos(x, y) {
    this.elem.setAttribute("transform", `translate(${x},${y})`);
    this.x = x; //center!
    this.y = y;
    this.bounds.l = x - this.w / 2;
    this.bounds.t = y - this.h / 2;
    this.bounds.r = x + this.w / 2;
    this.bounds.b = y + this.h / 2;
    return this;
  }
  show() {
    //console.log('called show!!! ',this.id,this.isVisible)
    if (this.isVisible) return;
    this.elem.setAttribute("style", "visibility:visible;");
    this.isVisible = true;
  }
  square({className = "", sz = 50, fill = "yellow", alpha = 1, x = 0, y = 0} = {}) {
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

  text({className = "", maxWidth = 1000, txt = "A", fz = 20, fill = "black", alpha = 1, x = 0, y = 0, family = "arial", weight = ""} = {}) {
    let r = document.createElementNS("http://www.w3.org/2000/svg", "text");

    fill = convertToRgba(fill, alpha);
    r.setAttribute("fill", fill);

    r.setAttribute("font-family", family);
    r.setAttribute("font-size", "" + fz + "px");
    if (weight !== "") {
      r.setAttribute("font-weight", weight);
    }
    r.setAttribute("x", x);
    r.setAttribute("y", y + fz / 2.8);
    r.setAttribute("text-anchor", "middle");

    if (className !== "") {
      r.setAttribute("class", className);
      if (className.includes("overlay")) {
        this.overlay = r; //set the interactive element!
      }
    }

    let firstChild = this.elem.childNodes.length == 0;
    let padding = 1;
    let sFont = weight + " " + fz + "px " + family; //"bold 12pt arial"
    sFont = sFont.trim();
    let wText = getTextWidth(txt, sFont);
    //console.log(txt,wText,maxWidth)
    if (wText > maxWidth) {
      txt = ellipsis(txt, sFont, maxWidth, padding);
      wText = getTextWidth(txt, sFont);
      //console.log('...',txt,wText)
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
    className = "",
    maxWidth = 1000,
    txt = ["one", "two", "three"],
    fz = 20,
    fill = "black",
    alpha = 1,
    x = 0,
    y = 0,
    family = "arial",
    weight = ""
  }) {
    let h = txt.length * fz;
    ////console.log("height", h);
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
  unhighlight() {
		if (!this.isHighlighted) return;
    this.removeClass("highlighted");
    this.isHighlighted = false;
  }
  unselect() {
		if (!this.isSelected) return;
    this.removeClass("selected");
    this.isSelected = false;
  }
}
