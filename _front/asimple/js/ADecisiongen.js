class ADecisiongen {
  constructor(assets) {
    this.assets = assets;
    this.choiceIndex = 0;
    this.choiceModulo = 3;
    this.callback = null;
    this.autoplay = true;
    this.tuples = [];
    this.selectionDone = false;
    this.bAuto = document.getElementById("bAuto");
  }
  chooseDeterministicRandomNonPassTuple(tuples) {
    let n = this.choiceIndex;
    this.choiceIndex = (this.choiceIndex + 1) % this.choiceModulo;

    if (tuples.length == 1) return tuples[0];
    else if (tuples.length < n) {
      return firstCond(tuples, t => !t.includes("pass"));
    } else {
      return firstCond(tuples.slice(n - 1), t => !t.includes("pass"));
    }
  }
  chooseRandomNonPassTuple(tuples) {
    if (tuples.length == 1) return tuples[0];
    else {
      let tuple = chooseRandomElement(tuples, t => !t.includes("pass"));
      return tuple;
    }
  }
  clear() {
    let d = document.getElementById("divSelect");
    clearElement(d);
  }
  genMove(tuples, callback, autoplay = true) {
    this.selectionDone = false;
    this.autoplay = autoplay;
    this.callback = callback;
    this.tuples = tuples;
    this.presentTuples(tuples);
    if (autoplay) {
      let tuple = this.chooseRandomNonPassTuple(tuples); //tuples[tuples.length - 1]; // this.chooseDeterministicRandomNonPassTuple(tuples);
      let index = tuples.indexOf(tuple);
      let msecs = 0;
      this.highlightTuple(index, msecs);
      setTimeout(() => callback(tuple), msecs + 30); // leave user time to see what happened!

      // callback(tuples[0]);
    }
  }
  highlightTuple(index, msecs = 30) {
    let d = document.getElementById("divSelect");
    let els = document.getElementsByTagName("a");
    let el = els[index];
    el.classList.add("selected");
    ensureInView(d, el);
    //$('#divSelect').animate({ scrollTop: $(el).offset().top }, msecs);
    //d.scrollTo(el);
    //test ob er automatisch scroll to index macht?!?
  }
  onClickStep() {
    this.callback(this.tuples[0]);
  }
  onSelected(ev) {
    if (!this.selectionDone) {
      this.selectionDone = true;
      let id = evToId(ev);
      let idx = firstNumber(id);
      this.callback(this.tuples[idx]);
    }
  }
  presentTuples(tuples) {
    this.clear();
    let d = document.getElementById("divSelect");
    d.scrollTop = 0;

    let i = 0;
    for (const t of tuples) {
      let el = document.createElement("a");
      el.id = "aaa" + i;
      i += 1;
      el.textContent = t;
      d.appendChild(el);
      if (!this.automove) {
        el.addEventListener("click", this.onSelected.bind(this));
      }
    }
  }
}
