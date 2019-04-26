function updateUI_vorOverride() {
  var currentFaction = G.faction;
  var currentView = G[currentFaction];

  for (id in currentView) {
    let go = currentView[id];
    let ttext = JSON.stringify(go);

    if (!(id in uis)) {
      //create object
      switch (go.obj_type) {
        case "tile":
          //console.log("create region", id);
          uis[id] = boardFactory.createTile(id, ttext);
          break;
        case "unit":
          //console.log("create unit", id);
          let faction = currentFaction;

          if (isUnitOfFaction(go, currentFaction)) {
            uis[id] = boardFactory.createUnit(id, currentFaction, go, ttext);
            boardFactory.updateCv(uis[id], go.cv);
          } else {
            faction = go.visible.set[0];
          }
          //console.log("unit", uis[id], "id:::", id);
          //create or update hidden unit
          let idHidden = getHiddenId(faction, go.tile);
          if (!(idHidden in uis)) {
            uis[idHidden] = boardFactory.createHiddenUnit(idHidden, go);
            //console.log("created hidden unit:", idHidden, id, uis[idHidden]);
          } else {
            //increment counter of hidden unit by 1
            boardFactory.updateUnitCounter(go, uis[idHidden], 1);
          }
          break;
        case "action_card":
        case "investment_card":
          let ui = cardFactory.createCard(id, go, ttext);
          uis[id] = ui;
          if (isHandCard(go, currentFaction)) {
            cardFactory.placeCard(ui, currentFaction);
          }
          break;
      }
    } else {
      //check property changes
      let ui = uis[id];

      for (prop in go) {
        //map values of property to ui
        switch (prop) {
          case "tile":
            //make sure this is a cadre
            if (go.obj_type != "unit") {
              //console.log("trying to place a", go.obj_type);
            }
            let tile = go.tile;
            let unitTile = ui.getTag("tile");
            if (unitTile != tile) {
              //console.log("PLACE! update tile from", unitTile, "to", tile);
              //remove unit from old tile
              boardFactory.removeUnitFrom(ui, tile);
              boardFactory.placeUnit(ui, tile);
            }
            break;
          case "cv":
            //make sure this is a cadre
            if (go.obj_type != "unit") {
              //console.log("trying to attach cv to ", go.obj_type);
            }
            let cv = go[prop];
            let unitCV = ui.getTag("cv");
            if (unitCV != cv) {
              //console.log("update cv from", unitCV, "to", cv);
              boardFactory.updateCv(ui, cv);
            }
            break;
          case "top":
          case "wildcard":
          case "year":
          case "espionage":
            //console.log('updating card:',ui)
            let title = ui.getTag("title");
            if (title != go[prop]) {
              //console.log(title,go,ui)
              cardFactory.updateCardContent(ui.id, ui, go, ttext);
            }
            break;
        }
      }
    }

    switch (go.obj_type) {
      case "action_card":
      case "investment_card":
        if (go.visible.set.includes(currentFaction)) {
          cardFactory.placeCard(uis[id], currentFaction);
        }
        break;
      case "unit":
        let faction = go.visible.set[0]; //ms.getTag("faction");
        let tile = go.tile; //ms.getTag("tile");
        let idHidden = getHiddenId(faction, tile);
        //show unit if owner currentFaction, otherwise show hidden unit
        if (faction == currentFaction) {
          uis[id].show();
          uis[idHidden].hide();
        } else {
          uis[idHidden].show();
          if (id in uis) {
            uis[id].hide();
          }
        }
        break;
    }
  }
}

function updateUI_couldBreak() {
  var currentFaction = G.faction;
  var currentView = G[currentFaction];

  for (id in currentView) {
    let go = currentView[id];
    let ttext = JSON.stringify(go);

    if (!(id in uis)) {
      //create object
      switch (go.obj_type) {
        case "tile":
          //console.log("create region", id);
          uis[id] = boardFactory.createTile(id, ttext);
          break;
        case "unit":
          //console.log("create unit", id);
          let faction = currentFaction;
          if (isUnitOfFaction(go, currentFaction)) {
            uis[id] = boardFactory.createUnit(id, currentFaction, go, ttext);
            boardFactory.updateCv(uis[id], go.cv);
          } else {
            faction = go.visible.set[0];
          }
          //create or update hidden unit
          let idHidden = getHiddenId(faction, go.tile);
          if (!(idHidden in uis)) {
            uis[idHidden] = boardFactory.createHiddenUnit(idHidden, go);
            //console.log("created hidden unit:", idHidden, id, uis[idHidden]);
          } else {
            //increment counter of hidden unit by 1
            boardFactory.updateUnitCounter(go, uis[idHidden], 1);
          }
          break;
        case "action_card":
        case "investment_card":
          let ui = cardFactory.createCard(id, go, ttext);
          uis[id] = ui;
          if (isHandCard(go, currentFaction)) {
            cardFactory.placeCard(ui, currentFaction);
          }
          break;
      }
    } else {
      //check property changes
      let ui = uis[id];

      for (prop in go) {
        //map values of property to ui
        switch (prop) {
          case "tile":
            //make sure this is a cadre
            if (go.obj_type != "unit") {
              //console.log("trying to place a", go.obj_type);
            }
            let tile = go.tile;
            let unitTile = ui.getTag("tile");
            if (unitTile != tile) {
              //console.log("PLACE! update tile from", unitTile, "to", tile);
              //remove unit from old tile
              boardFactory.removeUnitFrom(ui, tile);
              boardFactory.placeUnit(ui, tile);
            }
            break;
          case "cv":
            //make sure this is a cadre
            if (go.obj_type != "unit") {
              //console.log("trying to attach cv to ", go.obj_type);
            }
            let cv = go[prop];
            let unitCV = ui.getTag("cv");
            if (unitCV != cv) {
              //console.log("update cv from", unitCV, "to", cv);
              boardFactory.updateCv(ui, cv);
            }
            break;
          case "top":
          case "wildcard":
          case "year":
          case "espionage":
            //console.log('updating card:',ui)
            let title = ui.getTag("title");
            if (title != go[prop]) {
              //console.log(title,go,ui)
              cardFactory.updateCardContent(ui.id, ui, go, ttext);
            }
            break;
        }
      }
    }

    //update visibility
    let ms = uis[id];

    switch (go.obj_type) {
      case "action_card":
      case "investment_card":
        if (go.visible.set.includes(currentFaction)) {
          cardFactory.placeCard(ms, currentFaction);
        }
        break;
      case "unit":
        let faction = ms.getTag("faction");
        let tile = ms.getTag("tile");
        let idHidden = getHiddenId(faction, tile);
        //show unit if owner currentFaction, otherwise show hidden unit
        if (faction == currentFaction) {
          uis[id].show();
          uis[idHidden].hide();
        } else {
          uis[idHidden].show();
          uis[id].hide();
        }
        break;
    }
  }
}
function highlightObjects_orig(allTuples, possibleTuples, partialTuple) {
  let allIds = [];
  let possibleIds = [];
  let selectedIds = partialTuple;

  let selUIs = selectedIds.map(id => getUI(id));

  allTuples.map(x => x.map(id => addIf(id, allIds)));
  //console.log("all ids:", allIds.toString());

  let allUIs = allIds.map(id => getUI(id));
  //console.log("all uis:", allUIs);

  possibleTuples.map(x => x.map(id => addIf(id, possibleIds)));
  let possibleUIs = possibleIds.map(id => getUI(id));

  //console.log("allUIs", allUIs);
  //console.log("selectedIds", selectedIds);
  //console.log("possibleIds:", possibleIds.toString());

  for (const ui of allUIs) {
    if (selectedIds.includes(ui.id)) {
      ui.select();
    } else if (possibleIds.includes(ui.id)) {
      //console.log("highlight:", ui.id, typeof ui.id, ui);
      makeSelectable(ui, onSelected);
    } else {
      //console.log("not highlighted:", ui.id, typeof ui.id, ui);
      makeUnselectable(ui);
    }
  }
  show(bSkipAction);

  return {all: allUIs, choice: possibleUIs, selected: selUIs};
}
function highlightObjectsGovPhase(allTuples, possibleTuples, partialTuple) {
  //there can only be cards or commands or sumCadres in gov phase
  // if partialTuple is not empty
  // if sel is an
  // if partialTuple is empty just highlight cards
  //display commands (factory and pass)
  if (empty(partialTuple)) {
    let ids = extractUniqueStrings(possibleTuples);
    console.log(ids);
    for (const id of ids) {
      if (isCard(id)) {
        makeSelectable(uis[id], onSelectedCard);
      } else if (isSingleCommand(id, possibleTuples)) {
        ui = getUI(id);
        makeSelectable(ui, onSelectedCommand);
      }
    }
    return null;
  } else {
    highlightObjects(allTuples, possibleTuples, partialTuple);
  }
}
function onSelectedCard(ev) {
  let id = evToId(ev);
  console.log(ev);
  //I know this is a card and I am in gov phase
  //find all tuples that have this card inside

  // check if it is unselect
  if (selids.includes(id)) {
    selids = [];
    //just unselect this id, and highlight all partialTuple tuples
    //hide all commands (except factory and pass)
    highlightObjectsGovPhase(allSelectionTuples, allSelectionTuples, []);
  } else {
    let possibleTuples = getListsContainingAll(allSelectionTuples, [id]);
    if (possibleTuples.length == 1) {
      // there is probably no such case
      let tuple = possibleTuples[0];
      //console.log("onSelected: found tuple");
      closeSelection();
      let url = "action/" + G.faction + "/" + tuple.join("+");
      send(url);
    } else {
      highlightObjects;
      // make them flat
      let ids = extractUniqueStrings(possibleTuples);
      console.log(ids.toString());

      // select the card,
      uis[id].select();
      selid.push(id);

      // highlight other different cards
      let allUIs = allIds.map(id => getUI(id));

      for (const id1 of ids) {
        if (id1 != id && isCard(id1)) {
        }
      }
      // display all other 'ids' as commands
    }
  }
}
function onSelectedCommand(ev) {}

function onSelected_wegdamit(ev) {
  let id = evToId(ev);

  //check if this object was selected, if so, unselect!
  if (selids.includes(id)) {
    selids = without(selids, id);
    //console.log(id, " UNselected!!!", selids.toString());

    //from all allSelectionTuples,find those that contains all elements in selids
    let possibleTuples = getListsContainingAll(allSelectionTuples, selids);
    //console.log("new choice tuples:");
    //prj(possibleTuples);
    highlightObjects(allSelectionTuples, possibleTuples, selids);
  } else {
    //console.log(id, " selected!");
    selids.push(id);

    //check if complete choice is selected
    let possibleTuples = getListsContainingAll(allSelectionTuples, selids);
    //console.log("new choice tuples:");
    //prj(possibleTuples);

    if (possibleTuples.length == 1) {
      let tuple = possibleTuples[0];
      //console.log("onSelected: found tuple");
      closeSelection();
      let url = "action/" + G.faction + "/" + tuple.join("+");
      send(url);
    } else {
      highlightObjects(allSelectionTuples, possibleTuples, selids);
    }
  }
}
