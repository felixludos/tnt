class ADeciderSimpleList {
  constructor(assets) {
    this.assets = assets;
    this.choiceIndex = 0;
    this.choiceModulo = 3;
    this.callback = null;
    this.pickMode = "auto";
    this.tuples = [];
    this.selectionDone = false;
  }
  chooseRandomNonPassTuple(tuples) {
    if (tuples.length == 1) return tuples[0];
    else {
      let tuple = chooseRandomElement(tuples, t => !t.includes("pass"));
      return tuple;
    }
  }
  chooseFirstNonPassTuple(tuples) {
    if (tuples.length == 1) return tuples[0];
    else return firstCond(tuples, t => !t.includes("pass"));
  }
  chooseNthNonPassTuple(tuples, n) {
    if (tuples.length == 1) return tuples[0];
    else if (tuples.length < n) {
      return firstCond(tuples, t => !t.includes("pass"));
    } else {
      return firstCond(tuples.slice(n - 1), t => !t.includes("pass"));
    }
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
  onSelected(ev) {
    if (!this.selectionDone) {
      this.selectionDone = true;
      let id = evToId(ev);
      let idx = firstNumber(id);
      console.log("tuple selected:", this.tuples[idx]);
      this.callback(this.tuples[idx]);
    }
  }
  pickAuto(tuples, callback) {
    this.pickMode = "auto";
    this.selectionDone = true;
    this.presentTuples(tuples);

    let tuple = this.chooseRandomNonPassTuple(tuples); //tuples[tuples.length - 1]; // this.chooseDeterministicRandomNonPassTuple(tuples);
    let index = tuples.indexOf(tuple);

    let msecs = 300;
    this.highlightTuple(index, msecs);

    setTimeout(() => callback(tuple), msecs + 100); // leave user time to see what happened!
  }
  pickUser(tuples, callback) {
    this.pickMode = "user";
    this.tuples = tuples;
    this.callback = callback;
    this.selectionDone = false;
    this.presentTuples(tuples);
  }
  presentTuples(tuples) {
    let d = document.getElementById("divSelect");
    clearElement(d);
    d.scrollTop = 0;
    let handDiv = document.getElementById("hand_area");
    let hDiv = firstNumber(handDiv.style.height);
    let hd = hDiv + 760 + 8;
    d.style.height = hd + "px";

    let i = 0;
    for (const t of tuples) {
      let el = document.createElement("a");
      el.id = "aaa" + i;
      i += 1;
      el.textContent = t;
      d.appendChild(el);
      if (this.pickMode == "user") {
        el.addEventListener("click", this.onSelected.bind(this));
      }
    }
  }
}
