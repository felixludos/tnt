class ADecider{
  constructor(assets){
    this.assets=assets;
    this.choiceIndex = 0;
    this.choiceModulo = 3;

  }
  pickTuple(tuples,callback){
    let tuple = chooseNthNonPassTuple(tuples, this.choiceIndex);
    this.choiceIndex = (this.choiceIndex + 1) % this.choiceModulo;
    callback(tuple);
  }
}