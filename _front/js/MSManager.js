//#region const used by Manager only
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
  region: 180,
  pStartOffset: {x: -30, y: +30}, // this is where on the region placement of cadre is started
  cadrePrototype: 60,
  cadre: 60,
  cadreDetail: 44,
  cardWidth: 100,
  cardHeight: 150
};
const SEPARATOR = "_";
//#endregion

class MSManager {
  constructor(board, troopDisplay, cardDisplay) {
    this.highObjects = [];
    //this.selectedObjects=[]; //do I need this?
    this.board = board;
    this.troopDisplay = troopDisplay;
    this.cardDisplay = cardDisplay;
    this.byId = {}; // {id:{ms:msObject,type:'region'|'power'|'unit'|'proto'|'cadre'|'action_card'|'investment_card'|'deck'|...}}
    this.decks = {action_card: [], investment_card: []};
    this.hand = {action_card: [], investment_card: []};
    this.regions = []; // list of region ids
    this.cadres = []; // list of individual cadre ids
    this.sumCadres = []; // list of summary cadre ids
    this.currentView = this.getViewForCurrentZoom();
    this.timer = -1; 
    this.counter = 0;
  }
  // #region helpers
  makeSelectable(ms, handler) {
    ms.highlight();
    ms.isEnabled = true;
    //console.log(handler)
    ms.clickHandler = handler;
  }
  makeUnselectable(ms, handler) {
    ms.unselect();
    ms.unhighlight();
    ms.isEnabled = false;
    ms.clickHandler = null;
  }
  printObjects() {
    console.log(this.byId);
  }
  // #endregion

  // #region getters
  get(id) {
    //returns MS with this id
    if (!(id in this.byId)) {
      return null;
      //console.log("ERROR object[" + id + "] not created!");
    }

    ////console.log(id, this.byId[id])
    return this.byId[id].ms;
  }
  getType(id) {
    return id in this.byId ? this.byId[id].type : "unknown";
  }
  getIdParts(id) {
    return id.split(SEPARATOR);
  }
  getCombinedId(...args) {
    ////console.log(args.join(SEPARATOR))
    return args.join(SEPARATOR);
  }
  getPowerFromCadrePrototypeId(id) {
    return stringBefore(id, SEPARATOR);
  }
  getUnitFromCadrePrototypeId(id) {
    return stringAfter(id, SEPARATOR);
  }
  //#endregion

  // #region create objects
  createRegion(id, pos) {
    let msRegion = new MS(id, this.board)
      .circle({className: "overlay region hible selectable", sz: SZ.region})
      .setPos(pos.x, pos.y)
      .draw();
    this.byId[id] = {id: id, ms: msRegion, type: "region"};

    msRegion.tag("objects", []);
    // msRegion.tag("cadres", []); // all cadres on this region by id
    // msRegion.tag("sumCadres", []); // has ids like Berlin_Axis,Berlin_West,Berlin_USSR,Berline_Neutral
    msRegion.tag("zoomView", "summary"); // view can be 'summary' or 'detail'
    //msRegion.elem.addEventListener("mouseover", this.switchView.bind(this));
    this.regions.push(id);
  }
  createType(id, type) {
    this.byId[id] = {id: id, type: type};
  }
  createCadrePrototype(power, unit, cv = 1) {
    let id = this.getCombinedId(power, unit);

    let cadre = this.createCadreMS(id, null, power, unit, cv, SZ.cadrePrototype);
    this.byId[id] = {id: id, ms: cadre, type: "proto"};
  }
  calcStartPos(region) {
    let posx = this.get(region).x + SZ.pStartOffset.x; //-20;
    let posy = this.get(region).y + SZ.pStartOffset.y; //- 20; //+ 40;
    return {x: posx, y: posy};
  }
  createCadre(id, power, unit, region, cv, showDataToFactionList) {
    let cadre = this.createCadreMS(id, board, power, unit, cv, SZ.cadreDetail);
    this.byId[id] = {id: id, ms: cadre, type: "cadre"};

    this.cadres.push(id);

    let msRegion = this.get(region);

    cadre.tag("region", msRegion.id);

    //cal position of this cadre on region: simplest, just in a grid
    // how many cadres are on this region?
    let objectIdList = msRegion.getTag("objects");
    //console.log('list for',region,':',objectIdList)
    let objectList = objectIdList.map(id => this.get(id));
    //console.log('list for',region,':',objectList.length)
    let n = 0;
    for (var ms of objectList) {
      let v = ms.getTag("zoomView");
      //console.log('zoomView is ',v);
      if (v == "detail") n += 1;
    }
    //let n = cadreList.filter(id=>this.get(id).getTag('zoomView') == 'detail').length;
    //console.log('there are ',n,' detail cadres on ',region)

    objectIdList.push(id); // adding new cadre to region list of cadres

    let w = SZ.region;
    let pos = {x: msRegion.x, y: msRegion.y};
    let r = intDiv(n, 4);
    let c = n % 4;
    let d = w / 5;
    let x = pos.x + (d * (c + 1) - w / 2);
    let y = pos.y + (d * (r + 1) - w / 2);

    cadre.setPos(x, y).draw();
    cadre.tag("zoomView", "detail"); //should be visible only in detail view

    // add info to sumCadre for playerFaction and this region
    let sumId = region + "_" + playerFaction;
    let sumCadre = this.get(sumId);
    if (!sumCadre) {
      // create summary cadre for this faction (playerFaction)
      sumCadre = this.createCadreMS(sumId, board, power, unit, cv, SZ.cadre);
      let p = this.calcStartPos(region);
      sumCadre.setPos(p.x, p.y).draw();
      msRegion.getTag("objects").push(sumId);
      this.byId[sumId] = {id: sumId, ms: sumCadre, type: "cadre"};
      sumCadre.tag("zoomView", "summary"); //should be visible only in summary view
      this.sumCadres.push(sumId);
    } else {
      //update cv on sumCadre by cv of new cadre
      let oldval = sumCadre.getTag("cv");
      //console.log(oldval,typeof(oldval));

      let newval = oldval + cv;
      sumCadre.updateTextOn("cv", newval);
      sumCadre.tag("cv", newval);
      //console.log('updating value on cadre',sumId,'for',region,'from',oldval,'to',newval);
    }

    if (msRegion.getTag("zoomView") != "summary") sumCadre.hide();
    if (msRegion.getTag("zoomView") != "detail") cadre.hide();
    this.switchView(region, false);

    return cadre;
  }
  createCadreMS(id, parent, power, unit, cv, sz) {
    //power provides color
    let color = troopColors[power];
    //unit provides text and symbol
    const troopInfo = {
      Infantry: ["Infantry", "|", 2],
      Tank: ["Tank", "3", 1],
      AirForce: ["AirForce", "x", 2],
      Submarine: ["Submarine", "m", 1],
      Fleet: ["Fleet", "p", 1],
      Carrier: ["Carrier", "o", 1],
      Fortress: ["Fortress", ",", 2] //oder '0'
    };
    let name = troopInfo[unit][0];
    let letter = troopInfo[unit][1];
    let scaleFactor = troopInfo[unit][2];

    const fs1 = {
      Infantry: {fz: 0.5, x: 0.5, y: 1 / 6},
      Fleet: {fz: 0.25, x: 0.45, y: 1 / 4},
      Convoy: {fz: 0.35, x: 0.5, y: 1 / 6},
      Tank: {fz: 0.25, x: 0.54, y: 1 / 5.5},
      AirForce: {fz: 0.6, x: 0.5, y: 1 / 5},
      Carrier: {fz: 0.25, x: 0.5, y: 1 / 6},
      Submarine: {fz: 0.25, x: 0.5, y: 1 / 5},
      Fortress: {fz: 0.6, x: 0.5, y: 1 / 5.5}
    };
    let f = fs1[unit];

    //console.log("SIZE IS", sz);
    let cadre = new MS(id, parent)
      .roundedRect({w: sz, h: sz, fill: color, rounding: sz * 0.1})
      .roundedRect({className: "ms", w: sz * 0.9, h: sz * 0.9, fill: "rgba(0,0,0,.5)", rounding: sz * 0.08})
      .text({fz: sz / 6, y: -0.3 * sz, txt: name, fill: "orange"})
      .text({
        family: "Military RPG",
        fz: sz * f.fz,
        y: sz * f.y,
        txt: letter,
        fill: "rgba(255,255,255,.3)"
      })
      .text({className: "cv", fz: sz / 2, y: sz * 0.1, txt: cv, fill: "white"})
      .roundedRect({className: "overlay selectable", w: sz, h: sz, fill: "rgba(0,0,0,0)", rounding: sz * 0.1});

    cadre.tag("cv", cv);
    return cadre;
  }
  createDecks() {
    let wDeckArea = 251;
    let hDeckArea = 354;
    let pos = {x: 166, y: 998};
    let centerActionDeck = {x: 166, y: 998}; // center of action deck
    let centerInvestmentDeck = {x: 3233, y: 966}; // center of investment deck
    let rounding = 6;
    let actionDeckColor = "orange";
    let idAction = "action_card";
    let idInvestment = "investment_card";
    let actionDeck = new MS(idAction, board)
      .roundedRect({w: 251, h: 354, fill: actionDeckColor, rounding: 6})
      .textMultiline({txt: ["Action", "Deck"], fz: 28, fill: "white"})
      .roundedRect({className: "cardDeck overlay hible selectable", w: 251, h: 354, rounding: 6})
      .setPos(centerActionDeck.x, centerActionDeck.y)
      .draw();
    let investmentDeck = new MS(idInvestment, board)
      .roundedRect({w: 253, h: 356, fill: "sienna", rounding: 6})
      .textMultiline({txt: ["Investment", "Deck"], fz: 28, fill: "white"})
      .roundedRect({className: "cardDeck overlay hible selectable", w: 253, h: 356, fill: "transparent", rounding: 6})
      .setPos(centerInvestmentDeck.x, centerInvestmentDeck.y)
      .draw();
    this.byId[idAction] = {id: idAction, ms: actionDeck, type: "deck"};
    this.byId[idInvestment] = {id: idInvestment, ms: investmentDeck, type: "deck"};
  }
  // createDeckCard(id, type) { // brauch ich garnicht glaub ich!
  //   this.createType(id, type);
  //   this.decks[type].push(id);
  // }

  createHandCard(id, o, type) {
    // creates card but does not position it (Hand does that)
    let txt = [];
    if ("top" in o) {
      txt = [o.top, " ", o.season, o.priority + o.value, " ", o.bottom];
      txt = txt.map(x => x.replace(/_/g, " "));
    } else if ("wildcard" in o) {
      txt = [o.wildcard, " ", o.season, o.priority + o.value, " ", " "];
      txt = txt.map(x => x.replace(/_/g, " "));
    }
    let cardWidth = SZ.cardWidth;
    let cardHeight = SZ.cardHeight;

    let card = new MS(id)
      .roundedRect({w: cardWidth, h: cardHeight, fill: "white"})
      .textMultiline({txt: txt, maxWidth: cardWidth, fz: cardWidth / 6})
      .roundedRect({className: "overlay hible selectable", w: cardWidth, h: cardHeight});
    this.byId[id] = {id: id, ms: card, type: type};
    this.hand[type].push(id);

    return card;
  }
  //#endregion

  // #region selection action
  convertActionTree(t) {
    let typelist = this.detectTreeTypes(t); // eg. ["power", "unknown", "region", "unit"]
    let res = this.typelistTranslator(typelist);

    let levelTypes = res.levelTypes;
    let levelsPerChoice = res.levelsPerChoice;
    let choiceTypes = res.choiceTypes;
    let orderIndices = levelTypes.map(x => typelist.indexOf(x));

    let selectionTree = fromResortedLevelsNew(t, orderIndices);
    selectionTree.print();
    return {tree: selectionTree, levelTypes: levelTypes, levelsPerChoice: levelsPerChoice, choiceTypes: choiceTypes};
  }
  detectTreeTypes(t) {
    // assumes t has 1 type by level and all branches have same length
    let branch = t.branchlist(-1, false)[0];
    let types = [];
    for (const arr of branch) {
      types.push(this.getType(arr[0]));
    }
    return types;
  }
  displayChoices(idlists, handler) {
    //console.log("***manager:displayChoices",idlists[0]);
    let idlist = idlists.map(l => this.getCombinedId(...l));
    //console.log(idlist);
    let objects = idlist.map(id => this.get(id));

    let type = this.getType(idlist[0]);
    if (type == "proto") {
      clearElement(troopDisplay);
      this.displayCadrePrototypes(idlist);
    }
    objects.map(o => this.makeSelectable(o, handler));
    objects.map(o => addIf(o, this.highObjects));
  }
  displayCadrePrototypes(ids) {
    var d = this.troopDisplay;
    this.troopDisplay.style.display = "grid";
    // d.classList.remove('hidden'); //TODO: why does this not work?!?!?
    var n = ids.length;
    //console.log(ids.toString());
    var sz = SZ.cadrePrototype;
    for (var i = 0; i < n; i++) {
      let cadre = this.get(ids[i]);

      let szString = "" + sz + "px";
      let holder = makeSvg(sz, sz);
      d.appendChild(holder);
      cadre.setPos(sz / 2, sz / 2);
      holder.appendChild(cadre.elem);
      //holder.appendChild(cadre.elem);
    }
    let dims = calculateDims(n, sz);
    var sGridColumn = `${sz}px `.repeat(dims.cols);
    d.classList.add("gridContainer");
    d.style.gridTemplateColumns = `repeat(auto-fill,${sGridColumn})`;
    d.style.width = dims.width + "px";
    d.style.padding = dims.padding + "px";
    d.style.gridGap = dims.gap + "px";
  }
  hideCadrePrototypes() {
    this.troopDisplay.style.display = "none";
  }
  closeSelection(ids) {
    clearElement(troopDisplay);
    this.hideCadrePrototypes();
    let selectedObjects = ids.map(id => this.get(id));
    selectedObjects.map(x => x.unselect());
    this.highObjects.map(o => this.makeUnselectable(o));
    this.highObjects = [];
  }
  undoSelection(idparts) {
    //console.log('*** undoSelection')
    let id = this.getCombinedId(idparts);
    let ms = this.get(id);
    //console.log(idparts,id,ms);
    ms.unselect();
    ms.highlight();
  }

  transformToIds(idlists) {
    return idlists.map(l => this.getCombinedId(...l));
  }
  typelistTranslator(typelist) {
    // game specific: translates a list of required types (from server action data) into result:
    // {order:typelist reflecting order of selection,
    //  levels:number of tree levels per selection}
    // eg. for cadre prototype placement selection:
    // will return {order:['region','power','unit'],levels:[1,2]}
    let skey = typelist.join("_");
    let transDict = {
      power_unknown_region_unit: {
        levelTypes: ["region", "power", "unit"],
        levelsPerChoice: [1, 2],
        choiceTypes: ["region", "proto"]
      }
    };
    return transDict[skey];
  }
  // #endregion

  // #region cards
  hasActionCards() {
    return this.hand.action_card.length;
  }
  calculateCardLayout(handChanged = true) {
    if (!this.hasActionCards()) return;
    if (!handChanged && this.cardRows == 1) return;
    clearElement(cardDisplay);
    let d = cardDisplay;
    let idsAction = this.hand.action_card;
    let idsInvestment = this.hand.investment_card;
    var n = idsAction.length + idsInvestment.length;
    var w = SZ.cardWidth;
    var h = SZ.cardHeight;
    for (var i = 0; i < idsAction.length; i++) {
      let card = this.get(idsAction[i]);
      let holder = makeSvg(w, h);
      d.appendChild(holder);
      card.setPos(w / 2, h / 2);
      holder.appendChild(card.elem);
    }
    for (var i = 0; i < idsInvestment.length; i++) {
      let card = this.get(idsAction[i]);
      let holder = makeSvg(w, h);
      d.appendChild(holder);
      card.setPos(w / 2, h / 2);
      holder.appendChild(card.elem);
    }
    let dims = calculateDims(n, w, 1); //layout(n,w,h);
    var sGridColumn = `${w}px `.repeat(dims.cols);
    // d.classList.add("cardGridContainer");
    d.style.gridTemplateColumns = `repeat(auto-fill,${sGridColumn})`;
    // d.style.width = dims.width + "px";
    d.style.padding = dims.padding + "px";
    d.style.gridGap = dims.gap + "px";
    this.cardRows = dims.rows;
  }
  drawDeckCard(id, o, type) {
    let card = this.createHandCard(id, o, type);
    // can't hurt to add json object
    this.byId[id]["json"] = o;

    this.calculateCardLayout();
    // card is ms of card
    // card.elem is g element
    // how to determine pos of card?
    // simplest: count cards displayed*widthOfCard,
  }
  activateDecks(onDrawn) {
    let adeck = this.get("action_card");
    let ideck = this.get("investment_card");
    //console.log(adeck,ideck)
    this.makeSelectable(adeck, onDrawn);
    this.makeSelectable(ideck, onDrawn);
  }
  // #endregion

  // #region views of objects
  zooming() {
    console.log(this.counter);
    this.counter += 1;
    if (this.timer != -1) clearTimeout(this.timer);
    this.timer = window.setTimeout(this.viewObserver.bind(this), 350);
  }
  getViewForCurrentZoom() {
    let zoom = getZoomFactor(board);
    //console.log(zoom);
    let view = zoom >= 0.4 ? "detail" : "summary"; // this is the view that should be active
    return view;
  }
  viewObserver() {
    let view = this.getViewForCurrentZoom();
    if (this.currentView == view) return;
    for (const region of this.regions) {
      let msRegion = this.get(region);
      let rView = msRegion.getTag("zoomView");
      if (rView == view) continue;
      this.switchView(region, false);
    }
    this.currentView = view;
  }

  switchView(region) {
    if (this.getType(region) != "region") return;

    let view = this.getViewForCurrentZoom();
    if (this.currentView == view) return;

    let msRegion = this.get(region);
    if (msRegion.getTag("objects").length < 3) return;

    let regionIsInView = msRegion.getTag("zoomView");
    //console.log('view of',region,'is',regionIsInView)
    if (view == regionIsInView) return;

    let objects = msRegion.getTag("objects").map(x => this.get(x)); // list of ms objects
    for (const ms of objects) {
      let v = ms.getTag("zoomView");
      //console.log('view of',id,'is',v)
      if (v == view) {
        ms.show();
      } else {
        ms.hide();
      }
    }
    if (view == "detail") {
      let pos = this.calcStartPos(region);
      objects = objects.filter(x => x.getTag("zoomView") == "detail");
      //console.log(objects);
      snail(pos, objects, SZ.cadreDetail + 1);
    }
    msRegion.tag("zoomView", view);
  }
  // #endregion views of objects
}
