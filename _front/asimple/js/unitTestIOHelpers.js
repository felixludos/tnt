//#region unit test i/o helpers
function testOutput(o) {
  //deactivated!!!!
  return;
  for (const key in o) {
    //console.log(key,execOptions.outputLevel,isNumber(key),typeof(key))
    const arg = o[key];
    if (isNumber(key) && key <= execOptions.outputLevel) {
      console.log(H.moveCounter + ":", ...arg);
    }
  }
}

function unitTestAutoplay() {
  if (execOptions.activatedTests.includes("autoplay")) console.log(...arguments);
}
function unitTestCards() {
  if (execOptions.activatedTests.includes("cards")) console.log(...arguments);
}
function unitTestChoice() {
  if (execOptions.activatedTests.includes("choice")) console.log(...arguments);
}
function unitTestControl() {
  if (execOptions.activatedTests.includes("control")) console.log(...arguments);
}
function unitTestFilter() {
  if (execOptions.activatedTests.includes("filter")) console.log(...arguments);
}
function unitTestInit() {
  if (execOptions.activatedTests.includes("init")) console.log(...arguments);
}
function unitTestLoad() {
  if (execOptions.activatedTests.includes("load")) console.log(...arguments);
}
function unitTestMap() {
  if (execOptions.activatedTests.includes("map")) console.log(...arguments);
}
function unitTestMoving() {
  if (execOptions.activatedTests.includes("moving")) console.log(...arguments);
}
function unitTestRemoved() {
  if (execOptions.activatedTests.includes("removed")) console.log(...arguments);
}
function unitTestRemovedCheck(data) {
  return execOptions.activatedTests.includes("removed") && "removed" in data && !empty(Object.keys(data.removed));
}
function unitTestSave() {
  if (execOptions.activatedTests.includes("save")) console.log(...arguments);
}
function unitTestSender() {
  if (execOptions.activatedTests.includes("sender")) console.log(...arguments);
}
function unitTestUnits() {
  if (execOptions.activatedTests.includes("units")) console.log(...arguments);
}
function unitTestStrategy() {
  if (execOptions.activatedTests.includes("strategy")) console.log(...arguments);
}
//#endregion
