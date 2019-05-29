//#region tnt helpers

function getTuples(data) {
  let tuples = [];
  //console.log(data);
  //console.log("getTuples", tuples);
  if ("actions" in data) {
    // tuples = data.actions;
    tuples = expand(data.actions);
    tuples.sort();
    //tuples = "set" in data.actions ? expand(data.actions) : data.actions;

    if (!empty(tuples) && tuples.length == 1 && !Array.isArray(tuples[0])) {
      //console.log("tuple correction", tuples);
      tuples = [tuples]; //correct single with just 'pass' eg.
    }
  }
  //console.log("returning:", tuples);
  return tuples;
}
function getUnitOwner(nationality) {
  if (nationality == "Germany" || nationality == "Italy") {
    return "Axis";
  } else if (nationality == "USSR") {
    return "USSR";
  } else if (nationality == "Britain" || nationality == "France" || nationality == "USA") {
    return "West";
  } else {
    return "Neutral";
  }
}
function getVisibleSet(o) {
  return getSet(o, "visible");
  if (!("visible" in o) || (!("set" in o.visible) && !("xset" in o.visible))) return null;
  else if ("set" in o.visible) return o.visible.set;
  else return o.visible.xset;
}
function getSet(o, key) {
  if (!(key in o) || (!("set" in o[key]) && !("xset" in o[key]))) return null;
  else if ("set" in o[key]) return o[key].set;
  else return o[key].xset;
}
function logFormattedData(data, n, msgAfter = "") {
  let s = makeStrings(data, ["game", "actions", "waiting_for", "created"]);
  console.log("___ step " + n, "\n" + s);
  console.log(msgAfter);
}
function isCardType(o) {
  return "obj_type" in o && endsWith(o.obj_type, "card");
}
function isVisibleToPlayer(o, player) {
  let vis = getVisibleSet(o);
  if (vis && vis.includes(player)) return true;
}
function isWrongPhase(optPhase, curPhase) {
  return optPhase != "any" && !startsWithCaseIn(curPhase, optPhase);
}
function isTooEarly(optYear, curYear, optStep, curStep) {
  return Number(curYear) < optYear || curStep < optStep;
}
function isWrongPlayer(optPlayer, curPlayer) {
  return optPlayer != "any" && !startsWithCaseIn(curPlayer, optPlayer);
}
function mergeCreatedAndUpdated(data) {
  if (!("created" in data)) data.created = {};
  data.created = extend(true, data.created, data.updated);

  //verify merge worked: created should have same data as updated for same ids
  let mergeFailed = false;
  let d = {};
  if ("created" in data && "updated" in data) {
    for (const id in data.updated) {
      if (!(id in data.created)) {
        d.summary = "missing id in data.created " + id;

        //console.log("missing id in data.created " + id);
      } else {
        d = propDiff(data.created[id], data.updated[id]);
        if (d.hasChanged && (!empty(d.propChange) || !empty(d.onlyNew))) {
          mergeFailed = true;
          //alert('MERGE FAILED!!!'+id + " " + d.summary.toString());

          //console.log("difference created - updated: " + id + " " + d.summary.toString());
          //console.log(d);
          //console.log("created:", data.created[id]);
          //console.log("updated:", data.updated[id]);
        }
      }
      console.assert("created" in data && !mergeFailed, "MERGE FAILED!!!" + id + " " + d.summary.toString() + "\n" + data.toString());
    }
  }
}
function randomUnitTuple() {
  let tile = chooseRandom(assets.tileNames);
  let nationality = chooseRandom(assets.nationalityNames);
  let unitType = chooseRandom(assets.unitTypeNames);

  // let faction = getUnitOwner(nationality);
  return [nationality, tile, unitType, 2];
}
function saveToDownloads(data, fname) {
  json_str = JSON.stringify(data);
  saveFile(fname + ".json", "data:application/json", new Blob([json_str], {type: ""}));
}
//#endregion

//#region send
function sendAction(player, actionTuple, callback) {
  sender.send("action_test/" + player + "/" + actionTuple.join("+"), dAction => {
    unitTestSender(dAction);

    actionOrWaiting(player, dAction, callback);
  });
}
function actionOrWaiting(player, dAction, callback) {
  if ("actions" in dAction) {
    unitTestSender("found actions for", player);
    dAction.info.game.player = player;
    //unitTestLoad("callback with", dAction);
    callback(dAction);
  } else if ("waiting_for" in dAction) {
    let waiting = getSet(dAction, "waiting_for");
    unitTestSender("NEED PLAYER CHANGE!!!!!!!!!!!!", waiting);
    if (!empty(waiting)) {
      let newPlayer = waiting[0];
      sender.send("status_test/" + newPlayer, dNewPlayer => {
        //merge new data into dAction
        dAction = extend(true, dAction, dNewPlayer);
        unitTestSender("action+status data for", newPlayer, dAction);
        dAction.info.game.player = newPlayer;
        callback(dAction);
      });
    } else {
      //got empty waitingfor set!!!
      alert("empty waiting_for and no actions!!!");
    }
  } else {
    unitTestSender("NEED TO SEND EMPTY ACTION!!!!!!!!!!!!!", player);
    alert("sending empty action!!!", player);
    sendAction(player, ["pass"], dEMpty => {
      dAction = extend(true, dAction, dEmpty);
      callback(dAction);
    }); //recurse
  }
}
function sendInit(player, callback) {
  sendInitSeed(player, null, callback);
}
function sendInitSeed(player, seed, callback) {
  let url = "init_test/hotseat/" + player;
  if (seed != null) url += "/" + seed;
  unitTestSender("url:", url);
  sender.send(url, dInit => {
    unitTestSender("dInit:", dInit);
    dInit.info.game.player = player;
    callback(dInit);
  });
}
function sendLoading(player, filename, callback) {
  unitTestLoad("loading", filename);
  var sData = {};
  sender.send("myload/" + filename + ".json", d1 => {
    unitTestLoad("myload response:", d1);
    sender.send("refresh/" + player, d2 => {
      unitTestLoad("refresh response:", d2);
      sData.created = d2;
      sender.send("status_test/" + player, d3 => {
        sData = augment(sData, d3);
        unitTestLoad("status_test response:", d3, "akku:", sData, "player", player);

        actionOrWaiting(player, sData, callback);
        // if ("actions" in sData) {
        //   sData.info.game.player = player;
        //   callback(sData);
        // } else if ("waiting_for" in sData) {
        //   let waiting = getSet(sData, "waiting_for");
        //   unitTestSender("PLAYER CHANGE!!!!!!!!!!!!", waiting);
        //   if (!empty(waiting)) {
        //     let newPlayer = waiting[0];
        //     sender.send("status_test/" + newPlayer, dNewPlayer => {
        //       //merge new data into dAction
        //       sData = extend(true, sData, dNewPlayer);
        //       unitTestSender("action+status data for", newPlayer, sData);
        //       sData.info.game.player = newPlayer;
        //       callback(sData);
        //     });
        //   } else {
        //     //got empty waitingfor set!!!
        //     alert("empty waiting_for and no actions!!!");
        //   }
        // } else {
        //   alert("sending empty action!!!", player);
        //   sendAction(player, ["pass"], d4 => {
        //     sData = extend(true, sData, d4);
        //     callback(sData);
        //   });
        // }
      });
    });
  });
}
//_____________________________________________________trash
function sendInitSeed_old(player, seed, callback) {
  sender.send("init/hotseat/" + player + "/" + seed, dInit => {
    sender.send("info/" + player, dInfo => {
      dInit = extend(true, dInit, dInfo);
      dInit.game.player = player;
      //console.log(dInit);
      callback(dInit);
    });
  });
}
function sendInit_old(player, callback) {
  sender.send("init/hotseat/" + player, dInit => {
    sender.send("info/" + player, dInfo => {
      dInit = extend(true, dInit, dInfo);
      dInit.game.player = player;
      callback(dInit);
    });
  });
}
function sendAction_old(player, actionTuple, callback) {
  sender.send("action_test/" + player + "/" + actionTuple.join("+"), dAction => {
    console.log(dAction);
    sender.send("info/" + player, dInfo => {
      dAction = extend(true, dAction, dInfo);
      if ("actions" in dAction) {
        dAction.game.player = player;
        //console.log(dAction);
        callback(dAction);
      } else if ("waiting_for" in dAction) {
        let waiting = getSet(dAction, "waiting_for");
        console.log("PLAYER CHANGE!!!!!!!!!!!!", waiting);
        if (!empty(waiting)) {
          let newPlayer = waiting[0];
          dAction.game.player = newPlayer;
          sender.send("status/" + newPlayer, dNewPlayer => {
            sender.send("info/" + newPlayer, dNewInfo => {
              dNewPlayer = extend(true, dNewPlayer, dNewInfo);
              dNewPlayer.game.player = newPlayer;
              callback(dNewPlayer);
            });
            //throw away old player,
          });
        } else {
          //got empty waitingfor set!!!
          alert("empty waiting_for and no actions!!!");
        }
      } else {
        sendAction(player, ["pass"], callback);
      }
    });
  });
}

function sendEmptyAction(player, callback) {
  testOutput({1: ["sending empty action!!!"]});
  sendAction(player, ["none"], callback);
}
function sendAction_old(player, tuple, callback, ms = 30) {
  setTimeout(() => {
    testOutput({1: ["sending action:" + player + tuple + callback.name]});
    testOutput({0: [player + " selects:" + tuple]});
    let chain = ["action/" + player + "/" + tuple.join("+"), "info/" + player, "status/" + player];
    sender.chainSend(chain, player, callback);
  }, ms);
}
function sendEditAction(player, tuple, callback, ms = 30) {
  setTimeout(() => {
    testOutput({1: ["sending action:" + player + tuple + callback.name]});
    testOutput({0: [player + " selects:" + tuple]});
    sender.send("edit/" + player + "/" + tuple.join("+"), callback);
    //let chain = ["edit/" + player + "/" + tuple.join("+"), "info/" + player, "status/" + player];
    //sender.chainSend(chain, player, callback);
  }, ms);
}
function sendChangeToPlayer(nextPlayer, callback) {
  let chain = ["info/" + nextPlayer, "status/" + nextPlayer];
  sender.chainSend(chain, nextPlayer, callback);
}
//deprecate!
function sendChangePlayer(data, callback) {
  //deprecate!!!
  player = data.waiting_for.set[0];
  if (!assets.factionNames.includes(player)) {
    logFormattedData(data, msgCounter, "ERROR: waiting_for data corrupt!!!" + player);
  } else {
    console.log("________ player:", player);
    let chain = ["info/" + player, "status/" + player];
    sender.chainSend(chain, player, callback);
  }
}
function sendInit_old(player, callback, seed = 1) {
  var chain = ["init/hotseat/" + player + "/" + seed, "info/" + player, "status/" + player];
  sender.chainSend(chain, player, callback);
}
function sendLoading_old(filename, player, callback, outputOption = "none") {
  console.log("loading", filename);
  execOptions.output = outputOption;
  var sData = {};
  sender.send("myload/" + filename + ".json", data => {
    console.log("myload response:", data);
    sender.send("refresh/" + player, data => {
      console.log("refresh response:", data);
      sData.created = data;
      let chain = ["info/" + player, "status/" + player];
      sender.chainSend(chain, player, data => {
        console.log("info+status response:", data);
        sData = augment(sData, data);
        sData.created = augment(sData.created, sData.updated);
        if ("waiting_for" in data && empty(getSet(data, "waiting_for"))) {
          sender.send("action/" + player + "/none", data => {
            //console.log("empty action response:", data);
            sData = augment(sData, data);
            //console.log("=augmented data:", sData);
            if (callback) callback(sData);
          });
        } else {
          if (callback) callback(sData);
        }
      });
    });
  });
}

//#endregion send
