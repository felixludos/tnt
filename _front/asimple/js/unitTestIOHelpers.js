//#region unit test i/o helpers
function testOutput(o) {
  for (const key in o) {
    const arg = o[key];
    switch (key) {
      case 0:
        console.log(arg);
        break;
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
//#endregion
