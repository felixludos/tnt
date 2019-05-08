class NU{
  constructor(){
    this.clear();
  }
  clear(){
    this.U= {create:{},remove:{}}; //ui update by obj_type
  }
  prepCreate(id,o,otype,player){
    if (!(otype in this.U.create)){
      this.U.create[otype]={};
    }
    this.U.create[otype][id]={o:o,player:player};
  }
  prepRemove(id,o,otype){
    if (!(otype in this.U.remove)){
      this.U.remove[otype]={};
    }
    this.U.remove[otype][id]=o;
  }


}