class ACombat {
	constructor(assets, combatData, repDivName) {
		this.assets = assets;
		this.c = combatData; //G.temp.combat
		this.dArea = repDivName;
		this.pal = set_palette(199, 1);
		this.locations = Object.keys(combatData.battles); //list of battle locations

		this.battles = {}; // list of ABattle
		this.battle = null; // the active ABattle

		//create battles
		for (const loc of this.locations) {
			this.battles[loc] = new ABattle(this.assets, loc, this.c.battles[loc], this.c.stage);
		}
		//calc containerSize
		let sizes = this.locations.map(loc => this.battles[loc].size);
		this.containerSize = {w: getItemWithMax(sizes, 'w')[2], h: getItemWithMax(sizes, 'h')[2] + 12};
		//clear area
		let dParent = document.getElementById(this.dArea);
		clearElement(dParent);
		//set title and add flex grid for battle grids
		this.set_combat_title(dParent, this.locations);
		dParent = addFlexGridDiv(dParent);

		let ipal = 0;
		for (const loc of this.locations) {
			let bg = getpal(ipal, 0, 'b');
			let fg = getpal(ipal, 0, 'f');

			//container div
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

			this.battles[loc].populate(d,'g'+loc, bg, fg);
		}

	}
	set_combat_title(div, locs) {
		let title = 'COMBAT!!! Battle' + (locs.length > 1 ? 's' : '') + ' in ' + locs.join(', ');
		let p = document.createElement('p');
		p.textContent = title;
		//p.style.margin = '8px';
		div.appendChild(p);
	}
	clear_area() {
		let d = document.getElementById(this.dArea);
		clearElement(d);
	}
	update(data, H) {
		let c = data.temp.combat;
		unitTestCombat('COMBAT UPDATE_______________')
		unitTestCombat('stage='+c.stage,c);
		if (c.stage == 'next'){
		}

		if ('battle' in c){
			if (!this.battle){
				this.battle = this.battles[c.battle.tilename];
				this.battle.selectBattle();
			}else{
				this.battle.update(c,H);
			}
			

		}
	}
}
