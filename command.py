
from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete, PhaseInterrupt
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit, remove_unit
from tnt_util import travel_options, add_next_phase, switch_phase
from government import check_revealable, reveal_tech
import random
from diplomacy import declaration_of_war, violation_of_neutrality, convert_to_armed_minor, USA_becomes_satellite


def encode_command_card_phase(G):
	
	code = adict()
	
	player = G.temp.active_players[G.temp.active_idx]
	options = xset()
	options.add('pass')
	
	options.update(G.players[player].hand)
	# options.update(cid for cid in G.players[player].hand if 'action' in G.objects.table[cid].obj_type)
	
	code[player] = (options,)
	
	return code

def check_declarations(G, player):
	
	options = xset()
	
	# wars
	options.add((xset(name for name, war in G.players[player].stats.at_war_with.items() if not war),))
	
	# neutral
	
	nations = xset(G.diplomacy.neutrals.keys())
	nations -= G.players[player].diplomacy.violations
	
	options.add((nations,))
	
	return options




# def command_phase(G, player, action):
#
# 	if 'commands' not in G.temp: # choose command cards or pass
# 		code = planning_phase(G, player, action)
#
# 		if code is not None:
# 			return code
#
# 	if 'order' in G.temp: # use command cards for movement etc
# 		code = movement_phase(G, player, action)
#
# 		if code is not None:
# 			return code
#
# 	if len(G.temp.battles): # choose battles and resolve
# 		code = combat_phase(G, player, action)
#
# 		if code is not None:
# 			return code
#
# 	G.logger.write('{} is complete'.format(G.temp.season))
#
# 	end_phase(G)


def planning_phase(G, player, action):
	
	if action is None:
		if 'temp' in G:
			del G.temp
		
		G.temp = tdict()
		G.temp.season = G.game.sequence[G.game.index]
		
		G.temp.active_idx = 0
		G.temp.active_players = G.game.turn_order.copy()
		if G.temp.season == 'Winter':
			G.temp.active_players = tlist(p for p in G.game.turn_order if G.players[p].stats.enable_Winter)
		
		G.temp.decision = tdict()
		G.temp.passes = 0
		
		G.temp.borders = tdict({p: tdict() for p in G.players})
		
		return encode_command_card_phase(G)
	
	faction = G.players[player]
	
	head, *tail = action
	
	if head == 'pass':
		G.temp.passes += 1
		G.temp.active_idx += 1
		G.temp.active_idx %= len(G.temp.active_players)
		
		G.logger.write('{} passes'.format(player))
	
	elif head in faction.hand:
		G.temp.passes = 0
		card = G.objects.table[head]
		# if 'owner'
		del card.owner
		G.objects.updated[head] = card
		
		G.temp.decision[player] = card
		
		faction.hand.remove(head)
		
		G.logger.write('{} plays a card'.format(player))
		
		G.temp.active_players.remove(player)
		if len(G.temp.active_players):
			G.temp.active_idx %= len(G.temp.active_players)
	
	if len(G.temp.active_players) > G.temp.passes:
		return encode_command_card_phase(G)
	
	# evaluate card choices
	
	G.temp.commands = tdict()
	
	for p, card in G.temp.decision.items():  # RULE OVERRULED: emergency priority tie breaks are automatic
		if 'season' in card:
			cmd = tdict()
			cmd.priority = card.priority
			cmd.moved = tset()
			
			if card.season == G.temp.season:
				val = card.value
				msg = ' {} command: {} {}'.format(card.season, card.priority, val)
			else:
				cmd.emergency = True
				val = G.players[p].stats.emergency_command
				msg = 'n emergency command: {} {}'.format(card.priority, val)
			
			cmd.value = val
			G.temp.commands[p] = cmd
		
		else:
			msg = ' bluff (investment card)'
		
		G.logger.write('{} has played a{}'.format(p, msg))
		
		discard_cards(G, card._id)
	
	
	if len(G.temp.commands):
		
		G.temp.order = tlist(k for k, v in sorted([(k, v.priority + ('e' if 'emergency' in v else ''))
		                                           for k, v in G.temp.commands.items()],
		                                          key=lambda x: x[1]))
		G.logger.write('Play order is: {}'.format(', '.join(G.temp.order)))
		
		G.temp.active_idx = 0
		
		add_next_phase(G, 'Movement')
	
	else:
		G.logger.write('No player played a command card during {}'.format(G.temp.season))
	
	raise PhaseComplete

#################
# Movement phase

def powers_present(G, tile):
	powers = xset()
	for uid in tile.units:
		unit = G.objects.table[uid]
		owner = G.nations.designations[unit.nationality]
		powers.add(owner)
	return powers
	
def get_enemies(G, player):
	enemies = xset(['Minor', 'Major'])
	wars = G.players[player].stats.at_war_with
	enemies.update([p for p in wars if wars[p]])
	return enemies

def conflict_present(G, tile):
	powers = powers_present(G, tile)
	
	disputed = False
	if len(powers) > 1:
		for p1 in powers:
			if p1 not in G.players:
				disputed = True
			else:
				wars = G.players[p1].stats.at_war_with
				for p2 in powers:
					if p2 in wars and wars[p2]:
						disputed = True
						break
			if disputed:
				break
	return disputed
	
def check_issue(G, player, other):
	if player == other:
		return False
	if other not in G.players:
		return True
	return G.players[player].stats.at_war_with[other]

def make_disputed(G, tile, aggressor):
	tile.disputed = True
	tile.aggressors = tlist()
	tile.aggressors.append(aggressor)
	G.objects.updated[tile._id] = tile

def make_undisputed(G, tile):
	# remove disputed
	del tile.disputed
	del tile.aggressors
	G.objects.updated[tile._id] = tile

def switch_ownership(G, tile, owner):
	
	G.objects.updated[tile._id] = tile
	
	if 'disputed' in tile:
		
		if owner in tile.aggressors:
			tile.aggressors.remove(owner)
			
		if len(tile.aggressors) == 0:
			make_undisputed(G, tile)
	
	pop = tile['pop']
	res = tile['res']
	msg = ''
	
	if 'owner' in tile and tile.owner in G.players:
		G.players[tile.owner].territory.remove(tile._id)
		
		G.players[tile.owner].tracks.POP -= pop
		G.players[tile.owner].tracks.RES -= res
	
	if pop > 0 or res > 0:
		msg = ' (gaining POP={} RES={})'.format(pop, res)
	
	G.logger.write('{} has taken control of {}{}'.format(owner, tile._id, msg))
	
	if 'blockaded' in tile:
		del tile.blockaded
	
	if 'unsupplied' in tile:
		del tile.unsupplied
	
	G.players[owner].territory.add(tile._id)

	if 'capital' in tile:
		
		owner_info = G.players[owner]
		
		nation = tile.alligence
		
		# take control of all unoccupied tiles in nation
		for tilename in G.nations.territories[nation]:
			other = G.tiles[tilename]
			if other._id != tile._id and len(other.units) == 0:
				switch_ownership(G, other, owner)
		
		if nation in G.nations.status: # minor switches side
			
			if tile.owner in G.players:
				G.players[tile.owner].satellites.remove(nation)
			owner_info.diplomacy.satellites.add(nation)
			
			G.nations.groups[G.nations.designations[nation]].remove(nation)
			G.nations.designations[nation] = owner
			G.nations.groups[owner].add(nation)
		
		else: # something bigger -> major/great power
			for rival, faction in G.players:
				if nation in faction.members:
					if nation == faction.stats.great_power:
						# MainCapital
						
						if rival == owner:
							del faction.stats.fallen
							G.logger.write('{} has been liberated!'.format(tile._id))
						
						else:
							G.logger.write('{} has fallen! ({} production is zero)'.format(tile._id, tile.owner))
							faction.stats.fallen = owner
					
							# TODO: maybe add conquered great power to satellites?
					
					else:
						# SubCapital from MajorPower
						
						# TODO: liberating Great Powers or satellites adds them back properly (not just satellite)
						
						assert rival != owner, 'regaining great powers is not supported currently'
						
						G.logger.write('{} has fallen.'.format(nation))
						
						# wipe out all major power units (nation)
						for uid, unit in faction.units.items():
							if unit.nationality == nation:
								remove_unit(G, unit)
						
						# turn all colonies into armed minors
						for colony in faction.members[nation]:
							if colony != nation:
								G.nations.status[colony] = tdict()
								G.nations.status[colony].units = tdict()
								
								convert_to_armed_minor(G, colony)
						
						# add major power as satellite
						del faction.homeland[nation]
						G.nations.groups[rival].remove(nation)
						G.nations.designations[nation] = owner
						G.nations.groups[owner].add(nation)
					
				else:
					flag = False
					for member, states in faction.members:
						if nation in states: # colony
							flag = True
							# colony becomes a satellite
							
							states.remove(nation)
							G.logger.write('{} captures {}'.format(owner, nation))
							
							owner_info.diplomacy.satellites.add(nation)
							G.nations.groups[G.nations.designations[nation]].remove(nation)
							G.nations.designations[nation] = owner
							G.nations.groups[owner].add(nation)
							
							break
							
					assert flag, 'No nation was captured: {}'.format(nation, tile._id)
		
		tile.owner = owner
		
		
	

# check for new battle and update disputed/aggressor flags
def eval_movement(G, source, unit, dest):  # usually done when a unit leaves a tile
	
	player = G.nations.designations[unit.nationality]
	
	new_battle, engaging, disengaging = False, False, False
	
	# update source
	
	enemies = get_enemies(G, player)
	
	source_powers = powers_present(G, source)
	
	if 'disputed' in source and len(enemies.intersection(source_powers)): # there were enemies in source
		disengaging = True
		
		if not conflict_present(G, source): # there is still a conflict
			make_undisputed(G, source)
			
			G.logger.write('{} is no longer disputed'.format(source._id))
			
		elif player not in source_powers and player in source.aggressors: # player no longer present
			source.aggressors.remove(player)
			G.objects.updated[source._id] = source
			
			G.logger.write('{} has left {}'.format(player, source._id))
		
		if 'owner' in source and source.owner not in source_powers: # owner no longer present
			new_owner = source.aggressors[0]
			
			switch_ownership(G, source, new_owner)
			
	
	dest_powers = powers_present(G, dest)
	
	if len(enemies.intersection(dest_powers)): # enemy in destination -> engaging
		engaging = True
		
		if 'disputed' not in dest:
			new_battle = True
			
			make_disputed(G, dest, player)
			
		elif player not in dest.aggressors:
			dest.aggressors.append(player)
			
	elif 'owner' in dest and dest.owner != player: # unoccupied enemy territory
		
		switch_ownership(G, dest, player)
	
	# TODO: interventions
	
	
	
	# Axis entering Canada -> USA becomes West satellite
	if player == 'Axis' and dest._id == 'Ottawa' and 'USA' not in G.player.West.members:
		USA_becomes_satellite(G, 'West')
	
	return new_battle, engaging, disengaging


def encode_movement(G):
	player = G.temp.order[G.temp.active_idx]
	faction = G.players[player]
	cmd = G.temp.commands[player]
	
	assert cmd.value > 0, 'No more commands - shouldve moved on to next player'
	
	options = xset()
	options.add(('pass',))
	
	if len(cmd.moved) == 0:  # no units have been moved yet -> can make declarations
		options.update(check_declarations(G, player))
	
	for uid, unit in faction.units.items():
		if uid in G.temp.has_moved:
			continue
		locs = travel_options(G, unit)
		if len(locs):
			options.add((unit._id, locs))
	
	# reveal techs in secret vault
	options.update(check_revealable(G, player))
	
	code = adict()
	code[player] = options
	return code

def new_movement(G):
	G.temp.battles = tdict()  # track new battles due to engaging
	G.temp.has_moved = tset()  # units can only move once per movement phase
	
	active = G.temp.order[G.temp.active_idx]
	G.logger.write('{} has {} command points for movement'.format(active, G.temp.commands[active].value))

def movement_phase(G, player=None, action=None):
	
	if 'battles' not in G.temp: # pseudo prephase
		new_movement(G)
		
	if player is None: # when returning from some interrupting phase
		return encode_movement(G)
	
	faction = G.players[player]
	cmd = G.temp.commands[player]
	
	head, *tail = action
	
	if head in faction.secret_vault:
		reveal_tech(G, player, head)
		
	elif head in faction.stats.rivals: # TODO: use lazy threats - declarations only take effect when aggressing
		declaration_of_war(G, player, head)
		
	elif head in G.diplomacy.neutrals: # TODO: use lazy threats - declarations only take effect when aggressing
		violation_of_neutrality(G, player, head)
	
	elif head in faction.units:
		
		destination, *border = tail #is there a case for tail to have more than 1 element?
		
		if len(border):
			if border not in G.temp.borders[player]:
				G.temp.borders[player][border] = 0
			G.temp.borders[player][border] += 1
		
		unit = faction.units[head]
		
		G.temp.has_moved.add(head)
		
		source = G.tiles[unit.tile]
		#source.remove(unit._id) #@@@@
		
		new_battle, engaging, disengaging = eval_movement(G, source, unit, G.tiles[destination])
		
		if new_battle:
			G.temp.battles[destination] = player
			
		#if engaging or disengaging: #@@@@ is this still relevant?
			#assert len(border), 'no border was tracked, but unit is {}'.format('engaging' if engaging else 'disengaging')
			
		move_unit(G, unit, destination)
		
		# decrement command points
		cmd.value -= 1
		
		#@@@@
		# G.logger.write('{} moves a unit from {} to {} ({} comand points remaining)'.format(
		# 	player, unit.tile, destination, cmd.value))
		G.logger.write('{} moves a unit from {} to {} ({} comand points remaining)'.format(
			player, source._id, destination, cmd.value))
		
	
	elif head == 'pass':
		cmd.value -= 1
		G.logger.write('{} passes ({} command points remaining)'.format(player, cmd.value))
		
		
	if cmd.value > 0: # continue movement
		return encode_movement(G)
		
	# movement complete
	del G.temp.commands[player]
	G.logger.write('{} movement is complete'.format(player))
	
	conflicts = tset()
	for uid, unit in faction.units.items():
		tile = G.tiles[unit.tile]
		if 'disputed' in tile:
			conflicts.add(unit.tile)
	
	G.temp.active_idx += 1
	
	if len(G.temp.battles) or len(conflicts): # add combat phase
		
		G.temp.potential_battles = conflicts
		G.temp.attacker = player
		
		# either interrupt or add next
		if len(G.temp.commands): # theres another movement phase after this
			raise PhaseInterrupt('Combat')
		else:
			add_next_phase(G, 'Combat')
			raise PhaseComplete
	else:
		del G.temp.battles
	
	if not len(G.temp.commands): # this season is complete
		raise PhaseComplete
	
	new_movement(G)
	return encode_movement(G)

def end_phase(G):
	
	# check blockades
	raise NotImplementedError
	
	raise PhaseComplete

