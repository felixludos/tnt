class CardFactory {
  constructor(openCardDisplay,openCardsG,cardDisplay,cardsG, w, h) {
    this.openCardDisplay = openCardDisplay;
    this.cardDisplay = cardDisplay;
    this.openCardsG = openCardsG;
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
    this.openCards = [];
  }
  reset(){
    this.clearCards();
  }
  clearCards() {
    //console.log("cardFactory.clearCards");
    //clearElement(cardDisplay);
    this.cards.map(x => x.removeFromUI());
    this.cards=[];
    this.openCards.map(x => x.removeFromUI()); // not sure if need to do this and next
    this.openCards = [];
    this.x = this.xStart;
    this.y = this.yStart;
    this.xOpen = this.xStart;
    this.yOpen = this.yStart;
    this.cardDisplay.style.height = '200px';
    this.openCardDisplay.style.height = '200px';
  }
  setCardContent(ms,o){
    let txt = [];
    let title='';
    if ("top" in o) {
      if(o.obj_type == 'action_card'){
        txt = [o.top, " ", o.season, o.priority + o.value, " ", o.bottom];
      }else{
        txt = [o.top, " ", " ",o.value?o.value.toString():" ", " "," ", o.bottom];
      }
      title=o.top;
    } else if ("wildcard" in o) {
      txt = [o.wildcard, " ", o.season, o.priority + o.value, " ", " "];
      title=o.wildcard;
    } else if ("intelligence" in o) {
      txt = [o.intelligence, " ", " ",o.value?o.value.toString():" ", " "," ", " "];
      title=o.intelligence;
    } else if ("science" in o) {
      txt = [o.value+'   ('+o.year.toString()+')'];
      o.science.map(x=>txt.push(x));
      title=o.year;
    }
    if (txt.length>0){
      //console.log(txt)
      txt = txt.map(x => x.replace(/_/g, " "));
    }
    let cardWidth = this.cardWidth;
    let cardHeight = this.cardHeight;
    //console.log(cardWidth, cardHeight);

    let testText=ms.id;
    if ('owner' in o){testText += ' '+o.owner;}

    ms.roundedRect({w: cardWidth, h: cardHeight, fill: "white"})
    .text({txt:testText,fill:'red',y:cardHeight/2,fz:cardWidth/7})
    .textMultiline({txt: txt, maxWidth: cardWidth, fz: cardWidth /7}) // / 6})
    .roundedRect({className: "overlay hible selectable", w: cardWidth, h: cardHeight});

    ms.tag('content',txt)
    ms.tag('type',o.obj_type);
    ms.tag('title',title)
    ms.tag('json',JSON.stringify(o));
    return ms;
  }
  createCard(id, o, ttext) {
    //if (startsWith(id,'invest_')) //console.log('create',JSON.stringify(o),id)
    let ms = new MS(id,null);
    this.setCardContent(ms,o);
    return ms;
  }
  updateCardContent(id, ms, o, ttext) {
    //if (startsWith(id,'invest_')) //console.log('update',JSON.stringify(o),id)
    ms.removeFromChildIndex(2);
    //console.log("updateCardContent:");
    this.setCardContent(ms,o);
    return ms;
  }
  placeCard(ui, faction) {
    if (this.cards.includes(ui)) return; //already in hand!
    let  parentG = this.cardsG;

    let wTotal=this.cardDisplay.offsetWidth;
    //console.log(wTotal)
    if (this.x+this.cardWidth+this.gap > wTotal){
      //console.log('MUSS ERWEITERN!!!!',this.cardDisplay.style.height)
      let h= firstNumber( this.cardDisplay.style.height);
      //console.log('current height of cardDisplay:',h)
      h += this.cardHeight;
      //console.log('new height of cardDisplay:',h)
      this.cardDisplay.style.height=h+'px';
      this.x=this.xStart;
      this.y+=this.gap+this.cardHeight;
    }

    //console.log("placeCard:", ui, parentG, this.x, this.y, ui.bounds.w, ui.bounds.h);
    ui.drawTo(parentG, this.x, this.y);
    ui.show();
    this.x += this.gap + ui.bounds.w;
    addIf(ui, this.cards);
    ui.tag('hand',faction)
    //TODO: if card does not fit!!!
  }
  placeCardInOpenCards(ui, faction) {
    if (this.openCards.includes(ui)){
      //console.log('card is already in OPEN',ui.id)
      return; //already in open card area!
    } 
    let  parentG = this.openCardsG;

    let wTotal=this.openCardDisplay.offsetWidth;
    //console.log(wTotal)
    if (this.xOpen+this.cardWidth+this.gap > wTotal){
      //console.log('MUSS ERWEITERN!!!!',this.cardDisplay.style.height)
      let h= firstNumber( this.openCardDisplay.style.height);
      //console.log('current height of cardDisplay:',h)
      h += this.cardHeight;
      //console.log('new height of cardDisplay:',h)
      this.openCardDisplay.style.height=h+'px';
      this.xOpen=this.xStart;
      this.yOpen+=this.gap+this.cardHeight;
    }

    //console.log("placeCard:", ui, parentG, this.x, this.y, ui.bounds.w, ui.bounds.h);
    ui.drawTo(parentG, this.xOpen, this.yOpen);
    ui.show();
    //console.log('card',ui.id,'drawn to pos',this.xOpen,this.yOpen);
    this.xOpen += this.gap + ui.bounds.w;
    addIf(ui, this.openCards);
    ui.tag('openCard',faction);//todo make it more meaningful!
  }

  showForeignCard(ui,visibleToList,currentFaction){
    //console.log('card',ui.id, 'shown to',visibleToList.toString())
  }
}
