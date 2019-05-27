from util import tdict, tset, adict, tlist, idict, load, GamePhase, save, collate, uncollate, xset, seq_iterate, PhaseComplete
from util.tnt_util import compute_tracks, placeable_units
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
	
	G.tiles = tdict({name: idict(tile) for name, tile in tiles.items()})
	
	for name, tile in G.tiles.items():
		tile.__dict__['_id'] = name
		# tile.name = name
		tile.units = tset()
		if tile.type not in {'Sea', 'Ocean', 'Strait'}:
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
	
	for nation, tilename in capitals.items():
		G.tiles[tilename].capital = True
	
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
		
		faction.stats.DoW = tdict({r: False for r in rivals[name]})
		
		faction.stats.at_war_with = tdict({r: False for r in rivals[name]})
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
		
		faction.homeland = tdict({member: tset() for member in faction.members.keys()})
		faction.territory = tset()
		
		for tile_name, tile in G.tiles.items():
			if 'alligence' not in tile:
				continue
			if tile.alligence in faction.members:  # homeland
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
		faction.hand = tset()  # for cards
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
		
		if team == minor_designation:  # only minors
			minor = tdict()
			
			minor.faction = None
			minor.value = 0
			
			minors[name] = minor
		
		if team == 'Major':  # only includes neutral majors
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
	
	game.year = info.first_year - 1  # zero based
	game.last_year = info.last_year
	num_rounds = game.last_year - game.year
	
	game.turn_order_options = info.turn_order_options
	
	game.sequence = ['Setup'] + num_rounds * info.year_order + ['Scoring']
	game.index = 0  # start below 0, so after increment in next_phase() it starts at 0
	# game.action_phases = tset(x for x in info.phases if info.phases[x]) # no need for action phases anymore (all action phases have a pre phase)
	
	game.peace_dividends = tlist(sum([[v] * n for v, n in info.peace_dividends.items()], []))
	G.random.shuffle(game.peace_dividends)
	
	game.victory = info.victory
	
	G.game = game
	
	G.objects = tdict()
	G.objects.table = tdict()


def load_unit_rules(G, unit_rules_path='config/units.yml', unit_count_path='config/unit_count.yml'):

	unit_rules = load(unit_rules_path)
	unit_count = load(unit_count_path)

	G.units = adict()

	G.units.rules = unit_rules
	G.units.placeable = xset(name for name, rules in unit_rules.items() if 'not_placeable' not in rules)
	G.units.priorities = [n for n, _ in sorted(unit_rules.items(), key=lambda x: x[1].priority)]

	G.units.reserves = unit_count


def load_card_decks(G, action_path='config/cards/action_cards.yml',
                    investment_path='config/cards/investment_cards.yml',
                    info_path='config/cards/card_info.yml'):
	cinfo = load(info_path)
	caction = load(action_path)
	cinvest = load(investment_path)
	
	action_cards = tdict()
	action_cards.deck = tlist()
	
	for ID, card in caction.items():
		card = idict(card)
		card.obj_type = 'action_card'
		card.visible = tset()
		card.__dict__['_id'] = 'action_{}'.format(ID)
		action_cards.deck.append(card._id)
		G.objects.table[card._id] = card
	
	investment_cards = tdict()
	investment_cards.deck = tlist()
	
	for ID, card in cinvest.items():
		card = idict(card)
		card.obj_type = 'investment_card'
		card.visible = tset()
		card.__dict__['_id'] = 'invest_{}'.format(ID)
		investment_cards.deck.append(card._id)
		G.objects.table[card._id] = card
	
	G.cards = tdict()
	
	G.cards.action = action_cards
	G.cards.action.discard_pile = tlist()
	
	G.cards.investment = investment_cards
	G.cards.investment.discard_pile = tlist()
	
	G.cards.info = cinfo
	
	shuffle(G.random, G.cards.investment)
	shuffle(G.random, G.cards.action)


def init_gamestate(seed=None):
	if seed is None:
		seed = random.getrandbits(64)
	
	G = tdict()
	
	load_game_info(G, seed=seed)
	
	load_map(G)
	
	load_players_and_minors(G)
	load_card_decks(G)
	
	load_unit_rules(G)
	
	return G
