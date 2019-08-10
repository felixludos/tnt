class Scenario {
	constructor(assets, data, G) {
		this.data = data;
		this.assets = assets;
		this.done = false;

		this.items = {}; //per player [{goalTile:,tile:,type:,cv:,id:,unit:}]
		this.openRequest = {}; //per player last item in auftrag gegeben

		//calculate each round, per pl
		this.missingUnitItems = {}; //have no unit matched up yet
		this.wrongLocationItems = {}; // have unit, need move and possibly upgrade
		this.cvTooLowItems = {}; // unit and tile, but needs upgrade
		this.perfectItems = {}; //everything as required!!!

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

		console.log('items:', this.items);
		//check which items already exist that can fulfill reqs
		let availableUnits = matchUnits(G.objects, 'all');
		for (const pl in this.items) {
			let playerUnits = matchUnits(availableUnits, 'all', pl);
			console.log('player units', playerUnits);
			for (const item of this.items[pl]) {
				let m = this.findBestMatchingUnit(playerUnits, item);
				if (m) {
					item.id = m.id;
					item.unit = m;
					item.cv = m.cv;
					item.tile = m.tile;
				}
			}
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
					continue;
				}
				if (item.goalTile == item.tile && item.unit.cv >= item.goalCv) {
					let l = addIfKeys(this.perfectItems, [pl], []);
					l.push(item);
					continue;
				}
				if (item.goalTile != item.tile) {
					done = false;
					let l = addIfKeys(this.wrongLocationItems, [pl], []);
					l.push(item);
				}
				if (item.unit.cv < item.goalCv) {
					done = false;
					let l = addIfKeys(this.cvTooLowItems, [pl], []);
					l.push(item);
					//console.log('added', item, 'to upgrades!');
				}
			}
		}
		return done;
	}
	checkOpenRequest(G) {
		let pl = G.player;
		let openReq = lookup(this.openRequest, [pl]);
		let created = lookup(G.serverData, ['created']);
		if (openReq && created) {
			let id = openReq.id;
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
		//console.log('____m', m);
		if (!m) {
			m = matchUnits(playerUnits, 'first', null, item.goalTile, item.type);
			if (!m) {
				let mEveryWhere = matchUnits(playerUnits, 'all', null, null, item.type);
				//of these, find unit closest to the desired location
				if (mEveryWhere.length > 0) {
					unitTestMatch('partial matches:', mEveryWhere, 'for item', item);
					// let tilenames = mEveryWhere.map(x=>x.tile);
					// console.log('tilenames',tilenames);
					// let closestTile = findClosestTile((a,b)=>this.assets.distanceBetweenTiles(a,b),item.goalTile,tilenames)
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

		unitTestScenario('\t>>>', G.phase, G.player, tuple);
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
		//simple test code
		// let item = this.items[G.player][0];
		// this.openRequest[G.player] = item;
		// item.tile = 'London';
		// return firstCond(G.tuples, t => t.includes('Infantry') && t.includes('London'));
	}
	tryDeclaration(G) {
		return null;
	}
	tryMoveUnit(G) {
		return null;
	}
	tryUpgradeUnit(G) {
		let items = lookup(this.cvTooLowItems, [G.player]);

		if (!items) return null;

		//first pass: looking for exactly matching tuple
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
