from tnt_util import tdict, tset, tlist, idict, load, save, collate, uncollate
from tnt_cards import load_card_decks, draw_cards
from tnt_errors import ActionError
from tnt_units import load_unit_rules, add_unit

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
	
	G.tiles = tiles
	
	for name, tile in G.tiles.items():
		tile.name = name
		tile.units = tset()
		if tile.type != 'Sea' and tile.type != 'Ocean':
			for neighbor in tile.borders.keys():
				if G.tiles[neighbor].type == 'Sea' or G.tiles[neighbor].type == 'Ocean':
					tile.type = 'Coast'
					break
		
		# add tile to game objects
		tile.obj_type = 'tile'
		G.objects.table[name] = tile

def compute_tracks(territory, tiles):
	pop, res = 0, 0
	for name, tile in tiles.items():
		if name in territory and 'blockaded' not in tile:
			pop += tile['pop']
			res += tile['res']
			if 'res_afr' in tile and 'blockaded_afr' not in tile:
				res += tile['res_afr']
	return pop, res

def load_players_and_minors(G):
	player_setup = load('config/faction_setup.yml')
	
	nations = tdict()
	minor_designation = 'Minor'
	
	for tile in G.tiles.values():
		if 'alligence' in tile:
			nations[tile.alligence] = minor_designation
	G.nations = nations # map nationality to faction/minor
	
	# load factions/players
	players = tdict()
	
	groups = tset(player_setup.keys())
	rivals = tdict()
	for g in groups:
		gps = groups.copy()
		gps.remove(g)
		rivals[g] = list(gps)
	
	for name, config in player_setup.items():
		
		faction = tdict()
		
		faction.stats = tdict()
		faction.stats.handlimit = config.Handlimit
		faction.stats.factory_all_costs = config.FactoryCost
		faction.stats.factory_idx = 0
		faction.stats.factory_cost = faction.stats.factory_all_costs[faction.stats.factory_idx]
		faction.stats.emergency_command = config.EmergencyCommand
		faction.stats.DoW = tdict()
		faction.stats.DoW[rivals[name][0]] = False
		faction.stats.DoW[rivals[name][1]] = False
		faction.stats.enable_USA = 'enable_USA' in config
		faction.stats.enable_Winter = 'enable_Winter' in config
		
		faction.cities = tdict()
		faction.cities.MainCapital = config.MainCapital
		faction.cities.SubCapitals = config.SubCapitals
		
		faction.members = tdict()
		for nation, info in config.members.items():
			nations[nation] = name
			faction.members[nation] = tset([nation])
			if 'Colonies' in info:
				faction.members[nation].update(info.Colonies)
		
		faction.homeland = tset()
		faction.territory = tset()
		
		full_cast = tset()
		for members in faction.members.values():
			full_cast.update(members)
		
		for tile_name, tile in G.tiles.items():
			if 'alligence' not in tile:
				continue
			if tile.alligence in faction.members: # homeland
				faction.homeland.add(tile_name)
			if tile.alligence in full_cast:
				faction.territory.add(tile_name)
		
		faction.tracks = tdict()
		pop, res = compute_tracks(faction.territory, G.tiles)
		faction.tracks.pop = pop
		faction.tracks.res = res
		faction.tracks.ind = config.initial_ind
		
		faction.units = tset()
		faction.hand = tset() # for cards
		faction.influence = tdict()
		
		players[name] = faction
	G.players = players
	
	# load minors/diplomacy
	minors = tdict()
	for name, team in nations.items():
		if team == minor_designation:
			minor = tdict()
			
			minor.units = tset()
			minor.is_armed = False
			minor.influence_faction = None
			minor.influence_value = 0
			
			minors[name] = minor
	G.minors = minors
	

def load_game_info(G, path='config/game_info.yml'):
	info = load(path)
	
	game = tdict()
	
	game.sequence = ['Setup'] + 10*info.year_order
	game.index = -1 # start below 0, so after increment in next_phase() it starts at 0
	#game.action_phases = tset(x for x in info.phases if info.phases[x]) # no need for action phases anymore (all action phases have a pre phase)
	
	G.game = game
	
	G.objects = tdict()
	G.objects.table = tdict()

def init_gamestate():
	
	G = tdict()
	
	load_game_info(G)
	
	load_map(G)
	
	load_players_and_minors(G)
	load_card_decks(G)
	
	load_unit_rules(G)
	
	return G

def setup_pre_phase(G, player_setup_path='config/faction_setup.yml'):
	
	player_setup = load(player_setup_path)
	
	# place fixed units
	
	for name, config in player_setup.items():
		if 'units' not in config.setup:
			continue
		
		for unit in config.setup.units:
			add_unit(G, unit)
			
	# prep temp info
	
	G.temp = tdict()
	
	for name, faction in player_setup.items():
		out = tdict()
		out.player = name
		if 'cadres' in faction.setup:
			out.info = faction.setup.cadres
			out.msg = 'Choose this many cadres to place into each of these territories'
		else:
			out.msg = 'Wait while other players place their cadres'
			
	
	# return action adict(faction: (action_keys, action_options))

def setup_phase(G, action): # player, tilename, unit_type
	# place user chosen units
	
	# out: send message to all players to choose what tiles to place how many cadres on
	
		
	try:
		msg = io.get()
		
		assert msg.player in incomplete, 'Player {} is already done'.format(msg.player)
		
		reqs = player_setup[msg.player].setup.cadres
		
		placed = False
		
		for member, tiles in reqs.items():
			if msg.tile in tiles:
				placed = True
				assert tiles[msg.tile] > 0, 'No more cadres can be placed onto {}'.format(msg.tile)
				
				unit = tdict()
				unit.type = msg.type
				unit.tile = msg.tile
				unit.nationality = member
				unit.cv = 1
				
				add_unit(G, unit)
				
				tiles[msg.tile] -= 1
				if tiles[msg.tile] == 0:
					del tiles[msg.tile]
					
		assert placed, 'Tile {} not available for placement'.format(msg.tile)
		
	except (ActionError, AssertionError) as e:
		io.put({'error':'Invalid Action', 'msg':str(e)})
	
	
	# draw action cards
	for name, config in player_setup.items():
		if 'action_cards' in config.setup:
			G.players[name].hand.extend(draw_cards(G.action_cards, config.setup.action_cards))
		if 'investment_cards' in config.setup:
			G.players[name].hand.extend(draw_cards(G.investment_cards, config.setup.investment_cards))


