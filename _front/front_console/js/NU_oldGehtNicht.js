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
    this.U = {uis: {}, units: {Axis: {}, West: {}, USSR: {}}}; //map game object id to everything needed for ui
    //unit ids are stored per owner and tile!
    //so when remove unit, need to remove from uis AND units!
    //units are destroyed and re-created when moved
    //hidden Units treated separately
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
    //   console.log("creating card without owner", id, o);
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
  createNationPosition(id) {
    let pos = this.assetMan.nationPositions[id];
    let ms = new MS(id, this.getUniqueId(id, "nation"), "mapG")
      .circle({className: "overlay nation", sz: SZ.influence})
      .setPos(pos.x, pos.y)
      .draw();
    return ms;
  }
  createTile(id) {
    let pos = this.assetMan.tilePositions[id];
    let ms = new MS(id, this.getUniqueId(id, "tile"), "mapG")
      .circle({className: "overlay region", sz: SZ.region})
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
  drawUnit(o,player) {
    let owner = getUnitOwner(o.nationality);
    let ms = this.createUnit(o._id, o, owner);
    let idHidden = comp_(owner, o.tile);
    if (!getUI(idHidden,'unitHidden')){
      let msHidden = this.createHiddenUnit(idHidden, o, owner);
    }
    

  }

  drawUnits() {
    if (!("unit" in this.U.create)) return;

    for (const id in this.U.create["unit"]) {
      let prep = this.U.create["unit"][id];
      let o=prep.o;
      let player=prep.player;
      drawUnit(o, player);
      this.addElement(ms, id, "unit");
    }
  }
  findParentForCard(vis, owner) {
    let parentName = null;
    if (vis.length == 0) {
      return null;
    } else if (vis.length < 3) {
      parentName = owner ? "handG_" + owner : "discardedG"; //card belongs in a hand
    } else {
      parentName = "openCardG"; //card is visible to all
      alert("card visible to all!");
    }
    return parentName;
  }
  findPositionForCard(parentName) {
    let parent = document.getElementById(parentName);
    console.log("parent:", parentName, parent);

    let nCards = parent.childNodes.length; // NO - 1; //because of text!
    let lastChild = nCards <= 1 ? null : parent.childNodes[nCards - 1];
    console.log("n", nCards, "lastChild", lastChild);

    let wCard = SZ.cardWidth;
    let hCard = SZ.cardHeight;
    let gap = SZ.gap;
    let div = parent.parentNode.parentNode;
    let wTotal = div.offsetWidth;
    let startPos = {x: gap + wCard / 2, y: gap + hCard / 2};
    console.log("div", div.id, "wTotal", wTotal, "n", nCards, "startPos", startPos);

    let x = startPos.x;
    let y = startPos.y;
    if (lastChild) {
      let uid = lastChild.id;
      let ms = this.getUI(complus1(uid), complus2(uid));
      if (!ms) {
        alert("ms non existing findPositionForCard elem if", uid, "id=", complus1(uid));
      }
      let lastPos = ms.getPos();
      x = lastPos.x + wCard + gap;
      y = lastPos.y;
      if (x + wCard + 1 > wTotal) {
        console.log("MUSS ERWEITERN!!!!", div.style.height);
        let hDiv = firstNumber(div.style.height);
        console.log("current height of cardDisplay:", hDiv);
        hDiv += hCard + gap;
        div.style.height = hDiv + "px";
        console.log("new height of", div.id, hDiv);
        x = startPos.x;
        y += hCard + gap;
      }
    }
    return {x: x, y: y};

    // let x = startPos.x + nCards * (wCard + gap);
    // let y = startPos.y;
    // //console.log('startPos',startPos,x,y)

    // if (x + wCard + gap > wTotal) {
    //   console.log("MUSS ERWEITERN!!!!", div.style.height);
    //   let hDiv = firstNumber("height vor erweitern", div.style.height);
    //   //console.log("current height of cardDisplay:", h);
    //   hDiv += hCard + gap;
    //   div.style.height = hDiv + "px";
    //   console.log("new height of", div.id, hDiv);
    //   x = startPos.x;
    //   y += hCard + gap;
    // }
    // return {x: x, y: y};
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
    //if (id == "action_12") console.log("prepCreate", id, o, otype, player);
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
        alert("ms doesnt exist:", id, type);
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
  updateCv(id, o) {
    let cv = o.cv;
    let ms = this.getUI(id, "unit");
    alert("updateCv", id, o, ms, cv);
    updateUnitCv(ms, cv);
  }
  updateUnitCv(ms, cv) {
    console.log("updateUnitCv", ms, cv);
    //plaziere 1 circle foreach  #
    //muss alte punkte wegnehmen!!! falls welche hat!
    ms.removeFromChildIndex(5);
    //msUnit.circle({sz:20,fill:'white'});
    let sz = SZ.cadreDetail;
    let dx = sz / (cv + 1);
    let xStart = -sz / 2;
    let y = -sz / 3.2;
    let diam = Math.min(dx / 1.5, sz / 5);
    //console.log(dx,y)
    let x = dx + xStart;
    for (let i = 0; i < cv; i++) {
      ms.circle({sz: diam, x: x, y: y, fill: "white"});
      x += dx;
    }

    ms.tag("cv", cv);
  }
}
