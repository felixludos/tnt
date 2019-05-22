class AStrategy {
  constructor(assets, initialStrategy = {}) {
    this.choiceIndex = 0;
    this.choiceModulo = 5;
    this.assets = assets;
    this.phasePred = initialStrategy; //cond on tuple per phase
    this.deterministic = true;
  }
  chooseTuple(G) {
    let n = -1; //for random choice
    if (this.deterministic) {
      n = this.choiceIndex;
      this.choiceIndex = (this.choiceIndex + 1) % this.choiceModulo;
    }
    unitTestStrategy("chooseTuple:", G.player, G.phase, this.phasePred);
    let tuples = G.tuples;
    if (G.phase in this.phasePred) {
      unitTestStrategy("found strategy!", this.phasePred[G.phase]);
      return chooseDeterministicOrRandom(n, tuples, this.phasePred[G.phase]);
    } else {
      unitTestStrategy("no strategy available!!");
      return chooseDeterministicOrRandom(n, tuples, t => !t.includes("pass")); // this.chooseRandomNonPassTuple(this.tuples); //this.chooseFavIfPossible(tuples,'investment_card'); //tuples[tuples.length - 1]; // this.chooseDeterministicRandomNonPassTuple(tuples);
    }
  }

  //unused code**********************************************
  chooseFavIfPossible(tuples, fav) {
    if (tuples.length == 1) return tuples[0];
    else {
      let favTuples = tuples.filter(t => t.includes(fav));
      console.log("favTuples:", favTuples);
      let tuple = empty(favTuples) ? chooseRandomElement(tuples, t => !t.includes("pass")) : favTuples[0];
      console.log("chooseFavIfPossible outcome:", tuple);

      return tuple;
    }
  }

  getChooser(phase) {
    switch (phase) {
      case "spring":
      case "summer":
      case "fall":
      case "winter":
      case "season":
        return this.phase.season.favAction;
        break;
      default:
        return this.phase[phase].favAction;
        break;
    }
  }
  setFav(phase, cond) {
    switch (phase) {
      case "spring":
      case "summer":
      case "fall":
      case "winter":
      case "season":
        this.phase.season.favAction = cond;
        break;
      default:
        this.phase[phase].favAction = cond;
        break;
    }
  }
}
