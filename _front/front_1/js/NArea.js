var uniqueIdCounter = 0;
class NArea{
  constructor(gOrDiv){
    this.elem = gOrDiv;
  }
  clear(){
    clearElement(this.elem);
  }

}