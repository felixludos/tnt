class Scenario {
	constructor(assets, data, G) {
		this.data = data;
		this.assets = assets;
		this.done = false;

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
		this.conflictItems = {}; //per player, who is aggressor
		this.newConflict = null; //set in activateConflict if any, used in tryDeclaration
		this.initConflictItems(G);

		unitTestConflict('conflicts:', this.conflictItems);
	}
	initConflictItems(G) {
		if ('conflicts' in this.data) {
			for (const tile in this.data.conflicts) {
				let aggressor = this.data.conflicts[tile][0];
				let defender = this.data.conflicts[tile][1];
				let cItem = {};
				cItem.aggressor = aggressor;
				cItem.goalTile = tile;
				cItem.defender = defender; //if minor, scenario should have eg. 'Austria'
				cItem.active = false;
				cItem.completed = false; //do I need this?!?!?!?!?
				addIfKeys(this.conflictItems, [aggressor], []);
				this.conflictItems[aggressor].push(cItem);
				//console.log('added conflict',aggressor,defender,tile)
			}
		}
	}
	initUnitItems(G) {
		for (const pl in this.data) {
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
		if (this.newConflict){
			unitTestConflict('conflict already activated',this.newConflict)
			return;
		}
		let conflicts = lookup(this.conflictItems, [G.player]);
		if (!conflicts) return;
		//look for first conflict that is not active and not completed
		let cNext = firstCond(conflicts, x => !x.active && !x.completed);
		if (cNext) {
			cNext.active = true;
			this.newConflict = cNext;
			unitTestConflict('activateConflict: found',cNext)
		}else{
			unitTestConflict('activateConflict: no new conflict found')
		}
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
		return done;
	}
	checkOpenRequest(G) {
		let pl = G.player;
		let openReq = lookup(this.openRequest, [pl]);
		let created = lookup(jsCopy(G.serverData), ['created']); //careful do NOT change G.serverData!

		removeInPlaceKeys(created, Object.keys(this.lockedIds)); //from created remove all ids in this.lockedIds

		if (openReq && created) {
			let id = openReq.id; //if id: unit exists, just needs change of cv|loc
			let u = id ? G.objects[id] : matchUnits(created, 'first', pl, openReq.tile, openReq.type);
			if (u) {
				openReq.id = id ? id : u.id;
				openReq.unit = u;
				openReq.tile = u.tile;
				delete this.openRequest[pl]; //muss getestet werden!!!
				unitTestMatch('checkOpenRequest: UPDATED!');
			}
		} else if (!openReq) {
			unitTestMatch('checkOpenRequest: NO REQUEST!');
		}
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
	findMatch(G) {
		unitTestScenario('______________________findMatch');

		this.checkOpenRequest(G);

		this.done = this.checkOpenItems(G);
		if (this.done) {
			unitTestScenario('Scenario is complete!!!');
			this.activateConflict(G);
		}

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

		if (G.phase.includes('Battle')){
			tuple = firstCond(G.tuples,t=>t[0].length == 1); //select Hit command
		}

		unitTestScenario('\t>>>', G.phase, G.player, tuple);
		unitTestScenarioMin('findmatch:', G.phase, G.player, tuple, this.done ? '(completed!)' : '...');
		return tuple;
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
		if (this.newConflict) {
			//console.log('new Conflict:',this.newConflict)
			let c = this.newConflict;
			let t = firstCond(G.tuples, x => x.length == 1 && x[0] == c.defender);
			if (t) {
				if (this.assets.factionNames.includes(c.defender)) {
					unitTestScenarioMin(G.player, 'is declaring war on', c.defender);
				} else {
					unitTestScenarioMin(G.player, 'is violating neutrality of', c.defender);
				}

				//can declare war, in that moment, activate all movement towards war tile!
				//reorient all troops towards conflict zone
				for(const item of this.items[G.player]){
					item.goalTile = c.goalTile;
					let l = addIfKeys(this.wrongLocationItems, [G.player], []);
					l.push(item);
				}

				this.newConflict = null;
				return t;
			}
		}
		return null;
	}
	tryDiplomacy(G) {
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
}
