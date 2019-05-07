var oids = {}; //map unique id to object underlying ui and its id
var uniqueIdCounter = 0;

class NObj {
  constructor(id, parentName, o) {
    this.id = id; // id of NObj is same as id of game objects
    this.oid = o.id;
    this.parent = document.getElementById(parentName);
    this.elem = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.elem.id = uniqueIdCounter + "_" + o.obj_type;
    oids[this.elem.id] = {id: id, o: o, ms: this};
    this.isDrawn = false;
    this.isHighlighted = false;
    this.isSelected = false;
    this.isEnabled = false;
    this.x = 0; // refers to center!
    this.y = 0;
    this.w = 0;
    this.h = 0;
    this.bounds = {l: 0, t: 0, r: 0, b: 0};
    this.overlay = null; //this is the overlay element for highlighting and selecting
    this.data = {};
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
      this.elem.addEventListener("click", this.onClick.bind(this));
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
  hide() {
    //if (!this.isVisible) return;
    this.elem.setAttribute("style", "visibility:hidden;display:none");
    this.isVisible = false;
  }
  highlight() {
    setClass("highlight");
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
      }
    }
    this.elem.appendChild(r);
    return this;
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
      this.elem.removeEventListener("click", this.onClick.bind(this));
    }
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
    setClass("selected");
    this.isHighlighted = false;
    this.isSelected = true;
  }
  setClass(className) {
    if (this.overlay) {
      el.setAttribute("class", cl);
    }
    return this;
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
    setClass("");
    this.isHighlighted = false;
  }
  unselect() {
    setClass("");
    this.isSelected = false;
  }
}
