class NU {
  //uis by type: tile action_card investment_card influence
  //  nation nationality chip deck

  // unit and unitHidden are treated differently in UnitManager!!!
  constructor(assetMan) {
    this.assetMan = assetMan;
    this.U = {uis: {}}; //map game object id to everything needed for ui
    this.clearTemp();
  }
  addElement(ms, id, type) {
    //console.log(ms, id, type);
    if (!(type in this.U.uis)) {
      this.U.uis[type] = {};
    }
    this.U.uis[type][id] = ms;
    ms.tag("type", type);
  }
  clearTemp() {
    this.U.create = {};
    this.U.remove = {};
  }
  createCard(id, o) {
    //find parent of this card: hand of a player, openCards, none
    // if (!("owner" in o)) {
    //   //console.log("creating card without owner", id, o);
    // }
    let parentName = null;

    //if card is not visible it is not created
    let vis = getVisibleSet(o);

    parentName = this.findParentForCard(vis, "owner" in o ? o.owner : null);
    //console.log('createCard',id,o,parentName)

    if (parentName == null) return null;

    // find position of this card:
    let pos = this.findPositionForCard(parentName); //TODO: make to helper!

    //finally make card:
    let ms = new MS(id, this.getUniqueId(id, o.obj_type), parentName);
    this.setCardContent(ms, o);

    //pos={x:100,y:110};

    ms.setPos(pos.x, pos.y).draw();
    //console.log('createCard',ms,pos)
    return ms;
  }
  createTile(id) {
    let pos = this.assetMan.tilePositions[id];
    let sz = this.assetMan.SZ.region;
    let ms = new MS(id, this.getUniqueId(id, "tile"), "mapG")
      .circle({className: "overlay region", sz: sz})
      .setPos(pos.x, pos.y)
      .draw();
    return ms;
  }
  createNationPosition(id) {
    let pos = this.assetMan.nationPositions[id];
    let sz = this.assetMan.SZ.influence;
    let ms = new MS(id, this.getUniqueId(id, "nation"), "mapG")
      .circle({className: "overlay nation", sz: sz})
      .setPos(pos.x, pos.y)
      .draw();
    return ms;
  }
  drawCard(o) {
    let ms = this.createCard(o._id, o);
  }
  drawCards(type) {
    // cards that are not visible to anyone will not be created
    // they might be created later when updated
    let done = false;
    if (!(type in this.U.create)) return done;

    for (const id in this.U.create[type]) {
      let info = this.U.create[type][id];
      //let currentPlayer = info.player; //not needed right now
      let o = info.o;
      let ms = this.createCard(id, o);
      if (ms) {
        done = true;
        this.addElement(ms, id, type);
      }
    }
    return done;
  }
  drawActionCards() {
    return this.drawCards("action_card");
  }
  drawInvestmentCards() {
    this.drawCards("investment_card");
  }
  drawNationPositions() {
    for (const nat in this.assetMan.nationPositions) {
      let ms = this.createNationPosition(nat);
      this.addElement(ms, nat, "nation");
    }
  }
  drawTiles() {
    if (!("tile" in this.U.create)) return;

    for (const id in this.U.create["tile"]) {
      let ms = this.createTile(id);
      this.addElement(ms, id, "tile");
    }
  }
  findParentForCard(vis, owner) {
    let parentName = null;
    if (vis.length == 0) {
      return null;
    } else if (vis.length < 3) {
      parentName = owner ? "handG_" + owner : null;// "discardedG"; //card belongs in a hand
    } else {
      parentName = "openCardG"; //card is visible to all
      //alert("card visible to all!");
    }
    return parentName;
  }
  findPositionForCard(parentName) {
    let parent = document.getElementById(parentName);
    //console.log("parent:", parentName, parent);

    let nCards = parent.childNodes.length; // NO - 1; //because of text!
    let lastChild = nCards <= 1 ? null : parent.childNodes[nCards - 1];
    //console.log("n", nCards, "lastChild", lastChild);

    let wCard = this.assetMan.SZ.cardWidth;
    let hCard = this.assetMan.SZ.cardHeight;
    let gap = this.assetMan.SZ.gap;
    let div = parent.parentNode.parentNode;
    let wTotal = div.offsetWidth;
    let startPos = {x: gap + wCard / 2, y: gap + hCard / 2};
    //console.log("div", div.id, "wTotal", wTotal, "n", nCards, "startPos", startPos);

    let x = startPos.x;
    let y = startPos.y;
    if (lastChild) {
      let uid = lastChild.id;
      let ms = this.getUI(complus1(uid), complus2(uid));
      if (!ms) {
        //alert("ms non existing findPositionForCard elem if", uid, "id=", complus1(uid));
      }
      let lastPos = ms.getPos();
      x = lastPos.x + wCard + gap;
      y = lastPos.y;
      if (x + wCard + 1 > wTotal) {
        //console.log("MUSS ERWEITERN!!!!", div.style.height);
        let hDiv = firstNumber(div.style.height);
        //console.log("current height of cardDisplay:", hDiv);
        hDiv += hCard + gap;
        div.style.height = hDiv + "px";
        //console.log("new height of", div.id, hDiv);
        x = startPos.x;
        y += hCard + gap;
      }
    }
    return {x: x, y: y};
  }
  getId(uid) {
    return complus1(uid);
  }
  getType(uid) {
    return complus2(uid);
  }
  getUI(id, type) {
    return type in this.U.uis && id in this.U.uis[type] ? this.U.uis[type][id] : null;
  }
  getUniqueId(id, type) {
    let uid = complus(id, type);
    return uid;
  }
  initUI() {
    this.drawNationPositions();
  }
  prepCreate(id, o, otype, player) {
    //if (id == "action_12") //console.log("prepCreate", id, o, otype, player);
    if (!(otype in this.U.create)) {
      this.U.create[otype] = {};
    }
    this.U.create[otype][id] = {o: o, player: player};
  }
  prepRemove(id, otype) {
    if (this.getUI(id, otype)) this.U.remove[id] = otype;
  }
  removeUis() {
    for (const id in this.U.remove) {
      let type = this.U.remove[id];
      let ms = this.getUI(id, type);
      if (!ms) {
        //alert("ms doesnt exist:", id, type);
        return;
      }
      ms.removeForever();
      delete this.U.uis[type][id];
    }
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
    let cardWidth = this.assetMan.SZ.cardWidth;
    let cardHeight = this.assetMan.SZ.cardHeight;
    //console.log(cardWidth, cardHeight);

    let testText = ms.id;
    if ("owner" in o) {
      testText += " " + o.owner;
    }

    ms.roundedRect({w: cardWidth, h: cardHeight, fill: "white"})
      .text({txt: testText, fill: "red", y: cardHeight / 2, fz: cardWidth / 7})
      .textMultiline({txt: txt, maxWidth: cardWidth, fz: cardWidth / 7}) // / 6})
      .roundedRect({className: "overlay hible selectable", w: cardWidth, h: cardHeight});

    ms.tag("content", txt);
    ms.tag("type", o.obj_type);
    ms.tag("title", title);
    ms.tag("json", JSON.stringify(o));
    return ms;
  }
}
