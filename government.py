
import tnt_util as util
from tnt_util import adict, xset, tdict, tlist, tset, PhaseComplete
import random

import operator

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
	
	simple = xset(cards.keys()).difference(science)
	
	available = adict()
	
	for ID in simple:
		if cards[ID].top not in available:
			available[cards[ID].top] = xset()
		cards[ID].top.add(ID)
		
		if cards[ID].bottom not in available:
			available[cards[ID].bottom] = xset()
		cards[ID].bottom.add(ID)
		
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
	options.add(('factory_upgrade',))
	# for combo in factory_upgrade_combos(invest_cards, faction.stats.factory_cost):
	# 	options.add(('factory_upgrade',) + combo)
	
	# tech options
	options.update(check_techs(G, active_player, invest_cards))
	
	# espionage options
	for ID, card in invest_cards.items():
		if 'intelligence' in card:
			options.add((ID,))
	
	code[active_player] = options
	
	return code

def encode_factory_upgrade_actions(G):
	code = adict()
	
	active_player = G.game.turn_order[G.temp.active_idx]
	faction = G.players[active_player]
	
	options = xset(ID for ID in faction.hand if G.objects.table[ID].obj_type == 'investment_card')
	
	# options -= G.temp.factory_upgrade.selects # can unselect cards
	
	options.add(('cancel',))
	
	code[active_player] = options
	return code

def government_pre_phase(G): # prep influence
	
	if 'temp' in G:
		del G.temp
	
	G.temp = tdict()
	G.temp.gov = tdict()
	
	G.temp.passes = 0
	
	for name, faction in G.players.items():
		
		gov = tdict()
		
		gov.diplomacy = tdict()
		
		G.temp.gov[name] = gov
	
	G.temp.active_idx = 0
	return encode_government_actions(G)

def governmnet_phase(G, player, action): # play cards
	
	if 'move_to_post' in G.temp:
		return government_post_phase(G, action)
	
	if 'factory_upgrade' in G.temp:
		
		if action == ('cancel',):
			del G.temp.factory_upgrade
			return encode_government_actions(G)
		
		ID, = action
		
		val = G.objects.table[ID].factory_value
		
		if ID in G.temp.factory_upgrade.selects:
			val = -val
			G.temp.factory_upgrade.selects.discard(ID)
		else:
			G.temp.factory_upgrade.selects.add(ID)
		
		G.temp.factory_upgrade.value += val
		
		if G.temp.factory_upgrade.value < G.players[player].stats.factory_cost:
			return encode_factory_upgrade_actions(G)
		
		# factory upgrade complete
		G.players[player].tracks.IND += 1
		
		G.players[player].hand -= G.temp.factory_upgrade.selects
		
		G.cards.invest.discard_pile.extend(G.temp.factory_upgrade.selects)
		
		del G.temp.factory_upgrade
	
	elif action == ('pass',):
		G.temp.passes += 1
		if G.temp.passes == len(G.players):
			G.temp.move_to_post = True  # for handsize limit options
			return government_post_phase(G)
	else:
		G.temp.passes = 0
		
		# execute card effects
		head, *tail = action
		
		if head == 'factory_upgrade':
			G.temp.factory_upgrade = tdict()
			G.temp.factory_upgrade.value = 0
			G.temp.factory_upgrade.selects = tset()
			
	
	G.temp.active_idx += 1
	G.temp.active_idx %= len(G.players)
	return encode_government_actions(G)

def government_post_phase(G, action=None):
	
	# diplomacy resolution, handsize, update tracks
	
	
	
	raise PhaseComplete



