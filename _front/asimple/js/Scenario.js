class Scenario {
	constructor(assets, data, G) {
		this.data = data;
		this.assets = assets;

		this.units = {};//per pl,tile : list of unit ids, entered when destination reached!!!

		this.unitsRequired = {}; // per player, tile, type: cv list
		this.upgradesRequired = {} // per id: goalCv
		this.movesRequired = {} // per id: destination name

		//NOPE old version!
		// this.upgradesRequired = {}; // per player, tile, type: cv list (tile is tile where unit has been created!)
		// this.movesRequired = {}; //per player,tile,type: destination

		//for each req in data.pl.units should provide a lock on tile/type
		//in that lock put id of unit that shouldn't be moved away once on tile!
		//every Movement phase make sure locked units are not touched
		this.lock = {};
		this.lockCounter = 0;
		this.totalUnitsRequired = 0;
		this.openRequest = null; //this is the request for unit id after sending a new build tuple out
		//at findMatch, at the beginning, check if there is an open unit request, and
		//check if the latest unit that was created for this player matches the required tilename and type
		//if so, lock this id in and remove request and corresponding unitReq
		//{pl: ,actualtile:, type:, goalCv:, destination: } saved when building a unit!!!
		// at findMatch, look for last unit created with that description
		// if this unit is not locked, lock it to pl,dest,type,goalCv and drop req
		// 		also create entries for locked unit in movesReq and upgradesReq

		this.countDataUnitReqs();
		this.calcTotalUnitRequirements(G);
		////console.log(this.unitsRequired);


		// this.unitTypesRequired = {}; //per player, per type {n:num,cvs:[list of req cvs]}
		// this.fortressesRequired = {}; //per player, per tile: cv
		// this.diplomacyRequired = {}; //perplayer: list of nations to acquire via diplomacy
		// // //console.log('_________NEW SCENARIO!');
		// this.calcDiplomacyRequirements(G);
		// // //console.log('this.data', this.data);
		// // //console.log('unitTypesRequired', this.unitTypesRequired);
		// // //console.log('fortressesRequired', this.fortressesRequired);
	}
	addUnitReq(pl, tilename, type, cv) {
		let lst = addIfKeys(this.unitsRequired, [pl, tilename, type], []);
		lst.push(cv);
	}
	addUpgradeReq(id,cvGoal){
		this.upgradesRequired[id]=cvGoal;
	}
	countDataUnitReqs(){
		let cnt = 0
		for (const pl in this.data) {
			if (!('units' in this.data[pl])) continue;
			for (const tile in this.data[pl].units) {
				for (const type in this.data[pl].units[tile]) {
					let lst = this.data[pl].units[tile][type];
					cnt += lst.length;
				}
	
			}
		}
		this.totalUnitsRequired = cnt;
	}
	// addUpgradeReq(pl, tilename, type, cv) {
	// 	let lst = addIfKeys(this.upgradesRequired, [pl, tilename, type], []);
	// 	lst.push(cv);
	// }
	removeUnitReq(pl, tilename, type, cv) {
		let lst = lookup(this.unitsRequired, [pl, tilename, type]);
		if (lst && lst.includes(cv)) {
			removeInPlace(lst, cv);
			if (empty(lst)) {
				delete this.unitsRequired[pl][tilename][type];
				if (empty(this.unitsRequired[pl][tilename])) {
					delete this.unitsRequired[pl][tilename];
					if (empty(this.unitsRequired[pl])) {
						delete this.unitsRequired[pl];
					}
				}
			}
		}
		return this.unitsRequired;
	}
	addMoveReq(id, dest) {
		this.movesRequired[id]=dest;
	}
	lockIn(u, pl, goalTile, type, goalCv) {
		////console.log('LOCKIN',u.id,pl,goalTile,goalCv)
		if (u.id in this.lock){
			//console.log('LOCK ERROR!!! unit',u.id,u,'has already been locked!!!' );
			return;
		}

		let keys = [pl,goalTile];
		////console.log('locking',keys,'should be a list!!!')
		let l = addIfKeys(this.units,keys,[]);
		l.push(u.id);

		//let key = comp_(pl, comp_(goalTile, comp_(type, goalCv)));
		this.lock[u.id] = keys;
		////console.log('locking',keys)
		this.lockCounter += 1;
		//let l = addIfKeys(this.lock,[key],[]);
		//l.push(u.id);
		if (u.tile != goalTile){
			this.addMoveReq(u.id,goalTile);
		}
		if (u.cv < goalCv){
			this.addUpgradeReq(u.id,goalCv);
		}
		this.removeUnitReq(pl, goalTile, type, goalCv);

		
	}
	removeLock(id) {
		if (id in this.lock) {
			let key = this.lock[id];
			this.lockCounter -= 1;
			delete this.lock[key];
			delete this.lock[id];
		}
	}
	removeUpgradeReq(pl, tilename, type, cv) {
		let lst = lookup(this.upgradesRequired, [pl, tilename, type]);
		if (lst && lst.includes(cv)) {
			removeInPlace(lst, cv);
			if (empty(lst)) {
				delete this.upgradesRequired[pl][tilename][type];
				if (empty(this.upgradesRequired[pl][tilename])) {
					delete this.upgradesRequired[pl][tilename];
					if (empty(this.upgradesRequired[pl])) {
						delete this.upgradesRequired[pl];
					}
				}
			}
		}
		return this.upgradesRequired;
	}
	removeMoveReq(id) {
		if (id in this.movesRequired){
			delete this.movesRequired[id];
			//unit id remains locked!!!
		}
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
	calcTotalUnitRequirements(G) {
		for (const pl of this.assets.factionNames) {
			if (!(pl in this.data) || !('units' in this.data[pl])) {
				continue;
			}
			this.unitsRequired[pl] = jsCopy(this.data[pl].units);
		}

		//compare required units with current state G.objects that are units and remove reqs that are already fulfilled
		let objList = dict2list(G.objects, 'id');
		let existingUnits = objList.filter(x => x.obj_type == 'unit');
		//outputPlayerUnits('West', G);

		//first pass over reqs: find only exact matches (player,type,tile)
		for (const pl of this.assets.factionNames) {
			let ureq = lookup(this.unitsRequired, [pl]);
			if (!ureq) continue;

			ureq = jsCopy(ureq); //operate on unitsRequired so loop over copy
			let uexPlayer = existingUnits.filter(x => getUnitOwner(x.nationality) == pl);

			////console.log('uexPlayer',uexPlayer)

			if (empty(uexPlayer)) continue;

			for (const tilename in ureq) {
				////console.log('HALLLLLLLLLLLOOOOOOOOOOOOOO')
				let uexTile = uexPlayer.filter(x => x.tile == tilename);
				if (empty(uexTile)) continue;

				////console.log('uexTile',tilename,uexTile)

				for (const type in ureq[tilename]) {

					let uexType = uexTile.filter(x => x.type == type || x.type == 'Convoy' && x.carrying == type);
					if (empty(uexType)) continue;

					////console.log('uexType',uexType)
					////console.log('ureq[tilename][type]',ureq[tilename][type])

					//found exact match!!!

					//sort uex by descending cv
					sortByDescending(uexType, 'cv');

					////console.log('uexType',type,uexType);

					//match each uex to one ureq
					for (let i = 0; i < Math.min(uexType.length, ureq[tilename][type].length); i++) {
						let u = uexType[i];
						////console.log('exact match:',u.id,u.tile,u.type,u.cv)
						// let excv = uexType[i].cv;
						let reqcv = ureq[tilename][type][i];
						this.lockIn(u, pl,  tilename, type, reqcv);

						// if (excv < reqcv) {
						// 	this.addUpgradeReq(pl, tilename, type, reqcv);
						// }
					}
				}
			}
		}

		this.infoOutput('AFTER FIRST PASS',G)

		//first pass is ok

		//second pass:
		//for each required unit, find best exising unit of that player,type
		//drop requirement
		//if not exact upgrade, add entry to upgradesRequired
		//if the existing unit is in replacement source, add an entry to movesRequired
		//and lock unit to req
		//take all unlocked units and look if some of them can replace a requirement
		for (const u of existingUnits) {

			if (u.id in this.lock) {
				//console.log('LOCKED ALREADY:',u.id,u.tile,u.type,this.lock[u.id].toString())
				continue;
			}

			if (!('type' in u)) {
				//console.log('!!!NO TYPE INFORMATION FOR',u.id,u);
				continue;
			}


			u.owner = getUnitOwner(u.nationality);
			let pl = u.owner;

			if (!(pl in this.unitsRequired)) {
				//console.log('no unit requirements for',pl,'!!!');
				continue;
			}

			let type = u.type;
			let tilename = u.tile;

			//console.log('...candidate unit:',u.id,u.owner,u.tile,u.type,u.cv);

			//can tilename type unit replace any of the req units?
			//test code!!!!!!!!!
			//if (type != 'Fleet') return;
			////console.log('existing',tilename,type)

			//get all reqs for that pl,type (regardless of tile!!!)




			for (const tile in this.unitsRequired[pl]) {
				////console.log(tile);
				////console.log(this.unitsRequired[pl][tile]);
				if (!(type in this.unitsRequired[pl][tile])) continue;
				if (empty(this.unitsRequired[pl][tile][type])) continue;

				////console.log(this.unitsRequired[pl][tile][type])
				let possTileNames = [tile];
				//add all tilenames from source
				let replacements = lookup(this.data, [pl, 'source', tile]);
				if (replacements) {
					possTileNames = possTileNames.concat(replacements);
				}
				//console.log('possible tiles for',tile,possTileNames)
				let canReplace = possTileNames.includes(tilename);
				//console.log('>>>>>can replace',canReplace)
				if (canReplace) {

					//u can replace a req in this.unitsRequired[pl][tile][type]
					////console.log('can replace',type,'in',possTileNames);
					//drop this requirement immediately!
					//drop from list the highest entry <= u.cv
					let l1 = this.unitsRequired[pl][tile][type];
					////console.log('vorher list', l1);

					//dropping unitsList req!
					//let cvMaxReq = l1.shift();
					let cvMaxReq = l1[0];

					// if (u.cv < cvMaxReq) {
					// 	//adding upgradeReq:
					// 	let uplist = addIfKeys(this.upgradesRequired, [pl, tilename, type], []);
					// 	uplist.push(cvMaxReq);
					// 	this.addUpgradeReq()
					// }

					// //u is NOT on correct tile, right? or it would have been caught in first pass
					// if (u.tile == tile){
					// 	//console.log('DAS GIBT ES NICHT!!! EXACT MATCH NOT CAUGHT IN FIRST PASS!!!!!')
					// }
					// this.addMoveReq(u.id,tile);

					this.lockIn(u,pl,tile, type,cvMaxReq); //takes care of move and upgrade reqs
					////console.log('nachher list', this.unitsRequired[pl][tile][type]);
				}
			}
		}

		this.infoOutput('AFTER SECOND PASS',G)

	}

	infoOutput(msg, G){
		//console.log('----------',msg,'----------');
		////console.log(this.unitsRequired)
		////console.log(this.upgradesRequired)
		////console.log(this.movesRequired)
		//console.log('locked units:',this.lockCounter,'/',this.totalUnitsRequired)
		// for (const id in this.lock) {
		// 	//console.log('req',id,this.lock[id])
		// 	if (id in G.objects)
		// 		//console.log(G.objects[id])
		// }
		//console.log('units',jsCopy(this.units))
		//console.log('--------------------------');

	}

	calcDiplomacyRequirements(G) {
		if (!('diplomacy' in this.data)) return;
		this.diplomacyRequired = this.data.diplomacy;
		//TODO: remove already acquired nations!
	}
	calcDowsRequired() {}

	defaultProduction(G) {
		let tuple = null;
		if (this.data.options.priority == 'movement') {
			//take action card as next best action in production
			tuple = firstCond(G.tuples, x => x.includes('action_card'));
		}
		return tuple;
	}
	defaultGovernment(G) {
		let tuple = null;
		if (this.data.options.priority == 'movement') {
			//in Government pass in order to keep many season cards
			tuple = firstCond(G.tuples, x => x.includes('pass'));
		}
		return tuple;
	}
	defaultMovement(G) {
		let tuple = null;
		if (this.data.options.priority == 'movement') {
			//in Government pass in order to keep many season cards
			tuple = firstCond(G.tuples, x => x.includes('pass'));
		}
		return tuple;
	}

	tryDiplomacy(G) {
		//TODO
		return null;
	}
	tryBuildUnit(G) {
		if (!(G.player in this.unitsRequired)) return null;
		unitTestBuildUnit('_________build Unit', this.unitsRequired[G.player]);

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
					//exact req fulfilled
					unitTestBuildUnit('found tuple', tuple.toString());
					unitTestScenarioMin('build as required', tilename, type);
				} else {
					//Fortresses cannot be replaced!!!
					if (type == 'Fortress') continue;

					//if this tilename has replacement restriction (data[player].source[tilename])
					let replacements = lookup(this.data, [G.player, 'source', tilename]);
					//instead of calculating closest tile for this type of unit, just use replacement list!
					if (replacements) {
						//only build if can build on replacement tile!
						////console.log('type', type);
						////console.log('replacements for', tilename, replacements);
						tuple = firstCond(possibleTuples, x => containsAny(x, replacements));
						//tilename of this tuple is where
						if (tuple) {
							// building on tile that is explicitly named as replacement
							//put req in this.movesRequired
							actualTilename = firstCond(replacements, x => tuple.includes(x));
							addIfKeys(this.movesRequired, [G.player, tilename, type], []);
							this.movesRequired[G.player][tilename][type].push({source: actualTilename});
							unitTestScenarioMin('build replacement for', tilename, type, 'in', actualTilename);
						} else {
							let tiles = possibleTuples.map(x => x[1]);
							////console.log(tiles.toString(), 'does NOT contain any of', replacements.toString());
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
						////console.log(tilenames.toString(),tilename);
						let distances = tilenames.map(x => this.assets.distanceBetweenTiles(x, tilename));
						////console.log(distances);
						unitTestBuildUnit(distances);
						const indexOfMin = distances.indexOf(Math.min(...distances));
						let bestTile = tilenames[indexOfMin];
						let bestTuple = possibleTuples[indexOfMin];
						unitTestBuildUnit('best tuple', bestTuple.toString());
						tuple = bestTuple;
						actualTilename = bestTile;
						unitTestScenarioMin('build closest', actualTilename, '/', tilename, type);
						addIfKeys(this.movesRequired, [G.player, tilename, type], []);
						this.movesRequired[G.player][tilename][type].push({source: actualTilename});
					}
				}

				if (tuple) {


					let el1 = cvs[0];//cvs.shift();

					//cannot lock In yet because not yet created unit, but can set 
					this.openRequest = {pl: G.player,actualtile: actualTilename, type: type, goalCv: el1, destination: tilename}

					// let el1 = cvs[0];
					// removeInPlace(cvs,el1);
					// if (el1 > 1) {
					// 	let keys = [G.player, actualTilename, type];
					// 	addIfKeys(this.upgradesRequired, keys, []);
					// 	this.upgradesRequired[G.player][actualTilename][type].push(el1);
					// 	unitTestBuildUnit('added upgrade', this.upgradesRequired[G.player]);
					// }
					return tuple;
				}
			}
		}
		return null;
	}
	tryMoveUnit(G) {
		for (const id in this.movesRequired) {
			let t = firstCond(G.tuples,x=>x.length>1 && x[0] == id && x[1] == this.movesRequired[id]);
			if (t){
				this.removeMoveReq(id);
				return t;
			}
		}
		return null;
	}
	tryMoveUnit_old(G) {
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

		////console.log('move unit: movesRequired=',this.movesRequired)

		let moveReqs = lookup(this.movesRequired, [G.player]);
		if (!moveReqs) return null; //no moves are required!!!

		unitTestMovement('_________move Unit', this.movesRequired[G.player]);

		for (const tilename in moveReqs) {
			//check if indeed
			unitTestMovement('searching tuples for reqs for', tilename);

			//get all tuples that have this tile as 2nd element
			let mTuples = G.tuples.filter(x => x.length > 1 && x[1] == tilename);
			if (empty(mTuples)) continue;
			for (const t of mTuples) {
				let id = t[0];
				let unit = G.objects[id];
				unitTestMovement('tuple', t, 'unit', id, unit.type, unit.tile);
				if (!(unit.type in moveReqs[tilename])) {
					unitTestMovement('type is NOT in', moveReqs[tilename]);
					continue;
				}

				let source = moveReqs[tilename][unit.type].shift();
				unitTestMovement('after shift', moveReqs[tilename][unit.type]);
				unitTestMovement('moveReqs[tilename][unit.type].length returns', moveReqs[tilename][unit.type].length);

				if (empty(moveReqs[tilename][unit.type])) {
					delete moveReqs[tilename][unit.type];
					unitTestMovement('deleted', unit.type);
					unitTestMovement('moveReqs.tilename', moveReqs[tilename]);
					let obj = this.movesRequired[G.player][tilename];
					let test = Object.entries(obj).length === 0 && obj.constructor === Object;
					if (test) {
						delete this.movesRequired[G.player][tilename];
						unitTestMovement('deleted', tilename);
						unitTestMovement('move reqs for player', this.movesRequired[G.player]);
					}
				}

				unitTestMovement('matching tuple', t);
				unitTestMovement('moving unit', id, unit.type, 'from', source.source, 'to', tilename);
				unitTestScenarioMin('moving unit', id, unit.type, 'from', source.source, 'to', tilename);
				return t;
			}
		}

		return null;
	}
	tryDeclaration(G) {
		////console.log('try DECLARATION!!!')
		let declReqs = lookup(this.data, ['conflicts']);
		if (!declReqs) return null;
		for (const tilename in declReqs) {
			let conflict = declReqs[tilename];
			if (conflict.aggressor == G.player) {
				//this player should make a dow or violation
				let opponent = conflict.defender; // a player or a nation
				let t = firstCond(G.tuples, x => x.length == 1 && x[0] == opponent);
				if (t) {
					//first check if can in fact move into that tile!!!!!
					//when is this tilename (eg., vienna) declarable?
					//either if have a unit in vienna
					//or if there is a replacement for Vienna in lock
					////console.log(this.units)
					let units = lookup(this.units,[G.player,tilename]);
					////console.log('...........................',units)
					if (!units) {
						////console.log('no units available for ',G.player,tilename);
						continue;
					} else{
						////console.log('FOUND UNITS!!!!!');
						////console.log(units)
					}
					let aliveUnit = firstCond(units,x=>x in G.objects);
					if (!aliveUnit) continue;

					//remove this requirement
					if (this.assets.factionNames.includes(opponent)) {
						//console.log(G.player, 'is declaring war on', opponent);
					} else {
						//console.log(G.player, 'is violating neutrality of', opponent);
					}
					delete declReqs[tilename];
					return t;
					//create combatsRequired? maybe dont need that, because it is occurring automatically!
				}
			}
		}
		return null;
	}
	trySeasonCard(G) {
		let tuple = null;
		//pick an action card that has season = Spring
		//dazu muss ich aber erst die card info haben!!!
		//die wurde nicht eingelesen!
		//oder doch?!?
		//tuple waere einfach action_6 oder sowas
		//aber in G muss es dieses object ja geben!
		let actionTuples = G.tuples.filter(x => startsWith(x[0], 'action'));
		let actionCards = actionTuples.map(x => x[0]);
		////console.log('ids', actionCards.toString());
		let cards = actionCards.map(x => [x, G.objects[x]]); //brauche die id!
		////console.log('cards:', cards);
		let seasonCards = cards.filter(x => 'season' in x[1] && x[1].season == G.phase);
		////console.log(seasonCards);
		if (empty(seasonCards)) {
			tuple = actionTuples[0];
		} else {
			tuple = firstCond(actionTuples, x => x.includes(seasonCards[0][0]));
		}
		return tuple;
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
				let upg = lookup(req_upgrades, [tile, type]);
				if (!upg) continue;
				let upgradeList = req_upgrades[tile][type];
				if (empty(upgradeList)) continue;
				let m = firstCond(upgradeList, x => x == info.cv + 1);
				if (m) {
					removeInPlace(upgradeList, info.cv + 1);
					// //console.log('info', info);
					// //console.log('removed cv of', info.cv + 1);
					// //console.log('unit:', info.o);
					// //console.log('reqs:', jsCopy(req_upgrades));
					unitTestUpgradeUnit('upgrading exact:', info.id, info.tile, info.type, info.cv + '/' + (info.cv + 1));
					unitTestScenarioMin('upgrading exact:', info.id, info.tile, info.type, info.cv + '/' + (info.cv + 1));
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
						////console.log('found partial upgrade! no change in upgrade list');
						unitTestUpgradeUnit('upgrading partial:', info.id, info.tile, info.type, info.cv + '/' + upgradeListHigherThanCv[nExisting]);
						unitTestScenarioMin('upgrading partial:', info.id, info.tile, info.type, info.cv + '/' + upgradeListHigherThanCv[nExisting]);
						return info.tuple;
					}
				}
			}
		}
		return null;
	}

	findMatch(G) {
		unitTestScenario('______________________findMatch');
		unitTestScenarioMin('______________________findMatch');

		//first handle open request!
		if (this.openRequest != null){
			let pl = this.openRequest.pl;
			let tile = this.openRequest.actualtile;
			let type = this.openRequest.type;
			let goalCv = this.openRequest.goalCv;
			let goalTile = this.openRequest.destination;


			let d = G.serverData.created;
			for (const id in d) {
				if (d[id.obj_type == 'unit']){
					if (!(id in G.objects)){
						//console.log('Unit was created but did not land in G',id,d[id]);
					}
					let u = G.objects[id];
					//console.log(u);
					if (u.pl == pl && u.tile == tile && u.type == type){
						this.lockIn(u,pl,goalTile, type,goalCv);
						this.openRequest = null;
						break;
					}

				}
			}

			// //console.log(G);
		}
		//in G.objects find the last unit that was created for



		//sort each attempt by priority! already gives a strategy!!!
		let tuple = null;

		if (G.phase == 'Setup') {
			if (!tuple) tuple = this.tryBuildUnit(G);
		}

		if (G.phase == 'Production') {
			if (!tuple) tuple = this.tryUpgradeUnit(G);
			if (!tuple) tuple = this.tryBuildUnit(G);
			if (!tuple) tuple = this.defaultProduction(G);
		}

		if (G.phase == 'Government') {
			if (!tuple) tuple = this.tryDiplomacy(G);
			if (!tuple) tuple = this.defaultGovernment(G);
		}

		if (['Spring', 'Summer', 'Fall', 'Winter'].includes(G.phase)) {
			if (!tuple) tuple = this.trySeasonCard(G);
		}

		if (G.phase == 'Movement') {
			if (!tuple) tuple = this.tryDeclaration(G);
			if (!tuple) tuple = this.tryMoveUnit(G);
			if (!tuple) tuple = this.defaultMovement(G);
		}

		//unitTestScenario(this.upgradesRequired);
		//outputPlayerUnits('Axis',G);
		unitTestScenario('>>>', G.phase, G.player, 'FINDMATCH RETURNS', tuple);
		unitTestScenarioMin('>>>', G.phase, G.player, 'FINDMATCH RETURNS', tuple);
		return tuple; //for now, just go back to manual after each attempt
	}
}
