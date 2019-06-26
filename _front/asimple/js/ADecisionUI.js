class ADecisionUI {
	constructor(assets, map, cards, units) {
		this.map = map;
		this.cards = cards;
		this.units = units;
		this.assets = assets;

		this.buttons = {}; //button by type
		this.types = ['tile', 'unit', 'nation', 'other'];
		for (const type of this.types) {
			let b = document.getElementById('b' + type);
			this.unselectButton(b); //farbe blau auf weiss!
			this.buttons[type] = b;
		}
		this.extraTypes = [];
		this.highlightType = null;

		this.phase = null;
		this.tuples;
		this.elTuples;
		this.byS = {}; //TODO:rename to byS key=[s from tuple], val={ms:ms,type:type}
		this.byType = {}; // key=type, val=[s from tuple]
		this.ituplesByS = {}; // key=[s from tuple], val=[indices of tuples containing this s]
		this.ihideByS = {}; // key=[s from tuple], val=[indices of tuples NOT containing this s]
		this.ituplesByType = {}; // key=type, val=[indices of tuples containing this type]
		this.sInTuples = []; // all s that actually occur in this.tuples
		// byS will NOT be recalculated each time!

		this.msSelected = null;
		this.hoverTuple = null;
	}
	clearHoverTuple() {
		unitTestHover('clearHoverTuple');
		if (this.hoverTuple) {
			unitTestHover('clearHoverTuple', this.hoverTuple.id);
			for (const s of this.hoverTuple.tuple) {
				let ms = this.get(s).ms;
				if (ms) ms.stopBlinking();
			}
			this.hoverTuple = null;
		}
	}
	filterByS(ev) {
		let idElem = evToId(ev);

		let clickedOnSelected = this.msSelected && this.msSelected.elem.id == idElem;

		this.restoreNoFilterHighlightType();

		if (clickedOnSelected) return;

		let id = idElem in this.assets.uid2id ? this.assets.uid2id[idElem] : idElem;
		let ms = this.byS[id].ms;
		this.msSelected = ms;
		unitTestFilter('filterByS', idElem, id);

		for (let i = 0; i < this.tuples.length; i++) {
			const t = this.tuples[i];
			const el = this.elTuples[i];
			if (!t.includes(id)) {
				//unitTestFilter(t.toString(), "does not contain", id);
				//unitTestFilter(el, "should be hidden!!!");
				el.style = 'display:none';
			} else {
				//unitTestFilter('found match!', t.toString());
				for (const s of t) {
					//exception: in Setup phase do NOT select nations!!!
					if (this.phase == 'Setup' && this.get(s).type == 'nation') continue;

					let ms = this.get(s).ms;
					if (ms) ms.select();
				}
			}
		}
	}
	filterByType() {
		let type = this.highlightType;
		unitTestFilterByType('filterByType', type, this.tuples.length, this.ituplesByType[type].toString());
		for (let i = 0; i < this.tuples.length; i++) {
			if (!this.ituplesByType[type].includes(i)) {
				this.elTuples[i].style = 'display:none';
			}
		}
	}
	get(s) {
		if (s in this.byS) {
			return this.byS[s];
		}

		let type = null;
		let ms = null;
		if (s in this.units.uis) {
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
			type = 'card';
		} else {
			//this string does not have a visible rep
			type = 'other';
		}
		this.byS[s] = {ms: ms, type: type};
		return this.byS[s];
	}
	hideUI() {
		Object.values(this.buttons).map(x => hide(x));
	}
	highlightObjects() {
		let ids = this.byType[this.highlightType];
		if (this.highlightType == 'other') {
			this.extraTypes.map(t => this.byType[t].map(s => ids.push(s)));
		}
		unitTestFilterByType('highlightType:', this.highlightType, 'ids', ids);

		for (const s of ids) {
			let ms = this.byS[s].ms;
			if (ms) {
				ms.makeSelectable(this.filterByS.bind(this));
			}
		}

		//special case: if filterType is nation, hide tiles!
		let tilesVisible = this.map.tiles['London'].isVisible;
		let nationsVisible = this.map.nations['Britain'].isVisible;
		if (this.highlightType == 'nation') {
			if (tilesVisible) Object.values(this.map.tiles).map(o => o.hide());
		} else if (!tilesVisible) {
			Object.values(this.map.tiles).map(o => o.show());
		}
		if (this.highlightType == 'tile') {
			if (nationsVisible) Object.values(this.map.nations).map(o => o.hide());
		} else if (!nationsVisible) {
			Object.values(this.map.nations).map(o => o.show());
		}

		//if more than 24 tuples (or as many as fit in visible tuple list)
		//filter tuple list also

		unitTestFilterByType('ids.length', ids.length);
		if (this.tuples.length > 24) {
			//here need currently displayed ids!!!
			this.filterByType();
		}
	}
	onExitTuple(ev) {
		if (this.hoverTuple) {
			unitTestHover('exit', this.hoverTuple.id);
		} else {
			unitTestHover('exit null');
		}
		this.clearHoverTuple();
	}
	onEnterTuple(ev) {
		let idTuple = evToId(ev);
		unitTestHover('enter', idTuple);
		if (this.hoverTuple != null && this.hoverTuple.id == idTuple) return;
		let idx = firstNumber(idTuple);
		let tuple = this.tuples[idx];
		this.hoverTuple = {id: idTuple, idx: idx, tuple: tuple};
		for (const s of tuple) {
			let ms = this.get(s).ms;
			if (ms) ms.blink();
		}
	}
	restoreNoFilterHighlightType(highlight = true) {
		this.elTuples.map(el => (el.style = '')); //all tuples are shown!
		this.clearHoverTuple();
		for (const s of this.sInTuples) {
			let ms = this.get(s).ms;
			if (ms) {
				ms.stopBlinking();
				ms.makeUnselectable();
			}
		}
		this.msSelected = null;
		if (highlight) this.highlightObjects();
		else {
			let tilesVisible = this.map.tiles['London'].isVisible;
			let nationsVisible = this.map.nations['Britain'].isVisible;
			if (!tilesVisible) {
				Object.values(this.map.tiles).map(o => o.show());
			}
			if (!nationsVisible) {
				Object.values(this.map.nations).map(o => o.show());
			}
		}
	}
	startManualSelection(phase, tuples, container, onSelectedHandler) {
		this.tuples = tuples;
		this.elTuples = arrChildren(container);
		for (const el of this.elTuples) {
			el.addEventListener('click', onSelectedHandler);
			el.addEventListener('mouseenter', this.onEnterTuple.bind(this));
			el.addEventListener('mouseleave', this.onExitTuple.bind(this));
		}

		this.sInTuples = [];
		this.byType = {};
		this.ituplesByType = {};
		this.ihideByType = {};
		this.ituplesByS = {};
		for (const [i, t] of this.tuples.entries()) {
			for (const s of t) {
				//special rule: ignore nationalities and unit_types
				//except if singleton! dann muessen die in other!!!!!
				if (this.assets.nationalityNames.includes(s) || this.assets.unitTypeNames.includes(s)) {
					if (t.length > 1)	continue;
				}

				addIf(s, this.sInTuples);

				let o = this.get(s);

				//special case for names that are tiles and nations
				if (['Albania', 'Malta', 'Gibraltar'].includes(s)) {
					if (this.phase == 'Movement') {
						if (t.length == 1) {
							o.type = 'nation';
						} else {
							o.type = 'tile';
						}
					} else if (this.phase == 'Government') {
						if (any(t, x => startsWith(x, 'action_'))) {
							o.type = 'nation';
						} else {
							o.type = 'tile';
						}
					}
				}

				//s by type
				addIfDict(o.type, s, this.byType);

				// tuples by type
				addIfDict(o.type, i, this.ituplesByType);

				// tuples by s
				addIfDict(s, i, this.ituplesByS);
			}
		}

		//eliminate buttons not in current types
		let types = Object.keys(this.byType);
		for (const t of this.types) {
			if (!types.includes(t)) {
				hide(this.buttons[t]);
			} else {
				show(this.buttons[t]);
			}
		}
		//for types in types but there are no buttons for them,
		//include them in 'other'
		this.extraTypes = [];
		for (const t of types) {
			if (!this.types.includes(t)) {
				this.extraTypes.push(t);
			}
		}

		//now ready to filter!
		//set default button for phase in case of phaseChange
		let recommendedHighlightType = this.checkPhaseChange(phase);
		unitTestFilterByType('270: ',recommendedHighlightType)
		if (!types.includes(recommendedHighlightType)) {
			recommendedHighlightType = types[0];
			unitTestFilterByType('273: ',recommendedHighlightType, types)
			// noch besser: sortiere nach wieviele werte
		}
		this.highlightType = recommendedHighlightType;
		unitTestFilterByType('nach setting highlightType 277: ',recommendedHighlightType,this.highlightType)
		for (const t in this.buttons) {
			if (t == this.highlightType) {
				this.selectButton(this.buttons[t]);
			} else {
				this.unselectButton(this.buttons[t]);
			}
		}

		//now highlight objects
		this.highlightObjects();
	}
	setHighlightType(button) {
		if (this.highlightType != null) {
			this.unselectButton(this.buttons[this.highlightType]);
		}
		this.highlightType = button.id.substring(1);
		unitTestFilterByType('setting new highlightType 292:', this.highlightType);
		this.selectButton(button);

		this.restoreNoFilterHighlightType();
	}
	selectButton(b) {
		b.style.backgroundColor = '#2196f3';
		b.style.color = 'white';
	}
	unselectButton(b) {
		b.style.backgroundColor = 'white';
		b.style.color = '#2196f3';
	}
	checkPhaseChange(newPhase) {
		if (this.phase == newPhase) return this.highlightType;

		//handle phase change: select default filter type for phase
		this.phase = newPhase;

		switch (this.phase) {
			case 'Government':
				return 'nation';
			case 'Movement':
			case 'Battle':
				return 'unit';
			case 'Spring':
			case 'Summer':
			case 'Fall':
				return 'other';
			case 'Setup':
			case 'Production':
			// hide(this.buttons['nation']);
			// hide(this.buttons['other']);
			// return 'tile';
			default:
				return 'tile';
		}
	}
}
