class UnitManager{
  constructor(){
    this.g=document.getElementById('mapG');

  }
  drawUnits(player){

  }
  removeUnit(id,o){

  }
  updateUnit(id,o,o_old,player){

  }



  //helpers maybe needed or not
  isCvUpdate(id, o) {
    if (o.obj_type != "unit") return false;
    if (!id in G.objects) return false;
    if (o.cv == G.objects[id].cv) return false;
    let same = true;
    let oldUnit = G.objects[id];
    for (const prop in o) {
      if (oldUnit[prop] != o[prop] && prop != "cv") {
        same = false;
        alert("unit props:", o, oldUnit);
      }
    }
    return same;
  }

}