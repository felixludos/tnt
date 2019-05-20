import sys, os, time
import pickle
import networkx as nx
import random
import util
from util import adict, idict, iddict, tdict, tlist, tset, xset, collate, uncollate, load, seq_iterate, render_dict, save, Logger, PhaseComplete, PhaseInterrupt
from tnt_setup import init_gamestate, setup_phase
from tnt_util import count_victory_points, switch_phase, add_next_phase, compute_tracks, placeable_units
import tnt_setup as setup
from tnt_cards import load_card_decks, draw_cards
from collections import namedtuple
import traceback
from passive_backend import step, get_G, process_actions, evaluate_action
from production import production_phase, encode_production_actions
from tnt_errors import ActionError
from tnt_units import load_unit_rules, add_unit
import json
import random


def edit_step(player, action):
	# global G #geht nicht!!!!
	# print('G zum zeitpunkt edit_step ist:',G) #None geht nicht!!!
	print('_____________________________')
	print(get_G())
	g = get_G()
	g.objects.created = tdict()
	g.objects.updated = tdict()
	g.objects.removed = tdict()

	g.begin()
	global PHASE_DONE

	try:
		all_actions = evaluate_edit_action(g, player, action)

	except Exception as e:
		print('ERROR has happened in edit_step',e)
		g.abort()

		return process_actions('error', sys.exc_info(), player)

	else:
		g.commit()
		print('vor return process_actions ende')
		print('***********************************')
		print(all_actions)
		return process_actions('actions', all_actions, player)
	#return step(player,action)

def evaluate_edit_action(G, player=None, action=None):  # keeps going through phases until actions are returned
	
	out = None
	
	while out is None:
		try:
			#phase = G.game.sequence[G.game.index]
			#out = PHASES[phase](G, player=player, action=action)
			#geht! out = setup.setup_phase(G, player=player, action=action)
			out = production_edit_phase(G, player=player, action=action)
			player, action = None, None
		except PhaseComplete:
			G.game.index += 1
			
			G.logger.write('Beginning phase: {}'.format(G.game.sequence[G.game.index]))
			
			# maybe save G to file
			save_gamestate('temp.json')
			
			player, action = None, None
			if DEBUG:
				out = adict()
				global PHASE_DONE
				PHASE_DONE = True
		except PhaseInterrupt as e:
			switch_phase(G, e.phase)
			player, action = e.player, e.action
		else:
			assert out is not None, 'Phase {} did not complete'.format(phase)
	
	return out

def production_edit_phase(G, player, action):
	
	if action is None:
		
		if 'temp' in G:
			del G.temp
		
		G.temp = tdict()
		
		G.temp.active_idx = 0
		G.temp.prod = tdict()
		
		# TODO: update blockades
		
		for player, faction in G.players.items():
			G.temp.prod[player] = tdict()
			G.temp.prod[player].production_remaining = compute_production_level(faction)
			
			G.temp.prod[player].upgraded_units = tset()
			
			G.temp.prod[player].action_cards_drawn = 0
			G.temp.prod[player].invest_cards_drawn = 0
		
		# remove all blockades (not unsupplied markers)
		
		active_player = G.game.turn_order[G.temp.active_idx]
		G.logger.write(
			'{} may spend {} production points'.format(active_player, G.temp.prod[active_player].production_remaining))
		
		return encode_production_actions(G)
	
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
			
			#G.temp.prod[player].upgraded_units.add(ID)
			
			unit = G.objects.table[ID]
			unit.cv += 1
			G.objects.updated[ID] = unit
			
			effect = 'upgrading a unit in {}'.format(G.objects.table[ID].tile)
		
	else: # create new unit
		nationality, tilename, unit_type = action
		
		unit = adict()
		unit.nationality = nationality
		unit.tile = tilename
		unit.type = unit_type
		
		unit = add_unit(G, unit)
		
		#G.temp.prod[player].upgraded_units.add(unit._id)
		
		effect = 'building a new cadre in {}'.format(unit.tile)
	
	return encode_edit_actions(G, player)

def encode_edit_actions(G, player):
	code = adict()
	return code

