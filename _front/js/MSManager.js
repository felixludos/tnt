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
  cadrePrototype: 60,
  cadre: 60
};
const SEPARATOR = "_";
class MSManager {
  constructor(board, troopDisplay, cardDisplay) {
    this.highObjects = [];
    //this.selectedObjects=[]; //do I need this?
    this.board = board;
    this.troopDisplay = troopDisplay;
    this.cardDisplay = cardDisplay;
    this.byId = {}; // {id:{ms:msObject,type:'region'|'power'|'unit'|'proto'|'cadre'|'action_card'|'investment_card'|'deck'|...}}
    this.decks = {action_card:[],investment_card:[]};
  }
  printObjects(){console.log(this.byId);}
  get(id) {
    //returns MS with this id
    if (!(id in this.byId)) {
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

  createRegion(id, pos) {
    let msRegion = new MS(id, this.board)
      .circle({className: "overlay region hible selectable", sz: SZ.region})
      .setPos(pos.x, pos.y)
      .draw();
    //msRegion.clickHandler = this.clickHandler.bind(this);
    this.byId[id] = {ms: msRegion, type: "region"};
    //msRegion.elem.addEventListener("click", this.clickHandler.bind(this));
    // region.elem.addEventListener("click", defaultClickHandler);
  }
  createType(id, type) {
    this.byId[id] = {type: type};
  }
  createCadrePrototype(power, unit, cv = 1) {
    let id = this.getCombinedId(power, unit);

    let cadre = this.createCadreMS(id, null, power, unit, cv, SZ.cadrePrototype);
    this.byId[id] = {ms: cadre, type: "proto"};
  }
  createCadre(id, power, unit, region, cv, showDataToFactionList) {
    let cadre = this.createCadreMS(id, board, power, unit, cv, SZ.cadre);

    //region provides pos
    let posx = this.get(region).x + -20;
    let posy = this.get(region).y + 40;

    //to display cadre in hidden way, could color overlay

    cadre.setPos(posx, posy).draw();

    this.byId[id] = {ms: cadre, type: "cadre"};
    cadre.tag("region", this.get(region).id);
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
      .text({fz: sz / 2, y: sz * 0.1, txt: cv, fill: "white"})
      .roundedRect({className: "overlay selectable", w: sz, h: sz, fill: "rgba(0,0,0,0)", rounding: sz * 0.1});

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
    let idAction = 'action_card';
    let idInvestment = 'investment_card';
    let actionDeck = new MS(idAction, board)
      .roundedRect({w: 251, h: 354, fill: actionDeckColor, rounding: 6})
      .textMultiline({txt: ["Action", "Deck"], fz: 28, fill: "white"})
      .roundedRect({className: "cardDeck overlay selectable", w: 251, h: 354, rounding: 6})
      .setPos(centerActionDeck.x, centerActionDeck.y)
      .draw();
    let investmentDeck = new MS(idInvestment, board)
      .roundedRect({w: 253, h: 356, fill: "sienna", rounding: 6})
      .textMultiline({txt: ["Investment", "Deck"], fz: 28, fill: "white"})
      .roundedRect({className: "cardDeck overlay selectable", w: 253, h: 356, fill: "transparent", rounding: 6})
      .setPos(centerInvestmentDeck.x, centerInvestmentDeck.y)
      .draw();
    this.byId[idAction] = {ms: actionDeck, type: "deck"};
    this.byId[idInvestment] = {ms: investmentDeck, type: "deck"};
  }
  createDeckCard(id,type){
    this.createType(id,type);
    this.decks[type].push(id);
  }

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
      let holder = makeSvg(sz);
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
  makeSelectable(ms, handler) {
    ms.highlight();
    ms.isEnabled = true;
    ms.clickHandler = handler;
  }
  makeUnselectable(ms, handler) {
    ms.unselect();
    ms.unhighlight();
    ms.isEnabled = false;
    ms.clickHandler = null;
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
  // getByType(ids, type) {
  //   let res = ids.filter(id => this.byId[id].type == type)[0];
  //   return res;
  // }
  // clickHandler(ev) {
  //   let id = evToId(ev);
  //   let ms = this.get(id);
  //   if (!ms.isEnabled) return;
  //   ms.toggleSelection();
  // }
  // moveCadre(msCadre, msRegion) {
  //   msCadre.setPos(msRegion.x, msRegion.y);
  //   msCadre.tag("region", msRegion.id);
  // }
}
