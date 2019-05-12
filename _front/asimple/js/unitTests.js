
//test setup, test production, test government, 

function testEndToEndCom(data) {
  //input is init chain response data
  msgCounter = 0;
  execOptions.output = "endToEnd";
  console.log("testEndToEndCom", execOptions.output);
  testCom(data);
}
function testFinegrainedCom(data) {
  //input is init chain response data
  msgCounter = 0;
  execOptions.output = "fine";
  console.log("testFinegrainedCom", execOptions.output);
  testCom(data);
}
function testCom(data) {
  let tuples = getTuples(data);

  console.assert(tuples.length > 0 || "waiting_for" in data, "ASSERTION FAIL!!! no action or waiting_for!!!!");

  if (empty(tuples)) {
    let msgAfter = "...waiting for player change!";

    if (execOptions.output == "endToEnd") {
      logFormattedData(data, msgCounter, msgAfter);
      msgCounter += 1;
    }

    alert("next");

    sendChangePlayer(data, testCom); //data supposedly contains waiting_for
    player = data.game.playerChangedTo;
    console.log("________ player:", player);
  } else {
    let tuple = chooseNthNonPassTuple(tuples, choiceIndex);
    choiceIndex = (choiceIndex + 1) % choiceModulo;
    let msgAfter = player + " chooses " + tuple.toString();

    if (execOptions.output == "endToEnd") {
      logFormattedData(data, msgCounter, msgAfter);
      msgCounter += 1;
    }

    alert("next");

    sendAction(player, tuple, testCom);
  }
}
function testRefresh() {
  let chain = ["refresh/" + player, "info/" + player, "status/" + player];
}
