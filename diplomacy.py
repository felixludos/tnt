

from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete, PhaseInterrupt
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit, remove_unit
from tnt_util import travel_options, eval_tile_control, placeable_units, compute_tracks
from tnt_cards import draw_cards
import random

diplvl = {
	1: 'associates',
	2: 'protectorates',
	3: 'satellites',
}
dipname = {
	1: 'an Associate',
	2: 'a Protectorate',
	3: 'a Satellite',
}

def increment_influence(G, player, nation):
	if nation not in G.diplomacy.influence:
		inf = idict()
		inf.value = 1
		inf.nation = nation
		inf.faction = player
		inf.obj_type = 'influence'
		inf.visible = xset(G.players.keys())
		
		G.players[player].influence.add(inf._id)
		G.diplomacy.influence[nation] = inf
		G.objects.table[inf._id] = inf
		G.objects.created[inf._id] = inf
		return
	
	inf = G.diplomacy.influence[nation]
	
	if player != inf.faction and inf.value == 1:
		del G.diplomacy.influence[nation]
		G.players[inf.faction].influence.remove(inf._id)
		del G.objects.table[inf._id]
		G.objects.removed[inf._id] = inf
		return
	
	delta = (-1) ** (player != inf.faction)
	
	inf.value += delta
	G.objects.updated[inf._id] = inf

def decrement_influence(G, nation, val=1):
	if nation not in G.diplomacy.influence:
		return
	
	inf = G.diplomacy.influence[nation]
	
	future = inf.value - val
	
	if future <= 0:
		del G.diplomacy.influence[nation]
		G.players[inf.faction].influence.remove(inf._id)
		del G.objects.table[inf._id]
		G.objects.removed[inf._id] = inf
		return
	
	inf.value = future
	G.objects.updated[inf._id] = inf



def becomes_satellite(G, player, nation):
	del G.diplomacy.neutrals[nation]  # no longer neutral
	
	# no longer armed
	if G.nations.status[nation].is_armed:
		G.nations.status[nation].is_armed = 0
	
	faction = G.players[player]
	
	if nation in G.diplomacy.influence:
	
		inf = G.diplomacy.influence[nation]
		
		decrement_influence(G, inf.faction, inf.value)
		
		if inf.faction != player:
			pop, res = compute_tracks(G.nations.territories[nation], G.tiles)
			G.players[inf.faction].trans.resources -= pop
			G.players[inf.faction].trans.resources -= res
			G.logger.write(
				'{} loses {} influence in {} (losing POP={}, RES={})'.format(inf.faction, inf.value, nation, pop, res))
	
	else:
		pop, res = compute_tracks(G.nations.territories[nation], G.tiles)
		faction.tracks.POP += pop
		faction.tracks.RES += res
		
		G.logger.write('{} gains POP={}, RES={}'.format(player, pop, res))
	
	G.nations.groups[G.nations.designations[nation]].remove(nation)
	G.nations.designations[nation] = player
	G.nations.groups[player].add(nation)
	
	for tilename in G.nations.territories[nation]:
		tile = G.tiles[tilename]
		free = True
		for uid in tile.units:
			unit = G.objects.table[uid]
			if G.nations.designations[unit.nationality] != player:
				free = False
				break
	
		if free:
			faction.territory.add(tilename)
			tile.owner = player
			G.objects.updated[tilename] = tile
	
	# faction.territory.update(G.nations.territories[nation])
	
	G.logger.write('{} takes control of {}'.format(player, nation))

def USA_becomes_satellite(G, player='West'):
	assert player == 'West', 'The USA can only become a satellite of West'
	
	becomes_satellite(G, player, 'USA')
	
	# USA specific stuff
	faction = G.players[player]
	
	faction.members['USA'] = tset('USA')
	faction.homeland['USA'] = G.nations.territories['USA'].copy()
	
	G.nations.designations['USA'] = player
	
	unit = adict()
	unit.nationality = 'USA'
	unit.type = 'Fortress'
	unit.tile = 'Washington'
	unit.cv = 4
	add_unit(G, unit)
	
	unit = adict()
	unit.nationality = 'USA'
	unit.type = 'Fortress'
	unit.tile = 'New_York'
	unit.cv = 2
	add_unit(G, unit)
	
	faction.stats.factory_idx += 1
	faction.stats.factory_cost = faction.stats.factory_all_costs[faction.stats.factory_idx]
	
	G.logger.write('{} factory cost decreases to {}'.format('West', faction.stats.factory_cost))


def declaration_of_war(G, declarer, victim):
	G.players[declarer].stats.DoW[victim] = True
	
	G.players[declarer].stats.at_war_with[victim] = True
	G.players[victim].stats.at_war_with[declarer] = True
	
	G.players[declarer].stats.at_war = True
	G.players[victim].stats.at_war = True
	
	G.players[victim].stats.factory_idx += 1
	G.players[victim].stats.factory_cost = G.players[victim].stats.factory_all_costs[
		G.players[victim].stats.factory_idx]
	
	G.logger.write('The {} delares war on the {}'.format(declarer, victim))
	G.logger.write('{} loses 1 victory point'.format(declarer))
	G.logger.write('{} decreases their factory cost to {}'.format(victim, G.players[victim].stats.factory_cost))


def violation_of_neutrality(G, declarer, nation):  # including world reaction and placing armed minor units
	
	assert nation in G.diplomacy.neutrals, '{} is no longer neutral'.format(nation)
	
	G.players[declarer].stats.aggressed = True
	
	G.logger.write('{} has violated the neutrality of {}'.format(declarer, nation))
	
	# world reaction
	
	reaction = G.tiles[G.nations.capitals[nation]].muster
	rivals = G.players[declarer].stats.rivals
	
	G.logger.write('{} draw {} cards for world reaction'.format(' and '.join(rivals, reaction)))
	
	for rival in rivals:
		draw_cards(G, 'action', rival, reaction)
	
	# remove influence
	if nation == 'USA':
		assert declarer not in {'West', 'USSR'}, 'West/USSR cannot violate the neutrality of the USA'
		
		if 'USA' in G.diplomacy.influence:
			inf = G.diplomacy.influence['USA']
			del G.diplomacy.influence['USA']
			del G.objects.table[inf._id]
			G.objects.removed[inf._id] = inf
			
			G.logger.write('{} loses {} influence in the USA'.format(inf.faction, inf.value))
		
		# USA becomes a West satellite
		USA_becomes_satellite(G, 'West')
		
		if not G.players[declarer].stats.at_war_with['West']:
			declaration_of_war(G, declarer, 'West')
		
		return
	
	G.players[declarer].diplomacy.violations.add(nation)
	
	if nation in G.diplomacy.influence:
		
		inf = G.diplomacy.influence[nation]
		
		if inf.faction != declarer and inf.value == 2 and not G.players[declarer].stats.at_war_with[inf.faction]:
			G.logger.write('Since {} was a protectorate of {}, {}\' protection takes effect'.format(nation, inf.faction, inf.faction))
			
			declaration_of_war(G, declarer, inf.faction)
			
			# nation should now become a satellite of inf.faction - including placing units
			sats = tdict()
			sats[nation] = inf.faction
			
			G.temp.new_sats = sats
			raise PhaseInterrupt('Satellite')
		
		lvl = diplvl[inf.value]
		
		G.players[inf.faction].diplomacy[lvl].remove(nation)
		decrement_influence(G, nation, inf.value)
		
		pop, res = compute_tracks(G.nations.territories[nation], G.tiles)
		
		G.players[inf.faction].tracks.POP -= pop
		G.players[inf.faction].tracks.RES -= res
		
		G.logger.write('{} loses {} influence in {} (losing POP={}, RES={})'.format(inf.faction, inf.value, nation, pop, res))
	
	del G.diplomacy.neutrals[nation]
	G.nations.status[nation].is_armed = 1
	
	desig = G.nations.designations[nation]
	
	# arming the minor
	for tilename in G.nations.territories[nation]:
		tile = G.tiles[tilename]
		tile.owner = desig
		
		if tile.muster > 0:
			unit = adict()
			unit.nationality = nation
			unit.type = 'Fortress'
			unit.tile = tilename
			unit.cv = tile.muster
			add_unit(G, unit)
			G.logger.write('A Fortress of {} appears in {} with cv={}'.format(nation, unit.tile, unit.cv))


def encode_garrison_options(G):
	code = adict()
	
	for player, tilenames in G.temp.sat_units.items():
		options = placeable_units(G, player, G.players[player].stats.great_power, tilenames)
		if len(options):
			code[player] = options
	
	return code

def satellite_phase(G, player=None, action=None):
	
	if 'new_sats' in G.temp:
	
		new_sats = G.temp.new_sats
		
		if 'USA' in new_sats:
			name = new_sats['USA']
			del new_sats['USA']
			
			USA_becomes_satellite(G, name)
		
		sat_units = tdict()
		for nation, fname in new_sats.items():
			becomes_satellite(G, fname, nation)
			
			
			if G.nations.status[nation].is_armed: # replace currently existing troops
				G.logger.write('{} may replace Armed Minor units in {}'.format(fname, nation))
				removed = []
				for uid, unit in G.nations.status[nation].units:
					if fname not in sat_units:
						sat_units[fname] = tdict()
					sat_units[fname][unit.tile] = unit.cv
					removed.append(unit)
				
				for unit in removed:
					remove_unit(G, unit)
				
			else:
				ts = []
				for tilename in G.nations.territories[nation]:
					tile = G.tiles[tilename]
					if 'muster' in tile and tile.muster > 0:
						if fname not in sat_units:
							sat_units[fname] = tdict()
						sat_units[fname][tilename] = tile.muster
						ts.append(tilename)
						
				G.logger.write('{} may place units into {}'.format(fname, ', '.join(ts)))
		G.temp.sat_units = sat_units
		del G.temp.new_sats
	
	if action is not None:
		
		assert player in G.temp.sat_units, '{} has no garrison troops to place'.format(player)
		
		unit = adict()
		unit.tile, unit.type = action
		unit.nationality = G.players[player].stats.great_power
		unit.cv = G.temp.sat_units[player][unit.tile]
		add_unit(G, unit)
		del G.temp.sat_units[player][unit.tile]
		if len(G.temp.sat_units[player]) == 0:
			del G.temp.sat_units[player]
	
	if len(G.temp.sat_units):
		return encode_garrison_options(G)
	
	del G.temp.sat_units
	
	raise PhaseComplete
	
