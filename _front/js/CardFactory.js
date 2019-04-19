class CardFactory {
  constructor(cardDisplay,cardsG, w, h) {
    this.cardDisplay = cardDisplay;
    this.cardsG = cardsG;
    //console.log(cardDisplay,cardsG)
    this.cardWidth = w;
    this.cardHeight = h;
    this.gap = 10;
    this.xStart = this.gap+w/2;
    this.yStart = this.gap+h/2;
    this.x = this.xStart;
    this.y = this.yStart;
    //console.log(this.xStart,this.yStart,this.x,this.y,w,h)
    this.cards = [];
  }
  clearCards() {
    //console.log("cardFactory.clearCards");
    //clearElement(cardDisplay);
    this.cards.map(x => x.removeFromUI());
    this.cards=[];
    this.x = this.xStart;
    this.y = this.yStart;
    this.cardDisplay.style.height = '200px';
  }
  createCard(id, o, ttext) {
    let txt = [];
    if ("top" in o) {
      txt = [o.top, " ", o.season, o.priority + o.value, " ", o.bottom];
      txt = txt.map(x => x.replace(/_/g, " "));
    } else if ("wildcard" in o) {
      txt = [o.wildcard, " ", o.season, o.priority + o.value, " ", " "];
      txt = txt.map(x => x.replace(/_/g, " "));
    }
    let cardWidth = this.cardWidth;
    let cardHeight = this.cardHeight;
    //console.log(cardWidth, cardHeight);

    let card = new MS(id)
      .roundedRect({w: cardWidth, h: cardHeight, fill: "white"})
      .textMultiline({txt: txt, maxWidth: cardWidth, fz: cardWidth / 6})
      .roundedRect({className: "overlay hible selectable", w: cardWidth, h: cardHeight});

    if ("top" in o) {
      card.tag("title", o.top);
    } else if ("wildcard" in o) {
      card.tag("title", o.wildcard);
    }

    return card;
  }
  placeCard(ui, faction) {
    if (this.cards.includes(ui)) return; //already in hand!
    let  parentG = this.cardsG;

    let wTotal=this.cardDisplay.offsetWidth;
    console.log(wTotal)
    if (this.x+this.cardWidth+this.gap > wTotal){
      console.log('MUSS ERWEITERN!!!!',this.cardDisplay.style.height)
      let h= firstNumber( this.cardDisplay.style.height);
      console.log('current height of cardDisplay:',h)
      h += this.cardHeight;
      console.log('new height of cardDisplay:',h)
      this.cardDisplay.style.height=h+'px';
      this.x=this.xStart;
      this.y+=this.gap+this.cardHeight;
    }

    console.log("placeCard:", ui, parentG, this.x, this.y, ui.bounds.w, ui.bounds.h);
    ui.drawTo(parentG, this.x, this.y);
    this.x += this.gap + ui.bounds.w;
    addIf(ui, this.cards);
    ui.tag('hand',faction)
    //TODO: if card does not fit!!!
  }
  updateCardContent(id, ms, o, ttext) {
    //console.log("updateCardContent:");
    let txt = [];
    if ("top" in o) {
      txt = [o.top, " ", o.season, o.priority + o.value, " ", o.bottom];
      txt = txt.map(x => x.replace(/_/g, " "));
      ms.tag("title", o.top);
    } else if ("wildcard" in o) {
      txt = [o.wildcard, " ", o.season, o.priority + o.value, " ", " "];
      txt = txt.map(x => x.replace(/_/g, " "));
      ms.tag("title", o.wildcard);
    }
    let cardWidth = this.cardWidth;
    let cardHeight = this.cardHeight;

    ms.removeFromChildIndex(2);
    ms.textMultiline({txt: txt, maxWidth: cardWidth, fz: cardWidth / 6}).roundedRect({
      className: "overlay hible selectable",
      w: cardWidth,
      h: cardHeight
    });
    //console.log(txt.toString());
  }
}
