from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit, remove_unit
from tnt_util import travel_options, fill_movement
import random

def encode_accept(G, player):
	#player = G.temp.order[G.temp.active_idx]
	code = adict()
	options = xset()
	options.add(('accept',))
	print('* * vor code[player]=options', options)
	code[player] = options
	return code

def encode_cmd_options(G, player):
	#player = G.temp.order[G.temp.active_idx]
	code = adict()
	options = xset()
	for b in G.temp.combat.battle.opp_groups:
		options.add((b,))
	for r in G.temp.combat.battle.retreat_options:
		options.add((r,))
	print('* * vor code[player]=options', options)
	code[player] = options
	return code

def encode_who_takes_hit_options(G, player):
	#player = G.temp.order[G.temp.active_idx]
	code = adict()
	options = xset()
	for b in G.temp.combat.battle.types_max_cv:
		options.add((b,))
	print('* * vor code[player]=options', options)
	code[player] = options
	return code

def calc_target_classes(b, units, opponent):
	b.opp_types = list({u.type for u in units if u.owner == opponent})
	#brauche eigentlich nicht den type sondern die group!!!!
	b.opp_groups = list({u.group for u in units if u.owner == opponent})

def calc_retreat_options_for_fire_unit(G, player, b, c):
	b.retreat_options = []
	if player in G.players:
		tile = b.tile
		u = b.fire
		unit = u.unit
		id = u.id
		if id in G.temp.has_moved:
			b.retreat_options.append((id,G.temp.has_moved[id]))
		else:
			#unit can retreat into adjacent friendly territory
			neighbors = tile.borders.keys()
			for nei in neighbors:
				if is_friendly_to_unit(G,id,u.group,nei,player):
					b.retreat_options.append((id,nei))
		print(b.retreat_options)

def calc_all_retreat_options(G, player, b, c):
	b.retreat_options = []
	b.must_retreat = [] #ANS without friendly ground support
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
			#TODO: add rebase options! retreat for Airforce: 
			id = u.id
			if u.group != 'G':
				b.must_retreat.append(id)
			if id in G.temp.has_moved:
				b.retreat_options.append((id,G.temp.has_moved[id]))
				continue
			elif u.group == 'G':
				#unit can retreat into adjacent friendly territory
				neighbors = tile.borders.keys()
				for nei in neighbors:
					if is_friendly(G,nei, player):
						if u.group == 'G' and G.tiles[nei].type == 'sea':
							continue
						b.retreat_options.append((id,nei))
			else: #ANS unit rebase options
				locs = travel_options(G,u.unit)
				for loc in locs:
					b.retreat_options.append((id,loc))

def calc_retreat_options_old(G, player, b, c):
	b.retreat_options = []
	#retreats must be pairs: unit_id,tile for each possible retreat
	#as user selects retreat for a unit, need to reduce set of other possible retreats
	#accordingly
	#once retreat has been selected, only more retreats are possible
	#then land battle ends even if units are left
	if player in G.players:
		#tileneighbors
		tile = b.tile
		neighbors = tile.borders.keys()

		borders = G.temp.borders[player]  # past border crossings
		group = G.units.rules[b.fire.unit.type].type
		crossings = adict()
		xing = crossings if group == 'G' else None
		current = xset()
		fuel = 1

		fill_movement(
		    G,
		    player,
		    tile,
		    current,
		    crossings=xing,
		    borders=borders,
		    move_type='land',
		    fuel=fuel,
		    disengaging=None,
		    friendly_only=True,
		    hidden_movement=False)

		#look at current: vielleicht ist das eh was ich will!
		b.retreat_options = current

		#if b.fire.unit has_moved from a tile then can only retreat to that 
		#tile!

		#friendly neighbors
		#retreat for Airforce

def calc_target_units_with_max_cv(b, units, opponent):
	#apply damage
	#find target units
	b.target_units = list({u.unit for u in units if u.owner == opponent and u.group == b.target_class})

	# each Hit scored, reduce the currently
	# strongest (largest CV) Enemy unit of the
	# Targeted Class by 1 CV (exception: Carriers
	# and Convoys lose two CV per Hit).

	#find units with maximal cv
	maxCV = max(u.cv for u in b.target_units)
	units_max_cv = [u for u in b.target_units if u.cv == maxCV]
	return units_max_cv

def find_unit_owner(G,unit):
	return G.nations.designations[unit.nationality]

def find_tile_owner(G,tile):
	if 'owner' in tile:
		return tile.owner
	nation = tile.alligence
	if nation in G.nations.designations:
		return G.nations.designations[nation]
	return None

def is_friendly_to_unit(G,uid,ugroup,tilename,player):
	tile = G.tiles[tilename]
	owner = find_tile_owner(G,tile)
	if owner == player:
		return True
	if tile.type == 'sea':
		if ugroup == 'G': #if G unit, sea area only counts as friendly if occupied by own units
			units = [u for u in tile.units if find_unit_owner(G,u)==player]
			return len(units)>0
		else: #if ANS unit, sea area that is unoccupied counts as friendly
			units = [u for u in tile.units if find_unit_owner(G,u)!=player]
			return len(units)==0
	return False

def is_friendly(G,tilename, player):
	tile = G.tiles[tilename]
	if 'owner' in tile and tile.owner == player:
		return True
  #if tile has friendly
	# if 'aggressors' in tile and not player in tile.aggressors:
	# 	return True
	
	return False

def no_enemy_units_left(G, c, b, enemy):
	enemy_units = [u for u in b.fire_order if u.owner == enemy]
	return len(enemy_units) == 0

def roll_dice(G, b, player, opponent):
	#should return number of successful hits for unit of cv=x
	ndice = b.fire.unit.cv
	#calc boundary for successful hit
	limit = G.units.rules[b.fire.type][b.target_class]
	#technologies that could alter limit
	if b.fire.type == 'Airforce' and b.fire.air_def_radar and is_friendly(G,b.tilename, b.fire.owner):
		ndice *= 2
	if b.fire.type == 'Fleet' and b.target_class == 'S':
		limit = 3
	dice_rolls = [5, 1, 2, 2, 3, 3, 3, 4, 4, 5, 6][:ndice] if b.idx % 2 else [1, 2, 2, 3, 3, 3, 4, 4, 5, 6, 5][:ndice]
	outcome = sum(i <= limit for i in dice_rolls)
	print('rolling', ndice, 'dice yields', outcome, 'hits')
	return outcome

def land_battle_phase(G, player, action):
	c = G.temp.combat
	b = c.battle

	if not 'fire' in b:
		b.idx = 0
		b.fire = b.fire_order[b.idx]
		c.stage = 'cmd'
		G.logger.write('land battle starting in {}'.format(b.tilename))

	player = b.fire.owner
	is_defender = player == b.defender
	opponent = b.attacker if is_defender else b.defender  #TODO: correct! for simplicity assume just 1 opponent!
	units = b.fire_order

	if c.stage == 'fire':
		#got accept action,
		#next fire
		action = None
		c.stage = 'cmd'

	if c.stage == 'cmd':
		#have fire unit, need fire_target or retreat_tile command
		if not action:
			calc_target_classes(b, units, opponent)
			calc_retreat_options_for_fire_unit(G, player, b, c)
			#encode fire or retreat options
			code = encode_cmd_options(G, player)

			b.target_class = None
			if player == 'Minor':
				b.target_class = 'G' if 'G' in b.opp_groups else b.opp_groupd[0]
				G.logger.write('{} targeting {} {}'.format(player,opponent,b.target_class))
				#just choose first possible target_class
			elif len(code[player]) > 1:
				G.logger.write('{} to select fire [target] or retreat [tile] command'.format(player))
				return code
			else:  #if only 1 option: go on to next stage
				b.target_class = b.opp_groups[0]
			if not player in G.players:
				return encode_accept(G,opponent)
			else:
				return encode_accept(G, player)

		else:
			head, *tail = action
			if head == 'accept':
				#there was only one option, the target class
				c.stage = 'hit'
			elif len(action)>1:
				#this is a retreat command
				print('unit',head, 'RETREAT to', tail[0])
				if not 'retreats' in b:
					b.retreats=adict()
				b.retreats[head]=tail[0]
				c.stage = 'retreat'
			else:
				b.target_class = head
				c.stage = 'hit'

	if c.stage == 'retreat':
		for id in b.retreats:
			unit = G.players[player].units[id]
			destination = b.retreats[id]
			move_unit(G, unit, destination)
			b.fire_order = [u for u in b.fire_order if u.id != id]
			#revert visibility to just owner!
			unit.visible.clear()
			unit.visible.add(player)
			#TODO: mind border limits!!!!!!
			G.logger.write('{} unit {} retreats to {}'.format(player,id,destination))
		del b.retreats
		c.stage = 'done'

	if c.stage == 'hit':
		G.logger.write('{}:{} {} targeting {} {}'.format(b.idx, player, b.fire.id, b.target_class, opponent))
		if not 'hits' in b:
			b.hits = roll_dice(G, b, player, opponent)
		G.logger.write('{} hits'.format(b.hits))
		if b.hits > 0:
			b.hits -= 1
			b.units_max_cv = calc_target_units_with_max_cv(b, units, opponent)
			b.types_max_cv = list({u.type for u in b.units_max_cv})
			if opponent in G.players and len(b.types_max_cv) > 1:
				# The owner can choose which of equal-CV unit takes hit
				b.unit_hit = None
				c.stage = 'select_hit'
				return encode_who_takes_hit_options(G, opponent)
			else:
				b.unit_hit = b.units_max_cv[0]
				c.stage = 'damage'
		else:
			c.stage = 'done'

	if c.stage == 'select_hit':
		head, *tail = action
		correctTypeUnits = [u for u in b.units_max_cv if u.type == head]
		b.unit_hit =  correctTypeUnits[0] #G.players[opponent].units[head]
		c.stage = 'damage'

	if c.stage == 'damage':
		unit_hit = b.unit_hit
		id = unit_hit._id
		unit = G.objects.table[id]
		if unit.cv == 1:
			# units takes a Hit. Units reduced to 0 CV
			# are eliminated and removed from play
			#unit is removed
			G.logger.write('unit {} removed'.format(id))
			remove_unit(G, unit)
			#remove unit from fire_order!!!
			b.fire_order = res = [i for i in b.fire_order if i.unit._id != id]
			b.idx = b.fire_order.index(b.fire)
		else:
			unit.cv -= 1
			G.logger.write('{} lost 1 cv: {}'.format(id, unit.cv))
			G.objects.updated[id] = unit
		if b.hits == 0 or no_enemy_units_left(G, c, b, opponent):
			c.stage = 'done'
		else:
			c.stage = 'hit'
			G.logger.write('battle vor recursive call: {}'.format(G.game.sequence[G.game.index]))
			code = land_battle_phase(G, None, None)
			if code:
				return code

	if c.stage == 'done': #unit b.fire is done, reset b.hits
		if 'hits' in b:
			del b.hits
		b.idx += 1
		if b.idx >= len(b.fire_order):
			if not 'past_battles' in G.temp:
				G.temp.past_battles = []
			G.temp.past_battles.append(G.temp.combat.battle)
			del G.temp.combat.battle
			G.logger.write('battle ended in {}'.format(b.tilename))
			if no_enemy_units_left(G, c, b, player):
				del G.tiles[b.tilename].disputed
				G.tiles[b.tilename].owner = opponent
				del G.tiles[b.tilename].aggressors
			elif no_enemy_units_left(G, c, b, opponent):
				del G.tiles[b.tilename].disputed
				G.tiles[b.tilename].owner = player
				del G.tiles[b.tilename].aggressors
			raise PhaseComplete
		else:
			b.fire = b.fire_order[b.idx]
			c.stage = 'fire'  #to read away accept!
			G.logger.write('{} {} fires next'.format(b.fire.owner, b.fire.id))
			if not opponent in G.players:
				return encode_accept(G, player)
			else:
				return encode_accept(G, opponent)

def naval_battle_phase(G):
	#special rule: ground units (convay) cannot engage or disengage at sea
	print('land battle is going on')
