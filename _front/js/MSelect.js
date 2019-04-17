class MSelect{
  constructor(actions,gFaction,uis,faction){
    this.gos=gFaction;
    this.faction = faction;
    let sActions = JSON.stringify(actions);
    this.serverTree = new MParser(sActions).tree;
    this.serverTree.print();
    let b = this.serverTree.branchSample();
    this.originalOrder = b.map(x => Manager.getType(x));
    let selInfo = Manager.convertActionTree(serverTree);


  }
  idToType(id){
    //ids koennen sein: 
    // tile >> find it in gFaction
  }
  
}