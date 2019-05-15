class AHand {
  constructor(assets, gName, divName, ownerOrOpen) {
    this.id = ownerOrOpen;
    this.cards = {}; // each card has id:{ms:ms,o:o}
    this.cardWidth = assets.SZ.cardWidth;
    this.cardHeight = assets.SZ.cardHeight;
    this.gap = assets.SZ.gap;
    this.startPos = {x: 80 + this.gap + this.cardWidth / 2, y: this.gap + this.cardHeight / 2};
    this.div = document.getElementById(divName); //shared parent of parent of g
    this.g = document.getElementById(gName);
    this.wDiv = this.div.offsetWidth;
    this.hDiv = firstNumber(this.div.style.height);
    this.xNext = this.startPos.x;
    this.yNext = this.startPos.y;
    //console.log("AHand constructor: div w=" + this.wDiv + ", h=" + this.hDiv);
  }
  addExisting(id, o, ms) {
    ms.parent = this.g;
    this.positionAndAdd(id, ms, o);
    return ms;
  }
  addNew(id, o) {
    let parentName = this.g.id;
    let ms = new MS(id, id, parentName); // cards have id also as elem id! so make sure it is unique!
    this.setCardContent(ms, o);
    this.positionAndAdd(id, ms, o);
    return ms;
  }
  getNextPosition() {
    let x = this.xNext;
    let y = this.yNext;
    if (x + this.cardWidth / 2 + this.gap > this.wDiv) {
      x = this.startPos.x;
      y += this.cardHeight + this.gap;

      let sizeNeeded = y + this.cardHeight / 2 + this.gap;
      if (this.hDiv < sizeNeeded) {
        this.hDiv = sizeNeeded;
        this.div.style.height = this.hDiv + "px";
      }
    }
    this.xNext = x + this.gap + this.cardWidth;
    this.yNext = y;
    let pos = {x: x, y: y};
    return pos;
  }
  hide() {
    hide(this.g);
  }
  getTitle(id){
    if (id in this.cards){
      return this.cards[id].ms.getTag('title');
    }else{return 'unknown'}
  }
  positionAndAdd(id, ms, o) {
    let pos = this.getNextPosition();
    ms.setPos(pos.x, pos.y).draw();
    this.cards[id] = {ms: ms, o: jsCopy(o)};
  }
  relayout() {
    //reset position
    this.xNext = this.startPos.x;
    this.yNext = this.startPos.y;
    for (const id in this.cards) {
      const ms = this.cards[id].ms;
      let pos = this.getNextPosition();
      ms.setPos(pos.x, pos.y).draw();
    }
  }
  relayoutExcept(id) {
    //reset position
    this.xNext = this.startPos.x;
    this.yNext = this.startPos.y;
    for (const id1 in this.cards) {
      if (id1 == id) continue;
      const ms = this.cards[id1].ms;
      let pos = this.getNextPosition();
      ms.setPos(pos.x, pos.y).draw();
    }
  }
  remove(id) {
    if (!(id in this.cards)) {
      return null;
    }
    //remove ms from ui
    let ms = this.cards[id].ms;
    //console.log("ms", ms);
    ms.removeFromUI();


    this.relayoutExcept(id);

    //calculate hight needed for cards in div
    let chLast = this.g.lastChild;
    // how to find out if this is a card in this hand? use id!
    if ("id" in chLast) {
      //console.log('current height of div is',this.hDiv)
      //console.log('last child is now:',chLast)
      let idLast = chLast.id;
      if (idLast in this.cards) {
        //console.log('last child is card with id:',idLast)
        let msLast = this.cards[idLast].ms;
        let posLast = msLast.getPos();
        //let wNeeded = msLast.bounds.r + this.gap;
        let hNeeded = posLast.y + this.cardHeight / 2 + this.gap;
        let otherHNeeded = msLast.bounds.b + this.gap;
        //console.log('last child pos:',posLast,'hNeeded',hNeeded,'otherh',otherHNeeded)
        if (hNeeded != otherHNeeded) {
          //error('I knew it!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
        }
        if (hNeeded < 200) hNeeded = 200;
        if (this.hDiv > hNeeded && isVisible(this.g)) {
          //console.log('div shrinks!!!!!!!!!!!!!!!!')
          this.hDiv = hNeeded;
          this.div.style.height = this.hDiv + "px";
          //alert('go!')
        }
      }
    }
    // if (this.g.lastChild == ms.elem && ms.getPos().x == this.startPos.x && ms.getPos().y != this.startPos.y && isVisible(this.g)){
    //   this.hDiv -= this.cardHeight+this.gap;
    //   this.div.style.height=this.hDiv + 'px';
    // }

    delete this.cards[id];
    return ms;
  }
  setCardContent(ms, o) {
    let txt = [];
    let title = "";
    if ("top" in o) {
      if (o.obj_type == "action_card") {
        txt = [o.top, " ", o.season, o.priority + o.value, " ", o.bottom];
      } else {
        txt = [o.top, " ", " ", o.value ? o.value.toString() : " ", " ", " ", o.bottom];
      }
      title = o.top;
    } else if ("wildcard" in o) {
      txt = [o.wildcard, " ", o.season, o.priority + o.value, " ", " "];
      title = o.wildcard;
    } else if ("intelligence" in o) {
      txt = [o.intelligence, " ", " ", o.value ? o.value.toString() : " ", " ", " ", " "];
      title = o.intelligence;
    } else if ("science" in o) {
      txt = [o.value + "   (" + o.year.toString() + ")"];
      o.science.map(x => txt.push(x));
      title = o.year;
    }
    if (txt.length > 0) {
      //console.log(txt)
      txt = txt.map(x => x.replace(/_/g, " "));
    }
    let cardWidth = this.cardWidth;
    let cardHeight = this.cardHeight;
    //console.log(cardWidth, cardHeight);

    let testText = ms.id;
    if ("owner" in o) {
      testText += " " + o.owner;
    }

    ms.roundedRect({w: cardWidth, h: cardHeight, fill: "white"})
      .text({txt: testText, fill: "red", y: cardHeight / 2, fz: cardWidth / 7})
      .textMultiline({txt: txt, maxWidth: cardWidth, fz: cardWidth / 7}) // / 6})
      .roundedRect({className: "overlay", w: cardWidth, h: cardHeight});

    ms.tag("content", txt);
    ms.tag("type", o.obj_type);
    ms.tag("title", title);
    ms.tag("json", JSON.stringify(o));
    return ms;
  }
  show() {
    show(this.g);
    let divHeight = firstNumber(this.div.style.height);
    if (this.hDiv != divHeight) {
      this.div.style.height = this.hDiv + "px";
    }
  }
  sort(prop) {}
  update(id, o_new) {
    //if ()
  }
}
