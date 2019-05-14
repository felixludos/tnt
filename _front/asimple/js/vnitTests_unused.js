//test setup, test production, test government,
function testLoading2(callback) {
  execOptions.output = "raw";
  var sData = {};
  sender.send("myload/prod_complete.json", data => {
    console.log("myload response:", data);
    sender.send("refresh/" + player, data => {
      console.log("refresh response:", data);
      sData.created = data;
      let chain = ["info/" + player, "status/" + player];
      sender.chainSend(chain, player, data => {
        console.log("info+status response:", data);
        sData=augment(sData, data);
        sData=augment(sData.created, sData.updated);
        if ("waiting_for" in data && empty(getSet(data, "waiting_for"))) {
          sender.send("action/" + player + "/none", data => {
            console.log("empty action response:", data);
            sData=augment(sData, data);
            console.log("=augmented data:", sData);
            if (callback) callback(sData);
          });
        } else {
          if (callback) callback(sData);
        }
      });
    });
  });
}
function testUpdateCardsPlacement() {
  let g = {};
  let data = {};
  let n = 20;
  for (let i = 0; i < n; i++) {
    let c = generateCard();
    data[c.id] = c.o;
  }
  let cman = new ACards(assets);
  cman.update(data, g);
}
function testCardsUpdate(data) {
  cards.update(data, gameObjects);
}



//#region trash
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
function testRefresh() {
  let chain = ["refresh/" + player, "info/" + player, "status/" + player];
}
function testLoadingSimpleOutput() {
  //input is chain response data
  execOptions.output = "fine";
  var chain = ["myload/prod_complete.json", "refresh/" + player, "info/" + player, "status/" + player];
  sender.chainSend(chain, player, data => console.log(data));
}
//#endregion
