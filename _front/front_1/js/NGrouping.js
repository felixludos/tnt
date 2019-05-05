class NGrouping{
  constructor(id,gId,mode,startPos,options){
    //console.log(id,gId,mode,startPos,options)
    this.id = id;
    this.g = document.getElementById(gId);
    //console.log(gId,this.g)
    this.startPos = startPos;
    this.resetToStartPos();
    this.mode = mode;//fixed (posDict),snail (snailOffsets),byRow(sortBy),byCol(sortBy)
    this.options = options;//as per mode
    this.children = [];
  }
  add(ms){
    let pos = {x:this.x,y:this.y};
    if (this.mode == 'fixed'){
      pos = this.options.posDict[ms.id];
    } else if (this.mode == 'snail'){
      let idx = this.children.length;
      let pStart = this.startPos;
      //console.log('index of this unit',iUnit);
      let pSnailOffset = this.options.snailPos[idx];
      pos.x = pStart.x + pSnailOffset.x;
      pos.y = pStart.y + pSnailOffset.y;
    }else if (this.mode == 'byRow'){
      let wTotal=this.options.div.offsetWidth;
      //let wTotal=this.g.offsetWidth;
      //console.log('this.g',this.g,'wTotal',wTotal)
      if (this.x+this.options.w+this.options.gap > wTotal){
        //console.log('MUSS ERWEITERN!!!!',this.cardDisplay.style.height)
        let h= firstNumber( this.g.style.height);
        //console.log('current height of cardDisplay:',h)
        h += this.options.h;
        //console.log('new height of cardDisplay:',h)
        this.g.style.height=h+'px';
        this.x=this.startPos.x;
        this.y+=this.options.gap+this.options.h;
      }
      pos.x=this.x;
      pos.y=this.y;
      this.x += this.options.gap+this.options.w;
    }
    ms.setPos(pos.x,pos.y).draw();
    this.children.push(ms);

  }
  clear(){
    this.children.map(x=>x.removeFromUI());
    this.resetToStartPos();
    this.children = [];
  }
  resetToStartPos(){
    this.x=this.startPos.x;
    this.y=this.startPos.y;
  }

}