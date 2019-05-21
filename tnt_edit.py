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
from passive_backend import WAITING_OBJS, WAITING_ACTIONS, REPEATS, step, get_G, get_waiting, process_actions, evaluate_action
from production import production_phase, encode_production_actions
from tnt_errors import ActionError
from tnt_units import load_unit_rules, add_unit
import json
import random

def edit_step(player, action):
	G = get_G()
	global WAITING_ACTIONS
	global WAITING_OBJS
	global REPEATS
	G.objects.created = tdict()
	G.objects.updated = tdict()
	G.objects.removed = tdict()
	G.begin()
	response = e_evaluate_action(G, player, action)
	G.commit()
	print('---------------\n',G.players)
	#WAITING_OBJS, WAITING_ACTIONS = get_waiting()
	for name in G.players.keys():
		print('name:',name)
		if name not in WAITING_OBJS:
			print('***player: ',player,'not in WAITING_OBJS')
			WAITING_OBJS[name] = adict()
			WAITING_OBJS[name].created = adict()
			WAITING_OBJS[name].updated = adict()
			WAITING_OBJS[name].removed = adict()
		WAITING_OBJS[name].created.update(G.objects.created)
		#print('waiting_obj[name]',WAITING_OBJS[name].created)
		WAITING_OBJS[name].updated.update(G.objects.updated)
		WAITING_OBJS[name].removed.update(G.objects.removed)
	WAITING_ACTIONS = response
	#print('waiting_actions',WAITING_ACTIONS)

	if player not in WAITING_OBJS:
		print('*REPEATS**player: ',player,'not in WAITING_OBJS')	
		out = REPEATS[player]
	out = WAITING_OBJS[player]
	del WAITING_OBJS[player]
	if player in WAITING_ACTIONS:
		out.actions = WAITING_ACTIONS[player]
	else:
		out.waiting_for = xset(WAITING_ACTIONS.keys())
	out.log = G.logger.pull(player)
	REPEATS[player] = out
	return out

def e_evaluate_action(G, player=None, action=None):  # keeps going through phases until actions are returned
	nationality, tilename, unit_type = action
	unit = adict()
	unit.nationality = nationality
	unit.tile = tilename
	unit.type = unit_type
	unit.cv = 1
	unit = add_unit(G, unit)
	response = adict()
	#response.created = G.objects.created
	#print('unit',unit)
	#print('response vor format',response)
	player, action = None, None
	return response

