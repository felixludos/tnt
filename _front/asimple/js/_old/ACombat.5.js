class ACombat {
	constructor(assets, combatData, repDivName) {
		this.assets = assets;
		this.c = combatData; //G.temp.combat
		this.dArea = repDivName;
		this.pal = set_palette(199, 1);
		this.locations = Object.keys(combatData.battles); //list of battle locations
		//ok unitTestCombat('locations:',this.locations)

		this.battles = {}; // list of ABattle
		this.battle = null; // the active ABattle

		//code to eliminate start
		this.rep_combat(this.c, this.dArea);
		return;
		// color_areas(1,0,'grid_div','mainDiv');
		// let d = document.getElementById(this.dArea);
		// clearElement(d);
		// let d1 = addFlexGridDiv(d);
		// d.style.backgroundColor = 'red';
		// d1.style.backgroundColor = 'yellow';
		//code to eliminate end

		this.combat_div = this.init_combat_div(this.dArea);
		this.combat_div.style.backgroundColor = 'yellow';
		//this.initBattles(combatData);

		this.unitReps = {}; //this following should be handled in ABattle!!!!!
	}

	//code to eliminate start!!!
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
	set_combat_title(div, locs) {
		let title = 'COMBAT!!! Battle' + (locs.length > 1 ? 's' : '') + ' in ' + locs.join(', ');
		let p = document.createElement('p');
		p.textContent = title;
		div.appendChild(p);
	}
	rep_combat(data, divName) {
		let assets = this.assets;
		let c = data;

		for (const loc of this.locations) {
			this.battles[loc] = new ABattle(this.assets, loc, c.battles[loc], c.stage);
		}

		//usage: getItemWithMax(d, propName)
		let sizes = this.locations.map(loc=>this.battles[loc].size);
		this.containerSize = {w: getItemWithMax(sizes,'w')[2],h:getItemWithMax(sizes,'h')[2] + 12};
		// //unitTestBattle('sizes',sizes, this.containerSize)
		// let wMax = 0;
		// let hMax = 0;
		// for (const loc of this.locations) {
		// 	let wBattle=this.battles[loc].size.w;
		// 	let hBattle=this.battles[loc].size.h;
		// 	if (wMax < wBattle) wMax = wBattle;
		// 	if (hMax < hBattle) hMax = hBattle;
		// }
		// this.containerSize = {w: wMax, h: hMax+12};

		console.log(this.battles);

		let dParent = document.getElementById(divName);
		clearElement(dParent);
		this.set_combat_title(dParent, this.locations);
		dParent = addFlexGridDiv(dParent);

		let ipal = 0;
		for (const loc of this.locations) {
			let brep = this.battles[loc];
			let bg = getpal(ipal, 0, 'b');
			let fg = getpal(ipal, 0, 'f');

			let d = addDiv(dParent, {
				html: loc,
				bg: bg,
				fg: fg,
				w: this.containerSize.w + 'px',
				h: this.containerSize.h + 'px',
				border: '1px solid ' + getpal(6),
				rounding: '10px',
				margin: '10px',
				float: 'left',
				textAlign: 'center'
			});

			ipal += 1;

			let d1 = addDiv(d, {w: brep.size.w + 'px', h: brep.size.h - 25 + 'px', margin: 'auto'});
			let gid = 'g' + loc;
			let g1 = addSvgg(d1, gid);

			let i = 0;
			for (const f of brep.factions) {
				let id = 't' + i;
				i += 1;
				let x = brep.xStartPerFaction[f] + brep.wColsPerFaction[f] / 2;
				let ms = new MS(id, id, g1.id)
					.text({txt: f, fill: fg})
					.setPos(x, 15)
					.draw();
			}

			let xStart = brep.gap.w;
			let yStart = brep.gap.h;
			//let xPerFactionAndType={};
			let x = xStart;
			let y = yStart;
			let curFaction = null;
			let curType = null;
			for (const u of brep.b.fire_order) {
				let type = u.unit.type;
				let faction = u.owner;
				if (faction != curFaction) {
					x = brep.xStartPerFaction[faction];
				}

				if (type != curType) {
					y = brep.yStartPerUnitType[type];
					x = brep.xStartPerFaction[faction];
				}
				//place unit
				let usz = brep.unitSize.w / 2;
				//let ums = addUnit('u' + u.unit._id, g1.id, type, u.unit.nationality, u.unit.cv, x + usz, y + usz);
				let ms = this.createUnit('u' + u.unit._id, g1.id, type, u.unit.nationality);
				ms.setPos(x + usz, y + usz).draw();
				this.updateCv(ms, u.unit.cv);
				let ums = ms;

				curType = type;
				curFaction = faction;

				x += brep.unitSize.w + brep.gap.w;
				// let itype = brep.allUnitTypes.indexOf(type);
				// let ifaction = brep.factions.indexOf(faction);
			}
		}
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
	//code to eliminate end!!!

	makeBattleContainer(ipal, loc) {
		let d = document.createElement('div');
		// make big div
		d.innerHTML = loc;
		let bg = getpal(ipal, 0, 'b');
		let fg = getpal(ipal, 0, 'f');
		d.style.backgroundColor = bg;
		d.style.color = fg;
		d.style.width = this.battleContainerSize.w + 'px';
		d.style.height = this.battleContainerSize.h + 'px';
		d.style.border = '1px solid ' + bg;
		d.style.borderRadius = '12px';
		d.style.margin = '4px 8px';
		d.style.paddingTop = '10px';
		d.style.float = 'left';
		d.style.textAlign = 'center';
		this.combat_div.appendChild(d);
		return d;
	}
	initBattles(dataTempCombat) {
		let c = dataTempCombat;

		let ipal = 0; //each battle has different shade
		for (const loc in c.battles) {
			let battle = new ABattle(this.assets, ipal, loc, c.battles[loc], c.stage);
			this.battles[loc] = battle;
			ipal += 1;
		}

		//need to first get maximum width (ie., units of same type) among ALL battles!
		this.battleContainerSize = {w: getItemWithMax(this.battles, 'wDiv')[2], h: getItemWithMax(this.battles, 'hDiv')[2]};
		for (const loc in this.battles) {
			let battle = this.battles[loc];
			let d = this.makeBattleContainer(ipal, i, loc);
			d.appendChild(battle.battle_div);
		}
	}
	init_combat_div(divName) {
		let dParent = document.getElementById(divName);
		clearElement(dParent);
		this.set_combat_title(dParent, this.locations);
		dParent = addFlexGridDiv(dParent);
		return dParent;
	}
	set_combat_title(div, locs) {
		let title = 'COMBAT!!! Battle' + (locs.length > 1 ? 's' : '') + ' in ' + locs.join(', ');
		let p = document.createElement('p');
		p.textContent = title;
		p.style.margin = '8px';
		div.appendChild(p);
	}
	terminate() {
		let d = document.getElementById(this.dArea);
		clearElement(d);
	}
	update(data, H) {
		//if (this.battle)
	}
}
