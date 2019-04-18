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
  pAxis: {x: 0, y: 20}, // this is where on the region placement of cadre is started
  pWest: {x: -50, y: -30},
  pUSSR: {x: +50, y: -30},
  cadrePrototype: 60,
  sumCadre: 60,
  cadreDetail: 44,
  cardWidth: 100,
  cardHeight: 150
};
//#endregion const used by Manager only
class BoardFactory {
  constructor(board, mapPositions) {
    this.mapPositions = mapPositions;
    this.board = board;
    this.snailPos = calcSnailPositions(0, 0, SZ.cadreDetail, 25);
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
    //console.log("createRegion id=", id, "pos=", pos, "ttext=", ttext, SZ.region);
    let msRegion = new MS(id, this.board)
      .circle({className: "overlay region hible selectable", sz: SZ.region})
      .setPos(pos.x, pos.y)
      .draw();
    msRegion.tag("ttext", ttext); //for tooltip
    msRegion.tag("units", {Axis: [], West: [], USSR: []});
    msRegion.tag("type", "tile");
    return msRegion;
  }
  createUnit(id, nationality, type, ttext) {
    let imagePath = "/_front/assets/images/" + type + ".svg";
    let color = troopColors[nationality];
    let darker = darkerColor(color[0], color[1], color[2]);
    //console.log(darker);
    let sz = SZ.cadreDetail;
    let sz90 = sz * 0.96;
    let sz80 = sz * 0.86;
    let szImage = sz / 1.5;
    let y = szImage / 6;
    let ms = new MS(id, this.board)
      .roundedRect({w: sz, h: sz, fill: darker, rounding: sz * 0.1})
      .roundedRect({w: sz90, h: sz90, fill: color, rounding: sz * 0.1})
      .roundedRect({w: sz80, h: sz80, fill: darker, rounding: sz * 0.1})
      //.rect({w: szImage, h: szImage, fill: darker})
      .image({path: imagePath, y: y, w: szImage, h: szImage})
      .roundedRect({className: "overlay region hible selectable", w: sz, h: sz, rounding: sz * 0.1});
    ms.tag("ttext", ttext); //for tooltip
    ms.tag("type", "unit");

    return ms;
  }
  calcStartPos(tile, faction) {
    let pFaction = SZ["p" + faction];
    let pTile = this.getPosition(tile);
    return {x: pTile.x + pFaction.x, y: pTile.y + pFaction.y};
  }
  getUnitCount(msTile, faction) {
    //console.log(msTile)
    let n = msTile.getTag("units")[faction].length;
    console.log('getUnitCount',n);
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
    console.log('index of this unit',iUnit);
    let pSnailOffset = this.snailPos[iUnit];
    let x = pStart.x + pSnailOffset.x;
    let y = pStart.y + pSnailOffset.y;
    msUnit.setPos(x, y).draw();

    console.log('msTile',msTile)
    let unitDict = msTile.getTag("units");
    unitDict[faction].push(msUnit.id);

    console.log("placeUnit", msUnit, msTile);
    //console.log(msUnit,msTile)
  }
  updateCv(msUnit, cv) {
    //console.log(cv,typeof(cv))
    //plaziere 1 circle foreach  #
    //muss alte punkte wegnehmen!!! falls welche hat!
    msUnit.removeFromChildIndex(5);
    //msUnit.circle({sz:20,fill:'white'});
    let sz = SZ.cadreDetail;
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
    // let ms=msUnit;
    // let x=ms.x;let y=ms.y;let w=ms.bounds.w;let h=ms.bounds.h;
    // y=y-w/2+w/8;
    // let d=w/cv;
    // w=w/14;
    // let color='white';
    // for (let i = 0; i < cv; i++) {
    //   ms.circle({sz:20,x:i*d,y:y,fill:color});
    //   console.log('circle')
    // }
    // console.log(ms)
    // ms.redraw();
  }
}
