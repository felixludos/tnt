
import util as util
from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete
from tnt_cards import discard_cards
from tnt_units import add_unit
import random


def encode_command_phase(G):
	
	code = adict()
	
	player = G.temp.active_players[G.temp.active_idx]
	options = xset()
	options.add('pass')
	
	options.update(G.players[player].hand)
	# options.update(cid for cid in G.players[player].hand if 'action' in G.objects.table[cid].obj_type)
	
	code[player] = (options,)
	
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
	
	return encode_command_phase(G)


def command_phase(G, player, action):
	
	faction = G.players[player]
	
	head, *tail = action
	
	if head == 'pass':
		G.temp.passes += 1
		
		G.logger.write('')
	
	elif head in faction.hand:
		G.temp.passes = 0
		card = G.objects.table[head]
		del card.owner
		G.objects.updated[head] = card
		
		G.temp.decision[player] = card
		
		faction.hand.remove(head)
		
		G.logger.write('{} plays a card'.format(player))
		
		G.temp.active_players.remove(player)
		
	G.temp.active_idx += 1
	
	if len(G.temp.active_players) > G.temp.passes:
		return encode_command_phase(G)
	
	# evaluate card choices
	if len(G.temp.decision) == 0:
		G.logger.write('No player played a command card during {}'.format(G.temp.season))
		raise PhaseComplete
	
	for p, card in G.temp.decision:
		msg = ''
		if 'season' in card:
			if card.season == G.temp.season:
				pass
			else:
				msg = 'n emergency command: {} {}'.format(card.priority, G.players[p])
		
		G.logger.write('{} has played a{} ')
		
		discard_cards(G, card._id)
	
	pass



