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
  clear() {
    let d = document.getElementById("divSelect");
    clearElement(d);
  }
  genMove(tuples, callback, autoplay = true) {
    this.selectionDone = false;
    this.autoplay = autoplay;
    this.callback = callback;
    this.tuples = tuples;
    if (autoplay) callback(tuples[0]);
    else {
      this.presentTuples(tuples);
    }
  }
  onClickStep() {
    this.callback(this.tuples[0]);
  }
  onSelected(ev) {
    if (!this.selectionDone) {
      this.selectionDone = true;
      let id = evToId(ev);
      let idx = firstNumber(id);
      console.log("tuple selected:", this.tuples[idx]);
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
