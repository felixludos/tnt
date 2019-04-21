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
//#endregion const used by Manager only
class BoardFactory {
  constructor(board, mapPositions,SZ) {
    this.mapPositions = mapPositions;
    this.board = board;
    this.SZ = SZ;
    this.snailPos = calcSnailPositions(0, 0, this.SZ.cadreDetail, 25);
  }
  getPosition(idTile) {
    let idPos = replaceAll(idTile, "_", " ");
    if (!(idPos in this.mapPositions)) {
      //console.log("canNOT find position for", idPos);
      return null;
    }
    return this.mapPositions[idPos];
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
  createHiddenUnit(id,o){
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
      .text({txt:1,fz:sz/2,fill:'white'})
      .roundedRect({className: "unit hible selectable", w: sz, h: sz, fill:darker, rounding: sz * 0.1});
    ms.tag("type", "unit");
    ms.tag('count',1);

    return ms;


  }
  updateUnitCounter(o,ms,inc){
    //console.log('updateUnitCounter')
    let n=ms.getTag('count');
    n+=inc;
    let color = troopColors[o.nationality];
    let darker = darkerColor(color[0], color[1], color[2]);
    let sz = this.SZ.sumCadre;
    ms.removeFromChildIndex(3);
    ms.text({txt:n,fz:sz/2,fill:'white'})
    .roundedRect({className: "unit hible selectable", w: sz, h: sz, fill:darker, rounding: sz * 0.1});
    ms.tag('count',n);
  }
  createUnit(id, nationality, type, ttext) {
    //console.log('create unit',id,typeof(id),type,'.........');
    let imagePath = "/_front/assets/images/" + type + ".svg";
    let color = troopColors[nationality];
    let darker = darkerColor(color[0], color[1], color[2]);
    //console.log(darker);
    let sz = this.SZ.cadreDetail;
    let sz90 = sz * 0.96;
    let sz80 = sz * 0.86;
    let szImage = sz / 1.5;
    let y = szImage / 6;
    //console.log(id)
    let ms = new MS(id, this.board, true)
      .roundedRect({w: sz, h: sz, fill: color, rounding: sz * 0.1})
      //.roundedRect({w: sz90, h: sz90, fill: color, rounding: sz * 0.1})
      .roundedRect({w: sz80, h: sz80, fill: darker, rounding: sz * 0.1})
      .image({path: imagePath, y: y, w: szImage, h: szImage})
      .roundedRect({className: "unit hible selectable", w: sz, h: sz, fill:darker, rounding: sz * 0.1});
    // let ms = new MS(id, this.board)
    //   .roundedRect({w: sz, h: sz, fill: darker, rounding: sz * 0.1})
    //   .roundedRect({w: sz90, h: sz90, fill: color, rounding: sz * 0.1})
    //   .roundedRect({w: sz80, h: sz80, fill: darker, rounding: sz * 0.1})
    //   .image({path: imagePath, y: y, w: szImage, h: szImage})
    //   .roundedRect({className: "unit hible selectable", w: sz, h: sz, fill:'green', rounding: sz * 0.1});
    //ms.elem.
    ms.tag("ttext", ttext); //for tooltip
    ms.tag("type", "unit");

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
    return {action_card:actionDeck,investment_card:investmentDeck};
  }

  calcStartPos(tile, faction) {
    let pFaction = this.SZ["p" + faction];
    let pTile = this.getPosition(tile);
    return {x: pTile.x + pFaction.x, y: pTile.y + pFaction.y};
  }
  getUnitCount(msTile, faction) {
    //console.log(msTile)
    let n = msTile.getTag("units")[faction].length;
    //console.log('getUnitCount',n);
    return n;
  }
  placeUnit(msUnit, tile, msTile, faction) {
    let fromTile = msUnit.getTag("tile");
    if (fromTile) {
      if (fromTile != tile) {
        //remove that unit from other tile
        //update other tile's 'units' tag for ALL FACTIONS!!!
        //muesste doch eh automatisch sein da nur 1 ui fuer each tile?!?
      }else {
        //this unit is already on that tile, just return
        return;
      }
    }
    msUnit.tag('tile',tile);
    let pStart = this.calcStartPos(tile, faction);
    let iUnit = this.getUnitCount(msTile, faction);
    //console.log('index of this unit',iUnit);
    let pSnailOffset = this.snailPos[iUnit];
    let x = pStart.x + pSnailOffset.x;
    let y = pStart.y + pSnailOffset.y;
    msUnit.setPos(x, y).draw();

    //console.log('msTile',msTile)
    let unitDict = msTile.getTag("units");
    unitDict[faction].push(msUnit.id);

    //console.log("placeUnit", msUnit, msTile);
    //console.log(msUnit,msTile)
  }
  placeHiddenUnit(msHidden,faction,tile){
    let p = this.calcStartPos(tile, faction);
    msHidden.setPos(p.x, p.y).draw();
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

    msUnit.tag('cv',cv);
  }
}
