//#region tnt helpers

function getTuples(data) {
  let tuples = [];
  //console.log("getTuples", tuples);
  if ("actions" in data) {
    tuples = expand(data.actions);

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
function sendEmptyAction(player, callback) {
  testOutput({1: ["sending empty action!!!"]});
  sendAction(player, ["none"], callback);
}
function sendAction(player, tuple, callback, ms = 30) {
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
function sendInit(player, callback, seed = 1) {
  var chain = ["init/hotseat/" + player + "/" + seed, "info/" + player, "status/" + player];
  sender.chainSend(chain, player, callback);
}
function sendLoading(filename, player, callback, outputOption = "none") {
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

//#endregion tnt helpers
