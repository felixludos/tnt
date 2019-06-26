

import sys, os, time
import pickle
import networkx as nx
import random
import util
from util import adict, idict, iddict, tdict, tlist, tset, xset, collate, load, render_dict, save, Logger, PhaseComplete, PhaseInterrupt
from tnt_setup import init_gamestate, setup_phase
from tnt_util import count_victory_points, switch_phase, add_next_phase
import tnt_setup as setup
from tnt_cards import load_card_decks, draw_cards
from collections import namedtuple
import traceback

from new_year import new_year_phase
from production import production_phase
from government import governmnet_phase
from command import movement_phase, planning_phase
from combat import combat_phase, retreat_phase
from blockades import supply_phase, blockade_phase
from battles import land_battle_phase, naval_battle_phase
from scoring import scoring_phase
from diplomacy import satellite_phase

import json

PHASES = adict({
	'Setup': setup_phase,

    'New_Year': new_year_phase,
    'Production': production_phase,
    'Government': governmnet_phase,
    'Spring': planning_phase,
    'Summer': planning_phase,
    'Blockade': blockade_phase,
    'Fall': planning_phase,
    'Winter': planning_phase,
	
	'Satellite': satellite_phase,

	'Movement': movement_phase,

	'Combat': combat_phase,
	'Land Battle': land_battle_phase, #@@
	'Navel Battle': naval_battle_phase,
	'Supply': supply_phase,
	'Retreat': retreat_phase,

    'Land_Battle': land_battle_phase,
    'Naval_Battle': naval_battle_phase,
	
	'Scoring': scoring_phase,
})

# ALL game information is in the gamestate "G"
G = None
DEBUG = False

WAITING_OBJS = adict()
WAITING_ACTIONS = adict()
REPEATS = adict()

PHASE_DONE = False

def get_G():
	return G
def get_waiting():
	return WAITING_ACTIONS, WAITING_OBJS

def get_object_table():
	if G is None:
		return None
	return G.objects.table

def start_new_game(player='Axis', debug=False, seed=None):
	global G, DEBUG
	
	DEBUG = debug

	G = setup.init_gamestate(seed=seed)
	
	G.logger = Logger(*G.players.keys(), stdout=True)
	
	if G.game.seed is not None:
		G.logger.write('Set seed {}'.format(G.game.seed))
	
	G.objects.created = G.objects.table.copy()
	G.objects.updated = tdict()
	G.objects.removed = tdict()
	
	for name in G.players:
		WAITING_OBJS[name] = adict()
		WAITING_OBJS[name].created = adict()
		WAITING_OBJS[name].updated = adict()
		WAITING_OBJS[name].removed = adict()
	
	# start setup phase - no need for a transaction, since there is no user input yet, so the outcome is constant
	return process_actions('actions', evaluate_action(), player)


def pull_msg(player):
	return format_out_message(player)

def format_out_message(player):
	
	if player not in WAITING_OBJS:
		return REPEATS[player]
	
	out = WAITING_OBJS[player]
	del WAITING_OBJS[player]
	
	if player in WAITING_ACTIONS:
		out.actions = WAITING_ACTIONS[player]
	else: #@playerChange
		out.waiting_for = xset(WAITING_ACTIONS.keys())
	
	out.log = G.logger.pull(player)
	
	REPEATS[player] = out
	return out

def process_actions(outtype, results, player):
	
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


def evaluate_action(player=None, action=None):  # keeps going through phases until actions are returned
	
	out = None
	n=0
	while out is None:
		try:
			phase = G.game.sequence[G.game.index]
			print(n,'player',player,'action',action,'func',PHASES[phase]) #@@
			n+=1
			out = PHASES[phase](G, player=player, action=action)
			player, action = None, None
		except PhaseComplete:
			G.logger.write('...phase: {} completed'.format(G.game.sequence[G.game.index]))
			G.game.index += 1
			
			G.logger.write('Beginning phase: {}'.format(G.game.sequence[G.game.index]))
			
			# maybe save G to file
			#save_gamestate('temp.json')
			
			player, action = None, None
			if DEBUG:
				out = adict()
				global PHASE_DONE
				PHASE_DONE = True
		except PhaseInterrupt as e:
			G.logger.write('...phase {} interrupted to {}'.format(G.game.sequence[G.game.index], e.phase))
			switch_phase(G, e.phase)
			player, action = e.player, e.action
		else:
			#G.logger.write('...back from phase {} without exception, out None: {}'.format(G.game.sequence[G.game.index], (out == None)))
			assert out is not None, 'Phase {} did not complete'.format(phase)
	
	return out




def step(player, action):
	G.objects.created = tdict()
	G.objects.updated = tdict()
	G.objects.removed = tdict()
	
	G.begin()
	
	global PHASE_DONE
	
	try:
		
		print('step',player,action,'PHASE_DONE=',PHASE_DONE)
		if PHASE_DONE:
			PHASE_DONE = False
			all_actions = evaluate_action()
		else:
			# validate action
			assert player in WAITING_ACTIONS, 'It is not {}\'s turn'.format(player)
			options = util.decode_actions(WAITING_ACTIONS[player])
			assert action in options, 'Invalid action: {}'.format(action)
			
			all_actions = evaluate_action(player, action)
			
	except Exception as e:
		G.abort()
		
		if DEBUG:
			raise e
		
		return process_actions('error', sys.exc_info(), player)
		
	else:
		G.commit()
		
		return process_actions('actions', all_actions, player)
	

def get_game_info(player):
	
	info = adict()
	
	info.game = adict()
	info.game.year = G.game.year
	info.game.phase = G.game.sequence[G.game.index]
	if 'turn_order' in G.game:
		info.game.turn_order = G.game.turn_order
	
	info.players = adict()
	
	vps = count_victory_points(G)
	
	for p, faction in G.players.items():
		
		play = adict()
		
		play.tracks = adict()
		for track, val in faction.tracks.items():
			play.tracks[track] = val
		
		play.at_war_with = faction.stats.at_war_with
		play.DoW = faction.stats.DoW
		
		if p == player:
			play.victory_points = vps[p]
			
			reserves = adict()
			for member in faction.members.keys():
				reserves[member] = G.units.reserves[member]
			play.reserves = reserves
	
		info.players[p] = play
	
	return info









# Human readable save files

def convert_to_saveable(data):
	if data is None:
		return None
	if isinstance(data, (str, int, float)):
		return data
	if isinstance(data, iddict):
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
	rng = G.random
	del G.random
	data = {
		'gamestate': convert_to_saveable(G),
		'waiting_objs': convert_to_saveable(WAITING_OBJS),
		'waiting_actions': convert_to_saveable(WAITING_ACTIONS),
		'repeats': convert_to_saveable(REPEATS),
		'debug': DEBUG,
		'phase_done': PHASE_DONE,
		'randstate': rng.getstate(),
	}
	G.random = rng
	if G is not None:
		G.logger.write('Game saved')
	if filename is None:
		return json.dumps(data)
	path = os.path.join('saves', filename)
	json.dump(data, open(path, 'w'))
	return path

def load_gamestate(path): # load from input file, or most recent checkpoint (more safe)
	data = json.load(open(path, 'r'))
	global WAITING_OBJS, WAITING_ACTIONS, REPEATS, G, PHASE_DONE, DEBUG
	WAITING_OBJS = convert_from_saveable(data['waiting_objs'])
	WAITING_ACTIONS = convert_from_saveable(data['waiting_actions'])
	REPEATS = convert_from_saveable(data['repeats'])
	G = convert_from_saveable(data['gamestate'])
	PHASE_DONE = data['phase_done']
	DEBUG = data['debug']
	G.random = random.Random()
	x, y, z = data['randstate']
	rs = (x, tuple(y), z)
	G.random.setstate(rs)

	#need to convert so that G.objects.table points to same objects
	#as G.player...units, G.tiles...
	for id in G.objects.table:
		o=G.objects.table[id]
		if o.obj_type == 'unit':
			owner = G.nations.designations[o.nationality]
			if owner in G.players:
				G.objects.table[id] = G.players[owner].units[id]
		elif o.obj_type == 'tile':
			G.objects.table[id] = G.tiles[id]
		elif o.obj_type == 'influence':
			nation = o.nation
			G.objects.table[id] = G.diplomacy.influence[nation]
	#is there any other type with replicated objects?
	# do I need to mind updated, created, ...?		

	if G is not None:
		G.logger.write('Game loaded')

def load_gamestate_orig(path): # load from input file, or most recent checkpoint (more safe)
	data = json.load(open(path, 'r'))
	global WAITING_OBJS, WAITING_ACTIONS, REPEATS, G, PHASE_DONE, DEBUG
	WAITING_OBJS = convert_from_saveable(data['waiting_objs'])
	WAITING_ACTIONS = convert_from_saveable(data['waiting_actions'])
	REPEATS = convert_from_saveable(data['repeats'])
	G = convert_from_saveable(data['gamestate'])
	PHASE_DONE = data['phase_done']
	DEBUG = data['debug']
	G.random = random.Random()
	x, y, z = data['randstate']
	rs = (x, tuple(y), z)
	G.random.setstate(rs)
	if G is not None:
		G.logger.write('Game loaded')
