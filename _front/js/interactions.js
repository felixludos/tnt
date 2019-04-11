//interactions to UI
function setPlayerStats(stat, faction, val) {
  //PopulationWest
  let id = stat + faction;
  document.getElementById(id).innerHTML = val;
}
function setPopulation(faction, val) {
  setPlayerStats("Population", faction, val);
}
function setResources(faction, val) {
  setPlayerStats("Resources", faction, val);
}
function setIndustry(faction, val) {
  setPlayerStats("Industry", faction, val);
}
function setHandlimit(faction, val) {
  setPlayerStats("Handlimit", faction, val);
}
function setFactorycost(faction, val) {
  setPlayerStats("Factorycost", faction, val);
}
function setProduction(faction, stat) {
  let id = stat + faction;
  // clear all 3 Population,Industry,Resources for this faction
  for (const stat1 of ["Population", "Industry", "Resources"]) {
    document.getElementById(stat1 + faction).style.color = "black";
  }
  document.getElementById(id).style.color = "red";
}
function removeAllInfluence(faction, region) {
  let l = influenceMarkers.length;
  while (l--) {
    let marker = influenceMarkers[l];
    if (marker.data.faction == faction && marker.data.region == region) {
      board.removeChild(marker.elem);
      influenceMarkers.splice(l, 1);
    }
  }
  console.log("Removed all influence from ", region, " ", influenceMarkers);
}
function setInfluence(faction, region, level) {
  //TODO: globals access is WRONG!!!!
  // level 3='control',2='associate',1='protectorate'
  //this region is under the control of faction
  let pos = mapPosDict[region];
  let gRegion = document.getElementById(region); // hab das g element, aber nicht das MS element
  let msRegion = regions[region];
  //console.log(msRegion,msRegion.bounds);
  //console.log(gRegion);
  pos.y -= msRegion.bounds.w / 4; // position of influence marker is oben mitte
  sLevel = level == 3 ? "control" : "influence";
  let path = `./assets/markers/${sLevel}${faction}.PNG`;
  //console.log(path);
  for (let i = level; i > 0; i--) {
    var marker = new MS(board)
      .square({sz: 50})
      .image({path: path, w: 44, h: 44})
      .setPos(pos.x, pos.y)
      .draw();
    marker.tag("faction", faction);
    marker.tag("region", region);
    influenceMarkers.push(marker);
    if (level == 3) break;
    else pos.x += 20;
  }
  //console.log("#", influenceMarkers.length, ": ", influenceMarkers);
}
function highlightRegion(region) {
  regions[region].addClass("highlighted");
  return regions[region];
}
function selectRegion(region) {
  regions[region].addClass("selected");
  regions[region].removeClass("highlighted");
  return regions[region];
}
function unselectRegion(region) {
  regions[region].removeClass("selected");
  regions[region].addClass("highlighted");
  return regions[region];
}
function unhighlightRegion(region) {
  regions[region].removeClass("selected");
  regions[region].removeClass("highlighted");
  return regions[region];
}
function attachBehavior(ms, eventName, handler) {
  ms.elem.addEventListener(eventName, ev => handler(ev, ms));
}

