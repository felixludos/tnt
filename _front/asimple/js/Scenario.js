class Scenario {
	constructor(assets, data) {
		this.data = data;
		this.assets = assets;
		this.dList = {};
		this.unitTypesRequired = {};
		this.calcTotalUnitRequirements();
		console.log('_________NEW SCENARIO!\n', this.data, this.unitTypesRequired);
	}
	calcTotalUnitRequirements() {
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
						dUnits[type] = req_units[tilename][type];
					} else {
						dUnits[type] += req_units[tilename][type];
					}
				}
			}
		}
	}
	calcUpgradesRequired(){

	}
	calcUnitsOnTilesRequired(){

	}
	calcDowsRequired(){

	}
	findMatch(G) {
		// will try to find a match in available tuples for any of the required stuff
		//console.log('FINDMATCH G',G)
		// console.log('data',this.data);
		let tuple = null;
		if (G.phase == 'Setup') {
			//what units does this player need?
			//make those units if possible
			if (G.player in this.unitTypesRequired) {
				let req_units = this.unitTypesRequired[G.player];
				//find first tuple that contains first of the types still required
				let types = Object.keys(req_units);
				for (const type of types) {
					let m = firstCond(G.tuples, t => t.includes(type));
					if (m) {
						req_units[type] -= 1;
						if (req_units[type] <= 0) {
							delete req_units[type]; //remove type if no more of it required!
						}
						tuple = m;
						break;
					}
				}
				//remove player if all requirements fulfilled!
			}
		}

		if (G.phase == 'Production') {
			//what units does this player need?
			//make those units if possible
			if (G.player in this.unitTypesRequired) {
				let req_units = this.unitTypesRequired[G.player];
				//find first tuple that contains first of the types still required
				let types = Object.keys(req_units);
				for (const type of types) {
					let m = firstCond(G.tuples, t => t.includes(type));
					if (m) {
						req_units[type] -= 1;
						if (req_units[type] <= 0) {
							delete req_units[type];
						}
						tuple = m;
						break;
					}
				}
			}
		}


		console.log('FINDMATCH RETURNS', tuple);
		return tuple; //for now, just go back to manual after each attempt
	}
}
