class ADecisiongen {
	constructor(assets, map, cards, units, sender) {
		this.restoreFilterButtons();
		this.map = map;
		this.cards = cards;
		this.units = units;
		this.assets = assets;
		this.callback = null;

		this.tuple = null;
		this.tuples = [];
		this.choiceCompleted = false;
		this.choiceList = {};

		this.autoplay = true;
		this.decisionMode = 'seed'; // 'seed' | 'server' | 'manual'
		this.seed = null;

		this.phase = null;


		this.processed = {};
		unitTestFilterNation('...processed created');
		this.filterMode = null; // 'unit' | 'other' | 'nation' | 'tile' | 'influence'
		this.setFilterMode(document.getElementById('btile'));
		this.hoverTuple = null; //{id:id, msList:[ms,ms,...]} or null if no tuple is hovered over
		this.msInTuples = {};
		this.idsByType = {};
		this.msSelected = null; //selected ms or null

		this.playerStrategy = {};
		this.playerStrategy['Axis'] = new AStrategy(this.assets); //new AStrategy(this.assets, {Government: t => anyStartsWith(t, "action_")});
		this.playerStrategy['West'] = new AStrategy(this.assets); //new AStrategy(this.assets, {Government: t => t.includes("pass")});
		this.playerStrategy['USSR'] = new AStrategy(this.assets); //new AStrategy(this.assets, {Government: t => t.includes("pass")});
	}
	clear() {
		let d = document.getElementById('divSelect');
		clearElement(d);
		for (const id in this.msInTuples) {
			let ms = this.msInTuples[id].ms;
			ms.makeUnselectable();
		}
		this.msInTuples = {};
		this.idsByType = {};
		this.msSelected = null;
		this.processed = {};
		unitTestFilterNation('*** clear!!!!...processed cleared!');
	}
	clearHighlighting() {
		this.mouseEnableTiles();
		this.clearHoverTuple();
		for (const id in this.msInTuples) {
			let ms = this.msInTuples[id].ms;
			ms.unhighlight();
			ms.unselect();
		}
		unitTestFilterNation('*** clearHighlighting!!!!!');
	}
	clearHoverTuple() {
		if (this.hoverTuple) {
			for (const ms of this.hoverTuple.msList) {
				//if (ms == this.msSelected) continue;
				ms.stopSelGreen(); //unselect();
			}
			this.hoverTuple = null;
		}
		unitTestFilterNation('*** clearHoverTuple!!!!!');
	}
	decideAutoplay(G) {
		unitTestChoice('decideAutoplay', G, this.decisionMode);
		if (!this.choiceCompleted) {
			//unitTestChoice("decideAutoplay", this.tuples.length, this.tuples.slice(0, 15));
			this.choiceCompleted = true;

			//set tuple
			if (this.decisionMode == 'server') {
				let info = G.serverData.choice;
				if (info.count != this.tuples.length) {
					alert('decideAutoplay: wrong tuple count!!!! ' + this.tuples.length + ' should be ' + info.count);
				}
				let n = info.random;
				this.tuple = this.tuples[n];
				if (!sameList(this.tuple, info.tuple)) {
					alert('decideAutoplay: tuple incorrect!!! ' + this.tuple.toString() + ' should be ' + info.tuples.toString());
				}
			} else if (this.decisionMode == 'seed') {
				let n = this.nextRandom(this.tuples.length);
				this.tuple = this.tuples[n];
				unitTestChoice('seed decision:', this.tuples, n, this.tuple);
			} else {
				this.tuple = this.playerStrategy[G.player].chooseTuple(G);
			}

			// show, record in selectedTuples, callback
			this.highlightChosenTuple(this.tuple);
			setTimeout(() => this.callback(this.tuple), 10); // leave user time to see what happened!
		} else {
			alert('decideAutoplay: already selected!!!');
		}
	}
	filterList(ev) {
		let idElem = evToId(ev);
		unitTestFilter('filterList', idElem);
		let justUnfilter = this.msSelected && this.msSelected.elem.id == idElem;
		//this.clearHighlighting();
		this.resetFilter();
		if (justUnfilter) return;
		let id = idElem in this.assets.uid2id ? this.assets.uid2id[idElem] : idElem;
		let ms = this.msInTuples[id].ms;
		this.msSelected = ms;
		ms.select(); // select clicked tile
		this.filterTupleList(id);
	}
	filterTupleList(id) {
		//hide tuples that do not contain id
		//nothing changes in object highlighting!!!
		unitTestFilter('filterTupleList', id);
		let d = document.getElementById('divSelect');
		let elTuples = arrChildren(d);
		for (let i = 0; i < this.tuples.length; i++) {
			const t = this.tuples[i];
			const el = elTuples[i];
			if (!t.includes(id)) {
				//unitTestFilter(t.toString(), "does not contain", id);
				//unitTestFilter(el, "should be hidden!!!");
				el.style = 'display:none';
			} else {
				//unitTestFilter('found match!', t.toString());
				//TODO: highlight related units on map if this is a movement tuple (length = 2)
				for (const s of t) {
					if (s == id) continue;
					this.selectObject(s);
				}
			}
		}
	}
	genMove(G, callback, autoplay = true) {
		if (this.seed == null) {
			this.seed = G.start.seed;
		}
		this.autoplay = autoplay;
		this.callback = callback;
		this.tuples = G.tuples;
		if (G.phase != this.phase) {
			this.setPhaseFilter(G.phase);
		}
		console.log('new genMove call!!!', this.phase);
		this.tuple = null;
		this.presentTuples(this.tuples);
		this.choiceCompleted = false;
		if (autoplay) {
			this.decideAutoplay(G);
		}
	}
	highlightObject_old(s) {
		// try if is a unit
		if (s in this.msInTuples) {
			let ms = this.msInTuples[s].ms;
			if (!ms.isHighlighted) {
				ms.highlight();
			}
			return;
		}
		if (s in this.units.uis) {
			let idUnit = s;
			let unit = this.units.getUnit(idUnit);
			unitTestFilter(s, 'is a candidate unit', unit);
			if (unit) {
				unitTestFilter('unit found!!!', unit);
				let ms = unit.ms;
				this.msInTuples[idUnit] = {id: idUnit, ms: ms, type: 'unit'};
				ms.highlight();
				return;
				// ms.enable();
				// ms.clickHandler = this.onSelectedUnit.bind(this);
			}
		} else if (s in this.map.tiles) {
			let ms = this.map.tiles[s];
			this.msInTuples[s] = {id: s, ms: ms, type: 'tile'};
			ms.highlight();
		} else if (s in this.map.influences) {
			let ms = this.map.influences[s];
			this.msInTuples[s] = {id: s, ms: ms, type: 'influence'};
			ms.highlight();
		} else if (s in this.cards.visibleHand.cards) {
			let ms = this.map.influences[s];
			this.msInTuples[s] = {id: s, ms: ms, type: 'card'};
			ms.highlight();
		}
	}
	selectObject(s) {
		// try if is a unit
		if (s in this.msInTuples) {
			let ms = this.msInTuples[s].ms;
			if (!ms.isSelected) {
				ms.select();
			}
			return;
		}
		if (s in this.units.uis) {
			let idUnit = s;
			let unit = this.units.getUnit(idUnit);
			unitTestFilter(s, 'is a candidate unit', unit);
			if (unit) {
				unitTestFilter('unit found!!!', unit);
				let ms = unit.ms;
				this.msInTuples[idUnit] = {id: idUnit, ms: ms, type: 'unit'};
				ms.select();
				return;
				// ms.enable();
				// ms.clickHandler = this.onSelectedUnit.bind(this);
			}
		} else if (s in this.map.tiles) {
			let ms = this.map.tiles[s];
			this.msInTuples[s] = {id: s, ms: ms, type: 'tile'};
			ms.select();
		} else if (s in this.map.influences) {
			let ms = this.map.influences[s];
			this.msInTuples[s] = {id: s, ms: ms, type: 'nation'};
			ms.select();
		} else if (s in this.map.nations) {
			let ms = this.map.nations[s];
			this.msInTuples[s] = {id: s, ms: ms, type: 'nation'};
			ms.select();
		} else if (s in this.cards.visibleHand.cards) {
			let ms = this.cards.getCardMs(s);
			this.msInTuples[s] = {id: s, ms: ms, type: 'card'};
			ms.select();
		}
	}
	highlightObjects() {
		this.clearHighlighting();
		switch (this.filterMode) {
			case 'unit':
				this.highlightUnits();
				break;
			case 'nation':
				unitTestFilterNation('highlighting Nation objects');
				this.highlightNations();
				break;
			case 'other':
				this.highlightOther();
				break;
			case 'tile':
			default:
				this.highlightTiles();
				break;
		}
	}
	mouseEnableTiles() {
		for (const id in this.map.tiles) {
			this.map.tiles[id].show(); //mouseEnable();//
		}
	}
	mouseDisableTiles() {
		for (const id in this.map.tiles) {
			this.map.tiles[id].hide(); //mouseDisable();//
		}
	}
	highlightNations() {
		this.mouseDisableTiles();
		if (this.highlightProcessed('nation')) {
			unitTestFilterNation('nation already processed!');
			return;
		} else {
			this.processed['nation'] = {};
			unitTestFilterNation('...processed added nation');
		}
		unitTestFilterNation('map.nations:', this.map.nations);
		for (const t of this.tuples) {
			if (any(t, s => s in this.map.nations)) {
				let name = firstCond(t, s => s in this.map.nations);
				//unitTestFilterNation('nation', name,'highlighted!');
				let ms = this.map.nations[name];
				//unitTestFilterNation('ms:', ms);
				ms.makeSelectable(this.filterList.bind(this));
				this.msInTuples[ms.id] = {ms: ms, id: name, type: 'nation'};
			}
		}
	}
	highlightOther() {
		if (this.highlightProcessed('other')) {
			unitTestFilter('other already processed!');
			return;
		} else {
			this.processed['other'] = {};
		}
		//betrifft eigentlich nur cards
		for (const t of this.tuples) {
			if (any(t, s => this.cards.inVisibleHand(s))) {
				let name = firstCond(t, s => this.cards.inVisibleHand(s));
				let ms = this.cards.getCardMs(name);
				ms.makeSelectable(this.filterList.bind(this));
				this.msInTuples[ms.id] = {ms: ms, id: name, type: 'other'};
			}
		}
	}
	highlightTiles() {
		if (this.highlightProcessed('tile')) {
			unitTestFilter('tile already processed!');
			return;
		} else {
			this.processed['tile'] = {};
		}
		for (const t of this.tuples) {
			if (t.length >= 2 && any(t, s => this.assets.tileNames.includes(s))) {
				let tilename = firstCond(t, s => this.assets.tileNames.includes(s));
				let ms = this.map.tiles[tilename];
				ms.makeSelectable(this.filterList.bind(this));
				this.msInTuples[ms.id] = {ms: ms, id: tilename, type: 'tile'};
			}
		}
	}
	highlightUnits() {
		if (this.highlightProcessed('unit')) {
			unitTestFilter('unit already processed!');
			return;
		} else {
			this.processed['unit'] = {};
		}
		for (const t of this.tuples) {
			if (any(t, s => s in this.units.uis)) {
				let id = firstCond(t, s => s in this.units.uis);
				let ms = this.units.uis[id].ms;
				ms.makeSelectable(this.filterList.bind(this));
				this.msInTuples[ms.id] = {ms: ms, id: id, type: 'unit'};
			}
		}
	}
	highlightProcessed(type) {
		unitTestFilterNation('highlightProcessed', type);
		if (type in this.processed) {
			if (type == 'nation') unitTestFilterNation(type, 'found in processed');

			for (const id in this.msInTuples) {
				const el = this.msInTuples[id];
				//unitTestFilterNation(el,el.type);
				if (el.type == type) {
					el.ms.highlight();
				}
			}
			return true;
		} else return false;
	}
	highlightChosenTuple(tuple, msecs = 30) {
		// highlight element in selection list
		let index = this.tuples.indexOf(tuple);
		let i = Object.keys(this.choiceList).length;
		let s = '' + index + ':' + tuple.toString();
		unitTestChoicemin(i, 'th choice', index, 'of', this.tuples.length, ':', this.tuple.toString());
		this.choiceList[i] = {random: index, tuple: tuple};
		let d = document.getElementById('divSelect');
		let els = document.getElementsByTagName('a');
		let el = els[index];
		el.classList.add('selected');
		ensureInView(d, el);

		//highlight objects on map or hand
	}
	onClickStep(G) {
		if (!this.choiceCompleted) {
			//hier sollte this.tuples gesetzt sein! und genau gleich wie G.tuples
			if (!sameList(this.tuples, G.tuples)) {
				alert('onClickStep: this.tuples not same as G.tuples!');
			}
			//this.tuples = G.tuples;
			//console.log("onClickStep", G);
			this.decideAutoplay(G);
		}
	}
	onExitTuple(ev) {
		this.clearHoverTuple();
	}
	onEnterTuple(ev) {
		let idTuple = evToId(ev);
		if (this.hoverTuple != null && this.hoverTuple.id == idTuple) return;
		let idx = firstNumber(idTuple);
		let tuple = this.tuples[idx];
		this.hoverTuple = {id: idTuple, msList: [], idx: idx, tuple: tuple};
		for (const s of tuple) {
			//get ms for this id
			let type = null;
			let ms = null;
			if (s in this.msInTuples) {
				ms = this.msInTuples[s].ms;
			} else if (s in this.units.uis) {
				ms = this.units.uis[s].ms;
				type = 'unit';
			} else if (s in this.map.tiles) {
				ms = this.map.tiles[s];
				type = 'tile';
			} else if (s in this.map.nations) {
				ms = this.map.nations[s];
				type = 'nation';
			} else if (s in this.map.influences) {
				ms = this.map.influences[s];
				unitTestFilterNation('ms', ms);
				type = 'nation';
			} else if (this.cards.inVisibleHand(s)) {
				ms = this.cards.getCardMs(s);
				type = 'other';
			}
			if (ms) {
				ms.selGreen();
				unitTestFilter('selGreen:', ms);
				this.hoverTuple.msList.push(ms);
				unitTestFilter('hover type of ms[' + s + ']:', ms.getTag('type'));
				if (!(s in this.msInTuples)) {
					this.msInTuples[s] = {id: s, ms: ms, type: type};
				}
			}
		}
	}
	onSelected(ev) {
		if (!this.choiceCompleted) {
			this.choiceCompleted = true;
			let id = evToId(ev);
			let idx = firstNumber(id);
			this.clearHighlighting();
			this.tuple = this.tuples[idx];
			this.highlightChosenTuple(this.tuple);
			this.callback(this.tuple);
		}
	}
	nextRandom(max) {
		unitTestRandom('nextRandom max =', max, ', this.seed =', this.seed);
		var x = Math.sin(this.seed++) * 10000;
		let res = Math.floor((x - Math.floor(x)) * max);
		return res;
	}

	presentTuples(tuples) {
		this.clear();
		let d = document.getElementById('divSelect');
		d.scrollTop = 0;

		let i = 0;
		for (const t of tuples) {
			//present in selection list:
			let el = document.createElement('a');
			el.id = 'aaa' + i;
			i += 1;
			el.textContent = t;
			d.appendChild(el);

			//attach click and mouse events to tuples in list when manual selection
			if (!this.autoplay) {
				el.addEventListener('click', this.onSelected.bind(this));
				el.addEventListener('mouseenter', this.onEnterTuple.bind(this));
				el.addEventListener('mouseleave', this.onExitTuple.bind(this));
			}
		}

		if (!this.autoplay) {
			this.prepareObjectsByType();
			this.highlightObjects();
		}
	}
	prepareObjectsByType() {
		//hide or show filterMode buttons according to tuples
		//legt basically das msTuples neu an!
		for (const t of tuples) {
			for (const s of t) {
				if (s in this.units.uis) {
					let ms = this.units.uis[s].ms;
					this.msInTuples[s] = {id: s, ms: ms, type: 'unit'};
				} else if (s in this.map.tiles) {
					let ms = this.map.tiles[s];
					this.msInTuples[s] = {id: s, ms: ms, type: 'tile'};
				} else if (s in this.map.influences) {
					let ms = this.map.influences[s];
					this.msInTuples[s] = {id: s, ms: ms, type: 'influence'};
				} else if (s in this.map.nations) {
					let ms = this.map.nations[s];
					this.msInTuples[s] = {id: s, ms: ms, type: 'nation'};
				} else if (s in this.cards.visibleHand.cards) {
					let ms = this.cards.getCardMs(s);
					this.msInTuples[s] = {id: s, ms: ms, type: 'other'};
				} 
			}
			//find commands
			if (t.length == 1){}
		}
	}
	restoreFilterButtons() {
		for (const id of ['btile', 'bunit', 'bnation', 'bother']) {
			let b = document.getElementById(id);
			b.style.backgroundColor = 'white';
			b.style.color = '#2196f3';
		}
	}
	setFilterMode(button) {
		if (this.filterMode != null) {
			//console.log('setFilterMode',this.filterMode,button)
			let b = document.getElementById('b' + this.filterMode);
			b.style.backgroundColor = 'white';
			b.style.color = '#2196f3';
			this.resetFilter();
		}
		this.filterMode = button.id.substring(1);
		button.style.backgroundColor = '#2196f3';
		button.style.color = 'white';
		// document.getElementById('b'+type).classList.add('toggleSelected');

		this.highlightObjects();
	}
	setPhaseFilter(newPhase) {
		this.phase = newPhase;
		show(document.getElementById('btile'));
		show(document.getElementById('bunit'));
		show(document.getElementById('bnation'));
		show(document.getElementById('bother'));

		switch (this.phase) {
			case 'Setup':
				hide(document.getElementById('bunit'));
				hide(document.getElementById('bother'));
				hide(document.getElementById('bnation'));
				this.setFilterMode(document.getElementById('btile'));
				break;
			case 'Government':
				this.setFilterMode(document.getElementById('bnation'));
				break;
			case 'Battle':
				this.setFilterMode(document.getElementById('bunit'));
				break;
			default:
				this.setFilterMode(document.getElementById('btile'));
				break;
		}
	}
	resetFilter() {
		if (this.msSelected != null) {
			//} && this.msSelected.elem.id == idElem) {
			//unfilter list if is filtered already!
			this.unfilterTuples(); this.elTuples.map(el=>el.style = '');
			this.highlightObjects();
			this.msSelected = null;
		}
	}
	unfilterTuples() {
		let d = document.getElementById('divSelect');
		let elTuples = arrChildren(d);
		for (const el of elTuples) {
			el.style = '';
		}
	}
}
