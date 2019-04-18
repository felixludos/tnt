
import tnt_util as util
from tnt_util import adict, xset, tdict, tlist, tset, idict, PhaseComplete
from tnt_cards import discard_cards
import random

import operator

def encode_intel_response(G, intel_card, player, target):
	
	code = adict()
	
	options = xset(('accept',))
	
	msg = '{} plays {} and is targetting you'.format(player, intel_card.intelligence)
	
	for cid in G.players[target].hand:
		card = G.objects.table[cid]
		if 'intelligence' in card and card.intelligence == 'Double_Agent':
			
			opts = get_intel_options(G, target, intel_card)
			if len(opts):
				msg = 'You may play your Double Agent to reverse the effect of {} played by {}'.format(intel_card.intelligence, player)
				options.add((cid, opts))
				
			break
	
	G.logger.write('Played {} targetting {}, waiting for a response')
	G.logger.write(msg, player=target)
	
	code[target] = options
	
	code[player] = xset(('cancel',)) # original player can cancel
	
	return code

def play_intel(G, player, card, target, *args):
	pass

def resolve_intel(G, player, card, response):

	G.temp.hack = tdict()
	G.temp.hack.target = target
	G.temp.hack.card = card
	G.temp.hack.source = player
	G.temp.hack.args = args
	
	if card.intelligence == 'Coup':
		nation, = args
		
	elif card.intelligence == 'Agent':
		tilename, = args
		
	elif card.intelligence == 'Spy_Rings':
		
		cid = random.choice(list(G.players[target].hand))
		
		G.players[target].hand.remove(cid)
		G.players[player].hand.add(cid)
		
		pick = G.objects.table[cid]
		pick.visible.clear()
		pick.visible.add(player)
		
		G.objects.updated[cid] = pick
		
	elif card.intelligence == 'Sabotage':
		G.players[target].tracks.IND -= 1
		G.logger.write('{} plays Sabotage to decrease {}\'s IND to {}'.format(player, target, G.players[target].tracks.IND))
	elif card.intelligence == 'Code_Breaking':
		pass
	elif card.intelligence == 'Mole':
		pass
	else:
		raise Exception('Unknown intelligence card type: {}'.format(card.intelligence))

def get_intel_options(G, player, targets, card):
	opts = xset()
	
	targets = xset(G.players[player].stats.rivals)
	
	if card.intelligence == 'Coup':
		
		for target in targets:
			topts = xset(G.objects.table[iid].nation for iid in G.players[target].influence)
			if len(topts):
				opts.add((target, topts))
	
	elif card.intelligence == 'Agent':
		
		for target in targets:
			topts = xset(G.objects.table[uid].tile for uid in G.players[target].units)
			if len(topts):
				opts.add((target, topts))
	
	elif card.intelligence == 'Spy_Rings':
		opts.update(target for target in targets if len(G.players[target].hand))
	
	elif card.intelligence == 'Sabotage':
		opts.update(target for target in targets if G.players[target].tracks.IND > 0)
	
	elif card.intelligence == 'Code_Breaking':
		opts.update(target for target in targets if len(G.players[target].hand))
	
	elif card.intelligence == 'Mole':
		opts.update(target for target in targets if len(G.players[target].secret_vault))
	
	else:
		raise Exception('Unknown intelligence card type: {}'.format(card.intelligence))
	
	return opts
	

def check_intelligence(G, player, cards):
	
	options = xset()
	
	for cid, card in cards.items():
		if 'intelligence' not in card or card.intelligence == 'Double_Agent':
			continue
		
		opts = get_intel_options(G, player, card)
		
		if len(opts):
			options.add((cid, opts))
			
	return options


def choose_2_from(all):
	
	options = xset()
	all = all.copy()
	
	while len(all):
		x = all.pop()
		if len(all)>1:
			options.add((x, all))
		else:
			options.add((x,all.pop()))
		
	return options

def opposite_knapsack(names, vals, cost, partial=[], sofar=0):
	
	if len(names) == 0: # base case
		return []
	
	name, *remaining = names
	
	val = vals[name] + sofar
	candidate = partial + [name]
	
	# recurse without current
	sols = opposite_knapsack(remaining, vals, cost, partial=partial, sofar=sofar)
	
	if val >= cost:
		sols.append(candidate)
	else:
		# recurse with current
		sols.extend(opposite_knapsack(remaining, vals, cost, partial=candidate, sofar=val))
		
	return sols
def factory_upgrade_combos(cards, cost):
	options = adict({c._id:c.value for c in cards})
	IDs, vals = zip(*sorted(options.items(), key=operator.itemgetter(1), reverse=True))
	
	return map(tuple, opposite_knapsack(IDs, options, cost))

def check_techs(G, player, cards):

	global_techs = xset()
	for name, faction in G.players.items():
		if name != player:
			global_techs.update(faction.technologies)

	science = xset(c._id for c in cards if 'science' in c and c.year <= G.game.year)
	
	simple = xset(c._id for c in cards.keys() if 'top' in c)
	
	available = adict()
	
	for ID in simple:
		if cards[ID].top not in available:
			available[cards[ID].top] = xset()
		available[cards[ID].top].add(ID)
		
		if cards[ID].bottom not in available:
			available[cards[ID].bottom] = xset()
		available[cards[ID].bottom].add(ID)
		
	espionage = None
	if 'Industrial_Espionage' in available:
		espionage = available['Industrial_Espionage']
		del available['Industrial_Espionage']
		
	# remove already discovered techs
	for tech in G.players[player].technologies:
		if tech in available:
			del available[tech]
		
	options = xset()
	
	for tech, sIDs in available.items():
		
		topts = xset()
			
		if len(sIDs) > 1:
			topts.update(choose_2_from(sIDs))
		
		for sciID in science:
			if tech in cards[sciID].science:
				topts.add((sIDs, sciID))
				
		if espionage is not None and tech in global_techs:
			for eID in espionage:
				combs = sIDs.copy()
				combs.discard(eID)
				if len(combs) > 0:
					topts.add((sIDs, eID))
		
		if len(topts):
			options.add((tech, topts))

	return options

def increment_influence(G, player, nation):
	if nation not in G.neutrals.influence:
		inf = idict()
		inf.value = 1
		inf.nation = nation
		inf.faction = player
		inf.obj_type = 'influence'
		inf.visible = xset(G.players.keys())
		
		G.players[player].influence.add(inf._id)
		G.neutrals.influence[nation] = inf
		G.objects.table[inf._id] = inf
		G.objects.created[inf._id] = inf
		return
	
	inf = G.neutrals.influence[nation]
	
	if player != inf.faction and inf.value == 1:
		del G.neutrals.influence[nation]
		G.players[inf.faction].influence.remove(inf._id)
		del G.objects.table[inf._id]
		G.objects.removed[inf._id] = inf
		return
	
	delta = (-1)**(player != inf.faction)
	
	inf.value += delta
	G.objects.updated[inf._id] = inf
	
def play_diplomacy(G, player, nation):
	
	if nation not in G.temp.diplomacy:
		G.logger.write('{} plays {}'.format(player, nation))
		G.temp.diplomacy[nation] = player, 1
		return
	
	owner, val = G.temp.diplomacy[nation]
	
	if owner != player and val == 1:
		G.logger.write('{} plays {} cancelling out with {}'.format(player, nation, owner))
		del G.temp.diplomacy[nation]
	elif owner != player:
		val -= 1
		G.temp.diplomacy[nation] = owner, val
		G.logger.write('{} plays {} cancelling out with {} (who has {} remaining)'.format(player, nation, owner, val))
	else:
		val += 1
		G.temp.diplomacy[nation] = owner, val
		G.logger.write('{} plays {} (now has {} in {})'.format(player, nation, val, nation))

def get_adjacent_nations(G, *players):
	nations = xset()
	for player in players:
		for tilename in G.players[player].territory:
			for neighbor in G.tiles[tilename].borders.keys():
				tile = G.tiles[neighbor]
				if 'alligence' in tile:
					nations.add(tile.alligence)
	return nations

def get_removable_nations(G, player):
	
	nations = xset()
	
	for rival in G.players[player].stats.rivals:
		for iID in G.players[rival].influence:
			nations.add(G.objects.table[iID].nation)
	return nations

def check_wildcard(G, player, card):
	name = card.wildcard
	info = G.cards.info.action[name]
	
	options = xset()
	
	if 'adjacent' in info: # either guarantee or intimidation
		if info.from_self: # intimidation
			options.update(get_adjacent_nations(G, player))
		else: # guarantee
			options.update(get_adjacent_nations(G, *G.players[player].stats.rivals))
		options.discard('USA')
		
		for name in G.players:
			options -= G.nations.groups[name]
		
	elif 'options' in info: # contains 'options'
		if 'from_self' in info: # personalized options
			if info.from_self: # TtB, ET, BF, BA, V
				options.update(info.options[player])
			else: # F&L
				for rival in G.players[player].stats.rivals:
					options.update(info.options[rival])
		else: # isolationism
			options.update(info.options)
	elif name == 'Foreign_Aid':
		options.update(G.neutrals.minors)
		options.update(G.neutrals.majors)
	else:
		raise Exception('Unknown wildcard type: {}, {}'.format(name, list(info.keys())))
	
	# filter out options depending on add/remove
	
	if 'add' in info and 'remove' in info:
		return options
	
	assert 'add' in info or 'remove' in info, 'Cant do anything, card info is missing something for {}'.format(name)
	
	removable = get_removable_nations(G, player)
	
	if 'remove' not in info:
		options -= removable
	
	if 'add' not in info:
		options *= removable
	
	return options


def encode_government_actions(G):
	code = adict()
	
	active_player = G.game.turn_order[G.temp.active_idx]
	faction = G.players[active_player]
	
	hand = adict({ID:G.objects.table[ID] for ID in faction.hand})
	action_cards = adict((k,v) for k,v in hand.items() if v.obj_type == 'action_card')
	invest_cards = adict((k, v) for k, v in hand.items() if v.obj_type == 'investment_card')
	
	options = xset()
	
	# pass
	options.add(('pass',))
	
	# diplomacy options
	for ID, card in action_cards.items():
		if 'top' in card:
			options.add((ID, xset([card.top, card.bottom])))
		elif 'wildcard' in card:
			wopts = check_wildcard(G, active_player, card)
			if len(wopts):
				options.add((ID, wopts))
		else:
			raise Exception('Unknown action card properties: {}'.format(card.keys()))
	
	# factory upgrade options
	total_val = sum(c.value for c in invest_cards.values())
	if total_val >= faction.stats.factory_cost:
		options.add(('factory_upgrade',))
	# for combo in factory_upgrade_combos(invest_cards, faction.stats.factory_cost):
	# 	options.add(('factory_upgrade',) + combo)
	
	# tech options
	options.update(check_techs(G, active_player, invest_cards))
	
	# espionage options
	options.update(check_intelligence(G, active_player, invest_cards))
	
	code[active_player] = options
	
	return code

def encode_factory_upgrade_actions(G):
	code = adict()
	
	active_player = G.game.turn_order[G.temp.active_idx]
	faction = G.players[active_player]
	
	options = xset(ID for ID in faction.hand if G.objects.table[ID].obj_type == 'investment_card')
	
	# options -= G.temp.factory_upgrade.selects # can unselect cards
	
	options.add('cancel')
	
	code[active_player] = (options,)
	return code

def government_pre_phase(G): # prep influence
	
	if 'temp' in G:
		del G.temp
	
	G.temp = tdict()
	G.temp.diplomacy = tdict()
	G.temp.diplomacy_cards = tset()
	G.temp.intel = tdict()
	
	G.temp.passes = 0
	
	G.temp.active_idx = 0
	return encode_government_actions(G)

def governmnet_phase(G, player, action): # play cards
	
	if player in G.temp.intel: # hide any temporarily visible objects from intel cards
		for ID, obj in G.temp.intel[player]:
			obj.visible.remove(player)
			G.objects.updated[ID] = obj
		del G.temp.intel[player]
	
	if 'move_to_post' in G.temp:
		return government_post_phase(G, action)
	
	if 'factory_upgrade' in G.temp:
		
		if action == ('cancel',):
			G.logger.write('Cancelled factory upgrade', player=player)
			del G.temp.factory_upgrade
			return encode_government_actions(G)
		
		ID, = action
		
		val = G.objects.table[ID].value
		
		if ID in G.temp.factory_upgrade.selects:
			val = -val
			G.temp.factory_upgrade.selects.discard(ID)
			G.logger.write('Unselected {}'.format(ID), end='', player=player)
		else:
			G.temp.factory_upgrade.selects.add(ID)
			G.logger.write('Selected {}'.format(ID), end='', player=player)
		
		G.temp.factory_upgrade.value += val
		
		G.logger.write(' (value so far: {}/{})'.format(G.temp.factory_upgrade.value, G.players[player].stats.factory_cost), player=player)
		
		# print(G.temp.factory_upgrade.value)
		
		if G.temp.factory_upgrade.value < G.players[player].stats.factory_cost:
			return encode_factory_upgrade_actions(G)
		
		# factory upgrade complete
		G.players[player].tracks.IND += 1
		
		G.players[player].hand -= G.temp.factory_upgrade.selects
		
		G.logger.write('{} upgrades their IND to {} with factory card values of: {}'.format(player, G.players[player].tracks.IND,
		                                                                                    ', '.join(str(G.objects.table[ID].value)
		                                                                                              for ID in G.temp.factory_upgrade.selects)))
		
		discard_cards(G, 'investment', *G.temp.factory_upgrade.selects)
		
		del G.temp.factory_upgrade
		
		G.temp.passes = 0
	
	elif action == ('pass',):
		G.logger.write('{} passes'.format(player))
		G.temp.passes += 1
		if G.temp.passes == len(G.players):
			G.temp.move_to_post = True  # for handsize limit options
			return government_post_phase(G)
	else:
		
		# execute card effects
		head, *tail = action
		
		if head == 'factory_upgrade':
			G.temp.factory_upgrade = tdict()
			G.temp.factory_upgrade.value = 0
			G.temp.factory_upgrade.selects = tset()
			G.logger.write('Select the cards to use for the factory upgrade', player=player)
			return encode_factory_upgrade_actions(G)
		else:
			G.temp.passes = 0
			card = G.objects.table[head]
			
			if 'wildcard' in card:
				
				nation, = tail
				
				increment_influence(G, player, nation)
				
				extra = ''
				if card.wildcard == 'Foreign_Aid':
					G.players[player].tracks.IND -= 1
					extra = ' (decreasing IND to {})'.format(G.players[player].tracks.IND)
				
				G.logger.write('{} plays {} adding/removing influence in {}{}'.format(player, card.wildcard, nation, extra))
				
				discard_cards(G, 'action', head)
				
			elif 'intelligence' in card:
				
				play_intelligence(G, player, card, tail)
				
				discard_cards(G, 'invest', head)
				pass # play espionage
			else:
				nation, = tail
				
				play_diplomacy(G, player, nation)
				
				G.temp.diplomacy_cards.add(head)
				card.visible = xset(G.players.keys()) # visible to everyone
				G.objects.updated[head] = card
				# discard_cards(G, 'action', head)
	
	G.temp.active_idx += 1
	G.temp.active_idx %= len(G.players)
	return encode_government_actions(G)

def government_post_phase(G, action=None):
	
	# diplomacy resolution (check for control, discard diplomacy_cards), handsize, update tracks
	
	raise NotImplementedError
	
	raise PhaseComplete



