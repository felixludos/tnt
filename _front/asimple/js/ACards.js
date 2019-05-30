class ACards {
	constructor(assets) {
		this.assets = assets;
		this.hands = {};
		this.player = null;
		for (const f of ['Axis', 'West', 'USSR']) {
			let hand = new AHand(this.assets, 'handG_' + f, 'hand_area', f);
			this.hands[f] = hand;
		}
		this.hands['openCards'] = new AHand(this.assets, 'openCardG', 'cards2_area', 'open');
		this.visibleHand = null;
	}
	createCard(id, o) {
		let hand = this.findCardHand(o);
		if (hand) {
			let ms = hand.addNew(id, o);
		}
	}
	findCardHand(o) {
		let vis = getVisibleSet(o);
		if (!vis || (!('owner' in o) && vis.length < 3)) return null; //only create cards that have oanwer or are visible to all
		if (vis.length < 3) {
			return this.hands[o.owner];
		} else {
			return this.hands['openCards'];
		}
	}
	getCardMs(id) {
		if (this.inVisibleHand(id)) {
			return this.visibleHand.cards[id];
		} else return null;
	}
	inVisibleHand(id) {
		return this.visibleHand == null ? false : id in this.visibleHand.cards;
	}
	updateHandView(player) {
		for (const pl of ['Axis', 'USSR', 'West']) {
			let hand = this.hands[pl];
			if (pl == player) {
				hand.show();
			} else hand.hide();
		}
	}
	update(player, data, G) {
		//TODO: handle cards removed
		if (player != this.player) {
			this.updateHandView(player);
			this.player = player;
			this.visibleHand = this.hands[player];
		}
		if (!('created' in data)) {
			unitTestCards('cards update: no created in data: nothing to create or update!');
			return;
		}

		for (const id in data.created) {
			const o_new = data.created[id];
			if (!isCardType(o_new)) {
				unitTestCards('o_new not cardType:', o_new.obj_type);
				continue;
			}

			if (!(id in G)) {
				if (!isVisibleToPlayer(o_new, player) && !('owner' in o_new)) {
					unitTestCards('not visible and no owner', o_new);
					continue;
				}

				//create new card
				let hand = this.findCardHand(o_new);
				hand.addNew(id, o_new);
				G[id] = o_new;
				unitTestCards('created card', id, 'for hand', hand.id, o_new);
			} else {
				let o_old = G[id];
				let d = propDiff(o_old, o_new);
				if (!d.hasChanged) continue;

				unitTestCards('card change', id, d.summary.toString());

				//handle change of visibility
				//only remove card from owner if visible changes
				if (d.summary.includes('visible')) {
					//|| d.summary.includes("owner")) {
					let hand_new = this.findCardHand(o_new);
					let hand_old = this.findCardHand(o_old);
					let ms = hand_old.remove(id);
					let title = ms.getTag('title');
					unitTestCards('removed card', id, title, 'from hand', hand_old.id);
					if (hand_new) {
						hand_new.addExisting(id, o_new, ms);
						G[id] = o_new;
						unitTestCards('added card', id, title, 'to hand', hand_new.id);
					} else {
						delete G[id];
						unitTestCards('DELETED card', id, title);
					}
				} else {
					//d.summary has other properties dont know about this!
					//error("UNKNOWN card property change:", d.summary.toString());
				}
			}
		}
	}
}
