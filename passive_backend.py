

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

ACTION_KEY = None
WAITING_ACTIONS = None

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

def start_new_game():
	global G

	G = setup.init_gamestate()
	
	DLOG.close()
	G.game.logger = util.Logger()
	
	G.objects.created = tdict()
	G.objects.updated = tdict()
	G.objects.removed = tdict()
	
	# start setup phase - no need for a transaction, since there is no user input yet, so the outcome is constant
	return next_phase()

def get_waiting(player):
	if WAITING_ACTIONS is not None and player in WAITING_ACTIONS:
		return

def format_out_message(outtype, results):
	out = adict()
	
	if outtype == 'waiting':
		out.waiting_for = results
	elif outtype == 'error':
		out.error_type = type(results)
		out.error_msg = results.args[0]
	elif outtype == 'action':
		global ACTION_KEY
		ACTION_KEY = results[0]
		out.actions = results[1]
	else:
		raise Exception('Unknown outtype {}'.format(outtype))
	
	out.messages = DLOG.pull()
	
	out.created = G.objects.created.copy()
	out.updated = G.objects.updated.copy()
	out.removed = G.objects.removed.copy()
	
	return out

def step(player, action):
	action = adict(zip(ACTION_KEY, action))
	action.player = player
	
	phase = PHASES[G.game.sequence[G.game.index]]
	
	G.objects.created = tdict()
	G.objects.updated = tdict()
	G.objects.removed = tdict()
	
	G.begin()
	
	try:
		possible_actions = phase(G, action) # already factorized
		
		if possible_actions is None: # phase is complete
			all_actions = next_phase()
			
			# sort all actions into waiting and current
	
	except Exception as e:
		G.abort()
		return format_out_message('error', e)
		
	else:
		G.commit()
		
		if isinstance(possible_actions, tuple):
			return format_out_message('action', possible_actions)
	
	# format actions into an output message (including log)

	

	


def save_gamestate(): # save file and send it
	raise NotImplementedError

def load_gamestate(): # load from input file, or most recent checkpoint (more safe)
	raise NotImplementedError

