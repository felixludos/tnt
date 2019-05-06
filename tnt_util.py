
from util import adict, tdict, tset, tlist, xset, idict
from tnt_cards import draw_cards
from tnt_units import add_unit

######################
# Game Processing
######################

def add_next_phase(G, phase):
	G.game.sequence.insert(G.game.index + 1, phase)

def switch_phase(G, phase):
	G.game.sequence.insert(G.game.index, phase)

def compute_tracks(territory, tiles):
	pop, res = 0, 0
	for name in territory:
		tile = tiles[name]
		if 'blockaded' not in tile:
			pop += tile['pop']
			res += tile['res']
			if 'res_afr' in tile and 'blockaded_afr' not in tile:
				res += tile.res_afr
	return pop, res

def compute_production_level(faction):
	at_war = sum(faction.stats.at_war_with.values())
	
	if at_war:
		return min(faction.tracks.POP, faction.tracks.RES, faction.tracks.IND)
	return min(faction.tracks.POP, faction.tracks.IND)


def count_victory_points(G):
	points = adict({p: 0 for p in G.players})
	
	for name, faction in G.players.items():
		
		# current production level
		prod_level = compute_production_level(faction)
		points[name] += prod_level
		
		# control of enemy capitals
		enemy_cities = 0
		for rival, rival_faction in G.players.items():
			if rival != name:
				if rival_faction.cities.MainCapital in faction.territory:
					enemy_cities += 1
				for subcapital in rival_faction.cities.SubCapitals:
					if subcapital in faction.territory:
						enemy_cities += 1
		
		points[name] += 2 * enemy_cities
		
		# count atomic research
		atomics = 0
		for tech in faction.technologies:
			if 'Atomic' in tech:
				atomics += 1
		points[name] += 1 * atomics
		
		# peace dividends
		points[name] += sum(faction.stats.peace_dividends)
		
		# subtract DoW
		DoWs = sum(faction.stats.DoW.values())
		points[name] -= DoWs
	
	return points

def contains_fortress(G, tile):
	for uid in tile.units:
		if G.objects.table[uid].type == 'Fortress':
			return True
	return False


######################
# Diplomacy
######################

def eval_unit_entry(G, tile, unit):
	
	# TODO: Axis entering Canada -> USA becomes West satellite
	# TODO: Interventions
	
	player = G.nations.designations[unit.nationality]
	
	owner = tile.owner if 'owner' in tile else G.nations.designations[tile.alligence]
	
	if player == owner:
		pass
	
	powers = xset()
	
	for uid in tile.units:
		unit = G.objects.table[uid]
		
	
	pass
	
def eval_tile_control(G, tile): # usually done when a unit leaves a tile
	pass

######################
# Game Actions
######################

def placeable_units(G, player, nationality, tile_options):
	
	# Groups: in land, no fortress, not supplied,
	
	reserves = xset(ut for ut in G.units.placeable
	                if ut in G.units.reserves[nationality]
	                and G.units.reserves[nationality][ut ] >0)
	
	base = adict({
		'unsupplied': xset('Fortress'),
		(False, False): reserves,
		(True, False): xset(ut for ut in reserves if ut != 'Fortress'),
		(False, True): xset(ut for ut in reserves if G.units.rules[ut].type not in {'N', 'S'}),
		# in_land_no_fort = xset(ut for ut in in_land if ut in no_fortress),
	})
	base[True, True] = base[True, False].intersection(base[False, True])
	
	# make sure territory is undisputed
	
	options = adict()
	
	for tilename in tile_options:
		tile = G.tiles[tilename]
		
		if 'disputed' in tile:
			continue
		
		has_fortress = contains_fortress(G, tile)
		
		in_land = tile.type == 'Land'  # not including coast
		
		unsupplied = 'unsupplied' in tile and player in tile.unsupplied
		
		cond = has_fortress, in_land
		if unsupplied:
			cond = 'unsupplied'
		
		if unsupplied and has_fortress:
			continue
		
		# add new options based on cond
		if cond not in options:
			options[cond] = xset(), base[cond]
		options[cond][0].add(tilename)
	
	return xset(options.values())

def check_occupied(G, tile, player, wars, enemy=True): # meant to check if rival or enemy troops
	
	for uid in tile.units:
		unit = G.objects.table[uid]
		owner = G.nations.designations[unit.nationality]
		
		if owner not in G.players: # minor units are always enemies
			if enemy:
				return True
		elif owner != player and enemy == wars[owner]:
			return True
		
	return False


def tile_hostile(G, player, tile, decl=None):
	if decl is None:
		decl = G.players[player].diplomacy.violations

	wars = G.players[player].stats.at_war_with

	if 'alligence' in tile:
		if check_occupied(G, tile, player, wars, enemy=False):  # cant occupy same land tile as rival
			return False
		owner = G.nations.designations[tile.alligence]
		if owner == player:
			if 'disputed' in tile:
				return True
			return None
		elif owner in G.players:
			if not wars[owner]:
				return False
		elif not G.nations.status[owner].is_armed:  # Major or Minor
			return False  # owner in decl # no access if occupied by nonenemy

	elif check_occupied(G, tile, player, wars, enemy=True):
		return True
	return False


# def tile_hostile(G, player, tile, decl=None):
#
# 	if decl is None:
# 		decl = G.players[player].diplomacy.violations
#
# 	wars = G.players[player].stats.at_war_with
#
# 	if 'alligence' in tile:
# 		if check_occupied(G, tile, player, wars, enemy=False): # cant occupy same land tile as rival
# 			return False
# 		owner = G.nations.designations[tile.alligence]
# 		if owner == player:
# 			if 'disputed' in tile:
# 				return True
# 			return None
# 		elif owner in G.players:
# 			return wars[owner]
# 		else: # Major or Minor
# 			return owner in decl # no access if occupied by nonenemy
#
# 	elif check_occupied(G, tile, player, wars, enemy=True):
# 		return True
# 	return False
	
movement_restrictions = {
	'land': {'Land', 'Coast', 'Strait'},
	'sea': {'Coast', 'Strait', 'Sea', 'Ocean'}
}

border_limits = {
	'Plains': 3,
	'Forest': 2,
	'River': 2,
	'Strait': 1,
	'Mountains': 1,
	'Coast': 1,
}

def fill_movement(G, player, tile, destinations, crossings=None, borders=None,
                  move_type='land', fuel=1,
                  friendly_only=False, hidden_movement=False, disengaging=None):
	
	# crossings tracks the currently available border crossings (for limited borders)
	# borders tracks the past crossings that have been made
	
	# friendly_only should be true for disengaging troops or strategic movement
	# crossing is not None <=> unit_type == 'G'
	# hidden_movement <=> unit_type in {'S', 'A'}
	# disengaging if None - not disengaging, if True - track border crossing, if (tile, neighbor) - add border option
	
	if fuel == 0:
		return
	
	if disengaging is not None:
		friendly_only = True
	
	fuel -= 1
	
	for name, border in tile.borders.items():
		
		if name in destinations: # neighbor already processed
			if disengaging is None or disengaging in crossings[name]: # this crossing option has been processed
				continue
		
		neighbor = G.tiles[name]
		remaining = fuel
		
		brd = (tile.name, neighbor.name) if tile.name < neighbor.name else (neighbor.name, tile.name)
		
		# is access physically possible
		
		if move_type in movement_restrictions \
			and neighbor.type not in movement_restrictions[move_type]: # invalid neighbor for move_type
			continue
			
		if move_type == 'sea' and neighbor.type == 'Coast': # stop when reaching coast
			
			remaining = 0 # must stop at coast
			
			if tile.type == 'Coast': # coast to coast movement - must be contiguous
				
				common = xset(tile.borders.keys()).intersection(neighbor.borders.keys())
				is_contiguous = False
				for c in common:
					if G.tiles[c].type in {'Sea', 'Ocean'}:
						is_contiguous = True
						break
				if not is_contiguous:
					continue
		
		if neighbor.type == 'Ocean':  # costs an additional movement point
			remaining -= 1
			if fuel < 0:
				continue
		
		if crossings is not None:
			past = 0
			if brd in borders:
				past = borders[brd]
			limit = border_limits[border]
			if border == 'Coast' and 'LSTs' in G.players[player].technologies:
				limit += 1
			
			if past >= limit:
				continue
		
		# is access politically possible
		
		# TODO: make sure passing through straits is possible - recurse without adding
		
		engaging = tile_hostile(G, player, neighbor)
		
		if engaging is None: # can enter - no hostile troops
			
			destinations.add(neighbor.name)
			
			if crossings is not None and disengaging is not None:
				if not len(disengaging):
					disengaging = brd
				
				if neighbor.name not in crossings:
					crossings[neighbor.name] = xset()
				crossings[neighbor.name].add(disengaging)
			
			# recurse
			fill_movement(G, player, neighbor, destinations, crossings=crossings,
			              move_type=move_type, fuel=remaining, borders=borders,
			              friendly_only=friendly_only, hidden_movement=hidden_movement,
			              disengaging=disengaging)
			
		elif engaging:
			if not friendly_only and disengaging is None:
				destinations.add(neighbor.name)
				# no recursion
			
				if crossings is not None: # crossings matter => ground unit
					if neighbor.name not in crossings:
						crossings[neighbor.name] = xset()
					crossings[neighbor.name].add(tile.name)  # make note of each possible entry point for engaging
				
			if hidden_movement: # unit_type in {A, S}
				
				# recurse
				fill_movement(G, player, neighbor, destinations, crossings=crossings,
				              move_type=move_type, fuel=remaining, borders=borders,
				              friendly_only=friendly_only, hidden_movement=hidden_movement,
				              disengaging=disengaging)
				
			
			
	
	

def travel_options(G, unit):
	pts = G.units.rules[unit.type].move
	
	options = xset()
	
	if pts == 0:
		return options
	
	player = G.nations.designations[unit.nationality]
	
	tile = G.tiles[unit.tile]
	
	destinations = xset()
	crossings = adict()
	cmd = G.temp.commands[player]
	borders = G.temp.borders[player] # past border crossings
	
	cls = G.units.rules[unit.type].type
	
	hidden_movement = cls == 'S' or cls == 'A'
	disengaging = () if 'disputed' in tile else None
	
	for defensive in range(2): # gen all steps once with strategic movement and once without
		
		if defensive and ('emergency' in cmd or disengaging is not None):
			continue
		
		fuel = pts * (1 + defensive)
		
		if 'emergency' in cmd or disengaging is not None:
			defensive = True
		
		xing = crossings if cls == 'G' and (not defensive or disengaging is not None) else None
		
		if cls in 'NS' or (cls == 'G' and tile.type in movement_restrictions['sea']): # sea movement
			
			fill_movement(G, player, tile, destinations, crossings=xing, borders=borders,
			              move_type='sea', fuel=fuel, disengaging=disengaging,
			              friendly_only=defensive, hidden_movement=hidden_movement)
			
		if cls == 'G': # land movement
			
			fill_movement(G, player, tile, destinations, crossings=xing, borders=borders,
			              move_type='land', fuel=fuel, disengaging=disengaging,
			              friendly_only=defensive, hidden_movement=hidden_movement)
		
		if cls == 'A':
			
			if tile.type in {'Sea', 'Ocean'}:
				fuel = pts # no strategic movement
				defensive = 1 # no engaging
			
			fill_movement(G, player, tile, destinations, crossings=xing, borders=borders,
			              move_type='air', fuel=fuel, disengaging=disengaging,
			              friendly_only=defensive, hidden_movement=hidden_movement)
			
			if tile.type in {'Sea', 'Ocean'}:
				break
	
	
	for dest in destinations:
		if dest in crossings:
			options.add((dest, crossings[dest]))
		else:
			options.add((dest,))
	
	return options
	
	
