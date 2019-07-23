class ABattle {
	constructor(assets, loc, b, stage) {
		this.assets = assets;
		this.location = loc;
		this.b = b;
		this.stage = stage;

		this.factions = [b.attacker, b.defender];
		this.allUnitTypes = Array.from(new Set(b.fire_order.map(x => x.unit.type)));

		this.ms = {}; //ms per id
		this.selected = false;

		this.nColsPerFaction = this.calcMaxUnitTypePerFaction();

		//vertical dimensions:
		let hTitle = 25 * 2; //title of battle, names of factions
		let usz = assets.SZ.cadreDetail;
		let hGap = 4;
		let hRow = usz + hGap;
		let hTotal = hRow * this.allUnitTypes.length + hTitle + 2 * hGap;

		//horizontal dimensions:
		let wGap = hGap;
		let wFactionGap = 10 * hGap;
		let wCol = usz + wGap;
		let wColTotal = Object.values(this.nColsPerFaction).reduce((a, b) => a + b, 0);

		let wColsPerFaction = {};
		let xStartPerFaction = {};
		let xAkku = wGap;
		for (const f of this.factions) {
			//console.log('hallo!!!',f,unitTypeCountPerFaction[f])
			//console.log(getItemWithMaxValue(unitTypeCountPerFaction[f]));
			wColsPerFaction[f] = this.nColsPerFaction[f] * wCol;
			xStartPerFaction[f] = xAkku;
			xAkku += wColsPerFaction[f] + wFactionGap;
		}

		let yStartPerUnitType = {};
		let yAkku = hGap + 25;
		for (const t of this.allUnitTypes) {
			yStartPerUnitType[t] = yAkku;
			yAkku += hRow;
		}

		this.xStartPerFaction = xStartPerFaction;
		this.yStartPerUnitType = yStartPerUnitType;
		this.wColsPerFaction = wColsPerFaction;

		//console.log(wColTotal);
		let wTotal = wGap + wColTotal * wCol + wFactionGap * this.factions.length + wGap;

		this.size = {w: wTotal, h: hTotal};
		this.unitSize = {w: wCol, h: hRow};
		this.gap = {w: wGap, h: hGap, col: wFactionGap};
		//console.log('*************',this.size, this.unitSize,this.gap)
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
		//console.log('*************',gName,document.getElementById(gName))
		let ms = new MS(id, gName)
			.roundedRect({className: 'ground', w: sz, h: sz, fill: color, rounding: sz * 0.1})
			.roundedRect({w: sz80, h: sz80, fill: darker, rounding: sz * 0.1})
			.image({path: imagePath, y: y, w: szImage, h: szImage})
			.roundedRect({className: 'unit overlay', w: sz, h: sz, fill: darker, rounding: sz * 0.1});
		ms.tag('type', 'unit');
		ms.tag('owner', owner);
		ms.tag('nationality', nationality);
		return ms;
	}
	calcMaxUnitTypePerFaction() {
		let unitTypeCountPerFaction = {};
		let byTypeAndFaction = new Counter(this.b.fire_order, x => x.unit.type + '_' + x.owner);
		//console.log(byTypeAndFaction)
		for (let g of cartesian(this.allUnitTypes, this.factions)) {
			let type = stringBefore(g, '_');
			let faction = stringAfter(g, '_');
			//console.log("there are %s of type %s and faction %s", byTypeAndFaction.get(g), type,faction);
			if (!(faction in unitTypeCountPerFaction)) unitTypeCountPerFaction[faction] = {};
			let count = byTypeAndFaction.get(g);
			unitTypeCountPerFaction[faction][type] = count ? count : 0;
		}
		let nColsPerFaction = {};
		for (const f of this.factions) {
			nColsPerFaction[f] = getItemWithMaxValue(unitTypeCountPerFaction[f])[1];
		}
		return nColsPerFaction;
	}
	populate(d, gid, bg, fg) {
		// let gid = 'g' + loc;
		this.gid = gid;
		let res = addMSContainer(d, gid, {w: this.size.w + 'px', h: this.size.h - 25 + 'px'});
		//console.log('*************',d,gid, 'res',res);
		let i = 0;
		for (const f of this.factions) {
			let id = 't' + i;
			i += 1;
			let x = this.xStartPerFaction[f] + this.wColsPerFaction[f] / 2;
			let msTitle = new MS(id, gid)
				.text({txt: f, fill: fg})
				.setPos(x, 15)
				.draw();
		}

		let xStart = this.gap.w;
		let yStart = this.gap.h;
		//let xPerFactionAndType={};
		let x = xStart;
		let y = yStart;
		let curFaction = null;
		let curType = null;
		for (const u of this.b.fire_order) {
			let type = u.unit.type;
			let faction = u.owner;
			if (faction != curFaction) {
				x = this.xStartPerFaction[faction];
			}

			if (type != curType) {
				y = this.yStartPerUnitType[type];
				x = this.xStartPerFaction[faction];
			}
			//place unit
			let usz = this.unitSize.w / 2;
			//let ums = addUnit('u' + u.id, gid, type, u.unit.nationality, u.unit.cv, x + usz, y + usz);
			let ms = this.createUnit('u' + u.id, gid, type, u.unit.nationality);
			ms.setPos(x + usz, y + usz).draw();
			this.updateCv(ms, u.unit.cv);
			this.ms[u.id] = ms;

			curType = type;
			curFaction = faction;

			x += this.unitSize.w + this.gap.w;
		}
	}
	selectBattle() {
		if (this.selected) return;
		this.selected = true;
		this.signals = {};
		let id = 'selected' + this.location;
		let msSelected = new MS(id, this.gid).circle({fill: 'limegreen'}).draw();
		this.signals[id] = msSelected;
	}
	mirror_units(data,H){
		for (const u of data.battle.fire_order) {
			let o = H.objects[u.id];
			if (u.unit.cv != o.cv){
				this.updateCv(this.ms[u.id],o.cv);
			}
			//if (o.cv != u.unit.cv)
		}
	}
	update(data, H) {
		console.log('HALLO!!!!!!!!!!!!!!!!!')
		unitTestBattle('update',data.stage,data.battle);
		if ('fire' in data.battle) {
			let fire = this.ms[data.battle.fire.id];
			if (this.activeUnit != fire) {
				if (this.activeUnit) this.activeUnit.unhighlight();
				this.activeUnit = fire;
				fire.highlight();
			}
			unitTestBattle('ACTIVE FIRE UNIT:',fire);
		}
		if ('target_class' in data.battle) {
			let target_class = data.battle.target_class;
			let units = data.battle.target_units;
			for (const id in units) {
				this.ms[id].highlight();
			}
			unitTestBattle('TARGET UNITS:',units.toString())

		}
		this.mirror_units(data,H);
	}
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
