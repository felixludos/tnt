class ADecisiongen {
	constructor(assets, map, cards, units, sender) {
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

		this.filterMode = null; // 'unit' | 'action_card' | 'investment_card' | 'nation' | 'tile' | 'influence'
		this.setFilterMode(document.getElementById('btile'));
		this.hoverTuple = null; //{id:id, msList:[ms,ms,...]} or null if no tuple is hovered over
		this.msInTuples = {};
		this.msSelected = null; //selected ms or null

		this.playerStrategy = {};
		this.playerStrategy['Axis'] = new AStrategy(this.assets); //new AStrategy(this.assets, {Government: t => anyStartsWith(t, "action_")});
		this.playerStrategy['West'] = new AStrategy(this.assets); //new AStrategy(this.assets, {Government: t => t.includes("pass")});
		this.playerStrategy['USSR'] = new AStrategy(this.assets); //new AStrategy(this.assets, {Government: t => t.includes("pass")});
	}
	setFilterMode(button) {
		if (this.filterMode != null) {
			//console.log('setFilterMode',this.filterMode,button)
			let b = document.getElementById('b' + this.filterMode);
			b.style.backgroundColor = 'white';
			b.style.color = '#2196f3';
		}
		this.filterMode = button.id.substring(1);
		button.style.backgroundColor = '#2196f3';
		button.style.color = 'white';
		// document.getElementById('b'+type).classList.add('toggleSelected');
	}
	clear() {
		let d = document.getElementById('divSelect');
		clearElement(d);
		for (const id in this.msInTuples) {
			let ms = this.msInTuples[id];
			ms.unhighlight();
			ms.unselect();
			ms.clickHandler == null;
			ms.disable();
		}
		this.msInTuples = {};
		this.msSelected = null;
	}
	clearHighlighting() {
		this.clearHoverTuple();
		for (const id in this.msInTuples) {
			let ms = this.msInTuples[id];
			ms.unhighlight();
			ms.unselect();
		}
	}
	clearHoverTuple() {
		if (this.hoverTuple) {
			for (const ms of this.hoverTuple.msList) {
				if (ms == this.msSelected) continue;
				ms.unselect();
			}
			this.hoverTuple = null;
		}
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
			this.highlightTuple(this.tuple);
			setTimeout(() => this.callback(this.tuple), 10); // leave user time to see what happened!
		} else {
			alert('decideAutoplay: already selected!!!');
		}
	}
	filterList(ev) {
		let idElem = evToId(ev);
		unitTestFilter('filterList', idElem);
		if (this.msSelected != null && this.msSelected.elem.id == idElem) {
			this.clearHighlighting();
			this.highlightTiles();
			this.unfilterTuples();
			this.msSelected = null;
		} else {
			this.clearHighlighting();
			let id = this.assets.uid2id[idElem];
			let ms = this.msInTuples[id];
			this.msSelected = ms;
			ms.select(); // select clicked tile
			this.filterTuples(id);
		}
	}
	filterTuples(id) {
		unitTestFilter('filterTuples', id);
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
				unitTestFilter('found match!', t.toString());
				//TODO: highlight related units on map if this is a movement tuple (length = 2)
				for (const s of t) {
					let idUnit = s;
					let unit = this.units.getUnit(idUnit);
					unitTestFilter(s, 'is a candidate unit', unit);
					if (unit) {
						unitTestFilter('unit found!!!', unit);
						let ms = unit.ms;
						this.msInTuples[idUnit] = ms;
						ms.highlight();
						ms.enable();
						ms.clickHandler = this.onSelectedUnit.bind(this);
					}
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
		this.tuple = null;
		this.presentTuples(this.tuples);
		this.choiceCompleted = false; //manual selection
		if (autoplay) {
			this.decideAutoplay(G);
		}
	}
	highlightTiles() {
		//highlight tiles in moves and caders if any:
		for (const t of this.tuples) {
			if (t.length == 2 && any(t, s => this.assets.tileNames.includes(s))) {
				let tilename = firstCond(t, s => this.assets.tileNames.includes(s));
				let ms = this.map.tiles[tilename];
				ms.highlight();
				ms.enable();
				ms.clickHandler = this.filterList.bind(this);
				this.msInTuples[ms.id] = ms;
			}
		}
	}
	highlightTuple(tuple, msecs = 30) {
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
		let id = evToId(ev);
		if (this.hoverTuple != null && this.hoverTuple.id == id) return;
		let idx = firstNumber(id);
		let tuple = this.tuples[idx];
		this.hoverTuple = {id: id, msList: [], idx: idx, tuple: tuple};
		for (const id of tuple) {
			//get ms for this id
			let ms = id in units.uis ? units.uis[id].ms : id in map.tiles ? map.tiles[id] : null;
			if (!ms) ms = id in map.nations ? map.nations[id] : id in map.influences ? map.influences[id] : null;
			if (!ms) ms = cards.inVisibleHand(id) ? cards.getCardMs(id) : null;
			if (ms) {
				ms.select();
				this.hoverTuple.msList.push(ms);
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
			this.highlightTuple(this.tuple);
			this.callback(this.tuple);
		}
	}
	onSelectedUnit(ev) {
		// if (!this.selectionDone) {
		//   let idUnit = evToId(ev);
		//   //find tuple with this unit and the selected tile in it
		//   for (const t of this.tuples) {
		//     if (t.includes(this.msSelected.id) && t.includes(idUnit)) {
		//       this.selectionDone = true;
		//       this.clearHighlighting();
		//       this.tuple = t;
		//       this.highlightTuple(t);
		//       this.callback(t);
		//     }
		//   }
		// }
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

			//attach selected event when manual selection
			if (!this.autoplay) {
				el.addEventListener('click', this.onSelected.bind(this));
				el.addEventListener('mouseenter', this.onEnterTuple.bind(this));
				el.addEventListener('mouseleave', this.onExitTuple.bind(this));
			}
		}

		if (!this.autoplay) this.highlightTiles();
	}
	unfilterTuples() {
		let d = document.getElementById('divSelect');
		let elTuples = arrChildren(d);
		for (const el of elTuples) {
			el.style = '';
		}
	}
}
