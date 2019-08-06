class ADecisiongen {
	constructor(assets, map, cards, units, sender) {
		this.assets = assets;
		this.autoplay = true;
		this.decisionMode = 'priority'; // 'seed' | 'server' | 'manual' | 'priority' | 'scenario'
		this.priorityDecisions = []; //when set and auto, will decide for these if avail!
		this.scenario = null;
		this.seed = null;

		this.phase = null;
		this.callback = null;
		this.tuple = null;
		this.tuples = [];
		this.choiceCompleted = false;
		this.choiceList = {}; //previous choices TODO: rename to choiceHistory

		this.UI = new ADecisionUI(assets, map, cards, units);

		this.playerStrategy = {};
		this.playerStrategy['Axis'] = new AStrategy(this.assets); //new AStrategy(this.assets, {Government: t => anyStartsWith(t, "action_")});
		this.playerStrategy['West'] = new AStrategy(this.assets); //new AStrategy(this.assets, {Government: t => t.includes("pass")});
		this.playerStrategy['USSR'] = new AStrategy(this.assets); //new AStrategy(this.assets, {Government: t => t.includes("pass")});
	}
	decideAutoplay(G) {
		unitTestDecision('decideAutoplay', G, this.decisionMode);
		if (!this.choiceCompleted) {
			this.choiceCompleted = true;

			//select tuple
			if (this.decisionMode == 'scenario' && this.scenario != null){
				//let scenario agent find a matching tuple to its goal description, tuple[0] if none
				// let container = document.getElementById('divSelect');
				this.tuple = this.scenario.findMatch(G);
				if (!this.tuple){
					this.tuple = this.tuples[0];
					// this.choiceCompleted = false;
					// this.UI.startManualSelection(this.phase, this.tuples, container, this.onSelected.bind(this));
					// return;
				}

			}else if (this.decisionMode == 'priority') {
				// use simple priority list, take tuple containing highest priority keyword if any
				//default: take tuple[0]
				let found = false;
				for (const keyword of this.priorityDecisions) {
					let t = firstCond(this.tuples, t => t.includes(keyword));
					if (t) {
						this.tuple = t;
						found = true;
						break;
					}
				}
				if (!found) this.tuple = this.tuples[0];
				console.log(this.tuple);

			} else if (this.decisionMode == 'server') {
				//take random number generator from server and use that tuple
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
				// take client seed as random seed and use that tuple
				let n = this.nextRandom(this.tuples.length);
				this.tuple = this.tuples[n];
				unitTestChoice('decideAutoplay seed decision:', n, this.tuple);

			} else {
				//whatever playerStrategy would say, dont remember unfortunately!
				this.tuple = this.playerStrategy[G.player].chooseTuple(G);
			}

			// show, record in selectedTuples, callback
			this.UI.restoreNoFilterHighlightType(false);
			this.highlightChosenTuple(this.tuple);
			setTimeout(() => this.callback(this.tuple), 10); // leave user time to see what happened!

		} else {
			alert('decideAutoplay: already selected!!!');
		}
	}
	genMove(G, callback, autoplay = true) {
		unitTestDecision('new genMove call!!! phase:', G.phase, 'autoplay:', autoplay);
		this.callback = callback;
		this.tuples = G.tuples;
		this.tuple = null;
		if (this.seed == null) {
			this.seed = G.start.seed;
		}
		if (autoplay != this.autoplay) {
			this.autoplay = autoplay;
		}
		if (G.phase != this.phase) {
			this.phase = G.phase;
		}
		this.UI.clearHoverTuple();
		let container = this.presentTuples(this.tuples);
		this.choiceCompleted = false;
		if (autoplay) {
			this.UI.hideUI();
			this.decideAutoplay(G);
		} else {
			this.UI.startManualSelection(this.phase, this.tuples, container, this.onSelected.bind(this));
		}
	}
	highlightChosenTuple(tuple, msecs = 30) {
		// highlight element in selection list
		let index = this.tuples.indexOf(tuple);
		let i = Object.keys(this.choiceList).length;
		let s = '' + index + ':' + tuple.toString();
		unitTestChoicemin(i, 'th choice', index, 'of', this.tuples.length, ':', this.tuple.toString());
		this.choiceList[i] = {index: index, tuple: tuple};
		let d = document.getElementById('divSelect');
		let els = document.getElementsByTagName('a');
		let el = els[index];
		el.classList.add('selected');
		ensureInView(d, el);
	}
	loadScenario(data,G) {
		this.scenario = new Scenario(this.assets,data,G);
		this.decisionMode = 'scenario';
	}
	nextRandom(max) {
		unitTestRandom('nextRandom max =', max, ', this.seed =', this.seed);
		var x = Math.sin(this.seed++) * 10000;
		let res = Math.floor((x - Math.floor(x)) * max);
		return res;
	}
	onClickStep(G) {
		if (!this.choiceCompleted) {
			if (!sameList(this.tuples, G.tuples)) {
				alert('onClickStep: this.tuples not same as G.tuples!');
			}
			this.decideAutoplay(G);
		}
	}
	onSelected(ev) {
		if (!this.choiceCompleted) {
			this.choiceCompleted = true;
			let id = evToId(ev);
			let idx = firstNumber(id);
			this.tuple = this.tuples[idx];
			unitTestHover('select', this.tuple);
			this.highlightChosenTuple(this.tuple);
			this.UI.restoreNoFilterHighlightType(false);
			this.callback(this.tuple);
		}
	}
	presentTuples(tuples) {
		let d = document.getElementById('divSelect');
		//this.UI.clearElTuples(); //brauch ich vielleicht garnicht!!!
		clearElement(d);
		d.scrollTop = 0;

		let i = 0;
		for (const t of tuples) {
			//present in selection list:
			let el = document.createElement('a');
			el.id = 'aaa' + i;
			i += 1;
			el.textContent = t;
			d.appendChild(el);
		}
		return d;
	}
}
