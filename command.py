
from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete
from tnt_cards import discard_cards
from tnt_units import add_unit
from tnt_util import travel_options
import random


def encode_command_card_phase(G):
	
	code = adict()
	
	player = G.temp.active_players[G.temp.active_idx]
	options = xset()
	options.add('pass')
	
	options.update(G.players[player].hand)
	# options.update(cid for cid in G.players[player].hand if 'action' in G.objects.table[cid].obj_type)
	
	code[player] = (options,)
	
	return code

def encode_movement(G):
	
	player = G.temp.order[G.temp.active_idx]
	faction = G.players[player]
	cmd = G.temp.commands[player]
	
	assert cmd.value > 0, 'No more commands - shouldve moved on to next player'
	
	options = xset()
	options.add(('pass',))
	
	if len(cmd.moved) == 0: # no units have been moved yet -> can make declarations
		
		pass
	
	for unit in faction.units:
		locs = travel_options(G, unit)
		if len(locs):
			options.add((unit._id, locs))
	
	# reveal techs in secret vault
	
	code = adict()
	code[player] = options
	return code

def pre_command_phase(G):

	if 'temp' in G:
		del G.temp
	
	G.temp = tdict()
	G.temp.season = G.game.sequence[G.game.index]
	
	G.temp.active_idx = 0
	G.temp.active_players = G.game.turn_order.copy()
	if G.temp.season == 'Winter':
		G.temp.active_players = tlist(p for p in G.game.turn_order if G.players[p].stats.enable_Winter)
	
	G.temp.decision = tdict()
	G.temp.passes = 0
	
	return encode_command_card_phase(G)


def command_phase(G, player, action):
	
	faction = G.players[player]
	
	head, *tail = action
	
	if head == 'pass':
		G.temp.passes += 1
		G.temp.active_idx += 1
		G.temp.active_idx %= len(G.temp.active_players)
		
		G.logger.write('{} passes'.format(player))
	
	elif head in faction.hand:
		G.temp.passes = 0
		card = G.objects.table[head]
		#if 'owner'
		del card.owner
		G.objects.updated[head] = card
		
		G.temp.decision[player] = card
		
		faction.hand.remove(head)
		
		G.logger.write('{} plays a card'.format(player))
		
		G.temp.active_players.remove(player)
		if len(G.temp.active_players):
			G.temp.active_idx %= len(G.temp.active_players)
	
	if len(G.temp.active_players) > G.temp.passes:
		return encode_command_card_phase(G)
	
	# evaluate card choices
	if len(G.temp.decision) == 0:
		G.logger.write('No player played a command card during {}'.format(G.temp.season))
		raise PhaseComplete
	
	G.temp.commands = tdict()
	
	for p, card in G.temp.decision.items(): # RULE OVERRULED: emergency priority tie breaks are automatic
		if 'season' in card:
			cmd = tdict()
			cmd.priority = card.priority
			cmd.moved = tset()
			cmd.borders = tdict()
			cmd.declarations = tset()
			
			if card.season == G.temp.season:
				val = card.value
				msg = ' {} command: {} {}'.format(card.season, card.priority, val)
			else:
				cmd.emergency = True
				val = G.players[p].stats.emergency_command
				msg = 'n emergency command: {} {}'.format(card.priority, val)
			
			cmd.value = val
			G.temp.commands[p] = cmd
			
		else:
			msg = ' bluff (investment card)'
			
		G.logger.write('{} has played a{}'.format(p, msg))
		
		discard_cards(G, card._id)
		
	if len(G.temp.commands):
	
		# find order
		if 'order' not in G.temp:
			G.temp.order = tlist(k for k,v in sorted([(k,v.priority + ('e' if 'emergency' in v else ''))
			                                          for k,v in G.temp.commands.items()],
			                                         key=lambda x: x[1]))
			G.logger.write('Play order is: {}'.format(', '.join(G.temp.order)))
	
			G.temp.active_idx = 0
			
			return encode_movement(G)
			
		# execute command action
		
		
		
		
	
	G.logger.write('{} is complete'.format(G.temp.season))
	
	end_phase(G)

def end_phase(G):
	
	# check blockades
	raise NotImplementedError
	
	raise PhaseComplete

