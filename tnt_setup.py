from util import tdict, tset, adict, tlist, idict, load, save, collate, uncollate, xset, seq_iterate, PhaseComplete
from tnt_util import compute_tracks, placeable_units
from tnt_cards import load_card_decks, draw_cards
from tnt_errors import ActionError
from tnt_units import load_unit_rules, add_unit
import random

def load_map(G, tiles='config/tiles.yml', borders='config/borders.yml'):
	
	tiles = load(tiles)
	borders = load(borders)
	
	for b in borders:
		n1, n2 = b.tile1, b.tile2
		t = b.type
		
		if 'borders' not in tiles[n1]:
			tiles[n1].borders = tdict()
		tiles[n1].borders[n2] = t
		
		if 'borders' not in tiles[n2]:
			tiles[n2].borders = tdict()
		tiles[n2].borders[n1] = t
	
	G.tiles = tdict({name:idict(tile) for name, tile in tiles.items()})
	
	for name, tile in G.tiles.items():
		tile.__dict__['_id'] = name
		# tile.name = name
		tile.units = tset()
		if tile.type != 'Sea' and tile.type != 'Ocean':
			for neighbor in tile.borders.keys():
				if G.tiles[neighbor].type == 'Sea' or G.tiles[neighbor].type == 'Ocean':
					tile.type = 'Coast'
					break
		
		# add tile to game objects
		tile.obj_type = 'tile'
		tile.visible = tset({'Axis', 'West', 'USSR'})
		G.objects.table[name] = tile



def load_players_and_minors(G):
	player_setup = load('config/faction_setup.yml')
	
	capitals = load('config/capitals.yml')
	
	G.nations = tdict()
	territories = tdict()
	designations = tdict()
	minor_designation = 'Minor'
	
	for tile in G.tiles.values():
		if 'alligence' in tile:
			designations[tile.alligence] = minor_designation
			if tile.alligence not in territories:
				territories[tile.alligence] = tset()
			territories[tile.alligence].add(tile._id)
	designations['USA'] = 'Major'
	G.nations.designations = designations
	G.nations.territories = territories
	G.nations.capitals = capitals
	G.nations.groups = tdict()
	
	# load factions/players
	players = tdict()
	
	groups = tset(player_setup.keys())
	rivals = tdict()
	for g in groups:
		gps = groups.copy()
		gps.remove(g)
		rivals[g] = tset(gps)
	
	for name, config in player_setup.items():
		
		faction = tdict()
		
		faction.stats = tdict()
		faction.stats.handlimit = config.Handlimit
		faction.stats.factory_all_costs = config.FactoryCost
		faction.stats.factory_idx = 0
		faction.stats.factory_cost = faction.stats.factory_all_costs[faction.stats.factory_idx]
		faction.stats.emergency_command = config.EmergencyCommand
		
		faction.stats.rivals = rivals[name]
		
		faction.stats.DoW = tdict({r:False for r in rivals[name]})
		
		faction.stats.at_war_with = tdict({r:False for r in rivals[name]})
		faction.stats.at_war = False
		
		faction.stats.aggressed = False
		faction.stats.peace_dividends = tlist()
		
		faction.stats.enable_USA = 'enable_USA' in config
		faction.stats.enable_Winter = 'enable_Winter' in config
		
		faction.cities = tdict()
		faction.cities.MainCapital = config.MainCapital
		faction.cities.SubCapitals = config.SubCapitals
		
		faction.members = tdict()
		for nation, info in config.members.items():
			faction.members[nation] = tset([nation])
			if info.type == 'Great_Power':
				faction.stats.great_power = nation
			if 'Colonies' in info:
				faction.members[nation].update(info.Colonies)
		
		full_cast = tset()
		for members in faction.members.values():
			full_cast.update(members)
		for member in full_cast:
			G.nations.designations[member] = name
		
		faction.homeland = tdict({member:tset() for member in faction.members.keys()})
		faction.territory = tset()
		
		for tile_name, tile in G.tiles.items():
			if 'alligence' not in tile:
				continue
			if tile.alligence in faction.members: # homeland
				faction.homeland[tile.alligence].add(tile_name)
			if tile.alligence in full_cast:
				faction.territory.add(tile_name)
				tile.owner = name
		
		faction.tracks = tdict()
		pop, res = compute_tracks(faction.territory, G.tiles)
		faction.tracks.POP = pop
		faction.tracks.RES = res
		faction.tracks.IND = config.initial_ind
		
		faction.units = tdict()
		faction.hand = tset() # for cards
		faction.technologies = tset()
		faction.secret_vault = tset()
		faction.influence = tset()
		
		faction.diplomacy = tdict()
		faction.diplomacy.associates = tset()
		faction.diplomacy.protectorates = tset()
		faction.diplomacy.satellites = tset()
		faction.diplomacy.violations = tset()
		
		players[name] = faction
	G.players = players
	
	# load minors/diplomacy
	minors = tdict()
	majors = tdict()
	status = tdict()
	for name, team in G.nations.designations.items():
		if team not in G.nations.groups:
			G.nations.groups[team] = tset()
		G.nations.groups[team].add(name)
		
		if team in {minor_designation, 'Major'}:
			status[name] = tdict()
			
			status[name].is_armed = False
			status[name].units = tdict()
		
		if team == minor_designation: # only minors
			minor = tdict()
			
			minor.faction = None
			minor.value = 0
			
			minors[name] = minor
			
		if team == 'Major': # only includes neutral majors
			major = tdict()
			
			major.faction = None
			major.value = 0
			
			majors[name] = major
	
	G.diplomacy = tdict()
	G.diplomacy.minors = minors
	G.diplomacy.majors = majors
	G.diplomacy.neutrals = minors.copy()
	G.diplomacy.neutrals.update(majors)
	G.diplomacy.influence = tdict()
	G.nations.status = status

def load_game_info(G, seed=None, path='config/game_info.yml'):
	info = load(path)
	
	game = tdict()
	
	game.seed = seed
	G.random = random.Random(seed)
	# G.random = TestRandom(seed)

	game.year = info.first_year - 1 # zero based
	game.last_year = info.last_year
	num_rounds = game.last_year - game.year
	
	game.turn_order_options = info.turn_order_options
	
	game.sequence = ['Setup'] + num_rounds*info.year_order + ['Scoring']
	game.index = -1 # start below 0, so after increment in next_phase() it starts at 0
	#game.action_phases = tset(x for x in info.phases if info.phases[x]) # no need for action phases anymore (all action phases have a pre phase)
	
	game.peace_dividends = tlist(sum([[v]*n for v,n in info.peace_dividends.items()], []))
	G.random.shuffle(game.peace_dividends)
	
	game.victory = info.victory
	
	G.game = game
	
	G.objects = tdict()
	G.objects.table = tdict()

def init_gamestate(seed=None):
	
	# if seed is None:
	# 	seed = random.getrandbits(64)
	
	G = tdict()
	
	load_game_info(G, seed=seed)
	
	load_map(G)
	
	load_players_and_minors(G)
	load_card_decks(G)
	
	load_unit_rules(G)
	
	return G

def encode_setup_actions(G):
	
	code = adict()
	
	for faction, nationality, tilenames in seq_iterate(G.temp.setup, [None, 'cadres', None], end=True):
		# if player is not None and faction != player:
		# 	continue
		
		options = placeable_units(G, faction, nationality, tilenames)
		
		# print(nationality, tilenames)
		
		if len(options) == 0:
			continue
			
		if faction not in code:
			code[faction] = xset()
			
		code[faction].add((nationality, options))
		
	if len(code) == 0:
		raise PhaseComplete
		
	return code

player_setup_path='config/faction_setup.yml'

def setup_pre_phase(G):
	
	player_setup = load(player_setup_path)
	
	# prep temp info - phase specific data
	
	temp = tdict()
	temp.setup = tdict()
	
	for name, faction in player_setup.items():
		
		if 'units' in faction.setup:
		
			for unit in faction.setup.units:
				add_unit(G, unit)
	
			del faction.setup.units
	
		temp.setup[name] = faction.setup
	
	G.temp = temp
	
	# return action adict(faction: (action_keys, action_options))
	return encode_setup_actions(G)
	

def setup_phase(G, player, action): # player, nationality, tilename, unit_type
	# place user chosen units
	
	nationality, tilename, unit_type = action
	
	unit = adict()
	unit.nationality = nationality
	unit.tile = tilename
	unit.type = unit_type
	
	#print(unit)
	
	add_unit(G, unit)
	
	G.temp.setup[player].cadres[nationality][tilename] -= 1
	if G.temp.setup[player].cadres[nationality][tilename] == 0:
		del G.temp.setup[player].cadres[nationality][tilename]
		
	if len(G.temp.setup[player].cadres[nationality]) == 0:
		del G.temp.setup[player].cadres[nationality]
	
	if len(G.temp.setup[player].cadres) == 0: # all cadres are placed
		del G.temp.setup[player].cadres
		
		if 'action_cards' in G.temp.setup[player]:
			draw_cards(G, 'action', player, N=G.temp.setup[player].action_cards)
			del G.temp.setup[player].action_cards
			
		if 'investment_cards' in G.temp.setup[player]:
			draw_cards(G, 'action', player, N=G.temp.setup[player].action_cards)
			del G.temp.setup[player].investment_cards
		
	return encode_setup_actions(G)
	

# def encode_setup_actions(G, player=None):
# 	#keys = ('nationality', 'tile', 'unit_type')
# 	code = adict()
#
# 	for faction, setups in G.temp.setup.items():
# 		nationalities = xset()
# 		if 'cadres' not in setups:
# 			continue
# 		for nationality, tiles in setups.cadres.items():
#
# 			available_units = {ut:rules for ut, rules in G.units.rules.items() if ut in  G.units.reserves[nationality] and G.units.reserves[nationality][ut]>0}
#
# 			groups = [
# 				xset({ut for ut, rules in available_units.items() if 'not_placeable' not in rules}),
# 				xset({ut for ut, rules in available_units.items() if 'not_placeable' not in rules and ut != 'Fortress'}),
# 				xset({ut for ut, rules in available_units.items() if
# 				      'not_placeable' not in rules and rules.type not in {'N', 'S'}}),
# 				xset({ut for ut, rules in available_units.items() if
# 				      'not_placeable' not in rules and rules.type not in {'N', 'S'} and ut != 'Fortress'}),
# 			]
#
#
# 			group_names = [xset() for _ in groups]
# 			for tilename in tiles:
# 				tile = G.tiles[tilename]
# 				has_fortress = False
# 				if 'units' in tile:
# 					for ID in tile.units:
# 						if G.objects.table[ID].type == 'Fortress':
# 							has_fortress = True
# 							break
#
# 				if tile.type == 'Land': # no coast
# 					group_names[2].add(tilename)
# 				elif has_fortress:
# 					group_names[1].add(tilename)
# 				elif has_fortress and tile.type == 'Land':
# 					group_names[3].add(tilename)
# 				else:
# 					group_names[0].add(tilename)
#
# 			options = xset((gn, g) for gn, g in zip(group_names, groups) if len(gn) > 0 and len(g) > 0)
# 			nationalities.add((nationality, options))
# 		code[faction] = nationalities
#
# 	if player is not None and player in code:
# 		return code[player]
# 	elif player is not None:
# 		return None
#
# 	return code
