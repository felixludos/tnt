//#region unit test i/o helpers
function testOutput(o) {
	//deactivated!!!!
	return;
	for (const key in o) {
		//console.log(key,execOptions.outputLevel,isNumber(key),typeof(key))
		const arg = o[key];
		if (isNumber(key) && key <= execOptions.outputLevel) {
			console.log(H.moveCounter + ':', ...arg);
		}
	}
}
function unitTest8() {
	if (execOptions.activatedTests.includes('8699')) console.log(...arguments);
}

function unitTestAutoplay() {
	if (execOptions.activatedTests.includes('autoplay')) console.log(...arguments);
}
function unitTestBattle() {
	if (execOptions.activatedTests.includes('battle')) console.log(...arguments);
}
function unitTestBuildUnit() {
	if (execOptions.activatedTests.includes('buildUnit')) console.log(...arguments);
}
function unitTestCard() {
	if (execOptions.activatedTests.includes('card')) console.log(...arguments);
}
function unitTestCards() {
	if (execOptions.activatedTests.includes('cards')) console.log(...arguments);
}
function unitTestCardsNew() {
	if (execOptions.activatedTests.includes('cardsNew')) console.log(...arguments);
}
function unitTestChoice() {
	if (execOptions.activatedTests.includes('choice')) console.log(...arguments);
}
function unitTestChoicemin() {
	if (execOptions.activatedTests.includes('choice') || execOptions.activatedTests.includes('choicemin')) console.log(...arguments);
}
function unitTestCombat() {
	if (execOptions.activatedTests.includes('combat')) console.log(...arguments);
}
function unitTestCombatStage(){
	if (execOptions.activatedTests.includes('stage')) console.log(...arguments);
}
function unitTestControl() {
	if (execOptions.activatedTests.includes('control')) console.log(...arguments);
}
function unitTestConvoy() {
	if (execOptions.activatedTests.includes('convoy')) console.log(...arguments);
}
function unitTestDecision() {
	if (execOptions.activatedTests.includes('decision')) console.log(...arguments);
}
function unitTestFilter() {
	if (execOptions.activatedTests.includes('filter')) console.log(...arguments);
}
function unitTestFilterByType() {
	if (execOptions.activatedTests.includes('filterByType')) console.log(...arguments);
}
function unitTestFilterNation() {
	if (execOptions.activatedTests.includes('filterNation')) console.log(...arguments);
}
function unitTestGameloop() {
	if (execOptions.activatedTests.includes('gameloop')) console.log(...arguments);
}
function unitTestHover() {
	if (execOptions.activatedTests.includes('hover')) console.log(...arguments);
}
function unitTestInit() {
	if (execOptions.activatedTests.includes('init')) console.log(...arguments);
}
function unitTestLoad() {
	if (execOptions.activatedTests.includes('load')) console.log(...arguments);
}
function unitTestLog() {
	if (execOptions.activatedTests.includes('log')) console.log(...arguments);
}
function unitTestMap() {
	if (execOptions.activatedTests.includes('map')) console.log(...arguments);
}
function unitTestMirrorBattle() {
	if (execOptions.activatedTests.includes('mirror')) console.log(...arguments);
}
function unitTestMoving() {
	if (execOptions.activatedTests.includes('moving')) console.log(...arguments);
}
function unitTestMS() {
	if (execOptions.activatedTests.includes('ms')) console.log(...arguments);
}
function unitTestPlayer() {
	if (execOptions.activatedTests.includes('player')) console.log(...arguments);
}
function unitTestRandom() {
	if (execOptions.activatedTests.includes('random')) console.log(...arguments);
}
function unitTestRemoved() {
	if (execOptions.activatedTests.includes('removed')) console.log(...arguments);
}
function unitTestRemove() {
	if (execOptions.activatedTests.includes('remove')) console.log(...arguments);
}
function unitTestRemovedCheck(data) {
	return execOptions.activatedTests.includes('removed') && 'removed' in data && !empty(Object.keys(data.removed));
}
function unitTestRequest() {
	if (execOptions.activatedTests.includes('request')) console.log(...arguments);
}
function unitTestResponse() {
	if (execOptions.activatedTests.includes('response')) console.log(...arguments);
}
function unitTestSave() {
	if (execOptions.activatedTests.includes('save')) console.log(...arguments);
}
function unitTestScenario(){
	if (execOptions.activatedTests.includes('scenario')) console.log(...arguments);
}
function unitTestSender() {
	if (execOptions.activatedTests.includes('sender')) console.log(...arguments);
}
function unitTestServer() {
	if (execOptions.activatedTests.includes('server')) console.log(...arguments);
}
function unitTestSkip() {
	if (execOptions.activatedTests.includes('skip')) console.log(...arguments);
}
function unitTestUnits() {
	if (execOptions.activatedTests.includes('units')) console.log(...arguments);
}
function unitTestUpgradeUnit() {
	if (execOptions.activatedTests.includes('upgradeUnit')) console.log(...arguments);
}
function unitTestUnitVisibility(){
	if (execOptions.activatedTests.includes('visible')) console.log(...arguments);
}
function unitTestStrategy() {
	if (execOptions.activatedTests.includes('strategy')) console.log(...arguments);
}
//#endregion
