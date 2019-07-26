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
		let dCombatArea = document.getElementById(this.dArea);
		clearElement(dCombatArea);

		//div that holds combat title, subtitle and flex grid for battles
		let dCombat = addDivFullClass(dCombatArea, 'dCombat', 'combatContainer');

		//fuer title und subTitle sollte height=auto sein!
		let dCombatTitles = addDivClass(dCombat, 'dCombatTitles', 'combatTitles');

		let dCombatTitle = addDivClass(dCombatTitles, 'dCombatTitle', 'combatTitle');
		let title = 'COMBAT!!! Battle' + (this.locations.length > 1 ? 's' : '') + ' in ' + this.locations.join(', ');
		dCombatTitle.innerHTML = title;

		this.dCombatSubtitle = addDivClass(dCombatTitles, 'dCombatSubtitle', 'combatSubtitle');

		// add flex grid to line up battles:
		let dBattleGrid = addDivClass(dCombat, 'dBattleOverview', 'battleGrid');

		let ipal = 0,
			bg,
			fg,
			d;
		for (const loc of this.locations) {
			[bg, fg, d] = this.makeDBattleOuter(dBattleGrid, ipal);

			// let d = addDiv(dCombatArea, {
			// 	html: loc,
			// 	bg: bg,
			// 	fg: fg,
			// 	w: this.containerSize.w + 'px',
			// 	h: this.containerSize.h + 'px',
			// 	border: '1px solid ' + getpal(6),
			// 	rounding: '10px',
			// 	margin: '10px',
			// 	float: 'left',
			// 	textAlign: 'center'
			// });

			ipal += 1;

			this.battles[loc].populate(d, 'g' + loc, bg, fg);
		}
	}
	clear_area() {
		let d = document.getElementById(this.dArea);
		clearElement(d);
	}
	makeDBattleOuter(dBattleGrid, ipal) {
		let dBattleOuter = addDivClass(dBattleGrid, 'dBattleOuter', 'battleOuterOverview');
		let wSides = 80;
		let bg = getpal(ipal, 0, 'b');
		let fg = getpal(ipal, 0, 'f');
		dBattleOuter.style.backgroundColor = bg;
		dBattleOuter.style.color = fg;
		ipal += 1; //randomColor();
		//console.log(wSides + this.containerSize.w);
		dBattleOuter.style.width = 2 * wSides + this.containerSize.w + 'px'; //c.size.w + 'px';
		dBattleOuter.style.height = this.containerSize.h + 'px'; //c.size.h + 'px';
		dBattleOuter.style.border = '1px solid ' + getpal(6); // red';
		dBattleOuter.style.margin = '10px';
		dBattleOuter.style.textAlign = 'center';
		return [bg, fg, dBattleOuter];
	}
	update(data, H) {
		let c = data.temp.combat;
		unitTestBattle('COMBAT UPDATE_______________');
		unitTestBattle('stage=' + c.stage, c);
		if (c.stage == 'next') {
			this.dCombatSubtitle.innerHTML = 'SELECT NEXT BATTLE!';
		} else if (c.stage == 'fire') {
			this.dCombatSubtitle.innerHTML = 'BATTLE IN ' + c.battle.tilename.toUpperCase() + ': PLEASE ACCEPT!';
		} else if (c.stage == 'cmd') {
			console.log('H', H);
			this.dCombatSubtitle.innerHTML = 'SELECT TARGET CLASS OR RETREAT OPTIONS OR ACCEPT!!!';
		} else if (c.stage == 'hit') {
			console.log('Hit data:::::::!!!!!!!!!!', H);
			let uFire = c.battle.fire;
			if (!'hits' in c.battle){
				this.dCombatSubtitle.innerHTML = 'UNIT ' + uFire.id + ' (' + uFire.type + ') IS TARGETING ' + c.battle.target_class + ': PLEASE ACCEPT!';
				this.battle.startDiceAnimation(c.battle.fire);
			}else{
				this.battle.stopDiceAnimation(c.battle.fire);
				this.battle.showHits(c.battle.hits);
				this.dCombatSubtitle.innerHTML = 'DAMAGE: ' + c.battle.hits + '!!!'+ 'PICK UNIT TAKING DAMAGE OR ACCEPT!';
			}
		}
		if ('battle' in c) {
			if (this.battle && this.battle.location != c.battle.tilename){
				this.battle.unselectBattle();
			} else if (!this.battle || this.battle.location != c.battle.tilename){
				this.battle = this.battles[c.battle.tilename];
				this.battle.selectBattle();
				unitTestBattle('SELECTED:', c.battle.tilename);
			}
			this.battle.update(c, H);
		}
		unitTestBattle('END OF COMBAT UPDATE!');
	}
}
