from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit, remove_unit
from tnt_util import travel_options
import random

def encode_accept(G, player):
	#player = G.temp.order[G.temp.active_idx]
	code = adict()
	options = xset()
	options.add(('accept',))
	print('* * vor code[player]=options', options)
	code[player] = options
	return code

def encode_fire_options(G, player):
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
	for b in G.temp.combat.battle.opp_groups:
		options.add((b,))
	for r in G.temp.combat.battle.retreat_options:
		options.add((r,))
	print('* * vor code[player]=options', options)
	code[player] = options
	return code

def calc_target_classes(b, units, opponent):
	b.opp_types = list({u.type for u in units if u.owner == opponent})
	#brauche eigentlich nicht den type sondern die group!!!!
	b.opp_groups = list({u.group for u in units if u.owner == opponent})

def calc_retreat_options(G, player, b, c):
	b.retreat_options = []
	if b.fire.unit.type == 'Fortress':
		return
		
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
		    move_type='sea',
		    fuel=fuel,
		    disengaging=True,
		    friendly_only=True,
		    hidden_movement=False)

		#look at current: vielleicht ist das eh was ich will!
		b.retreat_options = current

		#friendly neighbors
		#retreat for Airforce
def calc_target_units_with_max_cv(b, units, opponent):
	#apply damage

	# each Hit scored, reduce the currently
	# strongest (largest CV) Enemy unit of the
	# Targeted Class by 1 CV (exception: Carriers
	# and Convoys lose two CV per Hit).

	#find units with maximal cv
	maxCV = max(u.cv for u in b.target_units)
	units_max_cv = [u for u in b.target_units if u.cv == maxCV]
	return units_max_cv

def is_friendly(tilename, player):
	tile = G.tiles[tilename]
	if 'owner' in tile and tile.owner == player:
		return True
	if 'aggressors' in tile and not player in tile.aggressors:
		return True
	return False

def roll_dice(G, b, player, opponent):
	#should return number of successful hits for unit of cv=x
	ndice = b.fire.unit.cv
	#calc boundary for successful hit
	limit = G.units.rules[b.fire.type][b.target_class]
	#technologies that could alter limit
	if b.fire.type == 'Airforce' and b.fire.air_def_radar and is_friendly(b.tilename, b.fire.owner):
		ndice *= 2
	if b.fire.type == 'Fleet' and b.target_class == 'S':
		limit = 3
	dice_rolls=[1,2,2,3,3,3,4,4,5,6][:ndice]
	outcome = sum(i<=limit for i in dice_rolls)
	print('rolling',ndice,'dice yields',outcome,'hits')
	return outcome

def land_battle_phase(G, player, action):
	c = G.temp.combat
	b = c.battle

	if not 'fire' in b:
		b.idx = 0
		b.fire = b.fire_order[b.idx]
		c.stage = 'cmd'

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
			calc_retreat_options(G, player, b, c)
			#encode fire or retreat options
			code = encode_fire_options(G, player)
			b.target_class = None
			b.target_units = None
			if len(code) > 1:
				return code
			else:  #if only 1 option: go on to next stage
				b.target_class = b.opp_groups[0]
				#find target units
				b.target_units = list({u.unit for u in units if u.owner == opponent and u.group == b.target_class})
				c.stage = 'hit'
				G.logger.write('TARGET UNITS ARE CLASS {} UNITS'.format(b.target_class))
				return encode_accept(G,player)
		else:
			head, *tail = action
			if head in G.tiles:
				#this is a retreat command
				print('retreat to', head)
				c.stage = 'retreat'
			else:
				b.target_class = head
				b.target_units = list({u.unit for u in units if u.owner == opponent and u.group == b.target_class})
				c.stage = 'hit'

	if c.stage == 'hit':
		b.hits = roll_dice(G, b, player, opponent) 
		if b.hits > 0:
			b.hits -= 1
			b.units_max_cv = calc_target_units_with_max_cv(b, units, opponent)
			if opponent in G.players and len(b.units_max_cv) > 1:
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
		b.unit_hit = G.players[opponent].units[head]
		c.stage = 'damage'

	if c.stage == 'damage':
		unit_hit = b.unit_hit
		id = unit_hit._id
		unit = G.objects.table[id]
		if unit.cv == 1:
			# units takes a Hit. Units reduced to 0 CV
			# are eliminated and removed from play
			#unit is removed
			remove_unit(G, unit)
		else:
			unit.cv -= 1
		G.objects.updated[id] = unit
		if b.hits == 0 or no_enemy_units_left(G,c,b,opponent):
			c.stage = 'done'
		else:
			c.stage = 'hit'

	if c.stage == 'done':
		#increase idx,stage='fire'
		b.idx += 1
		b.fire = b.fire_order[b.idx]
		c.stage = 'fire'  #to read away accept!
		print('hit applied, should go to retaliation hit')
		G.logger.write('{} hit, new cv: {}'.format(id, unit.cv))
		if not opponent in G.players:
			return encode_accept(G, player)
		else:
			return encode_accept(G, opponent)

def naval_battle_phase(G):
	#special rule: ground units (convay) cannot engage or disengage at sea
	print('land battle is going on')
