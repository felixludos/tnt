from tnt_util import xdict, xset, load, save
from tnt_cards import create_card_decks
from tnt_errors import ActionError


def load_map(tiles='config/tiles.yml', borders='config/borders.yml'):
	G = xdict()
	
	tiles = load(tiles)
	borders = load(borders)
	
	for b in borders:
		n1, n2 = b.tile1, b.tile2
		t = b.type
		
		if 'borders' not in tiles[n1]:
			tiles[n1].borders = xdict()
		tiles[n1].borders[n2] = t
		
		if 'borders' not in tiles[n2]:
			tiles[n2].borders = xdict()
		tiles[n2].borders[n1] = t
	
	G.tiles = tiles
	
	for tile in G.tiles.values():
		tile.units = []
	
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

def load_players(G):
	player_setup = load('config/faction_setup.yml')
	
	players = xdict()
	
	groups = xset(player_setup.keys())
	rivals = xdict()
	for g in groups:
		gps = groups.copy()
		gps.remove(g)
		rivals[g] = list(gps)
	
	for name, config in player_setup.items():
		
		faction = xdict()
		
		faction.rules = xdict()
		faction.rules.handlimit = config.Handlimit
		faction.rules.factory_all_costs = config.FactoryCost
		faction.rules.factory_idx = 0
		faction.rules.factory_cost = faction.rules.factory_all_costs[faction.rules.factory_idx]
		faction.rules.emergency_command = config.EmergencyCommand
		faction.rules.DoW = xdict()
		faction.rules.DoW[rivals[name][0]] = False
		faction.rules.DoW[rivals[name][1]] = False
		faction.rules.enable_USA = 'enable_USA' in config
		faction.rules.enable_Winter = 'enable_Winter' in config
		
		faction.cities = xdict()
		faction.cities.MainCapital = config.MainCapital
		faction.cities.SubCapitals = config.SubCapitals
		
		faction.members = xdict()
		for nation, info in config.members.items():
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
		
		faction.tracks = xdict()
		pop, res = compute_tracks(faction.territory, G.tiles)
		faction.tracks.pop = pop
		faction.tracks.res = res
		faction.tracks.ind = config.initial_ind
		
		faction.units = []
		
		players[name] = faction
	G.players = players


def init_gamestate():
	
	G = load_map()
	load_players(G)
	create_card_decks(G)
	
	return G


def unit_setup_phase(G, inbox, outbox, player_config):
	# place fixed units
	
	for name, config in player_setup.items():
		if 'units' not in config.setup:
			continue
		faction = G.players[name]
		
		for unit in config.setup.units:
			G.tiles[unit.tile].units.append(unit)
			faction.units.append(unit)


	# place user chosen units
	
	# out: send message to all players to choose what tiles to place how many cadres on

	
	pass

	


