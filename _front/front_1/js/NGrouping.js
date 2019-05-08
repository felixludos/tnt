class NGrouping {
  constructor(id, gId, mode, startPos, options) {
    //console.log(id,gId,mode,startPos,options)
    this.id = id;
    this.g = document.getElementById(gId);
    //console.log(gId,this.g)
    this.startPos = startPos;
    this.resetToStartPos();
    this.mode = mode; //fixed (posDict),snail (snailOffsets),byRow(sortBy),byCol(sortBy)
    this.options = options; //as per mode
    this.children = [];
    this.hidden = [];
  }
  add(ms) {
    let pos = {x: this.x, y: this.y};
    //console.log(pos);
    if (this.mode == "fixed") {
      pos = this.options.posDict[ms.id];
    } else if (this.mode == "snail") {
      let idx = this.children.length;
      let pStart = this.startPos;
      //console.log('index of this unit',iUnit);
      let pSnailOffset = this.options.snailPos[idx];
      pos.x = pStart.x + pSnailOffset.x;
      pos.y = pStart.y + pSnailOffset.y;
    } else if (this.mode == "byRow") {
      let div = this.options.div;
      let wTotal = div.offsetWidth;
      //let wTotal=this.g.offsetWidth;
      //console.log('this.g',this.g,'wTotal',wTotal)
      if (this.x + this.options.w + this.options.gap > wTotal) {
        //console.log('MUSS ERWEITERN!!!!');
        //console.log(div.style.height)
        let h = firstNumber(div.style.height);
        //console.log('current height of cardDisplay:',h)
        h += this.options.h;
        //console.log('new height of cardDisplay:',h)
        div.style.height = h + "px";
        this.x = this.startPos.x;
        this.y += this.options.gap + this.options.h;
      }
      pos.x = this.x;
      pos.y = this.y;
      this.x += this.options.gap + this.options.w;
    } else if (this.mode == "byCol") {
      let div = this.options.div;
      let hTotal = div.offsetHeight;
      //let wTotal=this.g.offsetWidth;
      //console.log('this.g',this.g,'wTotal',wTotal)
      if (this.y + this.options.h + this.options.gap > hTotal) {
        //console.log('MUSS ERWEITERN!!!!',this.g.style.height)
        let w = firstNumber(div.style.width);
        //console.log('current height of g:',h)
        w += this.options.w;
        //console.log('new height of cardDisplay:',h)
        div.style.width = w + "px";
        this.y = this.startPos.y;
        this.x += this.options.gap + this.options.width;
      }
      pos.x = this.x;
      pos.y = this.y;
      this.y += this.options.gap + this.options.h;
    }
    ms.setPos(pos.x, pos.y).draw();
    addIf(ms, this.children);
  }
  clear() {
    this.children.map(x => x.removeFromUI());
    this.resetToStartPos();
    this.children = [];
  }
  getCount(){return this.children.length+this.hiddenChildren.length;}
  hideChildren() {
    this.children.map(x => x.hide());
    this.hiddenChildren = this.children;
    this.children = [];
  }
  lineUp(ids) {
    //restart layout for all ids in param
    this.hideChildren();
    let msList = this.hiddenChildren.filter(x => ids.includes(x.id));
    console.log(msList);
    if ("sortBy" in this.options) {
      let prop = this.options.sortBy;
      msList.sort((a, b) => {
        return a[prop] < b[prop] ? -1 : a[prop] > b[prop] ? 1 : 0;
      });
    }
    this.resetToStartPos();
    msList.map(x => this.add(x));
  }
  redoLayout(){
    this.resetToStartPos();
    let arr = this.children;
    this.children=[];
    arr.map(ch=>this.add(ch));
  }
  removeChild(id){
    // find child in children
    //let ch = findFirst(this.children,'id',id);
    removeByProp(this.children,'id',id);
    console.log(this.children);
    this.redoLayout();
  }
  resetToStartPos() {
    this.x = this.startPos.x;
    this.y = this.startPos.y;
  }
  sortChildren(){
    //console.log('sorting...',this.children.map(x=>x.id))

    if ("sortBy" in this.options) {
      //console.log('yes')
      let prop = this.options.sortBy;
      this.children.sort((a, b) => {
        return a[prop] < b[prop] ? -1 : a[prop] > b[prop] ? 1 : 0;
      });
    }
    //console.log('sorting...',this.children.map(x=>x.id))
    this.redoLayout();
  }
}
