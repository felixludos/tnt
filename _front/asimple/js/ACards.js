class ACards {
  constructor(assets) {
    this.assets = assets;
    this.hands = {};
    this.player = null;
    for (const f of ["Axis", "West", "USSR"]) {
      let hand = new AHand(this.assets, "handG_" + f, "hand_area");
      this.hands[f] = hand;
    }
    this.hands["openCards"] = new AHand(this.assets, "openCardG", "cards2_area");
  }
  createCard(id, o) {
    let hand = this.findCardHand(o);
    if (hand) {
      let ms = hand.addNew(id, o);
    }
  }
  findCardHand(o) {
    let vis = getVisibleSet(o);
    if (!vis || (!("owner" in o) && vis.length < 3)) return null; //only create cards that have oanwer or are visible to all
    if (vis.length < 3) {
      return this.hands[o.owner];
    } else {
      return this.hands["openCards"];
    }
  }
  updateHandView(player) {
    for (const pl of ["Axis", "USSR", "West"]) {
      let hand = this.hands[pl];
      if (pl == player) {
        hand.show();
      } else hand.hide();
    }
  }
  update(player, data, G) {
    if (player != this.player) {
      this.updateHandView(player);
      this.player = player;
    }
    //cards in data.created or update are created if they do not exist
    //hab ich eigentlich created und update ueberlagert?
    //quickcheck! just for safety!
    //console.log(data, gameObjects); return;
    if ("created" in data && "updated" in data) {
      for (const id in data.updated) {
        if (!(id in data.created)) {
          console.log("missing id in data.created " + id);
        } else {
          let d = propDiff(data.created[id], data.updated[id]);
          if (d.hasChanged && (!empty(d.propChange) || !empty(d.onlyNew))) {
            console.log("difference created - updated: " + id + " " + d.summary.toString());
            console.log(d);
            console.log("created:", data.created[id]);
            console.log("updated:", data.updated[id]);
          }
        }
      }
    }
    if (!("created" in data)) return;
    let cnt = 0;
    for (const id in data.created) {
      const o_new = data.created[id];
      // if (isCardType(o_new) && 'owner' in o_new && o_new.owner == player){
      //   cnt+=1;
      //   console.log(cnt,':',o_new);
      // }
      if (isCardType(o_new) && (isVisibleObject(o_new, player) || "owner" in o_new)) {
        console.log("card " + cnt + ":", o_new);
        cnt += 1;

        //find out whether this card exists already: id in G
        //G contains state before this update!
        //if id is not in G, this card needs to be created
        //if id is in G but has different owner or visibility,this card needs hand change
        //if id is in G and has same owner and same visibility, show which props have changed! (can't think of any!)
        if (!(id in G)) {
          let hand = this.findCardHand(o_new);
          hand.addNew(id, o_new);
        } else {
          let o_old = G[id];
          let d = propDiff(o_old, o_new);
          if (d.hasChanged && (!empty(d.propChange) || !empty(d.onlyNew))) {
            console.log("difference created - updated: " + id + " " + d.summary.toString());
            console.log(d);
            console.log("old:", o_old);
            console.log("new:", o_new);
          }
        }
      }
    }
  }

  //#region trash
  // update_dep(player, data, G) {
  //   let cardNumberMightHaveChanged = [];
  //   for (const id in G) {
  //     let o = G[id];
  //     if (!this.isCard(o) || (!("owner" in o) && !(id in this.cards))) continue;
  //     if (!(id in this.cards)) {
  //       let ms = this.createCard(id, o);
  //       let vis = getVisibleSet(o);
  //       if (vis.includes(player)) {
  //         addIf(ms, cardNumberMightHaveChanged);
  //       }
  //       // if (ms) {
  //       //   //console.log("CREATED card", id);
  //       //   //console.log(" props changed:", Object.keys(o).toString());
  //       // }
  //     } else {
  //       let ms = this.cards[id];
  //       let o_new = o;
  //       let o_old = this.cardObjects[id];

  //       // if (id == 'action_26'){
  //       //   //console.log(id,o_old,o_new)
  //       // }
  //       //check which props have changed!
  //       //update accordingly!
  //       //console.log("o_old", o_old);
  //       //console.log("o_new", o_new);
  //       let ch = propDiff(o_old, o_new);
  //       //console.log(ch)
  //       if (ch.hasChanged) {
  //         //console.log('update card',id,':',ch.summary)
  //         //console.log("update:", id);
  //         if (!empty(ch.summary)) {
  //           //console.log(" props changed:", summary.toString());
  //           if (ch.summary.includes("visible") || ch.summary.includes("owner")) {
  //             //console.log('visible is in ch.summary or owner')
  //             let newParentName = this.findParentForCard(o);
  //             if (newParentName != ms.parent.id) {
  //               //console.log("parent changed to", newParentName ? newParentName : "null");
  //               this.changeParentTo(ms, newParentName);
  //               let vis = getVisibleSet(o);
  //               if (vis.includes(player)) {
  //                 addIf(ms, cardNumberMightHaveChanged);
  //               }
  //             }
  //           }
  //         }
  //         // if (!empty(ch.onlyOld)) //console.log(" old:", onlyOld.toString());
  //         // if (!empty(ch.onlyNew)) //console.log(" new:", onlyNew.toString());
  //         // if (!empty(ch.propChange)) //console.log("  changes:", propChange);
  //       }
  //       // else{

  //       //   let newParentName = this.findParentForCard(o_new);
  //       //   if (newParentName != ms.parent.id) {
  //       //     //console.log("parent changed to", newParentName ? newParentName : "null");
  //       //     this.changeParentTo(ms, newParentName);
  //       //   }

  //       // }

  //       //if owner or visibility changed
  //     }
  //   }

  //   let hand = document.getElementById("handG_" + player);
  //   //console.log('end of update',hand);
  //   for (const ms of cardNumberMightHaveChanged) {
  //     let parent = ms.parent;
  //     let lastChild = parent.lastChild;
  //     if (ms == this.cards[lastChild.id]) {
  //       //console.log('calling dimensionDiv after update for',ms)
  //       this.dimensionDiv(ms);
  //     }
  //   }
  // }
  // isCard(o) {
  //   //console.log('isCard?',o.obj_type)
  //   //console.log('isCard?',o)
  //   // return ("id" in o && o.id in this.cards) || ("obj_type" in o && endsWith(o.obj_type, "card"));
  //   return "obj_type" in o && endsWith(o.obj_type, "card");
  // }

  // createCard_dep(id, o) {
  //   let parentName = this.findParentForCard(o);
  //   if (parentName == null) return null; //if card is not visible it is not created

  //   //console.log("card is created!", id, Object.keys(o).toString());
  //   let pos = this.findPositionForCard(parentName);

  //   let ms = new MS(id, id, parentName); // cards have id also as elem id! so make sure it is unique!
  //   this.setCardContent(ms, o);

  //   //pos={x:100,y:110};

  //   ms.setPos(pos.x, pos.y).draw();
  //   this.cards[id] = ms;
  //   this.cardObjects[id] = jsCopy(o);
  //   //console.log('createCard',ms,pos)
  //   return ms;
  // }
  // changeParentTo(ms, newParentName) {
  //   //console.log('changeParentTo',ms,newParentName)
  //   let oldParent = ms.parent; // a g element
  //   if (!newParentName) {
  //     ms.removeFromUIAndParent();
  //   } else {
  //     let newParent = document.getElementById(newParentName);
  //     if (newParent != ms.parent) {
  //       ms.removeFromUI();
  //       ms.parent = newParent;
  //       let pos = this.findPositionForCard(newParentName); //erweitert wenn noetig
  //       ms.setPos(pos.x, pos.y).draw();
  //     }
  //   }
  //   this.relayoutCards(oldParent);
  // }
  // dimensionDiv(ms) {
  //   //console.log('dimensionDiv',ms);
  //   //if (!ms || !('id' in ms)) return;
  //   let pos = ms.getPos(); //this.cards[ms.id].getPos();
  //   let hNeeded = pos.y + this.gap * 2 + this.cardHeight / 2;
  //   let div = ms.parent.parentNode.parentNode;
  //   //console.log(div,lastChild,posLastChild,this.cardHeight)

  //   let hCurrent = firstNumber(div.style.height);
  //   //console.log("current height of cardDisplay:", hCurrent);
  //   //console.log("height needed:", hNeeded);

  //   div.style.height = hNeeded + "px";
  // }

  // findParentForCard(o) {
  //   let vis = getVisibleSet(o);
  //   if (!vis || (!("owner" in o) && vis.length < 3)) return null; //only create cards that have oanwer or are visible to all
  //   let parentName = null;
  //   if (vis.length == 0) {
  //     return null;
  //   } else if (vis.length < 3) {
  //     parentName = "handG_" + o.owner; //card belongs in a hand
  //   } else {
  //     parentName = "openCardG"; //card is open to all
  //   }
  //   return parentName;
  // }
  // findPositionForCard(parentName) {
  //   let parent = document.getElementById(parentName);
  //   //console.log("parent:", parentName, parent);

  //   let nCards = parent.childNodes.length; // NO - 1; //because of text!
  //   let lastChild = nCards <= 1 ? null : parent.childNodes[nCards - 1];
  //   //console.log("lastChild:", nCards, lastChild);

  //   if (!lastChild) {
  //     //console.log('returning startPos:',this.startPos.x,this.startPos.y)
  //     return {x: this.startPos.x, y: this.startPos.y};
  //   }
  //   let posLastChild = this.cards[lastChild.id].getPos();
  //   let x = posLastChild.x + this.gap + this.cardWidth;
  //   let y = posLastChild.y;
  //   let div = parent.parentNode.parentNode;
  //   let wTotal = div.offsetWidth;
  //   if (x + this.cardWidth + 2 > wTotal) {
  //     //console.log("MUSS IN NEUE ZEILE!!!");
  //     x = this.startPos.x;
  //     y += this.cardHeight + this.gap;
  //     // let hTotal = div.offsetHeight;
  //     // let hDiv = firstNumber(div.style.height);
  //     // //console.log("current height of cardDisplay:", hDiv);
  //     // //console.log("card new y:", y);
  //     // if (hDiv < y + this.cardHeight/2 + 2) {
  //     //   //console.log("MUSS ERWEITERN!!!");
  //     //   hDiv += this.cardHeight/2 + this.gap;
  //     //   div.style.height = hDiv + "px";
  //     //   //console.log("new height of cardDisplay:", hDiv);
  //     // }
  //   }
  //   //console.log('pos in findPositionForCard',x,y)
  //   return {x: x, y: y};
  // }
  relayoutCards(parent) {
    let hand = [];
    //console.log('relayoutCards',parent.childNodes)
    for (const c of Array.from(parent.childNodes)) {
      //console.log('childNode',c)
      if (c.id && c.id in this.cards) {
        hand.push(this.cards[c.id]);
      }
    }

    for (const c of hand) {
      c.removeFromUI();
    }

    //console.log('..................hand',hand,parent.id,parent)
    for (const c of hand) {
      let pos = this.findPositionForCard(parent.id);
      //console.log('pos',pos)
      c.setPos(pos.x, pos.y).draw();
    }

    //console.log('......................',last(hand))
    this.dimensionDiv(last(hand));
  }
  resizePlayerHand(player) {
    //find last card in player hand
    let handG = document.getElementById("handG_" + player);
    //find last child of this element
    let lastChild = handG.lastChild;
    //if this child has an id, find ms with that same id
    if ("id" in lastChild) {
      let ms = this.cards[lastChild.id];
      //dimensionDiv of this last child
      this.dimensionDiv(ms);
    }
  }
  //#endregion trash
}
