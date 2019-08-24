class AUnits {
	constructor(assets) {
		this.assets = assets;
		this.SZ = this.assets.SZ;
		this.snailPos = calcSnailPositions(0, 0, this.SZ.cadreDetail, 25);

		this.units = {Axis: {}, West: {}, USSR: {}, Minor: {}}; //idlist by [owner][tile]

		this.uis = {}; //id:{ms:ms,o:o} //including hiddenUnits, o={obj_type:hidden_unit}

		this.hiddenUnits = {Axis: {}, West: {}, USSR: {}}; //id by [owner][tile]

		this.previousPlayer = null;
	}
	addUnit(id, ms, o) {
		//add unit id to units dictionary
		// if (id in this.units[owner][tile]) {
		//   unitTestUnits("PROBLEM: adding existing unit!!!", id);
		//   alert("PROBLEM: adding existing unit!!!", id);
		// }
		let tile = o.tile; //ms.getTag("tile");
		let owner = ms.getTag('owner');
		let neutral = ms.getTag('neutral');
		if (!(tile in this.units[owner])) {
			this.units[owner][tile] = [id];
		} else {
			addIf(id, this.units[owner][tile]);
		}
		this.uis[id] = {o: jsCopy(o), ms: ms};
		if (o.type == 'Convoy'){
			unitTestConvoy('addUnit of type CONVOY!!!',o,ms)
		}
		unitTestUnits('added', id, ms, o, owner, tile);
		unitTestMoving('added', id, ms, o, owner, tile, this.units[owner]);
	}
	addHiddenUnit(msHidden) {
		console.assert(msHidden != null, 'addHiddenUnit ms == NULL!!!!!!!!!!');
		let idHidden = msHidden.id;
		if (idHidden in this.uis) {
			unitTestUnits('addHiddenUnit ERROR!!!!, already have hidden unit', idHidden);
		}
		let tile = msHidden.getTag('tile');
		let owner = msHidden.getTag('owner');
		this.hiddenUnits[owner][tile] = idHidden;
		let o = {obj_type: 'hidden_unit', owner: owner, tile: tile, count: 1};
		this.uis[idHidden] = {o: o, ms: msHidden};
		unitTestUnits('addHiddenUnit', idHidden, msHidden, o, owner, tile);
	}
	calcStartPos(tile, faction) {
		let pTile = this.getPosition(tile);
		if (faction == 'Minor') return {x: pTile.x, y: pTile.y};

		let pFaction = this.SZ['p' + faction];
		return {x: pTile.x + pFaction.x, y: pTile.y + pFaction.y};
	}
	createHiddenUnit(id, owner, tile) {
		unitTestUnits('create HIDDEN unit', id, owner, tile, '.........');
		let color = this.assets.troopColors[owner];
		let darker = darkerColor(color[0], color[1], color[2]);
		let sz = this.SZ.sumCadre;
		let sz80 = sz * 0.86;
		let szImage = sz / 1.5;
		let y = szImage / 6;
		let ms = new MS(id, 'mapG')
			.roundedRect({w: sz, h: sz, fill: color, rounding: sz * 0.1})
			.roundedRect({w: sz80, h: sz80, fill: darker, rounding: sz * 0.1})
			.text({txt: 1, fz: sz / 2, fill: 'white'})
			.roundedRect({className: 'unit overlay', w: sz, h: sz, fill: darker, rounding: sz * 0.1});
		ms.tag('type', 'hidden_unit');
		ms.tag('count', 1);
		ms.tag('owner', owner);
		ms.tag('tile', tile);

		this.placeHiddenUnit(ms, owner, tile);
		this.addHiddenUnit(ms);

		return ms;
	}
	createUnit(id, o, player) {
		let nationality = o.nationality;
		let owner = getUnitOwner(nationality);
		let isNeutral = owner == 'Minor';
		unitTestUnits('__________', id, o, nationality, owner, isNeutral);
		let type = o.type;

		if (type === undefined) {
			unitTestUnits('CANNOT CREATE UNIT BECAUSE TYPE UNKNOWN!!!', player, owner);
			unitTestUnits(';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;');
			//unitTestUnits("createUnit", id, owner, o.tile, o.type, player);
		} else {
			unitTestUnits('create unit', id, o, '...player is', player);
			if (type == 'Convoy') {
				type = o.carrying;
			}
			let imagePath = '/a/assets/images/' + type + '.svg';
			let color = isNeutral ? this.assets.troopColors['Minor'] : this.assets.troopColors[nationality];
			let darker = darkerColor(color[0], color[1], color[2]);
			let sz = this.SZ.cadreDetail;
			let sz80 = sz * 0.86;
			let szImage = sz / 1.5;
			let y = szImage / 6;
			let ms = new MS(id, 'mapG')
				.roundedRect({className: 'ground', w: sz, h: sz, fill: color, rounding: sz * 0.1})
				.roundedRect({w: sz80, h: sz80, fill: darker, rounding: sz * 0.1})
				.image({path: imagePath, y: y, w: szImage, h: szImage})
				.roundedRect({className: 'unit overlay', w: sz, h: sz, fill: darker, rounding: sz * 0.1});
			ms.tag('type', 'unit');
			ms.tag('owner', owner);
			ms.tag('nationality', nationality);
			ms.tag('neutral', isNeutral);

			unitTestUnits('vor placeUnit call', ms, o.tile);
			this.placeUnit(ms, o.tile);
			o.owner = owner;
			this.addUnit(id, ms, o);
			if ('cv' in o) {
				unitTestUnits('vor updateCv call', ms, o.cv);
				this.updateCv(ms, o.cv);
			}
			if (o.type == 'Convoy'){
				this.markAsConvoy(id,ms,null,o);
			}

		}

		if (isNeutral) return; //don't need hidden unit
		let idHidden = this.getHiddenId(owner, o.tile);
		if (!(idHidden in this.uis)) {
			this.createHiddenUnit(idHidden, owner, o.tile);
		} else {
			unitTestUnits('hidden unit already there!!!!!!!!!!!!!', idHidden, owner, o.tile);
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
	getUnit(id) {
		//unitTestFilter('getUnit',this.uis,id)
		return id in this.uis ? this.uis[id] : null;
	}
	markAsConvoy(id, ms, o_old, o_new) {
		if (o_new.type == 'Convoy') {
			ms.tag('isConvoy', true);
			this.uis[id].o = jsCopy(o_new);
			unitTestConvoy('unit',id,'becomes convoy',o_new)
			ms.addBorder('blue')
		} else {
			ms.tag('isConvoy', false);
			this.uis[id].o = jsCopy(o_new);
			unitTestConvoy('going back from convoy: unit',id,'becomes',o_new.type,o_new)
			ms.removeBorder();
		}
	}
	moveUnit(id, tile_old, o_new) {
		if (o_new.type == 'Convoy'){
			unitTestConvoy('move unit',id,'is a CONVOY!!!!!!!!')
		}
		if (!(id in this.uis)) {
			unitTestUnits('PROBLEM: moveUnit', id, ' NOT in uis!');
			alert('PROBLEM: moveUnit ' + id + ' NOT in uis!');
		}

		let ms = this.uis[id].ms;
		let owner = ms.getTag('owner');
		let tile = ms.getTag('tile')
		this.removeUnitFromUnitsOwnerTile(id,owner,tile);

		let tile_new = o_new.tile;

		this.addUnit(id, ms, o_new);
		this.placeUnit(ms, tile_new);

		this.updateUnitCounter(owner, tile_old);

		let idHiddenNew = this.getHiddenId(owner, tile_new);
		if (!(idHiddenNew in this.uis)) {
			let msHidden_new = this.createHiddenUnit(idHiddenNew, owner, tile_new);
			this.addHiddenUnit(msHidden_new);
			unitTestUnits('moveUnit: created hidden unit', idHiddenNew);
		} else {
			this.updateUnitCounter(owner, tile_new);
		}
	}
	placeUnit(ms, tile) {
		let owner = ms.getTag('owner');
		let isNeutral = ms.getTag('neutral');
		let pStart = this.calcStartPos(tile, owner);
		let x = pStart.x;
		let y = pStart.y;
		if (!isNeutral) {
			let iUnit = tile in this.units[owner] ? this.units[owner][tile].length : 0;
			let pSnailOffset = this.snailPos[iUnit];
			x = pStart.x + pSnailOffset.x;
			y = pStart.y + pSnailOffset.y;
			unitTestUnits('index of this unit', iUnit, 'pos', x, y);
		}
		ms.setPos(x, y).draw();
		ms.tag('tile', tile);
	}
	placeHiddenUnit(msHidden, faction, tile) {
		let p = this.calcStartPos(tile, faction);
		msHidden.setPos(p.x, p.y).draw();
	}
	removeUnitFromUnitsOwnerTile(id,owner,tile) {
		//just remove from units of current owner,tile
		//do NOT remove from UI! new position will be set after this in moveUnit
		//let ms = this.uis[id].ms;
		//let owner = ms.getTag('owner');
		//let tile = ms.getTag('tile');
		unitTestMoving('vor removeUnit', id, owner, tile, this.units[owner]);
		unitTestRemove('vor removeUnit', id, owner, tile, this.units[owner]);
		removeInPlace(this.units[owner][tile], id);
	}
	resnail(owner,tile){
		unitTestResnail('in resnail:',this.units[owner][tile]);
		let pStart = this.calcStartPos(tile, owner);
		let x = pStart.x;
		let y = pStart.y;
		let iUnit = 0;
		for(const id of this.units[owner][tile]){
			unitTestResnail('in resnail:',id,owner,tile,x,y);
			let ms = this.uis[id].ms;
			ms.setPos(x,y);
			iUnit+=1;
			let pSnailOffset = this.snailPos[iUnit];
			x = pStart.x + pSnailOffset.x;
			y = pStart.y + pSnailOffset.y;
			unitTestResnail('in resnail:',id,owner,tile,x,y);
		}
	}
	updateUnitCounter(owner, tile) {
		unitTestUnits('updateUnitCounter', owner, tile);
		unitTestRemove('updateUnitCounter', owner, tile);
		if (!(tile in this.units[owner])) {
			unitTestRemove('nothing to update because no unit of', owner, 'has been created!');
			return;
		}

		let n = this.units[owner][tile].length;
		unitTestRemove('updateUnitCounter: units[', owner, '][', tile, '].length', n);
		let idHidden = this.getHiddenId(owner, tile);
		let msHidden = this.uis[idHidden].ms;
		let oHidden = this.uis[idHidden].o;
		if (n == 0) {
			oHidden.count = n;
			msHidden.tag('count', n);
			unitTestRemove('!!!!!!!!!!!!!!SUCCESS!!!!!!!!!!!!!!!!');
		} else {
			oHidden.count = n;
			let color = this.assets.troopColors[owner];
			let darker = darkerColor(color[0], color[1], color[2]);
			let sz = this.SZ.sumCadre;
			msHidden.removeFromChildIndex(3);
			msHidden.text({txt: n, fz: sz / 2, fill: 'white'}).roundedRect({
				className: 'unit overlay',
				w: sz,
				h: sz,
				fill: darker,
				rounding: sz * 0.1
			});
			msHidden.tag('count', n);
			unitTestUnits('updateUnitCounter', owner, tile, 'to', n, oHidden, msHidden);
		}
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
			ms.circle({sz: diam, x: x, y: y, fill: 'white'});
			x += dx;
		}

		ms.tag('cv', cv);
		this.uis[ms.id].o.cv = cv;
		unitTestUnits('updateCv', ms.id, ms.getTag('owner'), ms.getTag('tile'), 'to', cv);
	}
	updateVisibility(id, o, player) {
		//if (id == '8699') unitTest8('update Visibility','old', o,'player', player);
		unitTestUnitVisibility('update Visibility','id', id,'o', o,'player', player);
		let ms = id in this.uis ? this.uis[id].ms : null;
		unitTestUnitVisibility('update Visibility ms=', ms);
		let tile = o.tile;
		let owner = getUnitOwner(o.nationality);
		unitTestRemove('updating Visibility of',id,owner,tile)
		let idHidden = this.getHiddenId(owner, tile);
		let vis = isVisibleToPlayer(o, player);
		unitTestRemove('-------------vis',vis,'idHidden',idHidden)
		if (idHidden in this.uis){
			let msHidden = this.uis[idHidden].ms;
			unitTestRemove('-------------msHidden',msHidden)
			if (vis){
				msHidden.hide();
			}else{
				if (msHidden.getTag('count') > 0) msHidden.show(); else msHidden.hide();
			}
		}
		if (ms){
			if (vis){
				ms.show();
			}else{
				ms.hide();
			}
		}
	}
	update(data, gObjects, player) {
		if ('created' in data) {
			for (const id in data.created) {
				let o_new = data.created[id];
				if (o_new.obj_type != 'unit') continue;

				if (!(id in gObjects)) {
					unitTestUnits('about to create unit', id, o_new);
					this.createUnit(id, o_new, player);
					if (id in this.uis) {
						gObjects[id] = o_new;
					} else {
						unitTestUnits(':::::::UNIT WAS NOT CREATED!!!');
					}
				} else {
					//this unit has already been created,
					//check for propDiff
					let o_old = gObjects[id];
					console.assert(id in this.uis, 'unit in G but not in uis', id, o_new);
					let d = propDiff(o_old, o_new);
					if (d.hasChanged) {
						let owner = getUnitOwner(o_old.nationality);
						//unitTestUnits('________________________');
						//unitTestUnits("changes:", d.summary.toString()); //type,cv, WHY TYPE???????

						// *** type change
						if (d.summary.includes('type')) {
							//legaler fall: ground unit wird zu convoy!
							//2. fall: type is ausgeblendet weil es nicht visible unit ist!
							console.assert(player != owner || o_old.type == 'Convoy' || o_new.type == 'Convoy', 'type change other than convoy!!!!');
							if ('type' in o_new) {
								//player == owner) {
								console.assert(o_old.type == 'Convoy' || o_new.type == 'Convoy', 'type change other than convoy!!!!');
								unitTestUnits('!!!!!!! for not this temp type change NOT reflected in G!!!!');
								this.markAsConvoy(id, this.uis[id].ms, o_old, o_new);
								unitTestUnits('>>>>>MARK AS CONVOY!!!!!!!!!!!!');
								unitTestUnits(id, 'type was ' + o_old.type + ' new=' + o_new.type);
							}
							// } else {
							//   unitTestUnits("o_old", o_old, "o_new", o_new);
							//   //console.log(
							//     "hallooooooooooooooo",
							//     d,
							//     o_old,
							//     o_new,
							//     "type" in o_old,
							//     !("type" in o_new),
							//     !("type" in o_new) && "type" in o_old
							//   );
							//   //console.assert(!("type" in o_new) && "type" in o_old, "type change not just hiding and no convoy!!!");
							// }
						}

						// *** cv change
						if (d.summary.includes('cv') && o_new.cv != undefined) {
							unitTestUnits('cv change!!!!! ' + o_old.cv + ' ' + o_new.cv);
							this.updateCv(this.uis[id].ms, o_new.cv);
							gObjects[id] = o_new;
						}

						// *** tile change
						if (d.summary.includes('tile')) {
							//move unit!!!
							//alert("tile change!");
							let oldTile = o_old.tile;
							gObjects[id].tile = o_new.tile;
							this.moveUnit(id, oldTile, gObjects[id]);

							unitTestResnail('vor resnail: unit',id,o_new.nationality,o_new.type,'moved to',o_new.tile)
							this.resnail(owner,oldTile);

							unitTestUnits('unit', id, 'has moved from', oldTile, 'to', gObjects[id].tile);
							unitTestMoving('unit', id, 'has moved from', oldTile, 'to', gObjects[id].tile);
						}

						// *** visible change
						if (d.summary.includes('visible')) {
							gObjects[id].visible = o_new.visible;
							this.uis[id].o.visible = o_new.visible;
						}
					}
				}
			}
		}

		if ('removed' in data) {
			//remove influence or some chip (blockade... not implemented)
			for (const id in data.removed) {
				if (id in gObjects) {
					let o = gObjects[id];
					if (o.obj_type == 'unit') {
						let ms = this.uis[id].ms; //o.nation];
						let owner = ms.getTag('owner');
						let tile = ms.getTag('tile');
						this.removeUnitFromUnitsOwnerTile(id,owner,tile);
						let neutral = ms.getTag('neutral');
						unitTestRemove('vor aufruf UpdateUnitCounter', o, id, data.removed[id]);
						if (!neutral) this.updateUnitCounter(owner, tile);
						ms.removeFromUI();
						delete this.uis[id];
						delete gObjects[id];
						unitTestRemove('nach remove unit',id,gObjects,this.units,this.uis)
						
						unitTestResnail('vor resnail: unit',id,o.nationality,o.type,'removed from',tile)

						this.resnail(owner,tile);
					}
				}
			}
		}

		//update visibility!
		unitTestUnits('...visibility is updated for all units!');
		for (const id in this.uis) {

			const ms = this.uis[id].ms;
			const owner = ms.getTag('owner');
			const o = this.uis[id].o;
			const isHidden = o.obj_type == 'hidden_unit';

			if (isHidden){
				//this could be a hidden unit with count 0!
				let cnt = ms.getTag('count');
				if (cnt == 0) ms.hide();
				unitTestRemove('HIDING HIDDEN UNIT WITH COUNT 0',id)

			}else{
				this.updateVisibility(id,o,player);
			}

			// if (owner == player || owner == 'Minor') {
			// 	if (isHidden) {
			// 		ms.hide();
			// 	} else {
			// 		ms.show();
			// 	}
			// } else {
			// 	if (isHidden) {
			// 		ms.show();
			// 	} else {
			// 		ms.hide();
			// 	}
			// }
		}
		unitTestUnits('player', player, 'previousPlayer:', this.previousPlayer);
		this.previousPlayer = player;
	}
}
