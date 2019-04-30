class MS {
  constructor(id, parent = null,isSvg=true) {
    // id must be unique (TODO: check for uniqueness, wahrscheinlich im MSManager)
    // parent should be g or svg element ms is a g element with stuff inside if
    // parent is null, this is a floating ms element that can be appended or removed
    // to/from parent. otherwise this is an element that lives on a parent and is
    // hidden if not visibleconsole.log('MS constructor:',id,parent)
    this.isFloating = parent == null; //TODO: eliminate!!!!!!!!!!!!!!!!
    this.isDrawn = false;
    this.parent = parent;
    this.id = id;
    this.isSvg=isSvg;
    if (isSvg){
      this.elem = document.createElementNS("http://www.w3.org/2000/svg", "g");
    }else{
      this.elem = document.createElement('div');
      
      this.elem.classList.add('msDiv');
    }
    this.elem.id = id;
    this.x = 0;
    this.y = 0;
    this.bounds = {
      cx: 0,
      cy: 0,
      w: 0,
      h: 0,
      l: 0,
      t: 0,
      r: 0,
      b: 0
    }; //dimensions of first child (supposedly largest)
    this.data = {}; // key value list that can be stored in an element
    this.isVisible = false; //TODO: WAS???????????????????
    this.isHighlighted = false;
    this.isSelected = false;
    this.isPulsating = false;
    this.isEnabled = false; // whether it reacts to click event
    this.clickHandler = null;
    this.elem.addEventListener("click", this.onClick.bind(this));
    //console.log('done!')
  }
  //#region interactivity
  onClick(ev) {
    //console.log('click',this.id,this.isEnabled,this.clickHandler)
    if (!this.isEnabled) return;

    if (typeof this.clickHandler == "function") this.clickHandler(ev);
  }
  //#endregion

  //#region set position, draw
  drawTo(newParent, x = 0, y = 0) {
    //console.log('drawTo',this.id, newParent, parent)
    if (newParent == this.parent && this.isDrawn){
      if (x == 0 || (x==this.x && y == this.y)) {
        //console.log(this.id,'card already on same parent same pos and isDrawn!',this.parent)
        return;
      }else this.setPos(x,y);
    }
    if (newParent != this.parent) {
      //console.log(this.id,'card removed from',this.newParent)
      this.removeFromUI();
    }
    this.parent = newParent;
    //console.log(this.id,'set new parent',this.parent)
    if (x != 0) {
      this.setPos(x, y);
      //console.log(this.id,'setpos',x,y)
    }
    if (newParent) {
      this.isFloating = false;
      this.isDrawn = false;
      this.draw();
      //console.log(this.id,'drawn to ',this.parent)
    } else {
      this.isFloating = true;
      //console.log(this.id,'set to isFloating',this.parent)
    }
  }
  isCard(){return startsWith(this.id,'invest_') || startsWith(this.id,'action_');}
  draw() {
    if (this.isFloating) {
      return this;
      //console.log(id, "cannot be drawn since does not have a parent!");
    } else if (!this.isDrawn) {
      this.isDrawn = true;
      this.parent.appendChild(this.elem);
      if (this.isCard()){
        //console.log(this.id,'appended to and shown',this.parent.id)
      }
      this.show();
    }
    return this;
  }
  setTopLeft(x,y){
    this.setPos(x+this.bounds.w/2,y+this.bounds.h/2)
  }
  setPos(x, y) {
    //console.log(this.id,x,y)
    //if (this.isSvg){
      this.elem.setAttribute("transform", `translate(${x},${y})`);
    //}

    this.x = x;
    this.y = y;
    this.bounds.cx = x;
    this.bounds.cy = y;
    this.bounds.l = x - this.bounds.w / 2;
    this.bounds.t = y - this.bounds.h / 2;
    this.bounds.r = x + this.bounds.w / 2;
    this.bounds.b = y + this.bounds.h / 2;
    return this;
  }
  // #endregion set position, draw #region special UI access: elem,parent,clone,

  //#region NOT tested and shouldnt be used
  firstChild() {
    return this.elem.childNodes[0];
  }
  lastChild() {
    return this.elem.childNodes[this.elem.childNodes.length - 1];
  }
  getUI() {
    return this.elem;
  }
  clone(newId, parent = null, drawit = false) {
    //the clone is only drawn if drawit==true
    let cl = new MS(newId, parent ? parent : this.parent, this.isSvg);
    cl.bounds = this.bounds.slice(); //shallow copy
    cl.data = this.data.slice(); // the following 3 not used right now!
    cl.elem = this.elem.cloneNode(true);
    if (drawit) {
      cl.draw();
    }
    return cl;
  }
  setElement(elem, w, h) {
    if (!this.isFloating) {
      this.removeFromUI();
    }
    this.elem = elem;
    this.elem.id = this.id;
    this.bounds.w = w;
    this.bounds.h = h;
    if (elem.childNodes.length > 0) {
      this.interactiveChild = elem.childNodes[0];
      this.interactiveChild.setAttribute("class", "ms");
    }
    return this;
  }
  removeFromUI() {
    if (this.isDrawn && this.parent) {
      this.parent.removeChild(this.elem);
      this.isDrawn = false;
      //console.log(this.id,'removed from parent',this.parent)
    }
  }
  removeFromChildIndex(idx) {
    //if (idx == 0){$(this.elem).empty();console.log('hallo!!!',this.elem,this);return;}
    let el = this.elem;
    while (el.childNodes.length >= idx) {
      el.removeChild(el.lastChild);
    }
    //console.log(el,this)
  }

  //#endregion UI: elem,parent,position,draw...

  //#region css class management
  addClass(className, condition) {
    this.replaceClass(condition, className);
  }
  replaceClass(oldClass, newClass) {
    let els = [...this.elem.childNodes];
    for (const el of els) {
      let cl = el.getAttribute("class");
      //console.log('>>>>>>>>>>',this.id,cl)
      //console.log('oldClass',oldClass,'newClass',newClass)
      if (cl && cl.includes(oldClass)) {
        cl = cl.replace(oldClass, newClass);
        el.setAttribute("class", cl);
      }
    }
  }
  removeClass(className, placeholder) {
    this.replaceClass(className, placeholder);
  }
  hasClass(className) {
    let els = [...this.elem.childNodes];
    for (const el of els) {
      if (el.getAttribute("class").includes(className)) return true;
    }
    return false;
  }
  //#endregion

  //#region visibility
  toggleVisible() {
    if (this.isVisible) hide();
    else show();
  }
  hide() {
    //if (!this.isVisible) return;

    this.elem.setAttribute("style", "visibility:hidden;display:none");
    //this.elem.setAttribute("class", "hidden"); //addClass("hidden");
    this.isVisible = false;
  }
  show() {
    //console.log('called show!!! ',this.id,this.isVisible)
    if (this.isVisible) return;
    this.elem.setAttribute("style", "visibility:visible");
    //this.elem.setAttribute("class", "svg"); //addClass("hidden");
    this.isVisible = true;
  }
  //#endregion

  //#region highlight and select, enable and disable interactivity
  enable() {
    this.isEnabled = true;
  }
  disable() {
    this.isEnabled = false;
  }
  highlight() {
    //console.log('highlight ms:',this.id)
    this.addClass("highlighted", "hible");
    this.isHighlighted = true;
  }
  unhighlight() {
    this.removeClass("highlighted", "hible");
    this.isHighlighted = false;
  }
  toggleSelection() {
    if (this.isSelected) {
      this.unselect();
      this.highlight();
    } else {
      this.unhighlight();
      this.select();
    }
  }
  select() {
    //console.log('select ms:',this.id)
    this.addClass("selected", "selectable");
    this.isSelected = true;
  }
  unselect() {
    this.removeClass("selected", "selectable");
    this.isSelected = false;
  }
  //#endregion

  //#region color
  getColor(fill, alpha = 1) {
    if (Array.isArray(fill)) {
      //console.log('richtig!')
      return `rgba(${fill[0]},${fill[1]},${fill[2]},${alpha})`;
    } else if (fill[0] != "#" && alpha != 1) {
      //console.log('falsch!!!')
      return `${fill};opacity:${alpha}`;
    } else return fill;
  }

  //#endregion

  //#region untested and unused shapes
  line({x1 = 0, y1 = 0, x2 = 100, y2 = 100, fill = "red", width = 4, unit = "px"} = {}) {
    // lines und polys nur mit px units! und numbers!!! <line x1="0" y1="0" x2="200"
    // y2="200" style="stroke:rgb(255,0,0);stroke-width:2" />
    let ell = document.createElementNS("http://www.w3.org/2000/svg", "line");
    fill = this.getColor(fill, alpha);
    ell.setAttribute("x1", -(x2 - x1) / 2);
    ell.setAttribute("y1", -(y2 - y1) / 2);
    ell.setAttribute("x2", (x2 - x1) / 2);
    ell.setAttribute("y2", (y2 - y1) / 2);
    ell.setAttribute("style", `stroke:${fill};stroke-width:${width}`);
    if (this.elem.childNodes.length == 0) {
      this.bounds.w = Math.abs(x2 - x1);
      this.bounds.h = Math.abs(y2 - y1);
      this.unit = unit;
      this.interactiveChild = ell;
    }
    this.elem.appendChild(ell);
    return this;
  }
  hex({className = "", w = 50, fill = "red", alpha = 1, x = 0, y = 0, unit = "px"} = {}) {}
  poly({className = "", points, fill = "pink", alpha = 1, x = 0, y = 0, unit = "px"} = {}) {
    // points: [{x:1,y:2},...] <polygon points="200,10 250,190 160,210"
    // style="fill:lime;stroke:purple;stroke-width:1" /> x,y should be the center of
    // the polygon
    let xmin = Math.min.apply(
      Math,
      points.map(function(o) {
        return o.x;
      })
    );
    let xmax = Math.max.apply(
      Math,
      points.map(function(o) {
        return o.x;
      })
    );
    let ymin = Math.min.apply(
      Math,
      points.map(function(o) {
        return o.y;
      })
    );
    let ymax = Math.min.apply(
      Math,
      points.map(function(o) {
        return o.y;
      })
    );
    let pts = points.map(o => {
      return {
        x: o.x - (xmax - xmin) / 2,
        y: o.y - (ymax - ymin) / 2
      };
    });
    let pts1 = points.map(o => {
      return {x: o.x, y: o.y};
    });
    let r = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    fill = this.getColor(fill, alpha);
    //todo: simplify the following
    let spts = ""; //"50,50 145,100 65,150";
    for (var p of pts) {
      spts += "" + p.x + "," + p.y + " ";
    }
    let spts1 = ""; //"50,50 145,100 65,150";
    for (var p of pts1) {
      spts += "" + p.x + "," + p.y + " ";
    }

    r.setAttribute("points", spts);
    //console.log("set points");console.log(spts1, "\r\n");
    // //points.map(p=>{return(p.x+','+y+' ')}).join());console.log(spts);
    r.setAttribute("stroke", "black");
    r.setAttribute("stroke-width", 5);
    r.setAttribute("style", `fill:${fill};`);
    if (className !== "") {
      r.setAttribute("class", className);
    }
    if (this.elem.childNodes.length == 0) {
      this.bounds.w = xmax - xmin;
      this.bounds.h = ymax - ymin;
      this.bounds.cx = xmin + this.bounds.w / 2;
      bounds.cy = ymin + this.bounds.h / 2;
      this.unit = unit;
      this.interactiveChild = r;
    }
    this.elem.appendChild(r);
    return this;
  }
  //#endregion untested and unused shapes

  //#region shapes
  button({className="",txt='click',w=100,h=25,fill='red',alpha=1,x=0,y=0}={}){
    let b=document.createElement('button');
    b.classList.add(className);
    b.classList.add('hible');
    b.classList.add('selectable');
    b.textContent = txt;
    this.elem.appendChild(b);
    this.tag('isCommand','yes');
    return this;
    //b.style.width=w;
    //b.style.height=h;
  }
  toggleButton({className="",w=100,h=25,fill='red',alpha=1,x=0,y=0}={}){
    let b=document.createElement('button');
    b.classList.add(className);
    //b.style.width=w;
    //b.style.height=h;
  }
  rect({className = "", w = 50, h = 25, fill = "yellow", alpha = 1, x = 0, y = 0} = {}) {
    let r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    r.setAttribute("width", w);
    r.setAttribute("height", h);
    r.setAttribute("x", -w / 2 + x);
    r.setAttribute("y", -h / 2 + y);

    if (this.elem.childNodes.length == 0) {
      //console.log('setting bounds to ',w,h)
      this.bounds.w = w;
      this.bounds.h = h;
    }

    fill = this.getColor(fill, alpha);
    r.setAttribute("fill", fill);
    // r.setAttribute("style", `fill:${fill};`);

    if (className !== "") {
      r.setAttribute("class", className);
    }
    this.elem.appendChild(r);
    return this;
  }
  ellipse({className = "", w = 50, h = 25, fill = "yellow", alpha = 1, x = 0, y = 0} = {}) {
    let ell = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    fill = this.getColor(fill, alpha);
    ell.setAttribute("fill", fill);

    if (this.elem.childNodes.length == 0) {
      this.bounds.w = w;
      this.bounds.h = h;
    }

    ell.setAttribute("rx", w / 2);
    ell.setAttribute("ry", h / 2);
    ell.setAttribute("cx", x); //kann ruhig in unit % sein!!!
    ell.setAttribute("cy", y);
    if (className !== "") {
      ell.setAttribute("class", className);
    }
    this.elem.appendChild(ell);
    return this;
  }
  text({className = "", maxWidth = 1000, txt = "A", fz = 20, fill = "black", alpha = 1, x = 0, y = 0, family = "arial", weight = ""} = {}) {
    let r = document.createElementNS("http://www.w3.org/2000/svg", "text");

    fill = this.getColor(fill, alpha);
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
      this.bounds.w = wText + 2 * padding;
      this.bounds.h = fz;
    }

    r.textContent = txt;
    this.elem.appendChild(r);
    return this;
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
    }
    if (this.elem.childNodes.length == 0) {
      this.bounds.w = w;
      this.bounds.h = h;
    }
    this.elem.appendChild(r);
    return this;
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

  //#region changing properties
  updateTextOn(className, val) {
    //console.log(this.elem,this.elem.childNodes)
    for (const ch of [...this.elem.childNodes]) {
      let type = ch.tagName;
      //console.log('ch=',ch,'getTypeOf:',type,'ch.tagName:',ch.tagName,'typeof=',type
      //of(ch));
      if (type == "text") {
        let classes = ch.getAttribute("class");
        //console.log('class=',classes);console.log(val.toString())
        if (classes && classes.includes(className)) {
          // this is the correct text element!console.log('current
          // value:',ch.textContent,Number(ch.textContent))
          ch.textContent = val;
        }
      }
    }

    // let matchingElements =
    // this.elem.childNodes.filter(x=>x.getAttribute('class').includes(className));
    // if (matchingElements.length>0){   let el = machintElements[0];
    // el.textContent = val; }
  }
  //#endregion changing properties
}
