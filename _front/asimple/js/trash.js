class ADecisionGenTrash {
	onSelectedUnit(ev) {
		if (!this.selectionDone) {
			let idUnit = evToId(ev);
			//find tuple with this unit and the selected tile in it
			for (const t of this.tuples) {
				if (t.includes(this.msSelected.id) && t.includes(idUnit)) {
					this.selectionDone = true;
					this.clearHighlighting();
					this.tuple = t;
					this.highlightTuple(t);
					this.callback(t);
				}
			}
		}
	}
	filterTuples(id) {
		//this.clearHighlighting();
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
					if (s == id) continue;
					this.highlightObject(s);
				}
			}
		}
	}
}
