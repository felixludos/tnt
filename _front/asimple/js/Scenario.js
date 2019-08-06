class Scenario {
	constructor(assets, data, G) {
		this.data = data;
		this.assets = assets;

		this.unitsRequired = {};
		this.upgradesRequired = {};
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
		return {tuple: t, o: o, type: o.type, cv: o.cv};
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
	calcTotalUnitRequirements_old(G) {
		console.log(G);
		//get aggregate desired units
		for (const pl in this.data.units) {
			if (!(pl in this.unitTypesRequired)) {
				this.unitTypesRequired[pl] = {};
			}
			let req_units = this.data.units[pl];
			let dUnits = this.unitTypesRequired[pl];
			for (const tilename in req_units) {
				for (const type in req_units[tilename]) {
					if (type == 'Fortress') {
						//handle Fortresses differently because not movable!
						// ***Fortresses (3.241): Can be built in Friendly Land Areas outside Home Territory
						if (!(pl in this.fortressesRequired)) {
							this.fortressesRequired[pl] = {};
						}
						if (!(tilename in this.fortressesRequired[pl])) {
							this.fortressesRequired[pl][tilename] = req_units[tilename][type]; //sollte cv of required Fortress on this tile sein!
						}
						continue;
					}
					if (!(type in dUnits)) {
						dUnits[type] = {n: req_units[tilename][type].length, cvs: without(req_units[tilename][type], 1)};
					} else {
						dUnits[type].n += req_units[tilename][type].length;
						for (const cv of req_units[tilename][type]) {
							if (cv > 1) dUnits[type].cvs.push(cv);
						}
						dUnits[type].cvs.sort().reverse();
					}
				}
			}
		}
		//compare required units with current state G.objects that are units and remove reqs that are already fulfilled
		let existingUnits = Object.values(G.objects).filter(x => x.obj_type == 'unit');
		console.log('existingUnits', existingUnits);
		for (const u of existingUnits) {
			if (!('owner' in u) || !('type' in u)) continue;
			let pl = u.owner;
			let type = u.type;
			if (!(pl in this.unitTypesRequired)) continue;
			if (!(type in this.unitTypesRequired[pl])) continue;
			let reqs = this.unitTypesRequired[pl][type];
			//number of req units of that type/player is reduced by 1
			reqs.n -= 1;
			if (!('cv' in u)) continue;
			//if list contains a unit of that exact cv, remove it from list
			let exactCv = firstCond(reqs.cvs, x => x == u.cv);
			if (exactCv) {
				removeInPlace(reqs.cvs, u.cv);
				continue;
			}
			let lowerCvs = reqs.cvs.filter(x => x < u.cv);
			if (lowerCvs.length > 0) {
				//else if cvs contains unit of a lower cv, remove cv that is highest among lower ones
				lowerCvs.sort().reverse();
				let highest = lowerCvs[0];
				removeInPlace(reqs.cvs, highest);
				continue;
			}
		}
	}
	calcUnitsOnTilesRequired() {}
	calcDowsRequired() {}
	tryDiplomacy(G) {
		//TODO
		return null;
	}
	tryBuildUnit(G) {
		if (!(G.player in this.unitsRequired)) return null;
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
					}
				}

				if (tuple) {
					let el1 = cvs.shift();
					// let el1 = cvs[0];
					// removeInPlace(cvs,el1);
					if (el1 > 1) {
						let keys = [G.player, tilename, type];
						addIfKeys(this.upgradesRequired, keys, []);
						this.upgradesRequired[G.player][tilename][type].push(el1);
						unitTestBuildUnit('added upgrade', this.upgradesRequired[G.player]);
					}
					return tuple;
				}
			}
		}
		return null;
	}
	tryUpgradeUnit(G) {
		if (!(G.player in this.unitTypesRequired)) return null;
		let req_units = this.unitTypesRequired[G.player];
		for (const t of G.tuples) {
			let info = this.asUpgrade(t, G); //{tuple:t,o:o,type:o.type,cv:o.cv}
			if (info) {
				//info is a candidate for upgrade!
				//look if upgrade of cv+1 is required for this type of unit and this player
				if (!(info.type in req_units)) continue;
				let upgradeList = req_units[info.type].cvs;
				if (empty(upgradeList)) continue;
				let m = firstCond(upgradeList, x => x == info.cv + 1);
				if (m) {
					removeInPlace(upgradeList, info.cv + 1);
					console.log('info', info);
					console.log('removed cv of', info.cv + 1);
					console.log('unit:', info.o);
					console.log('reqs:', jsCopy(req_units));
					let s = 'removed cv of ' + info.cv + 1 + '\nunit:' + info.unit + '\nreqs:' + req_units.toString();
					return info.tuple;
				} else {
					//how many upgraded units of this type are still needed?
					let upgradeListHigherThanCv = upgradeList.filter(x => x > info.cv);
					unitTestUpgradeUnit(upgradeListHigherThanCv);
					let numUpgradesNeeded = upgradeListHigherThanCv.length;
					//how many units of that type in G already have higher cv than info.cv?
					let existingUnitsOfThatType = Object.values(G.objects).filter(
						x => x.obj_type == 'unit' && x.type == info.type && getUnitOwner(x.nationality) == G.player && x.cv > info.cv
					);

					unitTestUpgradeUnit(existingUnitsOfThatType);
					let nExisting = existingUnitsOfThatType.length;
					if (nExisting < numUpgradesNeeded) {
						console.log('found partial upgrade! no change in upgrade list');
						return info.tuple;
					}
				}
			}
		}
		return null;
	}

	tryBuildUnit_old(G) {
		if (!(G.player in this.unitTypesRequired)) return null;
		let req_units = this.unitTypesRequired[G.player];
		let types = Object.keys(req_units);
		for (const type of types) {
			if (req_units[type].n <= 0) continue;
			let m = firstCond(G.tuples, t => t.includes(type));
			if (m) {
				req_units[type].n -= 1;
				return m;
			}
		}
		return null;
	}
	tryUpgradeUnit_old(G) {
		if (!(G.player in this.unitTypesRequired)) return null;
		let req_units = this.unitTypesRequired[G.player];
		for (const t of G.tuples) {
			let info = this.asUpgrade(t, G); //{tuple:t,o:o,type:o.type,cv:o.cv}
			if (info) {
				//info is a candidate for upgrade!
				//look if upgrade of cv+1 is required for this type of unit and this player
				if (!(info.type in req_units)) continue;
				let upgradeList = req_units[info.type].cvs;
				if (empty(upgradeList)) continue;
				let m = firstCond(upgradeList, x => x == info.cv + 1);
				if (m) {
					removeInPlace(upgradeList, info.cv + 1);
					console.log('info', info);
					console.log('removed cv of', info.cv + 1);
					console.log('unit:', info.o);
					console.log('reqs:', jsCopy(req_units));
					let s = 'removed cv of ' + info.cv + 1 + '\nunit:' + info.unit + '\nreqs:' + req_units.toString();
					return info.tuple;
				} else {
					//how many upgraded units of this type are still needed?
					let upgradeListHigherThanCv = upgradeList.filter(x => x > info.cv);
					unitTestUpgradeUnit(upgradeListHigherThanCv);
					let numUpgradesNeeded = upgradeListHigherThanCv.length;
					//how many units of that type in G already have higher cv than info.cv?
					let existingUnitsOfThatType = Object.values(G.objects).filter(
						x => x.obj_type == 'unit' && x.type == info.type && getUnitOwner(x.nationality) == G.player && x.cv > info.cv
					);

					unitTestUpgradeUnit(existingUnitsOfThatType);
					let nExisting = existingUnitsOfThatType.length;
					if (nExisting < numUpgradesNeeded) {
						console.log('found partial upgrade! no change in upgrade list');
						return info.tuple;
					}
				}
			}
		}
		return null;
	}
	tryBuildFortress_dep(G) {
		if (!(G.player in this.fortressesRequired)) return null;
		let req_forts = this.fortressesRequired[G.player];
		console.log('_____________tryBuildFortress');
		console.log(req_forts); //{Marseille:3}
		for (const tilename in req_forts) {
			//const cv = req_forts[tilename];
			let m = firstCond(G.tuples, t => t.includes('Fortress') && t.includes(tilename));
			if (m) return m;
		}
		return null;
	}
	tryUpgradeFortress_dep(G) {
		if (!(G.player in this.fortressesRequired)) return null;
		let req_forts = this.fortressesRequired[G.player];
		console.log('_____________tryUpgradeFortress');
		console.log(req_forts); //{Marseille:3}
		for (const t of G.tuples) {
			let info = this.asUpgrade(t, G); //{tuple:t,o:o,type:o.type,cv:o.cv}
			if (!info) continue;
			if (info.type != 'Fortress') continue;
			let tilename = info.o.tile; //G.player has a Fortress in tilename
			//look if this Fortress needs upgrade:
			if (!(tilename in req_forts)) continue;
			//yes,this fortress is in reqs! look if needs an upgrade!
			let desiredCv = req_forts[tilename];
			if (info.cv < desiredCv) return t;
		}
		return null;
	}
	findMatch(G) {
		//sort each attempt by priority! already gives a strategy!!!
		let tuple = null;

		if (G.phase == 'Setup') {
			if (!tuple) tuple = this.tryBuildUnit(G);
		}

		if (G.phase == 'Production') {
			if (!tuple) tuple = this.tryBuildUnit(G);
			if (!tuple) tuple = this.tryUpgradeUnit(G);
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

		console.log(G.phase, G.player, 'FINDMATCH RETURNS', tuple);
		return tuple; //for now, just go back to manual after each attempt
	}
}
