//#region tests for cards
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
function testCreateOneCard() {
  let c = generateCard();
  let cman = new ACards(assets);
  cman.createCard(c.id, c.o);
}
function testCreateNCards() {
  let cman = new ACards(assets);
  let n=20;
  for (let i = 0; i < n; i++) {
    let c = generateCard();
    cman.createCard(c.id, c.o);
  }
}
function testUpdateCardsPlacement() {
  let g = {},
    data = {},
    n = 20;
  for (let i = 0; i < n; i++) {
    let c = generateCard();
    data[c.id] = c.o;
  }
  let cman = new ACards(assets);
  cman.update(data, g);
}
function testCardsUpdate(data){
  cards.update(data, gameObjects);
}
//#endregion

//#region tests for server communication
//test setup, test production, test government,
function testLoadingSimpleOutput() {
  //input is chain response data
  execOptions.output='fine';
  var chain = ["myload/prod_complete.json", "refresh/" + player, "info/" + player, "status/" + player];
  sender.chainSend(chain, player, data=>console.log(data));
}
function testLoading2(callback){
  execOptions.output='raw';
  var sData={};
  sender.send("myload/prod_complete.json",data=>{
    console.log('myload response:',data);
    sender.send("refresh/" + player, data=>{
      console.log('refresh response:',data);
      sData.created=data;
      let chain = ["info/" + player, "status/" + player];
      sender.chainSend(chain, player, data=>{
        console.log('info+status response:',data);
        augment(sData,data);
        augment(sData.created,sData.updated);
        if ('waiting_for' in data && empty(getSet(data,'waiting_for'))){
          sender.send("action/" + player + '/none', data=>{
            console.log('empty action response:',data);
            augment(sData,data);
            console.log('=augmented data:',sData);
            if (callback) callback(sData);
          });
        }else{
          if (callback) callback(sData);
        }
      });
    });
  });
}
function testLoadingSequence(){
  sendLoading('gov_complete','USSR',stepToPresent,'raw');
}
//#endregion

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
