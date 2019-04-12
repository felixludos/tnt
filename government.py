
import tnt_util as util
from tnt_util import adict, xset, tdict, tlist, tset
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

	self_techs = G.players[player].techs

	global_techs = xset()
	for name, faction in G.players.items():
		if name != player:
			global_techs.update(faction.techs)

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
		
	options = xset()
	
	for tech, sIDs in available.items():
		
		topts = xset()
		
		if tech in self_techs:
			continue
			
		if len(sIDs) > 1:
			topts.update(choose_2_from(sIDs))
			
		
		for sciID in science:
			if tech in cards[sciID].science:
				topts.add((sIDs, sciID))
				
		if espionage is not None and tech in global_techs:
			for eID in espionage:
				pass

	pass

def encode_government_actions(G):
	code = adict()
	
	active_player = G.game.turn_order[G.temp.active_idx]
	faction = G.players[active_player]
	
	hand = adict({ID:G.objects.table[ID] for ID in faction.hand})
	action_cards = adict((k,v) for k,v in hand.items() if v.obj_type == 'action_card')
	invest_cards = adict((k, v) for k, v in hand.items() if v.obj_type == 'action_card')
	
	options = xset()
	
	# pass
	options.add(('pass',))
	
	# diplomacy options
	for ID, card in action_cards.items():
		if 'top' in card:
			options.add((ID, xset([card.top, card.bottom])))
		elif 'wildcard' in card:
			options.add((ID,))
		else:
			raise Exception('Unknown action card properties: {}'.format(card.keys()))
	
	# factory upgrade options
	for combo in factory_upgrade_combos(invest_cards, faction.stats.factory_cost):
		options.add(('factory_upgrade',) + combo)
	
	# tech options
	
	
	# espionage options
	for ID, card in invest_cards.items():
		if 'intelligence' in card:
			options.add((ID,))
	
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
	
	if action == ('pass',):
		G.temp.passes += 1
		if G.temp.passes == len(G.players):
			G.temp.move_to_post = True  # for handsize limit options
			return government_post_phase(G)
	else:
		G.temp.passes = 0
		
		# execute card effects
	
	G.temp.active_idx += 1
	G.temp.active_idx %= len(G.players)
	return encode_government_actions(G)

def government_post_phase(G, action=None):
	
	# diplomacy resolution, handsize, update tracks
	
	pass



