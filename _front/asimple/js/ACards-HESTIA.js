class ACards {
  constructor(assets) {
    this.assets = assets;
    this.cards = {};
    this.cardObjects = {};
    this.cardWidth = assets.SZ.cardWidth;
    this.cardHeight = assets.SZ.cardHeight;
    this.gap = assets.SZ.gap;
    this.startPos = {x: 80 + this.gap + this.cardWidth / 2, y: this.gap + this.cardHeight / 2};
  }
  createCard(id, o) {
    let parentName = this.findParentForCard(o);
    if (parentName == null) return null; //if card is not visible it is not created

    console.log("card is created!", id, Object.keys(o).toString());
    let pos = this.findPositionForCard(parentName);

    let ms = new MS(id, id, parentName); // cards have id also as elem id! so make sure it is unique!
    this.setCardContent(ms, o);

    //pos={x:100,y:110};

    ms.setPos(pos.x, pos.y).draw();
    this.cards[id] = ms;
    this.cardObjects[id] = jsCopy(o);
    //console.log('createCard',ms,pos)
    return ms;
  }
  changeParentTo(ms, newParentName) {
    if (!newParentName) {
      ms.removeFromUIAndParent();
    } else {
      let newParent = document.getElementById(newParentName);
      if (newParent != ms.parent) {
        ms.removeFromUI();
        ms.parent = newParent;
        let pos = this.findPositionForCard(newParentName);
        ms.setPos(pos.x, pos.y).draw();
      }
    }
  }
  findParentForCard(o) {
    let vis = getVisibleSet(o);
    if (!"owner" in o) return null;
    let parentName = null;
    if (vis.length == 0) {
      return null;
    } else if (vis.length < 3) {
      parentName = "handG_" + o.owner; //card belongs in a hand
    } else {
      parentName = "openCardG"; //card is open to all
    }
    return parentName;
  }
  findPositionForCard(parentName) {
    let parent = document.getElementById(parentName);
    //console.log("parent:", parentName, parent);

    let nCards = parent.childNodes.length; // NO - 1; //because of text!
    let lastChild = nCards <= 1 ? null : parent.childNodes[nCards - 1];

    if (!lastChild) return {x: this.startPos.x, y: this.startPos.y};
    let posLastChild = this.cards[lastChild.id].getPos();
    let x = posLastChild.x + this.gap + this.cardWidth;
    let y = posLastChild.y;
    let div = parent.parentNode.parentNode;
    let wTotal = div.offsetWidth;
    if (x + this.cardWidth + 2 > wTotal) {
      console.log("MUSS IN NEUE ZEILE!!!");
      x = this.startPos.x;
      y += this.cardHeight + this.gap;
      let hTotal = div.offsetHeight;
      let hDiv = firstNumber(div.style.height);
      console.log("current height of cardDisplay:", hDiv);
      console.log("card new y:", y);
      if (hDiv < y + this.cardHeight + 2) {
        console.log("MUSS ERWEITERN!!!");
        hDiv += this.cardHeight + this.gap;
        div.style.height = hDiv + "px";
        console.log("new height of cardDisplay:", hDiv);
      }
    }
    return {x: x, y: y};
  }
  isCard(id, o) {
    //console.log('isCard?',id,o.obj_type)
    //console.log('isCard?',o)
    return endsWith(o.obj_type, "card");
  }
  relayoutCards(parentName) {
    let parent = document.getElementById(parentName);
    let hand = [];
    for (const c in arrChildNodes(parent)) {
      if (c.id && c.id in this.cards) {
        hand.push(this.cards[c.id]);
      }
    }

    for (const c of hand) {
      c.removeFromUI();
    }

    for (const c of hand) {
      let pos = this.findPositionForCard(parentName);
      c.setPos(pos).draw();
    }
  }
  setCardContent(ms, o) {
    let txt = [];
    let title = "";
    if ("top" in o) {
      if (o.obj_type == "action_card") {
        txt = [o.top, " ", o.season, o.priority + o.value, " ", o.bottom];
      } else {
        txt = [o.top, " ", " ", o.value ? o.value.toString() : " ", " ", " ", o.bottom];
      }
      title = o.top;
    } else if ("wildcard" in o) {
      txt = [o.wildcard, " ", o.season, o.priority + o.value, " ", " "];
      title = o.wildcard;
    } else if ("intelligence" in o) {
      txt = [o.intelligence, " ", " ", o.value ? o.value.toString() : " ", " ", " ", " "];
      title = o.intelligence;
    } else if ("science" in o) {
      txt = [o.value + "   (" + o.year.toString() + ")"];
      o.science.map(x => txt.push(x));
      title = o.year;
    }
    if (txt.length > 0) {
      //console.log(txt)
      txt = txt.map(x => x.replace(/_/g, " "));
    }
    let cardWidth = this.cardWidth;
    let cardHeight = this.cardHeight;
    console.log(cardWidth, cardHeight);

    let testText = ms.id;
    if ("owner" in o) {
      testText += " " + o.owner;
    }

    ms.roundedRect({w: cardWidth, h: cardHeight, fill: "white"})
      .text({txt: testText, fill: "red", y: cardHeight / 2, fz: cardWidth / 7})
      .textMultiline({txt: txt, maxWidth: cardWidth, fz: cardWidth / 7}) // / 6})
      .roundedRect({className: "overlay", w: cardWidth, h: cardHeight});

    ms.tag("content", txt);
    ms.tag("type", o.obj_type);
    ms.tag("title", title);
    ms.tag("json", JSON.stringify(o));
    return ms;
  }

  update(data, G) {
    for (const id in G) {
      let o = G[id];
      if (!this.isCard(id, o) || (!("owner" in o) && !(id in this.cards))) continue;
      if (!(id in this.cards)) {
        let ms = this.createCard(id, o);
        // if (ms) {
        //   //console.log("CREATED card", id);
        //   //console.log(" props changed:", Object.keys(o).toString());
        // }
      } else {
        let ms = this.cards[id];
        let o_new = o;
        let o_old = this.cardObjects[id];

        //check which props have changed!
        //update accordingly!
        //console.log("o_old", o_old);
        //console.log("o_new", o_new);
        let ch = propDiff(o_old, o_new);
        if (ch.hasChanged) {
          //console.log("update:", id);
          if (!empty(ch.summary)) {} //console.log(" props changed:", summary.toString());
          // if (!empty(ch.onlyOld)) //console.log(" old:", onlyOld.toString());
          // if (!empty(ch.onlyNew)) //console.log(" new:", onlyNew.toString());
          // if (!empty(ch.propChange)) //console.log("  changes:", propChange);
        }

        //if owner or visibility changed
        let newParentName = this.findParentForCard(o);
        if (newParentName != ms.parent.id) {
          console.log("parent changed to", newParentName ? newParentName : "null");
          this.changeParentTo(ms, newParentName);
        }
      }
    }
  }
}
