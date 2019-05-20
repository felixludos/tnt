class AUnits {
  constructor(assets) {
    this.assets = assets;
    this.SZ = this.assets.SZ;
    this.snailPos = calcSnailPositions(0, 0, this.SZ.cadreDetail, 25);

    this.units = {Axis: {}, West: {}, USSR: {}}; //idlist by [owner][tile]

    this.uis = {}; //id:{ms:ms,o:o} //including hiddenUnits, o={obj_type:hidden_unit}

    this.hiddenUnits = {Axis: {}, West: {}, USSR: {}}; //id by [owner][tile]

    this.previousPlayer = null;
  }
  addUnit(id, ms, o) {
    //add unit id to units dictionary
    if (id in this.uis) {
      unitTestUnits("PROBLEM: adding existing unit!!!", id);
      alert("PROBLEM: adding existing unit!!!", id);
    }
    let tile = ms.getTag("tile");
    let owner = ms.getTag("owner");
    if (!(tile in this.units[owner])) {
      this.units[owner][tile] = [id];
    } else {
      addIf(id, this.units[owner][tile]);
    }
    this.uis[id] = {o: jsCopy(o), ms: ms};
    unitTestUnits("added", id, ms, o, owner, tile);
  }
  addHiddenUnit(msHidden) {
    console.assert(msHidden != null, "addHiddenUnit ms == NULL!!!!!!!!!!");
    let idHidden = msHidden.id;
    if (idHidden in this.uis) {
      unitTestUnits("addHiddenUnit ERROR!!!!, already have hidden unit", idHidden);
    }
    let tile = msHidden.getTag("tile");
    let owner = msHidden.getTag("owner");
    this.hiddenUnits[owner][tile] = idHidden;
    let o = {obj_type: "hidden_unit", owner: owner, tile: tile, count: 1};
    this.uis[idHidden] = {o: o, ms: msHidden};
    unitTestUnits("addHiddenUnit", idHidden, msHidden, o, owner, tile);
  }
  moveUnit(id, o_old, o_new) {
    if (!(id in this.uis)) {
      unitTestUnits("PROBLEM: moveUnit", id, " NOT in uis!");
      alert();
    }
    removeUnit(id);
    let ms = this.uis[id].ms;
    let owner = ms.getTag("owner");
    let tile_old = o_old.tile;
    let tile_new = o_new.tile;

    addUnit(id, ms, o_new);
    this.placeUnit(ms, tile_new);

    this.updateUnitCounter(owner, tile_old);

    let idHiddenNew = this.getHiddenId(owner, tile_new);
    if (!(idHiddenNew in this.uis)) {
      let msHidden_new = createHiddenUnit(idHiddenNew, owner, tile_new);
      this.addHiddenUnit(msHidden_new);
      unitTestUnits("moveUnit: created hidden unit", idHiddenNew);
    } else {
      this.updateUnitCounter(owner, tile_new);
    }
  }
  calcStartPos(tile, faction) {
    let pFaction = this.SZ["p" + faction];
    let pTile = this.getPosition(tile);
    return {x: pTile.x + pFaction.x, y: pTile.y + pFaction.y};
  }
  createHiddenUnit(id, owner, tile) {
    unitTestUnits("create HIDDEN unit", id, owner, tile, ".........");
    let color = this.assets.troopColors[owner];
    let darker = darkerColor(color[0], color[1], color[2]);
    let sz = this.SZ.sumCadre;
    let sz80 = sz * 0.86;
    let szImage = sz / 1.5;
    let y = szImage / 6;
    let ms = new MS(id, id, "mapG")
      .roundedRect({w: sz, h: sz, fill: color, rounding: sz * 0.1})
      .roundedRect({w: sz80, h: sz80, fill: darker, rounding: sz * 0.1})
      .text({txt: 1, fz: sz / 2, fill: "white"})
      .roundedRect({className: "unit overlay", w: sz, h: sz, fill: darker, rounding: sz * 0.1});
    ms.tag("type", "hidden_unit");
    ms.tag("count", 1);
    ms.tag("owner", owner);
    ms.tag("tile", tile);

    this.placeHiddenUnit(ms, owner, tile);
    this.addHiddenUnit(ms);

    return ms;
  }
  createUnit(id, o, player, visibleForAll = false) {
    let nationality = o.nationality;
    let owner = getUnitOwner(nationality);
    let type = o.type;

    if (type === undefined) {
      unitTestUnits("CANNOT CREATE UNIT BECAUSE TYPE UNKNOWN!!!", player, owner);
      unitTestUnits(";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;");
      //unitTestUnits("createUnit", id, owner, o.tile, o.type, player);
    } else {
      unitTestUnits("create unit", id, o, "...player is", player);
      let imagePath = "/a/assets/images/" + type + ".svg";
      let color = this.assets.troopColors[nationality];
      let darker = darkerColor(color[0], color[1], color[2]);
      let sz = this.SZ.cadreDetail;
      let sz80 = sz * 0.86;
      let szImage = sz / 1.5;
      let y = szImage / 6;
      let ms = new MS(id, id, "mapG")
        .roundedRect({w: sz, h: sz, fill: color, rounding: sz * 0.1})
        .roundedRect({w: sz80, h: sz80, fill: darker, rounding: sz * 0.1})
        .image({path: imagePath, y: y, w: szImage, h: szImage})
        .roundedRect({className: "unit overlay", w: sz, h: sz, fill: darker, rounding: sz * 0.1});
      ms.tag("type", "unit");
      ms.tag("owner", owner);
      ms.tag("nationality", nationality);

      this.placeUnit(ms, o.tile);
      this.addUnit(id, ms, o);
      if ("cv" in o) {
        this.updateCv(ms, o.cv);
      }
    }

    let idHidden = this.getHiddenId(owner, o.tile);
    if (!(idHidden in this.uis)) {
      this.createHiddenUnit(idHidden, owner, o.tile);
    } else {
      unitTestUnits("hidden unit already there!!!!!!!!!!!!!", idHidden, owner, o.tile);
      this.updateUnitCounter(owner, o.tile);
    }

    this.updateVisibility(id, o, player);
  }
  getHiddenId(faction, tile) {
    return comp_(faction, tile);
  }
  getPosition(idTile) {
    let pos = this.assets.tilePositions[idTile];
    //unitTestUnits("getPosition", pos);
    return pos;
  }
  placeUnit(msUnit, tile) {
    let faction = msUnit.getTag("owner");
    let iUnit = tile in this.units[faction] ? this.units[faction][tile].length : 0;
    let pStart = this.calcStartPos(tile, faction);
    let pSnailOffset = this.snailPos[iUnit];
    let x = pStart.x + pSnailOffset.x;
    let y = pStart.y + pSnailOffset.y;
    unitTestUnits("index of this unit", iUnit, "pos", x, y);
    msUnit.setPos(x, y).draw();
    msUnit.tag("tile", tile);
  }
  placeHiddenUnit(msHidden, faction, tile) {
    let p = this.calcStartPos(tile, faction);
    msHidden.setPos(p.x, p.y).draw();
  }
  removeUnit(id) {
    //just remove from units of current owner,tile
    let ms = this.uis[id].ms;
    let owner = ms.getTag("owner");
    let tile = ms.getTag("tile");
    removeInPlace(this.units[owner][tile], id);
  }
  updateUnitCounter(owner, tile) {
    unitTestUnits("updateUnitCounter", owner, tile);
    if (!(tile in this.units[owner])) {
      unitTestUnits("nothing to update because no unit of", owner, "has been created!");
      return;
    }
    let n = this.units[owner][tile].length;
    let idHidden = this.getHiddenId(owner, tile);
    let msHidden = this.uis[idHidden].ms;
    let oHidden = this.uis[idHidden].o;
    oHidden.count = n;

    let color = this.assets.troopColors[owner];
    let darker = darkerColor(color[0], color[1], color[2]);
    let sz = this.SZ.sumCadre;
    msHidden.removeFromChildIndex(3);
    msHidden.text({txt: n, fz: sz / 2, fill: "white"}).roundedRect({
      className: "unit overlay",
      w: sz,
      h: sz,
      fill: darker,
      rounding: sz * 0.1
    });
    msHidden.tag("count", n);
    unitTestUnits("updateUnitCounter", owner, tile, "to", n, oHidden, msHidden);

    //return n;
  }
  updateCv(ms, cv) {
    ms.removeFromChildIndex(5);
    let sz = this.SZ.cadreDetail;
    let dx = sz / (cv + 1);
    let xStart = -sz / 2;
    let y = -sz / 3.2;
    let diam = Math.min(dx / 1.5, sz / 5);
    let x = dx + xStart;
    for (let i = 0; i < cv; i++) {
      ms.circle({sz: diam, x: x, y: y, fill: "white"});
      x += dx;
    }

    ms.tag("cv", cv);
    this.uis[ms.id].o.cv = cv;
    unitTestUnits("updateCv", ms.id, ms.getTag("owner"), ms.getTag("tile"), "to", cv);
  }
  updateVisibility(id, o, player) {
    let ms = id in this.uis ? this.uis[id].ms : null;
    unitTestUnits("updateVisibility", id, o, player, ms);
    let tile = o.tile;
    let owner = getUnitOwner(o.nationality);
    let idHidden = this.getHiddenId(owner, tile);
    let msHidden = this.uis[idHidden].ms;
    if (isVisibleToPlayer(o, player)) {
      if (ms) ms.show();
      else unitTestUnits("SERIOUS PROBLEM!!!!!!!! no unit but visible!", o);
      msHidden.hide();
    } else {
      if (ms) ms.hide();
      msHidden.show();
    }
  }
  update(data, G, player, visibleForAll = false) {
    if ("created" in data) {
      for (const id in data.created) {
        let o_new = data.created[id];
        if (o_new.obj_type != "unit") continue;

        if (!(id in G)) {
          this.createUnit(id, o_new, player, visibleForAll);
          if (id in this.uis) {
            G[id] = o_new;
          } else {
            unitTestUnits(":::::::UNIT WAS NOT CREATED!!!");
          }
        } else {
          //this unit has already been created,
          //check for propDiff
          let o_old = G[id];
          console.assert(id in this.uis, "unit in G but not in uis", id, o_new);
          let d = propDiff(o_old, o_new);
          if (d.hasChanged) {
            //unitTestUnits('________________________');
            //unitTestUnits("changes:", d.summary.toString()); //type,cv, WHY TYPE???????
            if (d.summary.includes("type")) {
              let owner = getUnitOwner(o_old.nationality);
              console.assert(player != owner, "type, cv change for VISIBLE unit!");
              //unitTestUnits("type was " + o_old.type + " new=" + o_new.type);
            } else if (d.summary.includes("cv")) {
              unitTestUnits("cv change!!!!! " + o_old.cv + " " + o_new.cv);
              this.updateCv(this.uis[id].ms, o_new.cv);
              G[id] = o_new;
            } else if (d.summary.includes("tile")) {
              //move unit!!!
              alert("tile change!");
            }
          }
        }
      }
    }

    if (!visibleForAll) {
      //update visibility!
      unitTestUnits("...visibility is updated for all units!");
      for (const id in this.uis) {
        const ms = this.uis[id].ms;
        const owner = ms.getTag("owner");
        const o = this.uis[id].o;
        const isHidden = o.obj_type == "hidden_unit";
        if (owner == player) {
          if (isHidden) {
            ms.hide();
          } else {
            ms.show();
          }
        } else {
          if (isHidden) {
            ms.show();
          } else {
            ms.hide();
          }
        }
      }
      unitTestUnits("player", player, "previousPlayer:", this.previousPlayer);
    }
    this.previousPlayer = player;

    //show player's units!
    // if (player != this.previousPlayer) {
    //   for (const tile in this.units[player]) {
    //     let unitList = this.units[player][tile];

    //     for (const idUnit of unitList) {
    //       this.uis[idUnit].ms.show();
    //     }
    //     let idHidden = this.getHiddenId(player, tile);
    //     this.uis[idHidden].ms.hide();
    //   }
    //   this.previousPlayer = player;
    // }
  }
}
