//#region unit test i/o helpers
function testOutput(o) {
  for (const key in o) {
    const arg = o[key];
    switch (key) {
      case "msmin":
        console.log(arg);
        break;
    }
  }
}
function unitTestCards() {
  if (execOptions.activatedTests.includes("cards")) console.log(...arguments);
}
//#endregion
