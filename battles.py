from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit, remove_unit
from tnt_util import travel_options, ANS_rebase_options, fill_movement
from command import make_undisputed, switch_ownership
import random

def encode_list(G,player,lst): #lst is list of tuples
	code = adict()
	options = xset()
	for t in lst:
		options.add(t)
	print('* * vor code[player]=options', options)
	code[player] = options
	return code

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

def attacker_moved_from(G,b,player,tilenames):
	result = []
	for tilename in tilenames:
		for u in b.fire_order:
			id = u.unit._id
			has_moved = G.temp.has_moved
			if id in has_moved and has_moved[id]==tilename:
				result.append(tilename)
	return result

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
			b.retreat_options.append((id,G.temp.has_moved[id]))
		elif u.group == 'G':
			neighbors = tile.borders.keys()
			# if defender: not to tile from which attackers came
			forbid = attacker_moved_from(G,b,player,neighbors) if player == b.defender else []
			for nei in neighbors:
				# G unit can retreat into adjacent undisputed friendly territory
				if is_friendly_to_unit(G,id,u.group,nei,player) and not nei in forbid:
					b.retreat_options.append((id,nei))
		else:
			# ANS unit undisputed friendly within movement range
			locs = ANS_rebase_options(G, unit)
			print('locs:',locs,type(locs))
			if len(locs):
				for loc in locs:
					b.retreat_options.append((id,loc))
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
				locs = ANS_rebase_options(G,u.unit)
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

def target_units_left(b, units, opponent):
	return list({u.unit for u in units if u.owner == opponent and u.group == b.target_class})


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
		if u.cv > maxCV:
			maxCV = u.cv
	#maxCV = max(u.cv for u in b.target_units)
	units_max_cv = [u for u in b.target_units if u.cv == maxCV]
	return units_max_cv

def find_unit_owner(G,unit):
	return G.nations.designations[unit.nationality]

def find_tile_owner(G,tile):
	if 'owner' in tile:
		return tile.owner
	if 'alligence' in tile:
		nation = tile.alligence
		if nation in G.nations.designations:
			return G.nations.designations[nation]
	return None

def is_friendly_to_unit(G,uid,ugroup,tilename,player):
	tile = G.tiles[tilename]
	if 'disputed' in tile:
		return False
	owner = find_tile_owner(G,tile)
	if owner == player:
		return True
	if tile.type == 'Sea' or tile.type == 'Ocean':
		if ugroup == 'G': #if G unit, sea area only counts as friendly if occupied by own units
			units = [u for u in tile.units if find_unit_owner(G,u)==player]
			return len(units)>0
		else: #if ANS unit, sea area that is unoccupied by enemy counts as friendly
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

def calc_mandatory_rebase_options(G, player, b, c):
	non_owner_units = [u for u in b.fire_order if u.owner != b.owner]
	n_o_G = [u for u in non_owner_units if u.group == 'G']
	n_o_ANS = [u for u in non_owner_units if u.group != 'G']
	ground_support = len(n_o_G)>0
	if len(n_o_ANS) and not ground_support:
		options = xset()
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
				G.logger.write('{} unit {} mandatory rebase to {}'.format(player,id,destination))
			else:
				locs = ANS_rebase_options(G, unit)
				print('locs:',locs,type(locs))
				if len(locs):
					for loc in locs:
						b.mandatory_rebase_options.append((unit._id,loc))
					options.add((unit._id, locs))
		if not len(options):
			return None
		else:
			code = adict()
			code[player] = options
			G.logger.write('{} select rebase option for ANS units'.format(player))
			return code

def land_battle_phase(G, player, action):
	c = G.temp.combat
	b = c.battle

	if not 'fire' in b:
		b.idx = 0
		b.fire = b.fire_order[b.idx]
		G.logger.write('land battle starting in {}'.format(b.tilename))
		c.stage = 'fire'
		player = b.attacker if b.attacker in G.players else b.defender			
		return encode_accept(G,player)

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
			#determining target class:
			b.target_class = None
			b.target_units = None
			if player == 'Minor':
				#just 'G' or choose first possible target_class
				#TODO: refine target_class selection for minor!
				b.target_class = 'G' if 'G' in b.opp_groups else b.opp_groups[0]
				b.target_units = target_units_left(b, units, opponent)
				#b.target_units = list({u.unit for u in units if u.owner == opponent and u.group == b.target_class})
				G.logger.write('{} targeting {} {}'.format(player,opponent,b.target_class))
				#return encode_accept(G,opponent)
			elif len(code[player]) > 1:
				G.logger.write('{} to select fire+target_class or retreat+tile command'.format(player))
				#player needs to pick target_class: return options
				return code
			else:  #if only 1 option: go on to next stage
				b.target_class = b.opp_groups[0]
				b.target_units = target_units_left(b, units, opponent)
				#b.target_units = list({u.unit for u in units if u.owner == opponent and u.group == b.target_class})
				G.logger.write('PLEASE ACCEPT TARGET GROUP {}'.format(b.target_class))
				#return encode_accept(G,player)
			#b.target_class is known, still returning for accept:
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
				b.target_units = target_units_left(b, units, opponent)
				#b.target_units = list({u.unit for u in units if u.owner == opponent and u.group == b.target_class})
				c.stage = 'hit'
				G.logger.write('SELECTED TARGET GROUP {}'.format(b.target_class))
				return encode_accept(G,player)

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
			G.logger.write('ROLLING DICE..............')
			b.hits = roll_dice(G, b, player, opponent)
			return encode_accept(G,player)

		G.logger.write('{} hits'.format(b.hits))
		if b.hits > 0 and len(target_units_left(b,units,opponent)):
			#TODO do not calc target_units_left twice!!!
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

	if c.stage == 'rebasing':
		#for this stage there must be an action which is one (unit,rebase_tile)
		#remove options for this unit from options, and continue rebasing
		#until b.mandatory_rebase_options is empty
		#then goto stage 'after_rebasing'
		head, *tail = action
		uid = head
		tilename = tail[0]
		b.mandatory_rebase_options = [o for o in b.mandatory_rebase_options if o[0]!=id]
		if len(b.mandatory_rebase_options):
			#encode list of remaining tuples
			return encode_list(G,player,b.mandatory_rebase_options)
		else:
			c.stage = 'after_rebasing'

	if c.stage == 'done': #unit b.fire is done, reset b.hits
		if 'hits' in b:
			del b.hits
		b.idx += 1
		if b.idx >= len(b.fire_order):
			#ANS must retreat/rebase if no friendly ground support!
			code = calc_mandatory_rebase_options(G,player,b,c)
			if code:
				c.stage = 'rebasing'
				return code
			else:
				c.stage = 'after_rebasing'
		else:
			b.fire = b.fire_order[b.idx]
			c.stage = 'fire'  #to read away accept!
			G.logger.write('{} {} fires next'.format(b.fire.owner, b.fire.id))
			if not opponent in G.players:
				return encode_accept(G, player)
			else:
				return encode_accept(G, opponent)
		
	if c.stage == 'after_rebasing':		
			#turn owner units back if owner is player!
			if b.owner in G.players:
				ownerUnits = [u for u in b.fire_order if u.owner == b.owner]
				for u in ownerUnits:
					unit = u.unit
					unit.visible.clear()
					unit.visible.add(b.owner)

			if not 'past_battles' in G.temp:
				G.temp.past_battles = []
			G.temp.past_battles.append(G.temp.combat.battle)
			G.logger.write('battle ended in {}'.format(b.tilename))
			if no_enemy_units_left(G, c, b, player):#TODO do something else also done in command somewhere!!!
				make_undisputed(G,G.tiles[b.tilename])
				if (b.owner != opponent):
					switch_ownership(G,G.tiles[b.tilename],opponent)
			elif no_enemy_units_left(G, c, b, opponent):
				make_undisputed(G,G.tiles[b.tilename])
				if (b.owner != player):
					switch_ownership(G,G.tiles[b.tilename],player)
			del G.temp.combat.battle
			c.stage = 'done'
			raise PhaseComplete

def naval_battle_phase(G):
	#special rule: ground units (convay) cannot engage or disengage at sea
	print('land battle is going on')
