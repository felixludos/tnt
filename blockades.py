

from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit
from tnt_util import travel_options, eval_tile_control, present_powers
from government import check_revealable, reveal_tech
import random

def find_path(G, loc, goals, player,
              neutrals=False, peaceful=False, observed=None):
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
	for neighbor in tile.borders:
		if neighbor not in observed and find_path(G, loc, goals, player,
              neutrals=neutrals, peaceful=peaceful, observed=observed):
			return True
	return False

def blockade_phase(G):
	raise NotImplementedError

def supply_phase(G):
	
	for player, faction in G.players:
		
		if not faction.stats.at_war:
			continue
			
		for uid, unit in faction.units:
			if G.units.rules[unit.type].type != 'G':
				continue
				
			
	
	raise NotImplementedError

