

import sys, os, time
import numpy as np
import pickle
import networkx as nx
import tnt_util as util
from tnt_util import adict, idict, tdict, tlist, tset, xset, collate, load, render_dict, save, Logger, PhaseComplete
from tnt_setup import init_gamestate, setup_phase, setup_pre_phase
import tnt_setup as setup
from tnt_cards import load_card_decks, draw_cards
from collections import namedtuple
import traceback
from production import production_phase, production_pre_phase

from new_year import new_year_phase
import json

PRE_PHASES = adict({ # all action phases
	'Setup': setup_pre_phase,
	'Production': production_pre_phase,
	'Government': None,
	'Spring': None,
	'Summer': None,
	'Fall': None,
	'Winter': None,
	
	'Land_Combat': None,
	'Naval_Combat': None,
})
PHASES = adict({
	'Setup': setup_phase,

    'New_Year': new_year_phase,
    'Production': production_phase,
    'Government': None,
    'Spring': None,
    'Summer': None,
    'Blockade': None,
    'Fall': None,
    'Winter': None,

    'Land_Combat': None,
    'Naval_Combat': None,
	
	'Scoring': None,
})

# ALL game information is in the gamestate "G"
G = None
DEBUG = False

WAITING_OBJS = adict()
WAITING_ACTIONS = adict()
REPEATS = adict()

def get_G():
	return G
def get_waiting():
	return WAITING_ACTIONS, WAITING_OBJS


def start_new_game(player='Axis', debug=False):
	global G, DEBUG
	
	DEBUG = debug

	G = setup.init_gamestate()
	
	G.logger = util.Logger(*G.players.keys(), stdout=True)
	
	G.objects.created = G.objects.table.copy()
	G.objects.updated = tdict()
	G.objects.removed = tdict()
	
	for name in G.players:
		WAITING_OBJS[name] = adict()
		WAITING_OBJS[name].created = adict()
		WAITING_OBJS[name].updated = adict()
		WAITING_OBJS[name].removed = adict()
	
	# start setup phase - no need for a transaction, since there is no user input yet, so the outcome is constant
	return process_actions('actions', next_phase(), player)


def pull_msg(player):
	return format_out_message(player)

def format_out_message(player):
	
	if player not in WAITING_OBJS:
		return REPEATS[player]
	
	out = WAITING_OBJS[player]
	del WAITING_OBJS[player]
	
	if player in WAITING_ACTIONS:
		out.actions = WAITING_ACTIONS[player]
	else:
		out.waiting_for = xset(WAITING_ACTIONS.keys())
	
	out.log = G.logger.pull(player)
	
	REPEATS[player] = out
	return out

def process_actions(outtype, results, player):
	# print(G.objects.created.keys())
	
	if outtype == 'error':
		out = format_out_message(player)
		out.error = ''.join(traceback.format_exception(*results))
		return out
	elif outtype == 'actions':
		
		for name in G.players.keys():
			if name not in WAITING_OBJS:
				WAITING_OBJS[name] = adict()
				WAITING_OBJS[name].created = adict()
				WAITING_OBJS[name].updated = adict()
				WAITING_OBJS[name].removed = adict()
			WAITING_OBJS[name].created.update(G.objects.created)
			WAITING_OBJS[name].updated.update(G.objects.updated)
			WAITING_OBJS[name].removed.update(G.objects.removed)
		
		global WAITING_ACTIONS
		
		WAITING_ACTIONS = results
		
		# for faction, actions in results.items():
		# 	WAITING_ACTIONS[faction] = actions
			
		return format_out_message(player)
	else:
		raise Exception('Unknown outtype {}'.format(outtype))


def next_phase():  # keeps going through phases until actions are returned
	
	out = None
	
	while out is None:
		
		G.game.index += 1
		
		phase = G.game.sequence[G.game.index]
		
		G.logger.write('Beginning phase: {}'.format(phase))
		
		# maybe save G to file
		
		if phase in PRE_PHASES:
			if PRE_PHASES[phase] is None:
				raise Exception('The prephase {} has not been implemented yet'.format(phase))
			out = PRE_PHASES[phase](G)
		else:
			if PHASES[phase] is None:
				raise Exception('The phase {} has not been implemented yet'.format(phase))
			out = PHASES[phase](G)
	
	return out


def step(player, action):
	
	phase = PHASES[G.game.sequence[G.game.index]]
	
	G.objects.created = tdict()
	G.objects.updated = tdict()
	G.objects.removed = tdict()
	
	G.begin()
	
	try:
		
		# validate action
		assert player in WAITING_ACTIONS, 'It is not {}\'s turn'.format(player)
		options = util.decode_actions(WAITING_ACTIONS[player])
		assert action in options, 'Invalid action: {}'.format(action)
		
		try:
			all_actions = phase(G, player, action)
		except PhaseComplete:
			all_actions = next_phase()
			
	except Exception as e:
		G.abort()
		
		if DEBUG:
			raise e
		
		return process_actions('error', sys.exc_info(), player)
		
	else:
		G.commit()
		
		return process_actions('actions', all_actions, player)
	











# Human readable save files

def convert_to_saveable(data):
	if data is None:
		return None
	if isinstance(data, (str, int, float)):
		return data
	if isinstance(data, idict):
		return {convert_to_saveable(k): convert_to_saveable(v) for k, v in data.to_dict().items()}
	if isinstance(data, dict):
		return {convert_to_saveable(k): convert_to_saveable(v) for k, v in data.items()}
	if isinstance(data, list):
		return [convert_to_saveable(el) for el in data]
	if isinstance(data, xset):
		return {'xset': [convert_to_saveable(el) for el in data]}
	if isinstance(data, set):
		return {'set': [convert_to_saveable(el) for el in data]}
	if isinstance(data, tuple):
		return {'tuple': [convert_to_saveable(el) for el in data]}
	try:
		return {'_object_{}'.format(type(G.logger).__name__) : data.save_state()}
	except AttributeError:
		raise Exception('Cannot save data of type: {}'.format(type(data)))

def convert_from_saveable(data):
	if data is None:
		return None
	if isinstance(data, (str, int, float)):
		try:
			return int(data)
		except:
			pass
		return data
	if isinstance(data, dict):
		
		if len(data) == 1:
			key, val = next(iter(data.items()))
			if 'set' == key:
				return tset(convert_from_saveable(el) for el in val)
			if 'xset' == key:
				return xset(convert_from_saveable(el) for el in val)
			if 'tuple' == key:
				return tuple(convert_from_saveable(el) for el in val)
			if '_object_' == key[:8]:
				typ = eval(key[8:])
				obj = typ()
				obj.load_state(val)
				return obj
		
		if '_id' in data:
			return idict({convert_from_saveable(k): convert_from_saveable(v) for k, v in data.items()})
		
		return tdict({convert_from_saveable(k): convert_from_saveable(v) for k, v in data.items()})
	if isinstance(data, list):
		return tlist(convert_from_saveable(el) for el in data)
	try:
		return data.save_state()
	except AttributeError:
		raise Exception('Cannot save data of type: {}'.format(type(data)))

def save_gamestate(filename): # save file and send it
	data = {
		'gamestate': convert_to_saveable(G),
		'waiting_objs': convert_to_saveable(WAITING_OBJS),
		'waiting_actions': convert_to_saveable(WAITING_ACTIONS),
		'repeats': convert_to_saveable(REPEATS),
	}
	if G is not None:
		G.logger.write('Game saved')
	if filename is None:
		return json.dumps(data)
	path = os.path.join('saves', filename)
	json.dump(data, open(path, 'w'))
	return path

def load_gamestate(path): # load from input file, or most recent checkpoint (more safe)
	data = json.load(open(path, 'r'))
	global WAITING_OBJS, WAITING_ACTIONS, REPEATS, G
	WAITING_OBJS = convert_from_saveable(data['waiting_objs'])
	WAITING_ACTIONS = convert_from_saveable(data['waiting_actions'])
	REPEATS = convert_from_saveable(data['repeats'])
	G = convert_from_saveable(data['gamestate'])
	if G is not None:
		G.logger.write('Game loaded')

