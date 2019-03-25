from tnt_util import adict, idict, xset, load, save, collate, uncollate
from tnt_cards import load_card_decks, draw_cards
from tnt_errors import ActionError
from tnt_units import load_unit_rules, add_unit

def load_map(tiles='config/tiles.yml', borders='config/borders.yml'):
	G = adict()
	
	tiles = load(tiles)
	borders = load(borders)
	
	for b in borders:
		n1, n2 = b.tile1, b.tile2
		t = b.type
		
		if 'borders' not in tiles[n1]:
			tiles[n1].borders = adict()
		tiles[n1].borders[n2] = t
		
		if 'borders' not in tiles[n2]:
			tiles[n2].borders = adict()
		tiles[n2].borders[n1] = t
	
	G.tiles = tiles
	
	for name, tile in G.tiles.items():
		tile.name = name
		tile.units = xset()
		if tile.type != 'Sea' and tile.type != 'Ocean':
			for neighbor in tile.borders.keys():
				if G.tiles[neighbor].type == 'Sea' or G.tiles[neighbor].type == 'Ocean':
					tile.type = 'coast'
					break
	
	return G

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
	
	nations = adict()
	minor_designation = 'Minor'
	
	for tile in G.tiles.values():
		if 'alligence' in tile:
			nations[tile.alligence] = minor_designation
	G.nations = nations # map nationality to faction/minor
	
	# load factions/players
	players = adict()
	
	groups = xset(player_setup.keys())
	rivals = adict()
	for g in groups:
		gps = groups.copy()
		gps.remove(g)
		rivals[g] = list(gps)
	
	for name, config in player_setup.items():
		
		faction = adict()
		
		faction.rules = adict()
		faction.rules.handlimit = config.Handlimit
		faction.rules.factory_all_costs = config.FactoryCost
		faction.rules.factory_idx = 0
		faction.rules.factory_cost = faction.rules.factory_all_costs[faction.rules.factory_idx]
		faction.rules.emergency_command = config.EmergencyCommand
		faction.rules.DoW = adict()
		faction.rules.DoW[rivals[name][0]] = False
		faction.rules.DoW[rivals[name][1]] = False
		faction.rules.enable_USA = 'enable_USA' in config
		faction.rules.enable_Winter = 'enable_Winter' in config
		
		faction.cities = adict()
		faction.cities.MainCapital = config.MainCapital
		faction.cities.SubCapitals = config.SubCapitals
		
		faction.members = adict()
		for nation, info in config.members.items():
			nations[nation] = name
			faction.members[nation] = xset([nation])
			if 'Colonies' in info:
				faction.members[nation].update(info.Colonies)
		
		faction.homeland = xset()
		faction.territory = xset()
		
		full_cast = xset()
		for members in faction.members.values():
			full_cast.update(members)
		
		for tile_name, tile in G.tiles.items():
			if 'alligence' not in tile:
				continue
			if tile.alligence in faction.members: # homeland
				faction.homeland.add(tile_name)
			if tile.alligence in full_cast:
				faction.territory.add(tile_name)
		
		faction.tracks = adict()
		pop, res = compute_tracks(faction.territory, G.tiles)
		faction.tracks.pop = pop
		faction.tracks.res = res
		faction.tracks.ind = config.initial_ind
		
		faction.units = xset()
		faction.hand = xset() # for cards
		faction.influence = adict()
		
		players[name] = faction
	G.players = players
	
	# load minors/diplomacy
	minors = adict()
	for name, team in nations.items():
		if team == minor_designation:
			minor = adict()
			
			minor.units = xset()
			minor.is_armed = False
			minor.influence_faction = None
			minor.influence_value = 0
			
			minors[name] = minor
	G.minors = minors
	

def init_gamestate():
	
	G = load_map()
	load_players_and_minors(G)
	load_card_decks(G)
	
	load_unit_rules(G)
	
	return G

def check_setup_complete(player_setup):
	
	incomplete = xset()
	
	for name, config in player_setup.items():
		if 'cadres' in config.setup:
			for reqs in config.setup.cadres.values():
				done = False
				for num in reqs.values():
					if num > 0:
						incomplete.add(name)
						done = True
						break
				if done:
					break
	return incomplete

def setup_phase(G, io, player_setup_path='config/faction_setup.yml'):
	
	player_setup = load(player_setup_path)
	
	# place fixed units
	
	for name, config in player_setup.items():
		if 'units' not in config.setup:
			continue
		
		for unit in config.setup.units:
			add_unit(G, unit)


	# place user chosen units
	
	# out: send message to all players to choose what tiles to place how many cadres on
	for name, faction in player_setup.items():
		out = adict()
		out.player = name
		if 'cadres' in faction.setup:
			out.info = faction.setup.cadres
			out.msg = 'Choose this many cadres to place into each of these territories'
		else:
			out.msg = 'Wait while other players place their cadres'
		io.put(out)
	
	incomplete = check_setup_complete(player_setup)
	
	while len(incomplete):
		
		try:
			msg = io.get()
			
			assert msg.player in incomplete, 'Player {} is already done'.format(msg.player)
			
			reqs = player_setup[msg.player].setup.cadres
			
			placed = False
			
			for member, tiles in reqs.items():
				if msg.tile in tiles:
					placed = True
					assert tiles[msg.tile] > 0, 'No more cadres can be placed onto {}'.format(msg.tile)
					
					unit = adict()
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
		
		incomplete = check_setup_complete(player_setup)
	
	
	# draw action cards
	for name, config in player_setup.items():
		if 'action_cards' in config.setup:
			G.players[name].hand.extend(draw_cards(G.action_cards, config.setup.action_cards))
		if 'investment_cards' in config.setup:
			G.players[name].hand.extend(draw_cards(G.investment_cards, config.setup.investment_cards))


