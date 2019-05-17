//#region unit test i/o helpers
function testOutput(o) {
  for (const key in o) {
    //console.log(key,execOptions.outputLevel,isNumber(key),typeof(key))
    const arg = o[key];
    if (isNumber(key) && key <= execOptions.outputLevel){
      console.log(key+':',arg);
    }
  }
}
function unitTestCards() {
  if (execOptions.activatedTests.includes("cards")) console.log(...arguments);
}
function unitTestMap(){
  if (execOptions.activatedTests.includes("map")) console.log(...arguments);
}
function unitTestUnits(){
  if (execOptions.activatedTests.includes("units")) console.log(...arguments);
}
function unitTestControl(){
  if (execOptions.activatedTests.includes("control")) console.log(...arguments);
}
//#endregion
