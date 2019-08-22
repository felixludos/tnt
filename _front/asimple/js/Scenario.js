class Scenario {
	constructor(assets, data, G) {
		this.data = data;
		this.assets = assets;
		this.done = false;
		this.player = null;
		this.phase = null;

		//unit items
		this.items = {}; //per player [{goalTile:,tile:,type:,cv:,id:,unit:}]
		this.openRequest = {}; //per player last item in auftrag gegeben
		this.lockedIds = {}; //per unit id, units already used in items
		//calculate each round, per pl
		this.missingUnitItems = {}; //have no unit matched up yet
		this.wrongLocationItems = {}; // have unit, need move and possibly upgrade
		this.cvTooLowItems = {}; // unit and tile, but needs upgrade
		this.perfectItems = {}; //everything as required!!!
		this.initUnitItems(G);

		//conflict items
		this.conflictItems = []; //list of conflicts, as in this.data.conflicts
		this.newConflict = null; //set in activateConflict if any, used in tryDeclaration
		this.openDeclaration = {};
		this.atWar = false;
		this.initConflictItems(G);

		//diplomacy items
		this.diplItems = {}; // per player, {nation:level,...}, all current dipl levels
		this.diplItemsTodo = {}; // still not fulfilled dipl reqs, same as diplItems
		this.openDiplRequest = {}; //per player, list of nations played since last update
		this.satellites = {};
		this.diplDone = false;
		this.updateDiplomacy(G);

		unitTestConflict('conflicts:', this.conflictItems);
	}
	initConflictItems(G) {
		if ('conflicts' in this.data) {
			for (const tile in this.data.conflicts) {
				let aggressor = this.data.conflicts[tile][0];
				let defender = this.data.conflicts[tile][1];
				let cItem = {};
				cItem.tile = tile;
				cItem.aggressor = aggressor;
				cItem.defender = defender; //if minor, scenario should have eg. 'Austria'
				cItem.stage = null;

				this.conflictItems.push(cItem);
			}
		}
	}
	initDiplItems_dep(G) {
		for (const pl in this.data) {
			if (!lookup(this.data, [pl, 'diplomacy'])) {
				continue;
			}

			for (const nation in this.data[pl].diplomacy) {
				addIfKeys(this.diplItemsTodo, [pl, nation], 0);
			}
		}

		for (const id in G.objects) {
			let o = G.objects[id];
			if (o.obj_type != 'influence') continue;
		}
	}
	initUnitItems(G) {
		for (const pl in this.data) {
			if (!lookup(this.data, [pl, 'units'])) {
				continue;
			}

			for (const tile in this.data[pl].units) {
				for (const type in this.data[pl].units[tile]) {
					for (const cv of this.data[pl].units[tile][type]) {
						let items = addIfKeys(this.items, [pl], []);
						items.push({
							owner: pl,
							goalTile: tile,
							type: type,
							goalCv: cv,
							tile: null,
							id: null,
							unit: null
						});
					}
				}
			}
		}
		unitTestMatch('items:', this.items);
		//check which items already exist that can fulfill reqs
		let availableUnits = matchUnits(G.objects, 'all');
		for (const pl in this.items) {
			let playerUnits = matchUnits(availableUnits, 'all', pl);
			unitTestMatch('player units', playerUnits);
			for (const item of this.items[pl]) {
				let m = this.findBestMatchingUnit(playerUnits, item);
				if (m) {
					item.id = m.id;
					item.unit = m;
					item.cv = m.cv;
					item.tile = m.tile;
					this.lockedIds[m.id] = item;
					removeInPlace(playerUnits, m);
				}
			}
		}
	}
	activateConflict(G) {
		if (this.newConflict) {
			unitTestScenarioWar('conflict already activated', this.newConflict);
			return;
		}
		//look for first conflict that is in prestage
		let cNext = firstCond(this.conflictItems, x => !x.stage && x.aggressor == G.player);
		if (cNext) {
			unitTestScenarioWar('activateConflict!!!!!!!!!!!!!! found conflict in stage null');
			cNext.stage = 'tbd'; //this conflict is to be declared!
			this.newConflict = cNext;
			unitTestConflict('activateConflict: found', cNext);
		} else {
			unitTestConflict('activateConflict: no new conflict found for', G.player);
		}
	}
	updateDiplomacy(G) {
		//foreach influence object in G, create a diplItems entry
		//compare diplItems and data.pl.diplomacy for ALL players!!!
		//add entry in diplItemsTodo for each unfulfilled request
		this.diplItems = {};
		this.diplItemsTodo = {};
		for (const pl in this.data) {
			if (!lookup(this.data, [pl, 'diplomacy'])) {
				continue;
			}

			for (const nation in this.data[pl].diplomacy) {
				let sat = lookup(this.satellites, [nation]);
				if (sat == pl) continue;
				addIfKeys(this.diplItemsTodo, [pl, nation], this.data[pl].diplomacy[nation]);
			}
		}
		unitTestDiplomacy('vor G check:', this.diplItemsTodo);

		//TODO: simplify code!!!
		let created = lookup(G.serverData, ['created']); //careful do NOT change G.serverData!
		let removed = lookup(G.serverData, ['removed']);
		let newCreated = !empty(created);
		let newRemoved = !empty(removed);

		//updated currently existing diplomacy objects
		for (const id in G.objects) {
			let o = G.objects[id];

			if (o.obj_type == 'influence') {
				addIfKeys(this.diplItems, [o.faction, o.nation], o.value);
				let req = lookup(this.data, [o.faction, 'diplomacy', o.nation]);
				unitTestDiplomacy('req for', o.nation, 'is', req, ' o.value is', o.value);
				if (req && req > o.value) {
					let lst = addIfKeys(this.diplItemsTodo, [o.faction], {});
					lst[o.nation] = req;
				} else if (req && req <= o.value) {
					delete this.diplItemsTodo[o.faction][o.nation];
					if (empty(this.diplItemsTodo[o.faction])) {
						delete this.diplItemsTodo[o.faction];
					}
				}
			}
		}

		//handle case where satellite was created (influence removed!)
		if (newRemoved && newCreated) {
			let lCreated = dict2list(created, 'id');
			//removed would contain a influence object
			for (const id in removed) {
				if (removed[id].obj_type != 'influence') continue;
				let v = removed[id].value;
				if (v >= 3) {
					//this object has turned into satellite!
					let o = removed[id];
					let nation = o.nation;
					let faction = o.faction;
					//make sure this on is now a satellite!
					//find tile object in created with alligence==nation
					let matchingTile = firstCond(lCreated, x => x.obj_type == 'tile' && x.alligence == nation);
					if (matchingTile) {
						//indeed, new satellite!
						if (matchingTile.owner != faction) {
							unitTestDiplomacy('RIESEN PROBLEM!!!! INCONSISTENT SATELLITE!!!!');
						}
						this.satellites[nation] = faction;
						let todoItem = lookup(this.diplItemsTodo, [faction, nation]);
						if (todoItem) {
							delete this.diplItemsTodo[faction][nation];
							if (empty(this.diplItemsTodo[faction])) {
								delete this.diplItemsTodo[faction];
							}
						}
						unitTestDiplomacy(nation, 'became satellite!');
					}
				}
			}
			//the nation of that object would be the alligence of a tile in created
			// that tile will now have owner=player
			//this player should correspond to a player that had a diplomacy requirement
			//on that nation
			//in this case, created will contain at least 1 tile
		}
		this.diplDone = empty(this.diplItemsTodo);
		unitTestDiplomacy('checkDiplomacy:');
		unitTestDiplomacy('G', G);
		unitTestDiplomacy(this.diplItems, this.diplItemsTodo, this.diplDone);
	}
	checkOpenItems() {
		let done = true;
		this.missingUnitItems = {}; //have no unit matched up yet
		this.wrongLocationItems = {}; // have unit, need move and possibly upgrade
		this.cvTooLowItems = {}; // unit and tile, but needs upgrade
		this.perfectItems = {}; //everything as required!!!
		for (const pl in this.items) {
			for (const item of this.items[pl]) {
				if (!item.unit) {
					done = false;
					let l = addIfKeys(this.missingUnitItems, [pl], []);
					l.push(item);
				} else if (item.unit.cv < item.goalCv) {
					//need to upgrade before any move because units on Sea cannot be upgraded!!!
					done = false;
					let l = addIfKeys(this.cvTooLowItems, [pl], []);
					l.push(item);
				} else if (item.goalTile != item.tile) {
					done = false;
					let l = addIfKeys(this.wrongLocationItems, [pl], []);
					l.push(item);
				} else {
					let l = addIfKeys(this.perfectItems, [pl], []);
					l.push(item);
				}
			}
		}

		if (this.data.options.done == 'diplomacy') {
			done = done && this.diplDone;
		}

		return done;
	}
	checkOpenUnitRequest(G, pl, created, removed) {
		//TODO: removed? what do I need to do
		//check open unit request:
		//unit has been built, moved, or upgraded
		//reflect changes in openReq item, which is an item in this.items!
		let openReq = lookup(this.openRequest, [pl]);
		if (!openReq) return;

		//from created remove all ids in this.lockedIds
		removeInPlaceKeys(created, Object.keys(this.lockedIds));

		let id = openReq.id; //if id: unit exists, just needs change of cv|loc
		let u = id ? G.objects[id] : matchUnits(created, 'first', pl, openReq.tile, openReq.type);
		if (u) {
			openReq.id = id ? id : u.id;
			openReq.unit = u;
			openReq.tile = u.tile;
			delete this.openRequest[pl]; //muss getestet werden!!!
			unitTestMatch('checkOpenRequest: ITEM UPDATED!');
		}
	}
	checkOpenDiplomacyRequest(G, pl, created, removed) {
		let newCreated = !empty(created);
		if (!newCreated) return;

		let newRemoved = !empty(removed);

		let openDiplReq = lookup(this.openDiplRequest, [pl]);
		if (!openDiplReq) return;

		unitTestDiplomacy('check if influences have changed:\ncreated:', created);
		//look if there is any influence object in created, if not, just let be
		let influencesChanged = false;
		for (const id in created) {
			let o = created[id];
			if (o.obj_type == 'influence') {
				influencesChanged = true;
				break;
			}
		}
		if (!influencesChanged && newRemoved) {
			for (const id in removed) {
				let o = removed[id];
				if (o.obj_type == 'influence') {
					influencesChanged = true;
					break;
				}
			}
		}
		if (influencesChanged) {
			//go through all influences in G and update diplItems accordingly
			unitTestDiplomacy('YES!');
			this.updateDiplomacy(G);
			delete this.openDiplRequest[pl]; //can I do that???
		}
	}
	checkOpenDeclarationRequest(G, pl) {
		let openDecl = this.openDeclaration;
		unitTestScenarioWar('checkOpenDeclarationRequest openDecl', openDecl);
		if (!openDecl) return;

		//at this point, newConflict should be null, openDecl should be a conclifct items
		//with c.stage == 'tbd';
		let item = firstCond(this.conflictItems, x => x.tile == this.openDeclaration.tile);
		unitTestScenarioWar('SETTING DECLARED: vorher:', jsCopy(item));
		openDecl.stage = 'declared';
		unitTestScenarioWar('nachher:', jsCopy(item));
		this.atWar = true; // movement will now become warMovement
		this.openDeclaration = null;
		unitTestScenarioWar('end of checkOpenDeclarationRequest', this.openDeclaration);

		// //reorient all troops towards conflict zone
		// for (const item of this.items[G.player]) {
		// 	item.goalTile = c.goalTile;
		// 	let l = addIfKeys(this.wrongLocationItems, [G.player], []);
		// 	l.push(item);
		// }
	}
	checkOpenRequest(G) {
		let pl = G.player;
		let created = lookup(G.serverData, ['created']);
		let removed = lookup(G.serverData, ['removed']);

		if (empty(created)) {
			unitTestMatch('checkOpenRequest: NO CHANGES IN DATA (no created!)!');
		} else {
			//for these 2 need created data!
			this.checkOpenUnitRequest(G, pl, jsCopy(created), removed);

			this.checkOpenDiplomacyRequest(G, pl, created, removed);
		}

		this.checkOpenDeclarationRequest(G, pl);
	}
	defaultSetup(G){
		let tuple = null;
		let fav_types = lookup(this.data.options,['unit_types']);
		let type = fav_types? chooseRandom(fav_types):chooseRandom(this.assets.unitTypeNames);
		tuple = firstCond(G.tuples, x => x.includes(type));
		return tuple;
	}
	defaultSatellite(G){
		let tuple = null;
		let fav_unit_type = lookup(this.data.options,['garrison_type']);
		if (!fav_unit_type) fav_unit_type='Infantry';
		tuple = firstCond(G.tuples, x => x.includes(fav_unit_type));
		if (!tuple){
			tuple = firstCond(G.tuples, x => x.includes('Tank'));
		}
		return tuple;
	}
	defaultProduction(G) {
		let tuple = null;
		if (this.data.options.priority == 'movement') {
			tuple = firstCond(G.tuples, x => x.includes('action_card'));
		}
		return tuple;
	}
	defaultGovernment(G) {
		let tuple = null;
		if (this.data.options.priority == 'movement') {
			tuple = firstCond(G.tuples, x => x.includes('pass'));
			if (!tuple) {
				tuple = firstCond(G.tuples, x => x.includes('accept'));
				if (!tuple) {
					tuple = firstCond(G.tuples, x => x.length == 1 && startsWith(x[0], 'action')); //prevent removing own influences!!!
				}
			}
		}
		return tuple;
	}
	defaultMovement(G) {
		let tuple = null;
		if (this.data.options.priority == 'movement') {
			tuple = firstCond(G.tuples, x => x.includes('pass'));
		}
		return tuple;
	}
	findBestMatchingUnit(playerUnits, item) {
		let m = matchUnits(playerUnits, 'first', null, item.goalTile, item.type, item.cv);
		if (!m) {
			m = matchUnits(playerUnits, 'first', null, item.goalTile, item.type);
			if (!m) {
				let mEveryWhere = matchUnits(playerUnits, 'all', null, null, item.type);

				//of these, find unit closest to the desired location
				if (mEveryWhere.length > 0) {
					unitTestMatch('partial matches:', mEveryWhere, 'for item', item);
					m = findClosestUnit((a, b) => this.assets.distanceBetweenTiles(a, b), item.goalTile, mEveryWhere);
				} else {
					unitTestMatch('NO MATCH for item', item);
				}
			} else {
				unitTestMatch('correctly located match:', m, 'for item', item);
			}
		} else {
			unitTestMatch('exact match:', m, 'for item', item);
		}
		return m;
	}
	tryBuildUnit(G) {
		let items = lookup(this.missingUnitItems, [G.player]);
		if (!items) return null;

		//first pass: looking for exactly matching tuple
		for (const item of items) {
			let m = firstCond(G.tuples, t => t.includes(item.type) && t.includes(item.goalTile));
			if (m) {
				this.openRequest[G.player] = item;
				//item.tile = item.goalTile;
				return m; //found perfect match!
			}
		}
		//if still here, second pass: looking for tuple in close location to open item
		for (const item of items) {
			if (item.id) continue; // this item is completed
			let mTuples = G.tuples.filter(t => t.includes(item.type));
			if (mTuples.length > 0) {
				let tilenames = filterStringFromTuples(this.assets.tileNames, mTuples);
				let m = findClosestTile((a, b) => this.assets.distanceBetweenTiles(a, b), item.goalTile, tilenames);
				if (m) {
					this.openRequest[G.player] = item;
					//item.tile = m;
					return firstCond(mTuples, t => t.includes(m));
				}
			}
		}

		return null;
	}
	tryDeclaration(G) {
		unitTestScenarioWar('tryDeclaration newConflict:', this.newConflict);
		if (this.newConflict) {
			//declare war or violation!
			let c = this.newConflict;
			let t = firstCond(G.tuples, x => x.length == 1 && x[0] == c.defender);
			if (t) {
				//comment
				if (this.assets.factionNames.includes(c.defender)) {
					unitTestScenarioMin(G.player, 'is declaring war on', c.defender);
				} else {
					unitTestScenarioMin(G.player, 'is violating neutrality of', c.defender);
				}

				this.openDeclaration = c;
				this.newConflict = null;
				return t;
			}
		}
		return null;
	}
	tryWarMovement(G) {
		unitTestScenarioWar('tryWarMovement');
		//first move as many units as possible exactly into a newly declared conflict zone:
		let goal = firstCond(this.conflictItems, x => x.stage == 'declared');

		if (!goal) {
			//TODO: if no newly declared war, check for active wars that can be reinforced
			//for now, just return strategic movement
			//mal schauen was er dann macht
			return this.tryMoveUnit(G);
		}

		//a new declaration has been done: mobilisiere soviele wie moeglich units dahin
		//ALLE units in G.tuples werden considered
		//aber wenn id in this.lockedIds ist, dann muss ensprechendes item updaten!
		let tile = goal.tile;
		let t = firstCond(G.tuples, x => x.length >= 2 && x[1] == tile);
		if (!t) {
			// cannot move unit to newly declared war zone!!!!
			//this shouldn't happen at beginning of war movement, if scenario has been planned reasonably
			unitTestScenarioWar('cannot move more units to', tile, '!');
			return this.tryMoveUnit(G);
		}
		let id = t[0];
		if (id in this.lockedIds) {
			let item = this.lockedIds[id];
			//this item will be moved into war zone!
			this.openRequest[G.player] = item;
			unitTestScenarioWar('locked unit',item,'moved to',tile)
			//if this item is in wrongLocations and the goal place of this item is war zone,
			//remove it from wrongLocations
		} else {
			unitTestScenarioWar('free unit:', id, 'moved to',tile);
		}
		return t;
	}
	tryDiplomacy(G) {
		let diplReqs = lookup(this.diplItemsTodo, [G.player]); //should be a dictionary {nation:level}
		if (diplReqs) {
			let t = firstCond(G.tuples, x => x.length == 2 && startsWith(x[0], 'action_') && x[1] in diplReqs);
			unitTestDiplomacy('tuple found:', t);
			if (t) {
				let lst = addIfKeys(this.openDiplRequest, [G.player], []);
				lst.push(t[1]); //addIf(lst,t[1]); //list of nations each player played in gov phase
				//alert('adding '+t[1]+' to openDiplRequest for '+G.player)
			}
			return t;
		}
		return null;
	}
	tryMoveUnit(G) {
		let items = lookup(this.wrongLocationItems, [G.player]);
		if (!items) return null;

		for (const item of items) {
			let tuple = firstCond(G.tuples, t => t.length > 1 && t[0] == item.id && t[1] == item.goalTile);
			if (!tuple) tuple = findClosestTupleForItem(G.tuples, item, this.assets);
			if (!tuple) continue;
			this.openRequest[G.player] = item;
			return tuple;
		}
		return null;
	}
	trySeasonCard(G) {
		//TODO pick emergency card from past season first if choice
		let tuple = null;
		let actionTuples = G.tuples.filter(x => startsWith(x[0], 'action'));
		if (empty(actionTuples)) return null;
		let actionCards = actionTuples.map(x => x[0]);
		let cards = actionCards.map(x => [x, G.objects[x]]); //brauche die id!
		let seasonCards = cards.filter(x => 'season' in x[1] && x[1].season == G.phase);
		if (empty(seasonCards)) {
			tuple = actionTuples[0];
			unitTestMatch(G.player, 'playing emergency card!!!');
		} else {
			tuple = firstCond(actionTuples, x => x.includes(seasonCards[0][0]));
		}
		return tuple;
	}
	tryUpgradeUnit(G) {
		let items = lookup(this.cvTooLowItems, [G.player]);
		if (!items) return null;

		for (const item of items) {
			let m = firstCond(G.tuples, t => t.length == 1 && t.includes(item.id));
			if (m) {
				this.openRequest[G.player] = item;
				return m;
			}
		}
		return null;
	}
	findMatch(G) {
		unitTestScenario('______________________findMatch');
		//console.log('______________________findMatch');

		let isNewRound = this.player != G.player || this.phase != G.phase;
		if (isNewRound) {
			//all conflict items that are 'declared' have to be set to active!
			this.atWar = false; //TODO entscheide in welchem fall atWar true setzen soll
			//for now just when new conflict is activated which is done once perconflict!

			//console.log('new round:', this.phase, '/', this.player, '=>', G.phase, '/', G.player);
		}
		this.player = G.player;
		this.phase = G.phase;

		this.checkOpenRequest(G);

		this.done = this.checkOpenItems(G);
		if (this.done) {
			unitTestScenario('Scenario is complete!!!');
			if (isNewRound && this.phase == 'Movement') {
				this.activateConflict(G); //first conflict declared when all units in place (and possibly diplomacy, see options)
			}
		}

		let tuple = null;
		if (G.phase == 'Setup') {
			if (!tuple) tuple = this.tryBuildUnit(G);
			if (!tuple) tuple = this.defaultSetup(G);
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

		if (G.phase == 'Satellite'){ //same as setup phase >> gib das oben hin!
			if (!tuple) tuple = this.defaultSatellite(G);
		}

		if (['Spring', 'Summer', 'Fall', 'Winter'].includes(G.phase)) {
			if (!tuple) tuple = this.trySeasonCard(G);
		}

		if (G.phase == 'Movement') {
			if (!tuple) tuple = this.tryDeclaration(G);
			if (!tuple) tuple = this.atWar ? this.tryWarMovement(G) : this.tryMoveUnit(G);
			if (!tuple) tuple = this.defaultMovement(G);
		}

		if (G.phase.includes('Battle')) {
			tuple = firstCond(G.tuples, t => t[0].length == 1); //select Hit command
		}

		unitTestScenario('\t>>>', G.phase, G.player, tuple);
		unitTestScenarioMin('findmatch:', G.phase, G.player, tuple, this.done ? '(completed!)' : '...');
		return tuple;
	}
}
