//#region test globals
var unitTestId = 0;
//#endregion

//#region tests for cards
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
function testCreateOneCard() {
  let c = generateCard();
  let cman = new ACards(assets);
  cman.createCard(c.id, c.o);
}
function testCreateNCards() {
  let cman = new ACards(assets);
  let n = 20;
  for (let i = 0; i < n; i++) {
    let c = generateCard();
    cman.createCard(c.id, c.o);
  }
}
function testUpdateCards(filename = "prod_complete", player = "Axis") {
  execOptions.skipTo = {year: 1935, phase: "any", player: "any", step: 0}
  sendLoading(filename, player, presentUpdateCardsOnly);
}
function presentUpdateCardsOnly(data) {
  console.log(data)
  if (isPlayerChanging) {
    isPlayerChanging = false;
    page.updateGameView(player, execOptions);
  }

  updateStatus(data);
  updateLog(data);

  updateGameObjects(data);
  //console.log('presentUpdateCardsOnly')
  cards.update(player, data, gameObjects);

  gameObjects = extend(true, gameObjects, data.created);

  //alert('press to continue...')
  processActions(data, presentUpdateCardsOnly);
  //nextAction = () => processActions(data, presentUpdateCardsOnly);
  //show(bStep);
}
//#endregion

//#region tests for server communication
function testInitToEnd(player = "USSR", seed = 0) {
  sendInit(player, d => testRunToEnd(d, player), seed);
}
function testLoadToEnd(player = "Axis", filename = "gov_complete") {
  sendLoading(filename, player, d => testRunToEnd(d, player), "raw");
}
function testRunToEnd(data, player) {
  let tuples = getTuples(data);
  if (empty(tuples)) {
    let waitingSet = getSet(data, "waiting_for");
    if (empty(waitingSet)) {
      error("NO ACTIONS AND EMPTY WAITING SET... sending empty action!!!");
      sendAction(player, ["none"], d => testRunToEnd(d, player));
    } else {
      let nextPlayer = waitingSet[0];
      sendChangeToPlayer(nextPlayer, d1 => {
        //console.log("player changed to", nextPlayer, "on server");
        //console.log(d1);
        testRunToEnd(d1, nextPlayer);
      });
    }
  } else {
    let tuple = chooseNthNonPassTuple(tuples, choiceIndex);
    choiceIndex = (choiceIndex + 1) % choiceModulo;
    console.log(player + " chooses " + tuple.toString());
    sendAction(player, tuple, d => testRunToEnd(d, player));
  }
}
function testPhaseSteps(player = "Axis", filename = "gov_complete") {
  sendLoading(filename, player, d => testStep(d, player), "raw");
}
function testStep(data, player) {
  let tuples = getTuples(data);
  if (empty(tuples)) {
    let waitingSet = getSet(data, "waiting_for");
    if (empty(waitingSet)) {
      error("NO ACTIONS AND EMPTY WAITING SET... sending empty action!!!");
      nextAction = () => sendAction(player, ["none"], d => testStep(d, player));
    } else {
      let nextPlayer = waitingSet[0];

      nextAction = () =>
        sendChangeToPlayer(nextPlayer, d1 => {
          console.log("player changed to", nextPlayer, "on server");
          //console.log(d1);
          testStep(d1, nextPlayer);
        });
    }
  } else {
    let tuple = chooseNthNonPassTuple(tuples, choiceIndex);
    choiceIndex = (choiceIndex + 1) % choiceModulo;
    console.log(player + " chooses " + tuple.toString());
    nextAction = () => sendAction(player, tuple, d => testStep(d, player));
  }
  show(bStep);
}

//#endregion
