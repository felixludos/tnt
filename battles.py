from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit, remove_unit
from tnt_util import travel_options, ANS_rebase_options, fill_movement
from command import make_undisputed, switch_ownership, eval_movement
import random

#******************************
#           helpers           *
#******************************
def apply_damage(G, b, unit_hit):
	id = unit_hit.id
	unit = G.objects.table[id]
	if unit.cv == 1:
		# units takes a Hit. Units reduced to 0 CV
		# are eliminated and removed from play
		#unit is removed
		G.logger.write('unit {} removed'.format(id))
		remove_unit(G, unit)
		#add unit to dead
		if not 'dead' in b:
			b.dead = []
		b.dead.append(unit_hit)
		#remove unit from fire_order!!!
		b.fire_order = res = [i for i in b.fire_order if i.unit._id != id]
		b.idx = b.fire_order.index(b.fire)

	else:
		unit.cv -= 1
		G.logger.write('{} lost 1 cv: {}'.format(id, unit.cv))
		G.objects.updated[id] = unit

def attacker_moved_from(G, b, player, tilenames):
	result = []
	for tilename in tilenames:
		for u in b.fire_order:
			id = u.unit._id
			has_moved = G.temp.has_moved
			if id in has_moved and has_moved[id] == tilename:
				result.append(tilename)
	return result

def calc_target_classes(b, units, opponent):
	b.opp_types = list({u.type for u in units if u.owner == opponent})
	#brauche eigentlich nicht den type sondern die group!!!!
	b.opp_groups = list({u.group for u in units if u.owner == opponent})

def calc_retreat_options_for_fire_unit(G, player, b, c):
	b.retreat_options = []

	if b.fire.unit.type == 'Fortress':
		return

	if player in G.players:
		tile = b.tile
		u = b.fire
		unit = u.unit
		id = u.id
		if player == b.attacker and id in G.temp.has_moved:
			# attacker: ONLY to tile from wwhich moved if moved this turn!!!
			# G units can only retreat to adjacent friendly tile!
			if u.group != 'G' or G.temp.has_moved[id] in b.tile.borders.keys():
				b.retreat_options.append((id, G.temp.has_moved[id]))
		elif u.group == 'G':
			neighbors = tile.borders.keys()
			# if defender: not to tile from which attackers came
			forbid = attacker_moved_from(G, b, player, neighbors) if player == b.defender else []
			for nei in neighbors:
				# G unit can retreat into adjacent undisputed friendly territory
				if is_friendly_to_unit(G, id, u.group, nei, player) and not nei in forbid:
					b.retreat_options.append((id, nei))
		else:
			# ANS unit undisputed friendly within movement range
			locs = ANS_rebase_options(G, unit)
			#print('locs:', locs, type(locs))
			if len(locs):
				for loc in locs:
					b.retreat_options.append((id, loc))
		#print(b.retreat_options)

def calc_all_retreat_options(G, player, b, c):
	b.retreat_options = []
	b.must_retreat = []  #ANS without friendly ground support
	#calc_all_retreat_options: border limits must be kept track once select
	# a retreat option!
	#retreats must be pairs: unit_id,tile for each possible retreat
	#as user selects retreat for a unit, need to reduce set of other possible retreats
	#accordingly
	#once retreat has been selected, only more retreats are possible
	#then land battle ends even if units are left
	if player in G.players:
		#tileneighbors
		tile = b.tile
		units = [u for u in b.fire_order if u.owner == player]

		for u in units:
			#TODO: add rebase options! retreat for AirForce:
			id = u.id
			if u.group != 'G':
				b.must_retreat.append(id)
			if id in G.temp.has_moved:
				b.retreat_options.append((id, G.temp.has_moved[id]))
				continue
			elif u.group == 'G':
				#unit can retreat into adjacent friendly territory
				neighbors = tile.borders.keys()
				for nei in neighbors:
					if is_friendly(G, nei, player):
						if u.group == 'G' and G.tiles[nei].type == 'sea':
							continue
						b.retreat_options.append((id, nei))
			else:  #ANS unit rebase options
				locs = ANS_rebase_options(G, u.unit)
				for loc in locs:
					b.retreat_options.append((id, loc))

def calc_mandatory_rebase_options(G, player, b, c):
	#mand rebase for non-owner troups when no G support
	non_owner_units = [u for u in b.fire_order if u.owner != b.owner]
	n_o_G = [u for u in non_owner_units if u.group == 'G']
	n_o_ANS = [u for u in non_owner_units if u.group != 'G']
	ground_support = len(n_o_G) > 0
	if len(n_o_ANS) and not ground_support:
		options = xset()
		#find out who is owner of options
		#TODO: if more than 1 opponent?!? kann das ueberhaupt sein? need to send 2 separate option sets!!!
		unit_owner = n_o_ANS[0].owner
		b.mandatory_rebase_options = []
		for ans in n_o_ANS:
			unit = ans.unit
			#if this unit has just moved in, retreat to same tile
			if player == b.attacker and unit._id in G.temp.has_moved:
				##options.add((unit._id,G.temp.has_moved[unit._id]))
				#this unit has to move back to has_moved, so don't add to options
				#just move it
				##unit = G.players[player].units[id]
				id = unit._id
				destination = G.temp.has_moved[id]
				move_unit(G, unit, destination)
				b.fire_order = [u for u in b.fire_order if u.id != id]
				#revert visibility to just owner!
				unit.visible.clear()
				unit.visible.add(player)
				#TODO: mind border limits!!!!!!
				G.logger.write('{} unit {} mandatory rebase to {}'.format(player, id, destination))
			else:
				locs = ANS_rebase_options(G, unit)
				#print('locs:', locs, type(locs))
				if len(locs):
					for loc in locs:
						b.mandatory_rebase_options.append((unit._id, loc))
					options.add((unit._id, locs))
		if not len(options):
			return None
		else:
			code = adict()
			code[unit_owner] = options
			G.logger.write('{} select rebase option for ANS units'.format(player))
			return code

def calc_target_units_with_max_cv(b, units, opponent):
	#apply damage
	#find target units
	#b.target_units = target_units_left(b, units, opponent) # list({u.unit for u in units if u.owner == opponent and u.group == b.target_class})

	# each Hit scored, reduce the currently
	# strongest (largest CV) Enemy unit of the
	# Targeted Class by 1 CV (exception: Carriers
	# and Convoys lose two CV per Hit).

	#find units with maximal cv
	maxCV = 0
	for u in b.target_units:
		unit = b.target_units[u].unit
		if unit.cv > maxCV:
			maxCV = unit.cv
	#maxCV = max(u.cv for u in b.target_units)
	units_max_cv = []
	for u in b.target_units:
		unit = b.target_units[u].unit
		if unit.cv == maxCV:
			units_max_cv.append(b.target_units[u])
	#TODO: learn python!!!
	#units_max_cv = [u for u in b.target_units if b.target_units[u].unit.cv == maxCV]
	return units_max_cv

def encode_list(G, player, lst):  #lst is list of tuples
	code = adict()
	options = xset()
	for t in lst:
		options.add(t)
	#print('* * vor code[player]=options', options)
	code[player] = options
	return code

def encode_accept(G, player, opponent=None):
	#player = G.temp.order[G.temp.active_idx]
	code = adict()
	options = xset()
	options.add(('accept',))
	#print('* * vor code[player]=options', options)
	if player in G.players:
		code[player] = options
	else:
		code[opponent] = options
	return code

def encode_cmd_options(G, player):
	#player = G.temp.order[G.temp.active_idx]
	code = adict()
	options = xset()
	for b in G.temp.combat.battle.opp_groups:
		options.add((b,))
	for r in G.temp.combat.battle.retreat_options:
		options.add((r,))
	#print('* * vor code[player]=options', options)
	code[player] = options
	return code

def encode_who_takes_hit_options(G, player):
	#player = G.temp.order[G.temp.active_idx]
	code = adict()
	options = xset()
	for b in G.temp.combat.battle.types_max_cv:
		options.add((b,))
	#print('* * vor code[player]=options', options)
	code[player] = options
	return code

def find_unit_owner(G, unit):
	return G.nations.designations[unit.nationality]

def find_tile_owner(G, tile):
	if 'owner' in tile:
		return tile.owner
	if 'alligence' in tile:
		nation = tile.alligence
		if nation in G.nations.designations:
			return G.nations.designations[nation]
	return None

def is_friendly_to_unit(G, uid, ugroup, tilename, player):
	tile = G.tiles[tilename]
	if 'disputed' in tile:
		return False
	owner = find_tile_owner(G, tile)
	if owner == player:
		return True
	if tile.type == 'Sea' or tile.type == 'Ocean':
		if ugroup == 'G':  #if G unit, sea area only counts as friendly if occupied by own units
			for id in tile.units:
				unit = G.objects.table[id]
				owner = find_unit_owner(G, unit)
				if owner == player:
					return True
			return False
		else:  #if ANS unit, sea area that is unoccupied by enemy counts as friendly
			for id in tile.units:
				unit = G.objects.table[id]
				owner = find_unit_owner(G, unit)
				if owner != player:
					return False
			return True
	return False

def is_friendly(G, tilename, player):
	tile = G.tiles[tilename]
	if 'owner' in tile and tile.owner == player:
		return True
	return False

def no_units_left(G, c, b, player):
	units = [u for u in b.fire_order if u.owner == player]
	return len(units) == 0

def roll_dice(G, b, player, opponent):
	#should return number of successful hits for unit of cv=x
	ndice = b.fire.unit.cv
	#calc boundary for successful hit
	limit = G.units.rules[b.fire.type][b.target_class]
	#technologies that could alter limit
	if b.fire.type == 'AirForce' and b.fire.air_def_radar and is_friendly(G, b.tilename, b.fire.owner):
		ndice *= 2
	if b.fire.type == 'Fleet' and b.target_class == 'S':
		limit = 3
	dice_rolls = [5, 1, 2, 2, 3, 3, 3, 4, 4, 5, 6][:ndice] if b.idx % 2 else [1, 2, 2, 3, 3, 3, 4, 4, 5, 6, 5][:ndice]
	outcome = sum(i <= limit for i in dice_rolls)
	#print('rolling', ndice, 'dice yields', outcome, 'hits')
	return outcome

def target_units_left(b, units, opponent):
	res = adict()
	for u in units:
		if u.owner == opponent and u.group == b.target_class:
			res[u.id] = u
	return res
	#return list({u.unit for u in units if u.owner == opponent and u.group == b.target_class})

#******************************
#           tasks             *
#******************************

#******************************
#           main              *
#******************************
def land_battle_phase(G, player, action):
	c = G.temp.combat
	b = c.battle

	if b.stage == 'battle_start':  #starting a battle
		assert action == None, 'there is an action in have_cmd!!!!!'
		b.idx = 0
		b.fire = b.fire_order[b.idx]
		b.stage = 'battle_start_ack'
		c.stages.append(b.stage)
		G.logger.write('land battle starting in {}'.format(b.tilename))
		player = b.attacker if b.attacker in G.players else b.defender
		return encode_accept(G, player)

	playerParam = player
	player = b.fire.owner
	is_defender = player == b.defender
	opponent = b.attacker if is_defender else b.defender  #TODO: correct! (for simplicity assuming just 1 opponent!)
	units = b.fire_order

	while (True):

		if b.stage == 'battle_start_ack':  #player accepted battle start
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			action = None  #if got accept action, just delete it and proceed
			b.stage = 'action_start'
			c.stages.append(b.stage)


		if b.stage == 'action_start':  #starting a combat action (new fire unit or battle round)
			assert action == None, '{}: action!!!!!'.format(b.stage)
			#have fire unit, goal: find a combat_action
			#prepare b.target_classes, b.retreat_options
			if 'combat_action' in b:
				del b.combat_action
			calc_target_classes(b, units, opponent)
			calc_retreat_options_for_fire_unit(G, player, b, c)
			#encode all possible target_class or retreat_tile options in code
			code = encode_cmd_options(G, player)

			#determining target class:
			b.target_class = None
			b.target_units = None
			if player == 'Minor':  #just 'G' or choose first possible target_class
				#TODO: refine target_class selection for minor!
				#for now: in case of Minor, automatic target class determination and no retreat options:
				b.target_class = 'G' if 'G' in b.opp_groups else b.opp_groups[0]
				b.target_units = target_units_left(b, units, opponent)
				G.logger.write('{} targeting {} {}'.format(player, opponent, b.target_class))
				b.combat_action = 'hit'
				b.stage = 'have_cmd'
				c.stages.append(b.stage)

			elif len(code[player]) > 1:  #player needs to pick target_class: return options
				G.logger.write('{} to select fire+target_class or retreat+tile command'.format(player))
				b.stage = 'select_command'
				c.stages.append(b.stage)

				return code
			else:  #if only 1 option: send accept
				b.target_class = b.opp_groups[0]
				b.target_units = target_units_left(b, units, opponent)
				G.logger.write('PLEASE ACCEPT TARGET GROUP {}'.format(b.target_class))
				b.combat_action = 'hit'
				b.stage = 'have_cmd'
				c.stages.append(b.stage)


		if b.stage == 'select_command':  #user has selected a combat action
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			if len(action) > 1:
				#user selected a retreat command
				if not 'retreats' in b:
					b.retreats = adict()
				b.retreats[head] = tail[0]
				b.selectedRetreatUnit = head
				b.selectedRetreatTile = tail[0]
				b.combat_action = 'retreat'
				b.stage = 'have_cmd'
				c.stages.append(b.stage)

			else:
				#user selected a hit command
				b.target_class = head
				b.target_units = target_units_left(b, units, opponent)
				b.combat_action = 'hit'
				b.stage = 'have_cmd'
				c.stages.append(b.stage)

			action = None

		if b.stage == 'have_cmd':  #combat_action is determined, ask user to accept it
			assert action == None, '{}: action!!!!!'.format(b.stage)
			b.stage = 'ack_combat_action'
			c.stages.append(b.stage)

			if b.combat_action == 'hit':
				G.logger.write('{}:{} {} targeting {} {}'.format(b.idx, player, b.fire.id, b.target_class, opponent))
			else:
				G.logger.write('{}:{} {} RETREATING TO {}'.format(b.idx, player, b.fire.id, b.retreats[head]))
			return encode_accept(G, player, opponent)

		if b.stage == 'ack_combat_action':  #user has accepted combat action
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			action = None
			b.stage = b.combat_action  #after accept go directly to 'hit' or 'retreat'
			c.stages.append(b.stage)


		if b.stage == 'retreat':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			#TODO: explain why there can be more than 1 unit in b.retreats?
			#unit b.selectedRetreatUnit retreats to tile b.selectedRetreatTile
			id = b.selectedRetreatUnit
			unit = G.players[player].units[id]
			tilename = b.selectedRetreatTile
			move_unit(G, unit, tilename)
			b.fire_order = [u for u in b.fire_order if u.id != id]
			#er entfernt hier die fire unit!!!
			b.idx -= 1

			#revert visibility to just owner!
			unit.visible.clear()
			unit.visible.add(player)
			#TODO: mind border limits if G!!!!!!
			G.logger.write('{} unit {} retreats to {}'.format(player, id, tilename))
			b.stage = 'ack_retreat'
			return encode_accept(G,player,opponent)

		if b.stage == 'ack_retreat':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			action = None
			b.stage = 'combat_action_done'
			c.stages.append(b.stage)

		if b.stage == 'hit':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			G.logger.write('{}:{} {} targeting {} {}'.format(b.idx, player, b.fire.id, b.target_class, opponent))
			if not 'hits' in b:
				G.logger.write('ROLLING DICE..............')
				b.hits = roll_dice(G, b, player, opponent)
				b.outcome = b.hits
				G.logger.write('{} hits rolled!'.format(b.hits))

			if b.hits > 0:
				b.units_max_cv = calc_target_units_with_max_cv(b, units, opponent)
				b.types_max_cv = list({u.type for u in b.units_max_cv})

				if len(b.units_max_cv) <= b.hits:
					#just apply damage to each of those units and
					b.units_hit = b.units_max_cv
					b.stage = 'accept_outcome'
					c.stages.append(b.stage)
					return encode_accept(G, player, opponent)

				elif opponent in G.players and len(b.types_max_cv) > 1:
					# The owner can choose which of equal-CV unit takes hit
					b.units_hit = None
					b.stage = 'select_hit_type'
					c.stages.append(b.stage)
					return encode_who_takes_hit_options(G, opponent)

				else:
					b.units_hit = b.units_max_cv[:b.hits]
					b.stage = 'accept_outcome'
					c.stages.append(b.stage)
					return encode_accept(G, player, opponent)

			else:  #b.hits == 0
				b.stage = 'accept_outcome'
				c.stages.append(b.stage)
				return encode_accept(G, player, opponent)

		if b.stage == 'select_hit_type':  #user has selected type to hit next
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			correctTypeUnits = [u for u in b.units_max_cv if u.type == head]
			if len(correctTypeUnits) >= b.hits:
				b.units_hit = correctTypeUnits[:b.hits]
			else:
				b.units_hit = correctTypeUnits  #G.players[opponent].units[head]
			action = None
			b.stage = 'apply_damage'
			c.stages.append(b.stage)

		if b.stage == 'accept_outcome':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			action = None
			if b.hits == 0:
				b.stage = 'combat_action_done'
				c.stages.append(b.stage)
			else:
				b.stage = 'apply_damage'
				c.stages.append(b.stage)

		if b.stage == 'apply_damage':  #have b.units_hit, need to apply 1 hit to each of those units
			assert action == None, '{}: action!!!!!'.format(b.stage)
			#unit_hit = b.units_hit
			b.hits -= len(b.units_hit)
			for unit_hit in b.units_hit:
				apply_damage(G, b, unit_hit)

			b.units_hit = []

			#sollte das dem user jetzt zeigen
			if no_units_left(G, c, b, opponent):
				b.stage = 'battle_interrupted_no_enemy_units_left'
				c.stages.append(b.stage)
			elif b.hits <= 0:
				b.stage = 'combat_action_done'
				c.stages.append(b.stage)
			else:
				#still hits left and still enemies left: damage another type or same type twice
				#finde ein beispiel fuer diesen fall!!!!
				b.stage = 'hit'
				c.stages.append(b.stage)
				b.target_units = target_units_left(b, b.fire_order, opponent)
				if not len(b.target_units):  #no units of target_class are left! end this combat action!
					b.stage = 'combat_action_done'
					c.stages.append(b.stage)

		if b.stage == 'combat_action_done':  #unit b.fire is done, next unit fires, but first, show result!!!!
			assert action == None, '{}: action!!!!!'.format(b.stage)
			G.logger.write('STAGE {} RESULT SHOULD BE PRESENTED!'.format(b.stage))
			if 'hits' in b:
				del b.hits
				del b.outcome
			b.idx += 1
			if no_units_left(G, c, b, opponent):  #dont think this can happen!
				b.stage = 'battle_interrupted_no_enemy_units_left'
				c.stages.append(b.stage)
				G.logger.write('{} has no more units! Please accept battle end!'.format(b.opponent))
			elif b.idx >= len(b.fire_order):
				b.stage = 'mandatory_rebase'
				c.stages.append(b.stage)
				G.logger.write('all units have acted, Land battle ends')
			elif no_units_left(G,c,b,player): #after retreating last of his units
				b.stage = 'cleanup_battle'
				c.stages.append(b.stage)
				G.logger.write('{} retreated last unit, Land battle ends'.format(player))
			else:
				b.fire = b.fire_order[b.idx]
				b.stage = 'ack_combat_action_done'
				c.stages.append(b.stage)
				G.logger.write('{} {} fires next'.format(b.fire.owner, b.fire.id))
				return encode_accept(G, player, opponent)

		if b.stage == 'ack_combat_action_done':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			action = None
			b.stage = 'action_start'
			c.stages.append(b.stage)

		if b.stage == 'battle_interrupted_no_enemy_units_left':
			G.logger.write('battle ends because no enemies are left!')
			assert action == None, '{}: action!!!!!'.format(b.stage)
			action = None
			b.stage = 'ack_battle_interrupted_no_enemy_units_left'
			c.stages.append(b.stage)
			return encode_accept(G, player, opponent)

		if b.stage == 'ack_battle_interrupted_no_enemy_units_left':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			action = None
			b.stage = 'battle_decided'
			c.stages.append(b.stage)

		if b.stage == 'battle_decided':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			#determine winner
			b.winner = b.fire_order[0].owner
			b.stage = 'set_owner'
			c.stages.append(b.stage)

		if b.stage == 'set_owner':
			#transfer ownership if necessary
			G.logger.write('owner of {} is: {}'.format(b.tilename, b.winner))
			if no_units_left(G, c, b, player):
				#TODO do something else also done in command somewhere!!!
				assert b.winner == opponent, 'winner ambiguous!!!!'
				make_undisputed(G, G.tiles[b.tilename])
				if (b.owner != opponent):
					switch_ownership(G, G.tiles[b.tilename], opponent)
					b.newOwner = opponent
			elif no_units_left(G, c, b, opponent):
				assert b.winner == player, 'winner ambiguous!!!!'
				make_undisputed(G, G.tiles[b.tilename])
				if (b.owner != player):
					switch_ownership(G, G.tiles[b.tilename], player)
					b.newOwner = player
			b.stage = 'ack_battle_decided'
			c.stages.append(b.stage)
			return encode_accept(G, player, opponent)

		if b.stage == 'ack_battle_decided':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			action = None
			b.stage = 'cleanup_battle'
			c.stages.append(b.stage)

		if b.stage == 'land_battle_finished':
			b.stage = 'mandatory_rebase'
			c.stages.append(b.stage)

		if b.stage == 'mandatory_rebase':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			#ANS must retreat/rebase if no friendly ground support!
			code = calc_mandatory_rebase_options(G, player, b, c)
			if code:
				b.stage = 'select_mandatory_rebase'
				c.stages.append(b.stage)
				return code
			elif no_units_left(G, c, b, playerParam):
				b.winner = player
				b.stage = 'set_owner'
				c.stages.append(b.stage)
			else:
				b.stage = 'cleanup_battle'
				c.stages.append(b.stage)

		if b.stage == 'select_mandatory_rebase':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			action = None
			#rebase unit,tile
			if not 'retreats' in b:
				b.retreats = adict()
			b.retreats[head] = tail[0]
			b.selectedRetreatUnit = head
			b.selectedRetreatTile = tail[0]

			id = b.selectedRetreatUnit
			unit = G.players[playerParam].units[id]
			tilename = b.selectedRetreatTile
			move_unit(G, unit, tilename)
			#er entfernt hier die fire unit!!!
			b.fire_order = [u for u in b.fire_order if u.id != id]
			#revert visibility to just owner!
			unit.visible.clear()
			unit.visible.add(playerParam)

			#if still more mandatory retreats, have to calc!
			b.stage = 'mandatory_rebase'
			c.stages.append(b.stage)

		if b.stage == 'cleanup_battle':
			#turn units back if owner is player!
			if 'newOwner' in b:
				b.owner = b.newOwner
			if b.owner in G.players:
				ownerUnits = [u for u in b.fire_order if u.owner == b.owner]
				for u in ownerUnits:
					unit = u.unit
					unit.visible.clear()
					unit.visible.add(b.owner)
					G.objects.updated[unit._id] = unit
			b.stage = 'ack_cleanup_battle'
			c.stages.append(b.stage)
			return encode_accept(G,player, opponent)

		if b.stage == 'ack_cleanup_battle':
			c.stage = 'battle_ended'
			c.stages.append(b.stage)
			# raise PhaseComplete
			break
			
	raise PhaseComplete


def sea_battle_phase(G):
	c = G.temp.combat
	b = c.battle

	#special rule: ground units (convay) cannot engage or disengage at sea
	if b.stage == 'battle_start':  #starting a battle
		assert action == None, 'there is an action in have_cmd!!!!!'
		b.idx = 0
		b.fire = b.fire_order[b.idx]
		b.stage = 'battle_start_ack'
		c.stages.append(b.stage)
		G.logger.write('land battle starting in {}'.format(b.tilename))
		player = b.attacker if b.attacker in G.players else b.defender
		return encode_accept(G, player, opponent)

	player = b.fire.owner
	is_defender = player == b.defender
	opponent = b.attacker if is_defender else b.defender  #TODO: correct! (for simplicity assuming just 1 opponent!)
	units = b.fire_order

	while (True):

		if b.stage == 'battle_start_ack':  #player accepted battle start
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			action = None  #if got accept action, just delete it and proceed
			b.stage = 'action_start'
			c.stages.append(b.stage)

		if b.stage == 'action_start':  #starting a combat action (new fire unit or battle round)
			assert action == None, '{}: action!!!!!'.format(b.stage)
			#have fire unit, goal: find a combat_action
			#prepare b.target_classes, b.retreat_options
			if 'combat_action' in b:
				del b.combat_action
			calc_target_classes(b, units, opponent)
			calc_retreat_options_for_fire_unit(G, player, b, c)
			#encode all possible target_class or retreat_tile options in code
			code = encode_cmd_options(G, player)

			#determining target class:
			b.target_class = None
			b.target_units = None
			if player == 'Minor':  #just 'G' or choose first possible target_class
				#TODO: refine target_class selection for minor!
				#for now: in case of Minor, automatic target class determination and no retreat options:
				b.target_class = 'G' if 'G' in b.opp_groups else b.opp_groups[0]
				b.target_units = target_units_left(b, units, opponent)
				G.logger.write('{} targeting {} {}'.format(player, opponent, b.target_class))
				b.combat_action = 'hit'
				b.stage = 'have_cmd'
				c.stages.append(b.stage)
			elif len(code[player]) > 1:  #player needs to pick target_class: return options
				G.logger.write('{} to select fire+target_class or retreat+tile command'.format(player))
				b.stage = 'select_command'
				c.stages.append(b.stage)
				return code
			else:  #if only 1 option: send accept
				b.target_class = b.opp_groups[0]
				b.target_units = target_units_left(b, units, opponent)
				G.logger.write('PLEASE ACCEPT TARGET GROUP {}'.format(b.target_class))
				b.combat_action = 'hit'
				b.stage = 'have_cmd'
				c.stages.append(b.stage)

		if b.stage == 'select_command':  #user has selected a combat action
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			if len(action) > 1:
				#user selected a retreat command
				if not 'retreats' in b:
					b.retreats = adict()
				b.retreats[head] = tail[0]
				b.selectedRetreatUnit = head
				b.selectedRetreatTile = tail[0]
				b.combat_action = 'retreat'
				b.stage = 'have_cmd'
				c.stages.append(b.stage)
			else:
				#user selected a hit command
				b.target_class = head
				b.target_units = target_units_left(b, units, opponent)
				b.combat_action = 'hit'
				b.stage = 'have_cmd'
				c.stages.append(b.stage)
			action = None

		if b.stage == 'have_cmd':  #combat_action is determined, ask user to accept it
			assert action == None, '{}: action!!!!!'.format(b.stage)
			b.stage = 'ack_combat_action'
			c.stages.append(b.stage)
			if b.combat_action == 'hit':
				G.logger.write('{}:{} {} targeting {} {}'.format(b.idx, player, b.fire.id, b.target_class, opponent))
			else:
				G.logger.write('{}:{} {} RETREATING TO {}'.format(b.idx, player, b.fire.id, b.retreats[head]))

			return encode_accept(G, player, opponent)

		if b.stage == 'ack_combat_action':  #user has accepted combat action
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			action = None
			b.stage = b.combat_action  #after accept go directly to 'hit' or 'retreat'
			c.stages.append(b.stage)

		if b.stage == 'retreat':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			#TODO: explain why there can be more than 1 unit in b.retreats?
			#unit b.selectedRetreatUnit retreats to tile b.selectedRetreatTile
			id = b.selectedRetreatUnit
			unit = G.players[player].units[id]
			tilename = b.selectedRetreatTile
			move_unit(G, unit, tilename)
			b.fire_order = [u for u in b.fire_order if u.id != id]
			#er entfernt hier die fire unit!!!
			b.idx -= 1

			#revert visibility to just owner!
			unit.visible.clear()
			unit.visible.add(player)
			#TODO: mind border limits if G!!!!!!
			G.logger.write('{} unit {} retreats to {}'.format(player, id, tilename))
			b.stage = 'ack_retreat'
			c.stages.append(b.stage)
			return encode_accept(G,player, opponent)

		if b.stage == 'ack_retreat':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			action = None
			b.stage = 'combat_action_done'
			c.stages.append(b.stage)

		if b.stage == 'hit':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			G.logger.write('{}:{} {} targeting {} {}'.format(b.idx, player, b.fire.id, b.target_class, opponent))
			if not 'hits' in b:
				G.logger.write('ROLLING DICE..............')
				b.hits = roll_dice(G, b, player, opponent)
				b.outcome = b.hits
				G.logger.write('{} hits rolled!'.format(b.hits))

			if b.hits > 0:
				b.units_max_cv = calc_target_units_with_max_cv(b, units, opponent)
				b.types_max_cv = list({u.type for u in b.units_max_cv})

				if len(b.units_max_cv) <= b.hits:
					#just apply damage to each of those units and
					b.units_hit = b.units_max_cv
					b.stage = 'accept_outcome'
					c.stages.append(b.stage)
					return encode_accept(G, player, opponent)

				elif opponent in G.players and len(b.types_max_cv) > 1:
					# The owner can choose which of equal-CV unit takes hit
					b.units_hit = None
					b.stage = 'select_hit_type'
					c.stages.append(b.stage)
					return encode_who_takes_hit_options(G, opponent)

				else:
					b.units_hit = b.units_max_cv[:b.hits]
					b.stage = 'accept_outcome'
					c.stages.append(b.stage)
					return encode_accept(G, player, opponent)

			else:  #b.hits == 0
				b.stage = 'accept_outcome'
				c.stages.append(b.stage)
				return encode_accept(G, player, opponent)

		if b.stage == 'select_hit_type':  #user has selected type to hit next
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			correctTypeUnits = [u for u in b.units_max_cv if u.type == head]
			if len(correctTypeUnits) >= b.hits:
				b.units_hit = correctTypeUnits[:b.hits]
			else:
				b.units_hit = correctTypeUnits  #G.players[opponent].units[head]
			action = None
			b.stage = 'apply_damage'
			c.stages.append(b.stage)

		if b.stage == 'accept_outcome':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			action = None
			if b.hits == 0:
				b.stage = 'combat_action_done'
				c.stages.append(b.stage)
			else:
				b.stage = 'apply_damage'
				c.stages.append(b.stage)

		if b.stage == 'apply_damage':  #have b.units_hit, need to apply 1 hit to each of those units
			assert action == None, '{}: action!!!!!'.format(b.stage)
			#unit_hit = b.units_hit
			b.hits -= len(b.units_hit)
			for unit_hit in b.units_hit:
				apply_damage(G, b, unit_hit)

			b.units_hit = []

			#sollte das dem user jetzt zeigen
			if no_units_left(G, c, b, opponent):
				b.stage = 'battle_interrupted_no_enemy_units_left'
				c.stages.append(b.stage)
			elif b.hits <= 0:
				b.stage = 'combat_action_done'
				c.stages.append(b.stage)
			else:
				#still hits left and still enemies left: damage another type or same type twice
				#finde ein beispiel fuer diesen fall!!!!
				b.stage = 'hit'
				c.stages.append(b.stage)
				b.target_units = target_units_left(b, b.fire_order, opponent)
				if not len(b.target_units):  #no units of target_class are left! end this combat action!
					b.stage = 'combat_action_done'
					c.stages.append(b.stage)

		if b.stage == 'combat_action_done':  #unit b.fire is done, next unit fires, but first, show result!!!!
			assert action == None, '{}: action!!!!!'.format(b.stage)
			G.logger.write('STAGE {} RESULT SHOULD BE PRESENTED!'.format(b.stage))
			if 'hits' in b:
				del b.hits
				del b.outcome
			b.idx += 1
			if no_units_left(G, c, b, opponent):  #dont think this can happen!
				b.stage = 'battle_interrupted_no_enemy_units_left'
				c.stages.append(b.stage)
				G.logger.write('{} has no more units! Please accept battle end!'.format(b.opponent))
			elif b.idx >= len(b.fire_order):
				b.stage = 'mandatory_rebase'
				c.stages.append(b.stage)
				G.logger.write('all units have acted, Land battle ends')
			else:
				b.fire = b.fire_order[b.idx]
				b.stage = 'ack_combat_action_done'
				c.stages.append(b.stage)
				G.logger.write('{} {} fires next'.format(b.fire.owner, b.fire.id))
				encode_accept(G, player, opponent)

		if b.stage == 'ack_combat_action_done':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			action = None
			b.stage = 'action_start'
			c.stages.append(b.stage)

		if b.stage == 'battle_interrupted_no_enemy_units_left':
			G.logger.write('battle ends because no enemies are left!')
			assert action == None, '{}: action!!!!!'.format(b.stage)
			action = None
			b.stage = 'ack_battle_interrupted_no_enemy_units_left'
			c.stages.append(b.stage)
			return encode_accept(G, player, opponent)

		if b.stage == 'ack_battle_interrupted_no_enemy_units_left':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			action = None
			b.stage = 'battle_decided'
			c.stages.append(b.stage)

		if b.stage == 'battle_decided':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			#determine winner
			b.winner = b.fire_order[0].owner

			#transfer ownership if necessary
			G.logger.write('ownership of {} tranferred to {}'.format(b.tilename, b.winner))
			if no_units_left(G, c, b, player):
				#TODO do something else also done in command somewhere!!!
				assert b.winner == opponent, 'winner ambiguous!!!!'
				make_undisputed(G, G.tiles[b.tilename])
				if (b.owner != opponent):
					switch_ownership(G, G.tiles[b.tilename], opponent)
					b.newOwner = opponent

			elif no_units_left(G, c, b, opponent):
				assert b.winner == player, 'winner ambiguous!!!!'
				make_undisputed(G, G.tiles[b.tilename])
				if (b.owner != player):
					switch_ownership(G, G.tiles[b.tilename], player)
					b.newOwner = player
			b.stage = 'ack_battle_decided'
			c.stages.append(b.stage)
			return encode_accept(G, player, opponent)

		if b.stage == 'ack_battle_decided':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			action = None
			b.stage = 'mandatory_rebase'
			c.stages.append(b.stage)

		if b.stage == 'land_battle_finished':
			b.stage = 'mandatory_rebase'
			c.stages.append(b.stage)

		if b.stage == 'mandatory_rebase':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			#ANS must retreat/rebase if no friendly ground support!
			code = calc_mandatory_rebase_options(G, player, b, c)
			if code:
				b.stage = 'select_mandatory_rebase'
				c.stages.append(b.stage)
				return code
			else:
				b.stage = 'cleanup_battle'
				c.stages.append(b.stage)

		if b.stage == 'select_mandatory_rebase':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			action = None
			#rebase unit,tile
			if not 'retreats' in b:
				b.retreats = adict()
			b.retreats[head] = tail[0]
			b.selectedRetreatUnit = head
			b.selectedRetreatTile = tail[0]

			id = b.selectedRetreatUnit
			unit = G.players[player].units[id]
			tilename = b.selectedRetreatTile
			move_unit(G, unit, tilename)
			#er entfernt hier die fire unit!!!
			b.fire_order = [u for u in b.fire_order if u.id != id]
			#revert visibility to just owner!
			unit.visible.clear()
			unit.visible.add(player)

			#if still more mandatory retreats, have to calc!
			b.stage = mandatory_rebase
			c.stages.append(b.stage)

		if b.stage == 'cleanup_battle':
			#turn units back if owner is player!
			if 'newOwner' in b:
				b.owner = b.newOwner
			if b.owner in G.players:
				ownerUnits = [u for u in b.fire_order if u.owner == b.owner]
				for u in ownerUnits:
					unit = u.unit
					unit.visible.clear()
					unit.visible.add(b.owner)
					G.objects.updated[unit._id] = unit
			b.stage = 'ack_cleanup_battle'
			c.stages.append(b.stage)
			return encode_accept(G,player, opponent)

		if b.stage == 'ack_cleanup_battle':
			c.stage = 'battle_ended'
			c.stages.append(b.stage)
			raise PhaseComplete
