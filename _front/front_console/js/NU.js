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
  chip: 40,
  influence: 100
};

//#endregion const
class NU {
  constructor(assetMan) {
    this.assetMan = assetMan;
    this.U = {uis: {}}; //map game object id to everything needed for ui
    this.id2uid = {}; //map game object ids to ms.elem ids (ms.id will always by game obj id!)
    this.uid2id = {};
    this.uniqueIdCounter = 0;
    this.clearTemp();
  }
  addElement(ms, id, type) {
    if (!(type in this.U.uis)){this.U.uis[type]={};}
    this.U.uis[type][id] = ms;
    ms.tag("type", type);
  }
  clearTemp() {
    this.U.create = {};
    this.U.remove = {};
  }
  getUniqueId(id) {
    let uid = this.uniqueIdCounter + "_" + id;
    this.uniqueIdCounter += 1;
    this.uid2id[uid] = id;
    this.id2uid[id] = uid;
    return uid;
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
  createTile(id) {
    let pos = this.assetMan.tilePositions[id];
    let ms = new MS(id, this.getUniqueId(id), "mapG")
      .circle({className: "overlay region", sz: SZ.region})
      .setPos(pos.x, pos.y)
      .draw();
    return ms;
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
}
