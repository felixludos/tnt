class ADecisiongen {
  constructor(assets) {
    this.assets = assets;
    this.callback = null;
    this.autoplay = true;
    this.tuples = [];
    this.selectionDone = false;
    this.bAuto = document.getElementById("bAuto");
    this.playerStrategy = {};

    //init strategies
    this.playerStrategy["Axis"] = new AStrategy(this.assets, {Government: t => anyStartsWith(t, "action_")});
    this.playerStrategy["West"] = new AStrategy(this.assets, {Government: t => t.includes("pass")});
    this.playerStrategy["USSR"] = new AStrategy(this.assets, {Government: t => t.includes("pass")});
  }
  clear() {
    let d = document.getElementById("divSelect");
    clearElement(d);
  }
  genMove(G, callback, autoplay = true) {
    this.selectionDone = false;
    this.autoplay = autoplay;
    this.callback = callback;
    this.tuples = G.tuples;
    this.presentTuples(this.tuples);
    if (autoplay) {
      let tuple = this.playerStrategy[G.player].chooseTuple(G);
      // if (G.phase == "Government") {
      //   alert(G.player + " chooses " + tuple.toString());
      // }
      let index = this.tuples.indexOf(tuple);
      let msecs = 0;
      this.highlightTuple(index, msecs);
      setTimeout(() => callback(tuple), msecs + 30); // leave user time to see what happened!

      // callback(this.tuples[0]);
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
