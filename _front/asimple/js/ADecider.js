class ADecider{
  constructor(assets){
    this.assets=assets;
    this.choiceIndex = 0;
    this.choiceModulo = 3;

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
  pickTuple(tuples,callback){
    let tuple = this.chooseNthNonPassTuple(tuples, this.choiceIndex);
    this.choiceIndex = (this.choiceIndex + 1) % this.choiceModulo;
    callback(tuple);
  }
}