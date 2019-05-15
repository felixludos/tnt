//responsible for obj_type: tile, chip, influence, nation
class AMap {
  constructor(assets) {
    this.assets = assets;
    this.tiles = {};
    this.nations = {};
    this.chips = {};
    this.influences = {};
    this.vpts = {Axis: [], West: [], USSR: []};
    this.calculateStatsPositions();
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
    let sz = this.assets.SZ.chip;
    let pts = this.vpts[faction];
    let pos = pts[0];
    let ms = new MS(id, assets.getUniqueId(id), "mapG")
      .roundedRect({w: sz, h: sz, fill: color})
      .text({txt: text, fill: "white", weight: "bold"})
      .setPos(pos.x + sz / 2, pos.y + sz / 2)
      .draw();
    return ms;
  }
  createInfluence(id, nation, faction, value) {
    unitTestMap('createInfluence',id,nation,faction,value);
    let ms = new MS(id, assets.getUniqueId(id), "mapG");
    this.drawInfluence(ms, nation, faction, value);
    this.influences[nation] = ms;

    let pos = this.assets.nationPositions[nation];

    let x = pos.x;
    let y = pos.y;
    ms.setPos(x, y).draw();

    return ms;
  }
  createTile(id, o) {
    let pos = this.assets.tilePositions[id];
    let sz = this.assets.SZ.tile;
    let ms = new MS(id, assets.getUniqueId(id), "mapG")
      .circle({className: "overlay region", sz: sz})
      .setPos(pos.x, pos.y)
      .draw();
    return ms;
  }
  drawInfluence(ms, nation, faction, level) {
    let imagePath = "/assets/images/" + faction + ".svg";
    let color = this.assets.troopColors[faction];
    //console.log('COLOR:',color)
    let darker = darkerColor(color[0], color[1], color[2]);
    let szBase = this.assets.SZ.influence / 1.5;
    let szRest = this.assets.SZ.influence - szBase;
    let sz = szBase + (szBase * (level - 1)) / 2; //influence grows with level!
    let sz90 = sz * 0.96;
    let sz80 = sz * 0.86;
    let szImage = 40; //sz / 1.5;
    let y = szImage / 6;
    let text = level;
    let fontColor = level == 1 ? "black" : level == 2 ? "red" : darker;
    ms.circle({fill: "yellow", alpha: 1, sz: sz})
      .circle({fill: darker, sz: szImage + 6})
      .circle({fill: color, sz: szImage + 4})
      .image({path: imagePath, w: szImage, h: szImage})
      .text({txt: text, fill: fontColor, fz: szImage - 5, weight: "bold"})
      .circle({className: "overlay", sz: sz});
    //ms.tag("ttext", ttext); //for tooltip, not yet used
    ms.tag("nation", nation);
    ms.tag("faction", faction);
    ms.tag("level", level);
    ms.tag("type", "influence");
    return ms;
  }
  drawNationPositions() {
    for (const id in this.assets.nationPositions) {
      let pos = this.assets.nationPositions[id];
      let sz = this.assets.SZ.influence;
      let ms = new MS(id, assets.getUniqueId(id), "mapG")
        .circle({className: "overlay nation", sz: sz})
        .setPos(pos.x, pos.y)
        .draw();

      this.nations[id] = ms;
    }
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
    let offset = 7;
    let yOffset = text == "P" ? -offset : text == "I" ? 0 : offset;
    let xOffset = text == "P" ? -offset : text == "I" ? 0 : offset;
    pos = {x: pos.x + xOffset, y: pos.y + yOffset};
    let id = prefix + faction;
    if (!(id in this.chips)) {
      this.chips[id] = this.createChip(id, {text: text, prefix: prefix, faction: faction, color: color});
    }
    let ms = this.chips[id];
    //this.setChipText(n);
    //ms.removeFromChildIndex(2);
    //console.log("pos is:", pos);
    ms.setPos(pos.x, pos.y);
  }
  updateInfluence(id, nation, faction, value) {
    unitTestMap('updateInfluence',id,nation,faction,value);

    let ms = this.influences[id];
    ms.show();
    ms.removeFromChildIndex(1);
    this.drawInfluence(ms, nation, faction, value);
  }
  update(data, G) {
    if ("created" in data) {
      for (const id in data.created) {
        let o_new = data.created[id];

        //tiles
        if (o_new.obj_type == "tile") {
          if (id in this.tiles) continue; //tiles created once only, never updated
          this.tiles[id] = this.createTile(id, o_new);
          G[id] = o_new;

        //influences
        } else if (o_new.obj_type == "influence" && "nation" in o_new && "faction" in o_new) {
          if (id in this.influences) {
            let o_old = G[id];
            // property change check! only value should ever change for existing influence!
            let d = propDiff(o_old,o_new);
            if (d.hasChanged) {
              unitTestMap('influence has changed props:',d.summary.toString());
              this.updateInfluence(id, o_new.nation, o_new.faction, o_new.value);
            }
          } else {
            this.influences[id] = this.createInfluence(id, o_new.nation, o_new.faction, o_new.value);
          }
          G[id] = o_new;
        }
      }
    }

    //tracks
    if ("players" in data) {
      for (const faction of this.assets.factionNames) {
        this.setPopulation(faction, data.players[faction].tracks.POP);
        this.setResource(faction, data.players[faction].tracks.RES);
        this.setIndustry(faction, data.players[faction].tracks.IND);
      }
    }
  }
}
