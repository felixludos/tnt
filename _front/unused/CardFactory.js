class CardFactory {
  constructor(cardDisplay,w,h) {
    this.cardDisplay = cardDisplay;
    this.cardWidth = w;
    this.cardHeight = h;
    this.gap = 10;
    this.xStart = this.gap;
    this.yStart = this.gap;
    this.x = this.xStart;
    this.y = this.yStart;
    this.cards = [];
  }
  clearCards(){
    console.log('cardFactory.clearCards')
    //clearElement(cardDisplay);
    this.cards.map(x=>x.removeFromUI());
    this.xStart = this.gap;
    this.yStart = this.gap;
    this.x = this.xStart;
    this.y = this.yStart;
  }
  createCard(id, go, ttext) {
    let txt = [];
    if ("top" in go) {
      txt = [o.top, " ", o.season, o.priority + o.value, " ", o.bottom];
      txt = txt.map(x => x.replace(/_/g, " "));
      ms.tag('title',o.top);
    } else if ("wildcard" in go) {
      txt = [o.wildcard, " ", o.season, o.priority + o.value, " ", " "];
      txt = txt.map(x => x.replace(/_/g, " "));
      ms.tag('title',o.wildcard);
    }
    let cardWidth = this.cardWidth;
    let cardHeight = this.cardHeight;
    console.log(cardWidth,cardHeight)

    let card = new MS(id)
      .roundedRect({w: cardWidth, h: cardHeight, fill: "white"})
      .textMultiline({txt: txt, maxWidth: cardWidth, fz: cardWidth / 6})
      .roundedRect({className: "overlay hible selectable", w: cardWidth, h: cardHeight});

    return card;
  }
  placeCard(ui,parentG){
    if (!parentG || parentG === undefined) parentG = this.cardDisplay;
    console.log('placeCard:',ui,parentG,this.x,this.y)
    ui.drawTo(parentG,this.x,this.y);
    this.x+=this.gap+ui.bounds.w;
    addIf(ui,this.cards);
    //TODO: if card does not fit!!!
  }
  updateCardContent(id,ms,o,ttext){
    console.log('updateCardContent:')
    let txt = [];
    if ("top" in o) {
      txt = [o.top, " ", o.season, o.priority + o.value, " ", o.bottom];
      txt = txt.map(x => x.replace(/_/g, " "));
      ms.tag('title',o.top);
    } else if ("wildcard" in o) {
      txt = [o.wildcard, " ", o.season, o.priority + o.value, " ", " "];
      txt = txt.map(x => x.replace(/_/g, " "));
      ms.tag('title',o.wildcard);
    }
    let cardWidth = this.cardWidth;
    let cardHeight = this.cardHeight;

    ms.removeFromChildIndex(1);
    ms.textMultiline({txt: txt, maxWidth: cardWidth, fz: cardWidth / 6})
      .roundedRect({className: "overlay hible selectable", w: cardWidth, h: cardHeight});
    console.log(txt.toString());
  }
  calculateCardLayout() {
    if (!handChanged && this.cardRows == 1) return;

    console.log("clearing card display!!!", this.cardDisplay);
    clearElement(this.cardDisplay);

    if (!this.hasActionCards(faction)) return;
    let d = this.cardDisplay;
    let idshand = this.handCards[faction];
    var n = idshand.length;
    var w = SZ.cardWidth;
    var h = SZ.cardHeight;
    for (var i = 0; i < n; i++) {
      let card = this.get(idshand[i]);
      let holder = makeSvg(w, h);
      d.appendChild(holder);
      card.setPos(w / 2, h / 2);
      holder.appendChild(card.elem);
    }
    let dims = calculateDims(n, w, 1); //layout(n,w,h);
    var sGridColumn = `${w}px `.repeat(dims.cols);
    // d.classList.add("cardGridContainer");
    d.style.gridTemplateColumns = `repeat(auto-fill,${sGridColumn})`;
    // d.style.width = dims.width + "px";
    d.style.padding = dims.padding + "px";
    d.style.gridGap = dims.gap + "px";
    this.cardRows = dims.rows;
  }
}
