class Scenario {
	constructor(assets, data, G) {
		this.data = data;
		this.assets = assets;

		this.unitsRequired = {};		// per player, tile, type: cv list
		this.upgradesRequired = {}; // per player, tile, type: cv list (tile is tile where unit has been created!)
		this.calcTotalUnitRequirements(G);
		console.log(this.unitsRequired);

		// this.dList = {};

		// this.unitTypesRequired = {}; //per player, per type {n:num,cvs:[list of req cvs]}
		// this.fortressesRequired = {}; //per player, per tile: cv
		// this.diplomacyRequired = {}; //perplayer: list of nations to acquire via diplomacy
		// // console.log('_________NEW SCENARIO!');
		// this.calcDiplomacyRequirements(G);
		// // console.log('this.data', this.data);
		// // console.log('unitTypesRequired', this.unitTypesRequired);
		// // console.log('fortressesRequired', this.fortressesRequired);
	}
	asUpgrade(t, G) {
		if (t.length != 1) return null;
		let id = t[0];
		if (!(id in G.objects)) return null;
		let o = G.objects[id];
		if (o.obj_type != 'unit') return null;
		if (!('type' in o)) return null;
		return {tuple: t, o: o, id: id, tile: o.tile, type: o.type, cv: o.cv};
	}
	calcDiplomacyRequirements(G) {
		if (!('diplomacy' in this.data)) return;
		this.diplomacyRequired = this.data.diplomacy;
		//TODO: remove already acquired nations!
	}
	calcTotalUnitRequirements(G) {
		for (const pl of this.assets.factionNames) {
			if (!(pl in this.data) || !('units' in this.data[pl])) {
				continue;
			}
			this.unitsRequired[pl] = jsCopy(this.data[pl].units);
		}

		//compare required units with current state G.objects that are units and remove reqs that are already fulfilled
		let existingUnits = Object.values(G.objects).filter(x => x.obj_type == 'unit');

		for (const u of existingUnits) {
			if (!('type' in u)) continue;
			u.owner = getUnitOwner(u.nationality);
			let pl = u.owner;

			if (!(pl in this.unitsRequired)) continue;

			let type = u.type;
			let tilename = u.tile;

			//can tilename type unit replace any of the req units?
			//test code!!!!!!!!!
			if (type != 'Fleet') return;
			//console.log('existing',tilename,type)

			for (const tile in this.unitsRequired[pl]) {
				//console.log(tile);
				//console.log(this.unitsRequired[pl][tile]);
				if (!(type in this.unitsRequired[pl][tile])) continue;
				if (empty(this.unitsRequired[pl][tile][type])) continue;
				//console.log(this.unitsRequired[pl][tile][type])
				let possTileNames = [tile];
				//add all tilenames from source
				let replacements = lookup(this.data, [pl, 'source', tile]);
				if (replacements) {
					possTileNames = possTileNames.concat(replacements);
				}
				let canReplace = possTileNames.includes(tilename);
				if (canReplace) {
					//console.log('can replace',type,'in',possTileNames);
					//drop this requirement immediately!
					//drop from list the highest entry <= u.cv
					let l1 = this.unitsRequired[pl][tile][type];
					//console.log('vorher list', l1);
					let cvMaxReq = l1.shift();
					if (u.cv < cvMaxReq) {
						addIfKey(this.upgradesRequired, [pl, tilename, type], []);
						this.upgradesRequired[pl][tilename][type].push(cvMaxReq);
					}
					//console.log('nachher list', this.unitsRequired[pl][tile][type]);
				}
			}
		}
	}
	calcDowsRequired() {}
	tryDiplomacy(G) {
		//TODO
		return null;
	}
	tryBuildUnit(G) {
		if (!(G.player in this.unitsRequired)) return null;
		unitTestBuildUnit('_________build Unit',this.unitsRequired[G.player])

		let req_units = this.unitsRequired[G.player];
		for (const tilename in req_units) {
			//find out if can build a unit on that tile
			for (const type in req_units[tilename]) {
				//if there is no option in G to build unit of this type, continue!!!
				//TODO: partition G.tuples by type
				let possibleTuples = G.tuples.filter(x => x.includes(type));
				if (empty(possibleTuples)) continue;
				unitTestBuildUnit(possibleTuples);

				//take the list of cvs
				let cvs = req_units[tilename][type];
				//look how many els are in that list: this is how many of that tile/type need to build!
				let n = cvs.length;
				//TODO: here could instead allow just a number instead of an array in yml if it is only 1 unit
				//remove first item of list and place it in this.upgradesRequired
				//only if > 1
				if (n == 0) continue; // no more needed of that type needed!!!

				let actualTilename = tilename;

				//first, find out if can build exactly the required unit type/tilename
				let tuple = firstCond(possibleTuples, x => x.includes(tilename));
				if (tuple) {
					unitTestBuildUnit('found tuple', tuple.toString());
				} else {
					//if this tilename has replacement restriction (data[player].source[tilename])
					let replacements = lookup(this.data, [G.player, 'source', tilename]);
					//instead of calculating closest tile for this type of unit, just use replacement list!
					if (replacements) {
						//only build if can build on replacement tile!
						//console.log('type', type);
						//console.log('replacements for', tilename, replacements);
						tuple = firstCond(possibleTuples, x => containsAny(x, replacements));
						//tilename of this tuple is where 
						if (tuple){
							actualTilename = firstCond(replacements,x=>tuple.includes(x))
						}else{
							let tiles = possibleTuples.map(x=>x[1]);
							console.log(tiles.toString(),'does NOT contain any of',replacements.toString())
						}
					} else {
						//otherwise look for all tiles where this type can be built
						//and build on closest one
						//select tilenames in all these tuples
						let tilenames = [];
						for (const t of possibleTuples) {
							for (const s of t) {
								//is s a tilename?
								if (this.assets.tileNames.includes(s)) {
									tilenames.push(s);
								}
							}
						}
						unitTestBuildUnit(tilenames);
						//now look which of these tilenames is closest to the place I want the unit
						let distances = tilenames.map(x => this.assets.distanceBetweenTiles(x, tilename));
						//console.log(distances);
						unitTestBuildUnit(distances);
						const indexOfMin = distances.indexOf(Math.min(...distances));
						let bestTile = tilenames[indexOfMin];
						let bestTuple = possibleTuples[indexOfMin];
						unitTestBuildUnit('best tuple', bestTuple.toString());
						tuple = bestTuple;
						actualTilename = bestTile;
					}
				}

				if (tuple) {
					let el1 = cvs.shift();
					// let el1 = cvs[0];
					// removeInPlace(cvs,el1);
					if (el1 > 1) {
						let keys = [G.player, actualTilename, type];
						addIfKeys(this.upgradesRequired, keys, []);
						this.upgradesRequired[G.player][actualTilename][type].push(el1);
						unitTestBuildUnit('added upgrade', this.upgradesRequired[G.player]);
					}
					return tuple;
				}
			}
		}
		return null;
	}
	tryUpgradeUnit(G) {
		if (!(G.player in this.upgradesRequired)) return null;
		let req_upgrades = this.upgradesRequired[G.player];
		for (const t of G.tuples) {
			// transform tuple into info={tuple:t,o:unit,type:o.type,cv:o.cv}
			// owner of this unit is G.player or else this tuple wouldn't be presented!
			let info = this.asUpgrade(t, G); 
			if (info) {
				//unitTestUpgradeUnit(info)
				let tile = info.o.tile;
				let type = info.type;
				let cv = info.cv;
				//info is a candidate for upgrade!
				//look if upgrade of cv+1 is required for this player/tile/type
				let upg = lookup(req_upgrades,[tile,type]);
				if (!upg) continue;
				let upgradeList = req_upgrades[tile][type];
				if (empty(upgradeList)) continue;
				let m = firstCond(upgradeList, x => x == info.cv + 1);
				if (m) {
					removeInPlace(upgradeList, info.cv + 1);
					// console.log('info', info);
					// console.log('removed cv of', info.cv + 1);
					// console.log('unit:', info.o);
					// console.log('reqs:', jsCopy(req_upgrades));
					unitTestUpgradeUnit('upgrading exact:',info.id,info.tile,info.type,info.cv+'/'+(info.cv + 1));
					//let s = 'removed cv of ' + info.cv + 1 + '\nunit:' + info.unit + '\nreqs:' + req_units.toString();
					return info.tuple;
				} else {
					//how many upgraded units of this type are still needed?
					let upgradeListHigherThanCv = upgradeList.filter(x => x > info.cv);
					if (upgradeListHigherThanCv.length == 0) continue;

					let desiredCv = upgradeListHigherThanCv[0];
					//unitTestUpgradeUnit(upgradeListHigherThanCv);
					let numUpgradesNeeded = upgradeListHigherThanCv.length;
					//how many units of that type in G already have higher cv than info.cv?
					//TODO: more efficient!!! this is very costly!!!
					let existingUnitsOfThatType = Object.values(G.objects).filter(
						x => x.obj_type == 'unit' && x.tile == info.tile && x.type == info.type && getUnitOwner(x.nationality) == G.player && x.cv > info.cv
					);

					//unitTestUpgradeUnit(existingUnitsOfThatType);
					let nExisting = existingUnitsOfThatType.length;
					if (nExisting < numUpgradesNeeded) {
						// console.log('found partial upgrade! no change in upgrade list');
						unitTestUpgradeUnit('upgrading partial:',info.id,info.tile,info.type,info.cv+'/'+upgradeListHigherThanCv[nExisting]);
						return info.tuple;
					}
				}
			}
		}
		return null;
	}

	findMatch(G) {
		//sort each attempt by priority! already gives a strategy!!!
		let tuple = null;
		unitTestScenario('______________________findMatch')

		if (G.phase == 'Setup') {
			if (!tuple) tuple = this.tryBuildUnit(G);
		}

		if (G.phase == 'Production') {
			if (!tuple) tuple = this.tryUpgradeUnit(G);
			if (!tuple) tuple = this.tryBuildUnit(G);
			if (!tuple) {
				if (this.data.options.priority == 'movement') {
					//take action card as next best action in production
					tuple = firstCond(G.tuples, x => x.includes('action_card'));
				}
			}
		}

		if (G.phase == 'Government') {
			if (!tuple) tuple = this.tryDiplomacy(G);
			if (!tuple) {
				if (this.data.options.priority == 'movement') {
					//take action card as next best action in production
					tuple = firstCond(G.tuples, x => x.includes('pass'));
				}
			}
		}

		if (['Spring','Summer','Fall','Winter'].includes(G.phase)){
			//pick an action card that has season = Spring
			//dazu muss ich aber erst die card info haben!!!
			//die wurde nicht eingelesen!
			//oder doch?!?
			//tuple waere einfach action_6 oder sowas
			//aber in G muss es dieses object ja geben!
			let actionTuples = G.tuples.filter(x=>startsWith(x[0],'action'));
			let actionCards = actionTuples.map(x=>x[0]);
			console.log('ids',actionCards.toString())
			let cards = actionCards.map(x=>[x,G.objects[x]]); //brauche die id!
			console.log('cards:',cards)
			let seasonCards = cards.filter(x=>'season' in x[1] && x[1].season == G.phase)
			console.log(seasonCards);
			if (empty(seasonCards)){
				tuple = actionTuples[0];
			}	else {
				tuple = firstCond(actionTuples,x=>x.includes(seasonCards[0][0]))
			}
		}

		if (G.phase == 'Movement'){
			//jetzt muss versuchen die units dahin zu moven wo sie in data[pl].units wirklich hingehoeren!
			//dabei muss aber aufpassen dass ich nicht die units von da wegmove wo sie auch gebraucht werden!!!
			//dh. G.tuples suche ein 'freies' tuple
			//erst nimm alle tuples die die dest haben, mit einer unit mit type+cv correct!
			//dann eliminiere davon alle units die auch ein anderes req erfuellen
			//
			//3 sachen: 
			//1. existing units (G.objects)
			//2. possible movements (G.tuples) (corresponding to existing units)
			//3. reqs in data[pl].units 



		}

		//unitTestScenario(this.upgradesRequired);
		//outputPlayerUnits('Axis',G);
		unitTestScenario(G.phase, G.player, 'FINDMATCH RETURNS', tuple);
		return tuple; //for now, just go back to manual after each attempt
	}
}
