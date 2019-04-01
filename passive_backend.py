

import sys, os, time
import numpy as np
import pickle
import networkx as nx
import tnt_util as util
from tnt_util import adict, idict, tdict, xset, collate, load, render_dict, get_object, save
from tnt_setup import init_gamestate, setup_phase, setup_pre_phase
import tnt_setup as setup
from tnt_cards import load_card_decks, draw_cards
from collections import namedtuple

PRE_PHASES = adict({ # all action phases
	'Setup': setup_pre_phase,
	'Production': None,
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

    'New_Year': None,
    'Production': None,
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



DLOG = util.DigitalLog()

ACTION_KEY = adict()
WAITING_ACTIONS = adict()

def get_G():
	return G
def get_waiting_actions():
	return WAITING_ACTIONS

def next_phase(): # keeps going through phases until actions are returned
	
	out = None
	
	while out is None:
	
		G.game.index += 1
		
		phase = G.game.sequence[G.game.index]
		
		print('Beginning phase: {}'.format(phase))
		
		# maybe save G to file
		
		if phase in PRE_PHASES:
			out = PRE_PHASES[phase](G)
		else:
			out = PHASES[phase](G)
	
	return out

def start_new_game(player='Axis'):
	global G

	G = setup.init_gamestate()
	
	DLOG.close()
	G.game.logger = util.Logger(stdout=True)
	
	G.objects.created = G.objects.table.copy()
	G.objects.updated = tdict()
	G.objects.removed = tdict()
	
	# start setup phase - no need for a transaction, since there is no user input yet, so the outcome is constant
	return format_out_message('all', next_phase(), player)

def get_waiting(player):
	if WAITING_ACTIONS is not None and player in WAITING_ACTIONS:
		return WAITING_ACTIONS[player]
	return adict({'waiting_for':list(WAITING_ACTIONS.keys())})

def format_out_message(outtype, results, player):
	out = adict()
	
	out.messages = DLOG.pull()
	
	out.created = G.objects.created.copy()
	out.updated = G.objects.updated.copy()
	out.removed = G.objects.removed.copy()
	
	if outtype == 'error':
		out.error_type = type(results)
		out.error_msg = results.args[0]
	elif outtype == 'action':
		global ACTION_KEY
		ACTION_KEY[player] = results[0]
		out.actions = results[1]
	elif outtype == 'all':
		global WAITING_ACTIONS
		for faction, actions in results.items():
			WAITING_ACTIONS[faction] = adict()
			ACTION_KEY[faction] = actions[0]
			WAITING_ACTIONS[faction].actions = actions[1]
			WAITING_ACTIONS[faction].update(out)
		return get_waiting(player)
		
	else:
		raise Exception('Unknown outtype {}'.format(outtype))
	
	return out

def step(player, action):
	action = adict(zip(ACTION_KEY, action))
	action.player = player
	
	phase = PHASES[G.game.sequence[G.game.index]]
	
	G.objects.created = tdict()
	G.objects.updated = tdict()
	G.objects.removed = tdict()
	
	G.begin()
	
	all_actions = None
	try:
		possible_actions = phase(G, action) # already factorized
		
		if possible_actions is None: # phase is complete
			all_actions = next_phase()
			
			# sort all actions into waiting and current
	
	except Exception as e:
		G.abort()
		return format_out_message('error', e, player)
		
	else:
		G.commit()
		if possible_actions is not None:
			return format_out_message('action', possible_actions, player)
		else:
			return format_out_message('all', all_actions, player)
	


def save_gamestate(): # save file and send it
	raise NotImplementedError

def load_gamestate(): # load from input file, or most recent checkpoint (more safe)
	raise NotImplementedError

