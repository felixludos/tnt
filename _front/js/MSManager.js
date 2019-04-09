const troopInfo = {
  Infantry: ["Infantry", "|", 2],
  Tank: ["Tank", "3", 1],
  AirForce: ["AirForce", "x", 2],
  Submarine: ["Submarine", "m", 1],
  Fleet: ["Fleet", "p", 1],
  Carrier: ["Carrier", "o", 1],
  Fortress: ["Fortress", ",", 2] //oder '0'
};
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
  cadre: 40
};
const SEPARATOR = "_";
const fs = {
  Infantry: {fz: 0.5, x: 0.5, y: 4 / 6},
  Fleet: {fz: 0.35, x: 0.45, y: 5 / 6},
  Convoy: {fz: 0.35, x: 0.5, y: 5 / 6},
  Tank: {fz: 0.25, x: 0.54, y: 4 / 6},
  AirForce: {fz: 0.6, x: 0.5, y: 4 / 6},
  Carrier: {fz: 0.25, x: 0.5, y: 2.1 / 3},
  Submarine: {fz: 0.25, x: 0.5, y: 4.2 / 6},
  Fortress: {fz: 0.6, x: 0.5, y: 4 / 6}
};

class MSManager {
  constructor(board, troopDisplay, cardDisplay) {
    this.highObjects=[];
    //this.selectedObjects=[];
    this.board = board;
    this.troopDisplay = troopDisplay;
    this.cardDisplay = cardDisplay;
    this.byId = {}; // {id:{ms:msObject,type:'region'|'power'|'unit'|'proto'|'cadre'|'hand'|'deck'|...}}
  }
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
  clickHandler(ev) {
    let id = evToId(ev);
    let ms = this.get(id);
    if (!ms.isEnabled) return;
    ms.toggleSelection();
  }
  undoSelection(idparts){
    //console.log('*** undoSelection')
    let id = this.getCombinedId(idparts);
    let ms = this.get(id);
    //console.log(idparts,id,ms);
    ms.unselect();
    ms.highlight();
  }
  createCadrePrototype(power, unit, cv = 1) {
    // let elem = this.createCadreG(power, unit, 1, 50);
    // let cadre = new MS(id, board);
    // cadre.setElement(elem, 50, 50);
    // this.byId[id] = cadre;
    let id = this.getCombinedId(power, unit);
    //console.log("*** Manager.createCadrePrototype)", id, power, unit, cv);

    //power provides color
    let color = troopColors[power];
    //unit provides text and symbol
    let name = troopInfo[unit][0];
    let letter = troopInfo[unit][1];
    let scaleFactor = troopInfo[unit][2];

    let val = cv;

    let percentage = 6.25;
    let sz = SZ.cadrePrototype;

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

    let cadre = new MS(id)
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
      .text({fz: sz / 2, y: sz * 0.1, txt: val, fill: "black"})
      .roundedRect({className: "overlay selectable", w: sz, h: sz, fill: "rgba(0,0,0,0)", rounding: sz * 0.1});
    this.byId[id] = {ms: cadre, type: "proto"};

    return cadre;
  }
  createRegion(id, pos) {
    let msRegion = new MS(id, this.board)
      .circle({className: "ms hible selectable", sz: SZ.region})
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

  createCadre(id, power, unit, region, cv, showDataToFactionList) {
    // let elem = this.createCadreG(power, unit, 1, 50);
    // let cadre = new MS(id, board);
    // cadre.setElement(elem, 50, 50);
    // this.byId[id] = cadre;
    //console.log("*** Manager.createCadre)", id, power, unit, region, cv);

    //power provides color
    let color = troopColors[power];
    //unit provides text and symbol
    let name = troopInfo[unit][0];
    let letter = troopInfo[unit][1];
    let scaleFactor = troopInfo[unit][2];

    // cv provides number
    //region provides pos
    let posx = this.get(region).x + -20;
    let posy = this.get(region).y + 40;

    //console.log(posx, posy);

    let val = cv;

    let percentage = 6.25;
    let sz = 60; //SZ.cadrePrototype;

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

    let cadre = new MS(id, board)
      .roundedRect({w: sz, h: sz, fill: color, rounding: sz * 0.1})
      .roundedRect({w: sz * 0.9, h: sz * 0.9, fill: "rgba(0,0,0,.5)", rounding: sz * 0.08})
      .text({fz: sz / 6, y: -0.3 * sz, txt: name, fill: "orange"})
      .text({
        family: "Military RPG",
        fz: sz * f.fz,
        y: sz * f.y,
        txt: letter,
        fill: "rgba(255,255,255,.3)"
      })
      .text({fz: sz / 2, y: sz * 0.1, txt: val, fill: "black"})
      .roundedRect({className: "overlay hible selectable", w: sz, h: sz, fill: "rgba(0,0,0,0)", rounding: sz * 0.1})
      .setPos(posx, posy)
      .draw();

    this.byId[id] = {ms: cadre, type: "cadre"};
    cadre.tag("region", this.get(region).id);

    return cadre;
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
    ////console.log('branch:')
    ////console.log(branch)
    let types = [];
    for (const arr of branch) {
      types.push(this.getType(arr[0]));
    }
    //console.log(types); // eg. ["power", "unknown", "region", "unit"]
    return types;
  }

  closeSelection(ids){
    clearElement(troopDisplay);
    troopDisplay.classList.add('hidden');
    let selectedObjects = ids.map(id=>this.get(id));
    selectedObjects.map(x=>x.unselect());
    this.highObjects.map(o => this.makeUnselectable(o));
    this.highObjects=[];
  }
  displayChoices(idlists, handler) {
    //console.log("***manager:displayChoices",idlists[0]);
    let idlist = idlists.map(l => this.getCombinedId(...l));
    //console.log(idlist);
    let objects = idlist.map(id => this.get(id));

    let type = this.getType(idlist[0]);
    //console.log("objects[0] is.............", objects[0]);
    //console.log("the type is.............", type);
    //console.log("the type is.............", type);
    if (type == "proto") {
      clearElement(troopDisplay);
      this.displayCadrePrototypes(idlist);
    }
    objects.map(o => this.makeSelectable(o, handler));
    objects.map(o=>addIf(o,this.highObjects));
  }
  makeSelectable(ms, handler) {
    //console.log("enabling ", ms.id);
    ms.highlight();
    //console.log(ms.id, " should be highlighted...");
    ms.isEnabled = true;
    ms.clickHandler = handler;
    //console.log("end of makeSelectable", ms.id);
  }
  makeUnselectable(ms, handler) {
    //console.log("disabling ", ms.id);
    ms.unselect();
    ms.unhighlight();
    ms.isEnabled = false;
    ms.clickHandler = null;
  }
  displayCadrePrototypes(ids) {
    var d = troopDisplay;
    troopDisplay.style.display = "grid";
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
  getByType(ids, type) {
    //console.log(ids);
    let res = ids.filter(id => this.byId[id].type == type)[0];
    //console.log("!!!!!!!!!!!!!!!!!!!! ", res);
    return res;
  }
  placeCadre(msCadre, msRegion) {
    //msCadre.setPos(msRegion.x,msRegion.y).draw();
    msCadre.tag("region", msRegion.id);
  }
  // action(command, newId, ids) {
  //   let objects = ids.map(x => this.get(x));
  //   switch (command) {
  //     case "placeCadre":
  //       //look for region
  //       let msRegion = this.get(this.getByType(ids, "region"));
  //       //console.log(msRegion);
  //       //look for proto
  //       let primitiveIds = ids.map(id => this.getIdParts(id)).flat();
  //       let power = this.getByType(primitiveIds, "power");
  //       let unit = this.getByType(primitiveIds, "unit");
  //       //create board cadre from proto
  //       //let msCadre = this.createCadre(newId, power, unit);
  //       // place cadre on region
  //       //this.placeCadre(msCadre, msRegion);
  //   }
  // }
}
