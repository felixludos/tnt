
import sys, os, time
import random

from flask_app import *

# class Test():
#     def test(self,x,y):
#         print(x)
#         x += y
#         return y - x

def update_table(table, out):
	table.update(out.created)
	table.update(out.updated)
	for k in out.removed:
		if k in table:
			del table[k]

def complete_phase(players, fixed=None, rng=None, tables=None):
	for player in players:
		while True:
			out = format_msg_to_python(get_status(player))
			if tables is not None and player in tables:
				update_table(tables[player], out)
			
			if 'error' in out:
				print(out.error)
				break
			
			if 'log' in out:
				print(out.log)
			
			if 'waiting_for' in out:
				print('-- {} is waiting for {}'.format(player, out.waiting_for))
				break
			
			if fixed is not None and player in fixed and len(fixed[player]):
				action = fixed[player].pop()
				print('-- from {} chose {}'.format('fixed', action))
			else:
				actions = list(util.decode_actions(out.actions))
				action = rng.choice(actions) if rng is not None else actions[0]
				print('-- from {} chose {}'.format(len(actions), action))
			
			out = format_msg_to_python(take_action(player, action))
			if tables is not None and player in tables:
				update_table(tables[player], out)
	
	return out


def continue_game(pass_after=None, player='Axis', rng=None, tables=None):
	out = format_msg_to_python(get_status(player))
	if tables is not None and player in tables:
		update_table(tables[player], out)
	
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
				if rng is not None:
					while action[0] == 'remove':  # never remove
						action = rng.choice(actions)
				else:
					action = actions[0]
			print('-- from {} chose {}{}'.format(len(actions), action, msg))
			
			out = format_msg_to_python(take_action(player, action))
			if tables is not None and player in tables:
				update_table(tables[player], out)
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
			if tables is not None and player in tables:
				update_table(tables[player], out)
	
	# if 'log' in out and len(out.log):
	# 	print('<{} log>'.format(player))
	# 	print(out.log, end='')
	# 	print('</{}>'.format(player))

