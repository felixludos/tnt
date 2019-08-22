class ACombat {
	constructor(page, assets, data, repDivName) {
		this.page = page;
		this.assets = assets;
		this.c = data; //G.temp.combat
		this.dArea = repDivName;
		this.pal = set_palette(199, 1);
		this.battles = null;

		if (Object.keys(data.battles).length > 0)
		{
			this.initBattles(data)
		}
	}
	initBattles(cData){
		//console.log('initializing battles')
		let c = this.c = cData;
		this.page.battleView();

		this.locations = Object.keys(cData.battles); //list of battle locations
		this.battleCounter = 0; //index of current battle
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

		dBattleOuter.style.width = 2 * wSides + this.containerSize.w + 'px'; //c.size.w + 'px';
		dBattleOuter.style.height = this.containerSize.h + 'px'; //c.size.h + 'px';
		dBattleOuter.style.border = '1px solid ' + getpal(6); // red';
		dBattleOuter.style.margin = '10px';
		dBattleOuter.style.textAlign = 'center';
		return [bg, fg, dBattleOuter];
	}
	update(data, H) {
		let c = data.temp.combat;
		unitTestCombat('_______________combat update');
		unitTestCombatStage('Combat stage=' + c.stage, c, this.battles);
		//console.log('WAAAAAAAAAAAAAAAAAAAAAAASSSSSSSSSSSSSS?????')

		if (c.stage == 'opt') {
			//console.log('***combat.update returns for stage == opt', c)
			return;
		}else if (!this.battles && c.stage == 'battle'){ // && Object.keys(c.battles).length > 0){
			//console.log('***combat.update initializing!',c)
			this.initBattles(c);
		} 

		let message = '';
		if (c.stage == 'opt') {
			//console.log('NEVER EVER COME HERE',c.stage);
			return;
		} else if (c.stage == 'next') {
			message = 'SELECT NEXT BATTLE!';
		} else if (c.stage == 'battle') {
			//console.log('ACombat.update: c.stage',c.stage, 'b.stage',c.battle.stage, c.battle.tilename)
			if (c.battle.stage == 'battle_start_ack'){
				//set new battle!
				//console.log('ACombat.update: this.battle',this.battle,'this.battles:',this.battles,'c.battles:',c.battles)
				if (this.battle) {
					this.battle.unselectBattle();
				}
				this.battle = this.battles[c.battle.tilename];
			}
			message = this.battle.update(data, H);
		} else if (c.stage == 'ack_combat_end'){
			message = 'COMBAT ENDS!!!'
		}
		this.dCombatSubtitle.innerHTML = message;

		unitTestCombat('_____________________');

	}
}
