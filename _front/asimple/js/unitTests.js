//#region test globals
var unitTestId = 0;
//#endregion

//#region generators
function generateUnitList() {
  data = {
    created: {
      "246": {
        nationality: "Britain",
        tile: "London",
        type: "Fleet",
        cv: 4,
        obj_type: "unit",
        visible: {
          xset: ["West"]
        },
        _id: 246
      },
      "246": {
        nationality: "Britain",
        tile: "London",
        type: "Fleet",
        cv: 4,
        obj_type: "unit",
        visible: {
          xset: ["West"]
        },
        _id: 246
      },
      "247": {
        nationality: "Britain",
        tile: "Gibraltar",
        type: "Fortress",
        cv: 1,
        obj_type: "unit",
        visible: {
          xset: ["West"]
        },
        _id: 247
      },
      "248": {
        nationality: "Britain",
        tile: "Karachi",
        type: "Fortress",
        cv: 1,
        obj_type: "unit",
        visible: {
          xset: ["West"]
        },
        _id: 248
      }
    }
  };
  return data;
}
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
  setSkipOptions({step: 10});
  execOptions.output = "none";
  addIf("cards", execOptions.activatedTests);
  if (empty(filename)) {
    sendInit(player, presentUpdateCardsOnly, (seed = 0));
  } else {
    sendLoading(filename, player, presentUpdateCardsOnly);
  }
}
function testUpdateCardsAndMap(filename = "", player = "Axis") {
  setSkipOptions({step: 42});
  execOptions.output = "none";
  addIf("cards", execOptions.activatedTests);
  addIf("map", execOptions.activatedTests);
  if (empty(filename)) {
    sendInit(player, present, (seed = 0));
  } else {
    sendLoading(filename, player, present);
  }
}
function presentUpdateCardsOnly(data) {
  if (isPlayerChanging) {
    isPlayerChanging = false;
    page.updateGameView(player, execOptions);
  }

  updateStatus(data);
  updateLog(data);

  mergeCreatedAndUpdated(data);

  //each manager in turn updates gameObjects!!!
  cards.update(player, data, gameObjects);

  processActions(data, presentUpdateCardsOnly);
}
//#endregion

//#region tests for map
function testUpdateMap(filename = "prod_complete", player = "USSR") {
  execOptions.output = "none";
  addIf("map", execOptions.activatedTests);
  if (empty(filename)) {
    sendInit(player, presentUpdateMapOnly, (seed = 0));
  } else {
    sendLoading(filename, player, presentUpdateMapOnly);
  }
}

function presentUpdateMapOnly(data) {
  if (isPlayerChanging) {
    isPlayerChanging = false;
    page.updateGameView(player, execOptions);
  }

  updateStatus(data);
  updateLog(data);

  mergeCreatedAndUpdated(data);

  //each manager in turn updates gameObjects!!!
  map.update(data, gameObjects);

  processActions(data, presentUpdateMapOnly);
}
//#endregion

//#region tests for units
function testDrawSingleUnit() {
  execOptions.output = "none";
  addIf("units", execOptions.activatedTests);
  let data = generateUnitList();
  let player = 'West';
  for (const id in data.created) {
    const o = data.created[id];
    units.createUnit(id,o,player);
    break;
  }
}
function testUpdateUnits(filename = "", player = "USSR") {
  execOptions.output = "none";
  addIf("units", execOptions.activatedTests);
  if (empty(filename)) {
    sendInit(player, presentUpdateUnitsOnly, (seed = 0));
  } else {
    sendLoading(filename, player, presentUpdateUnitsOnly);
  }
}

function presentUpdateUnitsOnly(data) {
  if (isPlayerChanging) {
    isPlayerChanging = false;
    page.updateGameView(player, execOptions);
  }

  updateStatus(data);
  updateLog(data);

  mergeCreatedAndUpdated(data);

  //each manager in turn updates gameObjects!!!
  units.update(data, gameObjects);

  processActions(data, presentUpdateUnitsOnly);
}
//#endregion

//#region tests for server communication
function testInitToEnd(player = "USSR", seed = 0) {
  sendInit(player, d => testRunToEnd(d, player), seed);
}
function testLoadToEnd(player = "Axis", filename = "setup_complete") {
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
  //doesn't work!!!
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
          //console.log("player changed to", nextPlayer, "on server");
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
