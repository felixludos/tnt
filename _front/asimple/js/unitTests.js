//#region test globals
var unitTestId = 0;
//#endregion

//#region generators
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
function testIntegrationCards(filename = "prod_complete", player = "Axis") {
  setSkipOptions({step: 10});
  execOptions.output = "none";
  addIf("cards", execOptions.activatedTests);
  if (empty(filename)) {
    sendInit(player, gameloop, 0);
  } else {
    sendLoading(filename, player, gameloop);
  }
}
//#endregion

//#region tests for map: influence, tracks, tiles, nations
function testIntegrationMap(filename = "prod_complete", player = "Axis") {
  setSkipOptions({step: 10});
  execOptions.output = "none";
  addIf("map", execOptions.activatedTests);
  if (empty(filename)) {
    sendInit(player, gameloop, 0);
  } else {
    sendLoading(filename, player, gameloop);
  }
}
//#endregion

//#region tests for units
function testCreateSingleUnit() {
  execOptions.output = "none";
  addIf("units", execOptions.activatedTests);
  let data = generateUnitList();
  let player = "West";
  for (const id in data.created) {
    const o = data.created[id];
    units.createUnit(id, o, player);
    break;
  }
}
function testCreateMultipleUnitsOnSameTile() {
  execOptions.output = "none";
  addIf("units", execOptions.activatedTests);
  let data = generateUnitList();
  let player = "West";
  for (const id in data.created) {
    const o = data.created[id];
    o.tile = "London";
    o.nationality = "Britain";
    units.createUnit(id, o, player);
  }
  player = "USSR";
  for (const id in data.created) {
    let idNew = id + 200;
    const o = data.created[id];
    o.tile = "Berlin";
    o.nationality = "Germany";
    o._id = idNew;
    units.createUnit(idNew, o, player);
  }
}
function testIntegrationUnits(filename = "", player = "USSR", seed = 4) {
  execOptions.output = "none";
  addIf("units", execOptions.activatedTests);

  if (empty(filename)) {
    sendInit(player, gameloop, seed);
  } else {
    sendLoading(filename, player, gameloop);
  }
}
//#endregion

//#region tests for server communication
function testInitToEnd(player = "USSR", seed = 0) {
  hide(bStop);
  sendInit(player, d => testRunToEnd(d, player), seed);
}
function testLoadToEnd(player = "Axis", filename = "setup_complete") {
  hide(bStop);
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
        testRunToEnd(d1, nextPlayer);
      });
    }
  } else {
    decider.pickTuple(tuples, t => {
      console.log(player + " chooses " + t.toString());
      sendAction(player, t, d => testRunToEnd(d, player));
    });
  }
}
//#endregion

//#region tests for server communication - not sure if work!
function testStepByStep(player = "Axis", filename = "gov_complete") {
  sendLoading(filename, player, d => testStep(d, player), "raw");
}
function testStep(data, player) {
  //doesn't work!!!???
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
