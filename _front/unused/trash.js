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
