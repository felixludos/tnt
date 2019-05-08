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
const vpPositions = {
  West: {
    1: {x: 1289, y: 63},
    2: {x: 1231, y: 69},
    3: {x: 1171, y: 69},
    4: {x: 1103, y: 57},
    5: {x: 1034, y: 63},
    6: {x: 971, y: 63},
    7: {x: 914, y: 63},
    8: {x: 834, y: 63},
    9: {x: 771, y: 63},
    10: {x: 711, y: 63},
    11: {x: 646, y: 63},
    12: {x: 586, y: 63},
    13: {x: 523, y: 63},
    14: {x: 457, y: 63},
    15: {x: 394, y: 63},
    16: {x: 326, y: 63},
    17: {x: 260, y: 63},
    18: {x: 200, y: 63},
    19: {x: 140, y: 63},
    20: {x: 77, y: 63},
    21: {x: 77, y: 140},
    22: {x: 77, y: 194},
    23: {x: 77, y: 263},
    24: {x: 77, y: 317},
    25: {x: 77, y: 394}
  },
  Axis: {
    1: {x: 594, y: 2106},
    2: {x: 654, y: 2106},
    3: {x: 726, y: 2106},
    4: {x: 777, y: 2106},
    5: {x: 594, y: 2106},
    6: {x: 594, y: 2106},
    7: {x: 594, y: 2106},
    8: {x: 594, y: 2106},
    9: {x: 594, y: 2106},
    10: {x: 594, y: 2106},
    11: {x: 594, y: 2106},
    12: {x: 594, y: 2106},
    13: {x: 594, y: 2106},
    14: {x: 594, y: 2106},
    15: {x: 594, y: 2106},
    16: {x: 594, y: 2106},
    17: {x: 594, y: 2106},
    18: {x: 594, y: 2106},
    19: {x: 594, y: 2106},
    20: {x: 594, y: 2106},
    21: {x: 594, y: 2106},
    22: {x: 594, y: 2106},
    23: {x: 594, y: 2106},
    24: {x: 594, y: 2106},
    25: {x: 594, y: 2106}
  }
};
//#endregion const
//TODO: info weiter
class BoardFactory {
  constructor(board, mapPositions, SZ) {
    this.mapPositions = mapPositions; //{};
    // for (const key in mapPositions) {
    //   if (mapPositions.hasOwnProperty(key)) {
    //     const val = mapPositions[key];
    //     this.mapPositions[key] = val;
    //   }
    // }
    this.nationPositions = null;
    this.board = board;
    this.SZ = SZ;
    this.snailPos = calcSnailPositions(0, 0, this.SZ.cadreDetail, 25);
    this.units = {Axis: {}, West: {}, USSR: {}};
    this.influence = {}; //key:nation,value:ms, needs tags for faction and value;
    this.vpts = {Axis: [], West: [], USSR: []};
    this.calculateStatsPositions();
    //msChips is for all uis used to mark things like population, resources, blockage....
    this.msChips = {};
  }
  addNationPositions(nationsDict) {
    this.nationPositions = nationsDict;
    let res = [];
    for (const nat in nationsDict) {
      let pos = this.getNationPosition(nat);
      //let id = nat.replace(/\s/g,'_');
      
      let ms = new MS(nat, this.board)
        .circle({className: "overlay nation hible selectable", sz: this.SZ.influence})
        .setPos(pos.x, pos.y)
        .draw();
      ms.tag("type", "nation");
      res.push(ms);
    }
    return res;
  }
  calcStartPos(tile, faction) {
    let pFaction = this.SZ["p" + faction];
    let pTile = this.getPosition(tile);
    return {x: pTile.x + pFaction.x, y: pTile.y + pFaction.y};
  }
  calculateStatsPositions() {
    let arr = [];
    let x = 580;
    let y = 2120;
    for (let i = 0; i < 25; i++) {
      arr.push({x: x, y: y});
      x += 66;
    }
    this.vpts.Axis = arr;

    arr = [];
    x = 1310;
    y = 76;
    for (let i = 0; i < 20; i++) {
      arr.push({x: x, y: y});
      x -= 66;
    }
    for (let i = 20; i < 25; i++) {
      arr.push({x: x, y: y});
      y += 66;
    }
    this.vpts.West = arr;

    arr = [];
    x = 2210;
    y = 76;
    for (let i = 0; i < 18; i++) {
      arr.push({x: x, y: y});
      x += 66;
    }
    for (let i = 18; i < 25; i++) {
      arr.push({x: x, y: y});
      y += 66;
    }
    this.vpts.USSR = arr;
  }
  createChip(id, {text = "", filename = "", prefix = "", faction = "", color = "beige"} = {}) {
    //id is also the filename
    let sz = this.SZ.chip;
    let pts = this.vpts[faction];
    let pos = pts[0];
    let ms = new MS(id, this.board)
      .roundedRect({w: sz, h: sz, fill: color})
      .text({txt: text, fill: "white", weight: "bold"})
      .setPos(pos.x + sz / 2, pos.y + sz / 2)
      .draw();
    return ms;
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
    return {action_card: actionDeck, investment_card: investmentDeck};
  }
  createHiddenUnit(id, faction, o) {
    //console.log('create HIDDEN unit',id,typeof(id),'.........');
    let color = troopColors[o.nationality];
    let darker = darkerColor(color[0], color[1], color[2]);
    //console.log(darker);
    let sz = this.SZ.sumCadre;
    let sz80 = sz * 0.86;
    let szImage = sz / 1.5;
    let y = szImage / 6;
    //console.log(id)
    let ms = new MS(id, this.board, true)
      .roundedRect({w: sz, h: sz, fill: color, rounding: sz * 0.1})
      .roundedRect({w: sz80, h: sz80, fill: darker, rounding: sz * 0.1})
      .text({txt: 1, fz: sz / 2, fill: "white"})
      .roundedRect({className: "unit hible selectable", w: sz, h: sz, fill: darker, rounding: sz * 0.1});
    ms.tag("type", "unit");
    ms.tag("count", 1);
    ms.tag('faction',faction);
    ms.tag('tile',o.tile)

    this.placeHiddenUnit(ms, faction, o.tile);

    return ms;
  }
  createInfluence(id, nation, faction, level) {
    //level can be 1,2,3
    //let fnamePrefix=level<3?'influence':'control';
    //console.log('createInfluence',id,nation,faction,level)
    let ms = new MS(id, this.board, true);
    this.drawInfluence(ms, nation, faction, level);
    this.influence[nation] = ms;

    //console.log('nationPositions',this.nationPositions)

    let pos = this.getNationPosition(nation);

    let x = pos.x;
    let y = pos.y;
    ms.setPos(x, y).draw();

    return ms;
  }
  createTile(id, ttext) {
    //console.log(this.mapPositions, id);
    let pos = this.getPosition(id);
    //console.log(pos);
    //console.log("createRegion id=", id, "pos=", pos, "ttext=", ttext, this.SZ.region);
    let msRegion = new MS(id, this.board)
      .circle({className: "overlay region hible selectable", sz: this.SZ.region})
      .setPos(pos.x, pos.y)
      .draw();
    msRegion.tag("ttext", ttext); //for tooltip
    msRegion.tag("units", {Axis: [], West: [], USSR: []});
    msRegion.tag("type", "tile");
    return msRegion;
  }
  createUnit(id, faction, go, ttext) {
    //console.log('create unit',id,faction,go,ttext,'.........');
    let nationality = go.nationality;
    let type = go.type;
    let tile = go.tile;
    let imagePath = "/_front/assets/images/" + type + ".svg";
    let color = troopColors[nationality];
    let darker = darkerColor(color[0], color[1], color[2]);
    let sz = this.SZ.cadreDetail;
    let sz90 = sz * 0.96;
    let sz80 = sz * 0.86;
    let szImage = sz / 1.5;
    let y = szImage / 6;
    let ms = new MS(id, this.board, true)
      .roundedRect({w: sz, h: sz, fill: color, rounding: sz * 0.1})
      //.roundedRect({w: sz90, h: sz90, fill: color, rounding: sz * 0.1})
      .roundedRect({w: sz80, h: sz80, fill: darker, rounding: sz * 0.1})
      .image({path: imagePath, y: y, w: szImage, h: szImage})
      .roundedRect({className: "unit hible selectable", w: sz, h: sz, fill: darker, rounding: sz * 0.1});
    ms.tag("ttext", ttext); //for tooltip, not yet used
    ms.tag("type", "unit");
    ms.tag("faction", faction);
    ms.tag("nationality", nationality);
    this.placeUnit(ms, tile);
    return ms;
  }
  drawInfluence(ms, nation, faction, level) {
    let imagePath = "/_front/assets/images/" + faction + ".svg";
    let color = troopColors[faction];
    //console.log('COLOR:',color)
    let darker = darkerColor(color[0], color[1], color[2]);
    let szBase = this.SZ.influence/1.5;
    let szRest = this.SZ.influence - szBase;
    let sz = szBase + szBase * (level-1) / 2; //influence grows with level!
    let sz90 = sz * 0.96;
    let sz80 = sz * 0.86;
    let szImage = 30; //sz / 1.5;
    let y = szImage / 6;
    let text = level;
    let fontColor = level == 1 ? "black" : level == 2 ? "red" : darker;
    ms.circle({fill: 'yellow', alpha: 1, sz: sz})
      .circle({fill: darker, sz: szImage + 6})
      .circle({fill: color, sz: szImage + 4})
      .image({path: imagePath, w: szImage, h: szImage})
      .text({txt: text, fill: fontColor, fz: szImage - 5, weight: "bold"})
      .circle({className: "overlay", sz: sz});
    //ms.tag("ttext", ttext); //for tooltip, not yet used
    ms.tag("nation", nation);
    ms.tag("faction", faction);
    ms.tag("level", level);
    ms.tag("type","influence");
    return ms;
  }
  getPosition(idTile) {
    let idPos = replaceAll(idTile, "_", " ");
    if (!(idPos in this.mapPositions)) {
      //console.log("canNOT find position for", idPos);
      return null;
    }
    return this.mapPositions[idPos];
  }
  getNationPosition(idTile) {
    let idPos = replaceAll(idTile, "_", " ");
    if (!(idPos in this.nationPositions)) {
      console.log("canNOT find position for nation", idPos);
      return null;
    }
    return this.nationPositions[idPos];
  }
  placeUnit(msUnit, tile) {
    let faction = msUnit.getTag("faction");
    let iUnit = tile in this.units[faction] ? this.units[faction][tile].length : 0;
    let pStart = this.calcStartPos(tile, faction);
    //console.log('index of this unit',iUnit);
    let pSnailOffset = this.snailPos[iUnit];
    let x = pStart.x + pSnailOffset.x;
    let y = pStart.y + pSnailOffset.y;
    msUnit.setPos(x, y).draw();

    //add unit id to units dictionary
    let id = msUnit.id;
    if (!(tile in this.units[faction])) {
      this.units[faction][tile] = [id];
    } else {
      this.units[faction][tile].push(id);
    }
    msUnit.tag("tile", tile);
  }
  placeHiddenUnit(msHidden, faction, tile) {
    let p = this.calcStartPos(tile, faction);
    msHidden.setPos(p.x, p.y).draw();
  }
  removeUnitFrom(ms, tile) {
    //find unit on tile
    let faction = ms.getTag("faction");
    this.units[faction][tile] = without(this.units[faction][tile], ms.id);
  }
  removeInfluence(nation) {
    if (nation in this.influence) {
      let ms = this.influence[nation];
      ms.hide();
    }
  }
  reset(){
    this.units = {Axis: {}, West: {}, USSR: {}};
    this.influence = {}; //key:nation,value:ms, needs tags for faction and value;
  }
  setPopulation(faction, n) {
    this.setChip("pop", "P", faction, n, "sienna");
  }
  setIndustry(faction, n) {
    this.setChip("ind", "I", faction, n, "red");
  }
  setResource(faction, n) {
    this.setChip("res", "R", faction, n, "green");
  }
  setChip(prefix, text, faction, n, color) {
    let pts = this.vpts[faction];
    let pos = pts[n - 1];
    let id = prefix + faction;
    if (!(id in this.msChips)) {
      this.msChips[id] = this.createChip(id, {text: text, prefix: prefix, faction: faction, color: color});
    }
    let ms = this.msChips[id];
    //this.setChipText(n);
    //ms.removeFromChildIndex(2);
    //console.log("pos is:", pos);
    ms.setPos(pos.x, pos.y);
  }
  updateInfluence(id, nation, faction, level) { //this assumes there is always only influence of <=1 faction on 1 nation
    if (level == 0) {
      this.removeInfluence(nation);
    } else {
      if (!(nation in this.influence)) {
        console.log("ERROR!!!! updating non-existent influence!!!!");
      }
      let ms = this.influence[nation];
      ms.show();
      ms.removeFromChildIndex(1);
      //console.log('removing all children from ms.elem',ms);
      this.drawInfluence(ms, nation, faction, level);
      //entire ms is redrawn!
    }
  }
  updateUnitCounter(o, ms, inc) {
    //console.log('updateUnitCounter')
    let n = ms.getTag("count");
    n += inc;
    let color = troopColors[o.nationality];
    let darker = darkerColor(color[0], color[1], color[2]);
    let sz = this.SZ.sumCadre;
    ms.removeFromChildIndex(3);
    ms.text({txt: n, fz: sz / 2, fill: "white"}).roundedRect({
      className: "unit hible selectable",
      w: sz,
      h: sz,
      fill: darker,
      rounding: sz * 0.1
    });
    ms.tag("count", n);
  }
  updateCv(msUnit, cv) {
    //console.log(cv,typeof(cv))
    //plaziere 1 circle foreach  #
    //muss alte punkte wegnehmen!!! falls welche hat!
    msUnit.removeFromChildIndex(5);
    //msUnit.circle({sz:20,fill:'white'});
    let sz = this.SZ.cadreDetail;
    let dx = sz / (cv + 1);
    let xStart = -sz / 2;
    let y = -sz / 3.2;
    let diam = Math.min(dx / 1.5, sz / 5);
    //console.log(dx,y)
    let x = dx + xStart;
    for (let i = 0; i < cv; i++) {
      msUnit.circle({sz: diam, x: x, y: y, fill: "white"});
      x += dx;
    }

    msUnit.tag("cv", cv);
  }
}
