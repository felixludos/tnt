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
	if unit.cv == 1 or unit.type == 'Convoy' and unit.cv == 2:
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
		diff = 1 if unit.type != 'Convoy' else 2
		unit.cv -= diff
		G.logger.write('{} lost {} cv: {}'.format(id, diff, unit.cv))
		G.objects.updated[id] = unit

def apply_damage_sea(G, b, unit_hit):
	id = unit_hit.id
	unit = G.objects.table[id]
	if unit.cv == 1 or unit.type == 'Convoy' and unit.cv == 2:
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

		#re-compute b.fire_orders per battle_group!
		b.fire_orders = adict()
		for bg in b.battle_groups:
			b.fire_orders[bg] = [u for u in b.fire_order if (u.owner != b.attacker and u.type != 'Convoy' or u.battle_group == bg)]

		b.idx = b.fire_orders[b.battle_group].index(b.fire)
	else:
		diff = 1 if unit.type != 'Convoy' else 2
		unit.cv -= diff
		G.logger.write('{} lost {} cv: {}'.format(id, diff, unit.cv))
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

def calc_retreat_options_for_unit(G, player, b, c, u):
	result = []
	if u.type == 'Fortress':
		return result
	if player in G.players:
		tile = b.tile
		unit = u.unit
		id = u.id
		if player == b.attacker and id in G.temp.has_moved:
			# attacker: ONLY to tile from wwhich moved if moved this turn!!!
			# G units can only retreat to ADJACENT friendly tile!
			if u.group != 'G' or G.temp.has_moved[id] in b.tile.borders.keys():
				result.append((id, G.temp.has_moved[id]))
		elif u.group == 'G':
			neighbors = tile.borders.keys()
			# if defender: not to tile from which attackers came
			forbid = attacker_moved_from(G, b, player, neighbors) if player == b.defender else []
			for nei in neighbors:
				# G unit can retreat into adjacent undisputed friendly territory
				if is_friendly_to_unit(G, id, u.group, nei, player) and not nei in forbid:
					result.append((id, nei))
		else:
			# ANS unit undisputed friendly within movement range
			locs = ANS_rebase_options(G, unit)
			#print('locs:', locs, type(locs))
			if len(locs):
				for loc in locs:
					result.append((id, loc))
		#print(b.retreat_options)
	return result

def calc_retreat_options_for_fire_unit(G, player, b, c):
	result = []
	if b.fire.unit.type == 'Fortress':
		return result
	if player in G.players:
		tile = b.tile
		u = b.fire
		unit = u.unit
		id = u.id
		if player == b.attacker and id in G.temp.has_moved:
			# attacker: ONLY to tile from wwhich moved if moved this turn!!!
			# G units can only retreat to ADJACENT friendly tile!
			if u.group != 'G' or G.temp.has_moved[id] in b.tile.borders.keys():
				result.append((id, G.temp.has_moved[id]))
		elif u.group == 'G':
			neighbors = tile.borders.keys()
			# if defender: not to tile from which attackers came
			forbid = attacker_moved_from(G, b, player, neighbors) if player == b.defender else []
			for nei in neighbors:
				# G unit can retreat into adjacent undisputed friendly territory
				if is_friendly_to_unit(G, id, u.group, nei, player) and not nei in forbid:
					result.append((id, nei))
		else:
			# ANS unit undisputed friendly within movement range
			locs = ANS_rebase_options(G, unit)
			#print('locs:', locs, type(locs))
			if len(locs):
				for loc in locs:
					result.append((id, loc))
		#print(b.retreat_options)
	return result

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

def calc_mandatory_rebase_options(G, b, c):
	#TODO code rewrite
	#mand rebase for non-owner troups when no G support
	#rebase for player who does NOT own the tile
	player = b.attacker if b.attacker != b.owner else b.defender
	non_owner_units = [u for u in b.fire_order if u.owner != b.owner]
	n_o_G = [u for u in non_owner_units if u.group == 'G']
	n_o_ANS = [u for u in non_owner_units if u.group != 'G']
	n_o_ground_support = len(n_o_G) > 0
	if len(n_o_ANS) and not n_o_ground_support:
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
		if len(options):
			code = adict()
			code[unit_owner] = options
			G.logger.write('{} select rebase option for ANS units'.format(player))
			return code

	player = b.owner
	owner_units = [u for u in b.fire_order if u.owner == b.owner]
	o_G = [u for u in owner_units if u.group == 'G']
	o_ANS = [u for u in owner_units if u.group != 'G']
	o_ground_support = len(o_G) > 0

	if len(o_ANS) and not o_ground_support and n_o_ground_support:
		options = xset()
		unit_owner = o_ANS[0].owner
		b.mandatory_rebase_options = []
		for ans in o_ANS:
			unit = ans.unit
			#if this unit has just moved in, retreat to same tile
			if player == b.attacker and unit._id in G.temp.has_moved:
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

def calc_target_units_with_max_cv(b):
	#find units with maximal cv
	maxCV = 0
	for u in b.target_units:
		unit = u.unit
		if unit.cv > maxCV:
			maxCV = unit.cv
	units_max_cv = []
	for u in b.target_units:
		unit = u.unit
		if unit.cv == maxCV:
			units_max_cv.append(u)
	#TODO: learn python!!!
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

def no_units_in_battle_group_left(G, c, b, player):
	units = [u for u in b.fire_orders[b.battle_group] if u.owner == player]
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

def add_unique_in_order(lst, prop):
	result = []
	for el in lst:
		if prop in el and el[prop] and not el[prop] in result:
			result.append(el[prop])
	return result

#******************************
#           old code             *
#******************************

#******************************
#           main              *
#******************************
def land_battle_phase(G, player, action):
	c = G.temp.combat
	b = c.battle

	if b.stage == 'battle_start':  #starting a battle
		assert action == None, 'there is an action in have_cmd!!!!!'
		b.winner = None
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
			b.stage = 'select_combat_action'
			c.stages.append(b.stage)

		if b.stage == 'select_combat_action':
			#arriving here, b.fire should be in place and player should be b.fire.owner!
			assert action == None, '{}: action!!!!!'.format(b.stage)
			assert b.fire and player == b.fire.owner, '{} ERROR!!! b={}'.format(b.stage, b)
			b.stage = 'select_combat_action_ack'
			c.stages.append(b.stage)
			if 'combat_action' in b:
				del b.combat_action
			opponent = b.attacker if player == b.defender else b.defender

			#calc possible combat actions: target classes and retreat options
			units = b.fire_order
			b.opp_types = list({u.type for u in units if u.owner == opponent})
			b.opp_groups = list({u.group for u in units if u.owner == opponent})

			if player == 'Minor':
				#per default, G is selected
				#check if there is a unit with group 'G' in fire_order
				unitOppG = next(filter(lambda i: i.owner == opponent and i.group == 'G', (x for x in lst)), False)
				if unitOppG:
					b.opp_types = list({u.type for u in units if u.owner == opponent and u.group == 'G'})
					b.opp_groups = list({u.group for u in units if u.owner == opponent and u.group == 'G'})
				code = encode_list(G, opponent, b.opp_groups)
			else:
				#retreat options should be same as usual
				b.retreat_options = calc_retreat_options_for_fire_unit(G, player, b, c)
				#encode all possible target_class or retreat_tile options in code
				code = encode_cmd_options(G, player)

			#determining target class:
			b.target_class = None
			b.target_units = None
			return code

		if b.stage == 'select_combat_action_ack':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			player = b.fire.owner
			opponent = b.attacker if player == b.defender else b.defender
			if len(action) > 1:
				b.stage = 'retreat'
			else:
				b.stage = 'hit'
			c.stages.append(b.stage)
			action = None

		if b.stage == 'hit':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			b.combat_action = 'hit'
			c.stages.append(b.stage)
			b.target_class = head
			b.stage = 'hit_ack'

			b.target_units = []
			for u in b.fire_order:
				if u.owner == opponent and u.group == b.target_class:
					b.target_units.append(u)
			G.logger.write('{}:{} {} targeting {} {}'.format(b.idx, player, b.fire.id, b.target_class, opponent))

			return encode_accept(G, player, opponent)

		if b.stage == 'hit_ack':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			action = None
			player = b.fire.owner
			opponent = b.attacker if player == b.defender else b.defender

			if not 'hits' in b: #ROLL DICE!!!!!!!!
				G.logger.write('ROLLING DICE..............')
				b.hits = roll_dice(G, b, player, opponent)
				b.outcome = b.hits
				G.logger.write('{} hits rolled!'.format(b.hits))

			if b.hits > 0:
				b.stage = 'have_hits'
			else:
				b.stage = 'no_hits'
			c.stages.append(b.stage)

		if b.stage == 'no_hits':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			b.units_hit = None
			b.stage = 'no_hits_ack'
			c.stages.append(b.stage)
			return encode_accept(G, player, opponent)

		if b.stage == 'no_hits_ack':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			action = None
			b.stage = 'combat_action_ends'
			c.stages.append(b.stage)

		if b.stage == 'have_hits':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			b.units_max_cv = calc_target_units_with_max_cv(b)
			b.types_max_cv = list({u.type for u in b.units_max_cv})
			b.stage = 'have_hits_ack'  # if b.hits == b.outcome else 'more_hits_ack'
			b.units_hit = None

			if len(b.units_max_cv) <= b.hits:
				b.units_hit = b.units_max_cv
				return encode_accept(G, player, opponent)

			elif opponent in G.players and len(b.types_max_cv) > 1:
				# The owner can choose which of equal-CV unit takes hit
				b.units_hit = None
				return encode_who_takes_hit_options(G, opponent)

			else:
				b.units_hit = b.units_max_cv[:b.hits]
				return encode_accept(G, player, opponent)

		if b.stage == 'have_hits_ack':  # or b.stage == 'more_hits_ack':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			action = None
			player = b.fire.owner
			opponent = b.attacker if player == b.defender else b.defender
			b.stage = 'damage_ack'
			c.stages.append(b.stage)

			if head == 'accept':
				assert b.units_hit, '{} ERROR!!!'.format(b.stage)
			else:
				#head is type of units that should be hit first
				#use units_max_cv
				correctTypeUnits = [u for u in b.units_max_cv if u.type == head]
				if len(correctTypeUnits) >= b.hits:
					b.units_hit = correctTypeUnits[:b.hits]
				else:
					b.units_hit = correctTypeUnits

			#apply damage to units_hit for damaged player (=opponent) to accept
			b.hits -= len(b.units_hit)
			for unit_hit in b.units_hit:
				apply_damage(G, b, unit_hit)

			return encode_accept(G, opponent, player)

		if b.stage == 'damage_ack':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			action = None
			#look if there are target units left
			#if not, goto no_target_units_left
			if no_units_left(G, c, b, opponent):
				b.winner = player
				b.stage = 'combat_action_ends'
			elif b.hits == 0:
				b.stage = 'combat_action_ends'
			else:  #there are still hits left and still opp is alive
				#recompute target units (units have to be b.target_class)
				b.target_units = []
				for u in b.fire_order:
					if u.owner == opponent and u.group == b.target_class:
						b.target_units.append(u)
				if not len(b.target_units):
					#hits left but no units of that class
					b.stage = 'combat_action_ends'
				else:
					G.logger.write('{}:{} {} targeting {} {}'.format(b.idx, player, b.fire.id, b.target_class, opponent))
					b.stage = 'have_hits'

		if b.stage == 'combat_action_ends':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			if b.winner:
				b.stage = 'battle_ends'
			else:
				if 'hits' in b:
					del b.hits
					del b.outcome

				b.idx += 1
				if no_units_left(G, c, b, opponent):  #dont think this can happen!
					b.winner = player
					b.stage = 'should_NOT_be_here'
					G.logger.write('{} has no more units! Please accept battle end!'.format(b.opponent))
				elif no_units_left(G, c, b, player):  #after retreating last of his units
					b.winner = opponent
					b.stage = 'should_NOT_be_here'
					G.logger.write('{} retreated last unit, Land battle ends'.format(player))
				elif b.idx >= len(b.fire_order):
					b.stage = 'mandatory_rebase'
					G.logger.write('all units have acted, Land battle ends')
				else:
					b.fire = b.fire_order[b.idx]
					player = b.fire.owner
					b.stage = 'select_combat_action'
					G.logger.write('{} {} fires next'.format(b.fire.owner, b.fire.id))

			c.stages.append(b.stage)

		if b.stage == 'should_NOT_be_here':
			print('IMPOSSIBLE STAGE!!!!!')
			pass

		if b.stage == 'retreat':
			b.combat_action = 'retreat'
			b.selectedRetreatUnit = head
			b.selectedRetreatTile = tail[0]
			player = b.fire.owner
			G.logger.write('{}:{} {} RETREATING TO {}'.format(b.idx, player, b.fire.id, b.selectedRetreatTile))
			id = b.selectedRetreatUnit
			unit = G.players[player].units[id]
			tilename = b.selectedRetreatTile
			move_unit(G, unit, tilename)
			#er entfernt hier die rebased unit!!!
			b.fire_order = [u for u in b.fire_order if u.id != id]
			#revert visibility to just owner!
			unit.visible.clear()
			unit.visible.add(player)
			b.stage = 'retreat_ack'
			c.stages.append(b.stage)
			return encode_accept(G,player)
			#TODO: spaeter weiter impl

		if b.stage == 'retreat_ack':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			action = None
			b.stage = 'combat_action_ends'
			c.stages.append(b.stage)

		if b.stage == 'mandatory_rebase':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			#ANS must retreat/rebase if no friendly ground support!
			#for tile owner: if no ground support AND enemy has ground units on tile!
			#player = b.attacker if b.owner != b.attacker else b.defender
			#kann beides der fall sein? NEIN
			code = calc_mandatory_rebase_options(G, b, c)
			if code:
				b.stage = 'mandatory_rebase_ack'
				c.stages.append(b.stage)
				return code
			elif no_units_left(G, c, b, playerParam):
				b.winner = b.attacker if playerParam == b.defender else b.defender
			b.stage = 'battle_ends'
			c.stages.append(b.stage)

		if b.stage == 'mandatory_rebase_ack':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			#assert playerParam != b.owner, 'owner of tile is rebasing!!! ERROR!!!'
			#can happen if owner has no ground support!
			head, *tail = action
			action = None
			#rebase unit,tile
			b.selectedRetreatUnit = head
			b.selectedRetreatTile = tail[0]
			id = b.selectedRetreatUnit
			unit = G.players[playerParam].units[id]
			tilename = b.selectedRetreatTile
			move_unit(G, unit, tilename)
			#er entfernt hier die rebased unit!!!
			b.fire_order = [u for u in b.fire_order if u.id != id]
			#revert visibility to just owner!
			unit.visible.clear()
			unit.visible.add(playerParam)

			#if still more mandatory retreats, have to calc!
			b.stage = 'mandatory_rebase'
			c.stages.append(b.stage)

		if b.stage == 'battle_ends':
			#mandatory_rebase has already taken place when here!!!
			#either because it is decided or because all players have acted
			if b.winner:
				make_undisputed(G, G.tiles[b.tilename])
				if (b.owner != b.winner):
					switch_ownership(G, G.tiles[b.tilename], b.winner)
					b.owner = b.winner
			if b.owner in G.players:
				ownerUnits = [u for u in b.fire_order if u.owner == b.owner]
				for u in ownerUnits:
					unit = u.unit
					unit.visible.clear()
					unit.visible.add(b.owner)
					G.objects.updated[unit._id] = unit

			b.stage = 'battle_ends_ack'
			c.stages.append(b.stage)
			return encode_accept(G, player, opponent)

		if b.stage == 'battle_ends_ack':
			c.stage = 'battle_ended'
			c.stages.append(b.stage)
			# raise PhaseComplete
			break

	raise PhaseComplete

def sea_battle_phase(G, player, action):
	c = G.temp.combat
	b = c.battle

	if b.stage == 'battle_start':  #starting a sea battle
		assert action == None, 'there is an action in have_cmd!!!!!'
		b.winner = None
		b.battle_groups = add_unique_in_order(b.fire_order, 'battle_group')
		b.battle_group = None
		b.fire_orders = adict()
		for bg in b.battle_groups:
			b.fire_orders[bg] = [u for u in b.fire_order if (u.owner != b.attacker and u.type != 'Convoy' or u.battle_group == bg)]
		b.stage = 'battle_start_ack'
		c.stages.append(b.stage)
		G.logger.write('sea battle starting in {}'.format(b.tilename))
		return encode_accept(G, b.attacker, b.defender)

	while (True):
		if b.stage == 'battle_start_ack':  #player accepted battle start
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			assert player == b.attacker, '{}: wrong player in {}!!!!!'.format(player, b.stage)
			action = None  #if got accept action, just delete it and proceed
			b.stage = 'battle_round_start'
			c.stages.append(b.stage)

		if b.stage == 'battle_round_start':
			b.roundWinner = None
			b.idx = 0
			#attacker must select battle group, fire_orders should be upToDate
			lst = [(s,) for s in b.fire_orders]
			b.stage = 'battle_round_start_ack'
			c.stages.append(b.stage)
			return encode_list(G, b.attacker, lst)

		if b.stage == 'battle_round_start_ack':
			#when getting here, should have a battle group: head
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			assert player == b.attacker, '{}: wrong player in {}!!!!!'.format(player, b.stage)
			head, *tail = action
			action = None

			b.battle_group = head
			fire_order = b.fire_orders[head]
			b.fire = fire_order[b.idx]
			player = b.fire.owner

			b.stage = 'select_combat_action'
			c.stages.append(b.stage)

		if b.stage == 'select_combat_action':
			#arriving here, b.fire should be in place and player should be b.fire.owner!
			assert action == None, '{}: action!!!!!'.format(b.stage)
			assert b.fire and player == b.fire.owner, '{} ERROR!!! b={}'.format(b.stage, b)
			b.stage = 'select_combat_action_ack'
			c.stages.append(b.stage)
			if 'combat_action' in b:
				del b.combat_action
			opponent = b.attacker if player == b.defender else b.defender

			#who can be targeted?
			#if player==attacker all opponent units in b.fire_order can be targeted
			units = b.fire_orders[b.battle_group]
			if player == b.attacker:
				b.opp_types = list({u.type for u in b.fire_order if u.owner == opponent})
				b.opp_groups = list({u.group for u in b.fire_order if u.owner == opponent})
			else:
				#otherwise can only target selected battle group or convoys
				#convoys have u.battle_group == None since they do not fight at sea!
				b.opp_types = []
				for u in b.fire_order:
					if not u.type in b.opp_types and u.owner == opponent and \
						(not u.battle_group or u.battle_group == b.battle_group):
							b.opp_types.append(u.type)
				b.opp_groups = []
				for u in b.fire_order:
					if not u.group in b.opp_groups and u.owner == opponent and \
						(not u.battle_group or u.battle_group == b.battle_group):
							b.opp_groups.append(u.group)
				print('done')
				# b.opp_types = list({
				#     u.type
				#     for u in units
				#     if u.owner == opponent and (not u.battle_group or u.battle_group == b.battle_group)
				# })
				# b.opp_groups = list({
				#     u.group
				#     for u in units
				#     if u.owner == opponent and (not u.battle_group or u.battle_group == b.battle_group)
				# })

			#retreat options should be same as usual
			b.retreat_options = calc_retreat_options_for_fire_unit(G, player, b, c)

			#encode all possible target_class or retreat_tile options in code
			code = encode_cmd_options(G, player)

			b.target_class = None
			b.target_units = None
			return code

		if b.stage == 'select_combat_action_ack':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			player = b.fire.owner
			opponent = b.attacker if player == b.defender else b.defender
			if len(action) > 1:
				b.stage = 'retreat'
			else:
				b.stage = 'hit'
			c.stages.append(b.stage)
			action = None

		if b.stage == 'hit':
			assert action == None, '{}: action error!!!!!'.format(b.stage)
			assert head and len(head) == 1, '{}: head error!!!!!'.format(b.stage)
			b.combat_action = 'hit'
			b.target_class = head
			b.stage = 'hit_ack'
			c.stages.append(b.stage)

			#calc target_units according to selected battle group
			b.target_units = []
			for u in b.fire_order:
				if u.owner == opponent and u.group == b.target_class:
					if opponent == b.attacker and u.battle_group and u.battle_group != b.battle_group:
						continue
					b.target_units.append(u)
			G.logger.write('{}:{} {} targeting {} {}'.format(b.idx, player, b.fire.id, b.target_class, opponent))
			return encode_accept(G, player, opponent)

		if b.stage == 'hit_ack':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			action = None
			player = b.fire.owner
			opponent = b.attacker if player == b.defender else b.defender

			if not 'hits' in b: #ROLL DICE!!!!!!!!
				G.logger.write('ROLLING DICE..............')
				b.hits = roll_dice(G, b, player, opponent)
				b.outcome = b.hits
				G.logger.write('{} hits rolled!'.format(b.hits))

			if b.hits > 0:
				b.stage = 'have_hits'
			else:
				b.stage = 'no_hits'
			c.stages.append(b.stage)

		if b.stage == 'no_hits':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			b.units_hit = None
			b.stage = 'no_hits_ack'
			c.stages.append(b.stage)
			return encode_accept(G, player, opponent)

		if b.stage == 'no_hits_ack':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			action = None
			b.stage = 'combat_action_ends'
			c.stages.append(b.stage)

		if b.stage == 'have_hits':
			assert action == None, '{}: action!!!!!'.format(b.stage)

			b.units_max_cv = calc_target_units_with_max_cv(b)
			b.types_max_cv = list({u.type for u in b.units_max_cv})

			b.stage = 'have_hits_ack'  # if b.hits == b.outcome else 'more_hits_ack'
			b.units_hit = None

			if len(b.units_max_cv) <= b.hits:
				b.units_hit = b.units_max_cv
				return encode_accept(G, player, opponent)

			elif opponent in G.players and len(b.types_max_cv) > 1:
				# The owner can choose which of equal-CV unit takes hit
				b.units_hit = None
				return encode_who_takes_hit_options(G, opponent)

			else:
				b.units_hit = b.units_max_cv[:b.hits]
				return encode_accept(G, player, opponent)

		if b.stage == 'have_hits_ack':  # or b.stage == 'more_hits_ack':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			action = None
			player = b.fire.owner
			opponent = b.attacker if player == b.defender else b.defender
			b.stage = 'damage_ack'
			c.stages.append(b.stage)
			if head == 'accept':
				assert b.units_hit, '{} ERROR!!!'.format(b.stage)
			else:
				#head is type of units that should be hit first
				#use units_max_cv
				correctTypeUnits = [u for u in b.units_max_cv if u.type == head]
				if len(correctTypeUnits) >= b.hits:
					b.units_hit = correctTypeUnits[:b.hits]
				else:
					b.units_hit = correctTypeUnits
			#apply damage to units_hit for damaged player (=opponent) to accept
			b.hits -= len(b.units_hit)
			for unit_hit in b.units_hit:
				apply_damage_sea(G, b, unit_hit)
			return encode_accept(G, opponent, player)

		if b.stage == 'damage_ack':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			player = b.fire.owner
			opponent = b.attacker if player ==b.defender else b.defender
			head, *tail = action
			action = None
			#look if there are target units left
			#if not, goto no_target_units_left
			if no_units_left(G, c, b, opponent):
				b.winner = player
				b.stage = 'combat_action_ends'
			elif opponent == b.attacker and no_units_in_battle_group_left(G,c,b,opponent):
				#eliminate this battle_group from fire_orders
				del b.fire_orders[b.battle_group]
				b.battle_groups.remove(b.battle_group)
				b.battle_group = None
				#end combat round
				b.roundWinner = player
				b.stage = 'combat_action_ends'
			elif b.hits == 0:
				b.stage = 'combat_action_ends'
			else:  #there are still hits left and still opp is alive
				#recompute target units (units have to be b.target_class)
				b.target_units = []
				for u in b.fire_order:
					if u.owner == opponent and u.group == b.target_class:
						if opponent == b.attacker and u.battle_group and u.battle_group != b.battle_group:
							continue
						b.target_units.append(u)
				if not len(b.target_units):
					#hits left but no units of that class
					b.stage = 'combat_action_ends'
				else:
					b.stage = 'have_hits'

		if b.stage == 'combat_action_ends':
			assert action == None, '{}: action!!!!!'.format(b.stage)
			player = b.fire.owner
			opponent = b.attacker if player ==b.defender else b.defender
			if b.winner:
				b.stage = 'battle_ends'
			elif b.roundWinner: #kommt nur vor wenn battle group tot aber noch andere battle group exists
				if 'hits' in b:
					del b.hits
					del b.outcome
				b.stage = 'combat_round_ends'
			else:
				if 'hits' in b:
					del b.hits
					del b.outcome
					b.idx += 1	#not when it was a retreat! check if correct!!!
				if no_units_left(G, c, b, opponent):  #dont think this can happen!
					b.winner = player
					b.stage = 'should_NOT_be_here'
					G.logger.write('{} has no more units! Please accept battle end!'.format(b.opponent))
				elif no_units_left(G, c, b, player):  #after retreating last of his units
					b.winner = opponent
					b.stage = 'should_NOT_be_here'
					G.logger.write('{} retreated last unit, Sea battle ends'.format(player))
				elif player == b.attacker and no_units_in_battle_group_left(G,c,b,player):
					#player retreated his last unit from this battleGroup
					#eliminate this battle_group from fire_orders
					del b.fire_orders[b.battle_group]
					#end combat round
					b.roundWinner = opponent
					b.stage = 'combat_action_ends'
				elif b.idx >= len(b.fire_orders[b.battle_group]):
					b.stage = 'combat_round_ends'
					G.logger.write('all units have acted, Land battle ends')
				else:
					b.fire = b.fire_orders[b.battle_group][b.idx]
					player = b.fire.owner
					b.stage = 'select_combat_action'
					G.logger.write('{} {} fires next'.format(b.fire.owner, b.fire.id))

			c.stages.append(b.stage)

		if b.stage == 'should_NOT_be_here':
			print('IMPOSSIBLE STAGE!!!!!')
			pass

		if b.stage == 'retreat':
			b.combat_action = 'retreat'
			b.selectedRetreatUnit = head
			b.selectedRetreatTile = tail[0]
			player = b.fire.owner
			G.logger.write('{}:{} {} RETREATING TO {}'.format(b.idx, player, b.fire.id, b.selectedRetreatTile))
			id = b.selectedRetreatUnit
			unit = G.players[player].units[id]
			tilename = b.selectedRetreatTile
			move_unit(G, unit, tilename)
			#er entfernt hier die rebased unit!!!
			b.fire_order = [u for u in b.fire_order if u.id != id]
			#re-compute b.fire_orders per battle_group!
			b.fire_orders = adict()
			for bg in b.battle_groups:
				b.fire_orders[bg] = [u for u in b.fire_order if (u.owner != b.attacker and u.type != 'Convoy' or u.battle_group == bg)]
			#b.idx stays the same

			#revert visibility to just owner!
			unit.visible.clear()
			unit.visible.add(player)
			b.stage = 'retreat_ack'
			c.stages.append(b.stage)
			return encode_accept(G,player)

		if b.stage == 'retreat_ack':
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			action = None
			b.stage = 'combat_action_ends'
			c.stages.append(b.stage)

		if b.stage == 'combat_round_ends':
			#muss air rebase machen
			#all airForce units in fire_orders[b.battle_group] (both players!) have to rebase!
			#wie kann ich beide players handlen?
			#zuerst fuer attacker
			b.stage = 'combat_round_ends_attacker'
			c.stages.append(b.stage)

		if b.stage == 'combat_round_ends_attacker':
			player = b.attacker
			lst = []
			#achtung! b.fire_orders[b.battle_group] could have been deleted!
			if b.battle_group and b.battle_group in b.fire_orders:
				for u in b.fire_orders[b.battle_group]:
					if u.type == 'AirForce' and u.owner == player:
						retreat_options = calc_retreat_options_for_unit(G, player, b, c, u)
						lst.extend(retreat_options)
				if len(lst):
					code = encode_list(G,player,lst)
					b.stage = 'air_rebase_attacker_ack'
					c.stages.append(b.stage)
					return code
			b.stage = 'combat_round_ends_defender'
			c.stages.append(b.stage)

		if b.stage == 'air_rebase_attacker_ack':
			#player selected air rebase option
			#remove option from list and recalc list
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			action = None
			player = b.attacker
			b.selectedRetreatUnit = head
			b.selectedRetreatTile = tail[0]
			G.logger.write('{}:{} {} RETREATING TO {}'.format(b.idx, player, b.fire.id, b.retreats[head]))
			id = b.selectedRetreatUnit
			unit = G.players[player].units[id]
			tilename = b.selectedRetreatTile
			move_unit(G, unit, tilename)
			#er entfernt hier die rebased unit!!!
			b.fire_orders[b.battle_group] = [u for u in b.fire_order if u.id != id]
			#revert visibility to just owner!
			unit.visible.clear()
			unit.visible.add(player)
			b.stage = 'combat_round_ends_attacker'
			c.stages.append(b.stage)

		if b.stage == 'combat_round_ends_defender':
			player = b.defender
			lst = []
			#battle_group could have been eliminated therefore use b.fire_order!
			for u in b.fire_order:
				if u.type == 'AirForce' and u.owner == player:
					retreat_options = calc_retreat_options_for_unit(G, player, b, c, u)
					lst.extend(retreat_options)
			if len(lst):
				code = encode_list(G,player,lst)
				b.stage = 'air_rebase_defender_ack'
				return code
			else:
				b.stage = 'round_end_after_air_rebase'

		if b.stage == 'air_rebase_defender_ack':
			#player selected air rebase option
			#remove option from list and recalc list
			assert action != None, '{}: no action!!!!!'.format(b.stage)
			head, *tail = action
			action = None
			player = b.defender
			b.selectedRetreatUnit = head
			b.selectedRetreatTile = tail[0]
			G.logger.write('{}:{} {} RETREATING TO {}'.format(b.idx, player, b.fire.id, b.retreats[head]))
			id = b.selectedRetreatUnit
			unit = G.players[player].units[id]
			tilename = b.selectedRetreatTile
			move_unit(G, unit, tilename)
			#er entfernt hier die rebased unit!!!
			b.fire_orders[b.battle_group] = [u for u in b.fire_order if u.id != id]
			#revert visibility to just owner!
			unit.visible.clear()
			unit.visible.add(player)
			b.stage = 'combat_round_ends_defender'
			c.stages.append(b.stage)

		if b.stage == 'round_end_after_air_rebase':
			G.logger.write('combat round ends after air rebase!!!')
			if len(b.fire_orders):
				b.stage = 'battle_round_start'
			else:
				b.stage = 'battle_ends'
			c.stages.append(b.stage)

		if b.stage == 'battle_ends':
			#mandatory_rebase has already taken place when here!!!
			#either because it is decided or because all players have acted
			if b.winner:
				b.owner = b.winner
			if b.owner in G.players:
				ownerUnits = [u for u in b.fire_order if u.owner == b.owner]
				for u in ownerUnits:
					unit = u.unit
					unit.visible.clear()
					unit.visible.add(b.owner)
					G.objects.updated[unit._id] = unit

			b.stage = 'battle_ends_ack'
			c.stages.append(b.stage)
			return encode_accept(G, player, opponent)

		if b.stage == 'battle_ends_ack':
			c.stage = 'battle_ended'
			c.stages.append(b.stage)
			# raise PhaseComplete
			break

	raise PhaseComplete
