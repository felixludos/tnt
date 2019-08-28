//responsible for obj_type: tile, chip, influence, nation
class AMap {
	constructor(assets) {
		this.assets = assets;
		this.tiles = {};
		this.chips = {};
		this.influences = {}; //ms by id
		this.vpts = {Axis: [], West: [], USSR: []};
		this.calculateStatsPositions();
		this.dowPositions = this.calculateDowPositions();
		this.nations = this.assets.drawNationPositions();
	}
	calculateDowPositions() {
		let dp = {};
		dp[this.dowKey('West', 'USSR')] = {x: 1244, y: 142};
		dp[this.dowKey('West', 'Axis')] = {x: 1178, y: 142};
		dp[this.dowKey('Axis', 'West')] = {x: 613, y: 2054};
		dp[this.dowKey('Axis', 'USSR')] = {x: 679, y: 2054};
		dp[this.dowKey('USSR', 'West')] = {x: 3332, y: 268};
		dp[this.dowKey('USSR', 'Axis')] = {x: 3332, y: 334};
		return dp;
	}
	calculateStatsPositions() {
		let arr = [];
		let x = 580;
		let y = 2120;
		for (let i = 0; i < 25; i++) {
			arr.push({x: x, y: y});
			x += 66;
		}
		this.vpts.Axis = arr;

		arr = [];
		x = 1310;
		y = 76;
		for (let i = 0; i < 20; i++) {
			arr.push({x: x, y: y});
			x -= 66;
		}
		for (let i = 20; i < 25; i++) {
			arr.push({x: x, y: y});
			y += 66;
		}
		this.vpts.West = arr;

		arr = [];
		x = 2210;
		y = 76;
		for (let i = 0; i < 18; i++) {
			arr.push({x: x, y: y});
			x += 66;
		}
		for (let i = 18; i < 25; i++) {
			arr.push({x: x, y: y});
			y += 66;
		}
		this.vpts.USSR = arr;
	}
	createChip(id, {text = '', filename = '', prefix = '', faction = '', color = 'beige'} = {}) {
		//id is also the filename
		let sz = this.assets.SZ.chip;
		let pts = this.vpts[faction];
		let pos = pts[0];
		let ms = new MS(id, 'mapG', assets.getUniqueId(id))
			.roundedRect({w: sz, h: sz, fill: color})
			.text({txt: text, fill: 'white', weight: 'bold'})
			.setPos(pos.x + sz / 2, pos.y + sz / 2)
			.draw();
		return ms;
	}
	createInfluence(id, nation, faction, value) {
		unitTestMap('createInfluence', id, nation, faction, value);
		let ms = new MS(id, 'mapG', assets.getUniqueId(id));
		this.drawInfluence(ms, nation, faction, value);
		//this.influences[nation] = ms;

		let pos = this.assets.nationPositions[nation];

		let x = pos.x;
		let y = pos.y;
		ms.setPos(x, y).draw();

		return ms;
	}
	createTile(id, o) {
		let pos = this.assets.tilePositions[id];
		let sz = this.assets.SZ.tile;
		let ms = new MS(id, 'mapG', this.assets.getUniqueId(id))
			.circle({className: 'ground', fill: 'transparent', sz: sz})
			.circle({className: 'overlay region', sz: sz})
			.setPos(pos.x, pos.y)
			.draw();
		if ('owner' in o) {
			ms.tag('owner', o.owner);
		}
		return ms;
	}
	dowKey(declarer, other) {
		return declarer + 'DoW' + other;
	}
	drawInfluence(ms, nation, faction, level) {
		if (faction === undefined) {
			alert('drawInfluence faction undefined!!!');
		}
		let imagePath = '/a/assets/images/' + faction + '.svg';

		let color = colorArrToString(...this.assets.troopColors[faction]);

		let darker = pSBC(-0.4, color);
		let lighter = pSBC(0.4, color);
		let sz = this.assets.SZ.influence + 10 * level; //this.assets.SZ.influence;
		let szOuter = sz + 10;
		let szFrame = szOuter + 10;
		let szImage = sz;
		let y = szImage / 6;
		let text = level;
		let rd = dlColor(0.5, 255, 0, 0);
		let fontColor = level != 2 ? 'black' : rd;
		ms.circle({className: 'ground', fill: darker, alpha: 1, sz: szFrame})
			.circle({fill: color, alpha: 1, sz: szOuter})
			.image({path: imagePath, w: szImage, h: sz})
			.text({txt: text, fill: fontColor, fz: szImage - 5, weight: 'bold'})
			.circle({className: 'overlay', sz: szOuter});
		ms.tag('nation', nation);
		ms.tag('faction', faction);
		ms.tag('level', level);
		ms.tag('type', 'influence');
		return ms;

		// let color = this.assets.troopColors[faction];
		// //console.log('COLOR:',color)
		// let darker = darkerColor(color[0], color[1], color[2]);
		// let szMain = this.assets.SZ.influence;
		// let sz = szMain + 10 * level;
		// //let sz = szMain + (szMain * (level - 1)) / 2; //influence grows with level!
		// let sz90 = sz * 0.96;
		// let sz80 = sz * 0.86;
		// let szImage = szMain - 20; //sz / 1.5;
		// let y = szImage / 6;
		// let text = level;
		// let fontColor = level == 1 ? "black" : level == 2 ? "red" : darker;
		// ms.circle({fill: "yellow", alpha: 1, sz: sz})
		//   .circle({fill: darker, sz: szImage + 6})
		//   .circle({fill: color, sz: szImage + 4})
		//   .image({path: imagePath, w: szImage, h: szImage})
		//   .text({txt: text, fill: fontColor, fz: szImage - 5, weight: "bold"})
		//   .circle({className: "overlay", sz: sz});
		// //ms.tag("ttext", ttext); //for tooltip, not yet used
		// ms.tag("nation", nation);
		// ms.tag("faction", faction);
		// ms.tag("level", level);
		// ms.tag("type", "influence");
		// return ms;
	}
	setPopulation(faction, n) {
		this.setChip('pop', 'P', faction, n, 'sienna');
	}
	setIndustry(faction, n) {
		this.setChip('ind', 'I', faction, n, 'red');
	}
	setResource(faction, n) {
		this.setChip('res', 'R', faction, n, 'green');
	}
	setChip(prefix, text, faction, n, color) {
		n -= 1;
		let pts = this.vpts[faction];
		if (n < 0 || (n >= pts.length && !GLOBAL_ALERT)) {
			alert(text + 'setChip!!!! ' + (n + 1) + ', ' + prefix + ', ' + text + ', ' + faction);
			//n = (n + pts.length) % pts.length;
			GLOBAL_ALERT = true;
			STOP = true;
		}
		let id = prefix + faction;
		if (!(id in this.chips)) {
			this.chips[id] = this.createChip(id, {text: text, prefix: prefix, faction: faction, color: color});
		}
		let ms = this.chips[id];

		if (n >= 0 && n < pts.length) {
			let pos = pts[n];
			let offset = 7;
			let yOffset = text == 'P' ? -offset : text == 'I' ? 0 : offset;
			let xOffset = text == 'P' ? -offset : text == 'I' ? 0 : offset;
			pos = {x: pos.x + xOffset, y: pos.y + yOffset};
			ms.setPos(pos.x, pos.y);
		} else {
			ms.hide();
		}
	}
	updateInfluence(id, nation, faction, value) {
		unitTestMap('updateInfluence', id, nation, faction, value);

		let ms = this.influences[id];
		ms.show();
		ms.removeFromChildIndex(1);
		this.drawInfluence(ms, nation, faction, value);
	}
	update(data, gameObjs) {
		if ('created' in data) {
			for (const id in data.created) {
				let o_new = data.created[id];

				//tiles
				if (o_new.obj_type == 'tile') {
					//tile properties to check for changes: 'owner', blockaded, blockaded_afr
					//what about disputed?
					if (id in this.tiles) {
						//check if owner of this tile has changed!
						//is so, update owner of this tile!
						let ms = this.tiles[id];
						let owner_old = ms.getTag('owner');
						if ('owner' in o_new && owner_old != o_new.owner) {
							ms.tag('owner', o_new.owner);
						}

						let blockaded_old = ms.getTag('blockaded');
						if ('blockaded' in o_new && o_new.blockaded && !blockaded_old) {
							//put chip there: instead addBorder(black)
							ms.addBorder('black');
							//set tag
							ms.tag('blockaded', true);
						} else if (blockaded_old) {
							//remove blockaded[id] chip
							//remove tag or set false
							ms.tag('blockaded', false);
							ms.removeBorder();
						}

						let blockaded_afr_old = ms.getTag('blockaded_afr');
						if ('blockaded_afr' in o_new && o_new.blockaded_afr && !blockaded_afr_old) {
							//put chip there: instead addBorder(black)
							ms.addBorder('red');
							//set tag
							ms.tag('blockaded_afr', true);
						} else if (blockaded_afr_old) {
							//remove blockaded[id] chip
							//remove tag or set false
							ms.tag('blockaded_afr', false);
							ms.removeBorder();
						}

						continue; //tiles created once only, only owner is updated
					}
					this.tiles[id] = this.createTile(id, o_new);
					gameObjs[id] = o_new;

					//influences
				} else if (o_new.obj_type == 'influence' && 'nation' in o_new && 'faction' in o_new) {
					unitTestMap('map update', id, this.influences);
					if (id in this.influences) {
						unitTestMap(id, 'is in this.influences');
						let o_old = gameObjs[id];
						// property change check! only value should ever change for existing influence!
						unitTestMap('vor propDiff', o_old, o_new);
						let d = propDiff(o_old, o_new);
						if (d.hasChanged) {
							unitTestMap('influence has changed props:', d.summary.toString());
							this.updateInfluence(id, o_new.nation, o_new.faction, o_new.value);
						}
					} else {
						this.influences[id] = this.createInfluence(id, o_new.nation, o_new.faction, o_new.value);
					}
					gameObjs[id] = o_new;
				}
			}
		}

		if ('removed' in data) {
			//remove influence or some chip (blockade... not implemented)
			for (const id in data.removed) {
				if (id in gameObjs) {
					let o = gameObjs[id];
					if (o.obj_type == 'influence') {
						let ms = this.influences[id]; //o.nation];
						ms.removeFromUI();
						delete gameObjs[id];
						delete this.influences[id]; //o.nation];
					}
				}
			}
		}

		//tracks and war state
		if ('players' in data.info) {
			for (const faction in data.info.players) {
				let pl = data.info.players[faction];
				this.setPopulation(faction, pl.tracks.POP);
				this.setResource(faction, pl.tracks.RES);
				this.setIndustry(faction, pl.tracks.IND);

				for (const other in pl.DoW) {
					if (pl.DoW[other]) {
						let dowId = this.dowKey(faction, other);
						if (!(dowId in this.chips)) {
							let pos = this.dowPositions[dowId];
							this.chips[dowId] = new MS(dowId, 'mapG', this.assets.getUniqueId(dowId))
								.circle({className: 'dowChip', fill: 'transparent', sz: 60})
								.setPos(pos.x, pos.y)
								.draw();
						}
					}
				}
			}
		}
	}
}
