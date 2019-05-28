from util.tnt_util import compute_tracks, count_victory_points
from util import adict, xset, tdict, tlist, tset, PhaseComplete
import random
from tnt_cards import shuffle

class New_Year_Phase(GamePhase):
	
	def execute(self, G, player=None, action=None):
		
		# increment year
		G.game.year += 1
		G.logger.write('Start of {}'.format(G.game.year))
		
		# recompute tracks
		for player, faction in G.players.items():
			faction.tracks.POP, faction.tracks.RES = compute_tracks(faction.territory, G.tiles)
		
		# victory check
		vps = count_victory_points(G)
		for player, vp in vps.items():
			if vp >= G.game.victory.economic:
				G.logger.write('{} has won the Economic Victory'.format(player))
				raise NotImplementedError
		
		# shuffle discard piles
		shuffle(G.random, G.cards.action)
		shuffle(G.random, G.cards.investment)
		
		# peace dividends
		for player, faction in G.players.items():
			if not faction.stats.at_war and not faction.stats.aggressed:
				val = G.game.peace_dividends.pop()
				faction.stats.peace_dividends.append(val)
				G.logger.write('{} draws a peace dividend'.format(player))
				G.logger.write('- you receive {} victory points'.format(val), player=player)
		
		# choose turn order
		G.game.turn_order = G.game.turn_order_options[G.random.randint(1, 6)]
		G.logger.write('Turn order: {}'.format(', '.join(G.game.turn_order)))
		
		raise PhaseComplete

