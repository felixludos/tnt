class ABattle {
	constructor(assets, ipal, loc, b, stage) {
		this.assets = assets;
		this.ipal = ipal;
		this.location = loc;
		this.b = b;
		this.stage = stage;

		this.factions = [b.attacker, b.defender];
		this.allUnitTypes = Array.from(new Set(b.fire_order.map(x => x.unit.type)));
		this.ms = {}; //ms per unit._id

		this.battle_div = this.makeBattleDiv();
	}
	makeBattleDiv() {
		//cal how many units of each type per faction
		let unitTypeCountPerFaction = {};
		let byTypeAndFaction = new Counter(this.b.fire_order, x => x.unit.type + '_' + x.owner);
		for (let g of cartesian(this.allUnitTypes, this.factions)) {
			let type = stringBefore(g, '_');
			let faction = stringAfter(g, '_');
			if (!(faction in unitTypeCountPerFaction)) unitTypeCountPerFaction[faction] = {};
			let count = byTypeAndFaction.get(g);
			unitTypeCountPerFaction[faction][type] = count ? count : 0;
		}

		let hTitle = 25; //count 25 pixel for title of each col (ie., name of faction)
		let gap = 8;
		let factionGap = 3 * gap;
		let unitsz = this.assets.SZ.cadreDetail;
		let colsz = gap + unitsz;
		let rowsz = colsz;

		//calc how many cols each faction needs (=max # of units of same type)
		// as well as width for each faction, x and y values for factions/types resp.
		let nColsPerFaction = {}; //# of cols needed for each faction
		let wColsPerFaction = {};
		let xStartPerFaction = {};
		let xAkku = gap;
		let yStartPerUnitType = {};
		let yAkku = gap + hTitle;
		for (const f of this.factions) {
			nColsPerFaction[f] = getItemWithMaxValue(unitTypeCountPerFaction[f])[1];
			wColsPerFaction[f] = nColsPerFaction[f] * colsz;
			xStartPerFaction[f] = xAkku;
			xAkku += wColsPerFaction[f] + factionGap;
		}

		for (const t of this.allUnitTypes) {
			yStartPerUnitType[t] = yAkku;
			yAkku += rowsz;
		}

		let wColsTotal = Object.values(wColsPerFaction).reduce((a, b) => a + b, 0);
		let wGapsTotal = (this.factions.length - 1) * factionGap + 2 * gap;
		this.wDiv = wColsTotal + wGapsTotal;
		this.hDiv = hTitle + this.allUnitTypes * rowsz + 2 * gap;

		//hier muss kleines div machen mit den units drin!!!
		//bg von div wird spaeter erst gesetzt!!! in combat
		//aich parent kann noch nicht gesetzt werden!!!
		let d1 = document.createElement('div');
		d1.style.width = this.wDiv + 'px';
		d1.style.height = this.hDiv - hTitle + 'px';
		d1.style.border = '1px solid ' + getpal(6); // red';
		d1.style.margin = 'auto';

		//each div gets an svg and inside a g
		let svg1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg1.setAttribute('width', '100%');
		svg1.setAttribute('height', '100%');
		//svg1.setAttribute("style", "background-color:red"); //test
		let g1 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		g1.id = 'g' + this.location;
		svg1.appendChild(g1);
		d1.appendChild(svg1);
		//addUnit('u'+i, g1.id, 'Fortress', 'Italy', 4, 0,0); //test

		//faction titles
		let bg = getpal(this.ipal, 0, 'b');
		let fg = getpal(this.ipal, 0, 'f');
		for (const f of this.factions) {
			let x = xStartPerFaction[f] + wColsPerFaction[f] / 2;
			let id = uniqueIdEngine.get();
			let ms = new MS(id, id, g1.id)
				.text({txt: f, fill: fg})
				.setPos(x, 15)
				.draw();
		}

		//populate with units from b.fire_order
		let xStart = gap;
		let yStart = gap;
		let x = xStart;
		let y = yStart;
		let curFaction = null;
		let curType = null;
		for (const u of this.b.fire_order) {
			let type = u.unit.type;
			let faction = u.owner;
			if (faction != curFaction) {
				x = xStartPerFaction[faction];
			}

			if (type != curType) {
				y = yStartPerUnitType[type];
				x = xStartPerFaction[faction];
			}
			//place unit
			let usz = colsz / 2;
			let ums = this.addUnit('u' + u.unit._id, g1.id, type, u.unit.nationality, u.unit.cv, x + usz, y + usz);
			this.ms[u.unit._id] = ums;

			curType = type;
			curFaction = faction;

			x += colsz + gap;
		}
		return d1;
	}
	addUnit(id, gName, type, nationality, cv, x, y) {
		let ms = this.createUnit(id, gName, type, nationality);
		ms.setPos(x, y).draw();
		this.updateCv(ms, cv);
		return ms;
	}
	createUnit(id, gName, type, nationality) {
		// let type = 'Infantry';
		// let nationality = 'France';
		let owner = 'West';
		let imagePath = '/a/assets/images/' + type + '.svg';
		let color = this.assets.troopColors[nationality];
		let darker = darkerColor(color[0], color[1], color[2]);
		let sz = this.assets.SZ.cadreDetail;
		let sz80 = sz * 0.86;
		let szImage = sz / 1.5;
		let y = szImage / 6;
		let ms = new MS(id, id, gName)
			.roundedRect({className: 'ground', w: sz, h: sz, fill: color, rounding: sz * 0.1})
			.roundedRect({w: sz80, h: sz80, fill: darker, rounding: sz * 0.1})
			.image({path: imagePath, y: y, w: szImage, h: szImage})
			.roundedRect({className: 'unit overlay', w: sz, h: sz, fill: darker, rounding: sz * 0.1});
		ms.tag('type', 'unit');
		ms.tag('owner', owner);
		ms.tag('nationality', nationality);
		return ms;
	}

	update(data) {}
	updateCv(ms, cv) {
		ms.removeFromChildIndex(5);
		let sz = this.assets.SZ.cadreDetail;
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
	}
}
