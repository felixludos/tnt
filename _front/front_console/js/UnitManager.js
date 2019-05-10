class UnitManager {
  constructor(assetMan) {
    this.assetMan = assetMan;
    this.SZ = assetMan.SZ;
    this.snailPos = calcSnailPositions(0, 0, this.SZ.cadreDetail, 25);

    this.units = {Axis: {}, West: {}, USSR: {}}; //id by owner+tile

    this.uis = {}; //ms by id

    this.hiddenUnits = {Axis: {}, West: {}, USSR: {}}; //ms by owner+tile

    this.previousPlayer = null;

    //this.justUpdated = [];

  }
  addToUnits(id, faction, tile) {
    //add unit id to units dictionary
    if (!(tile in this.units[faction])) {
      this.units[faction][tile] = [id];
    } else {
      addIf(id,this.units[faction][tile]);
    }
  }
  calcStartPos(tile, faction) {
    let pFaction = this.SZ["p" + faction];
    let pTile = this.getPosition(tile);
    return {x: pTile.x + pFaction.x, y: pTile.y + pFaction.y};
  }
  createHiddenUnit(id, faction, tile) {
    //console.log('create HIDDEN unit',id,faction,tile,'.........');
    let color = this.assetMan.troopColors[faction];
    let darker = darkerColor(color[0], color[1], color[2]);
    //console.log(darker);
    let sz = this.SZ.sumCadre;
    let sz80 = sz * 0.86;
    let szImage = sz / 1.5;
    let y = szImage / 6;
    //console.log(id)
    let ms = new MS(id, id, "mapG")
      .roundedRect({w: sz, h: sz, fill: color, rounding: sz * 0.1})
      .roundedRect({w: sz80, h: sz80, fill: darker, rounding: sz * 0.1})
      .text({txt: 1, fz: sz / 2, fill: "white"})
      .roundedRect({className: "unit overlay", w: sz, h: sz, fill: darker, rounding: sz * 0.1});
    ms.tag("type", "unitHidden");
    ms.tag("count", 1);
    ms.tag("faction", faction);
    ms.tag("tile", tile);

    this.placeHiddenUnit(ms, faction, tile);

    return ms;
  }
  createUnit(id, owner, o) {
    //console.log('create unit',id,faction,go,ttext,'.........');
    let nationality = o.nationality;
    let type = o.type;
    let imagePath = "/assets/images/" + type + ".svg";
    let color = this.assetMan.troopColors[nationality];
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
    return ms;
  }
  getHiddenId(faction, tile) {
    return comp_(faction, tile);
  }
  getPosition(idTile) {
    let pos = this.assetMan.tilePositions[idTile];
    return pos;
  }
  placeUnit(msUnit, tile) {
    let faction = msUnit.getTag("owner");
    let iUnit = tile in this.units[faction] ? this.units[faction][tile].length : 0;
    let pStart = this.calcStartPos(tile, faction);
    //console.log('index of this unit',iUnit);
    let pSnailOffset = this.snailPos[iUnit];
    let x = pStart.x + pSnailOffset.x;
    let y = pStart.y + pSnailOffset.y;
    msUnit.setPos(x, y).draw();
    msUnit.tag("tile", tile);
  }
  placeHiddenUnit(msHidden, faction, tile) {
    let p = this.calcStartPos(tile, faction);
    msHidden.setPos(p.x, p.y).draw();
  }
  // removeUnitFrom(ms, tile) {
  //   //find unit on tile
  //   let faction = ms.getTag("faction");
  //   this.units[faction][tile] = without(this.units[faction][tile], ms.id);
  // }
  updateUnitCounter(owner, tile) {
    //console.log('updateUnitCounter')
    let n = this.units[owner][tile].length;
    //let idHidden = this.getHiddenId(owner, tile);
    let ms = this.hiddenUnits[owner][tile];
    let color = this.assetMan.troopColors[owner];
    let darker = darkerColor(color[0], color[1], color[2]);
    let sz = this.SZ.sumCadre;
    ms.removeFromChildIndex(3);
    ms.text({txt: n, fz: sz / 2, fill: "white"}).roundedRect({
      className: "unit overlay",
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

  drawUnits(player) {
    //only handles visibility
    // if (player == this.previousPlayer){
    //   // only redraw updated units
    //   //collect during update phase, empty after drawing
    //   for (const obj of this.justUpdated) {
    //     let ms = obj.ms;
    //     let msHidden = obj.msHidden;
    //     let o = obj.o;
    //     let vis = getVisibleSet(o);
    //     if (vis.includes(player)){ if (ms)ms.show();msHidden.hide(); }
    //     else{ if (ms)ms.hide();msHidden.show();}
    //   }
    //   this.justUpdated = [];
    //   return;
    // }
    for (const pl of ['Axis','West','USSR']) {
      let ids = Object.values(this.units[pl]).flat();
      let hiddenMs = Object.values(this.hiddenUnits[pl]);

      //console.log(pl,'indiv',ids.toString())
      //console.log(pl,'hidden:',hiddenMs.map(x=>x.id).toString())
      //console.log( Object.keys(this.uis).toString())
      if (pl == player){
        ids.map(x=> this.uis[x].show());
        hiddenMs.map(x=>x.hide());
      }else if (pl == this.previousPlayer){
        ids.map(x=> this.uis[x].hide());
        hiddenMs.map(x=>x.show());
      }
    }
    //if (player == 'West') //alert('previousPlayer='+this.previousPlayer);
    this.previousPlayer = player;
    //all units of player are shown!
    //all hidden units of opponents are shown!
  }
  removeUnit(id, o) {}

  updateUnit(id, o, o_old, player) {
    //console.log("create unit", id);
    let owner = getUnitOwner(o.nationality);
    let toPlace = false;
    var ms=null,msHidden=null;

    //alert('owner='+owner+', player='+player)
    if (owner == player) {
      //check if indiv unit has been created, create if not
      if (!(id in this.uis)) {
        // need to create this unit!
        ms = this.createUnit(id, owner, o);
        //console.log(ms);
        //alert('unit created',ms);
        this.uis[id] = ms;

        this.placeUnit(ms, o.tile);

        // push id to group (=this owner's units on that tile)
        this.addToUnits(id, owner, o.tile);
      }

      ms = this.uis[id];

      //handle cv update
      //cv is only updated if can see the unit!
      if ("cv" in o && ms.getTag('cv') != o.cv) {
        //console.log('updating cv',ms,o,o.cv,ms.getTag('cv'));
        this.updateCv(ms, o.cv);
      }

      //handle tile change (unit movement)
      //tile change can only happen in owner's turn!
      if (o_old && o_old.tile != o.tile) {
        //unit has to be placed!
        toPlace = true;
        //unit id needs to be removed from owner,o_old.tile
        removeInPlace(this.units[owner][o_old.tile], id);

        //and added to owner,o.tile
        //cannot have been added because was moved!
        this.addToUnits(id, owner, o.tile);

        //also, units of owner on old tile have to be relayout
        //else it will leave an ugly place
        let oldTileUnitIds = this.units[owner][o_old.tile];
        if (oldTileUnitIds.length > 0) {
          //need to
          let elements = oldTileUnitIds.map(x => this.uis[x.id]);
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            let pos = this.snailPos[i];
            el.setPos(pos.x, pos.y).draw();
          }
        }

        //also need to update counter for hidden unit for old tile!
        this.updateUnitCounter(owner, o_old.tile);
      }
      if (toPlace) {
        this.placeUnit(ms, o.tile);
      }
    } //end if owner is player

    //check hiddenUnit exists
    
    if (!(o.tile in this.hiddenUnits[owner])) {
      let idHidden = this.getHiddenId(owner, o.tile);
      msHidden = this.createHiddenUnit(idHidden, owner, o.tile);
      this.hiddenUnits[owner][o.tile]=msHidden;
    } else {
      msHidden = this.hiddenUnits[owner][o.tile];
      if (toPlace) {
        //console.log('unitCounter is updated!')
        this.updateUnitCounter(owner, o.tile);
      }
    }

    toPlace = false;
    //console.log('end',ms,msHidden);
    let vis = getVisibleSet(o);
    if (vis.includes(player)){
      if (ms) ms.show(); //else {} //alert('no ms! vis includes '+player)}
      if (msHidden) msHidden.hide(); //else {} //alert('no msHidden! vis includes '+player)}
    }else{
      if (ms) ms.hide(); //else {} //alert('no ms! vis does NOT incude '+player)}
      if (msHidden) msHidden.show(); //else {} //alert('no msHidden! vis does NOT incude '+player)}
    }
    //if (ms){ 
      //console.log('cv is getTag()',ms.getTag('cv'));
    //}
    //this.justUpdated.push({o:o,ms:ms,msHidden:msHidden})
  }
}
