//#region tnt helpers
function filterStringFromTuples(strings, tuples) {
	//in list of tuples, look for s of strings
	//return list of strings contained
	let result = [];
	for (const t of tuples) {
		for (const s of t) {
			//is s a tilename?
			if (strings.includes(s)) {
				result.push(s);
			}
		}
	}
	return result;
}
function findClosestTile(fMetric, goalTile, tilenames) {
	let distances = tilenames.map(x => fMetric(x, goalTile));
	//console.log(distances);
	const indexOfMin = distances.indexOf(Math.min(...distances));
	let best = tilenames[indexOfMin];
	//console.log('closest tiles',best);
	return best;
}
function findClosestTupleForItem(tuples, item, assets) {
	//get all tuples that contain this unit
	tuples = tuples.filter(x => x[0] == item.id);
	if (tuples.length == 0) return null;
	let tilenames = tuples.map(x => x[1]);
	let closestTile = findClosestTile((a, b) => assets.distanceBetweenTiles(a, b), item.goalTile, tilenames);
	console.log('tile closest to goal tile', item.goalTile, ':', closestTile);
	return firstCond(tuples, x => x[1] == closestTile);
}
function findClosestUnit(fMetric, goalTile, units) {
	let distances = units.map(x => fMetric(x.tile, goalTile));
	//console.log(distances);
	const indexOfMin = distances.indexOf(Math.min(...distances));
	let best = units[indexOfMin];
	//console.log('closest tiles',best);
	return best;
}
function getTuples(data) {
	let tuples = [];
	//console.log(data);
	//console.log("getTuples", tuples);
	if ('actions' in data) {
		// tuples = data.actions;
		tuples = expand(data.actions);
		tuples.sort();
		//tuples = "set" in data.actions ? expand(data.actions) : data.actions;

		if (!empty(tuples) && tuples.length == 1 && !Array.isArray(tuples[0])) {
			//console.log("tuple correction", tuples);
			tuples = [tuples]; //correct single with just 'pass' eg.
		}
	}
	//console.log("returning:", tuples);
	return tuples;
}
function getUnitOwner(nationality) {
	if (nationality == 'Germany' || nationality == 'Italy') {
		return 'Axis';
	} else if (nationality == 'USSR') {
		return 'USSR';
	} else if (nationality == 'Britain' || nationality == 'France' || nationality == 'USA') {
		return 'West';
	} else {
		return 'Minor';
	}
}
function getVisibleSet(o) {
	return getSet(o, 'visible');
	if (!('visible' in o) || (!('set' in o.visible) && !('xset' in o.visible))) return null;
	else if ('set' in o.visible) return o.visible.set;
	else return o.visible.xset;
}
function getSet(o, key) {
	if (!(key in o) || (!('set' in o[key]) && !('xset' in o[key]))) return null;
	else if ('set' in o[key]) return o[key].set;
	else return o[key].xset;
}
function logFormattedData(data, n, msgAfter = '') {
	let s = makeStrings(data, ['game', 'actions', 'waiting_for', 'created']);
	console.log('___ step ' + n, '\n' + s);
	console.log(msgAfter);
}
function isANS(unitType) {
	return ['AirForce', 'Submarine', 'Carrier', 'Fleet'].includes(unitType);
}
function isCardType(o) {
	return 'obj_type' in o && endsWith(o.obj_type, 'card');
}
function isVisibleToPlayer(o, player) {
	let vis = getVisibleSet(o);
	if (vis && vis.includes(player)) return true;
}
function isWrongPhase(optPhase, curPhase) {
	return optPhase != 'any' && !startsWithCaseIn(curPhase, optPhase);
}
function isTooEarly(optYear, curYear, optStep, curStep) {
	return Number(curYear) < optYear || curStep < optStep;
}
function isWrongPlayer(optPlayer, curPlayer) {
	return optPlayer != 'any' && !startsWithCaseIn(curPlayer, optPlayer);
}
function matchUnits(darr, option, pl = null, tile = null, type = null, cv = null) {
	//option can be 'all' or 'first' or 'last' or 'firstAndLast' (for testing)
	//console.log('call matchUnits:',darr,'\noption=',option,'\npl',pl,'\ntile',tile,'\ntype',type,'\ncv',cv)
	let arr = null;
	//console.log(typeof darr)
	if (typeof darr === 'object' && darr.constructor == Object) {
		arr = dict2list(darr, 'id');
	} else arr = darr;
	let result = [];

	for (const o of arr) {
		if (o.obj_type != 'unit') continue;
		if (pl && getUnitOwner(o.nationality) != pl) continue;
		if (tile && o.tile != tile) continue;
		if (type && o.type != type) continue;
		if (cv && o.cv != cv) continue;
		//console.log('>>>',o,option,option == 'first');
		if (option == 'first') {
			//console.log('HAAAAAAAAAAAALLLLLLLLLLLLLLOOOOOOOOOOOOOO')
			return o;
		}
		result.push(o);
	}

	if (result.length == 0) return option == 'all' ? [] : null;
	return option == 'all' ? result : option == 'last' ? result[result.length - 1] : (result[0], result[result.length - 1]);
}
function matchSingleUnit_dep(idDict, pl, tile, type) {
	//assumes only 1 unit should fit
	let arr = dict2list(idDict, 'id');
	let units = arr.filter(x => x.obj_type == 'unit' && getUnitOwner(x.nationality) == pl && x.tile == tile && x.type == type); // do I need cv?
	if (units.length > 1) {
		msg = 'matchSingleUnit: MULTIPLE UNITS MATCH EXACTLY!!!';
		console.log(msg, units);
		alert(msg);
	} else if (units.length == 1) {
		return units[0];
	}
	return null;
}
function matchAllUnits_dep(arr, pl, tile, type) {
	//assumes only 1 unit should fit
	let units = arr.filter(x => x.obj_type == 'unit' && getUnitOwner(x.nationality) == pl && x.tile == tile && x.type == type); // do I need cv?
	if (units.length > 1) {
		msg = 'matchSingleUnit: MULTIPLE UNITS MATCH EXACTLY!!!';
		console.log(msg, units);
		alert(msg);
	} else if (units.length == 1) {
		return units[0];
	}
	return null;
}
function outputCombatData(title, data, H) {
	console.log('________________' + title);
	console.log('H', H);
	let c = data.temp.combat;
	let sCombat = c == undefined ? 'undef' : c.stage + ', battles: ' + Object.keys(c.battles).toString();
	let sBattle = c == undefined || c.battle == undefined ? 'undef' : c.battle.stage + ', loc: ' + c.battle.tilename;
	console.log('data.combat: ' + sCombat);
	console.log('dt.c.battle: ' + sBattle);
	// let cFront = H.combat;
	// let c = data.temp.combat;
	// console.log('Back end (data.temp.combat):');
	// console.log('H', H);
	// if (c === undefined) {
	// 	console.log('combat data gone!');
	// } else {
	// 	console.log('combat:', c.stage, c.battles, c.battle);
	// 	if ('battle' in c && c.battle) {
	// 		console.log('battle:', c.battle, c.battle.stage);
	// 	}
	// 	console.log('Front end (H.combat):');
	// 	console.log('combat:', cFront.stage, cFront.battles, cFront.battle);
	// 	if ('battle' in cFront && cFront.battle) {
	// 		console.log('battle:', cFront.battle, cFront.battle.stage);
	// 	}
	// 	H.combat.update(data, H);
	// }
	// console.log('____________________________(line 617)');
}
function outputPlayerUnits(pl, H) {
	let dObjects = dict2list(H.objects, 'id');
	dObjects = dObjects.filter(x => x.obj_type == 'unit');
	let unitsPlayer = dObjects.filter(x => getUnitOwner(x.nationality) == pl);
	sortBy(unitsPlayer, 'tile');
	console.log(pl);
	for (const u of unitsPlayer) {
		console.log(u.type, u.type == 'Fleet' || u.type == 'Tank' ? '\t\t' : '\t', u.cv, '\t', u.tile, u.id);
	}
}
function outputUpdatedScenario(decider, player = false) {
	reqs = ''; //global var declared in index.html
	if (decider.decisionMode == 'scenario') {
		for (const pl of ['Axis', 'West', 'USSR']) {
			if (pl in decider.scenario.items) {
				if (player && player != pl) continue;
				reqs += pl + '\n';
				for (const x of decider.scenario.items[pl]) {
					reqs += '  goal=(' + x.goalTile + ',' + x.goalCv + ') ' + x.type + ' ' + x.id;
					if (x.unit) reqs += ' ' + x.unit.tile + ' ' + x.unit.cv;
					reqs += '\n';
				}
			}
			if (pl in decider.scenario.diplItems) {
				reqs += pl + '\n';
				for (const nat in decider.scenario.diplItems[pl]) {
					reqs += '  ' + nat + ': ' + decider.scenario.diplItems[pl][nat];
					reqs += '\n';
				}
			}
		}
		reqs += 'done: ' + decider.scenario.done;
		unitTestScenario(reqs);
	}
}
function mergeCreatedAndUpdated(data) {
	if (!('created' in data)) data.created = {};
	data.created = extend(true, data.created, data.updated);

	//verify merge worked: created should have same data as updated for same ids
	let mergeFailed = false;
	let d = {};
	if ('created' in data && 'updated' in data) {
		for (const id in data.updated) {
			if (!(id in data.created)) {
				d.summary = 'missing id in data.created ' + id;

				//console.log("missing id in data.created " + id);
			} else {
				for (const key in data.updated[id]) {
					if (!(key in data.created[id]) || data.created[id][key] != data.updated[id][key]) {
						if (key == 'visible') {
							let set1 = getVisibleSet(data.created[id]);
							let set2 = getVisibleSet(data.updated[id]);
							if (sameList(set1, set2)) continue;
							if (empty(set1) && empty(set2)) continue;
							console.log('MERGE FAILED!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!', id, key);
							console.log('created:', data.created[id][key]);
							console.log('updated:', data.updated[id][key]);
							console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
						}
					}
				}
				// d = propDiff(data.created[id], data.updated[id]);
				// if (d.hasChanged && (!empty(d.propChange) || !empty(d.onlyNew))) {
				// 	mergeFailed = true;
				// 	//alert('MERGE FAILED!!!'+id + " " + d.summary.toString());

				// 	//console.log("difference created - updated: " + id + " " + d.summary.toString());
				// 	//console.log(d);
				// 	//console.log("created:", data.created[id]);
				// 	//console.log("updated:", data.updated[id]);
				// }
			}
			if (mergeFailed) console.log('MERGE FAILED!!!', id, d.summary.toString(), data);
		}
	}
}
function randomUnitTuple() {
	let tile = chooseRandom(assets.tileNames);
	let nationality = chooseRandom(assets.nationalityNames);
	let unitType = chooseRandom(assets.unitTypeNames);

	// let faction = getUnitOwner(nationality);
	return [nationality, tile, unitType, 2];
}
function saveToDownloads(data, fname) {
	json_str = JSON.stringify(data);
	saveFile(fname + '.json', 'data:application/json', new Blob([json_str], {type: ''}));
}
//#endregion

//#region send
function sendAction(player, actionTuple, callback) {
	sender.send('action_test/' + player + '/' + actionTuple.join('+'), dAction => {
		unitTestSender(dAction);

		actionOrWaiting(player, dAction, callback);
	});
}
function actionOrWaiting(player, dAction, callback) {
	if ('actions' in dAction) {
		unitTestSender('found actions for', player);
		dAction.info.game.player = player;
		//unitTestLoad("callback with", dAction);
		callback(dAction);
	} else if ('waiting_for' in dAction) {
		let waiting = getSet(dAction, 'waiting_for');
		unitTestSender('NEED PLAYER CHANGE!!!!!!!!!!!!', waiting);
		if (!empty(waiting)) {
			let newPlayer = waiting[0];
			sender.send('status_test/' + newPlayer, dNewPlayer => {
				//merge new data into dAction
				dAction = extend(true, dAction, dNewPlayer);
				unitTestSender('action+status data for', newPlayer, dAction);
				dAction.info.game.player = newPlayer;
				callback(dAction);
			});
		} else {
			//got empty waitingfor set!!!
			alert('empty waiting_for and no actions!!!');
		}
	} else {
		unitTestSender('NEED TO SEND EMPTY ACTION!!!!!!!!!!!!!', player);
		alert('sending empty action!!!', player);
		sendAction(player, ['pass'], dEMpty => {
			dAction = extend(true, dAction, dEmpty);
			callback(dAction);
		}); //recurse
	}
}
function sendInit(player, callback) {
	sendInitSeed(player, null, callback);
}
function sendInitSeed(player, seed, callback) {
	let url = 'init_test/hotseat/' + player;
	if (seed != null) url += '/' + seed;
	unitTestSender('url:', url);
	sender.send(url, dInit => {
		unitTestSender('dInit:', dInit);
		dInit.info.game.player = player;
		callback(dInit);
	});
}
function sendLoading(player, filename, callback) {
	unitTestLoad('loading', filename);
	var sData = {};
	sender.send('myload/' + filename + '.json', d1 => {
		unitTestLoad('myload response:', d1);
		sender.send('refresh/' + player, d2 => {
			unitTestLoad('refresh response:', d2);
			sData.created = d2;
			sender.send('status_test/' + player, d3 => {
				sData = augment(sData, d3);
				unitTestLoad('status_test response:', d3, 'akku:', sData, 'player', player);

				actionOrWaiting(player, sData, callback);
				// if ("actions" in sData) {
				//   sData.info.game.player = player;
				//   callback(sData);
				// } else if ("waiting_for" in sData) {
				//   let waiting = getSet(sData, "waiting_for");
				//   unitTestSender("PLAYER CHANGE!!!!!!!!!!!!", waiting);
				//   if (!empty(waiting)) {
				//     let newPlayer = waiting[0];
				//     sender.send("status_test/" + newPlayer, dNewPlayer => {
				//       //merge new data into dAction
				//       sData = extend(true, sData, dNewPlayer);
				//       unitTestSender("action+status data for", newPlayer, sData);
				//       sData.info.game.player = newPlayer;
				//       callback(sData);
				//     });
				//   } else {
				//     //got empty waitingfor set!!!
				//     alert("empty waiting_for and no actions!!!");
				//   }
				// } else {
				//   alert("sending empty action!!!", player);
				//   sendAction(player, ["pass"], d4 => {
				//     sData = extend(true, sData, d4);
				//     callback(sData);
				//   });
				// }
			});
		});
	});
}
function sendLoadScenario2(player, filename, callback) {
	unitTestScenario('_____________________loading scenario', filename);
	var sData = {};
	sender.send('myloadScenario2/' + filename + '.yml', d1 => {
		unitTestScenario('server response:', d1);
		callback(d1);
		// sender.send("refresh/" + player, d2 => {
		//   unitTestScenario("refresh response:", d2);
		//   sData.created = d2;
		//   sender.send("status_test/" + player, d3 => {
		//     sData = augment(sData, d3);
		//     unitTestScenario("status_test response:", d3, "akku:", sData, "player", player);

		//     actionOrWaiting(player, sData, callback);
		//   });
		// });
	});
}
function sendLoadScenario(player, filename, callback) {
	unitTestScenario('loading', filename);
	var sData = {};
	sender.send('myloadScenario/' + filename + '.json', d1 => {
		unitTestScenario('myloadScenario response:', d1);
		callback(d1);
		// sender.send("refresh/" + player, d2 => {
		//   unitTestScenario("refresh response:", d2);
		//   sData.created = d2;
		//   sender.send("status_test/" + player, d3 => {
		//     sData = augment(sData, d3);
		//     unitTestScenario("status_test response:", d3, "akku:", sData, "player", player);

		//     actionOrWaiting(player, sData, callback);
		//   });
		// });
	});
}
//_____________________________________________________trash
function sendInitSeed_old(player, seed, callback) {
	sender.send('init/hotseat/' + player + '/' + seed, dInit => {
		sender.send('info/' + player, dInfo => {
			dInit = extend(true, dInit, dInfo);
			dInit.game.player = player;
			//console.log(dInit);
			callback(dInit);
		});
	});
}
function sendInit_old(player, callback) {
	sender.send('init/hotseat/' + player, dInit => {
		sender.send('info/' + player, dInfo => {
			dInit = extend(true, dInit, dInfo);
			dInit.game.player = player;
			callback(dInit);
		});
	});
}
function sendAction_old(player, actionTuple, callback) {
	sender.send('action_test/' + player + '/' + actionTuple.join('+'), dAction => {
		//console.log(dAction);
		sender.send('info/' + player, dInfo => {
			dAction = extend(true, dAction, dInfo);
			if ('actions' in dAction) {
				dAction.game.player = player;
				//console.log(dAction);
				callback(dAction);
			} else if ('waiting_for' in dAction) {
				let waiting = getSet(dAction, 'waiting_for');
				//console.log("PLAYER CHANGE!!!!!!!!!!!!", waiting);
				if (!empty(waiting)) {
					let newPlayer = waiting[0];
					dAction.game.player = newPlayer;
					sender.send('status/' + newPlayer, dNewPlayer => {
						sender.send('info/' + newPlayer, dNewInfo => {
							dNewPlayer = extend(true, dNewPlayer, dNewInfo);
							dNewPlayer.game.player = newPlayer;
							callback(dNewPlayer);
						});
						//throw away old player,
					});
				} else {
					//got empty waitingfor set!!!
					alert('empty waiting_for and no actions!!!');
				}
			} else {
				sendAction(player, ['pass'], callback);
			}
		});
	});
}

function sendEmptyAction(player, callback) {
	testOutput({1: ['sending empty action!!!']});
	sendAction(player, ['none'], callback);
}
function sendAction_old(player, tuple, callback, ms = 30) {
	setTimeout(() => {
		testOutput({1: ['sending action:' + player + tuple + callback.name]});
		testOutput({0: [player + ' selects:' + tuple]});
		let chain = ['action/' + player + '/' + tuple.join('+'), 'info/' + player, 'status/' + player];
		sender.chainSend(chain, player, callback);
	}, ms);
}
function sendEditAction(player, tuple, callback, ms = 30) {
	setTimeout(() => {
		testOutput({1: ['sending action:' + player + tuple + callback.name]});
		testOutput({0: [player + ' selects:' + tuple]});
		sender.send('edit/' + player + '/' + tuple.join('+'), callback);
		//let chain = ["edit/" + player + "/" + tuple.join("+"), "info/" + player, "status/" + player];
		//sender.chainSend(chain, player, callback);
	}, ms);
}
function sendChangeToPlayer(nextPlayer, callback) {
	let chain = ['info/' + nextPlayer, 'status/' + nextPlayer];
	sender.chainSend(chain, nextPlayer, callback);
}
//deprecate!
function sendChangePlayer(data, callback) {
	//deprecate!!!
	player = data.waiting_for.set[0];
	if (!assets.factionNames.includes(player)) {
		logFormattedData(data, msgCounter, 'ERROR: waiting_for data corrupt!!!' + player);
	} else {
		//console.log("________ player:", player);
		let chain = ['info/' + player, 'status/' + player];
		sender.chainSend(chain, player, callback);
	}
}
function sendInit_old(player, callback, seed = 1) {
	var chain = ['init/hotseat/' + player + '/' + seed, 'info/' + player, 'status/' + player];
	sender.chainSend(chain, player, callback);
}
function sendLoading_old(filename, player, callback, outputOption = 'none') {
	//console.log("loading", filename);
	execOptions.output = outputOption;
	var sData = {};
	sender.send('myload/' + filename + '.json', data => {
		//console.log("myload response:", data);
		sender.send('refresh/' + player, data => {
			//console.log("refresh response:", data);
			sData.created = data;
			let chain = ['info/' + player, 'status/' + player];
			sender.chainSend(chain, player, data => {
				//console.log("info+status response:", data);
				sData = augment(sData, data);
				sData.created = augment(sData.created, sData.updated);
				if ('waiting_for' in data && empty(getSet(data, 'waiting_for'))) {
					sender.send('action/' + player + '/none', data => {
						//console.log("empty action response:", data);
						sData = augment(sData, data);
						//console.log("=augmented data:", sData);
						if (callback) callback(sData);
					});
				} else {
					if (callback) callback(sData);
				}
			});
		});
	});
}

//#endregion send
