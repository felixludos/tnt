class Scenario {
	constructor(assets, data, G) {
		this.data = data;
		this.assets = assets;
		this.dList = {};
		this.unitTypesRequired = {};
		this.calcTotalUnitRequirements(G);
		console.log('_________NEW SCENARIO!\n', this.data, this.unitTypesRequired);
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
	calcTotalUnitRequirements(G) {
		//get aggregate desired units
		for (const pl in this.data.units) {
			if (!(pl in this.unitTypesRequired)) {
				this.unitTypesRequired[pl] = {};
			}
			let req_units = this.data.units[pl];
			let dUnits = this.unitTypesRequired[pl];
			for (const tilename in req_units) {
				for (const type in req_units[tilename]) {
					if (!(type in dUnits)) {
						dUnits[type] = {n: req_units[tilename][type].length, cvs: without(req_units[tilename][type],1)};
					} else {
						dUnits[type].n += req_units[tilename][type].length;
						for (const cv of req_units[tilename][type]) {
							if (cv>1) dUnits[type].cvs.push(cv);
						}
						dUnits[type].cvs.sort().reverse();
					}
				}
			}
		}
		//compare required units with current state G.objects that are units and remove reqs that are already fulfilled
		let existingUnits = G.objects.filter(x=>x.obj_type == 'unit');
		for (const u of existingUnits) {
			if (!('owner' in u) || !('type' in u)) continue;
			let pl = u.owner;
			let type = u.type;
			if (!(pl in this.unitTypesRequired)) continue;
			if (!(type in this.unitTypesRequired[pl])) continue;
			let reqs = this.unitTypesRequired[pl][type];
			//number of req units of that type/player is reduced by 1 
			reqs.n -= 1;
			//if list contains a unit of that exact cv, remove it from list
			
			//else if cvs contains unit of a lower cv, remove cv that is highest among lower ones
		}


	}
	calcUnitsOnTilesRequired() {}
	calcDowsRequired() {}
	findMatch(G) {
		// will try to find a match in available tuples for any of the required stuff
		//console.log('FINDMATCH G',G)
		// console.log('data',this.data);
		if (!(G.player in this.unitTypesRequired)) return null;

		let req_units = this.unitTypesRequired[G.player];
		let types = Object.keys(req_units);
		console.log('____________findMatch')
		console.log('unit reqs for',G.player,jsCopy(req_units))

		let tuple = null;

		if (G.phase == 'Setup') {
			//what units does this player need?
			//make those units if possible
			//find first tuple that contains first of the types still required
			for (const type of types) {
				if (req_units[type].n <= 0) continue;
				let m = firstCond(G.tuples, t => t.includes(type));
				if (m) {
					req_units[type].n -= 1;
					tuple = m;
					break;
				}
			}
		}

		if (G.phase == 'Production') {
			//make new unit if more units are required as per scenario
			for (const type of types) {
				if (req_units[type].n <= 0) continue;
				let m = firstCond(G.tuples, t => t.includes(type));
				if (m) {
					req_units[type].n -= 1;
					tuple = m;
					break; //hier tuple returnen?
				}
			}

			if (!tuple) {
				//no tuple required: upgrade existing units if upgrades required!
				//does this really work?
				//how do I know what units this player has?
				//mach ein beispiel!!!
				for (const t of G.tuples) {
					let info = this.asUpgrade(t, G); //{tuple:t,o:o,type:o.type,cv:o.cv}
					if (info) {
						//look if upgrade of cv+1 is required for this type of unit and this player
						if (!(info.type in req_units)) continue;
						let upgradeList = req_units[info.type].cvs;
						if (empty(upgradeList)) continue;
						let m = firstCond(upgradeList,x=>x==info.cv+1);
						if (m) {
							removeInPlace(upgradeList,info.cv+1);
							console.log('info',info)
							console.log('removed cv of',info.cv+1)
							console.log('unit:',info.o)
							console.log('reqs:',jsCopy(req_units))
							let s='removed cv of '+info.cv+1+'\nunit:'+info.unit+'\nreqs:'+req_units.toString();
							tuple = info.tuple;
							//alert(s)
							break;
						}else{
							m=firstCond(upgradeList,x=>x>info.cv+1);
							if (m){
								console.log('found partial upgrade! no change in upgrade list')
								tuple = info.tuple;
								break;
							}
						}
					}
				}
			}
		}

		console.log(G.phase,'FINDMATCH RETURNS', tuple);
		return tuple; //for now, just go back to manual after each attempt
	}
}
