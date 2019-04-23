
import sys, os, time
import numpy as np
#%matplotlib tk
import matplotlib.pyplot as plt
import tnt_util as util
from tnt_util import adict, idict, xset, collate, load, render_dict, save, Logger, seq_iterate
from tnt_setup import init_gamestate, setup_phase
from tnt_cards import load_card_decks, draw_cards
from collections import namedtuple
import random
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
				action = random.choice(actions)
				print('-- from {} chose {}'.format(len(actions), action))
			
			out = format_msg_to_python(take_action(player, action))
			
	return out


from flask_app import *

print(ping())

out = format_msg_to_python(init_game(debug=True, player='Axis'))


G = get_G()
fixed = adict()

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

try:
	for player in G.game.turn_order:
		fixed[player] = [('investment_card',)]*6# + [('action_card',)]
	players = G.game.turn_order
except KeyError:
	players = ['Axis', 'USSR', 'West']
print(players)

complete_phase(players)

path = save('prod_complete.json')
print('Saved Prod phase at {}'.format(path))

take_action('Axis', None)

print('=== job complete ===')
