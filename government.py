
import tnt_util as util
from tnt_util import adict, xset, tdict, tlist, tset
import random



def encode_government_actions(G):
	
	# diplomacy options
	
	# factory upgrade options
	
	# tech options
	
	# espionage options
	
	# pass
	
	pass

def government_pre_phase(G): # prep influence
	
	if 'temp' in G:
		del G.temp
	
	G.temp = tdict()
	
	G.temp.active_idx = 0
	G.temp.gov = tdict()
	
	G.temp.passes = 0
	
	for name, faction in G.players.items():
		
		gov = tdict()
		
		gov.diplomacy = tdict()
		
		
		G.temp.gov[name] = gov
	
	return encode_government_actions(G)

def governmnet_phase(G): # play cards
	
	
	
	pass

def government_post_phase(G): # place remaining influence, update tracks
	
	pass



