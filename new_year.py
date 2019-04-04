
import tnt_util as util
from tnt_util import adict, xset, tdict, tlist, tset
import random

def new_year_phase(G):
	
	# increment year
	G.game.year += 1
	print('Start of {}'.format(G.game.year))
	
	# victory check
	vps = util.count_victory_points(G)
	for player, vp in vps.items():
		if vp >= G.game.victory.economic:
			print('{} has won the Economic Victory'.format(player))
	
	# peace dividends
	for player, faction in G.players.items():
		if not faction.stats.at_war and not faction.stats.fought:
			faction.stats.peace_dividends.append(G.game.peace_dividends.pop())
			print('{} draws a peace dividend'.format(player))
			
	
	pass



