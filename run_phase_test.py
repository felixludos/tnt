

import sys, os, time
import random
import numpy as np
seed = None
seed = 3
RNG = None

import util as util
from util import adict, idict, xset, collate, load, render_dict, save, Logger, seq_iterate
from tnt_setup import init_gamestate, setup_phase
from tnt_cards import load_card_decks, draw_cards
from collections import namedtuple
from itertools import chain, product
from tnt_units import load_unit_rules
import tnt_setup as setup

from flask_app import *

from nb_backend import *

print(ping())

if False:
	out = format_msg_to_python(init_game(debug=True, player='Axis', seed=seed))
	
	G = get_G()
	fixed = adict()
	RNG = G.random
	
	# hands = [len(p.hand) for p in G.players.values()]
	# act = len(G.cards.action.deck) + len(G.cards.action.discard_pile)
	# inv = len(G.cards.investment.deck) + len(G.cards.investment.discard_pile)
	# print(sum(hands) + act + inv)
	
	# Setup + New Year
	players = ['Axis', 'USSR', 'West']
	print(players)
	
	complete_phase(players, rng=RNG)
	
	path = save('setup_complete.json')
	print('Saved Setup phase at {}'.format(path))
	
	take_action('Axis', None)
	take_action('Axis', None)
	
	# Production
	try:
		for player in G.game.turn_order:
			fixed[player] = [('investment_card',)]*5 + [('action_card',)]*2
		players = G.game.turn_order
	except KeyError:
		players = ['Axis', 'USSR', 'West']
	print(players)
	
	complete_phase(players, rng=RNG)
	
	path = save('prod_complete.json')
	print('Saved Prod phase at {}'.format(path))
	
	# from IPython import embed
	# embed()
	
	# load('saves/prod_complete.json')
	
	G = get_G()
	RNG = G.random
	
	take_action('Axis', None)
	
	# Government
	G = get_G()
	players = G.game.turn_order * 6
	
	continue_game(12, rng=RNG)
	
	next_phase = G.game.sequence[G.game.index]
	# print('Next phase: {}'.format(next_phase))
	if next_phase == 'Satellite':
		take_action('Axis', None)
		continue_game()
	
	path = save('gov_complete.json')
	print('Saved Gov phase at {}'.format(path))
	
	# load('saves/gov_complete.json')
	
	take_action('Axis', None)
	
	G = get_G()
	continue_game(12, rng=RNG)
	
	path = save('planning_complete.json')
	print('Saved Planning phase at {}'.format(path))
else:

	load('saves/planning_complete.json')

take_action('Axis', None)

print('=== job complete ===')
