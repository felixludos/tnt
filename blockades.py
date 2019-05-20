

from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit, remove_unit
from tnt_util import travel_options, eval_tile_control, present_powers
from government import check_revealable, reveal_tech
import random

border_types = {
	'Coast': 'sea',
	'Forest': 'land',
	'Plains': 'land',
	'Sea': 'sea',
	'Ocean': 'sea',
	'Strait': None,
	'Ocean-Africa': 'sea',
	'Mountains':'land',
	'River': 'land',
}

def find_path(G, loc, goals, player,
              neutrals=False, peaceful=False, observed=None,
              switch_limits=None, switch_current=None):
	if loc in goals:
		return True
	
	if observed is None:
		observed = xset()
		
	tile = G.tiles[loc]
	observed.add(loc)
	
	if peaceful and 'disputed' in tile:
		return False
	
	if 'alligence' in tile:
		owner = tile.owner if 'owner' in tile else G.nations.designations[tile.alligence]
		
		if owner != player and (not neutrals or owner in G.players):
			return False
	else: # sea/ocean
		wars = G.players[player].stats.at_war_with
		powers = present_powers(G, tile)
		
		for power in powers:
			if power in wars and wars[power]:
				return False
	
	# recurse
	for neighbor, border in tile.borders.items():
		if neighbor not in observed and find_path(G, loc, goals, player,
              neutrals=neutrals, peaceful=peaceful, observed=observed):
			return True
	return False

def blockade_phase(G):
	
	for player, faction in G.players:

		if not faction.stats.at_war:
			continue
		
		goals = xset()
		goals.add(faction.stats.cities.MainCapital)
		
		for tilename in faction.territory:
			
			connected = find_path(G, tilename, goals=goals, player=player,
			                      neutrals=True,)
		
		pass
	
	
	

def supply_phase(G):
	
	for player, faction in G.players:
		
		goals = xset(faction.stats.cities.SubCapitals)
		goals.add(faction.stats.cities.MainCapital)
		
		if not faction.stats.at_war:
			continue
			
		for uid, unit in faction.units:
			if unit.type == 'Fortress' or G.units.rules[unit.type].type != 'G':
				continue
				
			supplied = find_path(G, unit.tile, goals=goals, player=player)
			tile = G.tiles[unit.tile]
			
			if not supplied:
				unit.cv -= 1
				if unit.cv == 0:
					msg = 'was eliminated'
					remove_unit(G, unit)
					
					# TODO: check for retreats
					
				else:
					msg = 'lost 1 cv'
					G.objects.updated[uid] = unit
				
				G.logger.write('{} unit in {} {} due to lack of supplies'.format(player, unit.tile, msg))
				
			elif 'unsupplied' in tile and player in tile.unsupplied:
				tile.unsupplied.remove(player)
				if len(tile.unsupplied) == 0:
					del tile.unsupplied
				G.objects.updated[tile._id] = tile
