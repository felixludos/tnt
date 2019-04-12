

import tnt_util as util
from tnt_util import adict, xset, tdict, tlist, tset, PhaseComplete
from tnt_cards import draw_cards
from tnt_units import add_unit
import random


def encode_production_actions(G):
	
	code = adict()
	
	active_player = G.game.turn_order[G.temp.active_idx]
	faction = G.players[active_player]
			
	options = xset()
	
	# pass
	options.add(('pass',))
	
	# cards
	options.add(('action_card',))
	options.add(('investment_card',))
	
	# new cadres
	for nationality, tiles in faction.homeland.items():
		groups = util.placeable_units(G, active_player, nationality, tiles)
		if len(groups):
			options.add((nationality, groups))
	
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
	improvable -= G.temp.prod[active_player].upgraded_units
	if len(improvable):
		options.add((improvable,))
	
	code[active_player] = options

	return code
		

def production_pre_phase(G):
	
	if 'temp' in G:
		del G.temp
		
	G.temp = tdict()
	
	G.temp.active_idx = 0
	G.temp.prod = tdict()
	
	# TODO: update blockades
	
	
	for player, faction in G.players.items():
		G.temp.prod[player] = tdict()
		G.temp.prod[player].production_remaining = util.compute_production_level(faction)
		
		G.temp.prod[player].upgraded_units = tset()
		
		G.temp.prod[player].action_cards_drawn = 0
		G.temp.prod[player].invest_cards_drawn = 0
	
	# remove all blockades (not unsupplied markers)
	
	active_player = G.game.turn_order[G.temp.active_idx]
	G.logger.write('{} may spend {} production points'.format(active_player, G.temp.prod[active_player].production_remaining))
	
	return encode_production_actions(G)


def production_phase(G, player, action):
	
	if len(action) == 1: # card or upgrade unit
		
		if action == ('action_card',):
			G.temp.prod[player].action_cards_drawn += 1
			effect = 'drawing an action card'
		
		elif action == ('investment_card', ):
			G.temp.prod[player].invest_cards_drawn += 1
			effect = 'drawing an investment card'
			
		elif action == ('pass',):
			effect = 'passing'
		
		else:
			ID, = action
			
			G.temp.prod[player].upgraded_units.add(ID)
			
			G.objects.table[ID].cv += 1
			
			effect = 'upgrading a unit in {}'.format(G.objects.table[ID].tile)
		
	else: # create new unit
		nationality, tilename, unit_type = action
		
		unit = adict()
		unit.nationality = nationality
		unit.tile = tilename
		unit.type = unit_type
		
		unit = add_unit(G, unit)
		
		G.temp.prod[player].upgraded_units.add(unit._id)
		
		effect = 'building a new cadre in {}'.format(unit.tile)
	
	G.temp.prod[player].production_remaining -= 1
	
	G.logger.write('{} spends 1 production on {} ({} production remaining)'.format(player, effect,
	                                                                               G.temp.prod[player].production_remaining))
	
	if G.temp.prod[player].production_remaining == 0:
	
		# draw cards
		draw_cards(G, 'action', player, N=G.temp.prod[player].action_cards_drawn)
		draw_cards(G, 'investment', player, N=G.temp.prod[player].invest_cards_drawn)
		
		G.logger.write('{} is done with production'.format(player))
		
		# clean up temp
		del G.temp.prod[player]
		
		# move to next player
		G.temp.active_idx += 1
		if G.temp.active_idx == len(G.players):
			raise PhaseComplete # phase is done
		
		active_player = G.game.turn_order[G.temp.active_idx]
		G.logger.write(
			'{} may spend {} production points'.format(active_player, G.temp.prod[active_player].production_remaining))
	
	return encode_production_actions(G)

