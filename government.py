
import tnt_util as util
from tnt_util import adict, xset, tdict, tlist, tset
import random



def encode_government_actions(G):
	
	code = adict()
	active_player = G.game.turn_order[G.temp.active_idx]
	
	opts = xset()
	
	# diplomacy options
	
	
	# factory upgrade options
	
	
	# tech options
	
	
	# espionage options
	
	
	# pass
	opts.add(('pass',))
	
	code[active_player] = opts
	
	return code

def government_pre_phase(G): # prep influence
	
	if 'temp' in G:
		del G.temp
	
	G.temp = tdict()
	G.temp.gov = tdict()
	
	G.temp.passes = 0
	
	for name, faction in G.players.items():
		
		gov = tdict()
		
		gov.diplomacy = tdict()
		
		G.temp.gov[name] = gov
	
	G.temp.active_idx = 0
	return encode_government_actions(G)

def governmnet_phase(G, player, action): # play cards
	
	if action == ('pass',):
		G.temp.passes += 1
		if G.temp.passes == len(G.players):
			return None
	else:
		G.temp.passes = 0
		
		# execute card effects
	
	G.temp.active_idx += 1
	G.temp.active_idx %= len(G.players)
	return encode_government_actions(G)

def government_post_phase(G): # place remaining influence, update tracks
	
	pass



