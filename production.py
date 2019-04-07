

import tnt_util as util
from tnt_util import adict, xset, tdict, tlist, tset
import random


def encode_production_actions(G, player=None):
	
	code = adict()
	
	active_player = G.game.turn_order[G.temp.active_idx]
	if player is not None and player != active_player:
		return None
	
	for name, faction in G.players.items():
		
		if player is not None and name != player:
			continue
		if name != active_player:
			continue
			
		code[name] = xset()
		
		# cards
		code[name].add(('action_card',))
		code[name].add(('investment_card',))
		
		# new cadres
		for nationality, tiles in faction.homeland.items():
			options = util.placeable_units(G, name, nationality, tiles)
			if len(options):
				code[name].add((nationality, options))
		
		# improve units
		improvable = xset()
		
		for unit in faction.units:
			
			# can't upgrade a cv of 4
			if unit.cv == 4:
				continue
			
			tile = G.tiles[unit.tile]
			
			# unit must be supplied and not engaged
			if 'disputed' in tile or 'unsupplied' in tile:
				continue
			
			# tile must be land or coast
			if tile.type in {'Sea', 'Ocean'}:
				continue
			
			improvable.add(unit._id)
		improvable -= G.temp.prod[name].upgraded_units
		if len(improvable):
			code[name].add((improvable,))
		
	if player is not None:
		return code[player]
	return code
		

def production_pre_phase(G):
	
	if 'temp' in G:
		del G.temp
		
	G.temp = tdict()
	
	G.temp.active_idx = 0
	G.temp.prod = tdict()
	
	# update blockades
	
	
	for player, faction in G.players.items():
		G.temp.prod[player] = tdict()
		G.temp.prod[player].production_remaining = util.compute_production_level(faction)
		
		G.temp.prod[player].upgraded_units = tset()
		
		G.temp.prod[player].action_cards_drawn = 0
		G.temp.prod[player].invest_cards_drawn = 0
	
	# remove all blockades (not unsupplied markers)
	
	return encode_production_actions(G)


def production_phase(G, player, options, action):
	
	
	
	pass

