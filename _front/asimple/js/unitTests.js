/*TODO: 
- generate sample objects for all types
ok -- generateCard
-- simulate updating cards
*/
var unitTestId = 0;
function generateCard(hasOwner = true, hasContent = true, visibleToN = 1) {
  let id = "action_" + unitTestId;
  unitTestId += 1;
  let o = JSON.parse(`
  {
    "wildcard": "Isolationism",
    "season": "Fall",
    "priority": "H",
    "value": 8,
    "obj_type": "action_card",
    "visible": {
      "xset": [
        "Axis"
      ]
    },
    "owner": "Axis",
    "_id": "action_48"
  }
  `);
  if (!hasContent) {
    o = JSON.parse(`
    {
    "obj_type": "action_card",
    "visible": {
      "xset": [
        "Axis"
      ]
    },
    "owner": "Axis",
    "_id": "action_48"
  }
  `);
  }
  o._id = id;
  if (!hasOwner) {
    delete o.owner;
  }
  if (visibleToN == 0) {
    o.visible.xset = [];
  } else if (visibleToN == 2) {
    o.visible.xset.push("West");
  } else if (visibleToN == 3) {
    o.visible.xset = ["Axis", "West", "USSR"];
  }
  return {id: id, o: o};
}
function testUpdateCardsPlacement(){
  for (let i = 0; i < n; i++) {
    let c=generateCard();
  }
}

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
