

import tnt_util as util
from tnt_util import adict, xset, tdict, tlist, tset
import random


def encode_production_actions(G, player=None):
	
	code = adict()
	
	for name, faction in G.players:
		
		if player is not None and name != player:
			continue
			
		code[name] = xset()
		
		# cards
		code[name].add(('action_card',))
		code[name].add(('investment_card',))
		
		# new cadres
		
		
		# improve units
		improvable = xset()
		
		for unit in faction.units:
			
			# can't have a cv of 4
			if unit.cv == 4:
				continue
				
			# unit must be supplied and not engaged
			if 'in_battle' in unit or 'unsupplied' in unit:
				continue
			
			# tile must be land or coast
			if G.tiles[unit.tile] in {'Sea', 'Ocean'}:
				continue
			
			improvable.add(unit._id)
		code[name].add((improvable,))
		
	if player is not None:
		return code[player]
	return code
		

def production_pre_phase(G):
	
	if 'temp' in G:
		del G.temp
		
	G.temp = tdict()
	
	G.temp.production_remaining = tdict()
	for player, faction in G.players.items():
		G.temp.production_remaining[player] = util.compute_production_level(faction)
		
		
	return encode_production_actions(G)


def production_phase(G, player, options, action):
	
	# update blockades
	
	
	
	# remove all blockades
	
	pass

