

import sys, os, time
import random
import numpy as np
seed = None
#seed = 0
RNG = None

import util as util
from util import adict, idict, xset, collate, load, render_dict, save, Logger, seq_iterate
from tnt_setup import init_gamestate, setup_phase
from tnt_cards import load_card_decks, draw_cards
from collections import namedtuple
from itertools import chain, product
from tnt_units import load_unit_rules
import tnt_setup as setup

def complete_phase(players):
	for player in players:
		while True:
			out = format_msg_to_python(get_status(player))
			
			if 'error' in out:
				print(out.error)
				break
			
			if 'log' in out:
				print(out.log)
			
			if 'waiting_for' in out:
				print('-- {} is waiting for {}'.format(player, out.waiting_for))
				break
			
			if player in fixed and len(fixed[player]):
				action = fixed[player].pop()
				print('-- from {} chose {}'.format('fixed', action))
			else:
				actions = list(util.decode_actions(out.actions))
				action = RNG.choice(actions)
				print('-- from {} chose {}'.format(len(actions), action))
			
			out = format_msg_to_python(take_action(player, action))
			
	return out

def continue_game(pass_after=None, player = 'Axis'):
	out = format_msg_to_python(get_status(player))
	
	if 'log' in out and len(out.log):
		print('<{} log>'.format(player))
		print(out.log, end='')
		print('</>')
	
	steps = adict()
	for p in ['Axis', 'West', 'USSR']:
		steps[p] = 0
	
	while 'actions' in out or len(out.waiting_for):
		if 'actions' in out:
			actions = list(util.decode_actions(out.actions))
			msg = ''
			if pass_after is not None and steps[player] > pass_after and ('pass',) in actions:
				action = ('pass',)
				msg = ' (auto pass)'
			else:
				action = ('remove',)
				while action[0] == 'remove': # never remove
					action = RNG.choice(actions)
			print('-- from {} chose {}{}'.format(len(actions), action, msg))
			
			out = format_msg_to_python(take_action(player, action))
			steps[player] += 1
			
			if 'error' in out:
				print(out.error)
				# from IPython import embed
				# embed()
				break
			
			if 'log' in out and len(out.log):
				print('<{} log>'.format(player))
				print(out.log, end='')
				print('</>')
			
		else:
			print('-- {} is waiting for {}'.format(player, out.waiting_for))
			player = out.waiting_for.pop()
			out = format_msg_to_python(get_status(player))
			
			# if 'log' in out and len(out.log):
			# 	print('<{} log>'.format(player))
			# 	print(out.log, end='')
			# 	print('</{}>'.format(player))

from flask_app import *

print(ping())

# if False:
out = format_msg_to_python(init_game(debug=True, player='Axis', seed=seed))

G = get_G()
fixed = adict()
RNG = G.random

# hands = [len(p.hand) for p in G.players.values()]
# act = len(G.cards.action.deck) + len(G.cards.action.discard_pile)
# inv = len(G.cards.investment.deck) + len(G.cards.investment.discard_pile)
# print(sum(hands) + act + inv)



# Setup + New Year
try:
	for player in G.game.turn_order:
		fixed[player] = [('investment_card',)]*6# + [('action_card',)]
	players = G.game.turn_order
except KeyError:
	players = ['Axis', 'USSR', 'West']
print(players)

complete_phase(players)

path = save('setup_complete.json')
print('Saved Setup phase at {}'.format(path))

take_action('Axis', None)

# Production
try:
	for player in G.game.turn_order:
		fixed[player] = [('investment_card',)]*5 + [('action_card',)]*2
	players = G.game.turn_order
except KeyError:
	players = ['Axis', 'USSR', 'West']
print(players)

complete_phase(players)

path = save('prod_complete.json')
print('Saved Prod phase at {}'.format(path))

# from IPython import embed
# embed()

load('saves/prod_complete.json')

G = get_G()
RNG = G.random

take_action('Axis', None)

# Government
G = get_G()
players = G.game.turn_order * 6

continue_game(12)

next_phase = G.game.sequence[G.game.index]
# print('Next phase: {}'.format(next_phase))
if next_phase == 'Satellite':
	take_action('Axis', None)
	continue_game()

path = save('gov_complete.json')
print('Saved Gov phase at {}'.format(path))



print('=== job complete ===')
