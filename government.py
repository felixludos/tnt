

from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete
from tnt_cards import discard_cards
from tnt_units import add_unit
from tnt_util import placeable_units, compute_tracks, add_next_phase
from diplomacy import increment_influence, decrement_influence, diplvl, dipname
import random

import operator

def encode_intel_response(G, intel_card, player, target):
	
	code = adict()
	
	options = xset()
	options.add(('accept',))
	
	msg = None #'{} plays {} and is targetting you'.format(player, intel_card.intelligence)
	
	for cid in G.players[target].hand:
		card = G.objects.table[cid]
		if 'intelligence' in card and card.intelligence == 'Double_Agent':
			
			opts = get_intel_options(G, intel_card, player)
			if len(opts):
				# msg = 'You may play your Double Agent to reverse the effect of {} played by {}'.format(intel_card.intelligence, player)
				msg = 'You may play your Double Agent to reverse the effect'
				options.add((cid, opts))
				
			break
	
	G.logger.write('{} played {} targetting {}, waiting for a response'.format(player, intel_card.intelligence, target))
	if msg is not None:
		G.logger.write(msg, player=target)
	
	code[target] = options
	
	# code[player] = xset(('cancel',)) # original player can cancel
	
	return code

def play_intel(G, player, card, target, *args):
	
	G.temp.hack = tdict()
	G.temp.hack.target = target
	G.temp.hack.card = card
	G.temp.hack.source = player
	G.temp.hack.args = args
	
	return encode_intel_response(G, card, player, target)

def resolve_intel(G, player, response):
	
	card = G.temp.hack.card
	
	assert player == G.temp.hack.target, 'Target should be responding'
	
	# G.logger.write('{} plays {} targeting {}'.format(G.temp.hack.source, G.temp.hack.card.intelligence, G.temp.hack.target))
	
	if response != ('accept',): # target plays Double Agent
		
		ID, *args = response
		
		# switch target and source, update args
		G.temp.hack.target = G.temp.hack.source
		G.temp.hack.source = player
		if len(args) > 1:
			args = (args[-1],)
		G.temp.hack.args = args
		
		# discard double agent card
		discard_cards(G, ID)
		
		G.logger.write('However, {} uses their double agent to reverse the effects'.format(player))
	
	target = G.temp.hack.target
	player = G.temp.hack.source
	args = G.temp.hack.args
	
	code = None
	
	if card.intelligence == 'Coup':
		nation, = args

		inf = G.diplomacy.influence[nation]
		
		assert inf.faction == target, 'Influence is owned by {} not the target ({})'.format(inf.faction, target)
		
		G.players[target].influence.remove(inf._id)
		del G.diplomacy.influence[nation]
		del G.objects.table[inf._id]
		G.objects.removed[inf._id] = inf
		
		G.logger.write('{} {} influence is removed from {}'.format(inf.value, target, nation))
	elif card.intelligence == 'Agent':
		tilename, = args
		tile = G.tiles[tilename]
		
		G.temp.intel[player] = tdict()
		
		for uid in tile.units:
			unit = G.objects.table[uid]
			if unit.nationality in G.players[target].members:
				unit.visible.add(player)
				G.objects.updated[uid] = unit
				G.temp.intel[player][uid] = unit
		
		G.logger.write('{} may view all {}\'s units in {} for one turn'.format(player, target, tilename))
	elif card.intelligence == 'Spy_Ring':
		
		cid = G.random.choice(list(G.players[target].hand))
		
		G.players[target].hand.remove(cid)
		G.players[player].hand.add(cid)
		
		pick = G.objects.table[cid]
		pick.visible.clear()
		pick.visible.add(player)
		pick.owner = player
		G.objects.updated[cid] = pick
		
		G.logger.write('{} steals one card from {}\'s hand'.format(player, target))
	elif card.intelligence == 'Sabotage':
		G.players[target].tracks.IND -= 1
		G.logger.write('{} IND is decreased to {}'.format(target, G.players[target].tracks.IND))
	elif card.intelligence == 'Code_Break':
		
		G.temp.intel[player] = tdict()
		
		for cid in G.players[target].hand:
			card = G.objects.table[cid]
			
			card.visible.add(player)
			
			G.temp.intel[player][cid] = card
			G.objects.updated[cid] = card
		
		G.logger.write('{} may view {}\'s hand for one turn'.format(player, target))
	elif card.intelligence == 'Mole':
		
		G.logger.write('{} may view {}\'s secret vault, and possibly achieve a tech therein')
		
		vault = G.players[target].secret_vault
		G.logger.write('{}\'s secret vault contains: {}'.format(target, ', '.join(vault)), player=player)
		
		options = xset()
		
		for cid in G.players[player].hand:
		
			card = G.objects.table[cid]
			
			if card.obj_type == 'investment_card' and 'top' in card:
				if card.top in vault and is_achievable_tech(G, player, card.top):
					options.add((card.top, cid))
				if card.bottom in vault and is_achievable_tech(G, player, card.bottom):
					options.add((card.bottom, cid))
		
		if len(options):  # any tech can be achieved openly or in secret
			options = xset((xset(['open', 'secret']), options))
		
		options.add(('accept',))
		
		G.temp.mole = target
		
		code = adict()
		code[player] = options
		
	else:
		raise Exception('Unknown intelligence card type: {}'.format(card.intelligence))
	
	del G.temp.hack
	
	return code # is None unless mole was played

def get_intel_options(G, card, *targets):
	opts = xset()
	# print('intel')
	if card.intelligence == 'Coup':
		
		for target in targets:
			topts = xset(G.objects.table[iid].nation for iid in G.players[target].influence)
			if len(topts):
				opts.add((target, topts))
	
	elif card.intelligence == 'Agent':
		for target in targets:
			topts = xset(unit.tile for unit in G.players[target].units.values())
			if len(topts):
				opts.add((target, topts))
	
	elif card.intelligence == 'Spy_Ring':
		opts.update(target for target in targets if len(G.players[target].hand))
	
	elif card.intelligence == 'Sabotage':
		opts.update(target for target in targets if G.players[target].tracks.IND > 0)
	
	elif card.intelligence == 'Code_Break':
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
		
		opts = get_intel_options(G, card, *G.players[player].stats.rivals)
		
		if len(opts):
			options.add((cid, opts))
			
	return options


def choose_2_from(all):
	
	options = xset()
	
	
	while len(all):
		all = all.copy()
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

def is_achievable_tech(G, player, tech):
	
	if 'Atomic' not in tech:
		return True
	
	level = int(tech[-1])
	
	if level == 1:
		return True
	
	prev = tech[:-1] + str(level-1)
	
	if prev in G.players[player].technologies or prev in G.players[player].secret_vault:
		return True
	
	return False

def reveal_tech(G, player, tech):
	
	faction = G.players[player]
	
	assert tech in faction.secret_vault, 'Tech {} must be in {} secret vault: {}'.format(tech, player, faction.secret_vault)
	
	faction.secret_vault.remove(tech)
	faction.technologies.add(tech)
	
	faction.stats.handlimit += 1
	
	G.logger.write('{} reveals {} from their secret vault (handlimit is now {})'.format(player, tech, faction.stats.handlimit))

def achieve_tech(G, player, pub, tech, *cIDs):
	
	if pub == 'open':
		G.players[player].technologies.add(tech)
		G.logger.write('{} has achieved {}'.format(player, tech))
	elif pub == 'secret':
		G.players[player].secret_vault.add(tech)
		G.players[player].stats.handlimit -= 1
		G.logger.write('{} has placed a technology in their secret vault ({} handlimit is now {})'.format(
			player, player, G.players[player].stats.handlimit))
		G.logger.write('- You can reveal {} from your vault anytime during your turn'.format(tech), player=player)
	
	discard_cards(G, *cIDs)
	
	
	pass

def check_revealable(G, player):
	options = xset()
	faction = G.players[player]
	if len(faction.secret_vault):
		# options.add(('reveal', xset(faction.secret_vault)))
		options.add((xset(faction.secret_vault),))
	return options

def check_techs(G, player, cards):

	global_techs = xset()
	for name, faction in G.players.items():
		if name != player:
			global_techs.update(faction.technologies)

	# print(len(cards))
	
	science = adict({cid:card for cid, card in cards.items() if 'science' in card and card.year <= G.game.year})
	
	simple = adict({cid:card for cid, card in cards.items() if 'top' in card})
	
	# print(len(science), len(simple))
	# print(simple)
	
	available = adict()
	
	for cid,card in simple.items():
		if card.top not in available:
			available[card.top] = xset()
		available[card.top].add(cid)
		
		if card.bottom not in available:
			available[card.bottom] = xset()
		available[card.bottom].add(cid)
		
	espionage = None
	if 'Industrial_Espionage' in available:
		espionage = available['Industrial_Espionage']
		del available['Industrial_Espionage']
		
	# remove already discovered techs
	for tech in G.players[player].technologies:
		if tech in available:
			del available[tech]
	
	# remove unachievable techs (higher atomic techs)
	# print(available.keys())
	
	available = adict({t:c for t,c in available.items() if is_achievable_tech(G, player, t)})
	
	# print(available)
	
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
			
	if len(options): # any tech can be achieved openly or in secret
		options = xset([(xset(['open', 'secret']), options)])

	return options

	
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
		options.update(G.diplomacy.minors)
		options.update(G.diplomacy.majors)
	else:
		raise Exception('Unknown wildcard type: {}, {}'.format(name, list(info.keys())))
	
	options = options.intersection(G.diplomacy.neutrals)
	
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

def removable_nations(G, player):
	nations = xset()
	
	for iid in G.players[player].influence:
		
		inf = G.objects.table[iid]
		nations.add(inf.nation)
	
	return nations
	

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
			lopts = xset(nation for nation in [card.top, card.bottom] if nation in G.diplomacy.neutrals)
			if len(lopts):
				options.add((ID, lopts))
		elif 'wildcard' in card:
			wopts = check_wildcard(G, active_player, card)
			if len(wopts):
				options.add((ID, wopts))
		else:
			raise Exception('Unknown action card properties: {}'.format(card.keys()))
	
	# factory upgrade options
	# print([(i, c.value) for i, c in invest_cards.items()])
	total_val = sum(c.value for c in invest_cards.values())
	if G.temp.past_upgrades[active_player] < 2 and total_val >= faction.stats.factory_cost:
		options.add(('factory_upgrade',))
		# for combo in factory_upgrade_combos(invest_cards, faction.stats.factory_cost):
		# 	options.add(('factory_upgrade',) + combo)
	
	# tech options
	options.update(check_techs(G, active_player, invest_cards))
	
	# espionage options
	options.update(check_intelligence(G, active_player, invest_cards))
	
	# reveal techs from secret vault
	options.update(check_revealable(G, active_player))
	
	# removable inf
	rmb = removable_nations(G, active_player)
	if len(rmb):
		options.add(('remove', rmb))
	
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
	
	G.logger.write('Beginning Government Phase')
	
	if 'temp' in G:
		del G.temp
	
	G.temp = tdict()
	G.temp.diplomacy = tdict()
	G.temp.diplomacy_cards = tset()
	G.temp.intel = tdict()
	G.temp.past_upgrades = tdict()
	for player in G.players:
		G.temp.past_upgrades[player] = 0
	
	G.temp.passes = 0
	
	G.temp.active_idx = 0
	return encode_government_actions(G)

def governmnet_phase(G, player, action): # play cards
	
	if 'move_to_post' in G.temp: # after phase has ended and only clean up is necessary
		return government_post_phase(G, player, action)
	
	# TODO: make sure cards that should now be visible stay visible
	if player in G.temp.intel: # hide any temporarily visible objects from intel cards
		for ID, obj in G.temp.intel[player].items():
			obj.visible.discard(player)
			G.objects.updated[ID] = obj
		del G.temp.intel[player]
	
	if 'hack' in G.temp:
		
		if player == G.temp.hack.source:
			raise NotImplementedError
			assert action == ('cancel',), 'Misunderstood action: {}'.format(action)
			
			G.players[player].hand.add(G.temp.hack.card._id) # make sure card is back in sources's ownership
			del G.temp.hack
			
			return encode_government_actions(G)
		
		else:
			actions = resolve_intel(G, player, action)
			
			if actions is not None:
				return actions
			
	elif 'mole' in G.temp:
		if action != ('accept',):
			
			_, tech, _ = action
			G.logger.write('{} uses their mole to achieve {}'.format(player, tech), player=G.temp.mole)
			
			achieve_tech(G, player, *action)
		
		del G.temp.mole
	
	elif 'factory_upgrade' in G.temp:
		
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
		G.temp.past_upgrades[player] += 1
		
		G.players[player].hand -= G.temp.factory_upgrade.selects
		
		G.logger.write('{} upgrades their IND to {} with factory card values of: {}'.format(player, G.players[player].tracks.IND,
		                                                                                    ', '.join(str(G.objects.table[ID].value)
		                                                                                              for ID in G.temp.factory_upgrade.selects)))
		
		discard_cards(G, *G.temp.factory_upgrade.selects)
		
		del G.temp.factory_upgrade
		
		G.temp.passes = 0
	
	elif action == ('pass',):
		G.logger.write('{} passes'.format(player))
		G.temp.passes += 1
		if G.temp.passes == len(G.players):
			G.logger.write('All players have passed consecutively - moving on to Government resolution')
			G.temp.move_to_post = tdict()  # for handsize limit options
			for name, faction in G.players.items():
				handsize = len(faction.hand)
				diff = handsize - faction.stats.handlimit
				if diff > 0:
					G.logger.write('{} must discard {} cards'.format(name, diff))
				G.temp.move_to_post[name] = True
			return government_post_phase(G)
	else:
		
		# execute action
		head, *tail = action
		
		if head == 'factory_upgrade':
			G.temp.factory_upgrade = tdict()
			G.temp.factory_upgrade.value = 0
			G.temp.factory_upgrade.selects = tset()
			G.logger.write('Select the cards to use for the factory upgrade', player=player)
			return encode_factory_upgrade_actions(G)
		elif head in G.players[player].secret_vault: # reveal tech from secret vault
			reveal_tech(G, player, head)
			return encode_government_actions(G)
		elif head == 'remove':
			nation, = tail
			decrement_influence(G, nation)
			G.logger.write('{} removes one of their influence from {}'.format(player, nation))
			return encode_government_actions(G)
		elif head in {'open', 'secret'}:
			G.temp.passes = 0
			
			achieve_tech(G, player, head, *tail)
		
		else:
			G.temp.passes = 0
			card = G.objects.table[head]
			
			if 'wildcard' in card:
				
				nation, = tail
				
				increment_influence(G, player, nation)
				
				extra = ''
				if card.wildcard == 'Foreign_Aid': # pay IND
					G.players[player].tracks.IND -= 1
					extra = ' (decreasing IND to {})'.format(G.players[player].tracks.IND)
				
				G.logger.write('{} plays {} adding/removing influence in {}{}'.format(player, card.wildcard, nation, extra))
				
				discard_cards(G, head)
				
			elif 'intelligence' in card:
				
				discard_cards(G, head)
				
				return play_intel(G, player, card, *tail)
				
			else:
				nation, = tail
				
				play_diplomacy(G, player, nation)
				
				G.temp.diplomacy_cards.add(head)
				card.visible = xset(G.players.keys()) # visible to everyone
				G.players[card.owner].hand.discard(card._id)
				del card.owner
				G.objects.updated[head] = card
				# discard_cards(G, head)
	
	G.temp.active_idx += 1
	G.temp.active_idx %= len(G.players)
	return encode_government_actions(G)



def government_post_phase(G, player=None, action=None):
	
	if len(G.temp.move_to_post) and action is not None:
		action, = action
		if action == 'accept':
			G.temp.move_to_post[player] = False
		elif action in G.players[player].hand:
			discard_cards(G, action)
		elif action in G.players[player].secret_vault:
			reveal_tech(G, player, action)
		else:
			decrement_influence(G, action)
		action = None
	
	code = encode_post_gov_actions(G)
	if len(code):
		return code
	
	# diplomacy resolution (check for control, discard diplomacy_cards), handsize, update tracks
	
	# resolve diplomacy
	discard_cards(G, *G.temp.diplomacy_cards)
	del G.temp.diplomacy_cards
	for nation, (fname, val) in G.temp.diplomacy.items():
		for _ in range(val):
			increment_influence(G, fname, nation)
	del G.temp.diplomacy

	# check for control
	new_sats = tdict()
	for nation, dipl in G.diplomacy.neutrals.items():
		
		if nation not in G.diplomacy.influence:
			if dipl.faction is None:
				continue
			else:
				faction = G.players[dipl.faction]
				
				faction.diplomacy[diplvl[dipl.value]].remove(nation)
				
				pop, res = compute_tracks(G.nations.territories[nation], G.tiles)
				
				faction.tracks.POP -= pop
				faction.tracks.RES -= res
				
				G.logger.write('{} lost influence over {} (losing POP={} RES={})'.format(dipl.faction, nation, pop, res))
				
				dipl.value = 0
				dipl.faction = None
			
		else:
			
			inf = G.diplomacy.influence[nation]
			val = min(inf.value, 3)
			gainer = None
			loser = None
			
			if nation == 'USA': # handle USA separately
				if dipl.faction is None:
					if G.players[inf.faction].stats.enable_USA:
						gainer = inf.faction
						
				elif dipl.faction == inf.faction:
					if G.players[dipl.faction].stats.enable_USA and dipl.value != val:
						G.players[dipl.faction].diplomacy[diplvl[dipl.value]].remove(nation)
				else:
					if G.players[dipl.faction].stats.enable_USA:
						loser = dipl.faction
						G.players[dipl.faction].diplomacy[diplvl[dipl.value]].remove(nation)
					if G.players[inf.faction].stats.enable_USA:
						gainer = inf.faction
						
			else:
				
				if dipl.faction is None:
					gainer = inf.faction
				elif dipl.faction != inf.faction:
					loser = dipl.faction
					gainer = inf.faction
					G.players[dipl.faction].diplomacy[diplvl[dipl.value]].remove(nation)
				elif dipl.value == val: # no change required
					continue
				else: # value has changed
					G.players[inf.faction].diplomacy[diplvl[dipl.value]].remove(dipl.faction)
			
			faction = G.players[inf.faction]
			faction.diplomacy[diplvl[val]].add(dipl.faction)
			
			dipl.faction = inf.faction
			dipl.value = val
			
			if val >= 3:
				new_sats[nation] = inf.faction
			
			# update tracks
			tmsg = ''
			if gainer is not None or loser is not None:
				pop, res = compute_tracks(G.nations.territories[nation], G.tiles)
				
				if gainer is not None:
					G.players[gainer].tracks.POP += pop
					G.players[gainer].tracks.RES += res
					tmsg += ' ({} gains POP={}, RES={})'.format(gainer, pop, res)
					
				if loser is not None:
					G.players[loser].tracks.POP -= pop
					G.players[loser].tracks.RES -= res
					tmsg += ' (lost by {})'.format(loser)
			
			if nation == 'USA' and not faction.stats.enable_USA:
				G.logger.write('{} has {} influence in the USA'.format(inf.faction, inf.value))
			else:
				dname = dipname[val]
				G.logger.write('{} becomes {} of {}{}'.format(nation, dname, inf.faction, tmsg))
			
			
	
	G.temp.new_sats = new_sats
			
	if len(new_sats): # plan a satellite phase to place garrison troops
		add_next_phase(G, 'Satellite')
		
	raise PhaseComplete


def encode_post_gov_actions(G):
	
	code = adict()
	
	for player, is_active in G.temp.move_to_post.items():
		faction = G.players[player]
		
		handsize = len(faction.hand)
		if not is_active and handsize <= faction.stats.handlimit:
			continue
		
		options = xset()
		
		if handsize > faction.stats.handlimit:
			
			for cid in faction.hand:
				options.add((cid,))
			
			# options.update(faction.hand.copy())
			#
			# options = xset((options,))
			
		if is_active:
			options.add(('accept',))
			
			# reveal techs from secret vault
			options.update(check_revealable(G, player))
			
			# removable nations
			options.add((removable_nations(G, player),))
			
		code[player] = options
		
	for player in G.players:
		if player not in code and player in G.temp.move_to_post:
			del G.temp.move_to_post[player]
		
	return code


