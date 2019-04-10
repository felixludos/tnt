

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
	return format_out_message('actions', next_phase(), player)

def get_repeat(player): # just repeat most recent message
	pass

def get_waiting(player):
	
	out = WAITING[player] if WAITING is not None and player in WAITING else adict({'waiting_for':list(WAITING.keys())})
	
	base = ''
	if 'log' in out:
		base = out.log
	
	out.log = base + G.logger.pull(player)
	
	return out

def format_out_message(outtype, results, player):
	out = adict()
	
	out.created = G.objects.created.copy()
	out.updated = G.objects.updated.copy()
	out.removed = G.objects.removed.copy()
	
	for name, objs in WAITING_OBJS.items():
		objs.created.update(out.created)
		objs.updated.update(out.updated)
		objs.removed.update(out.removed)
	
	if outtype == 'error':
		out.log = G.logger.pull(player)
		out.error = ''.join(traceback.format_exception(*results))
		return out
	elif outtype == 'actions':
		
		for faction, actions in results.items():
			
			WAITING[faction].actions = actions
			# WAITING[faction].log = G.logger.pull(faction)
			WAITING[faction].created.update(out.created)
			WAITING[faction].updated.update(out.updated)
			WAITING[faction].removed.update(out.removed)
			
		return get_waiting(player)
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
	
	all_actions = None
	try:
		
		# validate action
		options = util.decode_actions(WAITING[player].actions)
		assert action in options, 'Invalid action: {}'.format(action)
		
		try:
			all_actions = phase(G, player, action)
		except PhaseComplete:
			all_actions = next_phase()
			
	except Exception as e:
		G.abort()
		
		if DEBUG:
			raise e
		
		return format_out_message('error', sys.exc_info(), player)
		
	else:
		G.commit()
		return format_out_message('actions', all_actions, player)
	

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
		'waiting': convert_to_saveable(WAITING),
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
	global WAITING, G
	WAITING = convert_from_saveable(data['waiting'])
	G = convert_from_saveable(data['gamestate'])
	if G is not None:
		G.logger.write('Game loaded')

