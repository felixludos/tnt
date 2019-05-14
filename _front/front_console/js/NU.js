//#region const
const troopColors = {
  Germany: [174, 174, 176],
  Britain: [86, 182, 222],
  France: [121, 200, 205],
  USSR: [233, 138, 134],
  USA: [145, 186, 130],
  Italy: [174, 172, 131],
  Neutral: [255, 255, 102],
  Axis: [174, 174, 176],
  West: [86, 182, 222]
};
const SZ = {
  //various sizes used
  region: 180,
  pAxis: {x: 0, y: 20}, // this is where on the region placement of cadre is started
  pWest: {x: -50, y: -30},
  pUSSR: {x: +50, y: -30},
  cadrePrototype: 60,
  sumCadre: 60,
  cadreDetail: 44,
  cardWidth: 100,
  cardHeight: 150,
  gap: 10,
  chip: 40,
  influence: 100
};

//#endregion const
class NU {
  //uis by type: tile unit action_card investment_card influence
  //  nation nationality unitHidden chip deck
  constructor(assetMan) {
    this.assetMan = assetMan;
    this.U = {uis: {}}; //map game object id to everything needed for ui
    this.id2uid = {}; //map game object ids to ms.elem ids (ms.id will always by game obj id!)
    this.uid2id = {};
    this.uniqueIdCounter = 0;
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
  findParentForCard(vis, owner) {
    let parentName = null;
    if (vis.length == 0) {
      return null;
    } else if (vis.length < 3) {
      parentName = "handG_" + owner; //card belongs in a hand
    } else {
      parentName = "openCardsG"; //card is open to all
    }
    return parentName;
  }
  findPositionForCard(parentName) {
    let parent = document.getElementById(parentName);
   console.log(parentName, parent);
    let nCards = parent.childNodes.length-1; //because of text!
   //console.log('n',nCards);
    let w = SZ.cardWidth;
    let h = SZ.cardHeight;
    let gap = SZ.gap;
   //console.log('w',w, gap, h);
    let startPos = {x: gap + w / 2, y: 22 + gap + h / 2};
    let x = startPos.x + nCards * (w + gap);
    let y = startPos.y;
   //console.log('startPos',startPos,x,y)

    let div = parent.parentNode.parentNode;
   //console.log('div',div)
    let wTotal = div.offsetWidth;
   //console.log(div.id, 'wTotal',wTotal);
    if (x + w + gap > wTotal) {
     //console.log("MUSS ERWEITERN!!!!", div.style.height);
      let hDiv = firstNumber(div.style.height);
     //console.log("current height of cardDisplay:", h);
      hDiv += h;
     //console.log("new height of cardDisplay:", h);
      div.style.height = h + "px";
      x = startPos.x;
      y += h + gap;
    }
    return {x: x, y: y};
  }
  getUniqueId(id) {
    let uid = this.uniqueIdCounter + "_" + id;
    this.uniqueIdCounter += 1;
    this.uid2id[uid] = id;
    this.id2uid[id] = uid;
    return uid;
  }
  initUI() {
    this.drawNationPositions();
  }
  prepCreate(id, o, otype, player) {
    if (!(otype in this.U.create)) {
      this.U.create[otype] = {};
    }
    this.U.create[otype][id] = {o: o, player: player};
  }
  prepRemove(id, otype) {
    this.U.remove[id] = otype;
  }
  createCard(id, o) {
    //find parent of this card: hand of a player, openCards, none
    let parentName = null;
    if (!("visible" in o) || !("set" in o.visible)) return null;
    parentName = this.findParentForCard(o.visible.set, o.owner);
   //console.log('createCard',id,o,parentName)

    if (parentName == null || parentName.includes('undefined')) return null;

    // find position of this card:
    let pos = this.findPositionForCard(parentName); //TODO: make to helper!

    //finally make card:
    let ms = new MS(id, this.getUniqueId(id),  parentName);
    this.setCardContent(ms, o);

    //pos={x:100,y:110};

    ms.setPos(pos.x,pos.y).draw();
   //console.log('createCard',ms,pos)
    return ms;
  }
  createTile(id) {
    let pos = this.assetMan.tilePositions[id];
    let ms = new MS(id, this.getUniqueId(id), "mapG")
      .circle({className: "overlay region", sz: SZ.region})
      .setPos(pos.x, pos.y)
      .draw();
    return ms;
  }
  createNationPosition(id) {
    let pos = this.assetMan.nationPositions[id];
    let ms = new MS(id, this.getUniqueId(id), "mapG")
      .circle({className: "overlay nation", sz: SZ.influence})
      .setPos(pos.x, pos.y)
      .draw();
    return ms;
  }
  drawCard(o){
    let ms = this.createCard(o._id, o);
  }
  drawCards(type) {
    // cards that are not visible to anyone will not be created
    // they might be created later when updated
    let done=false;
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

  removeUis() {
    for (const id in this.U.remove) {
      let type = this.U.remove[id];
      if (!(type in this.U.uis) || !(id in this.U.uis[type])) continue;
      let ms = this.U.uis[type][id];
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
    let cardWidth = SZ.cardWidth;
    let cardHeight = SZ.cardHeight;
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
